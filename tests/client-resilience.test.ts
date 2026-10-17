import test from "node:test";
import assert from "node:assert/strict";
import { BackendClient, BackendError, isDefinitiveFailure } from "../src/lib/backend-client";
import { CommandIntents, ownerBindingIsCurrent, ownerCommandBinding, ownerIdentity, projectionForScope, projectionSignature, refreshDelay, resourceScope, ScopedRead } from "../src/lib/resource-scope";
import { workspaceState } from "../src/lib/workspace-state";

test("backend client normalizes non-JSON failures without exposing proxy content", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("<html>upstream private stack details</html>", { status: 502 });
  try {
    await assert.rejects(new BackendClient().request("/api/workspace/state"), (error: unknown) => error instanceof BackendError && error.status === 502 && error.code === "REQUEST_FAILED" && !error.message.includes("private"));
  } finally { globalThis.fetch = original; }
});

test("backend client retains API codes/support references and rejects unreadable successful responses", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: { code: "STALE_VERSION", message: "Review the updated record.", requestId: "support-123" } }, { status: 409 });
    await assert.rejects(new BackendClient().request("/api/commands", {}), (error: unknown) => error instanceof BackendError && error.code === "STALE_VERSION" && error.requestId === "support-123" && isDefinitiveFailure(error));
    globalThis.fetch = async () => new Response("not-json", { status: 200 });
    await assert.rejects(new BackendClient().request("/api/commands", {}), (error: unknown) => error instanceof BackendError && error.code === "INVALID_RESPONSE" && error.outcomeUnknown && !isDefinitiveFailure(error));
  } finally { globalThis.fetch = original; }
});

test("timeouts abort a read and uncertain writes are never retried by the adapter", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (_path, init) => {
    requests++;
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) reject(new DOMException("Aborted", "AbortError"));
      else signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
  };
  try {
    await assert.rejects(new BackendClient().request("/api/workspace/state", undefined, "GET", { timeoutMs: 5 }), (error: unknown) => error instanceof BackendError && error.code === "REQUEST_TIMEOUT" && !error.outcomeUnknown);
    await assert.rejects(new BackendClient().request("/api/commands", { idempotencyKey: "one-intent" }, "POST", { timeoutMs: 5 }), (error: unknown) => error instanceof BackendError && error.code === "REQUEST_TIMEOUT" && error.outcomeUnknown && !isDefinitiveFailure(error));
    assert.equal(requests, 2, "one request per explicit call, no automatic write retry");
    const controller = new AbortController(); controller.abort();
    await assert.rejects(new BackendClient().request("/api/workspace/state", undefined, "GET", { signal: controller.signal }), (error: unknown) => error instanceof BackendError && error.code === "REQUEST_ABORTED");
  } finally { globalThis.fetch = original; }
});

test("same-origin credentials and explicit workspace binding survive the adapter", async () => {
  const original = globalThis.fetch;
  let request: RequestInit | undefined;
  globalThis.fetch = async (_path, init) => { request = init; return Response.json({ ok: true }); };
  try {
    assert.deepEqual(await new BackendClient("workspace-one").request("/api/commands", { input: "saved" }), { ok: true });
    assert.equal(request?.credentials, "same-origin");
    assert.equal(request?.cache, "no-store");
    assert.equal(new Headers(request?.headers).get("x-workspace-id"), "workspace-one");
    await assert.rejects(new BackendClient().request("https://external.example/api"), /application API path/);
  } finally { globalThis.fetch = original; }
});

test("owner navigation shares data, while buyer/profile/payment/auth scopes isolate private projections", () => {
  assert.deepEqual(resourceScope("/app/home"), resourceScope("/app/money/invoices"));
  assert.equal(resourceScope("/onboarding").key, "owner");
  assert.equal(resourceScope("/auth/sign-in").kind, "session");
  assert.equal(resourceScope("/").kind, "session");
  assert.equal(resourceScope("/payment/return").kind, "passive");
  assert.notEqual(resourceScope("/buyer/one").key, resourceScope("/buyer/two").key);
  assert.notEqual(resourceScope("/buyer/one", "1").key, resourceScope("/buyer/one", "2").key);
  assert.equal(resourceScope("/u/studio/services/design").key, resourceScope("/u/studio").key);
  const privateState = workspaceState({ id: "owner-workspace", owner_id: "owner-one", name: "Private studio" }, "private@example.test");
  assert.equal(projectionForScope("owner", "owner", privateState), privateState);
  for (const route of ["/buyer/one", "/u/studio", "/auth/sign-in", "/payment/return"]) {
    const safe = projectionForScope("owner", resourceScope(route).key, privateState);
    assert.equal(safe.session, false); assert.deepEqual(safe.tables, {});
    assert.equal(JSON.stringify(safe).includes("private@example.test"), false);
  }
  assert.notEqual(ownerIdentity(privateState), ownerIdentity(workspaceState({ id: "other-workspace", owner_id: "owner-two", name: "Other studio" })));
});

test("unchanged projections are stable but equal-revision worker changes remain visible", () => {
  const state = workspaceState({ id: "one", owner_id: "owner", name: "Studio" });
  const next = structuredClone(state); next.sample_clock = "2099-01-01T00:00:00Z";
  assert.equal(projectionSignature(state), projectionSignature(next));
  next.tables.agent_runs = { run: { id: "run", version: 1, state: "running" } };
  assert.notEqual(projectionSignature(state), projectionSignature(next));
  assert.deepEqual([0, 1, 2, 3, 4, 20].map(refreshDelay), [5000, 10000, 20000, 40000, 60000, 60000]);
});

test("a form's rendered owner/workspace binding cannot adopt a subsequently refreshed account", () => {
  const first = workspaceState({ id: "workspace-a", owner_id: "owner-a", name: "First studio" });
  const second = workspaceState({ id: "workspace-b", owner_id: "owner-b", name: "Second studio" });
  const oldForm = ownerCommandBinding(first), newForm = ownerCommandBinding(second);
  assert.equal(ownerBindingIsCurrent(oldForm, ownerIdentity(first)), true);
  assert.equal(ownerBindingIsCurrent(oldForm, ownerIdentity(second)), false, "old callback is rejected even before React unmounts the old form");
  assert.equal(oldForm.workspaceId, "workspace-a", "header stays bound to the projection that supplied the form");
  assert.equal(ownerBindingIsCurrent(newForm, ownerIdentity(second)), true);
  const masked = projectionForScope("owner", "buyer:one", first);
  assert.equal(ownerBindingIsCurrent(ownerCommandBinding(masked), ownerIdentity(first)), false);
});

test("scoped reads coalesce triggers and abort old audience work without clearing a newer read", async () => {
  const reads = new ScopedRead<string>();
  let count = 0, release: ((value: string) => void) | undefined;
  const first = reads.run("owner", (signal) => {
    count++;
    return new Promise<string>((resolve, reject) => { release = resolve; signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }); });
  });
  const same = reads.run("owner", async () => { count++; return "unexpected duplicate"; });
  assert.equal(first, same);
  await Promise.resolve();
  const rejected = assert.rejects(first, /Aborted/);
  const buyer = reads.run("buyer:one", async () => "safe buyer projection");
  assert.equal(await buyer, "safe buyer projection");
  await rejected;
  assert.equal(count, 1);
  release?.("late owner data");
  assert.equal(await reads.run("buyer:one", async () => "fresh projection"), "fresh projection");
});

test("uncertain intent keys survive status zero, server failure, and dispatch review", () => {
  for (const error of [new BackendError("CONNECTION_INTERRUPTED", "Unknown", 0), new BackendError("INTERNAL_ERROR", "Unknown", 500), new BackendError("DISPATCH_REVIEW_REQUIRED", "Review", 409), new BackendError("DISPATCH_FINALIZATION_REQUIRED", "Review", 409)]) assert.equal(isDefinitiveFailure(error), false);
  assert.equal(isDefinitiveFailure(new BackendError("FIELD_NOT_EDITABLE", "Correct", 422)), true);
});

test("a confirmed command stays coalesced until its audience has a successful canonical refresh", async () => {
  const intents = new CommandIntents(), signature = "owner:one:agent.start:same-instruction";
  const key = intents.key(signature), receipt = Promise.resolve({ ok: true, id: "one-run", message: "Queued" });
  intents.track(signature, receipt);
  assert.equal(intents.existing(signature), receipt, "double click receives the same request result");
  intents.rejected(signature, false); intents.settled(signature);
  assert.equal(intents.key(signature), key, "unknown network outcome reuses the same transport key");
  intents.track(signature, receipt); intents.confirmed(signature, "owner"); intents.settled(signature);
  assert.equal(intents.existing(signature), receipt, "slow or failed refresh cannot make stale UI create a duplicate run");
  intents.reconciled("buyer:one");
  assert.equal(intents.existing(signature), receipt, "another audience cannot release a private intent");
  intents.reconciled("owner");
  assert.equal(intents.existing(signature), undefined);
  assert.notEqual(intents.key(signature), key, "a deliberate new action after reconciliation gets a new key");
  intents.track(signature, receipt); intents.clear();
  assert.equal(intents.existing(signature), undefined, "account switch/sign-out clears retained receipts");
  assert.equal((await receipt).id, "one-run");
});
