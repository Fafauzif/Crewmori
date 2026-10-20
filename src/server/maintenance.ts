import type { Pool, PoolClient } from "pg";
import { database, transaction } from "./db";
import { appendEvent } from "./repository";
import { logError } from "./log";

// Ingestion jobs expire in the queue after 600 seconds; a longer lease avoids racing live work.
export const KNOWLEDGE_LEASE_SECONDS = 900;

// A worker crash leaves a job running with no owner. Failing it re-enables the owner's Retry.
export async function recoverStaleKnowledgeJobs(client: PoolClient, leaseSeconds = KNOWLEDGE_LEASE_SECONDS) {
  const stale = await client.query("select id,workspace_id,source_id from crewmori.knowledge_jobs where state='running' and coalesce(started_at,created_at) < now()-($1 * interval '1 second') order by workspace_id limit 50", [leaseSeconds]);
  let recovered = 0;
  for (const job of stale.rows) {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [job.workspace_id]);
    const updated = await client.query("update crewmori.knowledge_jobs set state='failed',error_code='INDEXING_INTERRUPTED' where id=$1 and state='running' and coalesce(started_at,created_at) < now()-($2 * interval '1 second')", [job.id, leaseSeconds]);
    if (!updated.rowCount) continue;
    recovered++;
    await appendEvent(client, job.workspace_id, "knowledge.blocked", "Source indexing was interrupted. Retry processing when ready.", [{ table: "sources", id: job.source_id }]);
  }
  return recovered;
}

// Queue retries end well within this window; a run still marked running has lost its worker.
export const RUN_LEASE_SECONDS = 1800;

// Stuck runs count toward the workspace concurrency limit. Unconfirmed model calls keep their
// reservation and become unknown, so an explicit owner retry is still required.
export async function recoverStaleRuns(client: PoolClient, leaseSeconds = RUN_LEASE_SECONDS) {
  const stale = await client.query("select id,workspace_id,control_version from crewmori.agent_runs where state='running' and updated_at < now()-($1 * interval '1 second') order by workspace_id limit 50", [leaseSeconds]);
  let recovered = 0;
  for (const run of stale.rows) {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [run.workspace_id]);
    const updated = await client.query("update crewmori.agent_runs set state='blocked',error_code='WORKER_INTERRUPTED',updated_at=now() where workspace_id=$1 and id=$2 and control_version=$3 and state='running' and updated_at < now()-($4 * interval '1 second')", [run.workspace_id, run.id, run.control_version, leaseSeconds]);
    if (!updated.rowCount) continue;
    recovered++;
    await client.query("update crewmori.model_calls set state='unknown' where workspace_id=$1 and run_id=$2 and control_version=$3 and state='reserved'", [run.workspace_id, run.id, run.control_version]);
    await appendEvent(client, run.workspace_id, "run.blocked", "Task processing was interrupted. Review it before another attempt.", [{ table: "agent_runs", id: run.id }]);
  }
  return recovered;
}

// Uploads finish in seconds; an hour-old pending record means the request failed or crashed.
export const PENDING_UPLOAD_SECONDS = 3600;
export type RemoveObjects = (paths: string[]) => Promise<{ error: unknown }>;

// Storage removal happens first: a record is only marked deleted once its bytes are gone.
export async function removeAbandonedUploads(source: Pool, remove: RemoveObjects, olderThanSeconds = PENDING_UPLOAD_SECONDS) {
  const pending = await source.query("select id,object_path from crewmori.files where state='pending' and created_at < now()-($1 * interval '1 second') order by created_at limit 100", [olderThanSeconds]);
  if (!pending.rowCount) return 0;
  const removed = await remove(pending.rows.map((row) => row.object_path));
  if (removed.error) return 0;
  const updated = await source.query("update crewmori.files set state='deleted' where id = any($1) and state='pending'", [pending.rows.map((row) => row.id)]);
  return updated.rowCount ?? 0;
}

// Rate-limit windows are at most one day, so older rows can no longer affect a decision.
export async function purgeExpiredRecords(client: PoolClient) {
  const oauth = await client.query("delete from crewmori.oauth_states where expires_at < now()-interval '1 day'");
  const invitations = await client.query("delete from crewmori.buyer_invitations where expires_at < now()-interval '30 days'");
  const limits = await client.query("delete from crewmori.request_limits where window_start < now()-interval '2 days'");
  return { oauthStates: oauth.rowCount ?? 0, invitations: invitations.rowCount ?? 0, requestLimits: limits.rowCount ?? 0 };
}

// One sweep runs every recovery step independently; a failing step does not block the others.
export async function runMaintenance(remove?: RemoveObjects) {
  const steps: Record<string, () => Promise<unknown>> = {
    knowledge: () => transaction((client) => recoverStaleKnowledgeJobs(client)),
    runs: () => transaction((client) => recoverStaleRuns(client)),
    records: () => transaction((client) => purgeExpiredRecords(client)),
  };
  if (remove) steps.uploads = () => removeAbandonedUploads(database(), remove);
  const failed: string[] = [];
  for (const [name, step] of Object.entries(steps)) await step().catch((error) => { failed.push(name); logError("maintenance.step_failed", error, { step: name }); });
  return { failed };
}
