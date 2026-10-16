# Runtime/editor extensions required during implementation

The JSON fixture schema is a **seed/branch interchange schema**, not a complete runtime API schema. Never enforce its observed null-only fields against new valid domain data. Conversely, do not accept arbitrary fields from buyer inputs because an unseeded table allows extra properties. The implementation must define concrete validators/DTOs for the complete form/command inventory, using these boundaries.

## Resumable setup

`onboarding_sessions.draft` has bounded optional fields in the supplied schema: `business`, `services`, `portfolio`, `schedule`, `intake`, `commercialDefaults`, `preferences`, `connections`, `lastStep`. Each incomplete step can save its valid partial draft; final submission enforces the necessary required fields. UI setup DTO keys use camelCase; the adapter explicitly maps them to canonical snake_case domain properties. No password or token belongs in this draft.

Business: displayName, profession, timezone, locale, handle/email. Service drafts: title, slug, description, deliverables, pricing. Portfolio: sourceId/status/title/summary. Schedule: weekdays, per-weekday start/end intervals, unavailable dates and available effort minutes. Intake: open/limited/unavailable and optional availableFrom. Commercial defaults: currency, deposit basis points, delivery days, reservation hours. Preferences: locale/motion/Focus/recap/notifications. Connection drafts: explicitly approved sample capability arrays per provider.

## Required persisted support models

Add these to the implementation's runtime normalized schema (with migration/reset versioning) or equivalently typed separately scoped state; document their exact paths in final context. Do not fake them by changing a button label.

| Model | Required fields and behavior |
|---|---|
| Editor draft | draft ID, record table/ID, base version, typed editable fields, dirty/pending state, saved timestamp. Save commits; cancel discards only this draft; persistence errors preserve it; stale base offers compare/copy. |
| Public publication snapshot | explicit approved profile/service/portfolio values, revision, approval, published timestamp. Editing private draft does not mutate public content until deliberate exact-version publication approval. |
| Sample session | local session ID, owner or buyer role, linked owner/grant, created/expiry timestamps, mode sample. No real password or identity-provider token. |
| Sample recovery grant | local ID, linked sample account, expiration, consumed/revoked state, scenario; reset UI is simulation and never sends email. No actual account lookup claim. |
| Team request | ID, exact free text, context refs/versions, created timestamp, curated intent or unsupported status, clarification answers, linked run/draft IDs. Unsupported input stays saved and editable. |
| Notification read/dismiss state | source event/record ID, actor, read/dismissed timestamp. Derived actionable cards follow canonical lifecycle; dismiss does not approve or delete the business record. Catch-up marker and notification state are distinct. |
| Focus/recap preferences | owner-scoped focusMode, recapEnabled, reduced-motion/pause, lastSeenEventSequence. Focus alters attention/presentation without hiding required controls or changing business records. |
| Working schedule | IANA timezone, weekday intervals, exception/unavailable dates, effort window/basis; validate start<end and overlap; intake availability is separate. |
| Per-role capability preference | role ID, allowed sample read/draft capabilities and approval boundaries. Turning a role off pauses/blocks future runs, preserves artifacts, never grants external send permission. |
| Knowledge/public claim draft | source ID/version, permitted audience, claim text, approval/publication snapshot refs. Unapproved claim never reaches public projection. |

Changing profile/services/policies only affects future or unaccepted assessments/offer drafts where relevant; accepted commercial snapshots remain immutable. Only the sample Alya workspace exists in this scope. Adding real workspace switching/membership, production auth, credentials or admin infrastructure is outside the frontend implementation.

## Validation examples

Dates parse as genuine ISO dates/offset datetimes with IANA context. Schedule weekdays0–6; interval start<end; exceptions cannot duplicate contradictory periods. Handles/slugs validate and remain unique; all return paths are trusted local routes. Email input syntax is validated without pretending delivery verification. Currency/minor-unit scale and basis points use bounded exact values; offer price/positive quantities required before review, optional incomplete draft allowed. Deposit basis points0–10000; sample accepted offer remains6000. Known role capabilities are allowlisted, not arbitrary tool names supplied by a text prompt.

The implementation must add tests for these real runtime schemas and adapters. The supplied fixture verifier validates the seed/branches only and cannot be cited as evidence that these editors, sessions, notifications or commands have been implemented.
