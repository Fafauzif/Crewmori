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
