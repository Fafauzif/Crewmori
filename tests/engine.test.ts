import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  execute,
  halfUp,
  invoiceTotal,
  invoiceOutstanding,
} from "../src/lib/engine";
import {
  buyerOffer,
  buyerPortal,
  inquiryProjection,
  publicProfile,
} from "../src/lib/projections";
import { o, s, type StoreState, type Input } from "../src/lib/types";
const list = (st: StoreState, t: string) => Object.values(st.tables[t] || {});
function command(st: StoreState, type: string, input: Input = {}) {
  const r = execute(st, type, {
    idempotency_key: `test-${st.revision}-${type}`,
    ...input,
  });
  assert.equal(r.result.ok, true, `${type}: ${r.result.message}`);
  return r;
}
const buyer = {
  engagement_id: "engagement_northstar",
  grant_id: "grant_northstar",
};
function accepted() {
  const st = createState("shared_offer");
  const r = command(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: "offer_northstar_v1",
    expected_version: 2,
    confirmed: true,
    ...buyer,
  });
  return r;
}
function pending() {
  let st = createState("accepted_awaiting_prerequisites");
  st = command(st, "payment.startRequest", {
    id: "payment_request_northstar_deposit",
    ...buyer,
  }).state;
  return st;
}
const usd = (amount_minor: number) => ({
  amount_minor,
  currency: "USD",
  scale: 2,
});

test("baseline is review-ready with no payments, projects, or reservations", () => {
  const st = createState();
  assert.equal(st.tables.offers.offer_northstar.status, "awaiting_review");
  for (const t of ["projects", "reservations", "invoices", "receipts"])
    assert.equal(list(st, t).length, 0);
});
test("every scenario restores a fresh nonstacked store", () => {
  const dirty = command(createState(), "record.save", {
    table: "clients",
    id: "client_northstar",
    values: { name: "Edited" },
  }).state;
  assert.equal(
    execute(dirty, "scenario.load", { id: "shared_offer" }).result.code,
    "CONFIRMATION_REQUIRED",
  );
  const reset = command(dirty, "scenario.load", {
    id: "review_ready",
    confirmed: true,
  }).state;
  assert.equal(reset.tables.clients.client_northstar.name, "Northstar");
  assert.equal(list(reset, "projects").length, 0);
});
test("exact half-up money arithmetic matches all required canonical examples", () => {
  assert.equal(halfUp(45000, 6000, 10000), 27000);
  assert.equal(halfUp(27000, 200, 10000), 540);
  assert.equal(halfUp(26460, 15000, 100), 3969000);
  assert.equal(halfUp(18000, 200, 10000), 360);
  assert.equal(halfUp(17640, 15000, 100), 2646000);
  assert.equal(halfUp(25, 200, 10000), 1);
});
test("approve does not share, accept, reserve or receive money", () => {
  const r = command(createState(), "offer.approve", {
    id: "offer_northstar",
    expected_version: 1,
    destination_contact_id: "contact_emma",
  });
  assert.equal(r.state.tables.offers.offer_northstar.status, "approved");
  for (const t of ["share_records", "acceptances", "projects", "receipts"])
    assert.equal(list(r.state, t).length, 0);
});
test("share requires exact approved destination and connected capability", () => {
  let st = command(createState(), "offer.approve", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  }).state;
  const mismatch = execute(st, "offer.share", {
    id: "offer_northstar",
    destination_contact_id: "contact_jules",
  });
  assert.equal(mismatch.result.code, "APPROVAL_STALE");
  st = command(st, "connection.change", {
    id: "gmail",
    action: "disconnect",
  }).state;
  const blocked = execute(st, "offer.share", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  });
  assert.equal(blocked.result.code, "CONNECTION_REVOKED");
  assert.equal(list(blocked.state, "share_records").length, 0);
  st = command(st, "connection.change", {
    id: "gmail",
    action: "reconnect",
    approved_capabilities: ["simulate_send"],
  }).state;
  assert.equal(list(st, "share_records").length, 0);
  st = command(st, "offer.share", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  }).state;
  assert.equal(list(st, "share_records").length, 1);
});
test("stale approval is rejected atomically", () => {
  const st = createState();
  const r = execute(st, "offer.approve", {
    id: "offer_northstar",
    expected_version: 90,
    destination_contact_id: "contact_emma",
  });
  assert.equal(r.result.code, "STALE_VERSION");
  assert.equal(r.state, st);
  assert.equal(list(st, "approvals").length, 0);
});
test("same idempotency key returns stored outcome before stale versions; different input conflicts", () => {
  const st = createState(),
    input = {
      id: "offer_northstar",
      expected_version: 1,
      destination_contact_id: "contact_emma",
      idempotency_key: "approval-1",
    };
  const first = command(st, "offer.approve", input),
    again = execute(first.state, "offer.approve", input);
  assert.equal(again.result.replayed, true);
  assert.equal(again.state, first.state);
  assert.equal(
    list(again.state, "events").length,
    list(first.state, "events").length,
  );
  const conflict = execute(first.state, "offer.approve", {
    ...input,
    destination_contact_id: "contact_jules",
  });
  assert.equal(conflict.result.code, "IDEMPOTENCY_CONFLICT");
});
test("acceptance transaction produces exactly one linked project, reservation, draft invoice and request", () => {
  const r = accepted(),
    st = r.state,
    ids = r.result.ids!;
  assert.equal(list(st, "projects").length, 1);
  assert.equal(list(st, "reservations").length, 1);
  assert.equal(st.tables.invoices[ids.invoice_id].state, "draft");
  assert.equal(invoiceTotal(st, ids.invoice_id), 27000);
  assert.equal(
    st.tables.payment_requests[ids.payment_request_id].state,
    "created",
  );
  assert.equal(st.tables.projects[ids.project_id].committed_start_at, null);
  assert.equal(
    Date.parse(s(st.tables.reservations[ids.reservation_id].expires_at)) -
      Date.parse(st.sample_clock),
    48 * 3600000,
  );
});
test("acceptance retry returns identical IDs without duplicate artifacts", () => {
  const initial = createState("shared_offer"),
    input = {
      id: "offer_northstar",
      offer_version_id: "offer_northstar_v1",
      expected_version: 2,
      confirmed: true,
      ...buyer,
      idempotency_key: "accept-once",
    };
  const first = command(initial, "offer.accept", input),
    replay = execute(first.state, "offer.accept", input);
  assert.deepEqual(replay.result.ids, first.result.ids);
  assert.equal(list(replay.state, "projects").length, 1);
  assert.equal(
    list(replay.state, "events").length,
    list(first.state, "events").length,
  );
});
test("mismatched or revoked grant fails closed", () => {
  const st = createState("shared_offer");
  const bad = execute(st, "offer.accept", {
    id: "offer_northstar",
    confirmed: true,
    ...buyer,
    grant_id: "grant_lumen",
  });
  assert.equal(bad.result.code, "NOT_AUTHORIZED");
  st.tables.buyer_grants.grant_northstar.state = "revoked";
  assert.equal(buyerOffer(st, "engagement_northstar", "grant_northstar"), null);
  assert.equal(
    execute(st, "offer.accept", {
      id: "offer_northstar",
      confirmed: true,
      ...buyer,
    }).result.code,
    "NOT_AUTHORIZED",
  );
});
test("editing a shared offer supersedes old link and hides unshared successor", () => {
  let st = createState("shared_offer");
  st = command(st, "offer.saveDraft", {
    id: "offer_northstar",
    values: { title: "SECRET UNPUBLISHED SUCCESSOR" },
  }).state;
  const view = buyerOffer(st, "engagement_northstar", "grant_northstar");
  assert.equal(view?.state, "superseded");
  assert.equal(view?.accept_eligibility.allowed, false);
  assert.ok(!JSON.stringify(view).includes("SECRET UNPUBLISHED"));
  assert.equal(
    execute(st, "offer.accept", {
      id: "offer_northstar",
      offer_version_id: "offer_northstar_v1",
      confirmed: true,
      ...buyer,
    }).result.code,
    "OFFER_SUPERSEDED",
  );
});
test("accepted snapshots survive new policy and amendment drafts", () => {
  const r = accepted();
  let st = r.state;
  const before = buyerOffer(st, "engagement_northstar", "grant_northstar");
  st = command(st, "record.save", {
    table: "policies",
    id: "policy_business",
    values: { deposit_basis_points: 4000 },
  }).state;
  st = command(st, "offer.amend", {
    id: "offer_northstar",
    values: { title: "New amendment", price: usd(50000) },
  }).state;
  const after = buyerOffer(st, "engagement_northstar", "grant_northstar");
  assert.equal(after?.price.amount_minor, before?.price.amount_minor);
  assert.equal(after?.terms.deposit_basis_points, 6000);
  assert.equal(after?.title, before?.title);
  assert.equal(after?.state, "accepted");
});
test("rendering buyer portal never issues a deposit invoice", () => {
  const st = createState("accepted_awaiting_prerequisites");
  buyerPortal(st, "engagement_northstar", "grant_northstar");
  assert.equal(st.tables.invoices.invoice_northstar_deposit.state, "draft");
  assert.equal(
    pending().tables.invoices.invoice_northstar_deposit.state,
    "issued",
  );
});
test("gross receipt reduces debt; provider fee never reduces allocated deposit", () => {
  let st = pending();
  st = command(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(27000),
    fee: usd(540),
    provider_event_id: "full",
  }).state;
  const receipt = list(st, "receipts")[0];
  assert.equal(o(receipt.net).amount_minor, 26460);
  assert.equal(invoiceOutstanding(st, "invoice_northstar_deposit"), 0);
  assert.equal(st.tables.projects.project_northstar.deposit_state, "confirmed");
  assert.equal(st.tables.projects.project_northstar.committed_start_at, null);
});
test("duplicate provider event replays and altered content conflicts", () => {
  const input = {
    id: "payment_request_northstar_deposit",
    gross: usd(27000),
    fee: usd(540),
    provider_event_id: "same",
  };
  const st = command(pending(), "payment.simulateReceipt", input).state;
  const repeat = command(st, "payment.simulateReceipt", {
    ...input,
    idempotency_key: "different-command",
  });
  assert.equal(repeat.result.replayed, true);
  assert.equal(list(repeat.state, "receipts").length, 1);
  const bad = execute(st, "payment.simulateReceipt", {
    ...input,
    gross: usd(20000),
    idempotency_key: "changed",
  });
  assert.equal(bad.result.code, "DUPLICATE_PROVIDER_EVENT_CONFLICT");
  assert.equal(bad.state, st);
});
test("wrong currency remains observed but unallocated", () => {
  const st = command(pending(), "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: { amount_minor: 27000, currency: "IDR", scale: 0 },
    fee: { amount_minor: 0, currency: "IDR", scale: 0 },
    provider_event_id: "wrong",
  }).state;
  assert.equal(list(st, "receipts").length, 1);
  assert.equal(list(st, "allocations").length, 0);
  assert.equal(invoiceOutstanding(st, "invoice_northstar_deposit"), 27000);
  assert.equal(list(st, "finance_issues")[0].kind, "wrong_currency");
});
test("partial and excess receipts never overallocate", () => {
  let st = command(pending(), "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(10000),
    fee: usd(200),
    provider_event_id: "partial",
  }).state;
  assert.equal(invoiceOutstanding(st, "invoice_northstar_deposit"), 17000);
  assert.equal(
    st.tables.invoices.invoice_northstar_deposit.state,
    "partially_paid",
  );
  assert.equal(
    st.tables.projects.project_northstar.deposit_state,
    "awaiting_payment",
  );
  st = command(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(20000),
    fee: usd(400),
    provider_event_id: "extra",
  }).state;
  assert.equal(invoiceOutstanding(st, "invoice_northstar_deposit"), 0);
  const allocations = list(st, "allocations");
  assert.equal(
    allocations.reduce((v, x) => v + Number(o(x.amount).amount_minor), 0),
    27000,
  );
  assert.ok(
    list(st, "finance_issues").some((x) => x.kind === "excess_receipt"),
  );
});
test("invalid fee and cross-currency allocation are atomic failures", () => {
  let st = pending();
  const bad = execute(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(100),
    fee: usd(101),
    provider_event_id: "bad",
  });
  assert.equal(bad.result.ok, false);
  assert.equal(bad.state, st);
  st = createState("wrong_currency_receipt");
  const rec = list(st, "receipts")[0];
  assert.equal(
    execute(st, "finance.allocateReceipt", {
      receipt_id: rec.id,
      invoice_id: "invoice_northstar_deposit",
      amount_minor: 1,
    }).result.code,
    "CURRENCY_MISMATCH",
  );
});
test("complete prerequisites before expiry commit next business day and day-five due", () => {
  let st = pending();
  st.sample_clock = "2026-10-15T08:10:00+07:00";
  st = command(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(27000),
    fee: usd(540),
    provider_event_id: "date-full",
  }).state;
  for (const row of list(st, "required_inputs"))
    st = command(st, "project.provideInput", {
      id: row.id,
      answer: "Meaningful final client input",
      ...buyer,
    }).state;
  const p = st.tables.projects.project_northstar;
  assert.equal(p.committed_start_at, "2026-10-16T09:00:00+07:00");
  assert.equal(p.committed_due_at, "2026-10-22T17:00:00+07:00");
  assert.equal(list(st, "calendar_events").length, 2);
  assert.ok(
    list(st, "calendar_events").every(
      (x) => x.external_invitation_state === "not_requested",
    ),
  );
});
test("prerequisites exactly at reservation expiry require rescheduling without erasing receipts", () => {
  let st = pending();
  st.sample_clock = s(st.tables.reservations.reservation_northstar.expires_at);
  st = command(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(27000),
    fee: usd(540),
    provider_event_id: "late",
  }).state;
  for (const row of list(st, "required_inputs"))
    st = command(st, "project.provideInput", {
      id: row.id,
      answer: "Input arrives after expiry",
      ...buyer,
    }).state;
  assert.equal(
    st.tables.projects.project_northstar.state,
    "needs_rescheduling",
  );
  assert.equal(st.tables.projects.project_northstar.committed_start_at, null);
  assert.equal(list(st, "receipts").length, 1);
  assert.equal(
    execute(st, "project.commitStart", { id: "project_northstar" }).result.code,
    "RESERVATION_EXPIRED",
  );
  assert.equal(
    execute(st, "project.reschedule", {
      id: "project_northstar",
      confirmed: true,
    }).result.code,
    "APPROVAL_REQUIRED",
  );
});
test("advancing clock never expires an accepted paid project", () => {
  const st = command(createState("active_paid_project"), "clock.advance", {
    days: 20,
  }).state;
  assert.equal(st.tables.offers.offer_northstar.status, "accepted");
  assert.equal(st.tables.projects.project_northstar.state, "active");
  assert.equal(st.tables.projects.project_northstar.deposit_state, "confirmed");
});
test("public and buyer projections exclude owner finances and other-client private fields", () => {
  const st = createState("active_paid_project");
  st.tables.profiles.profile_alya.private_notes = "PRIVATE_NOTE_MARKER";
  st.tables.clients.client_lumen.name = "OTHER_CLIENT_MARKER";
  st.tables.private_notes.note_northstar.content = "PRIVATE_NOTE_MARKER";
  const texts = [
    publicProfile(st, "alya"),
    buyerOffer(st, "engagement_northstar", "grant_northstar"),
    buyerPortal(st, "engagement_northstar", "grant_northstar"),
    inquiryProjection(st, "engagement_northstar", "grant_northstar"),
  ]
    .map((x) => JSON.stringify(x))
    .join("");
  for (const marker of [
    "PRIVATE_NOTE_MARKER",
    "OTHER_CLIENT_MARKER",
    "estimated_effort_minutes",
    "fee_basis_points",
    "fx_idr_per_usd",
    "upfront_cost_assumption",
    "private_notes",
    '"net"',
    '"fee"',
  ])
    assert.ok(!texts.includes(marker), marker);
  assert.equal(publicProfile(st, "unknown"), null);
  assert.equal(buyerPortal(st, "engagement_unknown", "grant_northstar"), null);
});
test("draft profile changes do not leak until exact deliberate publication", () => {
  let st = createState();
  st = command(st, "record.save", {
    table: "profiles",
    id: "profile_alya",
    values: { headline: "UNAPPROVED NEW CLAIM" },
  }).state;
  assert.ok(!JSON.stringify(publicProfile(st, "alya")).includes("UNAPPROVED"));
  st = command(st, "profile.publish", {
    id: "profile_alya",
    expected_version: st.tables.profiles.profile_alya.version,
    reviewed: true,
  }).state;
  assert.equal(publicProfile(st, "alya")?.headline, "UNAPPROVED NEW CLAIM");
});
test("unpublished service slug cannot be fetched through public projection", () => {
  const st = createState();
  st.tables.publication_snapshots.services_service_motion.values = {
    ...o(st.tables.publication_snapshots.services_service_motion.values),
    published: false,
  };
  assert.ok(
    !publicProfile(st, "alya")?.services.some(
      (x) => x.slug === "launch-animation",
    ),
  );
});
test("cancelled run cannot commit future checkpoints; unsupported requests stay saved", () => {
  let st = command(createState(), "agent.start", {
    role_id: "scout",
    intent: "assess_opportunity",
  }).state;
  const run = list(st, "agent_runs").at(-1)!;
  st = command(st, "agent.control", {
    id: run.id,
    action: "cancel",
    control_version: 1,
  }).state;
  const count = list(st, "artifacts").length;
  const r = execute(st, "agent.control", {
    id: run.id,
    action: "checkpoint",
    control_version: 2,
  });
  assert.equal(r.result.code, "INVALID_STATE");
  assert.equal(list(r.state, "artifacts").length, count);
  const unsupported = command(st, "agent.start", {
    role_id: "scout",
    intent: "Win an unknown real-world contract automatically",
  });
  assert.equal(
    unsupported.state.tables.agent_runs[unsupported.result.id!].status,
    "waiting_input",
  );
  assert.ok(
    list(unsupported.state, "team_requests").some(
      (x) => x.status === "unsupported",
    ),
  );
});
test("six agent roles create actual distinct output records through explicit checkpoints", () => {
  for (const role of [
    "scout",
    "operations",
    "finance",
    "sales",
    "promoter",
    "account_manager",
  ]) {
    const r = command(createState(), "agent.start", {
      role_id: role,
      intent:
        role === "promoter"
          ? "draft_promotion"
          : role === "account_manager"
            ? "draft_followup"
            : role === "sales"
              ? "draft_offer"
              : "assess_opportunity",
    });
    let st = r.state;
    for (let i = 0; i < 3; i++)
      st = command(st, "agent.control", {
        id: r.result.id,
        action: "checkpoint",
        control_version: st.tables.agent_runs[r.result.id!].control_version,
      }).state;
    const run = st.tables.agent_runs[r.result.id!];
    assert.equal(run.progress_step, 3);
    assert.ok(["completed", "waiting_approval"].includes(s(run.status)));
    assert.equal((run.output_artifact_ids as string[]).length, 1);
  }
});
test("run pause and resume preserve checkpoint and retry creates another attempt", () => {
  let st = createState("recoverable_task_failure");
  const failed = list(st, "agent_runs").find((x) => x.status === "failed")!;
  const retry = command(st, "agent.control", {
    id: failed.id,
    action: "retry",
  });
  assert.notEqual(retry.result.id, failed.id);
  assert.equal(retry.state.tables.agent_runs[failed.id].status, "failed");
  st = retry.state;
  const id = retry.result.id!;
  st = command(st, "agent.control", { id, action: "pause" }).state;
  assert.equal(st.tables.agent_runs[id].status, "paused");
  st = command(st, "agent.control", { id, action: "resume" }).state;
  assert.equal(st.tables.agent_runs[id].status, "queued");
});
test("invoice decimal quantities use exact rational arithmetic", () => {
  let st = createState();
  const draft = command(st, "invoice.saveDraft", {
    values: {
      client_id: "client_northstar",
      currency: "USD",
      due_at: "2026-10-20T17:00:00+07:00",
      lines: [
        {
          description: "Consultation",
          quantity: 1.25,
          unit_amount: usd(8000),
          tax_basis_points: 0,
        },
        {
          description: "Courtesy notes",
          quantity: 1,
          unit_amount: usd(0),
          tax_basis_points: 0,
        },
      ],
    },
  });
  assert.equal(invoiceTotal(draft.state, draft.result.id!), 10000);
  st = command(draft.state, "invoice.issue", {
    id: draft.result.id,
    confirmed: true,
  }).state;
  assert.equal(list(st, "payment_requests").length, 1);
  assert.equal(
    execute(st, "invoice.saveDraft", { id: draft.result.id, values: {} }).result
      .code,
    "INVALID_STATE",
  );
});
test("expense correction ledger retains original money and records exact delta", () => {
  let st = createState();
  st = command(st, "expense.correct", {
    id: "expense_domain",
    revised_amount_minor: 1000,
    currency: "USD",
    reason: "Correct entered amount",
  }).state;
  assert.equal(o(st.tables.expenses.expense_domain.amount).amount_minor, 1200);
  assert.equal(list(st, "expense_corrections")[0].delta_minor, -200);
});
test("runtime validators reject unsafe URLs, out-of-range money and persisted passwords", () => {
  const st = createState();
  for (const values of [
    { website: "javascript:alert(1)" },
    { email: "not-email" },
    { password: "never-store-this" },
  ])
    assert.equal(
      execute(st, "record.save", {
        table: "clients",
        id: "client_northstar",
        values,
      }).result.ok,
      false,
    );
  assert.equal(
    execute(st, "record.save", {
      table: "policies",
      id: "policy_business",
      values: { deposit_basis_points: 10001 },
    }).result.ok,
    false,
  );
});
test("buyer invitation cannot use generic owner mutations", () => {
  const st = createState();
  assert.equal(
    execute(st, "record.save", {
      table: "clients",
      id: "client_northstar",
      values: { name: "Unauthorized" },
      ...buyer,
    }).result.code,
    "NOT_AUTHORIZED",
  );
});
test("events have increasing sequence, unique IDs and replay deduplication", () => {
  let st = createState();
  st = command(st, "record.save", {
    table: "clients",
    id: "client_northstar",
    values: { name: "Northstar Labs" },
  }).state;
  st = command(st, "clock.advance", { days: 1 }).state;
  const events = list(st, "events");
  assert.equal(new Set(events.map((e) => e.id)).size, events.length);
  assert.deepEqual(
    events.map((e) => e.sequence),
    events.map((e) => e.sequence).sort((a, b) => Number(a) - Number(b)),
  );
});

function sharedAmendment(st: StoreState, values: Input) {
  st = command(st, "offer.amend", {
    id: "offer_northstar",
    values: {
      amendment_reason: "Owner reviewed changes to this agreement",
      ...values,
    },
  }).state;
  st = command(st, "offer.requestReview", { id: "offer_northstar" }).state;
  st = command(st, "offer.approve", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  }).state;
  st = command(st, "offer.share", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
    channel: "sample_link",
  }).state;
  return st;
}
test("price-increase amendment creates only additional upfront invoice on same project", () => {
  const initial = createState("active_paid_project"),
    originalInvoice = structuredClone(
      initial.tables.invoices.invoice_northstar_deposit,
    ),
    originalReceipt = structuredClone(
      initial.tables.receipts.receipt_northstar_deposit,
    );
  let st = sharedAmendment(initial, { price: usd(55000) });
  const version = s(st.tables.offers.offer_northstar.current_version_id);
  const proposal = buyerOffer(
    st,
    "engagement_northstar",
    "grant_northstar",
    version,
  );
  assert.equal(proposal?.amendment?.price_delta_minor, 10000);
  assert.equal(proposal?.amendment?.deposit_delta_minor, 6000);
  const result = command(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: version,
    ...buyer,
    confirmed: true,
    idempotency_key: "amend-paid-accept",
  });
  st = result.state;
  assert.equal(result.result.ids?.project_id, "project_northstar");
  assert.equal(list(st, "projects").length, 1);
  assert.equal(list(st, "reservations").length, 1);
  assert.deepEqual(
    st.tables.invoices.invoice_northstar_deposit,
    originalInvoice,
  );
  assert.deepEqual(
    st.tables.receipts.receipt_northstar_deposit,
    originalReceipt,
  );
  const delta = list(st, "invoices").find(
    (x) => x.kind === "amendment_deposit",
  )!;
  assert.equal(invoiceTotal(st, delta), 6000);
  assert.equal(delta.state, "draft");
  assert.equal(
    st.tables.projects.project_northstar.deposit_state,
    "awaiting_payment",
  );
  assert.equal(list(st, "allocations").length, 1);
  const replay = execute(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: version,
    ...buyer,
    confirmed: true,
    idempotency_key: "amend-paid-accept",
  });
  assert.deepEqual(replay.result.ids, result.result.ids);
  assert.equal(list(replay.state, "invoices").length, 2);
  const request = result.result.ids!.payment_request_id;
  st = command(st, "payment.startRequest", { id: request, ...buyer }).state;
  st = command(st, "payment.simulateReceipt", {
    id: request,
    gross: usd(6000),
    fee: usd(120),
    provider_event_id: "amendment_delta",
  }).state;
  assert.equal(st.tables.projects.project_northstar.deposit_state, "confirmed");
  assert.equal(list(st, "projects").length, 1);
});
test("duration amendment updates internal deadline after agreement without another reservation", () => {
  let st = createState("active_paid_project");
  const original = structuredClone(
    st.tables.acceptances.acceptance_northstar_v1,
  );
  st = sharedAmendment(st, {
    terms: {
      ...o(st.tables.offer_versions.offer_northstar_v1.terms),
      delivery_business_days: 7,
    },
  });
  st = command(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: st.tables.offers.offer_northstar.current_version_id,
    ...buyer,
    confirmed: true,
  }).state;
  assert.equal(
    st.tables.projects.project_northstar.committed_start_at,
    "2026-10-16T09:00:00+07:00",
  );
  assert.equal(
    st.tables.projects.project_northstar.committed_due_at,
    "2026-10-26T17:00:00+07:00",
  );
  assert.equal(list(st, "reservations").length, 1);
  assert.equal(list(st, "calendar_events").length, 2);
  assert.deepEqual(st.tables.acceptances.acceptance_northstar_v1, original);
  assert.equal(list(st, "project_schedule_history").length, 1);
});
test("amended schedule waits for incremental upfront receipt and preserves prior dates until then", () => {
  let st = createState("active_paid_project");
  st = sharedAmendment(st, {
    price: usd(55000),
    terms: {
      ...o(st.tables.offer_versions.offer_northstar_v1.terms),
      delivery_business_days: 7,
    },
  });
  const r = command(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: st.tables.offers.offer_northstar.current_version_id,
    ...buyer,
    confirmed: true,
  });
  st = r.state;
  assert.equal(
    st.tables.projects.project_northstar.committed_due_at,
    "2026-10-22T17:00:00+07:00",
  );
  assert.equal(
    o(st.tables.projects.project_northstar.pending_amendment_schedule).due,
    "2026-10-26T17:00:00+07:00",
  );
  const request = r.result.ids!.payment_request_id;
  st = command(st, "payment.startRequest", { id: request, ...buyer }).state;
  st = command(st, "payment.simulateReceipt", {
    id: request,
    gross: usd(6000),
    fee: usd(120),
    provider_event_id: "amendment_dates",
  }).state;
  assert.equal(
    st.tables.projects.project_northstar.committed_due_at,
    "2026-10-26T17:00:00+07:00",
  );
  assert.equal(
    st.tables.projects.project_northstar.pending_amendment_schedule,
    null,
  );
});
test("amendment requiring refund or excess capacity fails atomically with existing agreement intact", () => {
  for (const [values, code] of [
    [{ price: usd(20000) }, "FINANCIAL_REVIEW_REQUIRED"],
    [{ estimated_effort_minutes: 1000 }, "CAPACITY_CONFLICT"],
  ] as [Input, string][]) {
    const st = sharedAmendment(createState("active_paid_project"), values);
    const r = execute(st, "offer.accept", {
      id: "offer_northstar",
      offer_version_id: st.tables.offers.offer_northstar.current_version_id,
      ...buyer,
      confirmed: true,
    });
    assert.equal(r.result.code, code);
    assert.equal(r.state, st);
    assert.equal(list(st, "acceptances").length, 1);
    assert.equal(list(st, "invoices").length, 1);
    assert.equal(
      st.tables.projects.project_northstar.accepted_version_id,
      "offer_northstar_v1",
    );
  }
});

test("unaccepted buyer change request creates one successor draft and preserves old shared terms", () => {
  const st = createState("shared_offer"),
    before = structuredClone(st.tables.offer_versions.offer_northstar_v1);
  const r = command(st, "offer.requestChanges", {
    id: "offer_northstar",
    offer_version_id: "offer_northstar_v1",
    ...buyer,
    reason: "Please add a second review round.",
  });
  assert.equal(r.state.tables.offers.offer_northstar.status, "draft");
  const next = s(r.state.tables.offers.offer_northstar.current_version_id);
  assert.notEqual(next, "offer_northstar_v1");
  assert.equal(
    r.state.tables.offer_versions[next].buyer_requested_changes,
    "Please add a second review round.",
  );
  assert.deepEqual(
    r.state.tables.offer_versions.offer_northstar_v1.price,
    before.price,
  );
  assert.equal(
    r.state.tables.offer_versions.offer_northstar_v1.state,
    "change_requested",
  );
  assert.equal(
    buyerOffer(r.state, "engagement_northstar", "grant_northstar")
      ?.accept_eligibility.allowed,
    false,
  );
});

test("expired reservation reschedule requires exact buyer-accepted proposal and applies selected business date", () => {
  let st = pending();
  st = command(st, "clock.advance", { days: 3 }).state;
  st = command(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(27000),
    fee: usd(540),
    provider_event_id: "late_reschedule_receipt",
  }).state;
  for (const row of list(st, "required_inputs"))
    st = command(st, "project.provideInput", {
      id: row.id,
      answer: "Complete final project input",
      ...buyer,
    }).state;
  assert.equal(
    st.tables.projects.project_northstar.state,
    "needs_rescheduling",
  );
  assert.equal(
    execute(st, "project.reschedule", {
      id: "project_northstar",
      confirmed: true,
    }).result.code,
    "APPROVAL_REQUIRED",
  );
  const proposed = "2026-10-22T09:00:00+07:00";
  const r = command(st, "project.proposeReschedule", {
    id: "project_northstar",
    expected_version: st.tables.projects.project_northstar.version,
    expected_reservation_version:
      st.tables.reservations.reservation_northstar.version,
    proposed_start_at: proposed,
    reason: "Inputs arrived late; buyer must approve the replacement start.",
  });
  st = r.state;
  assert.equal(st.tables.projects.project_northstar.committed_start_at, null);
  assert.equal(st.tables.reservations.reservation_northstar.state, "expired");
  assert.equal(
    st.tables.calendar_events[r.result.ids!.proposal_id].state,
    "proposed",
  );
  st = command(st, "offer.requestReview", { id: "offer_northstar" }).state;
  st = command(st, "offer.approve", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  }).state;
  st = command(st, "offer.share", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
    channel: "sample_link",
  }).state;
  const version = s(st.tables.offers.offer_northstar.current_version_id);
  assert.equal(
    buyerOffer(st, "engagement_northstar", "grant_northstar", version)
      ?.amendment?.proposed_start_at,
    proposed,
  );
  st = command(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: version,
    confirmed: true,
    ...buyer,
  }).state;
  assert.equal(
    st.tables.projects.project_northstar.committed_start_at,
    proposed,
  );
  assert.equal(
    st.tables.projects.project_northstar.committed_due_at,
    "2026-10-28T17:00:00+07:00",
  );
  assert.equal(list(st, "projects").length, 1);
  assert.equal(list(st, "reservations").length, 1);
  assert.equal(list(st, "receipts").length, 1);
  assert.equal(list(st, "reservation_history").length, 1);
  const repeat = command(st, "project.reschedule", {
    id: "project_northstar",
    expected_version: st.tables.projects.project_northstar.version,
    expected_reservation_version:
      st.tables.reservations.reservation_northstar.version,
    confirmed: true,
  });
  assert.equal(
    repeat.state.tables.projects.project_northstar.committed_start_at,
    proposed,
  );
});
test("renewed amendment reservation expiry preserves late receipt and requires another schedule review", () => {
  let st = createState("accepted_awaiting_prerequisites");
  st = command(st, "clock.advance", { days: 3 }).state;
  const r = command(st, "project.proposeReschedule", {
    id: "project_northstar",
    proposed_start_at: "2026-10-22T09:00:00+07:00",
    reason: "Buyer input delay needs replacement dates.",
  });
  st = r.state;
  st = command(st, "offer.requestReview", { id: "offer_northstar" }).state;
  st = command(st, "offer.approve", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  }).state;
  st = command(st, "offer.share", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
    channel: "sample_link",
  }).state;
  st = command(st, "offer.accept", {
    id: "offer_northstar",
    offer_version_id: st.tables.offers.offer_northstar.current_version_id,
    confirmed: true,
    ...buyer,
  }).state;
  st = command(st, "clock.advance", { days: 3 }).state;
  st = command(st, "payment.startRequest", {
    id: "payment_request_northstar_deposit",
    ...buyer,
  }).state;
  st = command(st, "payment.simulateReceipt", {
    id: "payment_request_northstar_deposit",
    gross: usd(27000),
    fee: usd(540),
    provider_event_id: "renewal_late",
  }).state;
  for (const row of list(st, "required_inputs"))
    st = command(st, "project.provideInput", {
      id: row.id,
      answer: "Final input after renewed expiry",
      ...buyer,
    }).state;
  assert.equal(list(st, "receipts").length, 1);
  assert.equal(st.tables.projects.project_northstar.deposit_state, "confirmed");
  assert.equal(st.tables.projects.project_northstar.committed_start_at, null);
  assert.equal(
    st.tables.projects.project_northstar.amendment_schedule_state,
    "needs_rescheduling",
  );
  assert.equal(
    execute(st, "project.reschedule", {
      id: "project_northstar",
      confirmed: true,
    }).result.code,
    "RESCHEDULING_REVIEW_REQUIRED",
  );
});
test("approved offer completes its waiting Sales run without claiming professional delivery", () => {
  const st = command(createState(), "offer.approve", {
    id: "offer_northstar",
    destination_contact_id: "contact_emma",
  }).state;
  const run = list(st, "agent_runs").find((x) => x.role_id === "sales");
  assert.equal(run?.status, "completed");
  assert.equal(list(st, "projects").length, 0);
});

test("loaded shared and accepted scenarios reconcile their approved Sales output", () => {
  for (const scenario of [
    "shared_offer",
    "accepted_awaiting_prerequisites",
    "active_paid_project",
  ]) {
    const st = createState(scenario);
    assert.equal(st.tables.agent_runs.run_sales_northstar.status, "completed");
    assert.equal(st.dirty, false);
  }
});
