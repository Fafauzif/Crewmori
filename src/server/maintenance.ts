import type { PoolClient } from "pg";
import { appendEvent } from "./repository";

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
