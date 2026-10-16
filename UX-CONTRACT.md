# Shared frontend behavior contract

This contract governs all routes. Domain flow JSON adds concrete steps and mutations; it may not silently contradict shared behavior or DECISIONS.md.

## Navigation and shell

One shared owner shell. Primary Home/Team/Opportunities/Work/Money ownership remains consistent across desktop, tablet and mobile. Each page shows a clear title/context and one dominant next action for its state. Contextual subnavigation maps to real routes or correctly implemented local tabs; do not create duplicate global categories.

Use links for navigation and buttons for actions. Every route supports direct load, refresh and browser Back/Forward. Preserve relevant query/filter/sort and list scroll on return; use breadcrumbs for hierarchy. Unknown IDs show an app-owned not-found state and safe return, not another client's data. A simulated session protects navigation only as a demo affordance; document that real authorization is future backend work.

Public/buyer pages use their own restrained shell and safe projection. Never inherit owner sidebar or private data. Demo role switching is labeled and returns to the correct context; it is not a security claim.

## Record and draft state

Normalize committed records centrally. A form has a separate draft; typing does not mutate unrelated committed data. Save validates, checks expected version, prevents duplicate commit, emits an event where relevant, updates the canonical record and related selectors, persists, and shows the changed record.

Cancel returns to the last committed version. Guard only meaningful unsaved loss with an app-owned discard dialog; routine successful saves need no redundant confirmation. Failed save retains values and a useful inline recovery. Preserve named drafts across navigation/reload where specified, never passwords/secrets. Accepted commercial snapshots are immutable.

Version browser persistence, validate its shape, migrate known versions or offer a safe sample reset on corruption/incompatibility. Store safe serializable data; file blobs use appropriate client storage or labeled session-only behavior. Define attachment persistence honestly. Use deterministic IDs/idempotency keys per action intent, not new keys on blind retries.

## Forms and validation

Every field has a label, expected type, help when useful and controlled state. Use noValidate; own inline validation. On submit show textual field errors, associate them semantically, retain values, and focus the first invalid field. Essential terms stay readable; long names/currency values wrap or expose full values without hover dependence.

Choose maintained accessible primitives for selects/combobox/datepickers. Native OS popups are acceptable only where their geometry/locale is consciously allowed. Authored popovers fit the viewport, match the trigger, have standard keyboard interactions, and show selected state. Date-range selection has local draft plus Cancel/Apply; invalid start/end has correction guidance. No impossible date/weekday combinations.

Busy buttons keep dimensions stable, disable duplicates and expose progress state. Disabled controls do not react to hover or click; explain the reason when not obvious. Required-versus-optional steps are explicit.

## Search, filters, lists and bulk selection

Combine query, filters and sort in one derivation. A nonempty search has a clear X; clear and Enter are immediate. Mock asynchronous searches ignore stale responses; do not submit during IME composition. Persist committed shareable view state in URL; reset/clamp pagination after changes.

Each list has deliberate pagination or bounded sample rendering with counts, sortable headers if offered, loading/empty/no-results/error states, and correct reset actions. Distinguish no records from zero matches. Selected rows have visible count and contextual actions. Define selection across filters/pages; default to visible page and clear incompatible selections with accessible feedback. Bulk confirmation names the objects, count and consequence. Partial failure reports exact successes/failures and preserves failed selection for retry.

Use semantic tables for tabular data; no ARIA grid unless spreadsheet keyboard behavior is actually implemented. At narrow widths use responsive rows/cards or contained horizontal table scroll, with full actions and values available. Do not impose table height/overflow constraints on sibling forms. Assign one clear document/content scroll owner and stable visible scrollbars.

## Dialogs, drawers and popovers

No browser alert/confirm/prompt for product UI. Use one canonical overlay system with accessible title/description, initial focus, keyboard behavior, Escape policy, modal isolation and focus restoration. Popovers/menus do not move the page or controls. Long dialog bodies scroll internally; close and primary actions stay reachable.

Default modal close/cancel changes no committed domain state. If a non-modal inspector is used, document that variant and don't pretend it has modal focus trapping. Ensure z-index/portal layers work for a select inside a dialog, file preview above an inspector, and notifications above the shell.

Confirm consequential send/share/publish/accept/commit/void/bulk actions with exact content, destination, record version and consequences as applicable. Do not confirm every reversible toggle/save. A toast acknowledges an outcome; it is never the only place a financial, approval or task state exists.

## Feedback and async recovery

Use one toast/status system with accessible live regions and deduplication. Persistent actionable problems remain inline/on the record. A delayed mock can expose real pending state, but a timeout by itself cannot manufacture a successful record.

Differentiate initial loading, background refresh and mutation. Preserve layout geometry for fonts/images/errors/loading so controls do not jump. Offer useful retry/cancel where supported. For unknown completion, check/reconcile using the same command key rather than dispatching another external effect. All effects here are local sample effects, but the contract should be ready for a real adapter.

Error classes: validation, missing record, stale/conflict, disconnected capability, recoverable task failure, file failure and incompatible stored state. Each has a defined correction path. Unsupported free-text intent is saved and clarified; it must not claim fictitious successful work.

## Files and actual downloads

Uploads support a picker and optional drag/drop, explicit limits (sample default 10MiB (10485760 bytes) per file, maximum five per action; PDF/PNG/JPEG/TXT accepted; reject others with useful text), file name/type/size, removal, preview, processing state and recoverable failure. Do not pretend arbitrary PDFs were semantically parsed. Selected source content may use curated sample extraction, labeled honestly. Sanitize displayed names and treat contents as data.

Offered PDF invoices/offers contain a real readable buyer-safe document; CSV expenses use proper escaping and labeled currency/date columns; receipt ZIP contains actual available sample receipt files plus a manifest. If no receipts exist, say so instead of creating a misleading vault. Downloads have meaningful filenames and an error/retry path. Copy/share links contain real local routes, not placeholders or invented deployed URLs. Clipboard failure gives a selectable link fallback.

## Agents and motion

Task/run states: queued, running, waiting_input, waiting_approval, paused, blocked, completed, failed, cancelled. The UI must map them into concise friendly labels. Events/artifacts refer to the actual task and records. Run controls preserve completed effects and never imply cancelling reverses a sent message.

Two task-linked cursors maximum; all six teammates remain accessible. Stable studio positions, curved meaningful handoffs, bounded transitions; no pointer chasing, interaction interception, fake endless typing, or replaying every old celebration on reload. Reduced motion/pause preserves labels, state and artifacts. Catch-up summarizes recorded events since last-seen, not a fresh invented narrative.

One command surface can be scoped to a record; show scope and chosen sources. Clarify only material missing facts. Return a concise result/artifact link and next action; detailed reasoning/source history stays inspectable. Do not display chain-of-thought.

## Locale, dates and money

English default; central English/Bahasa dictionaries for the implemented interface and accessible labels. Test locale changes without losing forms/context; do not silently change currency or domain timezone when changing language. Sample buyer language and owner language may differ; translation remains sample behavior, no live model needed.

Use the frozen sample clock and IANA Asia/Jakarta business timezone. Show timezone when cross-border timing matters. Keep date-only values separate from instants. Working days, reservation expiry and deadline basis follow DECISIONS.md and data contracts. Currency formatting uses explicit currency/scale; unknown is distinct from zero; totals do not mix currencies.

## Accessibility and responsive baseline

Target WCAG2.2AA in implementation; do not claim conformance based solely on token checks. Keyboard-operable controls, visible focus, semantic names/status, non-color cues, sufficient rendered contrast and reasonable target sizes. Modal focus must remain visible. Hover-only actions/info have focus/touch equivalents. Drag has a non-drag alternative; password managers and paste work.

Required visual sizes: 1440x1000 primary desktop, 1280x900 compact desktop, 1024px tablet, 390x844 phone. Primary fidelity is judged at desktop; narrow layouts must still work without page-wide horizontal scroll. Verify representative overlays, long content, zoom/reflow and reduced motion. No separate mobile design reinvention.

## Scenario control and demo integrity

Sample-workspace menu offers deliberate scenario selection, reset and day advance. Confirm discarding edited sample work. Scenario entry atomically loads a coherent snapshot, not piecemeal status toggles. Current scenario/clock and saved-state policy are discoverable in this menu. A payment simulation is a separate explicit demo action, not a normal owner claim that funds arrived.

Keep mock failure injection useful for verification and discreet in normal product use. No error sliders, raw IDs or implementation telemetry on ordinary freelancer screens.


## Canonical UI Map — implemented ownership

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | Domain list selection through native checkboxes | src/views/acquisition.tsx and shared globals.css | Visible-page selection with explicit bulk action | Acquisition tests and review |
| Select/Listbox | Native select | src/components/ui.tsx Field and globals.css | Single-value form and filter selects | Keyboard and responsive review |
| Date | Native date/time inputs | Field, engine.ts calendar arithmetic | Date-only and datetime-local with explicit timezone | Engine calendar regression tests |
| Form | Field and domain submit handlers | src/components/ui.tsx, globals.css | Native required checks plus authored domain validation; server adapter must repeat checks | Typecheck and domain tests |
| Scrollbar | Browser native scrollbar | globals.css | Document scrolling; contained wide tables and dialog | Responsive DOM geometry and screenshots |
| Toast | StoreProvider notify | src/lib/store.tsx | Status text with dismiss; persistent record is authoritative | Browser transitions and service tests |
| CRUD | Shared command service | src/lib/engine.ts with expected_version | Domain-specific irreversible lifecycle commands; archive/restore | Service regression tests |

Native select/date controls are intentional for a dependency-light frontend and native keyboard/mobile behavior. Field supplies stable labels and errors. Textareas use global resize:none with minimum 112px height. Button forwards handlers and HTML submit semantics. Native input validation and authored domain validation cooperate; successful changes are only acknowledged after local persistence.
