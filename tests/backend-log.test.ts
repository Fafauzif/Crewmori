import test from "node:test";
import assert from "node:assert/strict";
import { errorDetails, redact } from "../src/server/log";

test("error logs keep diagnostics but redact connection strings and secrets", () => {
  const text = redact("connect postgresql://postgres:hunter2@db.example:5432/app failed; api_key=sk_live_123 Authorization: Bearer abc.def");
  assert.ok(!text.includes("hunter2"));
  assert.ok(!text.includes("sk_live_123"));
  assert.ok(!text.includes("abc.def"));
  assert.match(text, /postgresql:\/\/<redacted>@db\.example/);
  const failure = Object.assign(Error("duplicate key value violates unique constraint"), { code: "23505", constraint: "files_pkey" });
  const details = errorDetails(failure);
  assert.equal(details.code, "23505");
  assert.equal(details.constraint, "files_pkey");
  assert.ok(Array.isArray(details.stack));
});
