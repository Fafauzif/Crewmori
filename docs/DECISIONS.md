# Final implementation decisions

Status: resolved for the frontend implementation pack, 16 October 2026. These supersede draft questions in earlier planning artifacts. Build the complete frontend in the next chat. Do not ask the founder to choose these again.

## Scope

One Next.js App Router + React + TypeScript project. Desktop-first, functional responsive fallback at 390px and tablet. English default with a complete optional Bahasa Indonesia locale for core owner/buyer flows; keep locale dictionaries central. A single sample Alya workspace illustrates a product for all freelance professions.

Include product entry page, owner app, public freelancer/service pages, buyer text conversation, buyer offer/change/acceptance/payment/input/project continuation, onboarding, simulated sign-in/sign-up/recovery, settings and connections. Include short explicitly labeled sample voice/transcript playback in buyer conversation using feature-detected browser SpeechSynthesis and a voice whose localService is true, with real start/end/pause/stop callbacks. No autoplay, remote voice, microphone/provider dependency or fake playback progress. If a local voice is unavailable, explain and retain the complete transcript/text journey; a prerecorded audio file is not required. No marketplace/community/forum, no waitlist/referrals, no warehouse/inventory, no subscription billing, no production admin console, no separate dark theme.

All business services are replaceable local mocks. Persistent editable normalized records, deterministic curated tasks, errors, retry, schema reset and sample-state controls. Never require credentials or real accounts. No external side effects. Product UI has a quiet Sample workspace indicator; do not litter every label with implementation jargon.

## Routes (canonical)

- `/`: Crewmori public entry and product introduction, links to sign-in/demo and sample public profile.
- `/auth/sign-in`, `/auth/sign-up`, `/auth/recover`, `/auth/reset`: simulated account flows; never store a password.
- `/onboarding`: resumable setup, optional connection steps, skip to sample workspace.
- `/app/home`: approved editorial owner brief.
- `/app/team`, `/app/team/activity`: approved Global Studio and shared event history.
- `/app/opportunities`, `/app/opportunities/[id]`: leads/request assessment.
- `/app/offers`, `/app/offers/[id]`: canonical offers; sidebar remains Opportunities.
- `/app/promotion`: promotion drafts and sample publication state; sidebar remains Opportunities.
- `/app/projects`, `/app/projects/[id]`: projects; sidebar remains Work.
- `/app/clients`, `/app/clients/[id]`: clients; sidebar remains Work.
- `/app/calendar`: work calendar; sidebar remains Work.
- `/app/money/invoices`, `/app/money/invoices/[id]`, `/app/money/payments`, `/app/money/payments/[id]`, `/app/money/expenses`: Money records; expense editing is an overlay, not another route.
- `/app/connections`: capability/state setup; individual connection is a deep-linkable drawer query `?connection=gmail` etc.
- `/app/settings/profile`, `/app/settings/rules`, `/app/settings/preferences`, `/app/settings/knowledge`: settings.
- `/u/[handle]`, `/u/[handle]/services/[slug]`: public approved freelancer/service projection.
- `/inquiry/[id]`: buyer conversation and brief; invitation/demo grant is conceptual only in local simulation.
- `/buyer/[id]/offer`: exact shared offer; `/buyer/[id]`: buyer project/payment/inputs/files/messages portal.
- Standard app-owned not-found/error/invalid-link views. No enabling unknown IDs by falling back to Northstar.

Primary nav: Home / Team / Opportunities / Work / Money. Connections/tool shortcuts and Settings secondary. Five primary mobile destinations follow the same ownership, with secondary navigation via More/menu. Each route sets title and active context. Return paths use trusted local routes only.

## Agent authority and lifecycle

Six role IDs: scout, promoter, sales, account_manager, operations, finance. Internal read/assessment/calculation/drafts and reversible internal suggestions may happen automatically. Exact-content/version/destination approval is required for sample send/share/publish, external calendar invitation, or changed client commitments. No agent accepts for a buyer or moves real money.

Offer: draft -> awaiting_review -> approved -> shared -> accepted. Change requests create a new draft version; edited drafts invalidate old approval. Accepted snapshots are immutable; amendments use another version. Withdraw/expiry/superseded block new acceptance. Approve alone does not share, accept, reserve or pay.

Buyer acceptance creates one project awaiting deposit/inputs, one provisional reservation and one draft deposit invoice/payment request, using an idempotent command. The already-approved offer's 60% requirement authorizes issuance of that deposit request in the sample flow; do not require a second redundant owner approval. Sending an unrelated manually created invoice does require its normal review/issue step.

Provisional reservation expires after 48 elapsed hours from acceptance if prerequisites remain incomplete; disclose expiry before acceptance. Confirmed deposit plus required inputs commit the start on the next configured business day at 09:00 Asia/Jakarta. Delivery is due at 17:00 on the fifth business day counting that start day as day one. Sample calendar: Monday–Friday, no holidays. A real production holiday/calendar/terms policy remains the developer's responsibility. Late prerequisites after reservation expiry produce a needs-rescheduling item; never silently promise the old deadline.

Professional delivery, owner administrative tasks, buyer acceptance, invoice payment and agent run status remain separate. Public intake availability is separate from capacity/reservations/commitments. Finance issue resolution records the action and evidence; it cannot manufacture a confirmed receipt. No escrow, official FX, identity-verification or automated creative-production claims.

## Canonical sample and simulation

Business timezone Asia/Jakarta; sample clock frozen at `2026-10-16T09:00:00+07:00`, with a deliberate day-advance demo control. Format explicit sample dates, not fake live relative timestamps. Northstar baseline: four requested assets / USD500 / five business days; proposed two hero launch animations / USD450 / estimated12h / five business days; 12h available; 60% deposit USD270; fee assumption2%; FX15000IDR/USD; upfrontcostIDR3000000. Default offer awaiting_review, no sent/accepted/received/reserved flags. Full-scope comparison4/$600/18h/10days is an original-context fixture, not the chosen offer.

USD money integer cents; IDR integer rupiah. Gross27000, fee540, net26460 USD cents; estimated IDR3969000; gross outstanding18000. Never subtract net from gross or sum currencies. Derived values only. A second noncreative sample record should illustrate profession-neutral fields.

Scenario controller (quiet header menu): default review-ready; first use; running handoff; shared offer; accepted awaiting prerequisites; active paid project; partial/wrong-currency receipt issue; disconnected Gmail; recoverable task failure; stale offer; empty filtered list. Scenario loads are deliberate and reset a versioned normalized store after confirmation if edited work would be lost. No arbitrary timers creating fake money or success.

One global Ask your team surface supports curated intents (assess lead, draft offer/follow-up/promotion, plan project, inspect invoice). Arbitrary input is saved as a request and receives an honest clarification/manual draft option, not imaginary unrestricted AI success. Task progress follows actual demo transitions. Two task-linked cursors maximum, stable teammate positions, pause/reduced motion supported.

## Visual authority

First two Stitch anchors govern composition, Newsreader+Inter typography, spaciousness, roughly24px major panels, six illustrated characters, and Team map. New brand governs exact palette/logo/geometry/status pairs. Preserve source brandkit unchanged; explicit frontend overlay overrides its DejaVu UI fonts/12px cards/example navigation. Main forest#245C47, canvas#F5F3EC, surface#FFFEFA, ink#202A25, muted#566159. Shopify/Contra supply specific patterns only. All third-party skills are subordinate.

## Delivery and honesty

Next run returns `Crewmori_Frontend_Source.zip`: one installable project root with source, local assets, lockfile, docs/master context/developer brief/flows/contracts/verification, original context archive, brand provenance, selected references and licensed skill documentation. Also return identical developer brief Markdown outside ZIP. Do not build the website in this planning pack run. Actual build/browser verification and final source generation belong to the next implementation run. Update context after implementation; keep review scores private.


## Implemented continuation decisions — 16 October 2026

One Next.js catch-all route dispatches to domain views sharing a transactional normalized sample engine. Native dialog, native selects/date controls and authored Field validation form the canonical accessible control layer. Raw input/download bytes live in IndexedDB; serializable records and preferences live in versioned localStorage. Cold browser sessions enter the explicit sample entry/sign-in path; no credentials are verified by a real provider.

Buyer schedules are accepted through exact offer amendments, never by silently editing a calendar promise. Existing invoices and receipts remain immutable; positive additional upfront obligations create a distinct adjustment invoice/request. Unsupported credit/refund and capacity conflicts stop atomically with an explicit review state.

Remaining detailed differences and verification limits are in TRACEABILITY.md and VERIFICATION.md. Original flow/control inventories remain unchanged as acceptance references.
