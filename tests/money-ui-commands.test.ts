import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute } from "../src/lib/engine";
import { s } from "../src/lib/types";

test("expense UI uses its dedicated save workflow for a complete estimate and reversible archive", () => {
  const saved = execute(createState(), "expense.save", { values: { description: "Software renewal", classification: "estimated", category: "software", amount: { currency: "USD", amount_minor: 2500, scale: 2 }, expense_date: "2026-10-19", provider: "Software vendor", basis: "Expected renewal", project_id: null, paid: false, source: "manual", attachment_id: null } });
  assert.equal(saved.result.ok, true, saved.result.message);
  const expense = saved.state.tables.expenses[saved.result.id!];
  assert.equal(expense.classification, "estimated");
  assert.equal(expense.provider, "Software vendor");
  const archived = execute(saved.state, "record.archive", { table: "expenses", id: expense.id, expected_version: expense.version });
  assert.equal(archived.result.ok, true);
  assert.ok(archived.state.tables.expenses[expense.id].archived_at);
  const restored = execute(archived.state, "record.archive", { table: "expenses", id: expense.id, expected_version: archived.state.tables.expenses[expense.id].version, archived: false });
  assert.equal(restored.result.ok, true);
  assert.equal(restored.state.tables.expenses[expense.id].archived_at, null);
});

test("receipt metadata attaches through file workflow before dedicated expense link, with stale link protection", () => {
  const saved = execute(createState(), "expense.save", { values: { description: "Workshop materials", amount: { currency: "USD", amount_minor: 2500, scale: 2 }, classification: "recorded", expense_date: "2026-10-16", basis: "Invoice from merchant" } });
  const expense = saved.state.tables.expenses[saved.result.id!];
  const receiptsBefore = Object.keys(saved.state.tables.receipts).length;
  const attached = execute(saved.state, "file.attach", { values: { name: "merchant.txt", filename: "merchant.txt", original_filename: "merchant.txt", media_type: "text/plain", byte_length: 24, storage_kind: "local_blob", storage_locator: "file_test", shared_with_buyer: false, audience: "owner" } });
  assert.equal(attached.result.ok, true, attached.result.message);
  const linked = execute(attached.state, "expense.save", { id: expense.id, expected_version: expense.version, values: { attachment_id: attached.result.id } });
  assert.equal(linked.result.ok, true, linked.result.message);
  assert.equal(linked.state.tables.expenses[expense.id].attachment_id, attached.result.id);
  assert.equal(s(linked.state.tables.attachments[attached.result.id!].audience), "owner");
  assert.equal(Object.keys(linked.state.tables.receipts).length, receiptsBefore);
  const stale = execute(linked.state, "expense.save", { id: expense.id, expected_version: expense.version, values: { attachment_id: null } });
  assert.equal(stale.result.ok, false);
  assert.equal(stale.result.code, "STALE_VERSION");
  assert.equal(stale.state.tables.expenses[expense.id].attachment_id, attached.result.id);
});
