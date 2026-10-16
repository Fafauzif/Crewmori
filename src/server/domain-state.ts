import type { PoolClient } from "pg";
import { emptyState, workspaceState } from "../lib/workspace-state";
import { o, s, type StoreState, type Entity } from "../lib/types";
import { appendEvent } from "./repository";

const transient = new Set(["events", "command_receipts", "connections", "agent_runs", "model_calls", "local_accounts", "recovery_grants", "sample_sessions"]);
export async function initializeWorkspace(client: PoolClient, workspace: { id: string; owner_id: string; name: string }, email = "") {
  if ((await client.query("select 1 from crewmori.records where workspace_id=$1 and collection='owners'", [workspace.id])).rowCount) return;
  const state = workspaceState(workspace, email);
  await persistDomain(client, emptyState(), state, workspace.id);
}
export async function loadDomain(client: PoolClient, workspaceId: string): Promise<StoreState> {
  const workspace = (await client.query("select * from crewmori.workspaces where id=$1", [workspaceId])).rows[0];
  const state = emptyState();
  state.session = true;
  state.revision = Number(workspace.revision);
  const records = await client.query("select collection,id,version,data from crewmori.records where workspace_id=$1", [workspaceId]);
  for (const row of records.rows) (state.tables[row.collection] ||= {})[row.id] = { ...row.data, id: row.id, version: row.version, workspace_id: workspaceId };
  state.ui = o(state.tables.workspace_ui?.current?.values);
  const events = await client.query("select * from crewmori.events where workspace_id=$1 order by sequence", [workspaceId]);
  state.tables.events = Object.fromEntries(events.rows.map((row) => [row.id, { id: row.id, version: 1, sequence: Number(row.sequence), kind: row.kind, summary: row.summary, record_refs: row.record_refs, occurred_at: row.created_at.toISOString(), visibility: "owner" }]));
  const connections = await client.query("select scopes,state,version from crewmori.connections where workspace_id=$1 and provider='google'", [workspaceId]);
  const connection = connections.rows[0];
  state.tables.connections = {};
  for (const [id, scope, capabilities] of [
    ["gmail", "gmail.compose", ["draft_message", "simulate_send"]],
    ["calendar", "calendar.events", ["draft_event", "simulate_invite", "read_sample_events"]],
    ["drive", "drive.file", ["read_sample_files", "attach_sample_reference"]],
  ] as const) {
    const active = connection?.state === "active" && connection.scopes.some((item: string) => item.includes(scope));
    state.tables.connections[id] = { id, version: connection?.version || 1, label: id === "gmail" ? "Gmail" : id === "calendar" ? "Calendar" : "Drive", mode: "connected", state: active ? "connected" : "disconnected", capabilities, approved_capabilities: active ? capabilities : [], account_label: active ? "Google account" : "" };
  }
  const runs = await client.query("select id,role,instruction,state,control_version,input_refs,artifact,error_code,created_at,updated_at from crewmori.agent_runs where workspace_id=$1 order by created_at", [workspaceId]);
  state.tables.agent_runs = {};
  for (const row of runs.rows) {
    state.tables.agent_runs[row.id] = { id: row.id, version: row.control_version, role_id: row.role, intent: row.instruction, state: row.state, status: row.state, task_kind: "reasoning", input_refs: row.input_refs, artifact: row.artifact, error_code: row.error_code, created_at: row.created_at.toISOString(), updated_at: row.updated_at.toISOString(), steps: [], artifact_ids: row.artifact ? [`artifact_${row.id}`] : [] };
    if (row.artifact) (state.tables.artifacts ||= {})[`artifact_${row.id}`] = { id: `artifact_${row.id}`, version: row.control_version, run_id: row.id, role_id: row.role, title: row.artifact.title, summary: row.artifact.summary, body: row.artifact.summary, facts: row.artifact.facts, unknowns: row.artifact.unknowns, recommendations: row.artifact.recommendations, status: "awaiting_review", requires_owner_review: true };
  }
  return state;
}
export async function persistDomain(client: PoolClient, before: StoreState, after: StoreState, workspaceId: string) {
  for (const [collection, records] of Object.entries(after.tables)) {
    if (transient.has(collection)) continue;
    for (const record of Object.values(records)) {
      if (record.version === before.tables[collection]?.[record.id]?.version) continue;
      // Projection-only artifacts are backed by agent_runs, never written back as domain authority.
      if (collection === "artifacts" && record.requires_owner_review) continue;
      await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,$2,$3,$4,$5) on conflict(workspace_id,collection,id) do update set version=excluded.version,data=excluded.data", [workspaceId, collection, record.id, record.version, JSON.stringify(record)]);
    }
    for (const id of Object.keys(before.tables[collection] || {})) {
      if (!records[id]) await client.query("delete from crewmori.records where workspace_id=$1 and collection=$2 and id=$3", [workspaceId, collection, id]);
    }
  }
  if (JSON.stringify(after.ui) !== JSON.stringify(before.ui)) {
    await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'workspace_ui','current',1,$2) on conflict(workspace_id,collection,id) do update set version=crewmori.records.version+1,data=excluded.data", [workspaceId, JSON.stringify({ values: after.ui })]);
  }
  for (const event of Object.values(after.tables.events || {})) {
    if (!before.tables.events?.[event.id]) await appendEvent(client, workspaceId, s(event.kind), s(event.summary).replace(/sample /gi, ""), event.record_refs as unknown[]);
  }
}
export function ownerProjection(state: StoreState): StoreState {
  const result = structuredClone(state);
  for (const table of ["command_receipts", "buyer_grants", "workspace_ui"]) delete result.tables[table];
  // Grant IDs are not credentials. Invitation tokens are only returned by the explicit invite action.
  result.tables.engagements = Object.fromEntries(Object.values(result.tables.engagements || {}).map((e): [string, Entity] => [e.id, { ...e, buyer_grant_id: null }]));
  return result;
}
