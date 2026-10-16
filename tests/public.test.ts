import assert from "node:assert/strict";
import test from "node:test";
import { createState, execute } from "../src/lib/engine";
import {
  publicProfile,
  inquiryProjection,
  buyerOffer,
  buyerPortal,
} from "../src/lib/projections";
import type { Input } from "../src/lib/types";

function harness(scenario = "shared_offer") {
  let state = createState(scenario);
  return {
    get state() {
      return state;
    },
    action(type: string, input: Input = {}) {
      const r = execute(state, type, input);
      assert.equal(r.result.ok, true, `${type}: ${r.result.message}`);
      state = r.state;
      return r.result;
    },
  };
}
test("public and buyer projections fail closed and omit private records", () => {
  const h = harness();
  const state = h.state;
  state.tables.private_notes.private_leak = {
    id: "private_leak",
    version: 1,
    content: "PRIVATE_BUYER_AUTH_TEST_019",
    client_id: "client_northstar",
  };
  assert(publicProfile(state, "alya"));
  assert.equal(publicProfile(state, "unknown"), null);
  assert.equal(buyerOffer(state, "engagement_northstar", "grant_lumen"), null);
  assert.equal(buyerPortal(state, "engagement_northstar", "unknown"), null);
  const safe = buyerOffer(state, "engagement_northstar", "grant_northstar");
  assert(safe);
  assert(safe.accept_eligibility.allowed);
  const output = JSON.stringify([
    publicProfile(state, "alya"),
    safe,
    inquiryProjection(state, "engagement_northstar", "grant_northstar"),
  ]);
  assert(!output.includes("PRIVATE_BUYER_AUTH_TEST_019"));
  for (const field of [
    "estimated_effort_minutes",
    "internal_hourly_floor",
    "private_note_ids",
    "fx_assumption",
  ])
    assert(!output.includes(field));
  state.tables.buyer_grants.grant_northstar.state = "revoked";
  assert.equal(
    buyerPortal(state, "engagement_northstar", "grant_northstar"),
    null,
  );
});
test("buyer acceptance, exact deposit and required inputs activate one shared project", () => {
  const h = harness(),
    safe = buyerOffer(h.state, "engagement_northstar", "grant_northstar")!;
  const scope = {
    grant_id: "grant_northstar",
    engagement_id: "engagement_northstar",
  };
  const payload = {
    id: safe.offer_id,
    offer_version_id: safe.offer_version_id,
    expected_version: safe.offer_record_version,
    ...scope,
    confirmed: true,
    idempotency_key: "buyer_check_accept",
  };
  h.action("offer.accept", payload);
  const accepted = buyerPortal(h.state, scope.engagement_id, scope.grant_id)!;
  assert(accepted.project);
  const req = accepted.requests[0];
  assert(req);
  assert.equal(accepted.project.state, "awaiting_prerequisites");
  h.action("offer.accept", payload);
  assert.equal(Object.keys(h.state.tables.projects).length, 1);
  h.action("payment.startRequest", {
    id: req.id,
    expected_version: req.version,
    ...scope,
  });
  h.action("payment.simulateReceipt", {
    id: req.id,
    ...scope,
    gross: { amount_minor: 27000, currency: "USD", scale: 2 },
    fee: { amount_minor: 540, currency: "USD", scale: 2 },
    provider_event_id: "buyer_check_payment",
    observed_at: h.state.sample_clock,
  });
  for (const input of accepted.inputs)
    h.action("project.provideInput", {
      id: input.id,
      expected_version: input.version,
      answer: "Buyer-approved brand assets and final launch message",
      attachment_ids: [],
      ...scope,
    });
  const portal = buyerPortal(h.state, scope.engagement_id, scope.grant_id)!;
  assert.equal(portal.project?.state, "active");
  assert(portal.project?.committed_start_at);
  assert(portal.project?.committed_due_at);
  const receipt = portal.receipts[0];
  const receiptCount = Object.keys(h.state.tables.receipts).length;
  h.action("payment.replayReceipt", {
    id: req.id,
    receipt_id: receipt.id,
    ...scope,
  });
  assert.equal(Object.keys(h.state.tables.receipts).length, receiptCount);
  assert.equal(portal.project?.professional_delivery_state, "not_started");
});
test("intake isolates same-email visitor then saves conversation and brief revisions", () => {
  const h = harness();
  const fresh = h.action("inquiry.submit", {
    idempotency_key: "new_inquiry_test",
    values: {
      name: "New Buyer",
      email: "emma@northstar.example",
      request: "I would like a discovery workshop and summary.",
      service_id: "service_discovery",
      consent: true,
      budget: { amount_minor: 20000, currency: "USD", scale: 2 },
    },
  });
  const scope = { grant_id: fresh.ids!.grant_id, engagement_id: fresh.id! };
  const inquiry = inquiryProjection(
    h.state,
    scope.engagement_id,
    scope.grant_id,
  )!;
  assert(inquiry);
  assert.notEqual(inquiry.conversation.id, "conversation_northstar");
  const payload = {
    id: inquiry.conversation.id,
    expected_version: inquiry.conversation.version,
    content: "Please focus on our new service launch.",
    ...scope,
    idempotency_key: "new_inquiry_message",
  };
  h.action("conversation.send", payload);
  const length = inquiryProjection(
    h.state,
    scope.engagement_id,
    scope.grant_id,
  )!.messages.length;
  h.action("conversation.send", payload);
  assert.equal(
    inquiryProjection(h.state, scope.engagement_id, scope.grant_id)!.messages
      .length,
    length,
  );
  h.action("inquiry.updateBrief", {
    id: inquiry.requirements.id,
    expected_version: inquiry.requirements.version,
    ...scope,
    values: {
      requested_scope: ["Discovery workshop", "Findings summary"],
      requested_budget: { amount_minor: 25000, currency: "USD", scale: 2 },
      requested_delivery_business_days: 7,
    },
  });
  const updated = inquiryProjection(
    h.state,
    scope.engagement_id,
    scope.grant_id,
  )!;
  assert.equal(
    (updated.requirements.requested_budget as { amount_minor: number })
      .amount_minor,
    25000,
  );
  assert.equal(
    inquiryProjection(h.state, "engagement_northstar", scope.grant_id),
    null,
  );
});
test("local account and reset lifecycle never permit password persistence", () => {
  const h = harness();
  h.action("record.save", {
    table: "local_accounts",
    id: "account_test",
    values: {
      name: "Demo Owner",
      email: "demo@example.test",
      setup_status: "in_progress",
    },
  });
  h.action("record.save", {
    table: "recovery_grants",
    id: "recovery_test",
    values: {
      state: "prepared",
      expires_at: new Date(
        Date.parse(h.state.sample_clock) + 900000,
      ).toISOString(),
    },
  });
  h.action("record.save", {
    table: "recovery_grants",
    id: "recovery_test",
    values: {
      state: "consumed",
      password_reset_demonstrated_at: h.state.sample_clock,
    },
  });
  assert.equal(h.state.tables.recovery_grants.recovery_test.state, "consumed");
  const forbidden = execute(h.state, "record.save", {
    table: "local_accounts",
    id: "account_leak",
    values: { name: "Secret", password: "NO_SAVE" },
  });
  assert.equal(forbidden.result.ok, false);
  assert(!JSON.stringify(forbidden.state).includes("NO_SAVE"));
  h.action("session.set", { authenticated: false });
  assert.equal(h.state.session, false);
  h.action("session.set", { authenticated: true });
  assert.equal(h.state.session, true);
});
