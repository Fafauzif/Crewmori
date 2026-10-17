# Crewmori 1.2.1 — final verification

Combined release verified 18 October 2026 (Asia/Jakarta; 17 October UTC). Build, unit, lint, typecheck, browser and HTTP checks were rerun after merging the supplied friend update. The design-token lint result below is retained from the unchanged 1.2.0 design documentation. These results concern the source and a local production build. The deployed Vercel site was not updated. No real messages, invitations, payments, provider connections or production records were changed during implementation.

## Results

| Check | Result | Scope |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | Passed | Existing locked dependencies installed; no UI dependency added. |
| `npm run typecheck` | Passed | Final TypeScript source and tests. |
| `npm run lint` | Passed | Application and test ESLint checks. |
| `npm test` | **170 passed; 0 failed; 0 skipped** | Includes 8 friend-merge regressions plus request resilience, owner scope, work commands, file privacy, Home priorities, money, search, notification and auth/tool helpers. |
| `npm run build` | Passed | Clean Next.js 16.4.2 production build, including route generation and built-in TypeScript checks. |
| `npm run verify:build-assets` | Passed | All 7 referenced client browser chunks exist in the production output. |
| `npm run test:ux` | **22 passed; 0 failed** | Production UI with intercepted synthetic API fixtures; final run 26.0 seconds. |
| `npm run test:api` | Passed | Health, backend-disabled mutation/query errors, unknown API and an existing frontend route. |
| Premium UI project audit, strict mode | Passed | 0 errors and 0 warnings. Static contract/pattern audit; does not execute runtime checks or certify accessibility. |
| `designmd lint DESIGN.md` (unchanged 1.2.0 baseline) | Passed with warnings | 0 errors, 12 warnings, 1 information item. The token registry contains values not referenced by all component declarations; runtime CSS remains canonical. |
| `git diff --check` | Passed | No whitespace errors in the implementation diff. |
| Final build-input comparison | Passed | All 163 source/test/script/config input hashes remained identical through the final build, unit and browser checks. `implementation-build-input-sha256.json` records the snapshot. |

The tests ran with Node 24.19.0. The UI runner removed live database/provider credentials from its child server environment. Standard Playwright browser installation was unavailable in this environment, so the final local run selected separately installed headless Chromium 153 through `CREWMORI_CHROMIUM_EXECUTABLE`. This browser binary and its installation are not application dependencies and are not included in the source ZIPs. A normal checkout can use `npx playwright install chromium` before `npm run test:ux`.

## Friend-merge coverage

The two changed incoming files were combined with the existing UX implementation; all other previous runtime/test/script inputs stayed intact. The new server helper and eight tests verify explicit enabled/disabled settings, the 60-second project/key-scoped cache and expiry, non-success/malformed/unknown settings, network/timeout recovery, missing configuration, the supplied service mock and disabled-provider recovery preserving a workspace deep link. The settings preflight has a five-second bound and never grants a session. Read `FRIEND_MERGE.md` for the exact merge.

## What the browser suite exercised

- Visible sign-in handoff failure and cancelled OAuth callback recovery; invalid payment links; confirmed/unknown payment states; bounded unconfirmed polling and manual check.
- Disconnected tool actions and empty initial permissions; knowledge search empty/error results; clearing and replacing a delayed query without obsolete results reappearing.
- Required expense validation, linked inline errors, first-error focus, locked pending fields/close/cancel controls, stable button width, repeated Enter protection, retained rejected draft and visible feedback above a native dialog.
- Public/sign-in independence from owner state; private form remount when authenticated owner identity changes; persistent owner shell across navigation.
- Mobile menu focus containment/Escape/return focus; complete global search beyond the first 30 results; immediate clear; notification read markers surviving canonical refresh and reload.
- Home, Team and Money reflow at 1440, 1280, 1024 and 390 CSS pixels; Money at a 200%-equivalent CSS viewport. This viewport check is not an actual browser-zoom or real-device test.
- Dedicated task/milestone/reference/upload flows with delayed save and draft retention, reloaded fixtures, and a phone-width work dialog.

Internal screenshots were inspected for the established forest/ivory identity, Home spacing, Team empty state and mobile reflow. They contain synthetic fixtures and are intentionally excluded from the handoff. Test fixtures control responses: they do not establish that hosted PostgreSQL, storage, Google, payment webhooks or the worker operate correctly.

## Important checks still required

| Area | Why it remains open | Next check |
| --- | --- | --- |
| Full database integration | PostgreSQL server binaries and a usable unprivileged OS user were unavailable. `test:db` was not run; new connected DB assertions are included. | Run `npm run test:db` on a supported disposable PostgreSQL environment. |
| Controlled connected end-to-end suite | Requires disposable PostgreSQL, the worker and controlled provider fixtures. `test:e2e` was not run. | Run `npm run build`, install Chromium, then `npm run test:e2e` as documented by the suite. |
| Hosted auth and provider journeys | Source UI fixture checks cannot verify the actual project's credentials, redirects, granted scopes, storage policies or webhooks. | Check real sign-in/cancel/expiry, reconnect, owner/buyer isolation, private-file download and configured payment test mode after pushing. |
| Worker operations | Hosting is unknown; a web build cannot provision or prove a persistent worker. | Follow `WORKER_OPERATIONS.md`; verify continuing queue consumption and a completed disposable task/index job. |
| Accessibility and locale completeness | Keyboard/focus behavior and responsive screens were sampled. No exhaustive assistive-technology, contrast, native-language, real iOS/Android keyboard or reduced-motion assessment was performed. | Run a screen-reader and real-device pass, complete the contrast inventory and review both locales. |
| Hosted performance | No controlled before/after Core Web Vitals or server/database latency profile. Cloud browser could not reach the local build (`ERR_CONNECTION_REFUSED`); no tunnel or deployment was created. | Profile the pushed build with realistic workspace sizes and connection/device conditions; assess pagination/deltas. |

The 46-item implementation register is `UX_IMPLEMENTATION_STATUS.json` (CSV companion included). “Implemented” describes the source change, not proof that every acceptance scenario ran. “Implemented with limits” retains explicit deferred requirements. Original audit source line references point to the preimplementation baseline; use `implementation_paths` to locate the updated code.

## Reproduce and release

Extract the single `Crewmori_Updated_Source_1_2_1.zip` before installing. Read `IMPLEMENTATION_HANDOFF.md`, preserve the existing hosted secrets, run the supported checks, and inspect the source diff before pushing. No new SQL migration or JSON-state reset is required by this release. Existing provider callback registration remains `/api/auth/callback`; the new `/auth/verify` route is in-app progress UI.
