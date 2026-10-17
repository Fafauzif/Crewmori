import test from "node:test";
import assert from "node:assert/strict";
import { activeScoutRun, runReferencesOpportunity } from "../src/lib/acquisition-ux";
import { externalFileHref } from "../src/lib/file-links";
import { sourceCount, translate, uiMessage } from "../src/lib/i18n";
import { MutationAttempt } from "../src/lib/mutation-attempt";
import type { Entity } from "../src/lib/types";

const run = (values: Record<string, unknown> = {}): Entity => ({ id: "scout-task", version: 1, role_id: "scout", status: "queued", input_refs: [{ table: "opportunities", id: "lead-a", version: 3 }], ...values });

test("Scout follows typed opportunity references from the connected projection", () => {
  const connected = run();
  assert.equal(connected.opportunity_id, undefined);
  assert.equal(runReferencesOpportunity(connected, "lead-a"), true);
  assert.equal(activeScoutRun([connected], "lead-a")?.id, connected.id);
  assert.equal(activeScoutRun([connected], "lead-b"), undefined);
  assert.equal(runReferencesOpportunity(run({ input_refs: [{ table: "clients", id: "lead-a", version: 3 }] }), "lead-a"), false);
  assert.equal(runReferencesOpportunity(run({ input_refs: [{ table: "opportunities", id: "lead-a", version: 0 }] }), "lead-a"), false);
});

test("Scout retains demo relationships without trusting mismatched typed opportunity references", () => {
  const demo = run({ opportunity_id: "lead-a", input_refs: [{ table: "policies", id: "policy_business", version: 1 }] });
  assert.equal(runReferencesOpportunity(demo, "lead-a"), true);
  assert.equal(runReferencesOpportunity(run({ opportunity_id: "lead-a", input_refs: [{ table: "opportunities", id: "lead-b", version: 1 }] }), "lead-a"), false);
});

test("only the latest unresolved Scout task blocks another assessment", () => {
  const rows = [run({ id: "old", created_at: "2026-10-01T00:00:00Z" }), run({ id: "new", created_at: "2026-10-02T00:00:00Z", status: "blocked" }), run({ id: "done", created_at: "2026-10-03T00:00:00Z", status: "completed" }), run({ id: "other-role", role_id: "sales" })];
  assert.equal(activeScoutRun(rows, "lead-a")?.id, "new");
  for (const status of ["completed", "cancelled", "failed"]) assert.equal(activeScoutRun([run({ status })], "lead-a"), undefined);
});

test("a completed Scout result awaiting owner review stays linked until applied", () => {
  const completed = run({ status: "completed" });
  const artifact: Entity = { id: "result", version: 1, run_id: completed.id, requires_owner_review: true, status: "awaiting_review" };
  assert.equal(activeScoutRun([completed], "lead-a", [artifact])?.id, completed.id);
  assert.equal(activeScoutRun([completed], "lead-a", [{ ...artifact, status: "applied" }]), undefined);
  assert.equal(activeScoutRun([completed], "lead-a", [{ ...artifact, run_id: "someone-else" }]), undefined);
});

test("external file links permit only explicit web navigation without embedded credentials", () => {
  assert.equal(externalFileHref("https://example.test/shared/document?rev=2"), "https://example.test/shared/document?rev=2");
  assert.equal(externalFileHref("http://example.test/file"), "http://example.test/file");
  for (const value of ["javascript:alert(1)", "data:text/html,hello", "file:///secret", "//example.test/x", "/assets/file.pdf", "https://user:password@example.test/file"]) assert.equal(externalFileHref(value), "");
});

test("parameterized UI messages preserve authored values and source count grammar", () => {
  assert.equal(sourceCount(1, "en"), "1 source");
  assert.equal(sourceCount(2, "en"), "2 sources");
  assert.equal(sourceCount(0, "id"), "0 sumber");
  assert.equal(sourceCount(1, "id"), "1 sumber");
  assert.equal(translate("Hello {name}", "en", { name: "$& <Client>" }), "Hello $& <Client>");
  assert.equal(translate("Unknown {value}", "id"), "Unknown {value}");
  assert.equal(uiMessage("acquisition.scout.status", "id", { status: "menunggu" }).includes("menunggu"), true);
  assert.equal(translate("Create new buyer invitation", "id"), "Buat undangan pembeli baru");
});

test("uncertain sends retain the exact reviewed payload despite canonical version changes", () => {
  const attempt = new MutationAttempt<{ expected_version: number; content: string; attachments: string[] }>();
  const draft = { expected_version: 2, content: "Please confirm the scope", attachments: ["private-file"] };
  const original = attempt.begin(draft);
  draft.content = "Changed after request";
  original.attachments.push("must-not-mutate-snapshot");
  attempt.settle({ ok: false, outcomeUnknown: true });
  assert.deepEqual(attempt.begin({ expected_version: 3, content: "A different message", attachments: [] }), { expected_version: 2, content: "Please confirm the scope", attachments: ["private-file"] });
  attempt.settle({ ok: true });
  assert.equal(attempt.unresolved, false);
  assert.equal(attempt.begin({ expected_version: 4, content: "Next deliberate message", attachments: [] }).expected_version, 4);
  attempt.settle({ ok: false, outcomeUnknown: false });
  assert.equal(attempt.unresolved, false);
});
