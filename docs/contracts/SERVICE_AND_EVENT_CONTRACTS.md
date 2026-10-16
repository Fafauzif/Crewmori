# Service, command and event contracts

Version1.0.0. These are adapter obligations and typed examples for the upcoming implementation. `domain-contracts.ts` has no executable business implementation. Extend concrete DTOs to cover the complete flows; do not treat its representative interface as permission to omit the commands below.

## Boundary

React views call typed services/selectors. One local adapter owns normalized state, schema persistence, command receipts, event sequencing, local file bytes, deterministic scenario/tasks and error injection. Components do not mutate copied arrays or call providers. The future production adapter can replace those services without rebuilding the views. Provider vendors remain optional, unconfigured production choices.

Query results use the actor's safe projection. A buyer component must not receive an entire owner store and hide fields. Owner query reads may return owner data; buyer/public reads return only allowlisted DTOs. Demo role switch is navigation, never authorization. Service error messages are centralized locale keys plus structured field errors and recovery instructions.

## Required command families

Every write uses actor/workspace context, expected versions on updates, stable command ID, idempotency key, validated input and a typed result. Exact `input` field names can be reconciled when implementing, but behavior, information and guardrails are mandatory.

| Family/command | Required validated input → observable committed output |
|---|---|
| `session.enterDemo` | owner/buyer role and trusted local return route → sample session; no credentials. |
| `session.signIn/signUp` | syntactically valid email and transient form password → simulated session/validation/failure branch; password never persisted/logged. |
| `session.requestRecovery/reset` | sample email or valid local reset scenario + transient password confirmation → explicit simulated result; no actual email or provider claim. |
| `session.signOut` | current sample session → session cleared; committed workspace retained. |
| `setup.saveStep/complete` | step ID, validated typed business/service/availability/preferences draft → resumable step record and linked approved profile fields only on commit. |
| `profile.save` | public fields, profession, handle, contact, publication, expected profile version → profile; material claims require explicit approval before publication. |
| `service.save/archive` | title/slug/description/deliverables/pricing/publication, optional existing ID → service; referenced accepted terms unchanged. |
| `policy.save` | basis points, exact cost/rate assumptions, workweek/holidays, timezone/availability/input gates → versioned policy, affected unaccepted assessments stale. |
| `preferences.save` | locale/timezone, motion/pause/notifications → preference record; no commercial history mutation. |
| `knowledge.save/remove` | source label/type/allowed URL or attachment, approved public claims, audience → source/evidence metadata; missing bytes explicit. |
| `opportunity.create/import/update` | source/client/contact, factual requirements and unknowns → canonical opportunity/requirements; sample import is explicit deterministic data, never actual scraping. |
| `opportunity.qualify/decline/archive` | exact ID/state and reason → status/next action; preserve linked history. |
| `inquiry.submit` | service/handle, buyer contact, scope, optional budget/timing, consent → new isolated engagement, conversation, requirements and opportunity. |
| `conversation.send` | engagement/conversation, exact content/version, attachments and sender scope → sample message; unsupported AI request is saved and clarified/manual draft offered. |
| `conversation.requestOwner` | conversation and concise reason → owner-review flag, useful next step. |
| `message.saveDraft/approve/send` | conversation, exact version/content/destination → separate saved/approved/sample_sent state, never time-only delivery. |
| `offer.saveDraft/requestReview/approve/share` | Typed DTOs in `domain-contracts.ts` → draft/review/approval/share records under lifecycle rules. |
| `offer.requestChanges/accept/withdraw` | Exact engagement/version/share + explicit intent → requested changes, atomic acceptance effects, or withdrawn history. |
| `promotion.saveDraft/approve` | service, versioned content, destination, approved claim refs → exact draft/approval, no publication. |
| `promotion.recordPublication` | exact approved version/destination and deliberate sample publication confirmation → publication evidence/state; copy/open alone does not invoke this. |
| `client.create/update/archive` | client/contact fields, ordinary private notes, expected versions → client/contact/history; buyer messages are separate explicit records. |
| `project.create/update` | client, brief, tasks/milestones, expected state; manual projects have no invented accepted offer/payment → project and explicit admin state. |
| `project.provideInput` | exact required input, meaningful answer or available allowed attachment → input record, completeness selector and commitment eligibility. |
| `project.commitStart/reschedule` | prerequisites/evidence, reservation/current policy, exact owner-approved new commitment → derived dates/internal calendar; no external invitation. |
| `project.updateTask/reportDelivery/complete/reopen/archive` | exact task/project, intended state, reason/files where needed → professional work state; payment/agent state remains separate. |
| `file.attach/remove/download` | actor/project/source, validated local binary/metadata or approved URL → scoped attachment/link; actual bytes/download or honest unavailable/retry state. |
| `calendar.saveProposal/approve/invite` | event title/start/end/timezone, related project, exact recipients/version → proposed internal event, approval, separate simulated invitation. |
| `invoice.saveDraft/issue/void` | payer/client/project, positive line quantities/exact amounts/currency/due basis and authority → draft or immutable issued snapshot; void preserves reason/history. |
| `payment.startRequest` | exact request/invoice → pending sample request, issue authorized accepted-offer invoice where appropriate; no actual checkout. |
| `payment.simulateReceipt` | deliberate controller action, stable provider event, currency/gross/fee/time → observed sample receipt, checked allocation/issue; replay safe. |
| `finance.allocateReceipt/reverseAllocation` | exact receipt/invoice, same-currency gross amount, evidence/reversal reason → allocation ledger; no overallocate or force-paid. |
| `finance.resolveIssue` | allowed action, evidence and note → genuine saved issue action/record; receipt certainty cannot come from a toast. |
| `expense.save/archive` | date/category/description/currency/exact amount/optional available receipt/project → expense; group filtered totals by currency; honest undo for reversible archive. |
| `agent.start/control` | role/curated intent/versioned inputs; pause/resume/cancel/retry with control version → actual run checkpoint/attempt and saved distinct artifacts/events. |
| `activity.markRead/catchUp` | last-seen sequence and requested range → stored marker/factual event summary; no invented work during absence. |
| `connection.change` | exact provider alias/action/capabilities → sample state; permission revocation preserves interrupted draft and explicit retry. |
| `sample.loadScenario/advanceClock/reset` | known scenario/positive day increment, edited-work confirmation where relevant → validated atomic store/clock reset; no invisible background money changes. |

Reads need list/get/search/filter/sort/paging for opportunities, offers, clients, projects/tasks, calendar, invoices, payments/issues, expenses, promotion, sources and events. Combined predicates, stable sort/tie-break ID, query cancellation/stale-response protection and useful missing-ID/zero-result states are required. Store query/filter/sort in canonical URL; cosmetic tab changes do not satisfy a view switch.

## Outcomes, errors and recovery

`completed` is a committed local mutation or verified download. `accepted_async` identifies an actual saved run. `requires_approval` records/presents the exact draft without claiming an effect. `blocked` names missing prerequisite/capability; `conflict` preserves draft with compare/reload. `pending_external` exists for future unknown provider outcomes and explicit sample error branches; no blind retry after uncertainty.

Typed error codes and recovery are in the TS contract. Field validation retains inputs; focus first invalid. Stale versions offer current record plus compare/copy; reconnect does not resubmit; unavailable files show reattach/retry; persistence failure keeps editor open; unsupported free text saves the request and offers clarification/manual draft. Tests must cover rejection paths, not only optimistic success.

## Events, live replacement and animation

Every event has unique ID, strictly increasing workspace sequence, occurred_at, kind, role/run, concise safe summary, versioned record refs, semantic focus target and causal command correlation. Consequential commands record emitted event IDs in their receipt, so retry/replay does not append them twice. Event history preserves facts even when a record is later edited; do not rewrite old summaries to invent earlier success.

Use registered anchors, never arbitrary screen coordinates. Minimum anchor vocabulary: `team.agent.scout`, `.promoter`, `.sales`, `.account_manager`, `.operations`, `.finance`; `offer.review`, `offer.share`, `project.prerequisites`, `project.timeline`, `money.receipt`. During implementation each anchor resolves to a real component in its visible route or stays unanimated. Hidden routes do not receive stray cursors. Maximum two task cursors; no control occlusion. Stable character positions, pause, reduced motion and static accessible event/artefact lists remain complete.

Subscription notices carry latest sequence and store revision; clients deduplicate IDs, detect gaps, fetch missing pages or re-read snapshot, then resume. Refresh can render latest state without animation. Catch-up uses actual stored events after last_seen; a run is not completed just because its animation ended. Public/buyer updates are separate narrow projections; never forward owner events by default. No hidden chain-of-thought, provider secret, raw private prompt or other-client data in event summaries.

## Persistence and verification obligations

Use schema-versioned store with explicit corruption/reset recovery. Preserve relevant drafts, exact amount/date types, event sequence, local binary references and command receipts across refresh. A future production backend must enforce workspace isolation, actor authority, concurrency, transactional acceptance/capacity allocation, provider authenticity, idempotency and durable jobs; local browser state cannot provide those guarantees.

The implementation run must test command replay, reused key/different input, stale edit/approve/accept, duplicate provider event, wrong currency, partial/excess receipt, late prerequisites/expired reservation, cancelled run before effect, reconnect without accidental send, and buyer projection exclusion. Document actual test evidence and any missing runtime verification; contract files alone are not completion evidence.
