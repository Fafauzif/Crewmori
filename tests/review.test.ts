import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute } from "../src/lib/engine";
import { buyerPortal } from "../src/lib/projections";
import type { Input, StoreState } from "../src/lib/types";

const scope = {
  grant_id: "grant_northstar",
  engagement_id: "engagement_northstar",
};
function successful(state: StoreState, type: string, input: Input) {
  const out = execute(state, type, input);
  assert.equal(out.result.ok, true, `${type}: ${out.result.message}`);
  return out.state;
}

test("review: generic project edits cannot bypass delivery acceptance or accepted client identity", () => {
  const state = createState("active_paid_project"),
    p = state.tables.projects.project_northstar;
  for (const values of [
    { state: "completed" },
    { client_id: "client_lumen" },
  ]) {
    const out = execute(state, "record.save", {
      table: "projects",
      id: p.id,
      expected_version: p.version,
      values,
    });
    assert.equal(
      out.result.ok,
      false,
      "A generic operational editor must reject lifecycle or accepted client changes",
    );
    assert.equal(
      out.state,
      state,
      "Rejected changes preserve the entire original snapshot",
    );
  }
});

test("review: generic message edits cannot create a sent buyer-visible message", () => {
  const state = createState();
  const out = execute(state, "record.save", {
    table: "messages",
    values: {
      conversation_id: "conversation_northstar",
      content: "Unreviewed message",
      delivery_state: "sample_sent",
      shared_with_buyer: true,
    },
  });
  assert.equal(
    out.result.ok,
    false,
    "Sending must require the exact reviewed message command",
  );
});

test("review: buyer cannot submit another client attachment that has no project ID", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.attachment_other_client = {
    id: "attachment_other_client",
    version: 1,
    client_id: "client_lumen",
    conversation_id: "conversation_lumen",
    name: "PRIVATE_OTHER_CLIENT_042",
    availability: "available",
    storage_kind: "local_blob",
    storage_locator: "foreign-bytes",
    shared_with_buyer: true,
    media_type: "text/plain",
    byte_length: 12,
  };
  const out = execute(state, "project.provideInput", {
    id: "input_northstar_brand",
    answer: "Use this file",
    attachment_ids: ["attachment_other_client"],
    ...scope,
  });
  assert.equal(
    out.result.ok,
    false,
    "Missing project_id is not authorization for a foreign-client attachment",
  );
  assert.equal(out.state, state);
});

test("review: buyer file attach cannot overwrite an existing foreign attachment ID", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.attachment_other_client = {
    id: "attachment_other_client",
    version: 3,
    client_id: "client_lumen",
    project_id: "project_lumen",
    name: "Other client original",
    availability: "available",
    storage_kind: "local_blob",
    storage_locator: "original-bytes",
    shared_with_buyer: false,
    media_type: "text/plain",
    byte_length: 12,
  };
  const out = execute(state, "file.attach", {
    id: "attachment_other_client",
    values: {
      project_id: "project_northstar",
      name: "Overwrite attempt",
      media_type: "text/plain",
      byte_length: 12,
      storage_kind: "local_blob",
      storage_locator: "replacement-bytes",
    },
    ...scope,
  });
  assert.equal(
    out.result.ok,
    false,
    "A new upload cannot replace another client’s file using a caller-chosen ID",
  );
  assert.equal(out.state, state);
});

test("review: buyer portal file projection rejects foreign membership even with corrupted references", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.attachment_other_client = {
    id: "attachment_other_client",
    version: 1,
    client_id: "client_lumen",
    conversation_id: "conversation_lumen",
    name: "PRIVATE_OTHER_CLIENT_042",
    availability: "available",
    storage_kind: "local_blob",
    storage_locator: "foreign-bytes",
    shared_with_buyer: true,
    media_type: "text/plain",
    byte_length: 12,
  };
  state.tables.projects.project_northstar.shared_attachment_ids = [
    "attachment_other_client",
  ];
  const portal = buyerPortal(state, "engagement_northstar", "grant_northstar");
  assert(portal);
  assert.equal(
    JSON.stringify(portal).includes("PRIVATE_OTHER_CLIENT_042"),
    false,
    "A stale/bad relation must not expose another engagement’s file",
  );
  assert.equal(JSON.stringify(portal).includes("foreign-bytes"), false);
});

test("review: later financial correction preserves cancelled project lifecycle", () => {
  let state = createState("active_paid_project");
  state = successful(state, "project.cancel", {
    id: "project_northstar",
    expected_version: state.tables.projects.project_northstar.version,
    reason: "Owner and client agreed to stop the remaining work.",
  });
  const allocation = Object.values(state.tables.allocations)[0];
  assert(allocation);
  state = successful(state, "finance.reverseAllocation", {
    id: allocation.id,
    expected_version: allocation.version,
    reason: "Correcting a sample allocation reference",
  });
  assert.equal(
    state.tables.projects.project_northstar.state,
    "cancelled",
    "Reconciliation cannot revive or reschedule a cancelled project",
  );
  assert.equal(
    state.tables.reservations.reservation_northstar.state,
    "released",
  );
});

test("review: archiving an active project is denied and restoring recovers terminal state", () => {
  let state = createState("active_paid_project");
  const denied = execute(state, "record.archive", {
    table: "projects",
    id: "project_northstar",
    expected_version: 1,
    archived: true,
  });
  assert.equal(
    denied.result.ok,
    false,
    "Generic archive must respect project lifecycle eligibility",
  );
  state = successful(state, "project.cancel", {
    id: "project_northstar",
    reason: "Scope cancelled by mutual agreement.",
  });
  state = successful(state, "project.archive", {
    id: "project_northstar",
    expected_version: state.tables.projects.project_northstar.version,
  });
  assert.equal(state.tables.projects.project_northstar.state, "archived");
  state = successful(state, "record.archive", {
    table: "projects",
    id: "project_northstar",
    expected_version: state.tables.projects.project_northstar.version,
    archived: false,
  });
  assert.equal(
    state.tables.projects.project_northstar.state,
    "cancelled",
    "Restore means prior terminal lifecycle, not reopen as active",
  );
});

test("review: bulk task completion is atomic when one captured version is stale", () => {
  const state = createState("active_paid_project");
  state.tables.work_tasks.other_task = {
    id: "other_task",
    version: 2,
    project_id: "project_northstar",
    title: "Prepare handoff checklist",
    task_kind: "administrative",
    assignee_kind: "agent",
    assignee_id: "operations",
    state: "not_started",
  };
  const out = execute(state, "task.completeMany", {
    ids: ["task_northstar_first_cut", "other_task"],
    expected_versions: { task_northstar_first_cut: 1, other_task: 1 },
  });
  assert.equal(out.result.ok, false);
  assert.equal(out.state, state);
  assert.equal(
    out.state.tables.work_tasks.task_northstar_first_cut.state,
    "in_progress",
  );
});

test("review: buyer role marker without an actual grant cannot upload", () => {
  const state = createState("active_paid_project");
  const out = execute(state, "file.attach", {
    actor: "buyer",
    values: {
      name: "No grant",
      project_id: "project_northstar",
      media_type: "text/plain",
      byte_length: 4,
      storage_kind: "local_blob",
      storage_locator: "bytes",
    },
  });
  assert.equal(
    out.result.ok,
    false,
    "Role text alone does not authorize a buyer command",
  );
  assert.equal(out.state, state);
});

test("review: owner draft cannot attach an unrelated client file to a conversation", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.foreign_message_file = {
    id: "foreign_message_file",
    version: 1,
    name: "Other client private file",
    client_id: "client_lumen",
    conversation_id: "conversation_lumen",
    availability: "available",
    shared_with_buyer: false,
    media_type: "text/plain",
    storage_kind: "local_blob",
    storage_locator: "foreign-secret",
    byte_length: 12,
  };
  const out = execute(state, "message.saveDraft", {
    conversation_id: "conversation_northstar",
    subject: "Project handoff",
    content: "Please review these files",
    attachment_ids: ["foreign_message_file"],
    destination_contact_id: "contact_emma",
  });
  assert.equal(
    out.result.ok,
    false,
    "An exact send review must not quietly authorize a foreign-client attachment",
  );
  assert.equal(out.state, state);
});

test("review: delivery cannot claim or expose another client's unassigned attachment", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.attachment_foreign_delivery = {
    id: "attachment_foreign_delivery",
    version: 1,
    client_id: "client_lumen",
    conversation_id: "conversation_lumen",
    name: "Other client private work",
    availability: "available",
    audience: "owner",
    shared_with_buyer: false,
    storage_kind: "local_blob",
    storage_locator: "foreign-original",
    media_type: "text/plain",
  };
  const project = state.tables.projects.project_northstar;
  const out = execute(state, "project.reportDelivery", {
    id: project.id,
    expected_version: project.version,
    attachment_ids: ["attachment_foreign_delivery"],
    message: "The delivery is ready.",
  });
  assert.equal(
    out.result.ok,
    false,
    "Delivery files must belong to the exact project and permitted audience",
  );
  assert.equal(
    out.state,
    state,
    "Rejected delivery keeps attachment ownership, drafts and project unchanged",
  );
});

test("review: reported delivery saves a draft and leaves sending and buyer acceptance separate", () => {
  const state = createState("active_paid_project");
  const project = state.tables.projects.project_northstar;
  const out = execute(state, "project.reportDelivery", {
    id: project.id,
    expected_version: project.version,
    attachment_ids: [],
    message: "Please review the agreed delivery in the project portal.",
  });
  assert.equal(out.result.ok, true, out.result.message);
  const updated = out.state.tables.projects[project.id];
  const draft = out.state.tables.messages[String(updated.delivery_message_id)];
  assert.ok(
    draft,
    "Professional delivery creates a retained communication draft",
  );
  assert.equal(draft.delivery_state, "draft");
  assert.equal(draft.shared_with_buyer, false);
  assert.equal(updated.professional_delivery_state, "owner_reported_delivered");
  assert.notEqual(updated.professional_delivery_state, "buyer_accepted");
});
