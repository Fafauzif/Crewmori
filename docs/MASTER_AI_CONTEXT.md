# Crewmori — current implementation context

Version 1.2.1 · 18 October 2026 · Source handoff, not a hosted deployment

Start with this file, root DESIGN.md, root UX-CONTRACT.md and docs/BACKEND.md. Historical frontend-only context is preserved under docs/context/history and the original evidence archive. Principal is historical naming. Old demo-only instructions do not override the connected implementation.

## Product and identity

Crewmori supports an independent freelancer with six original business teammates: Scout, Promoter, Sales, Account Manager, Operations and Finance. The owner does the professional delivery work and reviews consequential business decisions. Preserve forest/ivory/paper/ink tokens, Newsreader + Inter, the original illustrations, five primary destinations and Team’s Global Studio. Personalities are strongest on Home/Team/onboarding; working documents and payment/error screens prioritize precise state and action. No gamification or illustration rebrand was introduced.

## Current architecture

- Next.js 16.4.2, React 19.2.4, TypeScript 5.9.3, Node >=22.13.0; package/lock version 1.2.1. Existing JSON state schema stays 1.1.0; do not reset user data for this release.
- Connected mode is selected with CREWMORI_BACKEND_ENABLED=true. Supabase provides real Google-only Auth, private storage and PostgreSQL. A separate persistent Node worker runs AI/knowledge/maintenance queues. Disabled mode remains a local browser sample.
- Root layout owns persistent ApplicationFrame/StoreProvider. Owner navigation shares a resource scope, preserving Shell; public/auth/profile/buyer/payment routes are isolated. Account change remounts private UI. Owner writes are bound to the workspace from which their form was loaded.
- ConnectedStore coalesces reads/commands, cancels abandoned reads, pauses hidden/offline polling, backs off errors and avoids applying identical projections. It still fetches a full workspace projection; server pagination/deltas remain future performance work.
- Confirmed command receipts return without waiting for a full projection read. Revalidation is asynchronous; saved-but-stale feedback is explicit. Commercial state remains server-confirmed, with immutable accepted snapshots, version checks and stable idempotency keys. Unknown buyer message/inquiry retries retain the exact original payload.
- Shared Form/Field own validation, summary links, field descriptions and deferred first-error focus. Pending forms freeze their fields/actions and block modal closure; promise-aware Buttons register non-submit pending work too. Shared Confirm awaits results; native dialogs retain focus isolation and body-scroll locking. NotificationToast portals into an active native dialog so feedback is visible above its top layer.
- Google sign-in enters /auth/verify, then the existing /api/auth/google and /api/auth/callback PKCE path. Callback returns to visible workspace preparation through POST /api/auth/complete. Existing Supabase redirect registration remains /api/auth/callback. Do not reintroduce unsupported password recovery.
- The supplied friend update adds a five-second Google-provider settings preflight before OAuth. Only an explicit boolean setting from a successful response is cached for 60 seconds per project/key. Disabled sign-in returns to in-app recovery with the safe destination; network/non-success/malformed replies leave OAuth to decide. Supabase OAuth/PKCE remains authoritative.
- Dedicated task.save, milestone.save, milestone.proposeChange, file.link/file.archive and calendar.proposeCancellation commands replace rejected generic saves. Milestone assignment is atomic. File attachments are checked against uploaded metadata and buyer/project/engagement scope; shared accepted bytes cannot be silently replaced/removed. Nonproject receipt attachment paths remain supported.
- Buyer invitation replacement explicitly explains revocation; tokens remain memory-only for recopy and are never added to audit events. Buyer task/file/message projections remain narrow.
- Payment return has provider-backed status-specific copy, finite backoff, terminal stop and manual check. No checkout redirect alone proves payment. Providers remain sandbox/Stripe test; live money is outside this repository’s supported contract.
- English/Bahasa coverage was expanded substantially, including new status/error/action copy. Authored business content is not silently translated; exhaustive locale/device/screen-reader certification remains outstanding.

## Current verification and release entry points

Read docs/IMPLEMENTATION_VERIFICATION.md for actual final results and limitations, docs/UX_IMPLEMENTATION_STATUS.json for all 46 backlog dispositions, docs/WORKER_OPERATIONS.md for the unknown worker deployment, and docs/IMPLEMENTATION_HANDOFF.md for restore/build/push instructions. Existing test:db and test:e2e require disposable PostgreSQL and an unprivileged OS user. New test:ux uses production UI plus intercepted synthetic API fixtures, strips live service credentials and requires a Playwright Chromium binary. It proves UI behavior, not hosted database/provider readiness.

No hosted files, production records, account connections, external messages or payments were changed in this run. The user will extract the single combined source ZIP and push to their repository. No environment secrets, dependencies, build output, browser artifacts or Git history belong in those ZIPs.
