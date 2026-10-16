import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute } from "../src/lib/engine";
import { recordHref, eventHref } from "../src/views/home-team";
import { s, type Entity, type Input } from "../src/lib/types";

test("record links fail closed for missing and unrelated records", () => {
  const state = createState();
  for (const [table, id] of [
    ["assessments", "missing"],
    ["assessments", ""],
    ["offers", "opportunity_northstar"],
    ["artifacts", "unknown"],
  ])
    assert.ok(recordHref(table, id, state).startsWith("/app/unavailable"));
  assert.equal(
    recordHref("assessments", "assessment_scout_northstar", state),
    "/app/opportunities/opportunity_northstar?panel=assessment",
  );
  assert.equal(
    recordHref("sources", "source_northstar_request", state),
    "/app/settings/knowledge?source=source_northstar_request",
  );
  const promotion = state.tables.promotions.promotion_launch_service;
  assert.equal(
    recordHref("promotion_versions", s(promotion.current_version_id), state),
    "/app/promotion?draft=" + promotion.id,
  );
});

test("saved notifications infer real table references and retain event context when no target exists", () => {
  const state = createState(),
    base = { id: "event_test", version: 1 } as Entity;
  assert.equal(
    eventHref({ ...base, record_refs: [{ id: "offer_northstar" }] }, state),
    "/app/offers/offer_northstar",
  );
  assert.equal(
    eventHref({ ...base, record_refs: [] }, state),
    "/app/team/activity?event=event_test",
  );
  assert.equal(
    eventHref(
      { ...base, record_refs: [{ id: "missing", table: "assessments" }] },
      state,
    ),
    "/app/team/activity?event=event_test",
  );
  assert.equal(
    eventHref({ ...base, run_id: "run_scout_northstar" }, state),
    "/app/team?task=run_scout_northstar",
  );
});

test("client message artifacts open their exact saved draft in the correct client workspace", () => {
  let state = createState();
  const result = execute(state, "message.saveDraft", {
    conversation_id: "conversation_northstar",
    client_id: "client_northstar",
    content: "Please confirm the launch copy.",
    destination_contact_id: "contact_emma",
  });
  assert.equal(result.result.ok, true, result.result.message);
  state = result.state;
  assert.equal(
    recordHref("messages", result.result.id!, state),
    "/app/clients/client_northstar?tab=messages&draft=" + result.result.id,
  );
});

for (const [role, intent] of [
  ["scout", "assess_opportunity"],
  ["sales", "draft_offer"],
  ["promoter", "draft_promotion"],
  ["account_manager", "draft_followup"],
  ["operations", "plan_project"],
  ["finance", "inspect_invoice"],
])
  test(`delegate ${intent} uses working canonical controls and saves a navigable artifact`, () => {
    let state = createState();
    const call = (type: string, input: Input) => {
      const out = execute(state, type, input);
      assert.equal(out.result.ok, true, out.result.message);
      state = out.state;
      return out.result;
    };
    const service = Object.values(state.tables.services).find(
      (x) => x.published === true,
    )!;
    const started = call("agent.start", {
      role_id: role,
      intent,
      opportunity_id: "opportunity_northstar",
      service_id: role === "promoter" ? service.id : undefined,
      source_ids: ["source_northstar_request"],
      input_refs: [
        { table: "sources", id: "source_northstar_request", version: 1 },
      ],
    });
    for (let checkpoint = 0; checkpoint < 3; checkpoint++) {
      const run = state.tables.agent_runs[started.id!];
      call("agent.control", {
        id: run.id,
        action: "checkpoint",
        control_version: run.control_version,
        expected_version: run.version,
      });
    }
    const run = state.tables.agent_runs[started.id!];
    assert.ok(["completed", "waiting_approval"].includes(s(run.status)));
    assert.deepEqual(run.source_ids, ["source_northstar_request"]);
    const ids = run.output_artifact_ids as string[];
    assert.equal(ids.length, 1);
    const artifact = state.tables.artifacts[ids[0]],
      ref = artifact.record_ref as { table: string; id: string };
    assert.ok(
      !recordHref(ref.table, ref.id, state).startsWith("/app/unavailable"),
    );
  });

test("unsupported delegation clarification changes to the matching role and rejects stale controls", () => {
  let state = createState();
  let out = execute(state, "agent.start", {
    role_id: "auto",
    intent: "Please help me decide what comes next",
    opportunity_id: "opportunity_northstar",
  });
  assert.equal(out.result.ok, true);
  state = out.state;
  const id = out.result.id!,
    run = state.tables.agent_runs[id];
  assert.equal(run.status, "waiting_input");
  out = execute(state, "agent.control", {
    id,
    action: "clarify",
    intent: "draft_promotion",
    expected_version: run.version,
    control_version: run.control_version,
  });
  assert.equal(out.result.ok, true, out.result.message);
  state = out.state;
  assert.equal(state.tables.agent_runs[id].role_id, "promoter");
  assert.equal(state.tables.agent_runs[id].status, "queued");
  const stale = execute(state, "agent.control", {
    id,
    action: "checkpoint",
    expected_version: run.version,
    control_version: run.control_version,
  });
  assert.equal(stale.result.ok, false);
  assert.equal(stale.state, state);
});
