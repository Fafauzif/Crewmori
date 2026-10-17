import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute } from "../src/lib/engine";
import { buyerPortal } from "../src/lib/projections";
import { calendarOverlapFingerprint } from "../src/lib/work-commands";
import type { Input, StoreState } from "../src/lib/types";

const task = (extra: Input = {}) => ({ project_id: "project_northstar", title: "Prepare the analysis", notes: "Use the agreed source data.", kind: "professional", assignee_id: "owner_alya", due_at: "2026-10-20T17:00:00+07:00", milestone_id: null, shared_with_buyer: false, ...extra });
const milestone = (extra: Input = {}) => ({ project_id: "project_northstar", title: "First review", notes: "", due_at: "2026-10-20T17:00:00+07:00", task_ids: ["task_northstar_first_cut"], ...extra });
function success(state: StoreState, type: string, input: Input) {
  const out = execute(state, type, input);
  assert.equal(out.result.ok, true, out.result.message);
  return out;
}

test("work: owner identity and dedicated task fields save without manufacturing delivery state", () => {
  let state = createState("active_paid_project");
  state.tables.owners = { rani: { id: "rani", version: 1, display_name: "Rani" } };
  const saved = success(state, "task.save", { values: task({ assignee_id: "rani", shared_with_buyer: true }), idempotency_key: "create-task" });
  const id = saved.result.id!;
  assert.equal(saved.state.tables.work_tasks[id].assignee_kind, "owner");
  assert.equal(saved.state.tables.work_tasks[id].audience, "buyer");
  assert.equal(saved.state.tables.work_tasks[id].state, "not_started");
  state = saved.state;
  const edited = success(state, "task.save", { id, expected_version: 1, values: task({ assignee_id: "operations", kind: "administrative", title: "Prepare a reminder" }) });
  assert.equal(edited.state.tables.work_tasks[id].assignee_kind, "agent");
  assert.equal(edited.state.tables.projects.project_northstar.professional_delivery_state, "in_progress");
  assert.ok((edited.state.tables.projects.project_northstar.work_task_ids as string[]).includes(id));
  const replay = success(state, "task.save", { values: task({ assignee_id: "rani", shared_with_buyer: true }), idempotency_key: "create-task" });
  assert.equal(replay.result.replayed, true);
  assert.equal(replay.result.id, id);
});

test("work: task save rejects stale edits, foreign relationships and authority fields atomically", () => {
  const state = createState("active_paid_project");
  for (const input of [
    { values: task({ kind: "professional", assignee_id: "operations" }) },
    { values: task({ state: "completed" }) },
    { values: task({ assignee_kind: "owner" }) },
    { id: "task_northstar_first_cut", expected_version: 0, values: task() },
    { id: "task_northstar_first_cut", values: task() },
    { values: task({ milestone_id: "missing-milestone" }) },
  ]) {
    const out = execute(state, "task.save", input);
    assert.equal(out.result.ok, false, JSON.stringify(input));
    assert.equal(out.state, state);
  }
  state.tables.milestones.foreign = { id: "foreign", version: 1, project_id: "another-project" };
  assert.equal(execute(state, "task.save", { values: task({ milestone_id: "foreign" }) }).result.ok, false);
});

test("work: milestone and all assignments commit together, conflict rolls everything back", () => {
  const state = createState("active_paid_project");
  state.tables.work_tasks.second = { id: "second", version: 2, project_id: "project_northstar", state: "not_started" };
  const bad = execute(state, "milestone.save", { values: milestone({ task_ids: ["task_northstar_first_cut", "second"] }), expected_task_versions: { task_northstar_first_cut: 1, second: 1 } });
  assert.equal(bad.result.code, "STALE_VERSION");
  assert.equal(bad.state, state);
  assert.equal(Object.keys(bad.state.tables.milestones).length, 1);
  const saved = success(state, "milestone.save", { values: milestone({ task_ids: ["task_northstar_first_cut", "second"] }), expected_task_versions: { task_northstar_first_cut: 1, second: 2 } });
  const id = saved.result.id!;
  assert.equal(saved.state.tables.work_tasks.second.milestone_id, id);
  assert.equal(saved.state.tables.work_tasks.task_northstar_first_cut.milestone_id, id);
  const changed = success(saved.state, "milestone.save", { id, expected_version: 1, values: milestone({ task_ids: ["second"] }), expected_task_versions: { task_northstar_first_cut: 2, second: 3 } });
  assert.equal(changed.state.tables.work_tasks.task_northstar_first_cut.milestone_id, null);
  assert.equal(changed.state.tables.work_tasks.second.milestone_id, id);
});

test("work: an agreed milestone accepts only a nonbinding change note until reviewed amendment", () => {
  const state = createState("active_paid_project");
  const input = { id: "milestone_northstar_delivery", expected_version: 1, values: milestone({ due_at: "2026-10-23T17:00:00+07:00", notes: "The source data arrives later." }) };
  const bad = execute(state, "milestone.save", input);
  assert.equal(bad.result.code, "AMENDMENT_REQUIRED");
  assert.equal(bad.state, state);
  const proposal = success(state, "milestone.proposeChange", input);
  assert.equal(proposal.state.tables.milestones.milestone_northstar_delivery.due_at, state.tables.projects.project_northstar.committed_due_at);
  assert.equal(proposal.state.tables.projects.project_northstar.committed_due_at, state.tables.projects.project_northstar.committed_due_at);
  assert.equal(proposal.state.tables.change_requests[proposal.result.id!].state, "draft");
});

test("work: physical files and external references share only through exact project membership", () => {
  const state = createState("active_paid_project");
  const values = { project_id: "project_northstar", client_id: "client_northstar", name: "Research notes", storage_locator: "https://example.com/notes", shared_with_buyer: true };
  const linked = success(state, "file.link", { values });
  const id = linked.result.id!;
  const portal = buyerPortal(linked.state, "engagement_northstar", "grant_northstar")!;
  assert.ok(portal.files.some((file) => file.id === id && file.storage_kind === "external_link"));
  const archived = success(linked.state, "file.archive", { id, expected_version: 1, archived: true });
  assert.ok(!buyerPortal(archived.state, "engagement_northstar", "grant_northstar")!.files.some((file) => file.id === id));
  const restored = success(archived.state, "file.archive", { id, expected_version: 2, archived: false });
  assert.ok(buyerPortal(restored.state, "engagement_northstar", "grant_northstar")!.files.some((file) => file.id === id));
  const physical = success(restored.state, "file.attach", { values: { ...values, name: "Input.txt", storage_locator: "uploaded-bytes", media_type: "text/plain", byte_length: 40, shared_with_buyer: false } });
  assert.ok(!buyerPortal(physical.state, "engagement_northstar", "grant_northstar")!.files.some((file) => file.id === physical.result.id));
  for (const invalid of [
    { ...values, storage_locator: "javascript:alert(1)" },
    { ...values, storage_locator: "https://name:password@example.com" },
    { ...values, client_id: "client_lumen" },
    { ...values, project_id: "unknown-project" },
    { ...values, audience: "public" },
  ]) {
    const rejected = execute(state, "file.link", { values: invalid });
    assert.equal(rejected.result.ok, false);
    assert.equal(rejected.state, state);
  }
});

test("work: buyer grants cannot invoke owner task/milestone/link commands", () => {
  const state = createState("active_paid_project");
  for (const type of ["task.save", "milestone.save", "milestone.proposeChange", "file.link", "file.archive"]) {
    assert.equal(execute(state, type, { grant_id: "grant_northstar", engagement_id: "engagement_northstar", values: task() }).result.ok, false);
  }
});

test("work: buyer sees only explicitly shared same-project task fields", () => {
  const state = createState("active_paid_project");
  state.tables.work_tasks = {
    shared: { id: "shared", version: 1, project_id: "project_northstar", shared_with_buyer: true, audience: "buyer", title: "Ready for review", notes: "A shared note", state: "in_progress", assignee_id: "private-owner-id", internal_reason: "PRIVATE_OWNER_REASON" },
    private: { id: "private", version: 1, project_id: "project_northstar", shared_with_buyer: false, audience: "owner", title: "PRIVATE_TASK" },
    foreign: { id: "foreign", version: 1, project_id: "project_lumen", shared_with_buyer: true, audience: "buyer", title: "FOREIGN_TASK" },
    ambiguous: { id: "ambiguous", version: 1, project_id: "project_northstar", shared_with_buyer: true, audience: "owner", title: "INCONSISTENT_SHARING" },
    archived: { id: "archived", version: 1, project_id: "project_northstar", shared_with_buyer: true, audience: "buyer", archived: true, title: "ARCHIVED_TASK" },
  };
  const portal = buyerPortal(state, "engagement_northstar", "grant_northstar")!;
  assert.equal(portal.tasks.length, 1);
  assert.equal(portal.tasks[0].notes, "A shared note");
  for (const privateValue of ["PRIVATE_TASK", "FOREIGN_TASK", "INCONSISTENT_SHARING", "ARCHIVED_TASK", "private-owner-id", "PRIVATE_OWNER_REASON"]) assert.ok(!JSON.stringify(portal.tasks).includes(privateValue));
});

test("work: overlap consent changes with every proposed context and conflicting version", () => {
  const proposal = { start: "2026-10-18T09:00", end: "2026-10-18T10:00", timezone: "Asia/Jakarta", project: "p1", contact: "c1", kind: "client_meeting" };
  const overlaps = [{ id: "event1", version: 1, starts_at: proposal.start, ends_at: proposal.end }];
  const first = calendarOverlapFingerprint(proposal, overlaps);
  for (const changed of [{ ...proposal, project: "p2" }, { ...proposal, contact: "c2" }, { ...proposal, timezone: "UTC" }, { ...proposal, end: "2026-10-18T11:00" }]) {
    assert.notEqual(calendarOverlapFingerprint(changed, overlaps), first);
  }
  assert.notEqual(calendarOverlapFingerprint(proposal, [{ ...overlaps[0], version: 2 }]), first);
  assert.notEqual(calendarOverlapFingerprint(proposal, [...overlaps, { ...overlaps[0], id: "event2" }]), first);
});

test("work: legacy generic paths cannot bypass reviewed milestone or task authority", () => {
  const state = createState("active_paid_project");
  for (const [type, input] of [
    ["record.save", { table: "milestones", id: "milestone_northstar_delivery", values: { due_at: "2030-01-01T00:00:00Z" } }],
    ["record.save", { table: "work_tasks", id: "task_northstar_first_cut", values: { project_id: "project_lumen", shared_with_buyer: true } }],
    ["record.archive", { table: "milestones", id: "milestone_northstar_delivery" }],
    ["project.updateTask", { id: "task_northstar_first_cut", expected_version: 1, values: { state: "in_progress", project_id: "project_lumen", audience: "buyer" } }],
  ] as Array<[string, Input]>) {
    const out = execute(state, type, input);
    assert.equal(out.result.ok, false);
    assert.equal(out.state, state);
  }
});

test("work: terminal projects and accepted professional work reject every task mutation path", () => {
  for (const lifecycle of ["completed", "cancelled", "archived"]) {
    const state = createState("active_paid_project");
    state.tables.projects.project_northstar.state = lifecycle;
    for (const type of ["task.complete", "task.reopen", "task.archive", "task.restore", "project.updateTask"]) {
      const out = execute(state, type, { id: "task_northstar_first_cut", expected_version: 1, values: { state: "in_progress" } });
      assert.equal(out.result.ok, false, `${lifecycle}: ${type}`);
      assert.equal(out.state, state);
    }
  }
  const accepted = createState("active_paid_project");
  accepted.tables.projects.project_northstar.professional_delivery_state = "buyer_accepted";
  assert.equal(execute(accepted, "task.save", { id: "task_northstar_first_cut", expected_version: 1, values: task() }).result.ok, false);
});

test("work: shared accepted bytes cannot be removed or overwritten by owner or buyer", () => {
  let state = createState("active_paid_project");
  const attached = success(state, "file.attach", { values: { project_id: "project_northstar", client_id: "client_northstar", name: "Delivered.txt", media_type: "text/plain", byte_length: 20, storage_locator: "original-bytes", shared_with_buyer: true } });
  state = attached.state;
  state.tables.projects.project_northstar.professional_delivery_state = "buyer_accepted";
  for (const actor of [{}, { grant_id: "grant_northstar", engagement_id: "engagement_northstar" }]) {
    for (const type of ["file.remove", "file.attach"]) {
      const out = execute(state, type, { ...actor, id: attached.result.id, expected_version: 1, values: { project_id: "project_northstar", name: "Replaced.txt", media_type: "text/plain", byte_length: 30, storage_locator: "new-bytes" } });
      assert.equal(out.result.ok, false, `${type}: ${JSON.stringify(actor)}`);
      assert.equal(out.state, state);
    }
    for (const alias of ["offer_id", "project_id", "run_id", "invoice_id", "payment_request_id", "issue_id", "input_id"]) {
      const removed = execute(state, "file.remove", { ...actor, [alias]: attached.result.id, expected_version: 1 });
      assert.equal(removed.result.ok, false, alias);
      assert.equal(removed.state, state);
    }
  }
});

test("work: a client-only file is not project membership even if a corrupt shared-ID list points to it", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.client_only = { id: "client_only", version: 1, client_id: "client_northstar", shared_with_buyer: true, audience: "buyer", name: "UNRELATED_CLIENT_FILE", availability: "available" };
  state.tables.projects.project_northstar.shared_attachment_ids = ["client_only"];
  assert.ok(!JSON.stringify(buyerPortal(state, "engagement_northstar", "grant_northstar")!.files).includes("UNRELATED_CLIENT_FILE"));
});

test("work: buyer cannot modify owner or unshared uploads and cannot forge uploader identity", () => {
  const state = createState("active_paid_project");
  state.tables.attachments.owner_file = { id: "owner_file", version: 1, project_id: "project_northstar", client_id: "client_northstar", name: "Owner file", storage_locator: "owner-bytes", availability: "available", uploaded_by_kind: "owner", shared_with_buyer: true, audience: "buyer" };
  const buyer = { grant_id: "grant_northstar", engagement_id: "engagement_northstar" };
  for (const type of ["file.remove", "file.attach"]) {
    const rejected = execute(state, type, { ...buyer, id: "owner_file", expected_version: 1, values: { project_id: "project_northstar", name: "Forged", storage_locator: "owner-bytes", media_type: "text/plain", byte_length: 20, uploaded_by_kind: "buyer", uploaded_by_engagement_id: "engagement_northstar" } });
    assert.equal(rejected.result.code, "NOT_AUTHORIZED");
    assert.equal(rejected.state, state);
  }
  const uploaded = success(state, "file.attach", { ...buyer, id: "buyer_new_file", values: { project_id: "project_northstar", name: "Buyer evidence", media_type: "text/plain", byte_length: 20, storage_locator: "buyer-bytes", uploaded_by_kind: "owner", uploaded_by_engagement_id: "someone-else" } });
  assert.equal(uploaded.state.tables.attachments.buyer_new_file.uploaded_by_kind, "buyer");
  assert.equal(uploaded.state.tables.attachments.buyer_new_file.uploaded_by_engagement_id, "engagement_northstar");
  const reconciled = success(uploaded.state, "file.attach", { ...buyer, id: "buyer_new_file", values: { project_id: "project_northstar", name: "Buyer evidence", media_type: "text/plain", byte_length: 20, storage_locator: "buyer-bytes" } });
  assert.equal(reconciled.result.replayed, true);
  assert.equal(reconciled.state.tables.attachments.buyer_new_file.version, 1);
  assert.equal(execute(uploaded.state, "file.remove", { ...buyer, id: "buyer_new_file" }).result.code, "STALE_VERSION");
  assert.equal(execute(uploaded.state, "file.attach", { ...buyer, id: "buyer_new_file", values: { project_id: "project_northstar", name: "Changed name", media_type: "text/plain", byte_length: 20, storage_locator: "buyer-bytes" } }).result.code, "STALE_VERSION");
  const removed = success(uploaded.state, "file.remove", { ...buyer, id: "buyer_new_file", expected_version: 1 });
  assert.equal(removed.state.tables.attachments.buyer_new_file.availability, "removed");
});

test("work: buyer uploads reject every conflicting secondary relation", () => {
  const state = createState("active_paid_project");
  const buyer = { grant_id: "grant_northstar", engagement_id: "engagement_northstar" };
  const values = { project_id: "project_northstar", name: "Buyer file", storage_locator: "new-bytes", media_type: "text/plain", byte_length: 20 };
  for (const key of ["client_id", "conversation_id", "engagement_id"]) {
    const rejected = execute(state, "file.attach", { ...buyer, values: { ...values, [key]: `foreign-${key}` } });
    assert.equal(rejected.result.code, "NOT_AUTHORIZED");
    assert.equal(rejected.state, state);
  }
});
