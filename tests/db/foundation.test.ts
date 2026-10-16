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
import { randomToken, hashToken } from "../../src/server/security";
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
    env: { ...process.env, CREWMORI_BACKEND_ENABLED: "true", ANTHROPIC_API_KEY: "", ANTHROPIC_MODEL: "" },
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
