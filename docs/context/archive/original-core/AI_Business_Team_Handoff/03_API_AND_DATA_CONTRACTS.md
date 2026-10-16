# API and Data Contracts

**Version:** 1.0. Proposed application contracts, not a generated server or tested SDK.  
**Scope:** Full app's first integrated release.  
**Rule:** Dashboard, agents and voice tools call the same domain commands. External vendor interfaces are described in `04_INTEGRATIONS.md`.

## 1. Conventions

Use UUID-like opaque IDs, ISO 8601 timestamps and explicit IANA timezones. Resolve workspace membership and buyer scope on the server. JSON requests cannot grant access by supplying another workspace ID.

Money has currency, integer minor-unit amount and scale. Preserve original currency and use decimal strings for rates. Never use binary floating point for binding money. Durations are integer minutes. Content and requirements have explicit integer versions.

Every consequential mutation accepts an idempotency key. Where state freshness matters, it also accepts expected version/hash. Worker effects receive server-resolved run ID and control version. The model cannot choose its own authority or overwrite these values.

## 2. Core contracts

```typescript
type Role = "scout" | "promoter" | "sales" |
  "account_manager" | "operations" | "finance";

type Money = { currency: string; amountMinor: number; scale: number };
type RecordRef = { type: string; id: string; version: number };
type EvidenceRef = { sourceId: string; version: number; chunkId?: string };
type FactState = "owner_confirmed" | "source_reported" | "estimated" | "unknown";

type RunStatus = "queued" | "running" | "waiting_input" |
  "waiting_approval" | "paused" | "completed" | "blocked" |
  "failed" | "cancelled";

type AgentRun = {
  id: string; workspaceId: string; taskId: string; parentRunId?: string;
  role: Role; goal: string; inputRefs: RecordRef[];
  allowedTools: string[]; status: RunStatus; controlVersion: number;
  checkpointThreadId: string; outputArtifactIds: string[];
  budget: {
    maxSteps: number; maxOutputTokensPerCall: number;
    maxActiveDurationMs: number; maxCostUsdMinor: number;
  };
};

type Artifact<T> = {
  id: string; workspaceId: string; type: string; schemaVersion: number;
  createdByRunId: string; inputRefs: RecordRef[]; evidenceRefs: EvidenceRef[];
  visibility: "owner_private" | "buyer_approved";
  status: "draft" | "validated" | "blocked" | "superseded";
  data: T;
};

type RouteAssessment = {
  id: string; workspaceId: string;
  status: "satisfied" | "blocked" | "unknown";
  prerequisites: Array<{
    key: string; status: "satisfied" | "blocked" | "unknown";
    factState: FactState; evidenceRefs: EvidenceRef[]; reason: string;
  }>;
  inputVersions: RecordRef[]; checkedAt: string; expiresAt: string;
};

type CommandResult = {
  commandId: string;
  outcome: "completed" | "accepted_async" | "requires_approval" |
    "blocked" | "pending_external" | "conflict";
  record?: RecordRef; artifactIds: string[]; reasonCodes: string[];
  taskId?: string;
};
```

Production validation should bound integer ranges/lengths and validate currency/scale against supported metadata. `unknown` is not equivalent to zero. Financially required unknowns block dependent authorization. The included fixture values fit safe integer ranges; handling larger values may require string-encoded integers/BigInt at serialization boundaries.

## 3. Required entity fields and integrity

| Entity | Minimum fields and invariants |
|---|---|
| Workspace/membership | ID, authenticated user, membership role; unique workspace/user relation |
| Buyer grant | Hashed opaque token or session binding, engagement scope, audience, expiry/revocation and invitation exchange state |
| Profile/service version | Owner confirmation, approved public claims, packages, hours, commercial limits, beneficiary reference and policy version |
| Source/evidence | Workspace, source mode, URL/native ID, provider/run ID, content hash/version, published/fetched time, access basis and audience |
| Campaign | Channel/destination, rule context, content version/hash, campaign token, cash/time entries and publication state |
| Opportunity | Source reference, extracted request facts, fact states, contact permissions, fit artifact and deduplication key |
| Engagement | Client, source/campaign, current requirement version, lifecycle and related offers/invoices |
| Conversation/message | Canonical conversation ID, audience, provider mapping, original language, final/partial state, sequence and provider-message dedupe key |
| Offer version | Immutable terms, input versions, route/quote refs, canonical material hash, created/expiry times and state |
| Approval | Exact offer/content version/hash, authorized actor, scope and validity |
| Acceptance | Exact approved offer/hash, scoped buyer identity/session, accepted time and immutable historical record |
| Capacity window/reservation | Date range/timezone, available minutes, allocation rows, engagement/acceptance ref, state and expiry |
| Invoice | Immutable issued snapshot, accepted offer/version, currency, gross total and installment/deposit amount due |
| Payment request | Invoice/installment, expected gross amount, beneficiary/route refs, adapter/provider ID, idempotency key and status |
| Provider inbox | Provider, unique native event ID/type, signature-verification result, payload hash and processing status |
| Receipt/allocation | Native receipt identity, gross/fees/net/currency, request match, gross allocation, unapplied remainder and reconciliation state |
| Task/run/artifact | Role/run/control identities, typed inputs/outputs, checkpoints and budgets |
| Activity/outbox/usage | Unique IDs, ordered workspace activity, delivery attempts and measured/estimated cost attribution |

A provider may reuse an object ID across event types; choose a uniqueness key matching its documented semantics. Deduplicate normalized receipt identity separately from webhook delivery identity. A repeated event cannot credit the invoice twice.

## 4. Lifecycle vocabulary

| Object | States |
|---|---|
| Engagement | inquiry, qualifying, negotiating, accepted, active, cancelled, closed |
| Offer version | draft, awaiting_approval, approved, accepted, superseded, expired |
| Payment request | created, pending, succeeded, failed, cancelled, unknown |
| Reconciliation | unmatched, matched, reconciled, disputed |
| Capacity reservation | provisional, committed, released, expired |
| Promotion | draft, approved, ready_to_share, published_confirmed, paused, cancelled |
| Professional work | not_started, in_progress, owner_reported_delivered, buyer_accepted |

These objects do not collapse into one engagement-status field. A receipt can exist while reconciliation is disputed. An accepted agreement persists after a later amendment. An expired unpaid reservation does not erase a late receipt.

## 5. Owner, buyer and provider routes

Paths are a proposed implementation surface. Return typed outcomes with saved record versions. Enforce permissions in shared commands even when a route is not involved.

| Route | Caller | Key input | Result |
|---|---|---|---|
| `POST /api/tasks` | Owner | Goal, relevant record refs, proposed allowed work | Persisted task/run dispatch, 202 |
| `GET /api/runs/:id` | Owner/operator in scope | Run ID | Authorized snapshot/artifact refs |
| `POST /api/runs/:id/control` | Owner | Action, expected control version, optional instruction | Saved new control state/version |
| `GET /api/activity?after=...` | Owner | Workspace-scoped sequence | Durable event page and next cursor |
| `POST /api/opportunities/import` | Owner | Text/CSV/allowed URL, source mode | Saved source/opportunity and assessment task |
| `POST /api/campaigns/:id/share-package` | Owner/Promoter | Profile/channel/content refs | Versioned draft and attribution link |
| `POST /api/artifacts/:id/approve` | Owner | Exact version/hash/destination | Nonfinancial content approval |
| `POST /api/buyer-sessions` | Public visitor/invitee | New-inquiry campaign or invitation exchange | Isolated new session or verified engagement grant |
| `POST /api/conversations/:id/messages` | Scoped owner/buyer | Message and client event ID | Idempotent saved message and next action |
| `POST /api/voice/session` | Scoped buyer | Conversation/grant | Short-lived provider credentials |
| `POST /api/voice/tools/:tool` | Authenticated provider session | Tool payload and verified session binding | Shared command result; no broader scope |
| `POST /api/engagements/:id/assess` | Owner/Sales | Current requirement version | Dependent Operations/Finance tasks |
| `POST /api/engagements/:id/offers` | Owner/Finance command | Assessment refs, package/deposit choice | Computed immutable offer draft |
| `POST /api/offers/:id/approve` | Owner | Exact material hash/version | Approval or stale/conflict response |
| `POST /api/buyer/offers/:id/accept` | Verified scoped buyer | Exact offer/hash, idempotency key | Acceptance plus atomic capacity reservation |
| `POST /api/engagements/:id/payment-requests` | Gated Finance command | Invoice/installment, current route and authority refs | Saved adapter request or blocked/pending state |
| `POST /api/webhooks/:provider` | Verified provider/test signer | Raw signed payload | Deduplicated inbox and queued processing |
| `POST /api/engagements/:id/follow-ups` | Owner/Account Manager | Checked timeline/version, proposed purpose | Editable next-action draft |

Proposed HTTP behavior: 202 queued, 409 stale version/idempotency mismatch/business conflict, 401/403 authentication/authority, 422 invalid domain input. A transport acknowledgment does not prove the business outcome.

### Mutation idempotency

Store workspace, operation, idempotency key, request hash and result reference. Identical replays return the original result. A reused key with different content is rejected. Check run/control version immediately before effects and reserve shared goal budget atomically.

## 6. Agent tool registry

| Role | Initial allowed tools |
|---|---|
| Scout | Import/search permitted opportunities, retrieve evidence, save fit brief |
| Promoter | Retrieve approved claims/rules, prepare promotion, create campaign link, request content review |
| Sales | Read buyer-safe profile, capture requirements, request assessments, get computed options, request owner review |
| Account Manager | Read scoped history, append checked timeline event, prepare follow-up/next action |
| Operations | Read availability/reservations, check capacity, list required inputs, prepare schedule assessment |
| Finance | Evaluate allowed offers, request commercial approval, request gated payment, inspect receipt, invoke Payments-domain reconciliation |

Treat these as application tools, not unrestricted access to vendor APIs. Publication, outbound sending, invitations and payment effects have separate gates. Public buyer Sales context is narrower than owner-private Sales task context.

## 7. Activity and cursor events

```typescript
type AgentActivity = {
  eventId: string; workspaceId: string; sequence: number;
  taskId: string; runId: string; role: Role;
  type: "run.started" | "evidence.retrieved" | "tool.started" |
    "tool.completed" | "artifact.saved" | "handoff.created" |
    "review.required" | "run.blocked" | "run.paused" |
    "run.cancelled" | "run.redirected" | "run.finished";
  occurredAt: string;
  focus?: { recordType: string; recordId: string; artifactId?: string; anchor?: string };
  publicSummary: string;
};
```

`publicSummary` means safe concise UI text within the event's authorized audience; it does not mean world-readable or buyer-visible. Do not stream owner events into buyer subscriptions. Store private tool diagnostics separately with redaction.

Generate workspace activity order under a lock for the initial scale. The UI deduplicates IDs and reloads after gaps. Semantic targets map to registered UI anchors. Evidence inspection may focus a source or requirement before an output artifact exists.

The file `contracts/activity-event.schema.json` provides a machine-readable event shape. `sample-data/activity_events.json` illustrates it. The schema validates shape only; membership, versions, authority and factual correctness remain domain checks.

## 8. Critical command invariants

1. Buyer session creation from a campaign creates a new isolated inquiry. It never grants access to an arbitrary existing engagement.
2. Offer terms and every acceptance are immutable snapshots. Material changes create new versions/amendments.
3. Acceptance atomically checks capacity and reserves available minutes; identical replay does not reserve twice.
4. Payment dispatch requires current approval/acceptance/invoice, allowed beneficiary and `satisfied` route assessment. Unknown and blocked cannot dispatch.
5. Provider adapters normalize/verify facts; the Payments domain owns reconciliation and invoice allocation.
6. Every verified receipt persists, including partial/excess/late/unmatched cash. Unapplied money remains visible for review.
7. Outstanding invoice balance uses valid gross allocations, not net-after-fee cash.
8. Cancellation/control-version and shared budget checks apply at mutation dispatch, including resumed runs.
9. Source facts, estimates and unknowns retain provenance/state. A schema-valid model response is not authorization.
10. Completion requires a persisted/readable postcondition or checked external evidence, not an animation or transcript claim.

## 9. Financial fixture contract

Use `sample-data/offer_fixture.json` as a frozen synthetic evaluation input. Its fee rate is basis points; its FX is a decimal string in IDR per USD. All values are fictional. The expected outputs distinguish contribution before acquisition from the separately labeled acquisition extension.

`sample-data/payment_events.json` contains normalized application test events, not live provider payloads or real signatures. A provider adapter maps its actual verified payload to the normalized event contract. The developer generates signatures with a local test secret when exercising the sandbox webhook; no secret is shipped in this archive.

The remaining sample files are development fixtures. IDs, relationships, amounts and dates are consistent, but they are not an exhaustive database seed or complete provider simulation. Build a seed adapter and verify actual migrations/commands against the tests in `08_VERIFICATION_AND_RELEASE.md`.
