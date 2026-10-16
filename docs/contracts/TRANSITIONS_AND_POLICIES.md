# Transition and policy contract — version 1.0.0

Implement these rules in the replaceable mock services and meaningful tests. This document defines intended behavior; it is not implemented code. `../DECISIONS.md` is final authority. Use exact domain states internally and brief friendly labels in UI.

## Consequential transaction rules

Every modifying command validates actor, allowed state, input schema, expected aggregate version and required current input versions. Consequential commands also require an idempotency key. In one atomic local commit: apply records, increment affected mutable versions, append ordered events, save the exact outcome receipt, persist. Do not emit success or close a dirty form before the commit succeeds. On failed persistence preserve the draft and show retry/export recovery.

Scope idempotency by workspace + actor + command kind + key. Fingerprint normalized validated input (stable canonical JSON, including exact target/version/destination). After actor/shape validation, look up the receipt **before** rechecking mutable state/version; otherwise an already-successful retry would incorrectly fail against its own changed version. Same key/same fingerprint returns the stored outcome without another effect/event. Same key/different fingerprint returns `IDEMPOTENCY_CONFLICT`. A UI duplicate prevention flag is useful but does not replace this service rule. Disable the busy action without changing button width; no repeated submissions.

Record versions protect concurrent stale edits. Browser tabs subscribe to sample-store revision changes; reload/rebase the affected record while preserving unsaved edits for compare/copy. Never silently overwrite. Before sharing/accepting, re-read current version and check state; do not trust a stale rendered button. Accepted commercial content is immutable. Amendments are new revisions with new approval/share/acceptance as applicable.

## Commercial lifecycle

| Command | Required state and exact effect | Does not do |
|---|---|---|
| `offer.saveDraft` | Create revision1 or a new revision after material edit; validate price/scope/terms for review, allow incomplete draft; invalidate prior approval, mark prior unaccepted shared revision superseded; retain accepted snapshots. | Approve/share/accept/pay/reserve. |
| `offer.requestReview` | Complete current draft + current required assessments → awaiting_review. Sales joins Operations and Finance on the same requirements/policy versions. | Invent missing facts or skip failed/stale input. |
| `offer.approve` | Owner approves exact revision, terms and intended buyer destination; awaiting_review → approved; append approval. | Send, accept, reserve, request real funds. |
| `offer.share` | Current approved nonexpired revision + current destination-bound approval + sample connection capability; create one share record; approved → shared. | Claim actual email delivery. |
| `offer.requestChanges` | Buyer records text against eligible shared revision; change_requested; notify owner. Owner drafts a successor revision. | Rewrite agreed terms or implicitly accept. |
| `offer.accept` | Buyer explicitly accepts current, shared, nonexpired, nonwithdrawn exact revision with disclosure and grant; atomically create one acceptance snapshot, project, 48-hour provisional reservation, required inputs, draft deposit invoice/line and created payment request. Mark offer accepted; link engagement and grant. | Mark deposit received, promise start/due dates, complete professional work. |
| `offer.withdraw` | Owner confirms exact current unaccepted revision; withdrawn; acceptance blocked. Preserve history. | Delete accepted commercial history. |
| `clock.advance` | Deliberate sample clock change recomputes expiry and emits transitions. Offer expiry blocks new acceptance; an accepted snapshot remains accepted. | Make a paid project expire because its old invitation expired. |

Acceptance retry returns the same project/reservation/invoice/request IDs. Concurrency conflicts must never create two engagements or allocate effort twice. An old shared v1 link after v2 edit shows “Offer updated—waiting for the new version”; it cannot accept v1 or expose the unshared v2. An already accepted valid link shows its immutable accepted terms and next steps, not another Accept action.

## Prerequisites and work

Acceptance's provisional reservation expires **48 elapsed hours** after acceptance. State is provisional even if public availability is open. Deposit and required input completeness are independent. Only valid same-currency gross receipt allocations satisfying the full deposit count as confirmed. Inputs use canonical `missing`/`provided`: meaningful validated text or an available allowed attachment makes an input provided and meets that prerequisite automatically; there is no extra mandatory owner-accepted gate. Optional review metadata can request changes and make the input missing/blocked again with a specific reason; never silently clear valid input.

When both prerequisites become complete **strictly before expiry**, commit the start on the **next** configured business day at09:00 Asia/Jakarta. Monday–Friday, no sample holidays. Due17:00 on business day5, counting start day as1. Prerequisites completed exactly at or after expiry require rescheduling. Show a needs-rescheduling review item; never silently restore the old slot. A later confirmed receipt remains a receipt; the calendar rule cannot erase/refund it.

Commitment creates/updates canonical internal calendar start/deadline records. It does not send external invitations. Changes to promised dates/scope require explicit owner approval and, when commercial terms change, an amendment. Public profile intake availability is separate from estimated available effort, provisional capacity and committed dates.

Professional delivery transitions: not_started → in_progress → owner_reported_delivered → buyer_accepted. A task can be reopened where reversible. Project completed requires explicit owner completion after delivery policy, not agent-run completion or invoice payment. Preserve accepted snapshots, receipts and events on ordinary archive. Cancelling a project records the reason and releases future capacity; it does not auto-refund, erase debt or unsend messages.

## Invoices, requests, receipts and issues

An accepted, approved offer already authorizes its specified deposit request. Acceptance creates the **draft invoice + created payment request**. The deliberate buyer action **View payment instructions** invokes idempotent `payment.startRequest`, issues that exact authorized invoice, and opens the sample instructions; no redundant owner approval. Rendering the portal alone does not issue it. Unrelated manual invoices require owner review/issue. Editable draft → issued snapshot. Editing an issued invoice uses explicit void/reissue or later production amendment, never silent overwrite. Overdue is derived from sample clock + issued/partially_paid unpaid balance; do not turn a draft into sent/overdue.

`payment.simulateReceipt` is only available as an explicit sample action. Use a deterministic provider_event_id and exact money; record the observation first. Same event ID/content is a replay, different content with same event ID is a conflict. Pending/unknown/failed requests do not count as receipts. Confirmation alone does not imply correct currency/allocation. Reconcile identified same-currency gross amounts with invoice outstanding balances. Never subtract fees from debt or automatically convert a mismatched currency. Excess remains unapplied credit/review; do not overallocate. A partial allocation leaves invoice partially_paid and deposit incomplete.

Receipt gross−fee=net in the same currency. Sum posted allocations≤gross. Invoice allocations≤gross invoice total. Correct a posted allocation with an explicit linked reversal/reallocation, preserving audit history. Issue resolution may add evidence, a follow-up draft, or a checked allocation; it cannot simply toggle paid. A bank support draft is not a sent ticket, and recording an issue resolution is not settlement.

Supported draft issue resolutions: `request_information` (save message draft); `attach_evidence` (validated attachment/source); `allocate_checked_receipt` (only valid same-currency unallocated receipt); `dismiss_duplicate` (link actual original receipt, no extra allocation); `mark_not_a_match` (preserve observation as unmatched). Never offer “force paid.”

## Agent runs, messages and publication

Runs: queued → running → waiting_input / waiting_approval / blocked / completed / failed; eligible nonterminal states → paused → previous state; cancellation records cancelled, preserves completed effects and blocks future checkpoints. Retry creates a new attempt linked to the failed run with the same input intent; it does not mutate history to completed. Re-check cancellation/control version immediately before each effect. A simulated delay may pace a real checkpoint mutation; a timer by itself is not a result.

Six roles have distinct task kinds and outputs. Scout saves grounded fit/unknowns; Promoter saves approved-claim copy/destination; Sales saves requirements/offer; Account Manager saves relationship/input/follow-up; Operations saves effort/dates/tasks; Finance saves money/receipt analysis. Handoffs carry input versions and sources. If policy/requirements change, affected unaccepted assessments/artifacts become stale. No hidden reasoning transcript is exposed.

Messages, promotion publication and calendar invitations require exact-content/version/destination authorization. Save draft → review → approve → deliberately simulate send/publish/invite. Copying/opening an app is not delivery/publication. An uncertain future provider result stays pending_external/unknown and reconciles by original reference before retry. Mock connection revocation blocks the effect and preserves the interrupted action; reconnect alone does not send it.

## Clock, numbers, validation and external boundaries

Money and date rules are in `../data/SOURCE_FACTS_AND_ASSUMPTIONS.md`. Do not use live time for sample domain decisions. Validate URLs as allowed http/https links; reject javascript/data execution and unknown local return paths. Escape user content. New attachments follow root upload contract (PDF/PNG/JPEG/TXT, max10MiB each, max5 per action); validate size/type before saving, preserve rejected filenames for clear errors, and check byte availability after reload. Do not embed arbitrary HTML or execute uploads.

The next implementation uses **only local mocks**. Production identity provider, database, storage, queue, model/runtime, email/calendar/Drive and payment providers remain developer choices. Gmail/Calendar/Drive are illustrative sample capability labels. Stripe/Wise/bank/escrow/identity-verification and historical backend vendor suggestions are not configured commitments. A demo buyer grant or owner role switch never establishes server authorization.
