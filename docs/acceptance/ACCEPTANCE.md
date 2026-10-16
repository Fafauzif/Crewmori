# Observable frontend acceptance

These checks are requirements for the next implementation run. They have not been executed against a website in this pack-authoring run. The pack's own integrity checks are a separate report.

## Critical completion gates

All 34 required route patterns in `spec/ROUTES.json` exist with useful states. Every registered control and every control added during implementation has its declared behavior. Canonical flow JSON is not a menu of optional ideas.

The clean source installs and builds; the application runs without credentials. No dead-end navigation, placeholder `href="#"`, fake save/download, fabricated external effect, missing scoped experience, buyer-private data leak, broken core arithmetic, or contradictory cross-screen state may remain.

Home and Team must be directly compared with both primary anchors, using actual application screenshots. A generic dashboard with the right colors is insufficient. Check serif hierarchy, portrait/character proportions, warm paper panels, generous rhythm, quiet shell, Home decision hierarchy, Team map/positions/handoffs and clear owner review.

## Required end-to-end journeys

1. **First use:** enter sample account, change profession/services/timezone, skip an optional connection, resume onboarding after navigation/reload, and arrive at a coherent Home. A missing optional connection does not block demo entry.
2. **Northstar owner review:** open the same offer from Home, Team and Offers; inspect evidence; edit/cancel without mutation; edit/save into a new version; approve the current exact version; confirm buyer-safe preview and separately share. Home/Team/Opportunities update and refresh retains the result.
3. **Buyer change/acceptance:** open current shared version; request a change and observe old acceptance blocked; owner revises/approves/shares; buyer accepts current terms once. Duplicate acceptance creates one snapshot/project/provisional reservation/deposit invoice/request.
4. **Prerequisites/start:** issue the already-authorized deposit request; trigger a deliberate sample receipt; verify gross/fee/net and remaining balance; provide required inputs; calculate next-business-day start and business-day-five due date. Check provisional expiry and late recovery without silently restoring an old promise.
5. **Work coordination:** create/edit/complete/reopen task, update a milestone, attach/open a file, inspect client input, mark delivery separately, and see buyer-shared work change while private notes stay private. Board/List genuinely changes representation of the same records.
6. **Money:** create/save/cancel/issue a manual invoice, download a real readable PDF; search/filter payments jointly; inspect wrong-currency/partial receipt; record a supported resolution without manufacturing cash; add/edit an expense, attach a receipt, export valid CSV and actual available receipt ZIP.
7. **Agent delegation:** choose a supported request, attach/remove source, answer a bounded clarification, observe distinct role handoffs, pause/resume, inject/recover a failure and inspect a saved artifact. Repeated retry does not duplicate outputs. Unsupported input offers an honest next step.
8. **Connections:** encounter disconnected Gmail, preserve interrupted message draft, open capability detail, simulate reconnection, return to the draft; content is still reviewed before the sample send. A connected badge alone is insufficient.
9. **Promotion:** edit a post, select sample destination, approve exact content, record a deliberate simulated publication, and retain evidence. Copying text is not publication.
10. **Public profile/availability:** change public intake availability, inspect the public projection, and confirm capacity and accepted commitments did not change. Submit an inquiry and see only its own buyer conversation; invalid IDs have safe error states.
11. **Global resilience:** Back/Forward/deep links/refresh, dirty-form discard, search clear/reset, date Cancel/Apply, no-results vs empty, errors, file limits, duplicate clicks, stale version and incompatible local state.
12. **Locale and accessibility:** English/Bahasa switch without losing work or changing currency/timezone; full keyboard journey through menus/selects/dialogs; visible focus; reduced-motion Team; long text/amounts; 390px and compact desktop overlays.

## Financial/date invariants

- The review-ready default has no Northstar acceptance, project/reservation or received deposit.
- USD450 total, 60% deposit -> USD270 gross; 2% fee -> USD5.40; netUSD264.60; sampleFX15000 -> IDR3969000. Remaining gross balance USD180.
- 40% comparison -> USD180 gross, feeUSD3.60, netUSD176.40 -> IDR2646000; gap to IDR3000000 cost is IDR354000.
- Expense totals derive from visible canonical rows and the applied filter policy, with currency labels. No mixed-currency unlabeled total.
- Calendar weekday/date mapping is generated from date values; October20,2026 is Tuesday, October24 Saturday, October28 Wednesday, October30 Friday.
- 48-hour provisional expiry is elapsed time. Start is next configured business day after both prerequisites; day1 is start day. Sample calendar excludes weekends and has no holidays.
- Existing accepted terms and confirmed receipts do not rewrite when a rule, draft, public availability or display locale changes.

## Visual and responsive evidence

Capture actual implemented Home and Team at 1440x1000 and 1280x900; representative offer, project, Money list/detail, public/buyer and setup views at desktop; Team/offer/form overlays at390x844; a tablet navigation/inspector view at1024px. Compare relevant states rather than empty placeholder pages.

Check scroll ownership, stable font/image geometry, no page-wide overflow, long headings/currency values, logo minimum/clear space, input boundaries, readable agent tints, focus rings, reduced motion, and progress/feedback that does not shift primary controls.

These are visual/interaction requirements, not a pixel-diff demand against flawed screenshot wrapping. Correct collisions and factual mistakes while preserving intent.

## Test and evidence handoff

Run appropriate project lint/type/build checks and meaningful integration/browser tests covering the above. Use real browser inspection for visual and interaction assertions when available; automated source scans alone do not prove them.

Record commands, result summaries, covered scenarios/viewports and material gaps in `docs/VERIFICATION.md`. Keep generated test artifacts outside the runtime bundle. Do not include private review ratings or critique exchanges. No live-provider checks are required or claimed for this phase.

## Delivery inventory

One repository-root project with manifest/lockfile/configuration, local assets, all source, updated master context and developer brief, final flows/contracts/fixtures, relevant decisions, verification, archive/reference/brand/skill provenance, and practical README. Exclude secrets, node_modules, caches and unused large temporary artifacts. The standalone developer Markdown must match its inside-ZIP copy exactly.

The review loop's critical gate applies even if subjective ratings are high. A missing buyer journey or fake download cannot be offset by an attractive Team screen.
