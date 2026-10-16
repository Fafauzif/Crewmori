import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createState,
  execute,
  invoiceTotal,
  invoiceOutstanding,
} from "../src/lib/engine";
import { n, o } from "../src/lib/types";

const usd = (amount_minor: number) => ({
  amount_minor,
  currency: "USD",
  scale: 2,
});
const newInvoice = () =>
  execute(createState(), "invoice.saveDraft", {
    values: {
      client_id: "client_lumen",
      billing_contact_id: "contact_jules",
      currency: "USD",
      due_at: "2026-10-19T17:00:00+07:00",
      buyer_note: "Thank you for the agreed workshop.",
      lines: [
        {
          description: "Workshop preparation",
          quantity: 1.25,
          unit_amount: usd(8000),
          tax_basis_points: 0,
        },
        {
          description: "Included follow-up",
          quantity: 1,
          unit_amount: usd(0),
          tax_basis_points: 0,
        },
      ],
    },
  });

test("invoice draft, reviewed issue and approved sample send are separate persisted effects", () => {
  const draft = newInvoice();
  assert.equal(draft.result.ok, true, draft.result.message);
  const id = draft.result.id!;
  assert.equal(invoiceTotal(draft.state, id), 10000);
  assert.equal(draft.state.tables.invoices[id].state, "draft");
  assert.equal(Object.keys(draft.state.tables.payment_requests).length, 0);
  assert.equal(
    draft.state.tables.invoices[id].buyer_note,
    "Thank you for the agreed workshop.",
  );
  assert.equal(
    draft.state.tables.invoices[id].due_at,
    "2026-10-19T17:00:00+07:00",
  );
  const issued = execute(draft.state, "invoice.issue", {
    id,
    expected_version: draft.state.tables.invoices[id].version,
    confirmed: true,
  });
  assert.equal(issued.result.ok, true, issued.result.message);
  assert.equal(issued.state.tables.invoices[id].state, "issued");
  assert.equal(issued.state.tables.invoices[id].sent_at, undefined);
  assert.equal(Object.keys(issued.state.tables.payment_requests).length, 1);
  const noApproval = execute(issued.state, "invoice.send", {
    id,
    expected_version: issued.state.tables.invoices[id].version,
    contact_id: "contact_jules",
    content: "Please review the invoice.",
  });
  assert.equal(noApproval.result.ok, false);
  const sent = execute(issued.state, "invoice.send", {
    id,
    expected_version: issued.state.tables.invoices[id].version,
    contact_id: "contact_jules",
    content: "Please review the invoice.",
    confirmed: true,
  });
  assert.equal(sent.result.ok, true, sent.result.message);
  assert.equal(
    sent.state.tables.invoices[id].sent_content,
    "Please review the invoice.",
  );
  assert.equal(Object.keys(sent.state.tables.receipts).length, 0);
  assert.equal(invoiceOutstanding(sent.state, id), 10000);
});

test("stale draft edits, issued invoice edits and voiding allocated invoices are rejected transactionally", () => {
  const draft = newInvoice();
  const id = draft.result.id!;
  const stale = execute(draft.state, "invoice.saveDraft", {
    id,
    expected_version: 0,
    values: { client_id: "client_lumen", lines: [] },
  });
  assert.equal(stale.result.ok, false);
  assert.deepEqual(stale.state, draft.state);
  const issued = execute(draft.state, "invoice.issue", {
    id,
    expected_version: draft.state.tables.invoices[id].version,
    confirmed: true,
  });
  const edit = execute(issued.state, "invoice.saveDraft", {
    id,
    expected_version: issued.state.tables.invoices[id].version,
    values: { client_id: "client_lumen", lines: [] },
  });
  assert.equal(edit.result.ok, false);
  assert.deepEqual(edit.state, issued.state);
  const paid = createState("active_paid_project");
  const invoice = paid.tables.invoices.invoice_northstar_deposit;
  const voided = execute(paid, "invoice.void", {
    id: invoice.id,
    expected_version: invoice.version,
    reason: "Cannot erase paid history",
  });
  assert.equal(voided.result.ok, false);
  assert.equal(invoiceOutstanding(voided.state, invoice.id), 0);
});

test("wrong-currency receipt cannot settle the USD deposit and not-a-match preserves its debt", () => {
  const state = createState("wrong_currency_receipt");
  const invoice = state.tables.invoices.invoice_northstar_deposit;
  const receipt = state.tables.receipts.receipt_northstar_deposit;
  const match = execute(state, "finance.allocateReceipt", {
    invoice_id: invoice.id,
    receipt_id: receipt.id,
    expected_invoice_version: invoice.version,
    expected_receipt_version: receipt.version,
    amount_minor: 1,
  });
  assert.equal(match.result.ok, false);
  assert.deepEqual(match.state, state);
  const issue = Object.values(state.tables.finance_issues)[0];
  const resolution = execute(state, "finance.resolveIssue", {
    id: issue.id,
    expected_version: issue.version,
    action: "mark_not_a_match",
    note: "This observation belongs to a different currency.",
  });
  assert.equal(resolution.result.ok, true, resolution.result.message);
  assert.equal(
    resolution.state.tables.finance_issues[issue.id].state,
    "resolved",
  );
  assert.equal(
    resolution.state.tables.finance_issues[issue.id].resolution,
    "mark_not_a_match",
  );
  assert.equal(invoiceOutstanding(resolution.state, invoice.id), 27000);
  assert.equal(
    resolution.state.tables.receipts[receipt.id].reconciliation_state,
    "review_required",
  );
});

test("expense corrections post exact deltas, retain original amount, and stale corrections fail", () => {
  const state = createState();
  const original = state.tables.expenses.expense_domain;
  const corrected = execute(state, "expense.correct", {
    id: original.id,
    expected_version: original.version,
    revised_amount_minor: 1500,
    currency: "USD",
    reason: "Receipt confirms actual renewal charge",
    expense_date: "2026-10-14",
  });
  assert.equal(corrected.result.ok, true, corrected.result.message);
  assert.equal(
    n(o(corrected.state.tables.expenses[original.id].amount).amount_minor),
    1200,
  );
  const corrections = Object.values(corrected.state.tables.expense_corrections);
  assert.equal(corrections.length, 1);
  assert.equal(corrections[0].delta_minor, 300);
  assert.equal(corrections[0].state, "posted");
  assert.equal(Object.keys(corrected.state.tables.receipts).length, 0);
  const stale = execute(corrected.state, "expense.correct", {
    id: original.id,
    expected_version: original.version,
    revised_amount_minor: 1800,
    currency: "USD",
    reason: "Stale edit must fail",
  });
  assert.equal(stale.result.ok, false);
  assert.equal(Object.values(stale.state.tables.expense_corrections).length, 1);
});

test("editing a draft retains its invoice reference and does not collide with the next invoice", () => {
  const first = newInvoice();
  const id = first.result.id!;
  const initial = first.state.tables.invoices[id];
  const values = {
    client_id: "client_lumen",
    currency: "USD",
    due_at: "2026-10-30T17:00:00+07:00",
    lines: [
      {
        description: "Revised workshop",
        quantity: 1,
        unit_amount: usd(10000),
        tax_basis_points: 0,
      },
    ],
  };
  const edited = execute(first.state, "invoice.saveDraft", {
    id,
    expected_version: initial.version,
    values,
  });
  assert.equal(edited.result.ok, true, edited.result.message);
  assert.equal(edited.state.tables.invoices[id].number, initial.number);
  const next = execute(edited.state, "invoice.saveDraft", { values });
  assert.equal(next.result.ok, true, next.result.message);
  assert.notEqual(
    next.state.tables.invoices[next.result.id!].number,
    initial.number,
  );
});
