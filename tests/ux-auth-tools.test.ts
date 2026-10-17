import test from "node:test";
import assert from "node:assert/strict";
import { workspaceReturnPath, signInPath } from "../src/lib/auth-experience";
import { safeReturnPath } from "../src/server/auth-redirect";
import { availabilityInterval, connectionAccess, discoveryDomains, GOOGLE_ACCESS, googleAccessFromScopes } from "../src/lib/google-capabilities";
import { isPaymentRequestId, paymentStatusCopy, PAYMENT_CHECK_DELAYS } from "../src/lib/payment-experience";

test("sign-in keeps workspace deep links while rejecting outside and malformed return targets", () => {
  for (const unsafe of [null, undefined, "", "https://outside.test", "//outside.test", "/app//outside.test", "/app/\\outside", "/app/home\nLocation: https://outside.test", "/buyer/private", "/onboarding", "/app/../../auth", "/app/%2e%2e/auth"]) {
    assert.equal(workspaceReturnPath(unsafe), "/app/home");
    assert.equal(workspaceReturnPath(unsafe), safeReturnPath(unsafe));
  }
  const deepLink = "/app/connections?connection=drive";
  assert.equal(workspaceReturnPath(deepLink), deepLink);
  const failure = new URL(signInPath("expired", deepLink), "https://crewmori.test");
  assert.equal(failure.pathname, "/auth/sign-in");
  assert.equal(failure.searchParams.get("returnTo"), deepLink);
  assert.equal(failure.searchParams.get("error"), "expired");
});

test("exact granted scopes preserve read-only calendar permission without granting sends", () => {
  const read = GOOGLE_ACCESS.calendar_read.scope;
  assert.deepEqual(googleAccessFromScopes([read]), ["calendar_read"]);
  assert.deepEqual(connectionAccess([{ state: "connected", granted_scopes: [read] }]), ["calendar_read"]);
  assert.deepEqual(connectionAccess([{ state: "disconnected", granted_scopes: [read, GOOGLE_ACCESS.gmail.scope] }]), []);
  assert.deepEqual(connectionAccess([{ state: "connected", granted_scopes: [read + ".extra", "untrusted", 1] }]), []);
  assert.deepEqual(googleAccessFromScopes([GOOGLE_ACCESS.calendar_write.scope]), ["calendar_write"]);
});

test("availability rejects missing, malformed and reversed intervals before provider calls", () => {
  for (const pair of [["", ""], ["invalid", "2026-10-18T10:00"], ["2026-10-18T11:00", "2026-10-18T10:00"], ["2026-10-18T10:00", "2026-10-18T10:00"]]) assert.throws(() => availabilityInterval(...pair as [string, string]));
  const range = availabilityInterval("2026-10-18T09:00:00+07:00", "2026-10-18T10:00:00+07:00");
  assert.deepEqual(range, { start: "2026-10-18T02:00:00.000Z", end: "2026-10-18T03:00:00.000Z" });
});

test("discovery explains invalid domain entries without sending URL paths or arbitrary providers", () => {
  assert.deepEqual(discoveryDomains(" EXAMPLE.com, another.org, example.com "), ["example.com", "another.org"]);
  for (const invalid of ["", "https://example.com", "example.com/jobs", "-bad.com", "localhost", "example.com:443", Array.from({length: 11}, (_, i) => `site${i}.com`).join(",")]) assert.throws(() => discoveryDomains(invalid));
});

test("only server-confirmed payment status presents success; uncertainty stops automatic checks", () => {
  assert.equal(paymentStatusCopy("confirmed").tone, "success");
  for (const status of [undefined, "pending", "created", "unknown", "expired", "cancelled", "failed", "review_required", "success", "paid-from-url"]) {
    assert.notEqual(paymentStatusCopy(status).tone, "success");
  }
  assert.equal(paymentStatusCopy("pending").terminal, false);
  assert.equal(paymentStatusCopy("unknown").terminal, true);
  assert.equal(paymentStatusCopy("unrecognized").terminal, true);
  assert.ok(PAYMENT_CHECK_DELAYS.length < 10);
  assert.ok(PAYMENT_CHECK_DELAYS.reduce<number>((total, delay) => total + delay, 0) <= 120000);
  assert.ok(PAYMENT_CHECK_DELAYS.every((delay, index) => index === 0 || delay >= PAYMENT_CHECK_DELAYS[index - 1]));
  assert.equal(isPaymentRequestId("d34f8222-3ae3-4f90-8a77-11e5bbeb99e7"), true);
  assert.equal(isPaymentRequestId(""), false);
  assert.equal(isPaymentRequestId("../another-request"), false);
});


test("domain projection exposes read-only calendar access without invitation authority", async () => {
  const { loadDomain } = await import("../src/server/domain-state");
  const client = { query: async () => ({ rows: [{ revision: 1, records: [], events: [], connection: { state: "active", version: 2, scopes: [GOOGLE_ACCESS.calendar_read.scope] }, dispatches: [], jobs: [], runs: [] }] }) };
  const state = await loadDomain(client as unknown as Parameters<typeof loadDomain>[0], "workspace-test");
  const calendar = state.tables.connections.calendar;
  assert.equal(calendar.state, "connected");
  assert.deepEqual(calendar.granted_capabilities, ["calendar_read"]);
  assert.deepEqual(calendar.approved_capabilities, ["read_sample_events"]);
  assert.equal(state.tables.connections.gmail.state, "disconnected");
  assert.equal(state.tables.connections.drive.state, "disconnected");
});
