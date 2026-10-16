---
version: alpha
name: Crewmori
description: A warm, useful studio workspace for a freelancer and six illustrated business specialists.
colors:
  primary: "#245C47"
  primary-hover: "#1B4B39"
  background: "#F5F3EC"
  surface: "#FFFEFA"
  text: "#202A25"
  muted: "#566159"
  border: "#D9DED3"
  control-edge: "#566159"
  selected: "#E5EFE7"
  scout: "#F2C983"
  promoter: "#EFAF9B"
  sales: "#B9D8EC"
  account: "#D3C6E7"
  operations: "#C6D4B5"
  finance: "#B6D9C6"
typography:
  sans:
    fontFamily: "Inter, Arial, sans-serif"
  display:
    fontFamily: "Newsreader, Georgia, serif"
rounded:
  DEFAULT: "24px"
  control: "12px"
  composer-action: "8px"
spacing:
  workspace: "32px"
  section: "32px"
  panel: "32px"
  gutter: "24px"
components:
  button: {}
  field: {}
  panel: {}
  dialog: {}
  composer: {}
---

# Crewmori product design contract

Resolved frontend contract, 16 October 2026. Read `DECISIONS.md` first. This file is the active product overlay; preserve uploaded brand files unchanged. The implementation run must compare its actual Home and Team screenshots against the two approved Stitch anchor images before extending the system. No third-party skill can override these decisions.

## Identity and source precedence

Crewmori is a freelancer-owned AI business team. Six specialists support finding work, promotion, sales, client relationships, operations and finance. The owner performs the commissioned professional work. The UI should feel capable, warm, calm and approachable across freelance professions. Personality belongs to original illustrated coworkers, friendly specific copy and occasional task-linked motion. Terms, artifacts and the owner's next decision stay readable.

Authority is split deliberately:

1. Final product decisions and interaction/data contracts govern behavior, scope and names.
2. The first two Stitch screens govern composition, editorial typography, spaciousness, major panel geometry, six-character presence and Team's Global Studio idea.
3. The new brand package governs exact palette, role tints, status colors, logo artwork and logo geometry.
4. Selected Shopify and Contra screenshots govern only the documented interaction pattern they illustrate. They do not supply a replacement product theme, information architecture or new business features.
5. Later Stitch screens are content/anti-pattern references. The old `quiet_workbench/DESIGN.md` is superseded.
6. Bundled design/frontend skills are subordinate implementation tools.

The brand kit specifies DejaVu Serif/Sans and 12px cards. Those are consciously overridden for this product by **Newsreader + Inter and roughly 24px major panels**, honoring the latest user direction. The brand kit's example navigation and basic Team card grid also do not replace the approved primary nav or desktop map composition. Retain all original brand assets/docs; explain this overlay in the final master context.

## Active tokens and typography

`design-tokens.json` is the machine-readable companion. Build one shared theme from it; avoid page-specific parallel palettes and arbitrary shell sizes.

| Role | Value |
|---|---|
| Forest / main action | `#245C47` |
| Hover / pressed | `#1B4B39` / `#153F30` |
| Canvas / card surface | `#F5F3EC` / `#FFFEFA` |
| Main / secondary text | `#202A25` / `#566159` |
| Decorative / control edge | `#D9DED3` / `#566159` |
| Selected surface / foreground | `#E5EFE7` / `#245C47` |
| Primary foreground | `#FFFFFF` |

Agent tints: Scout apricot `#F2C983`, Promoter coral `#EFAF9B`, Sales sky `#B9D8EC`, Account Manager lilac `#D3C6E7`, Operations sage `#C6D4B5`, Finance mint `#B6D9C6`. Use ink labels. Role identity and task state are separate. Never use a Finance tint to prove success or a Promoter tint to imply an error. Keep most reading surfaces paper/ivory rather than coloring whole functional domains.

Functional status pairs: success `#1E6848` on `#EDF5EF`; warning `#80520B` on `#FFF1D6`; error `#9B3431` on `#FBE8E4`; information `#255F82` on `#E9F2F8`. State always has written text. Semantic color treatments include a non-color cue. Selection is not success.

Typography uses actual bundled local files in `public/assets/fonts/`: Newsreader upright/italic VF and Inter upright/italic VF, with OFL licenses and provenance. Primary display is Newsreader 400, occasional 500, optical sizing automatic; UI is Inter 400/500/600. Do not turn all body text into serif. Do not introduce Manrope just because Stitch imported it. The logo stays the supplied outlined artwork.

| Text style | Desktop size/line-height | Compact size/line-height | Use |
|---|---:|---:|---|
| Editorial page title | 44/52 | 32/40 | Home greeting, Team title, route headings |
| Editorial feature title | 32/40 | 28/36 | Main decision or key editorial section |
| Editorial section title | 26/34 | 24/32 | Brief section headings |
| Short italic introduction | 20/30 | 18/28 | One short context sentence, not essential contract terms |
| Functional section label | 18/26, Inter 600 | 18/26 | Form groups, project/offer titles |
| Body / input | 16/24 | 16/24 | Reading, forms, consequential values |
| Compact row / control | 14/20 | 14/20 | Dense lists, secondary buttons, navigation |
| Metadata | 12/16 | 12/16 | Dates, source details, small badges |
| Eyebrow | 11/16, Inter 600 | 11/16 | Optional nonessential section category only |

Essential information is never below 12px. Do not render required decision terms in an 11px eyebrow. Default control text should not wrap into one-word columns. Amounts use tabular numerals and consistent decimal/currency conventions. Localized copy may wrap; avoid fixed-height text boxes. Display fallbacks Georgia/Times; UI fallbacks Arial/system. Recheck wrapping if the fonts fail.

## Geometry, density and shared shell

Use a 4px spacing base: 4, 8, 12, 16, 24, 32, 48, 64. Related controls gap 8-16; related card groups 24; desktop sections 32. Large reading/hero cards have 24px radius, desktop 32px padding, compact 20-24px padding. Nested sections use 16px radius; ordinary data surfaces 16px; drawers 24px at exposed corners; buttons/fields 12px; chips may be pill shaped. Shadows are restrained: cards flat or one subtle border, overlays `0 8px 24px rgba(32,42,37,.10)`. The Team selected node may use a short-lived ring, not a permanently pulsing beacon.

Desktop shell: 224px sidebar, 72px top header, 32px workspace padding at >=1280px, 24px at 769-1279px. Sidebar has five labeled primary items in order **Home / Team / Opportunities / Work / Money**. Tool shortcuts and Connections form a quiet secondary group; Settings and the owner switcher remain low. Sidebar activity reflects canonical route ownership: Offers/Promotion belong to Opportunities; Clients/Projects/Calendar belong to Work. No duplicated destination under several primary headings.

The 224px sidebar cannot fit a 200px minimum logo within ordinary 16px inner padding. Give the logo row 12px side padding, placing the supplied primary lockup at exactly 200px full canvas; its built-in clear space stays intact. An alternative compact sidebar uses the standard supplied symbol and places the full lockup in the header. Do not shrink/crop the logo or duplicate its typed name. Main logo uses forest on light; white variant only on an approved forest/ink solid field. Never recolor the logo by agent.

The top header carries the route context and only a compact set of utilities. Use one Ask-your-team entry surface with shared state. Home may show the large input bar below the header; Team may show it beside the introductory area. Other routes expose a header button opening the same assistant drawer. Do not duplicate an expanded chat, a large search bar and a separate task composer in one viewport. A quiet Sample workspace indicator and scenario menu disclose the mock environment. Do not plaster implementation terms around every action.

Content width is fluid with `min-width:0` and an approximately 1440px maximum reading layout where appropriate. A business form is narrower (typically 640-760px), not a viewport-wide field row. Artifact+context layouts may use 2fr/1fr with a 24px gutter. A permanent secondary rail is optional and only justified by a current decision; it collapses to a labeled drawer action at <=1024px. Sidebars, header offsets and max widths live in shared components.

Default density budget is a deliberate constraint, not a hard limit on stored records:

- Home: one primary decision, up to three concise updates, a small crew/status summary. No giant analytics grid.
- Team: one coherent visualization and selected work context, with an optional compact artifact list/history entry. No second dashboard below every character.
- List routes: one title, one primary action if applicable, one search/filter row and one list/table. Secondary summaries are compact and answer a real question.
- Detail routes: concise identity/status, essential terms/next action, and 3-5 meaningful sections. Evidence, execution trace, fee/FX assumptions and technical metadata are behind clearly labeled disclosure.
- At most one dominant forest action per decision group. Secondary actions are visibly subordinate; destructive actions have an explicit label and confirmation where the state cannot be recovered.

Show complexity through progressive disclosure. A complete underlying flow does not require presenting every field, calculation and agent thought at once. Do not add confidence scores, readiness percentages, financial guarantees, AI telemetry, render/GPU status or strategy commentary to make screens look busy.

## Home: editorial briefing recipe

Preserve the approved composition: generous greeting/briefing card with editorial headline on the left and a distinct illustrated Scout area on the right, then one strong owner decision, then a restrained "While you were away" group and a small team presence strip. Use the new canvas/ink palette and supplied mark. The large Scout panel may use soft paper/apricot backing; avoid introducing broad gradients as a new global style.

The greeting says the owner's name, a short truthful summary and the next useful action. The review card shows the canonical artifact, status, client, short scope, price and deposit when relevant, and a single Review offer action. Keep an Adjust terms secondary action only if its destination is explicit. The initial screen should not repeat the complete offer comparison and fee/FX math. Opening the canonical offer reveals detail. Summary metrics must derive from current records; no unsupported pipeline totals, hourly-floor claims, or "capacity locked" before the corresponding event.

Update cards have role attribution, a human sentence, one source/output link and written state. Example tone: "Found a lead worth a look." / "Your offer draft is ready." / "This deadline is coming up." Avoid "calibrated financial escrow gates", "capacity defense", and internal mechanism narration. A completed assessment may exist while a send still awaits approval. Clicking Home or Team's version of an artifact opens the same canonical record and version.

At >=1024px, greeting art occupies roughly 26-30% of the card; on small screens it becomes a modest inline companion, not a giant image pushing the decision offscreen. On mobile, decision precedes nonessential update cards. Do not copy clipped top branding, cursor-over-headline overlaps or broken line breaks from the exported PNG.

## Team: Global Studio recipe

This route is the visual centerpiece. Retain the approved muted map background, original illustrated roles, curved task handoffs, inbound source, owner's studio node and output/approval context. Use `assets/demo/team-worldmap.svg` as the extracted backdrop. Its rough abstract continents are a quiet visual metaphor, not a geolocation or live-client-tracking claim. Geography is not required to understand state.

For viewport >=1280px, draw a controlled coordinate layout within an approximately 600px-high, full-width rounded map panel. Use relative coordinates or a logical 1200x600 viewBox so nodes remain stable: inbound source near (17%,20%), Scout near (50%,43%), Operations near (70%,45%), Finance near (88%,60%), Promoter near (52%,67%), Sales near (30%,60%), Account Manager near (77%,70%), owner studio near (55%,84%). These are a starting recipe: adjust label offsets after actual screenshot comparison so every node, label and popover fits without collision. The source/handoff chips sit near paths; they do not overlap character names or the owner node.

All six teammates remain reachable regardless of task state. Each shows role name, compact written state and optionally one current output. Untasked roles say Resting. Selecting a teammate highlights that node and opens a meaningful inspector with current assignment, state, source/output, recent event and Pause/Resume/Retry if available. The map is not the only way to select them: provide a keyboard-accessible role selector/list. Curves are decorative visual connections unless made into a properly named control; meaningful handoff events also appear in the text history.

A single review card and artifact list below the map reproduce the approved hierarchy. Do not paste three large financial tables beneath it. The owner decision is tied to a canonical artifact, not a special Team-only copy. The Activity subroute reuses the same records in chronological history with role/status filters and source/output links.

Below 1280px, switch to a compact coordinated-team view rather than shrinking the map until text collides. Use the same six character assets in a two- or three-column grid, a compact handoff sequence, selected inspector and history. At 390px, use two columns of all six roles with readable labels and tap targets; no sideways miniature desktop map. Preserve the visual concept through characters and handoff order rather than forcing a complex canvas on a phone.

## Opportunities, offers and promotion

Opportunities default: readable lead/request list, clear state and one short finding. Each row needs client/person, request title, relevant fit context, date and next action. A compact fit reason is more useful than a fake numerical match score. Filters combine correctly; a clear action removes active filters; empty search results distinguish themselves from an empty account. A source link opens actual saved sample evidence or an honest available action, never a dead `#`.

Opportunity detail shows original request, relevant portfolio evidence, a concise assessment and suggested next action. Evidence and exact messages are expandable. Separate the client's requested scope from the agent's proposed scope. A lead does not become accepted work because an assessment completed.

Offers list shows client, short scope, total, version, state and next action. Offer detail's first view displays the exact version, deliverables, amount, deposit, timing trigger, review state and clear Edit/Approve/Share actions allowed by state. Economic comparisons, full terms, source brief and fee/FX assumptions live in secondary sections. Approve alone does not share. Share previews the buyer-safe projection and destination. Editing approved/shared content creates a new version and visibly requires review again. Stale/superseded/expired offers explain why acceptance is unavailable and link to the current version.

Offer editing uses grouped fields: scope, pricing/deposit, delivery, client-visible notes. Calculations update from integer data. Save preserves drafts; Cancel returns unchanged; navigation prompts only if unsaved changes would be lost. Do not bury binding terms in an ornamental side rail or copy internal costs to the buyer's document.

Promotion has draft cards/list and a real editor with channel, content, preview, saved state and approval for sample publication. It reuses the offer-style version/approval pattern, not a second posting framework. A simulated published state is an acknowledged mock event with a visible preview/history; no actual social account access occurs.

## Work: projects, clients and calendar

Projects default: compact list or board with client, project name, state, next task and due date. Board/List switches render the corresponding layout while preserving filters and route context. The owner performs delivery; omit invented After Effects/render/GPU/repository status and creative production automation. A noncreative sample uses the same profession-neutral fields.

Project detail foregrounds next action, accepted scope, timing, payment prerequisites and buyer input. Tasks have owners, due dates, completion and dependencies where defined. Keep professional work, agent administrative actions and buyer actions distinct. Files, messages, scope and history are accessible tabs/sections with persistent context. A delayed input does not secretly shift a deadline; show needs-rescheduling when rules require it.

Clients is a compact directory under Work. Client detail gives relationship context, contact details, projects/offers and message drafts. Prefer a useful timeline and next contact to a large sentiment score. Record edits and message approvals use shared forms and version-aware draft patterns.

Calendar is derived from commitments, provisional reservations and deadlines; it does not independently invent a second schedule. Use correctly calculated weekdays and locale/timezone labels. Written/shape cues distinguish proposed, provisional, confirmed and overdue. Provide month/week or agenda as specified by flows; mobile defaults to agenda. Clicking an item opens its canonical project/task/reservation, with a meaningful date edit flow where allowed. Empty dates can create a task or proposed hold only if that command is implemented. No public invitation is sent without exact-content approval.

## Money: invoices, payments and expenses

Use plain labels: Invoices, Payments, Expenses. Initial view answers what is owed, received or needs attention with a compact same-currency summary and a readable record list. Do not imply escrow, guaranteed settlement, official FX or verified provider accounts. Avoid making the Finance character a constant financial-advice rail.

Invoice detail shows owner/client identity, issue state, exact line items, amounts, payment requirement, due date and history. Draft and issued are different. Share/download controls create the actual requested sample artifact, not a success toast alone. Buyer-facing invoice content excludes internal cost, margin, portfolio-match reasoning and private risk notes. Give download feedback only once a real file exists.

Payment records show gross, currency, known fee, net, evidence/source, matching state and invoice allocation. Put estimated FX and assumptions behind a labeled detail. Never subtract net received from gross owed, sum different currencies or claim a mismatched receipt settled an invoice. Partial, wrong-currency, duplicate and unmatched states explain the next useful resolution. A resolution changes only the facts its command actually records; no toast manufactures money.

Expenses is a compact editable ledger. Add/edit opens a form drawer with amount, currency, date, category, merchant and optional attachment/note. Totals derive from visible active records/filters and preserve currency groups. Deletes are recoverable or explicitly confirmed. Empty/filter/error states follow shared components.

## Connections and settings

Connections show supported tool, what the crew can do, demo connection state and one Connect/Reconnect/Manage action. Permissions and exact capability details appear on inspection. Gmail/Calendar/Drive shortcuts use this same record. A simulation state can be connected, disconnected, reconnecting, denied or error; none performs OAuth or asks for live credentials. Never state a tool is usable merely because its icon is present.

Settings has four stable sections: Profile (profession-neutral services/business identity), Rules (authority, work hours, deposit/timing), Preferences (locale, motion, focus/notifications) and Knowledge (sources, portfolio, reusable business facts). Keep save/dirty/error behavior consistent. Explain the consequence of a rule before changing it; future offers use new rules without rewriting accepted snapshots.

## Public, authentication, onboarding and buyer experiences

The product entry page applies the same warm editorial identity, illustrated team and one main route into the sample workspace. Keep it focused on how the freelancer benefits and stays in control; no invented testimonials, provider badges, revenue claims or working integration promises. It links to the sample public freelancer profile and sign-in/demo.

Public freelancer/service pages use the freelancer's identity as the service provider, with modest Crewmori business-support attribution. Show approved portfolio and service terms, an inquiry action and disclosed AI representative. Private financial/capacity/risk notes never leak. All visible public content is a deliberate public projection.

Auth screens are concise, centered, branded forms with truthful sample behavior. Never save a password. Recovery/reset have success and invalid/expired-link states. Local simulated auth guards preserve trusted local return paths and cannot expose arbitrary unknown IDs as a valid Northstar record.

Onboarding is a resumable, friendly sequence with clear progress: business/profile basics, services/availability/rules, optional knowledge/tools, review/enter workspace. Provide back/save/skip optional steps and a direct sample option. Do not make real connections or long questionnaires prerequisites for seeing value.

Buyer inquiry is a focused conversation and brief summary, with the AI representative disclosed. Use Shopify AI references for a contained helpful assistant pattern, not a terminal-style chat. Show actual message sequence and saved brief changes. The sample voice action plays a short labeled local demonstration/transcript without requesting a microphone/provider. User text outside curated intent receives an honest clarification rather than invented unrestricted AI output.

Buyer offer is a simple document-like decision page: freelancer identity, exact shared version, scope, price/deposit, delivery prerequisites/reservation expiry, terms, Accept or Request changes. The client cannot access private owner data. Acceptance is explicit and idempotent. The buyer continuation portal prioritizes payment request, required inputs, confirmed timing, project state, files and messages. A simulated payment step is clearly a sample action and produces consistent data; no actual money movement.

## Components and consistent behavior

Build reusable primitives before populating all routes: AppShell, PageHeader, PrimaryNav, Button/LinkButton, TextField/Select/Textarea, Checkbox, CurrencyField, StatusBadge, RoleAvatar, EmptyState, ErrorState, Skeleton, RecordList/Table, FilterBar, Drawer/Dialog, Tabs, Disclosure, Toast/InlineFeedback, ConfirmAction, ArtifactCard, SourcePreview, ApprovalPanel, EventList and AssistantDrawer. Components share dimensions, focus, icon family, error language and close/back behavior. Buttons are actions; links navigate; a disabled control explains why when that is not obvious.

Use one coherent outline icon family (approximately 24px/2px stroke with rounded joins). Icons supplement ambiguous labels. Do not use emoji as the main product icon set. Keep illustrated roles as their own assets. Do not import a giant icon/animation library just to draw six paths.

Dialogs/drawers have a visible title/close action, correct role/accessible name, focus entry/trap/return, Escape behavior when safe, and scroll containment. Closing a draft follows the same unsaved policy as Back. Consequential confirmations show object, version, exact action and destination. Submit is idempotent; pending state prevents duplicate commands without losing input. Error keeps entered values and offers a concrete recovery. Toasts supplement persistent record state, not replace it.

Required views/states: empty account, empty filtered result, initial/loading, queued, working, awaiting owner approval, waiting for buyer input, blocked, paused, disconnected, stale version, recoverable error, invalid/expired link, saved dirty draft and successful persisted transition. Review exact state requirements in the flow specs. Do not hide unimplemented actions behind attractive enabled controls.

## Responsive and accessibility contract

Desktop target widths: 1440px and 1280px. Check 1024px tablet and 390px compact. At <=1024px context rails become drawers; header utilities collapse without hiding their function. At <=768px remove persistent sidebar, use one-column content with 16px padding, and five primary destinations with the same ownership; secondary sections open via More/menu. Bottom navigation reserves 64px plus safe-area inset, with matching content padding. Do not copy the brand guide's conflicting Workspace/Clients mobile nav. Labels can shorten visibly only if their accessible name remains clear.

Forms become one column; action groups wrap or stack; fixed-width financial/summary columns collapse. Tables may use within-component horizontal scroll with clear labels when comparison requires it, or compact record cards; the page itself never scrolls horizontally. Drawer becomes a full-height sheet at small widths with visible close and primary action in reach. Team becomes a six-role grid, calendar an agenda, and public/offer documents retain readable 16px terms.

All interactive targets are at least 44x44px in the owner/buyer core flows. Tab order follows reading order. Provide visible focus, proper labels/instructions, inline field errors tied programmatically, and an accessible summary for failed submissions. Use semantic headings and list/table relationships; update document title and route focus. Do not trap focus in map art. Announce meaningful state updates politely; decorative art/cursors stay out of the accessibility tree.

Token ratios verified in planning: ink on canvas 13.33:1, muted on canvas 5.82:1, white on forest 7.79:1, forest on selected 6.61:1. Decorative border on surface is only 1.36:1; use muted for a required input boundary. White text on agent tints fails (approximately 1.49-1.86:1); ink on role tints passes (approximately 7.94-9.93:1). These solid-color checks do not certify the finished app. Check actual transparency, overlays, focus clipping and chosen text sizes in browser.

## Meaningful motion and focus

Use 160/200/240ms UI transitions with `cubic-bezier(.2,0,0,1)`. Task-linked cursor travel can take approximately 600-900ms for a visible handoff, after an actual persisted demo event; it is not an indefinite progress animation. At most two cursors concurrently, labeled with role and action. If a target is absent/offscreen, show a small labeled chip rather than scrolling unexpectedly. No idle typing, random cursor wandering, perpetual bouncing or fake money/progress. Keep cursor overlays away from essential text and controls.

Pause animation and focus mode are deliberate controls. Focus mode quiets decoration/secondary update motion while preserving notifications, decisions and access to all records. Reduced motion removes cursor travel, looping expressions and animated paths; static selected roles, written handoffs, output links and state changes remain. Record replay restores final current state without replaying every celebration or duplicate command. The stable logo never breaks into moving pieces.

## Verification and handoff

The implementation must capture Home and Team at 1440px after local fonts load, inspect the actual images, and compare the governing composition, major panel proportions, type, color, character assets, route shell and visual hierarchy. Fix obvious collisions, unsupported wrapping, accidental generic-dashboard drift and loss of the Team centerpiece before broadening the app. Also inspect representative list/detail/form, Money, buyer offer and 390px flows.

The review-and-revision loop lives in the implementation instructions; scores are private. Observable evidence matters: real screenshots, functioning controls, persisted state, real downloads, build/lint/type checks, keyboard/reduced-motion checks and the stated sample journey. Do not score a static attractive screenshot as a working app.

Update the final master AI context pack, developer brief, active design overlay, token paths, font/asset manifest and verification notes to reflect what was actually implemented. Preserve original source references separately. The final source ZIP has one installable app root and locally resolved assets; brand-builder runtime dependencies are not app-build dependencies.


## Spacing refinement — 1.0.1

Shared search controls use the existing surface/edge/focus tokens with one border; the native field baseline has low specificity so the canonical component can own its interior. Team decision footer labels occupy a separate line, with a 12px wrapping action gap. Ask fields shrink safely; phone sample controls use a short visible label and the full accessible name. Acquisition filters hide redundant captions visually while preserving their labels; Money filters reserve at least 145px on desktop to keep selected labels readable. Home dismissal targets are 44px and share the existing hover treatment. Runtime ownership remains globals.css, acquisition.css, money.css and the shell. See docs/POLISH_NOTES.md for review evidence.

## Taste refinement — 16 October 2026

This intentional evolution reduces repeated containers while preserving the approved Newsreader/Inter typography, forest/cream palette, supplied crew artwork, Global Studio map, and approximately 24px major panels. Use the bundled Taste guidance through `skills/CREWMORI_SKILL_ADAPTER.md`; the source principles and verification record are in `docs/TASTE_REFINEMENT.md`.

The shared composer has a 12px radius and an 8px inset button. Home facts are unboxed and aligned; the Scout backing is flat apricot. The original-request comparison is a flat disclosure, and visible terms use a divided rail rather than another card. Saved updates share one paper strip with internal rules and Inter functional headings. Team artwork is larger, and selected map/list nodes have a persistent forest treatment with an accessible pressed state. Decision facts, update metadata, roster labels, and written task state use at least 12px; optional decorative eyebrows follow the existing type contract.

Public benefit sections and opportunity records use open sections or shared ruled surfaces. Supporting controls recede through quieter borders and backgrounds, while the current decision retains a clear primary action. Preserve existing content, canonical destinations, disclosure access, focus feedback, mobile stacking, and business behavior. These component-specific decisions supersede the earlier nested-card treatment; they do not introduce a second palette or change the major-panel token.


Token mapping: runtime CSS variables in `src/app/globals.css` remain the implemented palette owner; this frontmatter mirrors their accepted primitive values. `docs/design-tokens.json` is the retained machine-readable companion, updated with the component-specific refinement. `--scout-surface` derives from 24% `--scout` mixed with `--surface`; no independent palette is introduced. Local Newsreader/Inter font-face declarations feed all shared and domain components.
