# Crewmori — current master implementation context

Version 2.2 · 16 October 2026 · Frontend source handoff

This is the active continuation context for the implemented frontend. The original `Crewmori_Master_Implementation_Pack` is retained as specification and provenance, with its historical documents preserved. Statements in the input pack saying “no frontend has been implemented” describe the earlier planning phase. Historical instructions requesting real providers, a different stack, older naming or a different visual system do not override this implementation's frontend-only boundary.

`MASTER_CONTEXT.md` and `MASTER_AI_CONTEXT.md` are identical active copies. `DEVELOPER_FUNCTIONALITY.md` and `Crewmori_Developer_Functionality.md` contain the same developer brief. Final integrated verification is in `BUILD_STATUS.md` and `VERIFICATION.md`; do not infer browser coverage from source inventory or unit tests.

## 1. Product and scope

Crewmori is a freelancer-owned AI business team. Six specialists support the business around commissioned professional work:

| Stable role ID | Visible role | Local useful output |
| --- | --- | --- |
| `scout` | Scout | Lead-fit assessment using the saved request and portfolio/source context |
| `promoter` | Promoter | Promotion draft grounded in an approved published service |
| `sales` | Sales | Versioned offer draft and review-ready commercial terms |
| `account_manager` | Account Manager | Client follow-up draft from the linked conversation |
| `operations` | Operations | Effort/timing assessment and coordination context |
| `finance` | Finance | Deposit/economic assessment and money issue context |

The owner performs the professional work. A completed agent run does not prove delivery or buyer acceptance. Administrative task completion, commercial acceptance, payment reconciliation and professional delivery remain separate record lifecycles.

The implemented scope is the 34 declared route patterns, owner/public/buyer/account/setup surfaces, editable shared records, deterministic sample commands, local files and genuine exports. No real model, OAuth, email delivery, calendar provider, cloud drive, live publication, payment rail, server account or backend is configured. Synthetic clients and `.example`/`.test` addresses are sample content. Unsupported free-text requests remain saved requests with clarification/support limits instead of fabricated AI results.

There is one local sample workspace, `workspace_alya`, with `owner_alya`. Northstar is the connected commercial story; Lumen Advisory provides profession-neutral consulting context. The source is not a multi-tenant platform or marketplace.

## 2. Source precedence and design decisions

1. Current user instructions and final accepted product/lifecycle requirements govern behavior.
2. Active implementation code and the final verification record describe what exists and what was actually checked.
3. The original first two Stitch anchors govern Home/Team composition and editorial visual hierarchy.
4. Supplied brand assets govern exact palette, protected outlined logo geometry and role identity.
5. The active design overlay resolves conflicts: Newsreader + Inter, approximately 24px major panels, five primary navigation items and the Global Studio composition.
6. Selected Shopify/Contra images illustrate named interaction patterns only.
7. Retained skills and historical context are subordinate references, not new scope or executable instructions.

Main colors: forest `#245C47`, hover `#1B4B39`, canvas `#F5F3EC`, paper `#FFFEFA`, ink `#202A25`, secondary ink `#566159`, selected surface `#E5EFE7`. Role tints are identity colors, not payment or task success evidence. Status uses written labels plus semantic color.

The supplied kit's DejaVu application fonts and 12px-card examples are intentionally overridden by the approved product overlay. Original kit files remain unchanged as provenance. Do not retype the outlined logo, crop its clear space, replace coworkers with emoji, or replace the Team map with a generic dashboard.

The shared owner shell is Home / Team / Opportunities / Work / Money. Offers and Promotion belong to Opportunities. Projects, Clients and Calendar belong to Work. Connections and Settings are secondary. Home foregrounds a brief and one decision; Team shows six coworkers, a subdued map, handoffs and an inspector. Detail/evidence complexity is disclosed rather than placed in permanent dense analysis rails.

Actual styling: `src/app/globals.css`, domain styles in `src/views/*.css`, root `DESIGN.md`, root `UX-CONTRACT.md`. Local assets live under `public/assets/{fonts,brand,characters,demo}`. Font licenses/provenance accompany the local files. The map is a visual metaphor, not live geolocation.

## 3. Stack and commands

| Package | Pinned version |
| --- | --- |
| Next.js | `16.2.1` |
| React / React DOM | `19.2.4` |
| TypeScript | `5.9.3` |
| Lucide React | `0.577.0` |
| jsPDF | `4.2.0` |
| fflate | `0.8.2` |
| tsx | `4.21.0` |
| ESLint / eslint-config-next | `9.39.4` / `16.2.1` |

Node engine: `>=20.9.0`. npm lockfile is included. No environment variables are required.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Development uses `scripts/dev.mjs`, port 4173 by default; `npm run dev -- --port 3000` overrides it. Production start also uses 4173. Tests use Node's test runner with `--import tsx`, avoiding the standalone tsx CLI's IPC requirement. Vercel imports the repository root with Next.js preset, `npm ci`, `npm run build` and the default Next output. No forced static export is configured. Shipping a deployable source project does not establish that a live deployment was performed.

## 4. Architecture and ownership

| File/module | Responsibility |
| --- | --- |
| `src/app/[[...slug]]/page.tsx` | Catch-all App Router page with suspense; permits direct local route loads |
| `src/app/layout.tsx`, `error.tsx` | Metadata/layout and app error boundary |
| `src/components/application.tsx` | Path dispatch to domain views, initial hydration state and local owner-session navigation guard |
| `src/components/ui.tsx` | Buttons, field labels/errors, panels, badges, empty states, tabs, native-dialog overlays, discard confirmation and navigation guard |
| `src/components/shell.tsx` | Primary/secondary navigation, global record search, scenarios, notifications, recap, delegation |
| `src/views/home-team.tsx` | Briefing, studio, role/task inspection and activity |
| `src/views/acquisition.tsx` | Opportunities, offers, promotion |
| `src/views/work.tsx` | Projects, tasks/milestones/files, clients/messages, calendar |
| `src/views/money.tsx` | Invoices, requests/receipts/issues, expenses, correction/attachment/export views |
| `src/views/public.tsx` | Public entry/profile/service, account/recovery/setup, inquiry, offer and buyer continuation |
| `src/views/settings.tsx` | Profile/services, availability/defaults, role rules, preferences, knowledge and connections |
| `src/lib/store.tsx` | React provider, hydration/persistence, notifications and storage recovery |
| `src/lib/engine.ts` | Atomic sample command adapter, data validators, state transitions, event emission and scenarios |
| `src/lib/types.ts` | Normalized runtime envelope, generic entity/result types and display/value helpers |
| `src/lib/projections.ts` | Fresh allowlisted public/buyer DTOs and scoped attachment/message projections |
| `src/lib/downloads.ts` | Actual PDF/CSV/ZIP bytes, file checks, binary storage, hashes and download initiation |
| `src/lib/local-crypto.ts` | Sample identifier/hash helpers with a restricted-context fallback; not an authentication system |
| `src/lib/i18n.ts` | Central English/Bahasa dictionary used by shared UI and participating views |
| `src/lib/fixture.json`, `scenarios.json` | Baseline and alternative history inputs |
| `src/lib/spec-contracts.ts` | Retained typed domain vocabulary; runtime validation lives in the engine |

No domain keeps a second Home/Team/buyer copy of commercial records. Lists, details, summaries and projections read the same normalized tables through the shared store. Route dispatch is client-side inside Next; unknown IDs produce unavailable states rather than substituting Northstar.

## 5. State, commands and persistence

Seed/branch schema: `1.0.0`. Runtime envelope: **`1.1.0`**. The envelope contains `schema_version`, `sample_clock`, normalized `tables`, `revision`, `scenario`, `dirty`, sample `session` and `ui` state. Records have stable IDs, versions, workspace/audience, and creation/update timestamps. Runtime models extend the seed instead of treating empty seed tables as a ban on new records.

Important additional tables include `publication_snapshots`, `editor_drafts`, `team_requests`, `notification_states`, `issue_actions`, `publication_evidence`, `sample_sessions`, `recovery_grants`, `capability_preferences`, `local_accounts`, `expense_corrections`, `allocation_reversals`, `team_notes`, `change_requests`, `invoice_adjustments` and `project_schedule_history`. Table availability alone is not proof of complete UI coverage; ordinary editor restoration remains partial.

The main adapter is:

```ts
createState(scenarioId?: string): StoreState
execute(state: StoreState, type: string, input: Input): {
  state: StoreState;
  result: Result;
}
```

`execute` clones the prior state, validates the selected operation, applies dependent changes atomically, records a command outcome/event, then returns a new snapshot. A rejected command returns the original state. The React store persists the new JSON before committing its UI state, so a localStorage write failure does not claim a saved domain change.

Idempotency receipts are namespaced by actor, operation type and caller key, and include a stable payload fingerprint. Replaying the same key/payload returns the prior result before mutable version checks. Reusing that key with different input fails. If the caller omits a durable key, the adapter synthesizes one from revision/type; this is a demo fallback, not a production retry strategy. `expected_version` checks operate where supplied; a server replacement must make required versions and idempotency keys explicit for each consequential endpoint.

Local JSON key: `crewmori.workspace.v1`. Actual binary files: IndexedDB `crewmori-files-v1`, object store `files`. Cross-tab storage events refresh newer snapshots; they do not provide database-grade concurrent-writer isolation. Hydration checks envelope compatibility/basic shape, not a complete adversarial validation of every persisted entity. There is no migration engine: incompatible/corrupt data exposes export/reset rather than being silently overwritten.

Onboarding and buyer conversation drafts have dedicated persistence. Most ordinary form buffers are separate React state with captured record versions and dirty guards. Do not promise every uncommitted editor resumes after reload. Scenario reset replaces canonical state/command history; unreferenced binary garbage collection is not implemented. No password, live token or credential belongs in either storage system.

## 6. Sample scenarios and clock

Frozen baseline: `2026-10-16T09:00:00+07:00`. Business timezone: Asia/Jakarta. Default weekdays: Monday–Friday, no seeded holidays. The clock changes only through deliberate sample controls; animations and ordinary navigation do not create commercial effects.

| Scenario ID | Coherent branch |
| --- | --- |
| `review_ready` | Awaiting owner review; no Northstar share, acceptance, project, reservation, invoice or receipt |
| `first_use` | Resumable setup and explicit sample entry |
| `running_handoff` | Saved in-progress tasks/handoffs; unfinished outputs absent |
| `shared_offer` | Exact reviewed version shared; no buyer acceptance yet |
| `accepted_awaiting_prerequisites` | Accepted project, provisional reservation, draft deposit invoice and created request |
| `active_paid_project` | Full valid deposit and usable inputs; committed start/delivery dates |
| `partial_receipt` | USD 100 gross against USD 270 deposit; USD 170 still owed |
| `wrong_currency_receipt` | IDR observation cannot settle the USD invoice |
| `disconnected_gmail` | Reviewed content retained; reconnect and deliberate retry |
| `recoverable_task_failure` | Failed Finance work with no fabricated success artifact |
| `stale_offer` | Old shared version superseded; stale acceptance unavailable |
| `empty_filtered_list` | No matching results under supplied filters; canonical data remains |

Each branch starts from a fresh baseline and complete overlays. Scenarios are alternative histories, not a sequence to merge. Loading after edits requires explicit discard confirmation. The active paid branch uses a prior acceptance and prerequisites to justify **16 October 09:00 → 22 October 17:00**; the review-ready branch has not done those things.

## 7. Commercial and money invariants

Northstar requested four assets for USD 500 in five business days. The proposed reduced scope is two hero launch animations for **USD 450**, five business days, with a **60% / USD 270 deposit**. Private assessment assumptions include approximately 12 hours, a sample 2% fee assumption and illustrative FX; these do not become buyer promises or live quotes.

Use integer USD cents and integer IDR rupiah. Monetary ratios and invoice quantities use exact half-up arithmetic. Gross USD 270.00, known sample fee USD 5.40 and net USD 264.60 are distinct values. A full USD 270 gross allocation pays a USD 270 deposit invoice. The engagement's remaining USD 180 is separate from that paid invoice's zero balance. Do not subtract net cash from gross debt or sum currencies.

The sequence is intentionally explicit:

- Saving an offer creates a current version; editing invalidates prior approval/share authority.
- Approval is exact content/recipient authority. Sharing is a separate sample effect.
- Buyer acceptance requires a valid scoped grant and current shared version; it creates one acceptance, project, provisional reservation, deposit draft and request.
- Viewing payment instructions or explicitly issuing the deposit request makes the accepted-offer request available. Merely visiting a list does not issue it.
- Observed sample receipts and posted same-client/same-currency gross allocations determine invoice settlement. Unknown requests and unmatched observations cannot manufacture money.
- Full deposit plus all required usable inputs must arrive strictly before the 48-hour provisional expiry. Then start is next business day at 09:00; the fifth business day counting start as day one is due at 17:00.
- At/after expiry, keep money/evidence but require a reschedule; do not silently promise new dates.
- Owner-reported professional delivery and buyer acceptance remain separate. Task completion cannot impersonate either.

Invoice states are draft/issued/partially_paid/paid/void; overdue is derived. Request states describe expected/attempted payments, not received money. Receipt observations retain gross/fee/net/source; allocation states are posted/reversed. Expense classification is estimated versus recorded, separate from the preserved `paid` boolean. Correcting entries append signed deltas while retaining the original expense.

Accepted amendments use reviewed successor offer terms on the same existing project/reservation, retaining earlier acceptances, invoices, receipts and allocations. Scope changes and positive price/deposit changes are supported. If required upfront funding increases, only that positive difference becomes an authorized `amendment_deposit` draft invoice and request. `invoice_adjustments` audits contract/deposit differences and states that recording the adjustment moves no money. Full allocated gross across original and amendment deposit invoices determines funding completeness.

A duration change derives the new due date from the retained committed start using business days. Required additional funding and usable inputs gate its application; `project_schedule_history` retains the previous and changed dates. Reductions requiring invoice credit/refund fail with `FINANCIAL_REVIEW_REQUIRED`, excess effort capacity with `CAPACITY_CONFLICT`, and elapsed/conflicting timing with `RESCHEDULING_REVIEW_REQUIRED`. These explicit negative branches preserve the existing commitment. Separately saved operational schedule-change requests remain proposals, not accepted amendments.

## 8. Public/buyer boundary and sample identity

`publicProfile`, `inquiryProjection`, `buyerOffer` and `buyerPortal` in `src/lib/projections.ts` construct fresh, named-field DTOs. Publication snapshots are separate from private profile/service edits. Public pages show only approved snapshots. Buyer grants must match engagement/contact/state/expiry; shared messages and attachments must match their conversation/project scope and visibility. Other clients, private notes, internal economics and owner event streams are excluded from the rendered buyer DTOs and buyer-safe PDFs.

This is a presentation/data-contract demonstration inside a client-only sample. The entire owner fixture is present in the browser application's local store; a developer-tools user can inspect it. A frontend guard or an opaque-looking local grant is not production authorization. Before adding real client data, move authorization, safe queries and response projection to the server and stop shipping owner data to buyer clients.

Sample sign-in validates input and opens a local session without verifying a real password. Sign-up retains a local name/email and setup state. Recovery prepares a local grant valid for fifteen sample-clock minutes; reset consumes that grant without changing a real credential or sending email. Password input remains transient and is cleared after submission.

The buyer voice demonstration uses feature-detected SpeechSynthesis and an explicitly selected **localService=true English voice** only. No microphone, remote voice, API or recording is used. A complete transcript and text conversation remain available when no compatible local voice exists.

## 9. Files, outputs and localization

`downloads.ts` validates extension, MIME and safe type signatures for PDF/PNG/JPEG/TXT. Each file is at most 10,485,760 bytes; each action at most five; the expense receipt selector accepts one. Actual bytes are committed in IndexedDB before metadata becomes available. Historical replacements retain prior references. External HTTP(S) links are labeled links, not locally stored files; arbitrary external content is not fetched as evidence.

Invoice/offer/receipt PDFs are actual jsPDF documents assembled from explicit fields. CSV escapes commas, quotes, newlines and spreadsheet-formula prefixes and retains currency/amount-minor/classification columns. Receipt ZIPs use actual available files with JSON manifests, SHA-256 hashes and explicit missing-receipt entries; a partial archive is labeled accordingly. Standard PDF fonts are a known multilingual limitation.

English is the default. `i18n.ts` centralizes EN/ID phrases; shared primitives and extensive Settings content are translated. Some Work/Money/acquisition/public prose or native labels remain English. User-authored content is not machine-translated. The display timezone preference is separate from Asia/Jakarta commercial calculations; verify full presentation coverage before claiming every date follows that preference.

## 10. Verification, evidence and remaining work

Use the exact final commands/results and browser scenarios recorded in `BUILD_STATUS.md` and `VERIFICATION.md`. Root packaging must fill final evidence placeholders after the final integrated source revision. Do not treat retained planning fixture verifiers or route/control registries as proof that every browser interaction passed. Automated checks cover domain transitions, stale/replay behavior, projections, exact money, files and important negative cases; browser coverage is separately stated.

Material current limits are recorded in BUILD_STATUS: constrained accepted amendments/schedule proposals, partial universal draft restoration, partial full-language coverage, localStorage concurrency and migrations, file retention/garbage collection, generic PDF multilingual typography, and production-only services/security/financial policy. None should be concealed by removing the relevant source requirement.

Production extension points:

1. Replace local sessions/grants with authenticated owner and scoped buyer identities; enforce workspace isolation server-side.
2. Replace browser JSON/blobs with durable database/object storage, versioned migrations and transactional record/file relationships.
3. Replace `execute` sample transitions with typed server commands preserving expected versions, idempotency receipts, exact approvals and event semantics.
4. Add durable bounded agent jobs, checkpoints, cancellation at effect boundaries, source/tool allowlists and observable outputs without exposing private reasoning.
5. Add provider-specific OAuth/secrets on the server, capability revocation, exact send/publish/invitation approval and uncertain-outcome reconciliation.
6. Add country/currency/rail/invoice/credit/refund/tax policy, authenticated provider evidence and gross allocation reconciliation. Do not assume escrow or a guaranteed FX rate.
7. Extend reviewed credit/refund and conflicted rescheduling agreements, complete localization/draft persistence, and broaden real browser/accessibility tests.

## 11. Retained evidence and delivery integrity

Keep the original planning master/developer brief, domain flows, control registry, fixture/schema sources, contract documents, original brand kit, first two anchors, selected Shopify/Contra references, licensed skill snapshots and acceptance instructions outside `public/`. Historical research is retained losslessly as its six ordered parts plus hash manifest and restore helper; do not also reconstruct the oversized original ZIP inside this repository.

The application root is the repository/archive root. The deliverable excludes `node_modules`, `.next`, temporary binaries/caches, runtime browser profiles, private captures and unrelated workspace files. Root packaging preserves provenance and checks that the standalone `Crewmori_Developer_Functionality.md` is byte-identical to its in-ZIP copy. Documentation and archived guidance are developer context, not client runtime assets or proof of an external integration.


## Final implementation evidence and detailed differences

The final integrated checks, exact browser coverage and delivery integrity are recorded in `VERIFICATION.md`. The source inventory maps 34 routes, 88 flows, 734 original controls and 363 named steps. `TRACEABILITY.md` and `CONTROL_IMPLEMENTATION_MAP.json` also register 30 implementation additions and explicitly list 12 detailed interaction differences. A mapped control is not an individual manual test pass.

Operational rescheduling is implemented through `project.proposeReschedule`, an owner-reviewed offer amendment, exact buyer acceptance and prerequisite checks. It reuses the existing project/reservation and preserves previous schedule/financial history. Owner and buyer offer review surfaces show the proposed dates in Asia/Jakarta. A proposal cannot silently overwrite a commitment.

Shared native form labels are owned by `components/ui.tsx`. Invoice dates use a named native control with FormData captured on submission. In-app dirty links and same-document Back navigation receive a discard confirmation; full-document unload behavior depends on native browser support, and ordinary unsaved editor buffers are not a universal recovery store. English is complete as the primary UI language; Indonesian covers shared controls and much of Settings, with remaining domain prose tracked as partial.


Final integrated verification: 95 automated tests passed; clean installation, TypeScript, lint and production build passed. The browser checked the 34 route patterns and selected owner/buyer/setup/Money/locale journeys at the widths recorded in VERIFICATION.md. This does not upgrade partial controls or unverified branches to complete.


## Presentation patch 1.0.1

The user-deployed baseline at https://crewmori.vercel.app/ was reviewed alongside the supplied spacing crop. The revised source improves decision-card action spacing, canonical search borders/focus, acquisition filter alignment, command-field shrinking, mobile sample labels, update dismissal targets, the existing unread indicator and Money filter label width. It changes four runtime presentation files and no business services, projections or fixtures. Current build/test/browser evidence and GitHub redeployment steps are in POLISH_NOTES.md. The patch has not been pushed to the user's repository by this run.


## Taste refinement release 1.1.0

The current presentation pass applies the bundled Taste skill through the Crewmori adapter and uses the specific Linear/Basecamp references recorded in `TASTE_REFINEMENT.md`. It keeps the supplied brand, local Newsreader/Inter fonts, six illustrations, Global Studio, all routes and local business behavior.

Home uses unboxed briefing facts, a flat Scout surface, a native request/offer comparison disclosure, a divided terms rail, and one adaptive saved-update strip. Dismissed updates reflow; dismissing all shows a truthful caught-up state with Undo. Team has larger character art, readable written states, selected-control semantics, quiet chrome and dated saved assessments. The public introduction has clearer body typography/copy and open benefit sections. Leads share a ruled list; promotion previews and secondary actions are quieter.

Runtime changes are limited to `src/app/globals.css`, `src/views/home-team.tsx`, `src/views/acquisition.tsx`, `src/views/acquisition.css`, `src/views/public.tsx`, `src/views/public.css` and `src/lib/i18n.ts`. Commands, store, projections, fixtures and untouched Work/Money/Settings views are byte-identical to release 1.0.1. The only added control is the non-mutating comparison disclosure, registered as `impl.priority.compare_request_offer`; implementation-added entries now total 30, separate from the original 734.

Package and lockfile identify 1.1.0; persistence schema remains 1.1.0. `DESIGN.md` and `docs/design-tokens.json` record the evolution and runtime mapping. `TASTE_REFINEMENT.md` and `VERIFICATION.md` distinguish this revision's selected checks from the broader original verification. The original detailed interaction/localization/production limits remain applicable. This source has not been pushed to the founder's GitHub repository or public deployment.
