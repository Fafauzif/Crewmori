# Crewmori — developer functionality and implementation handoff

Updated 16 October 2026 · Frontend implementation 1.1.0 · Runtime schema 1.1.0

Crewmori is a freelancer-owned AI business team. Six specialists prepare business work; the freelancer performs the commissioned professional work. This handoff contains an implemented Next.js frontend with persistent local sample data, deterministic agent outcomes, owner approval controls, public/buyer projections and actual downloadable files.

This document describes what the source implements. External effects are simulated, and browser evidence is stated separately in `BUILD_STATUS.md` / `VERIFICATION.md`. All 34 specified route patterns have application surfaces; that inventory does not assert exhaustive manual testing of every original control or alternate state. Keep the retained detailed flows/contracts as acceptance requirements when extending this source.

The standalone `Crewmori_Developer_Functionality.md`, `docs/Crewmori_Developer_Functionality.md` and `docs/DEVELOPER_FUNCTIONALITY.md` must be identical in the final package.

## 1. Run, build and deployment

The repository root is the application root. Node.js `>=20.9.0` and npm are required; no environment variables, real service accounts or secrets are required.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Development defaults to `http://localhost:4173`; `npm run dev -- --port 3000` selects another port. The production start command uses 4173. Vercel: import the GitHub repository, choose **Next.js**, Root Directory `.`, Install Command `npm ci`, Build Command `npm run build`, default framework output. Do not force a static export. A live deployment is not claimed by this handoff.

Pinned runtime packages: Next `16.2.1`, React/React DOM `19.2.4`, Lucide React `0.577.0`, jsPDF `4.2.0`, fflate `0.8.2`. TypeScript `5.9.3`, tsx `4.21.0` and ESLint `9.39.4` support development/testing. The lockfile is authoritative.

## 2. Implementation status language

| Term | Meaning here |
| --- | --- |
| Implemented locally | A rendered control/view is connected to local state or a real local file operation. |
| Simulated effect | A deliberate command records an inspectable sample outcome without a real provider, model, account or movement of money. |
| Constrained branch | A supported flow deliberately rejects a transition that would require unresolved financial, timing or authority review. The rejection and saved history are meaningful behavior. |
| Partial | A requested capability exists in some surfaces, while a named portion remains incomplete. |
| Unverified | Source may implement the capability, but the final evidence does not establish the specified runtime/browser check. |
| Production responsibility | Server/provider work excluded from this frontend phase. |

## 3. Architecture and developer replacement points

`src/app/[[...slug]]/page.tsx` enters a Suspense-wrapped client application for the declared routes. `src/components/application.tsx` dispatches paths and demonstrates an owner-session navigation guard. Domain views share `src/components/ui.tsx`, the owner shell and one store; there are no separate copies of Northstar data per screen.

`src/lib/engine.ts` exposes `createState()` and `execute(state, type, input)`. Commands validate against a cloned snapshot, reject stale/invalid operations without committing, apply related updates, append events and persist idempotency receipts. `src/lib/store.tsx` writes successful state to localStorage before updating React. The service result includes success/error message, record IDs, code and replay status where appropriate.

`src/lib/projections.ts` assembles allowlisted public profile, inquiry, exact buyer offer and continuation DTOs. Production must make these server query/response boundaries: the local prototype still ships the sample workspace into its browser, so rendering allowlists are not tenant security.

| Module | Replace/extend here |
| --- | --- |
| `engine.ts` | Typed authenticated commands, version checks, transactions, durable idempotency, provider event reconciliation |
| `store.tsx` | Server query/cache adapter, persistent sessions, realtime/reconnect and conflict handling |
| `projections.ts` | Server-side owner/buyer/workspace authorization and field-level response projection |
| `downloads.ts` | Durable object storage, download access checks, final invoice font/legal formats and export jobs |
| `local-crypto.ts` | Sample IDs and SHA-256 integrity support; never use sample IDs as production bearer credentials |
| `spec-contracts.ts`, retained contracts | Vocabulary and expected semantics; convert generic runtime entity/input boundaries into explicit production DTOs |
| `views/*.tsx` | User interaction and presentation; keep commercial/financial state changes in the command layer |

Core runtime records cover clients/contacts, sources/requirements, assessments, offer versions/approvals/share/acceptances, projects/reservations/inputs/tasks/milestones, invoices/lines/payment requests/receipts/allocations/issues, expenses/corrections, conversations/messages, attachments, roles/runs/handoffs/artifacts/events, connection permissions, publication snapshots, settings/setup and local account/recovery state.

## 4. Route coverage

The following is the actual route/action map. Owner routes use the shared owner shell. Public, auth and buyer routes use the restrained public shell. Unknown IDs/grants receive app-owned unavailable states.

| Route pattern | Implemented surface and actions | Main module / boundary |
| --- | --- | --- |
| `/` | Product introduction, six-role explanation, sample entry, profile/account links | `public.tsx`; sample entry |
| `/auth/sign-in` | Labeled input validation, password visibility, local sign-in/session, trusted local return route, sample entry | `public.tsx`; no real password verification |
| `/auth/sign-up` | Local name/email account record, duplicate local account check, transient password validation, setup entry | `public.tsx`; no external account creation |
| `/auth/recover` | Creates a local 15-minute sample reset grant and preview link; prior prepared grants replaced | `public.tsx`; no recovery email |
| `/auth/reset` | Valid/expired/replaced/consumed grant states; reset demonstration consumes grant | `public.tsx`; no real credential reset |
| `/onboarding` | Business, services, optional portfolio, availability/defaults and connection previews; Back, Save and leave, skip and resume | `public.tsx`; saved draft, no automatic public publication |
| `/app/home` | Owner briefing, canonical next decision, recent updates, crew presence and shared delegation | `home-team.tsx`; derived records |
| `/app/team` | Six illustrated roles, desktop studio/compact fallback, selected role/task inspector, task actions and artifact links | `home-team.tsx`; deterministic runs |
| `/app/team/activity` | Saved event timeline, role/status filters, sources/output references | `home-team.tsx`; no fabricated activity stream |
| `/app/opportunities` | Search/status/source/sort/page, manual lead/import preview, qualification lifecycle, canonical links | `acquisition.tsx` |
| `/app/opportunities/[id]` | Original request/source, evidence, assessment task, missing-information draft, qualify/decline/restore, offer entry | `acquisition.tsx`; saved source facts |
| `/app/offers` | Search/filter/sort/page, current version/client/amount/state and draft creation | `acquisition.tsx` |
| `/app/offers/[id]` | Grouped editor, exact terms, review/approve/share, historical version comparison, buyer-safe PDF/link, withdraw/amend | `acquisition.tsx`; commercial commands |
| `/app/promotion` | Draft search/status/channel, editor, approved-service claims, review, copy, sample publication evidence, pause/archive/restore | `acquisition.tsx`; publication simulated |
| `/app/projects` | Search/status/client/sort/page, list/board, explicit previously accepted manual work entry | `work.tsx`; awaiting-review offers are not projects |
| `/app/projects/[id]` | Overview/tasks/files/messages, brief edit, input review/change request, milestones, delivery, lifecycle actions and linked finance | `work.tsx`; delivery/acceptance separate |
| `/app/clients` | Directory search/filter/sort/page, create contact/client, state and linked work | `work.tsx` |
| `/app/clients/[id]` | Contact/relationship facts, private notes, linked offers/projects/invoices, exact reviewed sample messages | `work.tsx`; Gmail capability gate |
| `/app/calendar` | Week/month/agenda, date/source/project filters, commitments/reservations, internal blocks, meeting proposal/sample invite, change proposals | `work.tsx`; proposed versus committed retained |
| `/app/money/invoices` | Combined reference/client/status/currency/sort/page, currency-separated outstanding summary, create draft | `money.tsx` |
| `/app/money/invoices/[id]` | Lines/identity/due/balance/history, draft edit, exact issue review, separate sample send, PDF preview/download, eligible void/replacement | `money.tsx`; exact finance commands |
| `/app/money/payments` | Requests and actual sample observations distinguished; combined state/currency/search/sort/page; separate currency totals | `money.tsx` |
| `/app/money/payments/[id]` | Gross/known fee/net/source, allocations, evidence, existing-status check, confirmed-receipt PDF, matching and issue worksheet | `money.tsx`; no fabricated settlement |
| `/app/money/expenses` | Estimate/recorded ledger, search/category/type/date/currency filters, editor/correction, archive/Undo, actual receipt file versions, CSV/ZIP | `money.tsx` |
| `/app/connections` | Tool directory, capability/role consent, explicit sample connect/reconnect/disconnect, status/evidence and return to interrupted work | `settings.tsx`; no OAuth |
| `/app/settings/profile` | Business/profile drafts, service CRUD, portfolio selection, publication review, public availability/capacity/defaults | `settings.tsx`; approved snapshot publication |
| `/app/settings/rules` | Six-role capability preferences, allowed connected tools, internal-work review, concurrency limits | `settings.tsx`; external actions still require approval |
| `/app/settings/preferences` | EN/ID locale, display timezone, reduced motion/focus/recap/notifications, save/default restoration | `settings.tsx`; translation coverage is partial across all domains |
| `/app/settings/knowledge` | Text/URL sources, allowed local uploads, metadata/original-byte inspection, replacement/history, visibility review, archive/Undo | `settings.tsx`; no PDF/image semantic extraction |
| `/u/[handle]` | Approved public profile, service list, actual bundled portfolio previews, availability and inquiry entry | `public.tsx` + `publicProfile` |
| `/u/[handle]/services/[slug]` | Published service terms/deliverables, portfolio and scoped inquiry | `public.tsx`; unpublished/stale unknown service unavailable |
| `/inquiry/[id]` | Scoped saved conversation, brief revision, file attachment, owner handoff and local voice transcript/playback | `public.tsx` + inquiry projection |
| `/buyer/[id]/offer` | Exact shared/current version, clear commercial terms, request changes, explicit accept confirmation, safe PDF, stale/expired states | `public.tsx` + buyer offer projection |
| `/buyer/[id]` | Shared project scope, payment instructions/sample events, required inputs, dates/milestones, files, messages, reported delivery and buyer acceptance/revision | `public.tsx` + buyer portal projection |

Related forms, previews and filters use query parameters or app-owned dialogs. Examples include `?new=1`, `?edit=1`, invoice `?review=1` / `?send=1`, payment `?match=1` / `?issue=...`, expense `?expense=...` / `?receipt=1` / `?export=1`. Query names differ by domain as implemented; use the current view code rather than inventing a parallel routing convention.

## 5. Shared interaction behavior

Shared UI includes buttons/link buttons, fields, status badges, panels, empty states, tabs, native-dialog overlays, confirmations, toast feedback and dirty-navigation handling. Inputs use controlled draft buffers; save commands update the normalized record, while cancel keeps the last committed values. Captured form versions reject stale saves rather than silently replacing a newer record. Unknown record IDs do not redirect to another client's record.

List filters combine before pagination and preserve relevant query state. Important returns preserve list context. Some domains use contained horizontal table scroll on phones rather than hiding consequential amounts. Root CSS supplies local fonts, visible focus, responsive layout and reduced-motion behavior.

Consequential actions expose exact terms/destination/version where applicable. Ordinary saved state is visible on records; a toast is supplemental. There is no product use of browser alert/confirm/prompt. Native dialogs supply modal isolation and keyboard behavior, with shared focus restoration. Final browser coverage determines which keyboard/focus/viewport cases were actually verified; a WCAG certification is not claimed.

Ordinary editor buffers are not universally reload-restorable. Explicit setup save/resume and buyer conversation draft persistence are implemented. The remaining full draft-management requirement is documented rather than hidden.

## 6. Team, task execution and events

The common Ask your team surface saves requests, selects curated supported intent/context and creates scoped runs. Arbitrary text has a visible supported-intent/manual clarification path. A curated run creates an appropriate saved artifact, not just a changed label. Role controls pause/resume/retry/cancel valid task states and preserve prior completed effects. Connection/capability and policy checks can block work.

Team state is rendered from runs, artifacts, handoffs and persisted events. The desktop studio has stable illustrated role positions on a muted map; compact layouts keep all six roles reachable. Task-linked cursor motion is bounded, noninteractive and reduced-motion aware. Catch-up reads recorded events and source/output links; it is not a newly invented AI narrative.

Sample events include workspace sequence, time, kind, concise summary, role/run context and record references. Production should add durable delivery, deduplication/gap recovery, explicit input versions and scoped stream authorization. The local engine does not run an autonomous background worker, live LLM or remote tool executor.

## 7. Acquisition, approval and commercial lifecycle

Opportunities preserve an original request/source and versioned requirements. Manual import includes mapping/preview; no internet scraping is performed. Scout assessment is deliberate and contextual. Qualification/decline/restoration do not impersonate buyer acceptance.

Offer drafts group scope, exact price/deposit, duration/prerequisites, expiry, buyer note and private planning inputs. Editing creates a successor and invalidates old approval. Approval and sharing are distinct: sharing requires current exact-version authority, recipient scope and the sample connection capability. Buyer-facing previews/PDFs explicitly exclude private effort/cost/risk/margin material. Current and historical terms can be compared.

A valid buyer acceptance atomically creates one accepted snapshot, project, provisional reservation, draft deposit invoice and payment request. Duplicate provider/command keys do not create another graph. The buyer must accept the current shared version through a matching active grant. Old/superseded/expired versions do not silently bind the current engagement.

Promotion uses the same version/authority pattern. Published service claims are checked for visibility/currentness. Copying text is not treated as publication. Explicit sample publication records content/destination/evidence/date and keeps an immutable published version; later edits become a new draft.

### Accepted amendments

Accepted scope remains versioned and earlier acceptance/payment history remains intact. A scope-only amendment can be accepted onto the same project.

Positive price/deposit changes are represented as reviewed successor terms. When acceptance increases required upfront funding, the adapter creates an authorized **`amendment_deposit`** draft invoice and payment request only for the positive deposit delta. It reuses the existing project/reservation and retains old invoices, receipts and allocations. `invoice_adjustments` records contract/deposit deltas and the fact that recording the adjustment itself moves no money.

Duration amendments calculate revised due dates from the retained committed start using business-day rules; required new funds and inputs must be complete before changed timing applies. `project_schedule_history` preserves the prior dates. Capacity and elapsed/conflicting timing checks remain explicit.

Reductions requiring an issued-invoice credit/refund are blocked with `FINANCIAL_REVIEW_REQUIRED`. Excess capacity returns `CAPACITY_CONFLICT`; timing that needs review returns `RESCHEDULING_REVIEW_REQUIRED`. These are deliberate negative branches, not permission to silently delete debt, refund funds, create a second project or change an accepted date. General credit/refund processing and free-form schedule negotiation remain production/extension work.

## 8. Work, clients and calendar

Projects are accepted work. Manual project creation requires an external acceptance reference; unaccepted offer editing never creates a project merely by viewing or saving it. Operational brief edits do not overwrite commercial snapshots.

Tasks support create/edit, owner assignment, professional versus administrative kind, dates/dependencies, private/shared visibility, complete/reopen/archive/restore and atomic selected-task completion. Professional work is assigned to the human owner. Milestones distinguish internal targets from agreed schedule changes. Optional owner review of already provided usable inputs does not add a redundant prerequisite.

Files persist actual original bytes. Project uploads and replacements retain metadata/history, visibility and shared scope. Actual available files preview/download; supported external links are labeled external; missing bytes remain unavailable. Reporting delivery selects explicit shared file versions and changes owner-reported delivery state. Buyer acceptance/revision is a separate action.

Client directory/detail shares canonical client/contact IDs, projects, offers and invoices. Private notes remain owner-facing. Message drafts show recipient, subject/body and attachments before sample sending; connection capability/approval gating applies. A disconnected provider retains the draft instead of manufacturing a sent message.

Calendar presents derived commitments/reservations plus deliberately entered proposals/internal blocks. Week, month and agenda views share filters and records. Meeting proposals have recipients/content review before sample invitation. Committed commercial events are read-only in the ordinary event editor; schedule-change proposals are saved distinctly. A proposal is not automatically buyer-agreed or externally invited.

## 9. Money and reconciliation

The implementation stores USD cents and IDR rupiah as integers. Quantity and ratio calculations use exact half-up arithmetic. Display summaries group currencies; they never add USD to IDR or confuse unknown values with zero.

Northstar baseline: accepted price when accepted is USD 450, 60% deposit USD 270. Example receipt is USD 270 gross / USD 5.40 fee / USD 264.60 net. A full USD 270 gross allocation pays the deposit invoice completely; the separate engagement remainder is USD 180. Known fee/net do not reduce gross invoice debt.

Invoices support exact decimal quantities, nonnegative line prices with positive total, client/billing contact/project/currency/due/buyer note, transient line removal/Undo, draft save and separate issue/send decisions. Issued content is immutable. Unpaid issued invoices may be voided with a reason; allocated invoices cannot be simply voided. Replacement drafts retain predecessor linkage. Real PDFs contain safe billing/line/amount/state fields.

Payment lists distinguish expected requests from confirmed sample observations. Detail shows original gross, known fee/net, source/evidence, allocated and unallocated gross, linked invoice and remaining debt. A request/status check does not create a receipt. Explicit sample-event controls are separate from ordinary accounting edits.

Receipt matching reviews exact receipt/invoice/revisions and amount. Only eligible same-client/same-currency issued invoices qualify. Allocation cannot exceed either available gross or invoice debt. Partial and wrong-currency cases retain outstanding debt and meaningful review issues. Provider event replay is idempotent; conflicting payloads are rejected.

Resolution choices are explicit: prepare an unsent information request, attach actual evidence/source link, enter a separately confirmed checked allocation, link a proven duplicate, or mark a mistaken match as not a match. An evidence note alone cannot create money or an expense. “Not a match” resolves that issue while retaining the observation and unpaid debt. A shortfall issue resolves only when its actual allocation condition is satisfied.

Expenses distinguish planned estimates from manual recorded costs. Recorded amount/date changes use `expense_corrections`: signed deltas plus reason/version/date while preserving the original. Filters and exports use effective amounts. Archive is recoverable and does not delete historical finance. Receipt attachment does not certify payment.

## 10. Public, buyer, account and onboarding

Public profile/service pages consume approved publication snapshots. Saving a private profile/service edit does not publish it. Starting an inquiry creates its own local client/contact/conversation/requirements/engagement/grant graph and does not grant access to an existing conversation merely because an email matches.

Buyer conversation and portal operations are scoped by engagement/grant. The buyer can revise a brief, attach allowed evidence, request owner involvement, review the current shared offer, request changes, explicitly accept, provide required inputs, see payment instructions, trigger labeled sample payment events, inspect shared files/messages and accept or request revision of reported delivery. Buyer text drafts are scoped by grant/engagement in local storage.

The voice sample plays the stored transcript only through an explicitly selected local English SpeechSynthesis voice. It has actual callback states and pause/resume/stop; a transcript/text fallback works without a suitable voice. It records no audio, requests no microphone and uses no remote voice service.

Sample auth validates fields but does not check a real account password. Name/email and setup state may be retained as local sample data; passwords are transient. Recovery grants expire after fifteen sample-clock minutes and are consumed/replaced explicitly. Local grants are navigation controls, not bearer-token security.

Onboarding saves business basics, services and in-progress service editor, optional portfolio, schedule/defaults and connection choices. Save and leave, Back, skip optional steps and explicit sample entry retain the saved setup. Completing setup creates private business drafts; publishing remains a later reviewed action.

## 11. Settings, knowledge and connections

Profile supports public name/handle/headline/biography/location/email, approved portfolio and services. Services have title/slug/description/deliverables and custom/fixed USD/IDR pricing, with edit/archive. Exact publication review creates `publication_snapshots` without exposing private fields.

Availability separates public intake from effort capacity. Working weekdays/hours, holidays, effort minutes, deposit percent and reservation hours are saved atomically with relevant profile/policy versions. Future defaults do not rewrite accepted terms. Role rules capture internal-work authority, stricter review choices, allowed connected tools and concurrency limits. External effects continue to need approval.

Preferences persist locale, IANA display timezone, motion, focus, recap and notification choices. The central EN/ID dictionary and shared primitives cover substantial interface text, especially Settings. Other domain text may remain English; full word-for-word bilingual completion is not claimed. Business dates remain Asia/Jakarta; full display-timezone consistency requires the checks noted in the final report.

Knowledge supports actual bounded file uploads, plain text and HTTP(S) source references, audience review, replacement history and archive/Undo. TXT content may be retained as text; PDF/images are not claimed to be automatically understood. Links are references, not a source-fetching service.

Connections are sample Gmail, Calendar and Drive capability records. Owners can review tool/role permissions, connect/reconnect/disconnect, refresh sample status and inspect usage evidence. Reconnecting does not automatically replay a consequential action; return and retry deliberately. No live OAuth/credential flow exists.

## 12. Persistence, uploads and exports

- JSON: `localStorage['crewmori.workspace.v1']`, runtime schema `1.1.0`, normalized tables and revision/sample clock.
- Actual binary files: IndexedDB `crewmori-files-v1` / `files`, referenced by attachment metadata. Browser data is origin/device-specific.
- Upload policy: matching PDF/PNG/JPEG/TXT extension, MIME and content signatures; maximum 10,485,760 bytes each and five per action; expense receipt selector is singular. User SVG/HTML/ZIP are rejected. Approved internal SVG assets remain usable.
- PDF: actual parseable jsPDF invoice/offer/receipt output from explicit fields; standard fonts have multilingual limitations.
- CSV: exact minor units, display currency, date/category/classification/project/archive/receipt status; correct quoting, UTF-8 and formula-prefix escaping.
- ZIP: only available original receipt bytes, safe filenames and JSON manifest with every scoped record, included/missing state and SHA-256 hashes. Availability is reviewed before generation; partial archives say so.
- Corruption/incompatibility: explicit saved-JSON export and sample reset; no automatic migration or silent discard.
- Cross-tab: newer storage snapshots refresh the local view; expected-version checks protect stale form submissions where passed. This is not transactional multi-user concurrency.

Reset replaces workspace records/scenario/idempotency history. Unreferenced binary garbage collection and full durable backup/restore are not implemented. Ordinary draft restoration is partial; do not treat an `editor_drafts` table alone as proof of every editor's resume feature.

## 13. Test evidence and browser verification

Automated suites currently live in `tests/engine.test.ts`, `acquisition.test.ts`, `public.test.ts`, `money-workflows.test.ts`, `money-downloads.test.ts`, `review.test.ts` and local helper tests added during refinement. They exercise actual runtime command inputs, not only seed schemas. Covered subjects include:

- Offer approval/share/acceptance separation, stale and duplicate protection, scope/client/destination consistency, amendment history and guarded negative branches.
- Exact gross/fee/net/currency math, partial/wrong/excess receipts, invoice issue/send/void invariants, immutable expense corrections.
- Strict reservation expiry and business-day commitment, inputs, project lifecycle and buyer delivery boundaries.
- Safe profile/offer/portal projections, unknown grants, shared-file scope, local account/recovery secrecy and publication isolation.
- Actual PDF structure, CSV escaping/UTF-8, ZIP integrity/missing manifests, upload signatures/size boundaries and local hashing.

**Final integrated commands, counts and manual browser evidence are recorded in `BUILD_STATUS.md` and `VERIFICATION.md`.** The final delivery owner must fill those records from the packaged revision. This brief does not claim that every listed action was manually clicked or that a visual/keyboard audit covered all combinations. Retained planning acceptance scripts validate specification/fixture integrity, not the runtime frontend.

Design review must compare actual Home/Team renderings against the two supplied anchors and then inspect representative list/detail/form, Money and buyer pages at actual desktop/mobile sizes. Accessibility/reduced-motion checks require actual interaction evidence. The review-and-revision instruction is retained, but private scores or critic transcripts are excluded from the delivery.

## 14. Precise remaining boundaries

| Area | Remaining work |
| --- | --- |
| True identity and isolation | Authentication/recovery, verified buyer identity, tenant memberships, protected server data and object access |
| Durable data | Database transactions, revision/concurrency protocol, server idempotency, schema migrations, backup/restore, retention and blob garbage collection |
| Live agent execution | Model/runtime choice, durable jobs/events, grounded source validation, tool allowlists, control checkpoints, budgets and safe cancellation |
| Tool connections | Actual OAuth/server secrets, scoped email/calendar/drive adapters, provider IDs, revoked access and timeout reconciliation |
| Commercial adjustments | Full credit/refund handling for negative adjustments and general negotiated schedule-change agreement; preserve existing guarded behavior |
| Real finance | Supported geographies/currencies/rails, authenticated webhooks, actual fees/FX, invoice/tax compliance, reconciliation/credit/refund policy |
| Universal drafts | Reload-restorable ordinary editor drafts across all domains, without storing passwords or unsafe upload state |
| Localization | Remaining domain prose/accessible labels and full chosen-display-timezone coverage |
| File/document production quality | Durable binary access, malware/content policy as appropriate, embedded multilingual PDF fonts and final document standards |
| Broader verification | Additional devices/browsers, assistive technology, multi-user/adversarial concurrency and actual configured integration tests |

A successful build, local payment state or coworker animation does not verify an external effect or financial/security correctness. The intended replacement boundary makes these next steps explicit without needing to redesign every screen.

## 15. Handoff/provenance rules for continuation

Read `README.md`, `MASTER_AI_CONTEXT.md`, the active design/UX contract and final verification record first. Then use the retained domain flow JSON, service/transition/projection contracts and fixture/schema sources to locate the exact behavior being changed. `ACQUISITION_IMPLEMENTATION.md` provides additional domain mapping. Maintain the central store and approvals rather than adding route-specific mock state.

Keep original brand/reference/skill material outside the public asset tree. Preserve the original historical context as its six ordered parts with manifest/restore helper and extracted core documents; do not reconstruct the large ZIP into the app or ship duplicate archives. Original context is evidence, not active instructions to install providers or revive obsolete visual/stack assumptions.

The final source archive has one obvious installable root, includes the lockfile and local runtime assets, and excludes dependency caches, `.next`, browser profiles, temporary binaries and unrelated files. The standalone developer Markdown must match the packaged copy exactly. Any final unresolved limitation must remain visible in the handoff rather than being relabeled as completed.


## Final implementation evidence and detailed differences

The final integrated checks, exact browser coverage and delivery integrity are recorded in `VERIFICATION.md`. The source inventory maps 34 routes, 88 flows, 734 original controls and 363 named steps. `TRACEABILITY.md` and `CONTROL_IMPLEMENTATION_MAP.json` also register 30 implementation additions and explicitly list 12 detailed interaction differences. A mapped control is not an individual manual test pass.

Operational rescheduling is implemented through `project.proposeReschedule`, an owner-reviewed offer amendment, exact buyer acceptance and prerequisite checks. It reuses the existing project/reservation and preserves previous schedule/financial history. Owner and buyer offer review surfaces show the proposed dates in Asia/Jakarta. A proposal cannot silently overwrite a commitment.

Shared native form labels are owned by `components/ui.tsx`. Invoice dates use a named native control with FormData captured on submission. In-app dirty links and same-document Back navigation receive a discard confirmation; full-document unload behavior depends on native browser support, and ordinary unsaved editor buffers are not a universal recovery store. English is complete as the primary UI language; Indonesian covers shared controls and much of Settings, with remaining domain prose tracked as partial.


Final integrated verification: 95 automated tests passed; clean installation, TypeScript, lint and production build passed. The browser checked the 34 route patterns and selected owner/buyer/setup/Money/locale journeys at the widths recorded in VERIFICATION.md. This does not upgrade partial controls or unverified branches to complete.


## Presentation patch 1.0.1

This update adjusts spacing and responsive shared controls only. Team footer labels/buttons, search borders/focus, filter widths, mobile sample labels, command-field shrink behavior, dismissal targets and the existing unread indicator are refined. The command, financial, permission and lifecycle contracts are unchanged. See docs/POLISH_NOTES.md inside the source repository for exact files and review evidence.


## Taste refinement release 1.1.0

The current presentation pass applies the bundled Taste skill through the Crewmori adapter and uses the specific Linear/Basecamp references recorded in `TASTE_REFINEMENT.md`. It keeps the supplied brand, local Newsreader/Inter fonts, six illustrations, Global Studio, all routes and local business behavior.

Home uses unboxed briefing facts, a flat Scout surface, a native request/offer comparison disclosure, a divided terms rail, and one adaptive saved-update strip. Dismissed updates reflow; dismissing all shows a truthful caught-up state with Undo. Team has larger character art, readable written states, selected-control semantics, quiet chrome and dated saved assessments. The public introduction has clearer body typography/copy and open benefit sections. Leads share a ruled list; promotion previews and secondary actions are quieter.

Runtime changes are limited to `src/app/globals.css`, `src/views/home-team.tsx`, `src/views/acquisition.tsx`, `src/views/acquisition.css`, `src/views/public.tsx`, `src/views/public.css` and `src/lib/i18n.ts`. Commands, store, projections, fixtures and untouched Work/Money/Settings views are byte-identical to release 1.0.1. The only added control is the non-mutating comparison disclosure, registered as `impl.priority.compare_request_offer`; implementation-added entries now total 30, separate from the original 734.

Package and lockfile identify 1.1.0; persistence schema remains 1.1.0. `DESIGN.md` and `docs/design-tokens.json` record the evolution and runtime mapping. `TASTE_REFINEMENT.md` and `VERIFICATION.md` distinguish this revision's selected checks from the broader original verification. The original detailed interaction/localization/production limits remain applicable. This source has not been pushed to the founder's GitHub repository or public deployment.
