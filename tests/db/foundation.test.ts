import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { database, transaction, closeDatabase } from "../../src/server/db";
import { startTask, controlTask } from "../../src/server/tasks";
import { agentGraph, runReasoning, saveRunArtifact, recordRunFailure } from "../../src/server/agent-runtime";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PgBoss } from "pg-boss";
import { recordPaymentObservation } from "../../src/server/webhooks";
import { runVoiceTool } from "../../src/server/voice-tools";
import { randomToken, hashToken, fingerprint } from "../../src/server/security";
import type { OwnerActor } from "../../src/server/contracts";
import type { ReasoningAdapter } from "../../src/server/providers/reasoning";

const ownerA = "00000000-0000-4000-8000-000000000001";
const ownerB = "00000000-0000-4000-8000-000000000002";
let workspaceA: string, workspaceB: string;
before(async () => {
  assert.equal(process.env.CREWMORI_DB_TEST, "disposable", "Use npm run test:db; this suite requires its disposable cluster.");
  await database().query(`create role anon nologin; create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await database().query(await readFile(new URL(name, directory), "utf8"));
  const result = await database().query("insert into crewmori.workspaces(owner_id,name) values($1,'A'),($2,'B') returning id", [ownerA, ownerB]);
  [workspaceA, workspaceB] = result.rows.map((row) => row.id);
  await database().query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'clients','private-a',1,'{}'),($2,'clients','private-b',1,'{}')", [workspaceA, workspaceB]);
});
after(closeDatabase);

test("connected work workflows persist exact task fields, atomic milestone assignments and scoped file references", async () => {
  const { initializeWorkspace } = await import("../../src/server/domain-state");
  const { runDomainCommand, ownerState } = await import("../../src/server/domain");
  const workspace = (await database().query("insert into crewmori.workspaces(owner_id,name) values($1,'Workflows test') returning *", [randomUUID()])).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  await transaction((client) => initializeWorkspace(client, workspace));
  for (const [collection, id, data] of [
    ["clients", "workflow-client", { name: "Workflow client" }],
    ["projects", "workflow-project", { client_id: "workflow-client", title: "Source review", state: "active", professional_delivery_state: "in_progress" }],
  ] as const) await database().query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,$2,$3,1,$4)", [workspace.id, collection, id, JSON.stringify(data)]);
  const send = (type: string, input: Record<string, unknown>, key = randomUUID()) => runDomainCommand(actor, { type, input, idempotencyKey: key });
  const values = { project_id: "workflow-project", title: "Analyze the inputs", notes: "Keep the original assumptions", kind: "professional", assignee_id: actor.userId, due_at: null, milestone_id: null, shared_with_buyer: false };
  await assert.rejects(send("record.save", { table: "work_tasks", values }), /dedicated workflow/);
  const key = randomUUID();
  const task = await send("task.save", { values }, key);
  assert.equal((await send("task.save", { values }, key)).result.id, task.result.id);
  let state = await ownerState(actor);
  assert.equal(state.tables.work_tasks[task.result.id!].notes, values.notes);
  assert.equal(state.tables.work_tasks[task.result.id!].assignee_id, actor.userId);
  const milestoneValues = { project_id: "workflow-project", title: "First review", due_at: "2026-10-25T17:00:00+07:00", notes: "", task_ids: [task.result.id] };
  await assert.rejects(send("milestone.save", { values: milestoneValues, expected_task_versions: { [task.result.id!]: 0 } }), /changed in another view/);
  state = await ownerState(actor);
  assert.equal(Object.keys(state.tables.milestones || {}).length, 0);
  assert.equal(state.tables.work_tasks[task.result.id!].milestone_id, null);
  const milestone = await send("milestone.save", { values: milestoneValues, expected_task_versions: { [task.result.id!]: 1 } });
  state = await ownerState(actor);
  assert.equal(state.tables.work_tasks[task.result.id!].milestone_id, milestone.result.id);
  const reference = await send("file.link", { values: { project_id: "workflow-project", client_id: "workflow-client", name: "Reference brief", storage_locator: "https://example.com/brief", shared_with_buyer: true } });
  state = await ownerState(actor);
  assert.equal(state.tables.attachments[reference.result.id!].storage_kind, "external_link");
  assert.ok((state.tables.projects["workflow-project"].shared_attachment_ids as string[]).includes(reference.result.id!));
  await assert.rejects(send("file.link", { values: { project_id: "workflow-project", client_id: "private-b", name: "Wrong client", storage_locator: "https://example.com/brief", shared_with_buyer: true } }), /project's client/);
  const fileId = randomUUID();
  await database().query("insert into crewmori.files(id,workspace_id,owner_id,name,mime_type,byte_size,sha256,object_path,state) values($1,$2,$3,'Evidence.txt','text/plain',20,'verified-hash',$4,'available')", [fileId, actor.workspaceId, actor.userId, `workflows/${fileId}`]);
  const attached = await send("file.attach", { values: { project_id: "workflow-project", name: "Evidence.txt", storage_locator: fileId, media_type: "image/png", byte_length: 1, shared_with_buyer: false } });
  state = await ownerState(actor);
  assert.equal(state.tables.attachments[attached.result.id!].media_type, "text/plain", "File metadata comes from the verified server upload");
  assert.equal(state.tables.attachments[attached.result.id!].byte_length, 20);
  assert.equal(state.tables.attachments[attached.result.id!].storage_kind, "private");
  await assert.rejects(send("file.attach", { values: { project_id: "workflow-project", name: "Duplicate bytes", storage_locator: fileId, shared_with_buyer: false } }), /already attached/);
  const engagementId = `workflow-engagement-${randomUUID()}`;
  await database().query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'engagements',$2,1,$3)", [actor.workspaceId, engagementId, JSON.stringify({ project_id: "workflow-project", client_id: "workflow-client", conversation_id: "workflow-conversation" })]);
  const grant = (await database().query("insert into crewmori.buyer_grants(workspace_id,engagement_id,token_hash,expires_at) values($1,$2,$3,now()+interval '1 hour') returning id", [actor.workspaceId, engagementId, randomUUID()])).rows[0];
  await database().query("update crewmori.files set engagement_id=$2,audience='owner' where id=$1", [fileId, engagementId]);
  const buyer = { kind: "buyer" as const, workspaceId: actor.workspaceId, engagementId, grantId: grant.id };
  await assert.rejects(runDomainCommand(buyer, { type: "file.attach", input: { values: { project_id: "workflow-project", name: "Previously unshared bytes", storage_locator: fileId, shared_with_buyer: true } }, idempotencyKey: randomUUID() }), /available to this session/);
  assert.equal((await database().query("select audience from crewmori.files where id=$1", [fileId])).rows[0].audience, "owner");
  const buyerFileId = randomUUID();
  await database().query("insert into crewmori.files(id,workspace_id,owner_id,engagement_id,name,mime_type,byte_size,sha256,object_path,state,audience) values($1,$2,$3,$4,'Buyer.txt','text/plain',20,'buyer-verified-hash',$5,'available','buyer')", [buyerFileId, actor.workspaceId, actor.userId, engagementId, `workflows/${buyerFileId}`]);
  await assert.rejects(runDomainCommand(buyer, { type: "file.attach", input: { values: { project_id: "workflow-project", conversation_id: "foreign-conversation", name: "Mixed relations", storage_locator: buyerFileId, shared_with_buyer: true } }, idempotencyKey: randomUUID() }), /current client space/);
  assert.equal((await database().query("select engagement_id from crewmori.files where id=$1", [buyerFileId])).rows[0].engagement_id, engagementId);
  await assert.rejects(send("file.attach", { values: { project_id: "workflow-project", name: "Missing upload", storage_locator: randomUUID(), shared_with_buyer: false } }), /Upload a file/);
});

test("RLS excludes another owner's records even with its exact workspace ID", async () => {
  await transaction(async (client) => {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [ownerA]);
    const all = await client.query("select id from crewmori.records");
    assert.deepEqual(all.rows.map((row) => row.id), ["private-a"]);
    assert.equal((await client.query("select * from crewmori.records where workspace_id=$1", [workspaceB])).rowCount, 0);
  });
});
test("authenticated browser roles cannot read tokens or write domain records", async () => {
  for (const query of ["select * from crewmori.connections", "select * from crewmori.buyer_grants", "delete from crewmori.records"]) {
    await assert.rejects(transaction(async (client) => {
      await client.query("SET LOCAL ROLE authenticated");
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [ownerA]);
      await client.query(query);
    }), /permission denied/);
  }
});
test("anonymous database role has no application schema access", async () => {
  await assert.rejects(transaction(async (client) => {
    await client.query("SET LOCAL ROLE anon");
    await client.query("select * from crewmori.workspaces");
  }), /permission denied/);
});
test("failed multi-record writes roll back their earlier mutation", async () => {
  await assert.rejects(transaction(async (client) => {
    await client.query("update crewmori.records set version=2 where workspace_id=$1", [workspaceA]);
    await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'clients','private-a',1,'{}')", [workspaceA]);
  }), /duplicate key/);
  const result = await database().query("select version from crewmori.records where workspace_id=$1", [workspaceA]);
  assert.equal(result.rows[0].version, 1);
});

const actorA = (): OwnerActor => ({ kind: "owner", userId: ownerA, workspaceId: workspaceA });
const output = { artifact: { title: "Assessment", summary: "Budget is unknown.", facts: [], unknowns: ["Budget"], recommendations: ["Ask for a budget"], requiresOwnerReview: true as const }, usage: { inputTokens: 20, outputTokens: 40, model: "test-adapter" } };
test("concurrent identical task submissions create one run and one outbox entry", async () => {
  const input = { role: "scout", instruction: "Assess the lead", references: [], idempotencyKey: randomUUID() };
  const [a, b] = await Promise.all([startTask(actorA(), input), startTask(actorA(), input)]);
  assert.equal(a.id, b.id);
  assert.equal((await database().query("select * from crewmori.outbox where reference_id=$1", [a.id])).rowCount, 1);
  await assert.rejects(startTask(actorA(), { ...input, instruction: "Different task" }), /different input/);
});
test("privileged task service rejects forged membership and cross-workspace source IDs", async () => {
  const input = { role: "scout", instruction: "Assess the lead", references: [], idempotencyKey: randomUUID() };
  await assert.rejects(startTask({ kind: "owner", userId: ownerA, workspaceId: workspaceB }, input), /unavailable/);
  await assert.rejects(startTask(actorA(), { ...input, references: [{ table: "clients", id: "private-b", version: 1 }] }), /unavailable/);
});
test("confirmed model response is reused after retry without a second paid call", async () => {
  let calls = 0;
  const adapter: ReasoningAdapter = { generate: async () => { calls++; return output; } };
  const run = await startTask(actorA(), { role: "finance", instruction: "Inspect missing invoice facts", idempotencyKey: randomUUID() });
  const ref = { workspaceId: workspaceA, runId: String(run.id), controlVersion: 1 };
  const first = await runReasoning(ref, adapter);
  const replay = await runReasoning(ref, adapter);
  assert.deepEqual(first, replay);
  assert.equal(calls, 1);
  await saveRunArtifact(ref, first);
  await saveRunArtifact(ref, first);
  const events = await database().query("select * from crewmori.events where workspace_id=$1 and kind='artifact.saved'", [workspaceA]);
  assert.equal(events.rowCount, 1);
});
test("cancellation during a model call preserves usage but prevents artifact completion", async () => {
  const run = await startTask(actorA(), { role: "operations", instruction: "Check required inputs", idempotencyKey: randomUUID() });
  const ref = { workspaceId: workspaceA, runId: String(run.id), controlVersion: 1 };
  let entered!: () => void, release!: () => void;
  const active = new Promise<void>((resolve) => { entered = resolve; });
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const pending = runReasoning(ref, { generate: async () => { entered(); await barrier; return output; } });
  await active;
  await controlTask(actorA(), ref.runId, { action: "cancel", expectedVersion: 1, idempotencyKey: randomUUID() });
  release();
  const generated = await pending;
  await assert.rejects(saveRunArtifact(ref, generated), /control changed/);
  const saved = await database().query("select state,artifact from crewmori.agent_runs where id=$1", [run.id]);
  assert.equal(saved.rows[0].state, "cancelled");
  assert.equal(saved.rows[0].artifact, null);
  assert.equal((await database().query("select state from crewmori.model_calls where run_id=$1", [run.id])).rows[0].state, "completed");
});
test("concurrent roles cannot reserve more than the shared daily token budget", async () => {
  const old = process.env.AGENT_DAILY_TOKEN_BUDGET;
  process.env.AGENT_DAILY_TOKEN_BUDGET = "10000";
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  try {
    const actor: OwnerActor = { kind: "owner", userId: ownerB, workspaceId: workspaceB };
    const runs = await Promise.all(["scout", "sales"].map((role) => startTask(actor, { role, instruction: "Assess a fresh request", idempotencyKey: randomUUID() })));
    let entered!: () => void;
    const active = new Promise<void>((resolve) => { entered = resolve; });
    const one = runReasoning({ workspaceId: workspaceB, runId: String(runs[0].id), controlVersion: 1 }, { generate: async () => { entered(); await barrier; return output; } });
    await active;
    await assert.rejects(runReasoning({ workspaceId: workspaceB, runId: String(runs[1].id), controlVersion: 1 }, { generate: async () => output }), /budget/);
    release(); await one;
  } finally { release?.(); if (old === undefined) delete process.env.AGENT_DAILY_TOKEN_BUDGET; else process.env.AGENT_DAILY_TOKEN_BUDGET = old; }
});

test("LangGraph checkpoints survive graph reconstruction and pg-boss persists dispatch", async () => {
  const checkpointer = new PostgresSaver(database(), undefined, { schema: "crewmori_checkpoints" });
  await checkpointer.setup();
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, schema: "crewmori_jobs" });
  boss.on("error", () => {});
  await boss.start();
  try {
    await boss.createQueue("integration-task");
    const run = await startTask(actorA(), { role: "account_manager", instruction: "Prepare a follow-up draft", idempotencyKey: randomUUID() });
    const ref = { workspaceId: workspaceA, runId: String(run.id), controlVersion: 1 };
    const job = await boss.send("integration-task", ref);
    assert.ok(job);
    const jobs = await boss.fetch<typeof ref>("integration-task");
    assert.deepEqual(jobs[0].data, ref);
    let calls = 0;
    const adapter: ReasoningAdapter = { generate: async () => { calls++; return output; } };
    const config = { configurable: { thread_id: `${ref.workspaceId}:${ref.runId}:1` } };
    await agentGraph(checkpointer, adapter).invoke(ref, config);
    const restored = await agentGraph(checkpointer, adapter).getState(config);
    assert.equal(restored.values.artifact.title, "Assessment");
    await agentGraph(checkpointer, adapter).invoke(ref, config);
    assert.equal(calls, 1);
    await boss.complete("integration-task", job);
  } finally { await boss.stop({ graceful: true, timeout: 2000 }); }
});
test("an uncertain model attempt is retained and cannot silently call the provider again", async () => {
  const run = await startTask(actorA(), { role: "sales", instruction: "Collect project requirements", idempotencyKey: randomUUID() });
  const ref = { workspaceId: workspaceA, runId: String(run.id), controlVersion: 1 };
  let calls = 0;
  const adapter: ReasoningAdapter = { generate: async () => { calls++; throw Error("network timeout"); } };
  await assert.rejects(runReasoning(ref, adapter), /network timeout/);
  await assert.rejects(runReasoning(ref, adapter), /no confirmed response/);
  assert.equal(calls, 1);
  await recordRunFailure(ref, new Error("network timeout"));
});
test("concurrent retries of one blocked run start a single new attempt", async () => {
  const run = await startTask(actorA(), { role: "operations", instruction: "Check the delivery window", idempotencyKey: randomUUID() });
  const blocked = (await database().query("update crewmori.agent_runs set state='blocked',control_version=control_version+1 where id=$1 returning control_version", [run.id])).rows[0];
  const retry = () => controlTask(actorA(), String(run.id), { action: "retry", expectedVersion: blocked.control_version, idempotencyKey: randomUUID() });
  const results = await Promise.allSettled([retry(), retry()]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await database().query("select count(*)::int as count from crewmori.agent_runs where previous_attempt_id=$1", [run.id])).rows[0].count, 1);
  await assert.rejects(controlTask(actorA(), String(run.id), { action: "retry", expectedVersion: blocked.control_version + 1, idempotencyKey: randomUUID() }), /already retried/);
});
test("receipt replays, changed payloads and mismatched amounts preserve a single observation without settlement", async () => {
  const request = (await database().query("insert into crewmori.payment_requests(workspace_id,invoice_id,engagement_id,provider,expected_minor,currency) values($1,'invoice-a','engagement-a','sandbox',27000,'USD') returning id", [workspaceA])).rows[0];
  const receipt = { eventId: "sandbox-event-1", requestId: request.id, currency: "USD" as const, grossMinor: 10000, feeMinor: 200, occurredAt: "2026-10-16T00:00:00Z" };
  const [a, b] = await Promise.all([recordPaymentObservation("sandbox", receipt, null), recordPaymentObservation("sandbox", receipt, null)]);
  assert.ok(a.replayed || b.replayed);
  await assert.rejects(recordPaymentObservation("sandbox", { ...receipt, grossMinor: 27000 }, null), /different content/);
  assert.equal((await database().query("select * from crewmori.payment_observations where request_id=$1", [request.id])).rowCount, 1);
  assert.equal((await database().query("select state from crewmori.payment_requests where id=$1", [request.id])).rows[0].state, "created");
  await recordPaymentObservation("sandbox", { ...receipt, eventId: "wrong-currency", currency: "IDR", grossMinor: 27000 }, null);
  assert.equal((await database().query("select count(*)::int as count from crewmori.payment_observations where request_id=$1 and state='review_required'", [request.id])).rows[0].count, 2);
});
test("different Stripe event IDs for one checkout cannot duplicate a receipt", async () => {
  const request = (await database().query("insert into crewmori.payment_requests(workspace_id,invoice_id,engagement_id,provider,provider_reference,expected_minor,currency) values($1,'invoice-b','engagement-b','stripe_test','cs_test_same',27000,'USD') returning id", [workspaceA])).rows[0];
  const receipt = { eventId: "stripe-event-1", requestId: request.id, currency: "USD" as const, grossMinor: 27000, feeMinor: null, occurredAt: "2026-10-16T00:00:00Z" };
  await recordPaymentObservation("stripe_test", receipt, "cs_test_same");
  await recordPaymentObservation("stripe_test", { ...receipt, eventId: "stripe-event-2" }, "cs_test_same");
  assert.equal((await database().query("select * from crewmori.payment_observations where request_id=$1", [request.id])).rowCount, 1);
  assert.equal((await recordPaymentObservation("stripe_test", { ...receipt, eventId: "unknown-ref" }, "cs_test_other")).state, "quarantined");
});
test("a failed reconciliation keeps the verified receipt for review instead of rolling it back", async () => {
  const request = (await database().query("insert into crewmori.payment_requests(workspace_id,invoice_id,engagement_id,provider,expected_minor,currency) values($1,'invoice-c','engagement-c','sandbox',27000,'USD') returning id", [workspaceA])).rows[0];
  const receipt = { eventId: "sandbox-reconcile-fails", requestId: request.id, currency: "USD" as const, grossMinor: 27000, feeMinor: null, occurredAt: "2026-10-16T00:00:00Z" };
  const result = await recordPaymentObservation("sandbox", receipt, null, async () => { throw Error("allocation failed"); });
  assert.equal(result.state, "review_required");
  assert.equal((await database().query("select state from crewmori.payment_observations where request_id=$1", [request.id])).rows[0].state, "review_required");
  assert.equal((await database().query("select state from crewmori.provider_inbox where provider='sandbox' and event_id=$1", [receipt.eventId])).rows[0].state, "processed");
  assert.equal((await recordPaymentObservation("sandbox", receipt, null)).replayed, true, "A provider retry is a replay, not a second failure");
});
test("voice tools bind their writes to a current buyer grant and reject arbitrary tools", async () => {
  const grant = (await database().query("insert into crewmori.buyer_grants(workspace_id,engagement_id,token_hash,expires_at) values($1,'engagement-voice',$2,now()+interval '1 hour') returning id", [workspaceA, hashToken(randomToken())])).rows[0];
  const token = randomToken();
  await database().query("insert into crewmori.voice_sessions(workspace_id,grant_id,engagement_id,binding_hash,expires_at) values($1,$2,'engagement-voice',$3,now()+interval '1 hour')", [workspaceA, grant.id, hashToken(token)]);
  const envelope = { sessionBinding: token, eventId: randomUUID(), input: { scope: "Two animations" } };
  await runVoiceTool("capture_requirements", envelope);
  await runVoiceTool("capture_requirements", envelope);
  const record = await database().query("select workspace_id,version,data from crewmori.records where collection='buyer_briefs' and id='engagement-voice'");
  assert.equal(record.rows[0].workspace_id, workspaceA);
  assert.equal(record.rows[0].version, 1);
  await assert.rejects(runVoiceTool("payment.accept", envelope), /not allowed/);
  await database().query("update crewmori.buyer_grants set revoked_at=now() where id=$1", [grant.id]);
  await assert.rejects(runVoiceTool("capture_requirements", { ...envelope, eventId: randomUUID() }), /revoked/);
});

test("worker process starts with durable queue/checkpoints and shuts down cleanly", { timeout: 20000 }, async () => {
  const worker = spawn(process.execPath, ["--import", "tsx", "scripts/worker.ts"], {
    env: { ...process.env, CREWMORI_BACKEND_ENABLED: "true", ANTHROPIC_API_KEY: "", ANTHROPIC_MODEL: "", GEMINI_MODEL: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  worker.stderr.on("data", () => {});
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("Worker readiness timed out.")), 10000);
      worker.stdout.on("data", (data) => { output += data; if (output.includes("worker ready")) { clearTimeout(timer); resolve(); } });
      worker.once("exit", (code) => { clearTimeout(timer); reject(Error(`Worker exited before readiness (${code}).`)); });
    });
    const ended = once(worker, "exit");
    worker.kill("SIGTERM");
    const [code] = await ended;
    assert.equal(code, 0);
  } finally { if (worker.exitCode === null) worker.kill("SIGKILL"); }
});

test("connected workspaces start empty, persist setup and publish a unique public profile", async () => {
  const { initializeWorkspace } = await import("../../src/server/domain-state");
  const { runDomainCommand, ownerState } = await import("../../src/server/domain");
  const { getPublicProfile } = await import("../../src/server/buyers");
  const workspace = (await database().query("insert into crewmori.workspaces(owner_id,name) values($1,'Independent studio') returning *", [randomUUID()])).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  await transaction((client) => initializeWorkspace(client, workspace, "owner@example.test"));
  let state = await ownerState(actor);
  assert.equal(Object.keys(state.tables.clients || {}).length, 0);
  assert.equal(Object.values(state.tables.owners)[0].id, workspace.owner_id);
  assert.equal(JSON.stringify(state).includes("Northstar"), false);
  const send = (type: string, input: Record<string, unknown>) => runDomainCommand(actor, { type, input, idempotencyKey: randomUUID() });
  await send("setup.saveStep", { step: "business", values: { basics: { name: "Rani", profession: "Designer", locale: "en", timezone: "Asia/Jakarta" }, services: [], availability: { days: [0, 1, 2, 3, 4], deposit_percent: 50 } } });
  await send("setup.complete", {});
  state = await ownerState(actor);
  assert.equal(Object.values(state.tables.owners)[0].display_name, "Rani");
  assert.equal(Object.values(state.tables.onboarding_sessions)[0].state, "completed");
  await send("record.save", { table: "profiles", id: "profile_current", values: { handle: "rani-test", headline: "Design for teams", biography: "Independent designer", public_availability: "open_to_inquiries" } });
  state = await ownerState(actor);
  const profile = state.tables.profiles.profile_current;
  await send("profile.publish", { id: profile.id, expected_version: profile.version, confirmed: true });
  const published = await getPublicProfile("rani-test");
  assert.equal(published.public_name, "Rani");
  assert.equal(JSON.stringify(published).includes("owner@example.test"), false);
  await assert.rejects(send("record.save", { table: "receipts", values: { gross: { amount_minor: 999 } } }), /dedicated workflow/);
  await assert.rejects(send("record.save", { table: "profiles", id: "profile_current", values: { published: true } }), /dedicated workflow/);
  await assert.rejects(send("payment.simulateReceipt", {}), /not available/);
  await assert.rejects(send("sample.reset", {}), /not available/);
});

test("public inquiries are durable and buyer sessions cannot read or change another engagement", async () => {
  const { submitInquiry, buyerState, createInvitation, exchangeInvitation } = await import("../../src/server/buyers");
  const { runDomainCommand } = await import("../../src/server/domain");
  const input = { handle: "rani-test", values: { name: "Buyer", email: "buyer@example.test", request: "Please design a product page", consent: true }, idempotencyKey: randomUUID() };
  const first = await submitInquiry(input, "browser-one");
  const replay = await submitInquiry(input, "browser-one");
  assert.equal(first.engagementId, replay.engagementId);
  const grant = (await database().query("select * from crewmori.buyer_grants where id=$1", [first.grantId])).rows[0];
  const actor = { kind: "buyer" as const, workspaceId: grant.workspace_id, engagementId: first.engagementId, grantId: first.grantId };
  const state = await buyerState(actor);
  assert.equal(state.inquiry?.contact.display_name, "Buyer");
  assert.equal(JSON.stringify(state).includes("owner@example.test"), false);
  assert.equal("tables" in state, false);
  await assert.rejects(runDomainCommand(actor, { type: "profile.publish", input: {}, idempotencyKey: randomUUID() }), /not available/);
  await assert.rejects(buyerState({ ...actor, engagementId: "someone-else" }), /expired or was revoked/);
  const conv = state.inquiry!.conversation;
  await runDomainCommand(actor, { type: "conversation.send", input: { id: conv.id, content: "Here is the timeline." }, idempotencyKey: randomUUID() });
  const updated = await buyerState(actor);
  assert.equal(updated.inquiry?.messages.length, 2, "No fake representative reply is added in connected mode");
  const ownerId = (await database().query("select owner_id from crewmori.workspaces where id=$1", [actor.workspaceId])).rows[0].owner_id;
  const invitation = await createInvitation({ kind: "owner", workspaceId: actor.workspaceId, userId: ownerId }, actor.engagementId);
  await assert.rejects(buyerState(actor), /expired or was revoked/);
  const session = await exchangeInvitation(invitation.token);
  assert.ok(session.token);
  await assert.rejects(exchangeInvitation(invitation.token), /already opened/);
  const firstSession = { ...actor, grantId: session.grantId };
  await buyerState(firstSession);
  const owner = { kind: "owner" as const, workspaceId: actor.workspaceId, userId: ownerId };
  const replacedLink = await createInvitation(owner, actor.engagementId);
  await assert.rejects(buyerState(firstSession), /expired or was revoked/);
  const currentLink = await createInvitation(owner, actor.engagementId);
  await assert.rejects(exchangeInvitation(replacedLink.token), /already opened/);
  const currentSession = await exchangeInvitation(currentLink.token);
  await buyerState({ ...actor, grantId: currentSession.grantId });
  const events = (await database().query("select summary,record_refs from crewmori.events where workspace_id=$1 and kind='buyer.invitation_replaced' and record_refs @> $2::jsonb", [actor.workspaceId, JSON.stringify([{ table: "engagements", id: actor.engagementId }])])).rows;
  assert.equal(events.length, 3, "Each deliberate access replacement must have an owner audit record");
  for (const event of events) {
    assert.match(event.summary, /Previous links and sessions were revoked/);
    for (const token of [invitation.token, replacedLink.token, currentLink.token]) assert.equal(JSON.stringify(event).includes(token), false, "Access credentials must never enter activity records");
  }
});

test("connected offer acceptance and verified payment settle one project without duplicate receipts", async () => {
  const { submitInquiry, buyerState } = await import("../../src/server/buyers");
  const { runDomainCommand, ownerState } = await import("../../src/server/domain");
  const { startPayment } = await import("../../src/server/payments");
  const inquiry = await submitInquiry({ handle: "rani-test", values: { name: "Payment buyer", email: "payment@example.test", request: "Design a landing page", consent: true }, idempotencyKey: randomUUID() }, "browser-payments");
  const grant = (await database().query("select * from crewmori.buyer_grants where id=$1", [inquiry.grantId])).rows[0];
  const workspace = (await database().query("select * from crewmori.workspaces where id=$1", [grant.workspace_id])).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  const buyer = { kind: "buyer" as const, workspaceId: workspace.id, engagementId: inquiry.engagementId, grantId: inquiry.grantId };
  const send = (type: string, input: Record<string, unknown>) => runDomainCommand(actor, { type, input, idempotencyKey: randomUUID() });
  let state = await ownerState(actor);
  const engagement = state.tables.engagements[inquiry.engagementId], opportunity = state.tables.opportunities[String(engagement.opportunity_id)], requirements = state.tables.requirements[String(opportunity.requirements_id)], policy = state.tables.policies.policy_business;
  // Controlled assessment fixtures isolate the commercial test from paid providers.
  for (const role of ["scout", "operations", "finance"]) await database().query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'assessments',$2,1,$3)", [actor.workspaceId, `${role}-${inquiry.engagementId}`, JSON.stringify({ role_id: role, opportunity_id: opportunity.id, requirements_version: requirements.version, policy_version: policy.version, status: "current", summary: "Reviewed test evidence" })]);
  const draft = await send("offer.saveDraft", { values: { client_id: engagement.client_id, opportunity_id: opportunity.id, title: "Landing page", deliverables: [{ key: "page", label: "One designed page", quantity: 1 }], price: { amount_minor: 100000, currency: "USD", scale: 2 }, estimated_effort_minutes: 120, terms: { delivery_business_days: 5, deposit_basis_points: 5000, reservation_hours: 48, start_basis: "next_business_day_after_confirmed_deposit_and_required_inputs", timezone: "Asia/Jakarta", workdays: [0, 1, 2, 3, 4], holidays: [], start_local_time: "09:00", due_local_time: "17:00", required_input_keys: [], acceptance_disclosure: "Deposit starts work. Delivery in five business days." } } });
  const offerId = draft.result.id!;
  await send("offer.requestReview", { id: offerId });
  await send("offer.approve", { id: offerId, destination_contact_id: engagement.contact_id });
  await send("offer.share", { id: offerId, channel: "link" });
  const shared = await buyerState(buyer);
  assert.ok(shared.offer?.accept_eligibility.allowed);
  const accept = { type: "offer.accept", input: { id: offerId, confirmed: true, offer_version_id: shared.offer!.offer_version_id }, idempotencyKey: randomUUID() };
  const [first, second] = await Promise.all([runDomainCommand(buyer, accept), runDomainCommand(buyer, accept)]);
  assert.deepEqual(first.result.ids, second.result.ids);
  state = await ownerState(actor);
  const projectId = first.result.ids!.project_id, requestId = first.result.ids!.payment_request_id;
  assert.equal(Object.values(state.tables.projects).filter((project) => project.id === projectId).length, 1);
  const payment = await startPayment(buyer, requestId, randomUUID());
  const replay = await startPayment(buyer, requestId, randomUUID());
  assert.equal(payment.id, replay.id);
  const row = (await database().query("select * from crewmori.payment_requests where id=$1", [payment.id])).rows[0];
  const receipt = { eventId: `settlement-${randomUUID()}`, requestId: payment.id, currency: "USD" as const, grossMinor: Number(row.expected_minor), feeMinor: 500, occurredAt: new Date().toISOString() };
  assert.equal((await recordPaymentObservation("sandbox", receipt, null)).state, "reconciled");
  await recordPaymentObservation("sandbox", receipt, null);
  state = await ownerState(actor);
  assert.equal(state.tables.invoices[row.invoice_id].state, "paid");
  assert.equal(Object.values(state.tables.allocations).filter((allocation) => allocation.invoice_id === row.invoice_id).length, 1);
  assert.equal(Object.values(state.tables.receipts).filter((item) => item.provider_event_id === receipt.eventId).length, 1);
  assert.equal(state.tables.projects[projectId].deposit_state, "confirmed");
  assert.ok(state.tables.projects[projectId].committed_start_at);
});

test("real worker artifacts only become assessments after owner review of current evidence", async () => {
  const { submitInquiry } = await import("../../src/server/buyers");
  const { ownerState } = await import("../../src/server/domain");
  const { applyArtifact } = await import("../../src/server/artifacts");
  const inquiry = await submitInquiry({ handle: "rani-test", values: { name: "AI buyer", email: "ai@example.test", request: "Assess a new web design request", budget: { amount_minor: 80000, currency: "USD", scale: 2 }, consent: true }, idempotencyKey: randomUUID() }, "browser-ai");
  const grant = (await database().query("select * from crewmori.buyer_grants where id=$1", [inquiry.grantId])).rows[0];
  const workspace = (await database().query("select * from crewmori.workspaces where id=$1", [grant.workspace_id])).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  let state = await ownerState(actor);
  const engagement = state.tables.engagements[inquiry.engagementId], opportunity = state.tables.opportunities[String(engagement.opportunity_id)];
  const run = await startTask(actor, { role: "scout", instruction: "Assess this design inquiry", references: [{ table: "opportunities", id: opportunity.id, version: opportunity.version }], idempotencyKey: randomUUID() });
  let supplied = 0;
  const ref = { workspaceId: workspace.id, runId: String(run.id), controlVersion: 1 };
  const generated = await runReasoning(ref, { generate: async (input) => { supplied = input.sources.length; return output; } });
  await saveRunArtifact(ref, generated);
  state = await ownerState(actor);
  assert.ok(supplied >= 3, "The model receives the opportunity, brief, and policy");
  assert.equal(Object.values(state.tables.assessments).some((item) => item.opportunity_id === opportunity.id), false);
  const action = { expectedVersion: 1, confirmed: true, idempotencyKey: randomUUID() };
  const applied = await applyArtifact(actor, String(run.id), action);
  const replay = await applyArtifact(actor, String(run.id), action);
  assert.equal(applied.result.id, replay.result.id);
  state = await ownerState(actor);
  assert.equal(state.tables.assessments[applied.result.id!].summary, output.artifact.summary);
  assert.equal(state.tables.assessments[applied.result.id!].reviewed_by, actor.userId);
});

test("knowledge jobs index source versions once and exclude archived sources from retrieval", async () => {
  const { runDomainCommand, ownerState } = await import("../../src/server/domain");
  const { ingestKnowledge, searchKnowledge } = await import("../../src/server/knowledge");
  const workspace = (await database().query("select w.* from crewmori.workspaces w join crewmori.public_profiles p on p.workspace_id=w.id where p.handle='rani-test'")).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  const saved = await runDomainCommand(actor, { type: "knowledge.save", input: { source: { label: "Brand capability", content: "We design accessible product websites with a tested design system.", kind: "manual_entry" } }, idempotencyKey: randomUUID() });
  const job = (await database().query("select id from crewmori.knowledge_jobs where workspace_id=$1 and source_id=$2", [workspace.id, saved.result.id])).rows[0];
  let calls = 0;
  const embed = async () => { calls++; return { values: [1, 0, 0], model: "controlled-embedding", dimensions: 3 }; };
  await ingestKnowledge(job.id, embed); await ingestKnowledge(job.id, embed);
  assert.equal(calls, 1);
  const found = await searchKnowledge(actor, "accessible product", false);
  assert.equal(found[0].sourceId, saved.result.id);
  const state = await ownerState(actor);
  assert.equal(state.tables.sources[saved.result.id!].extraction_status, "indexed");
  await runDomainCommand(actor, { type: "knowledge.remove", input: { id: saved.result.id }, idempotencyKey: randomUUID() });
  assert.equal((await searchKnowledge(actor, "accessible product", false)).length, 0);
});

test("approved external dispatch is serialized, exact and never silently repeated after uncertainty", async () => {
  const { ownerState, runDomainCommand } = await import("../../src/server/domain");
  const { dispatchApproved, reviewUnknownDispatch, finalizeConfirmedDispatch } = await import("../../src/server/dispatch");
  const workspace = (await database().query("select w.* from crewmori.workspaces w join crewmori.public_profiles p on p.workspace_id=w.id where p.handle='rani-test'")).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  let state = await ownerState(actor);
  const engagement = Object.values(state.tables.engagements)[0], contact = state.tables.contacts[String(engagement.contact_id)];
  const send = (type: string, input: Record<string, unknown>) => runDomainCommand(actor, { type, input, idempotencyKey: randomUUID() });
  const draft = await send("message.saveDraft", { conversation_id: engagement.conversation_id, subject: "Project update", content: "Please review the draft." });
  await send("message.approve", { id: draft.result.id });
  let entered!: () => void, release!: () => void, calls = 0;
  const active = new Promise<void>((resolve) => { entered = resolve; }), barrier = new Promise<void>((resolve) => { release = resolve; });
  const request = { type: "message.send", input: { id: draft.result.id }, idempotencyKey: randomUUID() };
  const transport = async (_operation: string, payload: Record<string, unknown>) => { calls++; assert.equal((payload.email as Record<string, unknown>).to, contact.email); entered(); await barrier; return { id: "confirmed-provider-message" }; };
  const sending = dispatchApproved(actor, request, transport);
  await active;
  await assert.rejects(send("record.save", { table: "contacts", id: contact.id, values: { email: "changed@example.test" } }), /pending external send/);
  await assert.rejects(dispatchApproved(actor, request, transport), /unresolved/);
  release(); await sending;
  await dispatchApproved(actor, request, transport);
  assert.equal(calls, 1);
  state = await ownerState(actor);
  assert.equal(state.tables.messages[draft.result.id!].shared_with_buyer, true);
  const other = await send("message.saveDraft", { conversation_id: engagement.conversation_id, subject: "Another update", content: "Check the next draft." });
  await send("message.approve", { id: other.result.id });
  const uncertain = { type: "message.send", input: { id: other.result.id }, idempotencyKey: randomUUID() };
  let attempts = 0;
  const timeout = async () => { attempts++; throw Error("controlled timeout"); };
  await assert.rejects(dispatchApproved(actor, uncertain, timeout), /controlled timeout/);
  await assert.rejects(dispatchApproved(actor, uncertain, timeout), /unresolved/);
  assert.equal(attempts, 1);
  const dispatch = (await database().query("select * from crewmori.external_dispatches where command_key=$1", [uncertain.idempotencyKey])).rows[0];
  assert.equal(dispatch.state, "unknown");
  await reviewUnknownDispatch(actor, dispatch.id);
  assert.equal((await database().query("select state from crewmori.external_dispatches where id=$1", [dispatch.id])).rows[0].state, "abandoned");
  // Simulate a process stopping after the provider reference was saved, before local finalization.
  const recovered = await send("message.saveDraft", { conversation_id: engagement.conversation_id, subject: "Recovery", content: "Already delivered externally." });
  await send("message.approve", { id: recovered.result.id });
  const recoveryId = randomUUID(), recoveryInput = { id: recovered.result.id };
  await database().query("insert into crewmori.external_dispatches(id,workspace_id,owner_id,operation,command_key,fingerprint,input,payload,reference_ids,state,provider_reference) values($1,$2,$3,'message.send',$4,$5,$6,$7,$8,'dispatching','confirmed-before-restart')", [recoveryId, actor.workspaceId, actor.userId, randomUUID(), fingerprint({ type: "message.send", input: recoveryInput }), JSON.stringify(recoveryInput), JSON.stringify({ workspaceId: actor.workspaceId, email: { to: contact.email, subject: "Recovery", text: "Already delivered externally." } }), [`messages:${recovered.result.id}`, `contacts:${contact.id}`]]);
  await assert.rejects(reviewUnknownDispatch(actor, recoveryId), /not eligible/);
  await Promise.all([finalizeConfirmedDispatch(actor, recoveryId), finalizeConfirmedDispatch(actor, recoveryId)]);
  assert.equal((await database().query("select state from crewmori.external_dispatches where id=$1", [recoveryId])).rows[0].state, "completed");
  assert.equal((await ownerState(actor)).tables.messages[recovered.result.id!].shared_with_buyer, true);
});

test("source publication requires a separate exact-content review and edits revoke that approval", async () => {
  const { ownerState, runDomainCommand } = await import("../../src/server/domain");
  const workspace = (await database().query("select w.* from crewmori.workspaces w join crewmori.public_profiles p on p.workspace_id=w.id where p.handle='rani-test'")).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  const send = (type: string, input: Record<string, unknown>) => runDomainCommand(actor, { type, input, idempotencyKey: randomUUID() });
  const saved = await send("knowledge.save", { source: { label: "Reviewed capabilities", content: "Accessible websites.", kind: "manual_entry", audience: "public", published: true } });
  let source = (await ownerState(actor)).tables.sources[saved.result.id!];
  assert.equal(source.published, false);
  await assert.rejects(send("record.save", { table: "sources", id: source.id, values: { audience: "public", content: "Unreviewed claim", visibility_reviewed: true, visibility_approved_version: source.version } }), /Save content changes/);
  await send("record.save", { table: "sources", id: source.id, expected_version: source.version, values: { audience: "public", visibility_reviewed: true, visibility_approved_version: source.version } });
  source = (await ownerState(actor)).tables.sources[source.id];
  assert.equal(source.published, true);
  await send("record.save", { table: "sources", id: source.id, expected_version: source.version, values: { content: "Changed capabilities." } });
  source = (await ownerState(actor)).tables.sources[source.id];
  assert.equal(source.published, false);
  await assert.rejects(startTask(actor, { role: "promoter", instruction: "Promote these capabilities", references: [{ table: "sources", id: source.id, version: source.version }], idempotencyKey: randomUUID() }), /reviewed public source/);
});

test("calendar editing persists internal work without manufacturing committed dates or sent invitations", async () => {
  const { ownerState, runDomainCommand } = await import("../../src/server/domain");
  const workspace = (await database().query("select w.* from crewmori.workspaces w join crewmori.public_profiles p on p.workspace_id=w.id where p.handle='rani-test'")).rows[0];
  const actor: OwnerActor = { kind: "owner", workspaceId: workspace.id, userId: workspace.owner_id };
  const save = (values: Record<string, unknown>) => runDomainCommand(actor, { type: "record.save", input: { table: "calendar_events", values }, idempotencyKey: randomUUID() });
  const values = { title: "Design work", starts_at: "2026-11-02T09:00:00-05:00", ends_at: "2026-11-02T10:00:00-05:00", timezone: "America/New_York", kind: "internal_work", state: "scheduled", attendee_ids: [], connection_id: null, external_invitation_state: "not_requested", shared_with_buyer: false };
  const saved = await save(values);
  assert.equal((await ownerState(actor)).tables.calendar_events[saved.result.id!].state, "scheduled");
  await assert.rejects(save({ ...values, state: "committed" }), /reviewed calendar workflow/);
  await assert.rejects(save({ ...values, external_invitation_state: "sent" }), /approved invitation/);
  await assert.rejects(save({ ...values, kind: "committed_start" }), /Agreement dates/);
});

test("voice brief capture appears in its buyer conversation once and requests owner review", async () => {
  const { submitInquiry, buyerState } = await import("../../src/server/buyers");
  const inquiry = await submitInquiry({ handle: "rani-test", values: { name: "Voice buyer", email: "voice@example.test", request: "A product page to discuss by voice", consent: true }, idempotencyKey: randomUUID() }, "voice-browser");
  const grant = (await database().query("select * from crewmori.buyer_grants where id=$1", [inquiry.grantId])).rows[0];
  const binding = randomToken();
  await database().query("insert into crewmori.voice_sessions(workspace_id,grant_id,engagement_id,binding_hash,expires_at) values($1,$2,$3,$4,now()+interval '1 hour')", [grant.workspace_id, grant.id, inquiry.engagementId, hashToken(binding)]);
  const input = { sessionBinding: binding, eventId: randomUUID(), input: { scope: "One accessible product page", timing: "Confirm the launch date" } };
  await runVoiceTool("capture_requirements", input); await runVoiceTool("capture_requirements", input);
  const saved = await buyerState({ kind: "buyer", workspaceId: grant.workspace_id, engagementId: inquiry.engagementId, grantId: grant.id });
  assert.equal(saved.inquiry?.conversation.owner_review_requested, true);
  assert.equal(saved.inquiry?.messages.filter((message) => String(message.content).includes("One accessible product page")).length, 1);
});

test("stale running knowledge jobs are released for retry without touching active leases", async () => {
  const { recoverStaleKnowledgeJobs } = await import("../../src/server/maintenance");
  const jobs = await database().query("insert into crewmori.knowledge_jobs(workspace_id,source_id,source_version,state,started_at) values($1,'lease-stale',1,'running',now()-interval '1 hour'),($1,'lease-active',1,'running',now()) returning id,source_id", [workspaceA]);
  const before = Number((await database().query("select event_sequence from crewmori.workspaces where id=$1", [workspaceA])).rows[0].event_sequence);
  assert.equal(await transaction((client) => recoverStaleKnowledgeJobs(client)), 1);
  assert.equal(await transaction((client) => recoverStaleKnowledgeJobs(client)), 0);
  const states = Object.fromEntries((await database().query("select source_id,state,error_code from crewmori.knowledge_jobs where id = any($1)", [jobs.rows.map((row) => row.id)])).rows.map((row) => [row.source_id, [row.state, row.error_code]]));
  assert.deepEqual(states, { "lease-stale": ["failed", "INDEXING_INTERRUPTED"], "lease-active": ["running", null] });
  const events = await database().query("select kind from crewmori.events where workspace_id=$1 and sequence>$2", [workspaceA, before]);
  assert.deepEqual(events.rows.map((row) => row.kind), ["knowledge.blocked"]);
});

test("runs abandoned by a crashed worker are blocked and keep uncertain usage reserved", async () => {
  const { recoverStaleRuns } = await import("../../src/server/maintenance");
  const runs = await database().query("insert into crewmori.agent_runs(workspace_id,role,instruction,state,updated_at) values($1,'scout','stale','running',now()-interval '2 hours'),($1,'scout','active','running',now()) returning id,instruction", [workspaceB]);
  const stale = runs.rows.find((row) => row.instruction === "stale"), active = runs.rows.find((row) => row.instruction === "active");
  await database().query("insert into crewmori.model_calls(workspace_id,run_id,control_version,reserved_tokens,budget_day,state) values($1,$2,1,500,current_date,'reserved')", [workspaceB, stale.id]);
  assert.equal(await transaction((client) => recoverStaleRuns(client)), 1);
  const saved = Object.fromEntries((await database().query("select id,state,error_code from crewmori.agent_runs where id = any($1)", [[stale.id, active.id]])).rows.map((row) => [row.id, [row.state, row.error_code]]));
  assert.deepEqual(saved[stale.id], ["blocked", "WORKER_INTERRUPTED"]);
  assert.deepEqual(saved[active.id], ["running", null]);
  assert.equal((await database().query("select state from crewmori.model_calls where run_id=$1", [stale.id])).rows[0].state, "unknown");
  await database().query("update crewmori.agent_runs set state='cancelled' where id=$1", [active.id]);
});

test("abandoned pending uploads are removed from storage before their records are retired", async () => {
  const { removeAbandonedUploads } = await import("../../src/server/maintenance");
  const files = await database().query("insert into crewmori.files(workspace_id,owner_id,name,mime_type,byte_size,sha256,object_path,state,created_at) values($1,$2,'old.txt','text/plain',1,'x',$3,'pending',now()-interval '2 hours'),($1,$2,'new.txt','text/plain',1,'x',$4,'pending',now()),($1,$2,'kept.txt','text/plain',1,'x',$5,'available',now()-interval '2 hours') returning id,name", [workspaceA, ownerA, `${workspaceA}/orphan/old.txt`, `${workspaceA}/orphan/new.txt`, `${workspaceA}/orphan/kept.txt`]);
  let requested: string[] = [];
  assert.equal(await removeAbandonedUploads(database(), async () => ({ error: new Error("storage unavailable") })), 0);
  assert.equal(await removeAbandonedUploads(database(), async (paths) => { requested = paths; return { error: null }; }), 1);
  assert.deepEqual(requested, [`${workspaceA}/orphan/old.txt`]);
  const states = Object.fromEntries((await database().query("select name,state from crewmori.files where id = any($1)", [files.rows.map((row) => row.id)])).rows.map((row) => [row.name, row.state]));
  assert.deepEqual(states, { "old.txt": "deleted", "new.txt": "pending", "kept.txt": "available" });
});

test("expired authorization state and stale rate-limit windows are purged", async () => {
  const { purgeExpiredRecords } = await import("../../src/server/maintenance");
  await database().query("insert into crewmori.oauth_states(state_hash,workspace_id,owner_id,verifier_ciphertext,scopes,expires_at) values('purge-old',$1,$2,'x','{}',now()-interval '2 days'),('purge-live',$1,$2,'x','{}',now()+interval '5 minutes')", [workspaceA, ownerA]);
  await database().query("insert into crewmori.buyer_invitations(token_hash,workspace_id,engagement_id,expires_at) values('purge-old',$1,'e1',now()-interval '40 days'),('purge-recent',$1,'e1',now()-interval '1 day')", [workspaceA]);
  await database().query("insert into crewmori.request_limits(key,window_start,count) values('purge-old',now()-interval '3 days',4),('purge-live',now(),1)");
  const purged = await transaction((client) => purgeExpiredRecords(client));
  assert.ok(purged.oauthStates >= 1 && purged.invitations >= 1 && purged.requestLimits >= 1);
  assert.deepEqual((await database().query("select state_hash from crewmori.oauth_states where state_hash like 'purge-%'")).rows.map((row) => row.state_hash), ["purge-live"]);
  assert.deepEqual((await database().query("select token_hash from crewmori.buyer_invitations where token_hash like 'purge-%'")).rows.map((row) => row.token_hash), ["purge-recent"]);
  assert.deepEqual((await database().query("select key from crewmori.request_limits where key like 'purge-%'")).rows.map((row) => row.key), ["purge-live"]);
});

test("a maintenance sweep runs every recovery step against the live schema", async () => {
  const { runMaintenance } = await import("../../src/server/maintenance");
  let removals = 0;
  assert.deepEqual(await runMaintenance(async () => { removals++; return { error: null }; }), { failed: [] });
  assert.deepEqual(await runMaintenance(), { failed: [] });
  assert.ok(removals <= 1);
});
