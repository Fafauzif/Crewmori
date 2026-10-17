import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute, invoiceOutstanding } from "../src/lib/engine";
import { manualRunHref, runWaitingMessage, selectHomePriority } from "../src/lib/home-priority";
import type { Entity } from "../src/lib/types";

const entity = (id: string, values: Record<string, unknown> = {}): Entity => ({ id, version: 1, ...values });

test("project rescheduling and genuinely overdue debt precede a newer offer", () => {
  const state = createState("active_paid_project");
  state.tables.projects.project_attention = entity("project_attention", { state: "needs_rescheduling" });
  assert.equal(selectHomePriority(state)?.record.id, "project_attention");
  delete state.tables.projects.project_attention;
  // A received/allocated deposit is not debt, even after its due date.
  state.sample_clock = "2027-01-01T00:00:00Z";
  assert.equal(invoiceOutstanding(state, "invoice_northstar_deposit"), 0);
  assert.notEqual(selectHomePriority(state)?.reason, "overdue");
  state.tables.allocations = {};
  assert.ok(invoiceOutstanding(state, "invoice_northstar_deposit") > 0);
  const invoice = state.tables.invoices.invoice_northstar_deposit;
  invoice.state = "issued";
  invoice.due_at = "2026-10-19T10:00:00Z";
  assert.equal(selectHomePriority(state)?.kind, "invoice");
  invoice.state = "void";
  assert.notEqual(selectHomePriority(state)?.kind, "invoice");
});

test("acceptance alone never becomes Home proof of project progress", () => {
  const state = createState();
  state.tables.offers = {};
  state.tables.projects = {};
  state.tables.invoices = {};
  state.tables.agent_runs = {};
  state.tables.acceptances.saved = entity("saved");
  assert.equal(selectHomePriority(state), undefined);
  state.tables.projects.checklist = entity("checklist", { state: "awaiting_prerequisites", deposit_state: "awaiting_payment" });
  assert.equal(selectHomePriority(state)?.reason, "prerequisites");
  state.tables.projects.checklist.state = "completed";
  assert.equal(selectHomePriority(state), undefined);
});

test("archived or terminal offers never displace an actionable current review", () => {
  const state = createState();
  state.tables.projects = {};
  state.tables.invoices = {};
  state.tables.agent_runs = {};
  state.tables.offers.old = entity("old", { status: "accepted", current_version_id: "old_version", updated_at: "2030-01-01" });
  state.tables.offer_versions.old_version = entity("old_version");
  assert.equal(selectHomePriority(state)?.record.id, "offer_northstar");
  state.tables.offers.offer_northstar.archived = true;
  assert.notEqual(selectHomePriority(state)?.record.id, "offer_northstar");
});

test("delayed task messaging uses recorded activity and never fabricates a worker outcome", () => {
  const run = entity("run", { status: "queued", created_at: "2026-10-17T10:00:00Z", updated_at: "2026-10-17T10:00:00Z" });
  assert.equal(runWaitingMessage(run, "2026-10-17T10:01:00Z").delayed, false);
  const delayed = runWaitingMessage(run, "2026-10-17T10:03:00Z");
  assert.equal(delayed.delayed, true);
  assert.match(delayed.description, /No completion time/);
  assert.equal(runWaitingMessage({ ...run, status: "completed" }, "2026-10-17T10:03:00Z").delayed, false);
  assert.equal(runWaitingMessage({ ...run, updated_at: "invalid" }, "2026-10-17T10:03:00Z").delayed, false);
});

test("manual recovery uses this run’s exact saved reference", () => {
  const state = createState();
  assert.equal(manualRunHref(entity("run", { role_id: "scout", input_refs: [{ table: "opportunities", id: "opportunity_northstar" }] }), state), "/app/opportunities/opportunity_northstar");
  assert.equal(manualRunHref(entity("run", { role_id: "promoter", input_refs: [{ table: "opportunities", id: "missing" }] }), state), "/app/promotion");
});

test("a completed AI attempt still routes to review while its output awaits an owner", () => {
  const state = createState();
  state.tables.offers = {}; state.tables.projects = {}; state.tables.invoices = {}; state.tables.artifacts = {}; state.tables.agent_runs = {};
  state.tables.agent_runs.prepared = entity("prepared", { status: "completed", role_id: "scout" });
  state.tables.artifacts.output = entity("output", { run_id: "prepared", status: "awaiting_review", requires_owner_review: true });
  assert.deepEqual(selectHomePriority(state), { kind: "task", record: state.tables.agent_runs.prepared, reason: "review" });
  state.tables.artifacts.output.status = "applied";
  assert.equal(selectHomePriority(state), undefined);
});

test("checking pending payment state cannot manufacture a receipt or allocation", () => {
  let state = createState();
  const draft = execute(state, "invoice.saveDraft", { values: { client_id: "client_northstar", currency: "USD", lines: [{ description: "Agreed service", quantity: 1, unit_amount: { amount_minor: 10000, currency: "USD", scale: 2 }, tax_basis_points: 0 }] } });
  assert.equal(draft.result.ok, true, draft.result.message);
  const id = draft.result.id!;
  const issued = execute(draft.state, "invoice.issue", { id, expected_version: draft.state.tables.invoices[id].version, confirmed: true });
  assert.equal(issued.result.ok, true, issued.result.message);
  state = issued.state;
  const request = Object.values(state.tables.payment_requests).find((row) => row.invoice_id === id)!;
  request.state = "pending";
  const receipts = Object.keys(state.tables.receipts).length, allocations = Object.keys(state.tables.allocations).length;
  const checked = execute(state, "payment.check", { id: request.id, expected_version: request.version });
  assert.equal(Object.keys(checked.state.tables.receipts).length, receipts);
  assert.equal(Object.keys(checked.state.tables.allocations).length, allocations);
  assert.equal(invoiceOutstanding(checked.state, id), 10000);
});
