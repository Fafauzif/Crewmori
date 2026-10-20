import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { execute } from "../lib/engine";
import { publicProfile } from "../lib/projections";
import { o, s, type Input, type Result, type StoreState } from "../lib/types";
import type { Actor, OwnerActor, BuyerActor } from "./contracts";
import { transaction } from "./db";
import { assertService } from "./errors";
import { lockWorkspace, previousCommand, saveCommand, uuidOrNull } from "./repository";
import { enqueueKnowledge } from "./knowledge";
import { loadDomain, persistDomain, ownerProjection } from "./domain-state";

export const commandSchema = z.object({ type: z.string().min(1).max(80), input: z.record(z.string(), z.unknown()).default({}), idempotencyKey: z.uuid(), expectedRevision: z.number().int().nonnegative().optional() }).strict();
export const buyerCommands = new Set(["offer.accept", "offer.requestChanges", "conversation.send", "conversation.requestOwner", "inquiry.updateBrief", "project.provideInput", "project.acceptDelivery", "project.requestRevision", "file.attach", "file.remove"]);
const ownerCommands = new Set(`task.save milestone.save milestone.proposeChange calendar.proposeCancellation file.link file.archive record.save record.archive opportunity.save opportunity.create opportunity.import opportunity.update opportunity.qualify opportunity.decline opportunity.archive opportunity.restore offer.saveDraft offer.returnRevision offer.amend offer.requestReview offer.approve offer.share offer.withdraw finance.allocateReceipt finance.reverseAllocation finance.resolveIssue project.requestInputChanges project.proposeReschedule project.commitStart project.reschedule project.reportDelivery project.complete project.cancel project.archive project.reopen project.create project.update task.completeMany project.reviewInput project.updateTask task.complete task.reopen task.archive task.restore invoice.saveDraft invoice.save invoice.issue invoice.void expense.save expense.archive expense.correct client.save client.create client.update message.saveDraft message.approve message.deliver promotion.saveDraft promotion.approve promotion.recordPublication promotion.pause calendar.saveProposal calendar.approve profile.save policy.save preferences.save service.save profile.publish service.publish knowledge.save knowledge.remove file.attach file.remove settings.availability ui.set setup.saveStep setup.complete activity.markRead activity.catchUp source.refresh`.split(" "));
// Explicit editable fields prevent generic saves from manufacturing financial, approval or delivery authority.
const fields: Record<string, string[]> = {
  clients: ["name", "status", "next_action", "website", "industry", "archived"],
  messages: [],
  conversations: ["client_id", "buyer_contact_id", "status", "audience"],
  contacts: ["client_id", "display_name", "email", "role_label", "locale"],
  opportunities: ["client_id", "title", "status", "next_action", "source_ids", "requirements_id"],
  requirements: ["requested_scope", "requested_budget", "requested_delivery_business_days", "deliverables", "budget", "delivery_business_days", "unknowns", "source_ids", "desired_timing"],
  profiles: ["handle", "public_name", "headline", "biography", "public_availability", "location_label", "public_contact_email", "approved_service_ids", "approved_portfolio_ids"],
  owners: ["display_name", "profession", "locale", "handle"],
  services: ["profile_id", "title", "slug", "description", "deliverables", "pricing_label", "price", "archived", "category", "published", "audience"],
  portfolio_items: ["profile_id", "title", "summary", "asset_id", "claim_status", "archived"],
  policies: ["deposit_basis_points", "fee_basis_points", "fx_idr_per_usd", "upfront_cost_assumption", "available_effort_minutes", "business_weekdays", "holiday_dates", "start_local_time", "due_local_time", "reservation_hours", "require_deposit", "required_input_keys", "next_business_day_start", "minimum_hourly_rate", "timezone"],
  preferences: ["locale", "timezone", "motion", "focus_mode", "team_animation_paused", "notification_email", "notification_in_app", "last_seen_event_sequence", "recap_dismissed_sequence", "recap_enabled"],
  sources: ["title", "kind", "content", "summary", "url", "visibility", "published", "approved", "file_id", "attachment_id", "archived", "label", "audience", "visibility_approved_version", "visibility_reviewed", "status", "extraction_status", "processing_attempts"],
  projects: ["client_id", "title", "brief", "professional_delivery_state", "next_action"],
  calendar_events: ["project_id", "title", "description", "starts_at", "ends_at", "timezone", "attendee_contact_ids", "attendee_ids", "kind", "state", "external_invitation_state", "shared_with_buyer", "connection_id"],
  expenses: ["description", "amount", "incurred_at", "project_id", "category", "payment_state", "notes"],
  private_notes: ["client_id", "project_id", "content", "title"],
  editor_drafts: ["kind", "values", "subject_id", "subject_table", "state"],
  notification_states: ["event_id", "read", "dismissed", "state"],
  capability_preferences: ["role", "role_id", "max_concurrent", "allowed_connection_ids", "mandatory_external_approval", "enabled", "allow_internal", "stricter_review", "autonomy", "notify_on_completion"],
};
export async function lockActor(client: PoolClient, actor: Actor) {
  if (actor.kind === "owner") return lockWorkspace(client, actor);
  return verifyBuyer(client, actor, true);
}
// Reads verify the same authority without the workspace write lock, so polling never queues behind commands.
export async function checkActor(client: PoolClient, actor: Actor) {
  if (actor.kind === "buyer") return verifyBuyer(client, actor, false);
  const result = await client.query("select * from crewmori.workspaces where id=$1 and owner_id=$2", [actor.workspaceId, actor.userId]);
  assertService(result.rowCount, "WORKSPACE_NOT_FOUND", "This workspace is unavailable.", 404);
  return result.rows[0];
}
async function verifyBuyer(client: PoolClient, actor: BuyerActor, lock: boolean) {
  const workspace = (await client.query(`select * from crewmori.workspaces where id=$1${lock ? " for update" : ""}`, [actor.workspaceId])).rows[0];
  const grant = await client.query("select 1 from crewmori.buyer_grants where id=$1 and workspace_id=$2 and engagement_id=$3 and revoked_at is null and expires_at>now()", [actor.grantId, actor.workspaceId, actor.engagementId]);
  assertService(workspace && grant.rowCount, "UNAUTHENTICATED", "This buyer session expired or was revoked.", 401);
  return workspace;
}
export function bindBuyer(state: StoreState, actor: BuyerActor) {
  const engagement = state.tables.engagements?.[actor.engagementId];
  assertService(engagement, "NOT_FOUND", "This engagement is unavailable.", 404);
  // Relational session is authority. All relationships come from the server engagement.
  const id = actor.grantId;
  engagement.buyer_grant_id = id;
  (state.tables.buyer_grants ||= {})[id] = { id, version: 1, state: "active", expires_at: new Date(Date.now() + 60_000).toISOString(), engagement_id: engagement.id, contact_id: engagement.contact_id, conversation_id: engagement.conversation_id, offer_id: engagement.offer_id, project_id: engagement.project_id };
}
function validateCommand(type: string, input: Input, actor: Actor) {
  assertService((actor.kind === "owner" ? ownerCommands : buyerCommands).has(type), "COMMAND_NOT_ALLOWED", "This action is not available for this session.", 403);
  assertService(!["actor", "actor_id", "workspace_id"].some((key) => key in input), "INVALID_ACTOR", "Actor identity is managed by the server.", 422);
  if (actor.kind === "owner") assertService(!input.grant_id, "INVALID_ACTOR", "Use a buyer session for buyer decisions.", 403);
  const table = type === "record.save" || type === "record.archive" ? s(input.table) : ({ "profile.save": "profiles", "policy.save": "policies", "preferences.save": "preferences", "service.save": "services" } as Record<string, string>)[type];
  if (table) {
    assertService(fields[table], "COMMAND_NOT_ALLOWED", "Use the dedicated workflow for this record.", 422);
    for (const key of Object.keys(o(input.values))) assertService(fields[table].includes(key), "FIELD_NOT_EDITABLE", `${key} is managed by its dedicated workflow.`, 422);
  }
  assertService(type !== "offer.share" || [undefined, "sample_link", "link"].includes(input.channel as string | undefined), "DISPATCH_REQUIRED", "Share a secure buyer link or use approved email dispatch.", 422);
}
export async function syncPublication(client: PoolClient, state: StoreState, workspaceId: string) {
  const profile = Object.values(state.tables.profiles || {})[0];
  if (!profile) return;
  const snapshot = o(state.tables.publication_snapshots?.[`profiles_${profile.id}`]?.values);
  const handle = s(snapshot.handle, s(Object.values(state.tables.owners || {})[0]?.handle));
  if (snapshot.published !== true || !publicProfile(state, handle)) return;
  const occupied = await client.query("select 1 from crewmori.public_profiles where handle=$1 and workspace_id<>$2", [handle, workspaceId]);
  assertService(!occupied.rowCount, "HANDLE_TAKEN", "This public address is already in use.", 409);
  await client.query("insert into crewmori.public_profiles(handle,workspace_id,profile_id) values($1,$2,$3) on conflict(workspace_id) do update set handle=excluded.handle,profile_id=excluded.profile_id", [handle, workspaceId, profile.id]);
}
export async function runDomainCommand(actor: Actor, raw: unknown) {
  const command = commandSchema.parse(raw);
  validateCommand(command.type, command.input, actor);
  return transaction(async (client) => {
    const workspace = await lockActor(client, actor);
    const receiptActor: OwnerActor = { kind: "owner", workspaceId: actor.workspaceId, userId: actor.kind === "owner" ? actor.userId : actor.grantId };
    const prior = await previousCommand(client, receiptActor, command.type, command.idempotencyKey, command.input);
    if (prior) return { result: { ...prior, replayed: true } as Result };
    if (command.expectedRevision !== undefined) assertService(Number(workspace.revision) === command.expectedRevision, "STALE_VERSION", "The workspace changed. Refresh and review your draft before retrying.", 409);
    const before = await loadDomain(client, actor.workspaceId);
    if (actor.kind === "buyer") bindBuyer(before, actor);
    const input: Input = { ...command.input, idempotency_key: command.idempotencyKey, actor_id: receiptActor.userId };
    if (command.type === "knowledge.save") input.source = { ...o(input.source), audience: "owner", published: false, visibility_reviewed: false, visibility_approved_version: null };
    if (command.type === "source.refresh") {
      const source = before.tables.sources?.[s(command.input.id)];
      assertService(source, "NOT_FOUND", "This source is unavailable.", 404);
      await enqueueKnowledge(client, actor.workspaceId, source, true);
      const result: Result = { ok: true, id: source.id, message: "Source indexing queued." };
      await saveCommand(client, receiptActor, command.type, command.idempotencyKey, command.input, result);
      return { result };
    }
    if (command.type === "record.save" && "published" in o(input.values)) {
      const current = before.tables[s(input.table)]?.[s(input.id)];
      assertService(o(input.values).published === (current?.published || false), "PUBLICATION_REQUIRED", "Use the reviewed publication action.", 422);
    }
    if (command.type === "record.save" && s(input.table) === "sources" && o(input.values).audience === "public") {
      const source = before.tables.sources?.[s(input.id)];
      assertService(source && o(input.values).visibility_reviewed === true && o(input.values).visibility_approved_version === source.version && !source.connection_id && source.kind !== "sample_message", "PUBLICATION_REQUIRED", "Review the exact source content before sharing it publicly.", 422);
      assertService(Object.keys(o(input.values)).every((key) => ["audience", "visibility_reviewed", "visibility_approved_version"].includes(key)), "PUBLICATION_REQUIRED", "Save content changes before reviewing their public visibility.", 422);
      input.values = { ...o(input.values), published: true };
    }
    if (command.type === "record.save" && s(input.table) === "calendar_events") {
      const values = o(input.values), current = before.tables.calendar_events?.[s(input.id)];
      assertService(!values.state || ["scheduled", "proposed"].includes(s(values.state)) || values.state === current?.state, "INVALID_STATE", "Use the reviewed calendar workflow for this state.", 422);
      assertService(!values.external_invitation_state || values.external_invitation_state === "not_requested" || values.external_invitation_state === current?.external_invitation_state, "DISPATCH_REQUIRED", "Use approved invitation dispatch.", 422);
      assertService(!values.kind || !["committed_start", "committed_deadline", "provisional"].includes(s(values.kind)) || values.kind === current?.kind, "INVALID_STATE", "Agreement dates are managed by the project workflow.", 422);
    }
    if (command.type === "knowledge.save" && input.attachment) {
      const attachment = o(input.attachment), locator = s(attachment.content_ref, s(attachment.storage_locator));
      const file = (await client.query("select * from crewmori.files where workspace_id=$1 and id=$2::uuid and state='available'", [actor.workspaceId, uuidOrNull(locator)])).rows[0];
      assertService(file, "FILE_UNAVAILABLE", "Upload this source file before indexing it.", 422);
      input.attachment = { ...attachment, mime_type: file.mime_type, media_type: file.mime_type, byte_length: file.byte_size, size_bytes: file.byte_size, content_ref: file.id, storage_locator: file.id, sha256: file.sha256, audience: "owner", shared_with_buyer: false };
    }
    if (actor.kind === "buyer") Object.assign(input, { actor: "buyer", grant_id: actor.grantId, engagement_id: actor.engagementId });
    if (command.type === "offer.share") input.channel = "sample_link";
    if (command.type === "message.deliver") {
      // In-app messages are delivered to the scoped portal. External email has its own dispatch workflow.
      before.tables.connections.gmail = { id: "gmail", version: 1, state: "connected", approved_capabilities: ["simulate_send"] };
    }
    if (command.type === "file.attach" || command.type === "knowledge.save") {
      const values = o(input.values);
      const locator = s(values.storage_locator, s(values.file_id, s(values.blob_id)));
      if (command.type === "file.attach") assertService(locator, "FILE_UNAVAILABLE", "Upload a file before attaching it.", 422);
      if (locator) {
        const file = await client.query("select * from crewmori.files where workspace_id=$1 and id=$2::uuid and state='available'", [actor.workspaceId, uuidOrNull(locator)]);
        assertService(file.rowCount && (actor.kind === "owner" || (file.rows[0].engagement_id === actor.engagementId && file.rows[0].audience === "buyer")), "FILE_UNAVAILABLE", "Upload a file available to this session first.", 422);
        if (command.type === "file.attach") {
          const bound = Object.values(before.tables.attachments || {}).find((attachment) => attachment.storage_kind === "private" && attachment.storage_locator === locator && attachment.availability !== "removed" && attachment.id !== input.id);
          assertService(!bound, "FILE_ALREADY_ATTACHED", "This upload is already attached. Keep its existing file reference or upload a new version.", 409);
        }
        Object.assign(values, { storage_kind: "private", storage_locator: locator, mime_type: file.rows[0].mime_type, media_type: file.rows[0].mime_type, byte_length: file.rows[0].byte_size, size_bytes: file.rows[0].byte_size, sha256: file.rows[0].sha256 });
        input.values = values;
      }
    }
    const execution = execute(before, command.type === "message.deliver" ? "message.send" : command.type, input);
    const failureStatus = execution.result.code === "STALE_VERSION" ? 409 : execution.result.code === "NOT_AUTHORIZED" ? 403 : execution.result.code === "NOT_FOUND" ? 404 : 422;
    assertService(execution.result.ok, execution.result.code || "VALIDATION_ERROR", execution.result.message, failureStatus);
    const after = execution.state;
    for (const source of Object.values(after.tables.sources || {})) {
      const priorSource = before.tables.sources?.[source.id];
      if (!priorSource || priorSource.version === source.version) continue;
      const contentChanged = ["content", "label", "title", "summary", "url", "attachment_ids"].some((key) => JSON.stringify(source[key]) !== JSON.stringify(priorSource[key]));
      if (contentChanged) Object.assign(source, { published: false, visibility_reviewed: false, visibility_approved_version: null });
    }
    // Uploaded file access follows the reviewed domain sharing action, never a client-supplied audience alone.
    for (const file of Object.values(after.tables.attachments || {})) {
      if (file.version === before.tables.attachments?.[file.id]?.version) continue;
      const engagement = Object.values(after.tables.engagements || {}).find((e) => e.id === file.engagement_id || e.conversation_id === file.conversation_id || (e.project_id && e.project_id === file.project_id));
      if (file.storage_kind === "private" && file.availability === "removed") {
        const survivingReference = Object.values(after.tables.attachments || {}).some((other) => other.id !== file.id && other.storage_kind === "private" && other.storage_locator === file.storage_locator && other.availability !== "removed");
        if (!survivingReference) await client.query("update crewmori.files set state='deleted' where workspace_id=$1 and id=$2::uuid", [actor.workspaceId, uuidOrNull(file.storage_locator)]);
        continue;
      }
      if (file.storage_kind === "private" && engagement) await client.query("update crewmori.files set engagement_id=$3,audience=$4 where workspace_id=$1 and id=$2::uuid", [actor.workspaceId, uuidOrNull(file.storage_locator), engagement.id, file.shared_with_buyer || actor.kind === "buyer" ? "buyer" : "owner"]);
    }
    const changedReferences = Object.entries(after.tables).flatMap(([table, records]) => Object.values(records).filter((record) => record.version !== before.tables[table]?.[record.id]?.version).map((record) => `${table}:${record.id}`));
    const pendingDispatch = await client.query("select 1 from crewmori.external_dispatches where workspace_id=$1 and state in ('dispatching','unknown') and reference_ids && $2::text[] limit 1", [actor.workspaceId, changedReferences]);
    assertService(!pendingDispatch.rowCount, "DISPATCH_REVIEW_REQUIRED", "Review the pending external send before changing its approved content or recipient.", 409);
    await persistDomain(client, before, after, actor.workspaceId);
    for (const source of Object.values(after.tables.sources || {})) if (source.version !== before.tables.sources?.[source.id]?.version) await enqueueKnowledge(client, actor.workspaceId, source);
    if (["profile.publish", "service.publish"].includes(command.type)) await syncPublication(client, after, actor.workspaceId);
    const result = { ...execution.result, message: command.type === "message.deliver" ? "Message delivered in the client portal." : execution.result.message.replace(/sample /gi, "").replace("No real email was sent.", "Available in the buyer portal.") };
    await saveCommand(client, receiptActor, command.type, command.idempotencyKey, command.input, result);
    return { result };
  });
}
export async function ownerState(actor: OwnerActor) {
  return transaction(async (client) => {
    const owned = await client.query("select 1 from crewmori.workspaces where id=$1 and owner_id=$2", [actor.workspaceId, actor.userId]);
    assertService(owned.rowCount, "WORKSPACE_NOT_FOUND", "This workspace is unavailable.", 404);
    return ownerProjection(await loadDomain(client, actor.workspaceId));
  }, undefined, true);
}
export async function rateLimit(client: PoolClient, key: string, limit: number, seconds: number) {
  const row = (await client.query("insert into crewmori.request_limits(key,window_start,count) values($1,now(),1) on conflict(key) do update set count=case when crewmori.request_limits.window_start < now()-($2 * interval '1 second') then 1 else crewmori.request_limits.count+1 end,window_start=case when crewmori.request_limits.window_start < now()-($2 * interval '1 second') then now() else crewmori.request_limits.window_start end returning count", [key, seconds])).rows[0];
  assertService(row.count <= limit, "RATE_LIMITED", "Too many requests. Please try again later.", 429);
}
// A deliberate new action always gets a fresh UUID; transport retries reuse it.
export const newCommandKey = randomUUID;
