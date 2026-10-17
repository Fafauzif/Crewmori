# Crewmori 1.2.1 source handoff

Download Crewmori_Updated_Source_1_2_1.zip and extract it once. The complete application and context materials are inside Crewmori/. This combined release includes the UX implementation and the changes found in the two supplied friend archives. Read FRIEND_MERGE.md for the exact merge. The source inventory records file counts/checksums; source paths and licenses are preserved.

Copy the assembled app into your existing repository, review its diff, and push using your normal Git workflow. Do not replace your existing .git directory or committed remote settings. No Git history, node_modules, .next, .env.local, provider tokens or browser captures are included. The original brand/context source archive remains intact; historical frontend-only master docs were retained under docs/context/history.

## Release changes

Stable audience-scoped layouts and navigation, route skeletons, bounded/deduplicated reads, explicit saved/stale/session states, canonical form/pending/dialog feedback, readable Google handoff, safer buyer invitation replacement, corrected work and receipt contracts, atomic milestone assignment, buyer task/file projection, search completeness, truthful payment status, focused Home hierarchy, quieter empty states and expanded EN/ID copy. Additional peer review tightened generic command and accepted-file safeguards without loosening domain authority.

## After pushing

- Keep the existing hosted connected-mode environment. Account storage remains schema 1.1.0; no reset is required for this release.
- Supabase Google callback remains /api/auth/callback. /auth/verify is an in-app progress route, not a new provider redirect URI. Verify sign-in/cancel/expiry against the actual configured project.
- Verify a current hosted owner and buyer journey, real private-file storage, session expiry and cross-account isolation. Local UI fixtures do not replace these checks.
- Resolve the persistent worker deployment using WORKER_OPERATIONS.md. Source changes cannot start an unknown remote service.
- Test payment confirmation with configured sandbox/Stripe test webhook paths; no live money action was performed or enabled by this UI work.

## What is not claimed complete

Full-state pagination/delta transport, measured hosted Core Web Vitals and latency, exhaustive language coverage/native-language review, real mobile device/virtual keyboard and screen-reader assessment, live OAuth/provider readiness and full connected PostgreSQL end-to-end execution. See the exact verification record and backlog dispositions. The product has stronger interaction and domain contracts, but a build/static pass is not a production or WCAG certification.
