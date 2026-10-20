import type { PoolClient } from "pg";
import type { OwnerActor } from "./contracts";
import { assertService } from "./errors";
import { fingerprint } from "./security";

// Every privileged transaction rechecks ownership; route checks alone are insufficient.
export async function lockWorkspace(client: PoolClient, actor: OwnerActor) {
  const result = await client.query("select * from crewmori.workspaces where id=$1 and owner_id=$2 for update", [actor.workspaceId, actor.userId]);
  assertService(result.rowCount, "WORKSPACE_NOT_FOUND", "This workspace is unavailable.", 404);
  return result.rows[0];
}
export async function appendEvent(client: PoolClient, workspaceId: string, kind: string, summary: string, refs: unknown[] = []) {
  const result = await client.query("update crewmori.workspaces set event_sequence=event_sequence+1,revision=revision+1 where id=$1 returning event_sequence", [workspaceId]);
  assertService(result.rowCount, "WORKSPACE_NOT_FOUND", "This workspace is unavailable.", 404);
  await client.query("insert into crewmori.events(workspace_id,sequence,kind,summary,record_refs) values($1,$2,$3,$4,$5)", [workspaceId, result.rows[0].event_sequence, kind, summary, JSON.stringify(refs)]);
  return Number(result.rows[0].event_sequence);
}
export async function previousCommand(client: PoolClient, actor: OwnerActor, operation: string, key: string, input: unknown): Promise<Record<string, unknown> | null> {
  const prior = await client.query("select fingerprint,result from crewmori.command_receipts where workspace_id=$1 and actor_id=$2 and operation=$3 and key=$4", [actor.workspaceId, actor.userId, operation, key]);
  if (!prior.rowCount) return null;
  assertService(prior.rows[0].fingerprint === fingerprint(input), "IDEMPOTENCY_CONFLICT", "This key was already used for different input.", 409);
  return prior.rows[0].result;
}
export async function saveCommand(client: PoolClient, actor: OwnerActor, operation: string, key: string, input: unknown, result: unknown) {
  await client.query("insert into crewmori.command_receipts(workspace_id,actor_id,operation,key,fingerprint,result) values($1,$2,$3,$4,$5,$6)", [actor.workspaceId, actor.userId, operation, key, fingerprint(input), JSON.stringify(result)]);
}
// File locators are stored as text; compare against the uuid primary key without casting the column,
// which would bypass its index. Non-UUID locators (such as external links) match nothing.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidOrNull = (value: unknown): string | null => typeof value === "string" && uuidPattern.test(value) ? value : null;
