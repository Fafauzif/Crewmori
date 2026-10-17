import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { GoogleAdapter, googleScopes, mimeMessage } from "../src/server/providers/google";
import { providerJson } from "../src/server/providers/http";
import { roleInstructions, validateArtifact } from "../src/server/providers/reasoning";
import { domainAmount, normalizeStripeEvent, stripeAmount, stripeClient } from "../src/server/providers/payments";
import type Stripe from "stripe";

test("provider transport redacts failures and preserves uncertainty after a mutation timeout", async () => {
  const transport: typeof fetch = async () => { throw Error("Bearer secret-token"); };
  await assert.rejects(providerJson("Google", "https://example.test", {}, z.object({ id: z.string() }), { fetch: transport, mutation: true }), (error: unknown) => error instanceof Error && "code" in error && error.code === "UNKNOWN_EXTERNAL_OUTCOME" && !error.message.includes("secret-token"));
  const malformed: typeof fetch = async () => new Response("not-json");
  await assert.rejects(providerJson("Google", "https://example.test", {}, z.object({ id: z.string() }), { fetch: malformed }), /invalid response/);
});
test("Gmail draft creation and sending are distinct and require explicit consent", async () => {
  const calls: string[] = [];
  const transport: typeof fetch = async (url) => { calls.push(String(url)); return Response.json({ id: "draft1", message: { id: "message1" } }); };
  const adapter = new GoogleAdapter("test-token", [googleScopes.gmail], transport);
  await adapter.createDraft({ to: "buyer@example.test", subject: "Your offer", text: "Draft only" });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith("/drafts"));
  const noConsent = new GoogleAdapter("test-token", [], transport);
  await assert.rejects(noConsent.sendDraft("draft1"), /consent/);
  assert.equal(calls.length, 1);
  assert.throws(() => mimeMessage({ to: "buyer@example.test", subject: "Offer\r\nBcc: attacker@example.test", text: "x" }));
});
test("all six roles have distinct instructions and invented evidence cannot become an artifact", () => {
  assert.equal(new Set(Object.values(roleInstructions)).size, 6);
  const artifact = { title: "Assessment", summary: "Missing budget", facts: [{ text: "Two animations requested", sourceId: "source1" }], unknowns: ["Budget"], recommendations: ["Request budget"], requiresOwnerReview: true };
  assert.deepEqual(validateArtifact(artifact, ["source1"]), artifact);
  assert.throws(() => validateArtifact(artifact, ["source2"]), /unavailable source/);
  assert.throws(() => validateArtifact({ ...artifact, requiresOwnerReview: false }, ["source1"]));
});
test("Stripe conversion preserves exact IDR rupiah and USD cents", () => {
  assert.equal(stripeAmount(27000, "USD"), 27000);
  assert.equal(stripeAmount(3_000_000, "IDR"), 300_000_000);
  assert.deepEqual(domainAmount(300_000_000, "idr"), { currency: "IDR", amountMinor: 3_000_000 });
  assert.throws(() => domainAmount(101, "idr"));
  assert.throws(() => domainAmount(100, "eur"));
});
test("unpaid checkout events never become receipts and fees remain unknown", () => {
  const event = { id: "evt_1", type: "checkout.session.completed", livemode: false, created: 1792108800, data: { object: { id: "cs_test_1", payment_status: "unpaid", amount_total: 27000, currency: "usd", metadata: { request_id: "00000000-0000-4000-8000-000000000001" } } } } as unknown as Stripe.Event;
  assert.equal(normalizeStripeEvent(event), null);
  (event.data.object as Stripe.Checkout.Session).payment_status = "paid";
  assert.equal(normalizeStripeEvent(event)?.receipt.grossMinor, 27000);
  assert.equal(normalizeStripeEvent(event)?.receipt.feeMinor, null);
  assert.throws(() => normalizeStripeEvent({ ...event, livemode: true }));
});
test("preparation rejects live Stripe credentials", () => {
  const prior = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_live_not-a-real-secret";
  try { assert.throws(stripeClient, /test key/); }
  finally { if (prior === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = prior; }
});

test("Gemini reasoning returns validated JSON artifacts and counts thinking tokens as output", async () => {
  const { createServer } = await import("node:http");
  const { GeminiReasoningAdapter } = await import("../src/server/providers/reasoning");
  const artifact = { title: "Lead review", summary: "Review the request.", facts: [{ text: "Saved request.", sourceId: "source_1" }], unknowns: [], recommendations: [], requiresOwnerReview: true };
  let finishReason = "STOP", request: Record<string, unknown> = {};
  const server = createServer((incoming, response) => {
    let body = "";
    incoming.on("data", (chunk) => { body += chunk; });
    incoming.on("end", () => {
      request = JSON.parse(body);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(artifact) }] }, finishReason }], usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 30, thoughtsTokenCount: 5 }, modelVersion: "gemini-test" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const previous = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: "test-key", GEMINI_MODEL: "gemini-test", GOOGLE_GEMINI_BASE_URL: `http://127.0.0.1:${(server.address() as { port: number }).port}` });
  try {
    const input = { role: "scout" as const, instruction: "Assess fit", sources: [{ id: "source_1", version: 1, content: { text: "Need a page" } }] };
    const output = await new GeminiReasoningAdapter().generate(input);
    assert.deepEqual(output.artifact, artifact);
    assert.deepEqual(output.usage, { inputTokens: 40, outputTokens: 35, model: "gemini-test" });
    assert.equal((request.generationConfig as Record<string, unknown>).responseMimeType, "application/json");
    finishReason = "MAX_TOKENS";
    await assert.rejects(new GeminiReasoningAdapter().generate(input), /did not finish/);
    finishReason = "STOP";
    await assert.rejects(new GeminiReasoningAdapter().generate({ ...input, sources: [] }), /unavailable source/);
  } finally {
    process.env = previous;
    server.close();
  }
});
