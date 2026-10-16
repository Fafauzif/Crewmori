# Explicit public and buyer projections

Version1.0.0. These projection recipes apply to HTML, client props, client-side query results, PDF/CSV/downloads, link previews, voice sample transcripts and event summaries. Product routes and CSS cannot enforce production access control. The mock demonstrates correct construction; the developer must later implement trusted authorization and server-side projection.

## Resolution order

Resolve exact handle/service slug or engagement ID. Unknown IDs return app-owned not-found, never a Northstar fallback. For buyer queries require the exact active unexpired, unrevoked sample grant linked to that engagement/contact. Check offer/share eligibility separately. No result is authorized merely because someone supplied a workspace ID, contact ID or route. Demo switching must be explicit and not confused with authentication.

## Public allowlist

Construct a fresh DTO containing only: handle; approved public name/headline/biography/location/contact; public intake availability; published approved services (slug, title, description, deliverables, pricing label); approved published portfolio (title, summary, available public asset URL or null). Do not serialize the underlying profile/owner/workspace object and delete a few fields.

No owner email/login/session identifiers, internal rates, available effort, reservations, clients, private notes, offers, draft claims, financial data, internal settings, team events or knowledge sources. Portfolio attachments with missing bytes render metadata without a false working Open/Download action.

## Buyer offer allowlist

Construct `BuyerOfferProjection` from the **eligible exact shared revision** or immutable accepted snapshot: engagement/offer/version IDs; freelancer public name; this buyer's display name; title; deliverables; quoted gross money; buyer note; commercial terms/disclosure (deposit, business-day basis, timezone, input prerequisites, reservation expiry policy); offer expiry; public lifecycle/eligibility reason. Use safe, friendly conflict/expired/withdrawn/already-accepted states.

Never include estimated owner effort, available capacity, internal hourly floor, fee/FX/cost rationale, source qualification scores, acquisition economics, assessments, role traces, private notes, source message metadata, approval internals, other clients or unshared successor revision content. A superseded v1 may state that an update is pending; it does not expose v2 before sharing.

Offer PDF uses the same allowlist plus agreed sample issuer/buyer display details and exact version/terms/date, with a Sample label. It must not include private financial comparison panels from owner UI. Accepted terms are a snapshot, never a live join that changes because the owner edited policy.

## Buyer portal allowlist

Only this engagement: buyer-safe accepted terms; project title/brief/professional delivery state; required-input checklist and this buyer's supplied answers/files; committed dates or explicit uncommitted prerequisite state; shared milestones; explicitly shared available files; messages marked shared in this engagement; issued invoice/request number/lines/currency/gross outstanding/status; observed payment outcome visible to that payer with useful mismatch guidance; own buyer contact fields. Draft deposit request can show its authorized amount and next step before invoice issue. A manually drafted unrelated invoice is private until issue/share.

No owner work-task notes/private task list unless explicitly shared through a separate DTO; no net-after-fee amount/FX/margin; no other engagement payment records; no owner team activity stream; no whole-store export. Buyer input upload/download resolves attachment membership and audience, not just an attachment ID. Source records remain owner-only unless a specific sanitized source attachment has been explicitly shared.

## Owner exports

Owner finance CSV groups/labels currency and uses relevant filter selection; distinguish gross/fee/net, observed/reconciled, invoice outstanding and planned costs. It may contain authorized owner fields but must not contain credentials or hidden prompts. Escape CSV formula-leading values (`=`, `+`, `-`, `@`, tabs/newlines) so user-entered descriptions do not become spreadsheet formulas. Public/buyer exports use the narrower schemas even when an owner downloads a buyer preview.

## Required negative tests during implementation

Seed a private note with a unique marker and assert it is absent from buyer/public DOM, serialized DTO, PDF text and transcript. Seed another-client IDs/amounts and assert absence. Verify owner effort/fee/FX/upfront-cost fields are absent, not CSS-hidden. Unknown/mismatched/revoked grants fail closed; stale shared versions cannot accept; unpublished services cannot be fetched by guessing a slug. No real server isolation may be claimed from passing these local projection tests.
