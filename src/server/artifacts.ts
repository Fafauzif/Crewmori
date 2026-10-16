import { z } from "zod";
import type { OwnerActor } from "./contracts";
import { artifactSchema, referenceSchema } from "./contracts";
import { execute } from "../lib/engine";
import { a, n, s, type Result } from "../lib/types";
import { transaction } from "./db";
import { assertService } from "./errors";
import { appendEvent, lockWorkspace, previousCommand, saveCommand } from "./repository";
import { resolveReferences } from "./tasks";
import { loadDomain, persistDomain } from "./domain-state";

export const applyArtifactSchema = z.object({ expectedVersion: z.number().int().positive(), idempotencyKey: z.uuid(), confirmed: z.literal(true) }).strict();
export async function applyArtifact(actor: OwnerActor, runId: string, raw: unknown) {
  const input = applyArtifactSchema.parse(raw);
  return transaction(async (client) => {
    await lockWorkspace(client, actor);
    const prior = await previousCommand(client, actor, "artifact.apply", input.idempotencyKey, { runId, ...input });
    if (prior) return { result: { ...prior, replayed: true } as Result };
    const run = (await client.query("select * from crewmori.agent_runs where workspace_id=$1 and id=$2 for update", [actor.workspaceId, runId])).rows[0];
    assertService(run?.state === "completed" && run.control_version === input.expectedVersion && run.artifact, "ARTIFACT_UNAVAILABLE", "This completed artifact changed or is unavailable.", 409);
    if (run.applied_at) return { result: { ...run.applied_result, replayed: true } as Result };
    const refs = z.array(referenceSchema).parse(run.input_refs);
    await resolveReferences(client, actor.workspaceId, refs, run.role === "promoter");
    const artifact = artifactSchema.parse(run.artifact), before = await loadDomain(client, actor.workspaceId);
    let after = structuredClone(before), result: Result;
    const opportunity = refs.filter((r) => r.table === "opportunities").map((r) => before.tables.opportunities?.[r.id])[0];
    const requirements = opportunity ? before.tables.requirements?.[s(opportunity.requirements_id)] : undefined;
    const policy = before.tables.policies?.policy_business;
    const record = (table: string, id: string, data: Record<string, unknown>) => {
      const previous = after.tables[table]?.[id];
      (after.tables[table] ||= {})[id] = { ...previous, ...data, id, version: n(previous?.version) + 1, workspace_id: actor.workspaceId, updated_at: after.sample_clock };
      return id;
    };
    if (["scout", "operations", "finance"].includes(run.role) && opportunity && requirements && policy) {
      assertService(refs.some((r) => r.table === "requirements" && r.id === requirements.id && r.version === requirements.version) && refs.some((r) => r.table === "policies" && r.id === policy.id && r.version === policy.version), "CONTEXT_MISSING", "Run this assessment with the current brief and policy.", 409);
      const id = record("assessments", `assessment_${run.role}_${opportunity.id}`, { role_id: run.role, opportunity_id: opportunity.id, requirements_version: requirements.version, policy_version: policy.version, status: "current", summary: artifact.summary, factual_findings: artifact.facts.map((fact) => fact.text), source_ids: artifact.facts.map((fact) => fact.sourceId), assumptions: [], unknowns: artifact.unknowns, recommendations: artifact.recommendations, reviewed_by: actor.userId, run_id: run.id });
      result = { ok: true, id, message: "Reviewed assessment saved.", ids: { table: "assessments", opportunity_id: opportunity.id } };
    } else if (run.role === "sales" && opportunity && requirements && policy) {
      const existing = Object.values(before.tables.offers || {}).find((offer) => offer.opportunity_id === opportunity.id);
      assertService(!existing || !["accepted", "shared", "approved"].includes(s(existing.status)), "EXISTING_AGREEMENT", "Use the explicit amendment workflow for existing commercial terms.", 409);
      const execution = execute(before, "offer.saveDraft", { id: existing?.id, idempotency_key: input.idempotencyKey, values: { client_id: opportunity.client_id, opportunity_id: opportunity.id, title: artifact.title, deliverables: a<string>(requirements.deliverables).map((label, index) => ({ key: `item_${index + 1}`, label, quantity: 1 })), price: requirements.budget || null, buyer_note: artifact.summary, internal_notes: artifact.unknowns.join("\n"), estimated_effort_minutes: 0, terms: { delivery_business_days: n(requirements.delivery_business_days, 5), deposit_basis_points: policy.deposit_basis_points, reservation_hours: policy.reservation_hours, start_basis: "next_business_day_after_confirmed_deposit_and_required_inputs", timezone: s(policy.timezone, "Asia/Jakarta"), workdays: policy.business_weekdays, holidays: policy.holiday_dates, start_local_time: policy.start_local_time, due_local_time: policy.due_local_time, required_input_keys: policy.required_input_keys, acceptance_disclosure: "Acceptance provisionally reserves capacity. A confirmed deposit and complete required inputs are needed before work starts. Late prerequisites require an agreed reschedule." } } });
      assertService(execution.result.ok, execution.result.code || "DRAFT_FAILED", execution.result.message, 422);
      after = execution.state; result = { ...execution.result, ids: { table: "offers" }, message: "Offer draft saved. Review its scope, price and effort before requesting approval." };
    } else if (run.role === "account_manager") {
      const projectRef = refs.find((r) => r.table === "projects"), clientRef = refs.find((r) => r.table === "clients");
      const engagement = Object.values(before.tables.engagements || {}).find((e) => (opportunity && e.opportunity_id === opportunity.id) || (projectRef && e.project_id === projectRef.id) || (clientRef && e.client_id === clientRef.id));
      assertService(engagement, "CONTEXT_MISSING", "Select a client engagement before drafting a follow-up.", 422);
      const execution = execute(before, "message.saveDraft", { conversation_id: engagement.conversation_id, subject: artifact.title, content: artifact.summary, idempotency_key: input.idempotencyKey });
      assertService(execution.result.ok, "DRAFT_FAILED", execution.result.message, 422);
      after = execution.state; result = { ...execution.result, ids: { table: "messages", client_id: s(engagement.client_id) } };
    } else if (run.role === "promoter") {
      const service = refs.find((r) => r.table === "services");
      assertService(service, "CONTEXT_MISSING", "Select a published service before drafting promotion.", 422);
      const execution = execute(before, "promotion.saveDraft", { idempotency_key: input.idempotencyKey, values: { service_id: service.id, content: artifact.summary, source_ids: refs.map((r) => r.id), public_claim_refs: refs.map((r) => ({ table: r.table, id: r.id, version: r.version })), target_audience: "Review before publication", destination: "manual_publication" } });
      assertService(execution.result.ok, "DRAFT_FAILED", execution.result.message, 422);
      after = execution.state; result = { ...execution.result, ids: { table: "promotions" } };
    } else {
      const id = record("team_notes", `note_${run.id}`, { title: artifact.title, content: artifact.summary, unknowns: artifact.unknowns, recommendations: artifact.recommendations, run_id: run.id, reviewed_by: actor.userId });
      result = { ok: true, id, message: "Reviewed team note saved.", ids: { table: "team_notes" } };
    }
    await persistDomain(client, before, after, actor.workspaceId);
    await client.query("update crewmori.agent_runs set applied_at=now(),applied_result=$3 where workspace_id=$1 and id=$2", [actor.workspaceId, runId, JSON.stringify(result)]);
    await appendEvent(client, actor.workspaceId, "artifact.applied", "The owner reviewed an AI artifact and saved its business draft.", [{ table: result.ids?.table, id: result.id }]);
    await saveCommand(client, actor, "artifact.apply", input.idempotencyKey, { runId, ...input }, result);
    return { result };
  });
}
