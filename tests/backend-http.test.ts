import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { api, bodyBytes, json, jsonBody } from "../src/server/http";

test("disabled backend does not execute actions and enabled mutations require same-origin", async () => {
  const prior = process.env.CREWMORI_BACKEND_ENABLED, priorUrl = process.env.APP_URL;
  let called = false;
  const action = async () => { called = true; return json({ ok: true }); };
  try {
    process.env.CREWMORI_BACKEND_ENABLED = "false";
    assert.equal((await api(new Request("http://localhost:4173/api/tasks"), action)).status, 503);
    assert.equal(called, false);
    process.env.CREWMORI_BACKEND_ENABLED = "true";
    process.env.APP_URL = "http://localhost:4173";
    assert.equal((await api(new Request("http://localhost:4173/api/tasks", { method: "POST", headers: { origin: "https://other.example" } }), action)).status, 403);
    assert.equal(called, false);
    const response = await api(new Request("http://localhost:4173/api/tasks", { method: "POST", headers: { origin: "http://localhost:4173" } }), action);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    if (prior === undefined) delete process.env.CREWMORI_BACKEND_ENABLED; else process.env.CREWMORI_BACKEND_ENABLED = prior;
    if (priorUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = priorUrl;
  }
});
test("request limits apply without trusting content-length and reject malformed JSON", async () => {
  await assert.rejects(bodyBytes(new Request("http://localhost/api", { method: "POST", body: "12345" }), 4), /size limit/);
  await assert.rejects(jsonBody(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }), z.object({})), /valid JSON/);
  await assert.rejects(jsonBody(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }), z.object({})), /application\/json/);
});
test("malformed identifiers and encodings are reported as validation errors, not server faults", async () => {
  const prior = process.env.CREWMORI_BACKEND_ENABLED;
  try {
    process.env.CREWMORI_BACKEND_ENABLED = "true";
    const request = () => new Request("http://localhost:4173/api/runs/not-a-uuid");
    const invalidUuid = Object.assign(Error("invalid input syntax for type uuid"), { code: "22P02" });
    assert.equal((await api(request(), async () => { throw invalidUuid; })).status, 422);
    assert.equal((await api(request(), async () => { decodeURIComponent("%E0%A4%A"); return json({}); })).status, 422);
    assert.equal((await api(request(), async () => { throw Error("unexpected"); })).status, 500);
  } finally {
    if (prior === undefined) delete process.env.CREWMORI_BACKEND_ENABLED; else process.env.CREWMORI_BACKEND_ENABLED = prior;
  }
});
test("missing configuration is reported without naming environment variables", async () => {
  const prior = process.env.CREWMORI_BACKEND_ENABLED;
  try {
    process.env.CREWMORI_BACKEND_ENABLED = "true";
    const { ConfigurationError } = await import("../src/server/config");
    const response = await api(new Request("http://localhost:4173/api/webhooks/stripe"), async () => { throw new ConfigurationError(["STRIPE_WEBHOOK_SECRET"]); });
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("STRIPE_WEBHOOK_SECRET"));
  } finally {
    if (prior === undefined) delete process.env.CREWMORI_BACKEND_ENABLED; else process.env.CREWMORI_BACKEND_ENABLED = prior;
  }
});
test("client address comes from the proxy headers and is absent without them", async () => {
  const { clientAddress } = await import("../src/server/security");
  assert.equal(clientAddress(new Request("http://localhost/", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } })), "203.0.113.7");
  assert.equal(clientAddress(new Request("http://localhost/", { headers: { "x-real-ip": "198.51.100.4" } })), "198.51.100.4");
  assert.equal(clientAddress(new Request("http://localhost/")), null);
});
