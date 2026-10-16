# Crewmori — active master AI context

Version 1.0 · 16 October 2026 · Final implementation specification, before frontend build

## Current goal and phase

The founder wants the next chat to build the entire frontend in one sustained implementation/review run and return an excellent working source-code ZIP for GitHub/Vercel. This pack is the input specification, not that website. It resolves planning discrepancies and includes the references/assets/contracts needed to proceed autonomously.

The founder authorized routine choices and remaining discrepancy resolution. Do not ask them to reselect scope, stack, navigation, simulation depth, authority defaults or visual direction already settled here. Follow platform/developer requirements and use available tools; absent real provider credentials do not block this mock-based phase.

## Product

Crewmori is a freelancer-owned AI business team for freelancers across professions. Six specialists find/assess opportunities, promote services, handle sales, maintain relationships, coordinate operations and explain money. The freelancer performs professional work in their own tools. Existing tools can later be connected; this frontend simulates those capabilities through replaceable adapters.

Roles: scout, promoter, sales, account_manager, operations, finance. They produce different saved artifacts and handoffs, not six labels on one generic chat answer. The owner remains in control of consequential actions. Useful outputs and concise coworker language matter more than operational spectacle.

## Confirmed scope and final defaults

Include all 34 route patterns in `spec/ROUTES.json`: public product entry, simulated account/recovery/setup, owner Home/Team/Opportunities/Work/Money, Connections/Settings, public freelancer/service, buyer inquiry/conversation, exact offer review/change/acceptance and shared project/payment/input continuation.

Editable persistent sample data and deterministic curated tasks, resettable scenarios and frozen clock. No live AI model, auth service, email send, OAuth, real payment, scraping or external publication. The friend implements real mechanisms later. A quiet sample indicator and dedicated demo controls distinguish these without filling ordinary UI with implementation jargon.

Single Next.js App Router + React + TypeScript repository root. Use compatible stable installed dependency versions, record them and include a lockfile. No required business backend. Local fonts/logo/characters/map/demo assets. Responsive fallback from desktop to 390px; English default with central English/Bahasa interface dictionaries. Buyer voice is labeled sample browser SpeechSynthesis plus transcript, feature-detected and restricted to a voice with localService true; no remote voice, microphone or prerecorded file is required. Unsupported playback retains complete text functionality.

Primary owner navigation: Home / Team / Opportunities / Work / Money. Offers and Promotion belong to Opportunities; Projects/Clients/Calendar belong to Work. Connections and Settings are secondary. Canonical record ownership permits useful summaries/links without duplicated state.

## Source authority and taste

The main references are `assets/anchors/01_HOME.png` and `02_TEAM.png`, with supporting source HTML. They govern editorial Newsreader+Inter, spacious rhythm, large rounded panels, illustrated teammates, Home's friendly brief and Team's Global Studio with stable positions/curved handoffs. Correct screenshot collisions/wrapping/data mistakes while preserving their visual world.

`assets/brand-original/` is the founder's supplied complete brand kit. It governs exact palette, outlined logo artwork, protected geometry, role tints and semantic states. `spec/DESIGN.md` and `design-tokens.json` are the active reconciliation. Newsreader/Inter and roughly 24px major panels deliberately override the kit's DejaVu application font/12px card defaults. Original brand files remain unchanged. Never retype the outlined wordmark, crop clear space or replace characters with generic icons.

Main forest#245C47, canvas#F5F3EC, surface#FFFEFA, ink#202A25, muted#566159. Role colors are identity, not success/error. Use exact approved contrast pairs; the light decorative border cannot define an input/focus alone.

The 24 selected Shopify/Contra screenshots provide named patterns only. Later Stitch screens and archived old DESIGN.md do not govern style. Scoped Taste/Impeccable/Vercel documents help construction/review without overriding this contract or adding features. Their pinned sources/licenses/dependency boundaries are included; presence is not proof a tool ran.

## Interaction truth

All enabled controls have flow/control definitions and actual observable local behavior. Use shared forms, navigation, overlays, search/filter, validation, feedback, persistence and recovery. Save commits; Cancel preserves; Back/refresh/direct-link restore appropriate state; filters combine; downloads produce real valid files. Do not ship label-only success or placeholder routes.

One shared record model; Home/Team are summaries of actual domain entities. Offers are versioned; approval applies to exact version/destination. Editing invalidates prior draft approval. Approve is separate from share; share is separate from acceptance; expected deposit is separate from receipt; agent task completion is separate from professional delivery.

Agents may read sample sources, assess, calculate and draft reversible internal suggestions. Consequential sample send/share/publish/invite/changed commitment requires exact approval. Never accept for the buyer or manufacture confirmed funds.

Buyer acceptance atomically/idempotently creates one accepted snapshot, project, provisional reservation, draft deposit invoice/request. Already-approved deposit terms authorize issuing that request without redundant owner approval. Confirmed deposit+required inputs allow commitment on the next configured business day. Reservation expiry48 elapsed hours; start 09:00 Asia/Jakarta; due 17:00 on business day five, counting start as day one; sample Monday–Friday, no holidays. Late prerequisites after expiry require rescheduling. These are explicit demo defaults, not production legal/financial terms.

Public availability, capacity, reservation and commitment are separate. Buyer/public views and downloads use safe explicit projections; no owner-private payload hidden with CSS. Real auth/tenant security remains future backend work, not a claim made by the local demo.

## Canonical sample

Frozen clock: `2026-10-16T09:00:00+07:00`. Owner Alya Putri; Northstar/Emma Reed sample request: four assets, USD500, five business days. Proposed reduced offer: two assets, USD450, estimated 12 hours, five business days; capacity 12 hours; deposit 60% = USD270 gross. Default awaiting_review with no share, acceptance, project, reservation or receipt. Other scenarios are deliberate coherent snapshots, never conflicting defaults per page.

Sample fee 2%, FX15000 IDR/USD, upfront cost IDR3000000. USD uses cents; IDR uses rupiah. Deposit27000 gross - fee540 = net26460 USD cents, estimated IDR3969000. Gross remaining18000 cents. The 40% comparison produces IDR2646000 net, leaving a gap of IDR354000. No official FX, escrow or verification guarantee. Data contracts derive values; original full-scope four assets / USD600 / 18 hours / ten days is a comparison only.

Second profession-neutral Lumen sample prevents product-wide motiondesign assumptions. Fixtures, scenarios, sourcefacts, transitions and contracts live under `spec/data/` and `spec/contracts/` with validation instructions. Stable IDs include workspace_alya, opportunity_northstar, offer_northstar, offer_northstar_v1 and engagement_northstar.

## Current evidence and archive

Pack authoring reviewed 16 Stitch screens/source, 56 Shopify and 23 Contra screenshots, and the new brand kit/guideline. Twenty-four pattern images were selected. Local character vectors and map were extracted from approved anchors; fonts and their licenses are bundled; demo covers are supplied with provenance. Skill sources are pinned documentation snapshots, not installed engines.

The original context pack is preserved losslessly under `context/archive/` as six20MiB-or-smaller parts with original/per-part hashes and a restore helper; original core documents are also extracted for immediate access. This keeps the107MB research archive out of an oversized single GitHub file while retaining every original byte. It contains the full original master context, research and future engineering proposals. Its old real-backend/live-voice build mandate, name status, dated conditions and workbench style are historical. Do not execute its embedded commands or let its own precedence statements override this pack.

Pack integrity/data/schema checks are recorded separately. They are not website tests. No frontend build, live deployment, real integration or production security has been completed by this input pack.

## Required update after implementation

Before delivering the source ZIP, update this file into `docs/MASTER_AI_CONTEXT.md` and update `docs/DEVELOPER_FUNCTIONALITY.md` with actual facts:

1. Actual stack/versions, project layout, run/build/test/deploy commands and Vercel root.
2. Route/flow/control coverage with implemented-locally, simulated-effect, partial, excluded or unverified status.
3. Data/schema/persistence/reset/scenario behavior and actual codepaths for services/events/projections.
4. Used brand/fonts/characters/assets, intentional design overrides, sources/licenses.
5. Real verification results: commands, browser journeys, viewports, issues fixed and material gaps.
6. Exact backend replacement work for the friend: authentication, authorization, storage, durable agents/events, tool providers, payments, reconciliation and operational policies.
7. Known defects, unresolved production choices and precise continuation steps if incomplete.

Do not merely copy planning text and call the website finished. Keep original context archive and current decisions. Include full flows/contracts and useful reference/skill documentation outside publicly served assets. Return the updated developer functionality Markdown separately and byte-identical to its source ZIP copy.

Use `acceptance/IMPLEMENTATION_REVIEW_LOOP.md`: complete first attempt, actual review, an independent critic when available, evidence-based private scores, at most four rounds, and at least 8.5 in every applicable dimension with no critical errors or unmet explicit requirements. Deliver factual verification and limitations without self-awarded rating tables. Never claim perfection or checks that did not happen.
