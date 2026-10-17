# Crewmori 1.2.1

A freelancer’s business workspace with six illustrated teammates. This release improves navigation continuity, forms, connected workflows, sign-in recovery, search, notifications and responsive working screens while preserving the original identity.

This combined release also includes the supplied Google-provider availability check and its controlled-service test support. See [merge notes](docs/FRIEND_MERGE.md).

Read [current context](docs/MASTER_AI_CONTEXT.md), [handoff](docs/IMPLEMENTATION_HANDOFF.md), [verification](docs/IMPLEMENTATION_VERIFICATION.md), [backend setup](docs/BACKEND.md) and [worker operations](docs/WORKER_OPERATIONS.md).

## Restore the source ZIP

Extract Crewmori_Updated_Source_1_2_1.zip into your destination. It contains the complete Crewmori/ app root. Install from that folder after extraction. Git history, node_modules, .next, local secrets and test screenshots are excluded. Preserve the existing repository’s remote/branch/environment settings when copying in the source.

## Install and run

Use Node >=22.13.0 and npm. Run npm ci, then npm run dev (port 4173). Production uses npm run build and npm start. Connected setup requires the existing .env.example variables in your host’s secret store; see docs/BACKEND.md. Without connected mode, the local sample stays separate from real account data.

## Verify

Run npm run typecheck, npm run lint, npm test and npm run build. Then install the test browser with npx playwright install chromium and run npm run test:ux. This UI runner uses intercepted fixtures and removes live provider/database credentials from its child server environment. Optional CREWMORI_CHROMIUM_EXECUTABLE selects a separately installed headless Chromium for constrained CI.

Full database integration and controlled-service end-to-end checks are npm run test:db and npm run test:e2e. They need PostgreSQL server binaries, an unprivileged user and (for E2E) a production build and Chromium. npm run test:api checks backend-disabled HTTP smoke; it is not a connected-provider audit. Read the verification record rather than assuming every suite ran.
