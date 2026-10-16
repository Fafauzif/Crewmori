# Crewmori build status

Updated 16 October 2026. This document distinguishes implemented local behavior from simulated external effects and verification evidence. It supersedes the input pack's “no frontend implemented yet” status. It does not supersede retained product/flow requirements by silently declaring them tested.

## Deliverable status

| Area | Actual status |
| --- | --- |
| Installable source | One Next.js 16.2.1 / React 19.2.4 / TypeScript 5.9.3 repository with pinned npm lockfile and bundled runtime assets |
| Declared route patterns | All 34 patterns are routed to implemented domain surfaces; this is a source inventory, not a claim that every control/alternate state received manual browser testing |
| Shared records | Normalized store, pure command engine, persisted committed data, twelve resettable scenarios, sample clock |
| Real local downloads | Generated invoice/offer/receipt PDFs, escaped expense CSV, receipt ZIP with original bytes/manifest/hashes |
| Live provider effects | None; email, tools, tasks, publishing, account recovery and payments remain explicitly simulated |
| Production deployment | GitHub/Vercel-ready project and instructions; no live Vercel deployment claimed |
| Complete production system | Out of this frontend scope; authentication, server isolation, durable data/jobs, provider credentials and financial rails are not implemented |

## Verification record

Checks executed on 16 October 2026. Detailed observations and limits are in [VERIFICATION.md](VERIFICATION.md).

| Check | Final evidence |
| --- | --- |
| Lockfile installation | Clean `npm ci` in a separate directory passed; 375 packages installed |
| Type checking | `npm run typecheck` passed |
| Lint | `npm run lint` passed; zero errors and warnings |
| Automated tests | `npm test`: 95 passed; zero failed/skipped/cancelled |
| Production build | Optimized Next.js build passed, including a separate clean-install build |
| Route checks | All 34 route patterns opened as concrete routes; invalid buyer/project links failed closed |
| Home/Team reference comparison | Original anchors and real browser renderings inspected; shared composition, assets, typography and spacing reviewed |
| Owner/buyer journey | Exact approve/share/accept, invoice instructions, USD270 receipt, two inputs, 19–23 October schedule, synchronized owner records |
| Other browser work | USD100 manual invoice/due date/issue, onboarding save/resume/skip/finish, EN/ID preferences and reduced motion |
| Layout widths | 1440, 1280, 1024 and 390px iframe layout viewports; selected screenshots/DOM geometry inspected |
| Interaction checks | Modal focus, Escape, named fields, dirty link and same-document Back confirmation observed; exhaustive keyboard/device coverage remains unverified |
| Static UI audit | Strict audit: zero violations, unresolved owners or warnings |
| Archive integrity | Six part hashes and ordered original-context stream hash match; clean source inventory and standalone developer byte equality checked when packaging |

The tests validate actual local behavior and export bytes. They do not certify every control in the original registry. No live deployment, real integration, real payment or WCAG conformance is claimed.

## Implemented local capability groups

- Shared owner shell, Home briefing, six-role Team studio and activity; search, notifications, recap, task inspector, curated delegation, sample scenarios and day advancement.
- Opportunities/source/assessment; versioned offers with current/historical comparison, exact review, separate approval/share, safe buyer links/PDF, withdrawal and constrained amendments; promotion draft/review/sample publication.
- Projects list/board, accepted-work entry, tasks/milestones, required inputs, actual local files, client messages, delivery reporting and separate buyer acceptance; clients and calendar proposals/commitments.
- Invoices, payment requests/observations/allocations/issues, expenses and correcting entries, actual receipt storage and exports.
- Public approved profile/service projection, inquiry/brief/messages, local voice playback fallback, exact buyer offer acceptance and continuation portal.
- Sample sign-in/sign-up/recovery/reset; resumable onboarding; business profile/services/availability, role rules, preferences, sources and sample connections.

## Material partial areas and limits

| Item | Current behavior | Required follow-up |
| --- | --- | --- |
| Accepted commercial amendments | Reviewed scope/positive-price/deposit/duration successors reuse the existing project and preserve prior acceptances, invoices and payments. Positive required-upfront deltas create authorized amendment-deposit drafts/requests. New prerequisites gate revised dates; audit and schedule history preserve previous terms. | Reductions that need credits/refunds return `FINANCIAL_REVIEW_REQUIRED`; insufficient effort capacity returns `CAPACITY_CONFLICT`; elapsed or conflicting timing returns `RESCHEDULING_REVIEW_REQUIRED`. Saved operational schedule proposals are not accepted agreements. |
| Schedule-change proposals | Work creates an amendment, exact buyer acceptance applies agreed dates after prerequisite checks, and owner review handles later application on the existing project/reservation. | Full browser retest of every expired/renewed branch remains outside the selected browser journey; domain regressions pass. |
| Ordinary form drafts | Separate React buffers, captured versions and dirty-change guards; committed records persist. Onboarding has explicit persisted save/resume. | A complete reload-restorable draft manager is not implemented for every editor. |
| Localization | Central EN/ID dictionary; shared primitives and extensive Settings translation. Some domain prose and native labels remain English. | Complete all remaining domain/accessible-label translations and verify layout and locale behavior. |
| Display timezone | Preference is retained; business calculations remain Asia/Jakarta. | Verify every display formatter consumes the chosen preference before claiming full multi-timezone presentation. |
| Persistence/concurrency | Versioned localStorage plus cross-tab refresh; optional expected-version checks and keyed replay; actual files in IndexedDB. | Add transactional server concurrency, migrations, durable upload metadata/binary commits and retention/garbage collection. LocalStorage is not multi-user isolation. |
| PDF typography | Valid generated documents using standard PDF fonts and explicit field lists. | Add embedded fonts and comprehensive Unicode tests for multilingual production documents. |
| Accessibility/browser breadth | Shared semantic controls, dialogs, focus/dirty handling and reduced-motion CSS exist. | Only the checks in the final verification record can be described as verified; no WCAG conformance certification is claimed. |
| Financial product | Exact sample invoice/receipt arithmetic and correcting history. | Country-specific invoice/tax/credit/refund/FX/legal policies and actual payment-provider reconciliation remain production responsibilities. |

## Reproduction and continuation

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from the repository root. Use a fresh browser state when checking the baseline. To reproduce alternative financial/lifecycle histories, use the scenario menu instead of merging branches.

For a failing command, retain its exact input, actor/grant, record versions, idempotency key, scenario and sample clock. Failed commands return the prior state and retain editor values. For an unavailable file, inspect its attachment metadata and IndexedDB blob; never generate fake file bytes as recovery.

For storage corruption, export the saved JSON from the recovery banner before resetting. Runtime schema is `1.1.0`; automatic migration is not implemented. Scenario reset replaces normalized records and command receipts. Local binary garbage collection is a separate future concern.

Read `MASTER_AI_CONTEXT.md` and `DEVELOPER_FUNCTIONALITY.md` before making architectural changes. Retained original context/brand/reference/skill material is provenance and specification evidence; it must not be served publicly or treated as a live provider implementation.


## Presentation patch 1.0.1

Focused spacing review complete. The latest package contains the shared-control and responsive polish described in POLISH_NOTES.md; all 95 regression tests, lint, TypeScript, strict static UI audit and production build pass. The public baseline was inspected; publishing this revision requires committing the updated extracted files to the user's Vercel-connected repository.


## Taste refinement 1.1.0

The visual revision preserves local command/projection/data behavior. TypeScript, lint, all 95 regression tests, production build and strict static UI audit pass for this revision. Home/Team and public/acquisition layouts were inspected in Chromium at the viewports recorded in TASTE_REFINEMENT.md, with an independent review and correction pass. The new native comparison disclosure, update dismissal/caught-up/Undo, lead no-results/clear, and teammate inspection were exercised. Original detailed functional differences and verification limits remain unchanged. No new dependency or real integration was added, and the public deployment was not changed.
