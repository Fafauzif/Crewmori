import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { integrationStatus, runtimeConfig, requireConfiguration } from "../src/server/config";
import { assertSameOrigin, decryptSecret, encryptSecret, fingerprint, verifyHmac } from "../src/server/security";
import { receiptSchema, taskInputSchema } from "../src/server/contracts";

test("backend is opt-in and capabilities expose missing names without credential values", () => {
  assert.equal(runtimeConfig({}).enabled, false);
  assert.equal(runtimeConfig({}).PAYMENT_PROVIDER, "sandbox");
  assert.throws(() => runtimeConfig({ PAYMENT_PROVIDER: "live" }));
  assert.equal(runtimeConfig({}).sandboxPayments, true, "Local development keeps sandbox payments");
  assert.equal(runtimeConfig({ APP_URL: "https://crewmori.example" }).sandboxPayments, false, "Hosted sandbox payments fail closed");
  assert.equal(runtimeConfig({ APP_URL: "https://crewmori.example", ALLOW_HOSTED_SANDBOX_PAYMENTS: "true" }).sandboxPayments, true);
  assert.throws(() => runtimeConfig({ APP_URL: "http://public.example" }));
  assert.throws(() => runtimeConfig({ APP_URL: "ftp://localhost" }));
  const status = JSON.stringify(integrationStatus({ ANTHROPIC_API_KEY: "private-secret" }));
  assert.ok(!status.includes("private-secret"));
  assert.throws(() => requireConfiguration(["DATABASE_URL"], {}), /DATABASE_URL/);
});
test("OAuth ciphertext is bound to workspace and detects alteration", () => {
  const key = randomBytes(32).toString("base64");
  const encrypted = encryptSecret("private refresh token", key, "workspace-a:google");
  assert.equal(decryptSecret(encrypted, key, "workspace-a:google"), "private refresh token");
  assert.throws(() => decryptSecret(encrypted, key, "workspace-b:google"));
  assert.throws(() => decryptSecret(encrypted.replace(/.$/, "!"), key, "workspace-a:google"));
  assert.ok(!encrypted.includes("private refresh token"));
});
test("webhooks reject wrong signatures and stale timestamps before parsing business events", () => {
  const raw = '{"amount":27000}', now = 1_800_000_000_000, stamp = now / 1000;
  const sig = createHmac("sha256", "test-signing-key").update(`${stamp}.${raw}`).digest("hex");
  verifyHmac(raw, `t=${stamp},v0=${sig}`, "test-signing-key", now);
  assert.throws(() => verifyHmac(raw, `t=${stamp},v0=${sig}`, "wrong-key", now));
  assert.throws(() => verifyHmac(raw, `t=${stamp},v0=${sig}`, "test-signing-key", now + 301000));
  assert.throws(() => verifyHmac(raw, `t=${stamp},v0=00`, "test-signing-key", now));
});
test("mutation origins, exact receipt amounts and task schemas fail closed", () => {
  assertSameOrigin(new Request("https://app.example/api", { headers: { origin: "https://app.example" } }), "https://app.example");
  assert.throws(() => assertSameOrigin(new Request("https://app.example/api"), "https://app.example"));
  assert.throws(() => taskInputSchema.parse({ role: "admin", instruction: "send everything", idempotencyKey: "x" }));
  assert.throws(() => receiptSchema.parse({ eventId: "e", requestId: "9b217579-0d8a-46c2-b3df-90edcb34e218", currency: "USD", grossMinor: 100, feeMinor: 101, occurredAt: "2026-10-16T00:00:00Z" }));
  assert.equal(fingerprint({ b: 1, a: 2 }), fingerprint({ a: 2, b: 1 }));
  assert.notEqual(fingerprint({ amount: 27000 }), fingerprint({ amount: 10000 }));
});
