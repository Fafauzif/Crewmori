import type { PoolClient } from "pg";
import type { OwnerActor } from "./contracts";
import { taskInputSchema, referenceSchema } from "./contracts";
import { transaction, database } from "./db";
import { assertService } from "./errors";
import { appendEvent, lockWorkspace, previousCommand, saveCommand } from "./repository";
import { z } from "zod";
import { o, s } from "../lib/types";

const sourceCollections = new Set(["sources", "profiles", "services", "requirements", "opportunities", "clients", "contacts", "offers", "offer_versions", "projects", "invoices", "receipts", "allocations", "calendar_events", "policies"]);
export async function resolveReferences(client: PoolClient, workspaceId: string, refs: z.infer<typeof referenceSchema>[], publicOnly = false) {
  const sources: Array<{ id: string; version: number; content: unknown }> = [];
  for (const ref of refs) {
    assertService(sourceCollections.has(ref.table), "SOURCE_NOT_ALLOWED", "This collection cannot enter model context.", 403);
    const result = await client.query("select id,version,data from crewmori.records where workspace_id=$1 and collection=$2 and id=$3", [workspaceId, ref.table, ref.id]);
    assertService(result.rowCount, "SOURCE_NOT_FOUND", "A requested source is unavailable in this workspace.", 404);
    assertService(result.rows[0].version === ref.version, "STALE_VERSION", "A source changed. Refresh before starting this task.", 409);
    let content = result.rows[0].data;
    if (publicOnly) {
      if (["profiles", "services"].includes(ref.table)) {
        const snapshot = (await client.query("select data from crewmori.records where workspace_id=$1 and collection='publication_snapshots' and id=$2", [workspaceId, `${ref.table}_${ref.id}`])).rows[0]?.data;
        assertService(snapshot?.source_version === ref.version, "PUBLIC_CLAIMS_REQUIRED", "Publish the exact source version before using it for promotion.", 409);
        const allowed = ["title", "description", "deliverables", "pricing_label", "public_name", "headline", "biography", "public_availability"];
        content = { ...Object.fromEntries(allowed.filter((key) => key in snapshot.values).map((key) => [key, snapshot.values[key]])), audience: "public", published: true };
      } else assertService(ref.table === "sources" && content.audience === "public" && content.published === true, "PUBLIC_CLAIMS_REQUIRED", "Promoter only accepts reviewed public source versions.", 409);
    }
    if (ref.table === "sources") content = { label: content.label || content.title, content: s(content.extracted_text, s(content.content)).slice(0, 8000), audience: content.audience, published: content.published, url: content.url };
    sources.push({ id: `${ref.table}:${ref.id}`, version: ref.version, content });
  }
  assertService(Buffer.byteLength(JSON.stringify(sources), "utf8") <= 24000, "CONTEXT_TOO_LARGE", "Select fewer or shorter sources.", 422);
  return sources;
}
export async function startTask(actor: OwnerActor, raw: unknown) {
  const input = taskInputSchema.parse(raw);
  return transaction(async (client) => {
    await lockWorkspace(client, actor);
    const prior = await previousCommand(client, actor, "agent.start", input.idempotencyKey, input);
    if (prior) return { ...prior, replayed: true };
    const refs = [...input.references];
    if (input.role !== "promoter") {
      for (const ref of input.references.filter((r) => r.table === "opportunities")) {
        const opportunity = (await client.query("select data from crewmori.records where workspace_id=$1 and collection='opportunities' and id=$2", [actor.workspaceId, ref.id])).rows[0];
        for (const [table, id] of [["requirements", s(o(opportunity?.data).requirements_id)], ["policies", "policy_business"]]) {
          const record = (await client.query("select version from crewmori.records where workspace_id=$1 and collection=$2 and id=$3", [actor.workspaceId, table, id])).rows[0];
          if (record && !refs.some((r) => r.table === table && r.id === id)) refs.push({ table, id, version: record.version });
        }
      }
      const matches = await client.query("select distinct c.source_id,c.source_version from crewmori.knowledge_chunks c join crewmori.records r on r.workspace_id=c.workspace_id and r.collection='sources' and r.id=c.source_id and r.version=c.source_version where c.workspace_id=$1 and coalesce((r.data->>'archived')::boolean,false)=false and to_tsvector('simple',c.content) @@ plainto_tsquery('simple',$2) limit 2", [actor.workspaceId, input.instruction]);
      for (const row of matches.rows) if (!refs.some((r) => r.table === "sources" && r.id === row.source_id)) refs.push({ table: "sources", id: row.source_id, version: row.source_version });
    }
    await resolveReferences(client, actor.workspaceId, refs, input.role === "promoter");
    const result = await client.query("insert into crewmori.agent_runs(workspace_id,role,instruction,input_refs) values($1,$2,$3,$4) returning id,state,control_version", [actor.workspaceId, input.role, input.instruction, JSON.stringify(refs)]);
    const run = result.rows[0];
    await client.query("insert into crewmori.outbox(workspace_id,kind,reference_id,deduplication_key) values($1,'agent.run',$2,$3)", [actor.workspaceId, run.id, `agent:${run.id}:1`]);
    await appendEvent(client, actor.workspaceId, "run.queued", `${input.role} task queued.`, [{ table: "agent_runs", id: run.id }]);
    await saveCommand(client, actor, "agent.start", input.idempotencyKey, input, run);
    return run;
  });
}
export const controlInputSchema = z.object({ action: z.enum(["pause", "resume", "cancel", "retry"]), expectedVersion: z.number().int().positive(), idempotencyKey: z.string().uuid() }).strict();
export async function controlTask(actor: OwnerActor, id: string, raw: unknown) {
  const input = controlInputSchema.parse(raw);
  return transaction(async (client) => {
    await lockWorkspace(client, actor);
    const prior = await previousCommand(client, actor, "agent.control", input.idempotencyKey, { id, ...input });
    if (prior) return { ...prior, replayed: true };
    const found = await client.query("select * from crewmori.agent_runs where workspace_id=$1 and id=$2 for update", [actor.workspaceId, id]);
    assertService(found.rowCount, "NOT_FOUND", "Task not found.", 404);
    const run = found.rows[0];
    assertService(run.control_version === input.expectedVersion, "STALE_VERSION", "The task changed. Reload before controlling it.", 409);
    const allowed: Record<string, string[]> = { pause: ["queued", "running"], resume: ["paused"], cancel: ["queued", "running", "paused", "blocked", "failed"], retry: ["blocked", "failed"] };
    assertService(allowed[input.action].includes(run.state), "INVALID_STATE", "This action does not apply to the current task state.", 409);
    let updated;
    if (input.action === "retry") {
      const refs = [];
      for (const ref of run.input_refs as z.infer<typeof referenceSchema>[]) {
        const current = (await client.query("select version from crewmori.records where workspace_id=$1 and collection=$2 and id=$3", [actor.workspaceId, ref.table, ref.id])).rows[0];
        assertService(current, "SOURCE_NOT_FOUND", "A source was removed. Start a new task with the available sources.", 409);
        refs.push({ ...ref, version: current.version });
      }
      await resolveReferences(client, actor.workspaceId, refs, run.role === "promoter");
      // One retry per attempt: a double click or a second tab must not start parallel paid runs.
      const retried = await client.query("select id from crewmori.agent_runs where workspace_id=$1 and previous_attempt_id=$2", [actor.workspaceId, run.id]);
      assertService(!retried.rowCount, "ALREADY_RETRIED", "This task was already retried. Open the newest attempt.", 409);
      await client.query("update crewmori.agent_runs set control_version=control_version+1,updated_at=now() where id=$1", [run.id]);
      const inserted = await client.query("insert into crewmori.agent_runs(workspace_id,role,instruction,input_refs,previous_attempt_id) values($1,$2,$3,$4,$5) returning id,state,control_version", [actor.workspaceId, run.role, run.instruction, JSON.stringify(refs), run.id]);
      updated = inserted.rows[0];
    } else {
      const state = input.action === "pause" ? "paused" : input.action === "cancel" ? "cancelled" : "queued";
      updated = (await client.query("update crewmori.agent_runs set state=$1,control_version=control_version+1,updated_at=now() where workspace_id=$2 and id=$3 returning id,state,control_version", [state, actor.workspaceId, id])).rows[0];
    }
    if (["resume", "retry"].includes(input.action)) await client.query("insert into crewmori.outbox(workspace_id,kind,reference_id,deduplication_key) values($1,'agent.run',$2,$3)", [actor.workspaceId, updated.id, `agent:${updated.id}:${updated.control_version}`]);
    await appendEvent(client, actor.workspaceId, `run.${input.action}`, `Task ${input.action} recorded.`, [{ table: "agent_runs", id: updated.id }]);
    await saveCommand(client, actor, "agent.control", input.idempotencyKey, { id, ...input }, updated);
    return updated;
  });
}
export async function getTask(actor: OwnerActor, id: string) {
  const result = await database().query("select id,role,instruction,input_refs,state,control_version,artifact,error_code,usage,created_at,updated_at from crewmori.agent_runs where workspace_id=$1 and id=$2", [actor.workspaceId, id]);
  assertService(result.rowCount, "NOT_FOUND", "Task not found.", 404);
  return result.rows[0];
}
