/** Contract examples for the NEXT implementation. No runtime/provider implementation. */
export type ID = string;
export type ISODateTime = string;
export type RoleId = 'scout' | 'promoter' | 'sales' | 'account_manager' | 'operations' | 'finance';
export type Money = { amount_minor: number; currency: 'USD'; scale: 2 } | { amount_minor: number; currency: 'IDR'; scale: 0 };
// Runtime validators require integer, nonnegative, Number.isSafeInteger money, positive versions,
// valid offset timestamps/IANA timezone and known references. A TS number alone is insufficient.
export type RecordRef = { table: string; id: ID; version: number };
export interface BaseRecord { id: ID; workspace_id: ID; version: number; audience: 'owner' | 'buyer' | 'public'; created_at: ISODateTime; updated_at: ISODateTime; }
export type OfferState = 'draft' | 'awaiting_review' | 'approved' | 'shared' | 'change_requested' | 'accepted' | 'withdrawn' | 'superseded' | 'expired';
export type RunState = 'queued' | 'running' | 'waiting_input' | 'waiting_approval' | 'paused' | 'blocked' | 'completed' | 'failed' | 'cancelled';
export type ConnectionState = 'not_connected' | 'connecting' | 'connected' | 'limited_permissions' | 'reconnect_required' | 'error' | 'disconnected';
export interface Terms {
  delivery_business_days: number; deposit_basis_points: number; reservation_hours: number;
  start_basis: 'next_business_day_after_confirmed_deposit_and_required_inputs';
  timezone: 'Asia/Jakarta'; workdays: number[]; holidays: string[];
  start_local_time: string; due_local_time: string; required_input_keys: string[]; acceptance_disclosure: string;
}
export interface Deliverable { key: string; label: string; quantity: number; }
export interface OfferVersion extends BaseRecord {
  offer_id: ID; revision: number; title: string; deliverables: Deliverable[]; price: Money | null;
  estimated_effort_minutes: number | null; terms: Terms | null; requirements_id: ID;
  requirements_version: number; policy_version: number; assessment_ids: ID[]; state: OfferState;
  buyer_note: string; expires_at: ISODateTime | null; predecessor_id: ID | null; immutable_after_acceptance: boolean;
}
export interface Offer extends BaseRecord {
  client_id: ID; opportunity_id: ID; current_version_id: ID; status: OfferState;
  accepted_version_id: ID | null; shared_version_id: ID | null;
}
export interface DomainEvent extends BaseRecord {
  sequence: number; occurred_at: ISODateTime; kind: EventKind; role_id: RoleId | null; run_id: ID | null;
  summary: string; record_refs: RecordRef[]; semantic_focus_target: string | null;
  cause_command_id: ID | null; visibility: 'owner';
}
export type EventKind = 'source.recorded' | 'assessment.completed' | 'offer.draft_saved' | 'offer.review_requested'
  | 'offer.approved' | 'offer.shared' | 'offer.change_requested' | 'offer.accepted' | 'offer.withdrawn' | 'offer.expired'
  | 'project.created' | 'project.input_provided' | 'project.start_committed' | 'project.needs_rescheduling'
  | 'project.task_updated' | 'project.delivery_reported' | 'project.completed' | 'reservation.expired'
  | 'invoice.draft_saved' | 'invoice.issued' | 'invoice.voided' | 'payment.request_started' | 'receipt.observed'
  | 'receipt.reconciled' | 'receipt.review_required' | 'finance.issue_updated' | 'expense.saved' | 'expense.archived'
  | 'promotion.draft_saved' | 'promotion.approved' | 'promotion.publication_recorded' | 'message.draft_saved'
  | 'message.sample_sent' | 'calendar.proposal_saved' | 'calendar.sample_invited' | 'connection.state_changed'
  | 'run.started' | 'run.checkpoint' | 'run.paused' | 'run.resumed' | 'run.cancelled' | 'run.failed' | 'run.completed'
  | 'profile.saved' | 'policy.saved' | 'preferences.saved' | 'sample.clock_advanced';

export type Actor = { kind: 'owner'; owner_id: ID } | { kind: 'buyer'; grant_id: ID } | { kind: 'public' } | { kind: 'sample_controller' };
export interface CommandMeta {
  command_id: ID; idempotency_key: string; actor: Actor; workspace_id: ID;
  expected_versions: Record<ID, number>; requested_at: ISODateTime;
}
// In production actor/workspace/clock are resolved from trusted session/server context,
// not authorized by the same user-supplied fields used by this local adapter.
export interface OfferCommandInputs {
  'offer.saveDraft': { offer_id: ID; base_version_id: ID; title: string; deliverables: Deliverable[]; price: Money | null; estimated_effort_minutes: number | null; terms: Terms | null; buyer_note: string; expires_at: ISODateTime | null };
  'offer.requestReview': { offer_id: ID; offer_version_id: ID; assessment_ids: ID[] };
  'offer.approve': { offer_id: ID; offer_version_id: ID; destination_contact_id: ID };
  'offer.share': { offer_id: ID; offer_version_id: ID; approval_id: ID; destination_contact_id: ID; connection_id: ID; channel: 'sample_email' | 'sample_link' };
  'offer.requestChanges': { engagement_id: ID; offer_version_id: ID; requested_changes: string };
  'offer.accept': { engagement_id: ID; offer_id: ID; offer_version_id: ID; share_id: ID; terms_acknowledged: true };
  'offer.withdraw': { offer_id: ID; offer_version_id: ID; reason: string };
}
export interface OtherCommandInputs {
  'project.provideInput': { engagement_id: ID; project_id: ID; input_id: ID; answer: string | null; attachment_ids: ID[] };
  'project.commitStart': { project_id: ID; reservation_id: ID };
  'project.updateTask': { task_id: ID; title: string; state: 'not_started' | 'in_progress' | 'blocked' | 'completed'; due_at: ISODateTime | null; notes: string };
  'project.reportDelivery': { project_id: ID; attachment_ids: ID[]; message: string };
  'invoice.issue': { invoice_id: ID; expected_line_ids: ID[]; authorization_acceptance_id: ID | null };
  'payment.startRequest': { payment_request_id: ID; invoice_id: ID };
  'payment.simulateReceipt': { payment_request_id: ID; provider_event_id: string; gross: Money; fee: Money; observed_at: ISODateTime };
  'finance.allocateReceipt': { receipt_id: ID; invoice_id: ID; amount: Money; evidence_source_ids: ID[] };
  'finance.resolveIssue': { issue_id: ID; action: 'request_information' | 'attach_evidence' | 'allocate_checked_receipt' | 'dismiss_duplicate' | 'mark_not_a_match'; evidence_ids: ID[]; note: string; related_receipt_id: ID | null };
  'agent.start': { role_id: RoleId; task_kind: string; intent: string; input_refs: RecordRef[] };
  'agent.control': { run_id: ID; expected_control_version: number; action: 'pause' | 'resume' | 'cancel' | 'retry' };
  'connection.change': { connection_id: ID; action: 'connect' | 'reconnect' | 'disconnect'; approved_capabilities: string[] };
  'sample.loadScenario': { scenario_id: string; discard_edited_work_confirmed: boolean };
  'sample.advanceClock': { days: number };
}
export type CommandInputs = OfferCommandInputs & OtherCommandInputs;
export type CommandName = keyof CommandInputs;
export type Command<K extends CommandName> = { type: K; meta: CommandMeta; input: CommandInputs[K] };
export interface AcceptOutput { acceptance_id: ID; project_id: ID; reservation_id: ID; invoice_id: ID; payment_request_id: ID; }
export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'STALE_VERSION' | 'IDEMPOTENCY_CONFLICT'
  | 'INVALID_STATE' | 'ASSESSMENT_STALE' | 'APPROVAL_REQUIRED' | 'APPROVAL_STALE' | 'OFFER_EXPIRED' | 'OFFER_SUPERSEDED'
  | 'CONNECTION_REVOKED' | 'CAPABILITY_MISSING' | 'PREREQUISITES_MISSING' | 'RESERVATION_EXPIRED' | 'CURRENCY_MISMATCH'
  | 'ALLOCATION_EXCEEDS_AVAILABLE' | 'DUPLICATE_PROVIDER_EVENT_CONFLICT' | 'PERSISTENCE_FAILED' | 'FILE_UNAVAILABLE'
  | 'UPLOAD_REJECTED' | 'SAMPLE_SOURCE_UNAVAILABLE' | 'UNSUPPORTED_INTENT' | 'UNKNOWN_EXTERNAL_OUTCOME';
export interface ErrorDetail { code: ErrorCode; message_key: string; field_errors: Record<string,string>; retryable: boolean; recovery: 'edit' | 'reload_compare' | 'reconnect_retry' | 'reschedule' | 'attach_evidence' | 'retry' | 'manual_draft' | 'none'; preserved_draft_key: string | null; }
export type CommandResult<T> =
  | { outcome: 'completed'; data: T; changed_records: RecordRef[]; event_ids: ID[]; replayed: boolean; store_revision: number }
  | { outcome: 'accepted_async'; run_id: ID; changed_records: RecordRef[]; event_ids: ID[]; store_revision: number }
  | { outcome: 'requires_approval' | 'blocked' | 'conflict'; error: ErrorDetail; changed_records: RecordRef[]; event_ids: ID[] }
  | { outcome: 'pending_external'; reference: string; error: ErrorDetail; changed_records: RecordRef[]; event_ids: ID[] };

export interface BuyerOfferProjection {
  engagement_id: ID; offer_id: ID; offer_version_id: ID; freelancer_name: string; buyer_name: string;
  title: string; deliverables: Deliverable[]; price: Money; terms: Terms; buyer_note: string;
  expires_at: ISODateTime | null; state: OfferState; accept_eligibility: { allowed: boolean; reason: string | null };
}
export interface PublicProfileProjection {
  handle: string; public_name: string; headline: string; biography: string; location_label: string;
  public_contact_email: string; public_availability: 'open_to_inquiries' | 'limited' | 'unavailable';
  services: Array<{ slug: string; title: string; description: string; deliverables: string[]; pricing_label: string }>;
  portfolio: Array<{ title: string; summary: string; asset_url: string | null }>;
}
export interface EventPage { events: DomainEvent[]; next_sequence: number; snapshot_revision: number; has_gap: boolean; }
export interface DomainService {
  execute<K extends CommandName>(command: Command<K>): Promise<CommandResult<K extends 'offer.accept' ? AcceptOutput : { record_ids: ID[] }>>;
  getOfferForOwner(offer_id: ID): Promise<{ offer: Offer; versions: OfferVersion[] }>;
  getBuyerOffer(engagement_id: ID, grant_id: ID): Promise<BuyerOfferProjection>;
  getPublicProfile(handle: string): Promise<PublicProfileProjection>;
  eventsAfter(sequence: number, limit: number): Promise<EventPage>;
  subscribe(listener: (notice: { store_revision: number; latest_sequence: number }) => void): () => void;
}
// Additional CRUD commands follow the explicit table below in SERVICE_AND_EVENT_CONTRACTS.md.
// Extend CommandInputs with concrete DTOs during implementation; never replace it with any.
