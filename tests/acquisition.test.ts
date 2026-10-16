import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute } from "../src/lib/engine";
import { type Input, type StoreState, a, o, s } from "../src/lib/types";

function harness() {
  let state = createState();
  return {
    get state() {
      return state;
    },
    command(type: string, input: Input = {}, success = true) {
      const out = execute(state, type, input);
      assert.equal(out.result.ok, success, `${type}: ${out.result.message}`);
      if (success) state = out.state;
      else
        assert.equal(
          out.state,
          state,
          "A rejected transaction must keep the original snapshot",
        );
      return out.result;
    },
  };
}
function offerInput(state: StoreState, values: Input = {}) {
  const offer = state.tables.offers.offer_northstar;
  return {
    id: offer.id,
    expected_version: offer.version,
    offer_version_id: offer.current_version_id,
    destination_contact_id: "contact_emma",
    ...values,
  };
}
function promotionInput(state: StoreState, values: Input = {}) {
  const promotion = state.tables.promotions.promotion_launch_service;
  return {
    id: promotion.id,
    expected_version: promotion.version,
    destination: "sample_professional_network",
    ...values,
  };
}

test("manual lead payload creates connected client, source, brief and buyer context atomically", () => {
  const app = harness();
  const result = app.command("opportunity.save", {
    values: {
      name: "Fieldwork Studio",
      title: "Discovery workshop",
      request: "A workshop with a concise findings summary.",
      email: "contact@fieldwork.example",
      source_kind: "manual_entry",
      source_label: "Owner note",
      source_url: "https://fieldwork.example/brief",
      budget: { amount_minor: 82500, currency: "USD", scale: 2 },
      delivery_business_days: 7,
    },
  });
  const lead = app.state.tables.opportunities[result.id!];
  const req = app.state.tables.requirements[s(lead.requirements_id)];
  assert.equal(o(req.budget).amount_minor, 82500);
  assert.equal(req.delivery_business_days, 7);
  assert.equal(
    app.state.tables.clients[s(lead.client_id)].name,
    "Fieldwork Studio",
  );
  assert.ok(app.state.tables.contacts[s(lead.contact_id)]);
  assert.ok(app.state.tables.conversations[s(lead.conversation_id)]);
  const engagement = Object.values(app.state.tables.engagements).find(
    (x) => x.opportunity_id === lead.id,
  );
  assert.ok(engagement);
  assert.ok(app.state.tables.buyer_grants[s(engagement.buyer_grant_id)]);
  assert.equal(Object.keys(app.state.tables.projects).length, 0);
});

test("lead edit retains previous source evidence and invalidates current assessment", () => {
  const app = harness(),
    lead = app.state.tables.opportunities.opportunity_northstar;
  const oldSource = structuredClone(
    app.state.tables.sources.source_northstar_request,
  );
  app.command("opportunity.save", {
    id: lead.id,
    expected_version: lead.version,
    values: {
      name: "Northstar",
      client_id: "client_northstar",
      title: "Launch request revised",
      request: "Two assets requested, with updated launch copy.",
      budget: { amount_minor: 60000, currency: "USD", scale: 2 },
      source_kind: "manual_entry",
    },
  });
  assert.deepEqual(
    app.state.tables.sources.source_northstar_request,
    oldSource,
  );
  const saved = app.state.tables.opportunities.opportunity_northstar;
  assert.equal(a(saved.source_ids).length, 2);
  assert.equal(app.state.tables.requirements.requirements_northstar.version, 2);
  assert.equal(
    app.state.tables.assessments.assessment_scout_northstar.status,
    "stale",
  );
  app.command("offer.approve", offerInput(app.state), false);
});

test("decline accepts an optional reason and restore recovers the actual previous state", () => {
  const app = harness();
  const lead = app.state.tables.opportunities.opportunity_northstar;
  app.command("opportunity.decline", {
    id: lead.id,
    expected_version: lead.version,
    reason: "",
  });
  assert.equal(app.state.tables.opportunities[lead.id].status, "declined");
  app.command("opportunity.restore", {
    id: lead.id,
    expected_version: app.state.tables.opportunities[lead.id].version,
  });
  assert.equal(app.state.tables.opportunities[lead.id].status, "qualified");
});

test("offer approval and idempotent share remain separate from acceptance and payment", () => {
  const app = harness();
  app.command("offer.approve", offerInput(app.state));
  assert.equal(app.state.tables.offers.offer_northstar.status, "approved");
  assert.equal(Object.keys(app.state.tables.share_records).length, 0);
  const input = offerInput(app.state, {
    channel: "sample_link",
    idempotency_key: "test-share-click",
  });
  app.command("offer.share", input);
  const replay = app.command("offer.share", input);
  assert.equal(replay.replayed, true);
  assert.equal(Object.keys(app.state.tables.share_records).length, 1);
  for (const table of ["acceptances", "projects", "reservations", "receipts"])
    assert.equal(Object.keys(app.state.tables[table]).length, 0, table);
});

test("editing approved terms creates a successor and blocks sharing with old approval", () => {
  const app = harness();
  app.command("offer.approve", offerInput(app.state));
  const original = app.state.tables.offer_versions.offer_northstar_v1;
  app.command("offer.saveDraft", {
    id: "offer_northstar",
    expected_version: app.state.tables.offers.offer_northstar.version,
    values: {
      ...original,
      price: { amount_minor: 47500, currency: "USD", scale: 2 },
      internal_notes: "PRIVATE-TEST-MARKER",
      client_id: "client_northstar",
      opportunity_id: "opportunity_northstar",
    },
  });
  const current =
    app.state.tables.offer_versions[
      s(app.state.tables.offers.offer_northstar.current_version_id)
    ];
  assert.equal(current.revision, 2);
  assert.equal(o(current.price).amount_minor, 47500);
  assert.equal(current.internal_notes, "PRIVATE-TEST-MARKER");
  assert.equal(
    o(app.state.tables.offer_versions.offer_northstar_v1.price).amount_minor,
    45000,
  );
  app.command(
    "offer.share",
    offerInput(app.state, { channel: "sample_link" }),
    false,
  );
});

test("save and submit validates atomically and preserves incomplete draft inputs on failure", () => {
  const app = harness(),
    before = structuredClone(app.state.tables.offer_versions);
  app.command(
    "offer.saveDraft",
    {
      id: "offer_lumen",
      expected_version: 1,
      submit_for_review: true,
      values: {
        client_id: "client_lumen",
        opportunity_id: "opportunity_lumen",
        title: "Needs a price",
        deliverables: [{ key: "summary", label: "Findings", quantity: 1 }],
        price: null,
        terms: null,
      },
    },
    false,
  );
  assert.deepEqual(app.state.tables.offer_versions, before);
});

test("form-captured stale offer version is rejected instead of overwriting a newer edit", () => {
  const app = harness();
  const version = app.state.tables.offer_versions.offer_northstar_v1;
  const input = {
    id: "offer_northstar",
    expected_version: 1,
    values: {
      ...version,
      client_id: "client_northstar",
      opportunity_id: "opportunity_northstar",
      title: "First edit",
    },
  };
  app.command("offer.saveDraft", input);
  const currentId = app.state.tables.offers.offer_northstar.current_version_id;
  app.command(
    "offer.saveDraft",
    { ...input, values: { ...input.values, title: "Stale edit" } },
    false,
  );
  assert.equal(
    app.state.tables.offers.offer_northstar.current_version_id,
    currentId,
  );
});

test("promotion destination, audience and evidence survive the UI lifecycle without real publication", () => {
  const app = harness();
  const result = app.command("promotion.saveDraft", {
    values: {
      service_id: "service_discovery",
      content: "A focused discovery session and clear findings.",
      destination: "sample_professional_network",
      target_audience: "Product teams",
      destination_url: "https://network.example/profile",
      public_claim_refs: [
        { table: "services", id: "service_discovery", version: 1 },
      ],
    },
  });
  const id = result.id!;
  const saved = app.state.tables.promotions[id],
    draft = app.state.tables.promotion_versions[s(saved.current_version_id)];
  assert.equal(draft.target_audience, "Product teams");
  assert.equal(draft.destination_url, "https://network.example/profile");
  app.command("promotion.approve", {
    id,
    expected_version: saved.version,
    destination: "sample_professional_network",
  });
  assert.equal(Object.keys(app.state.tables.publication_evidence).length, 0);
  const payload = {
    id,
    expected_version: app.state.tables.promotions[id].version,
    destination: "sample_professional_network",
    confirmed: true,
    publication_reference: "Owner-confirmed sample post",
    published_at: "2026-10-14T12:00:00+07:00",
    idempotency_key: "publish-once",
  };
  app.command("promotion.recordPublication", payload);
  app.command("promotion.recordPublication", payload);
  assert.equal(app.state.tables.promotions[id].status, "published_confirmed");
  const evidence = Object.values(app.state.tables.publication_evidence);
  assert.equal(evidence.length, 1);
  assert.equal(
    evidence[0].publication_reference,
    "Owner-confirmed sample post",
  );
  assert.equal(evidence[0].content_snapshot, draft.content);
  assert.equal(evidence[0].mode, "sample");
});

test("changed service claim blocks promotion approval and leaves the draft intact", () => {
  const app = harness();
  app.command("service.save", {
    id: "service_motion",
    expected_version: 1,
    values: { description: "Changed service description" },
  });
  app.command("promotion.approve", promotionInput(app.state), false);
  assert.equal(
    app.state.tables.promotions.promotion_launch_service.status,
    "draft",
  );
});

test("Promoter checkpoints use the deliberately selected service and channel", () => {
  const app = harness();
  const task = app.command("agent.start", {
    role_id: "promoter",
    intent: "draft_promotion",
    service_id: "service_discovery",
    destination: "sample_email_draft",
  });
  const duplicate = app.command("agent.start", {
    role_id: "promoter",
    intent: "draft_promotion",
    service_id: "service_discovery",
    destination: "sample_email_draft",
  });
  assert.equal(duplicate.id, task.id, "Equivalent active task must be reused");
  for (let i = 0; i < 3; i++)
    app.command("agent.control", {
      id: task.id,
      expected_version: app.state.tables.agent_runs[task.id!].version,
      action: "checkpoint",
    });
  const promotion = Object.values(app.state.tables.promotions).find(
    (x) => x.service_id === "service_discovery",
  );
  assert.ok(promotion);
  const version =
    app.state.tables.promotion_versions[s(promotion.current_version_id)];
  assert.equal(version.destination, "sample_email_draft");
  assert.match(s(version.content), /Discovery/i);
});

test("unknown record IDs fail closed without falling back to the sample lead or offer", () => {
  const app = harness(),
    before = structuredClone(app.state.tables.offers.offer_northstar);
  app.command(
    "offer.approve",
    { id: "offer_missing", expected_version: 1 },
    false,
  );
  app.command(
    "opportunity.decline",
    { id: "lead_missing", expected_version: 1 },
    false,
  );
  assert.deepEqual(app.state.tables.offers.offer_northstar, before);
});

test("changing recipient requires fresh approval and then shares using only the latest approval", () => {
  const app = harness();
  app.state.tables.contacts.contact_secondary = {
    ...app.state.tables.contacts.contact_emma,
    id: "contact_secondary",
    email: "second@northstar.example",
  };
  app.command("offer.approve", offerInput(app.state));
  app.command(
    "offer.share",
    offerInput(app.state, {
      destination_contact_id: "contact_secondary",
      channel: "sample_link",
    }),
    false,
  );
  app.command(
    "offer.approve",
    offerInput(app.state, { destination_contact_id: "contact_secondary" }),
  );
  app.command(
    "offer.share",
    offerInput(app.state, {
      destination_contact_id: "contact_secondary",
      channel: "sample_link",
    }),
  );
  const shares = Object.values(app.state.tables.share_records);
  assert.equal(shares.length, 1);
  assert.equal(shares[0].contact_id, "contact_secondary");
});

test("an offer cannot pair one client with a different client’s opportunity", () => {
  const app = harness();
  app.command(
    "offer.saveDraft",
    {
      values: {
        client_id: "client_lumen",
        opportunity_id: "opportunity_northstar",
        title: "Mismatched context",
        deliverables: [{ key: "one", label: "A summary", quantity: 1 }],
        price: null,
        terms: null,
      },
    },
    false,
  );
});

test("a new promotional revision preserves the exact previously published snapshot", () => {
  const app = harness();
  app.command("promotion.approve", promotionInput(app.state));
  app.command(
    "promotion.recordPublication",
    promotionInput(app.state, { confirmed: true }),
  );
  const published = structuredClone(
    app.state.tables.promotion_versions.promotion_launch_service_v1,
  );
  app.command("promotion.saveDraft", {
    id: "promotion_launch_service",
    expected_version:
      app.state.tables.promotions.promotion_launch_service.version,
    values: {
      service_id: "service_motion",
      content: "A fresh service message.",
      destination: "sample_public_profile",
      public_claim_refs: [
        { table: "services", id: "service_motion", version: 1 },
      ],
    },
  });
  assert.deepEqual(
    app.state.tables.promotion_versions.promotion_launch_service_v1,
    published,
  );
  assert.equal(
    app.state.tables.promotions.promotion_launch_service.published_version_id,
    published.id,
  );
});

test("scope-only amendment updates the existing project once and preserves accepted history", () => {
  const app = harness();
  const engagement = Object.values(app.state.tables.engagements).find(
    (x) => x.offer_id === "offer_northstar",
  )!;
  const buyer = {
    actor: "buyer",
    grant_id: engagement.buyer_grant_id,
    engagement_id: engagement.id,
    confirmed: true,
  };
  app.command("offer.approve", offerInput(app.state));
  app.command("offer.share", offerInput(app.state, { channel: "sample_link" }));
  const accepted = app.command("offer.accept", offerInput(app.state, buyer));
  const originalVersion = structuredClone(
    app.state.tables.offer_versions.offer_northstar_v1,
  );
  const originalInvoices = structuredClone(app.state.tables.invoices);
  const originalReservations = structuredClone(app.state.tables.reservations);
  const originalAcceptances = structuredClone(app.state.tables.acceptances);
  app.command("offer.amend", {
    id: "offer_northstar",
    expected_version: app.state.tables.offers.offer_northstar.version,
    values: {
      ...originalVersion,
      client_id: "client_northstar",
      opportunity_id: "opportunity_northstar",
      title: "Two hero animations — clarified scope",
      amendment_reason:
        "Clarify the launch focus without changing price or timing.",
    },
  });
  app.command("offer.requestReview", offerInput(app.state));
  app.command("offer.approve", offerInput(app.state));
  app.command("offer.share", offerInput(app.state, { channel: "sample_link" }));
  const payload = offerInput(app.state, {
    ...buyer,
    idempotency_key: "accept-scope-amendment",
  });
  const amended = app.command("offer.accept", payload);
  app.command("offer.accept", payload);
  assert.equal(amended.id, accepted.id);
  assert.equal(Object.keys(app.state.tables.projects).length, 1);
  assert.deepEqual(app.state.tables.invoices, originalInvoices);
  assert.deepEqual(app.state.tables.reservations, originalReservations);
  assert.deepEqual(
    app.state.tables.offer_versions.offer_northstar_v1,
    originalVersion,
  );
  for (const [id, value] of Object.entries(originalAcceptances))
    assert.deepEqual(app.state.tables.acceptances[id], value);
  assert.equal(Object.keys(app.state.tables.acceptances).length, 2);
});
