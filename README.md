# Crewmori

Crewmori is a freelancer-owned AI business team. Six illustrated specialists help with opportunities, sales, promotion, client relationships, operations and money. The freelancer performs the commissioned professional work.

This repository contains the connected owner workspace, public freelancer/service pages, buyer journey, Next.js APIs and a persistent Node worker. Supabase supplies Auth, PostgreSQL and private Storage. Claude tasks, Gemini knowledge retrieval, Google integrations, ElevenLabs voice and sandbox/Stripe test payments connect through scoped server workflows.

Set `CREWMORI_BACKEND_ENABLED=true` after configuring the database/Auth and running migrations. Connected accounts start empty and use server sessions, reviewed business commands and durable jobs. The default disabled mode keeps the independent browser demo available without service accounts. See [activation, provider configuration and verification](docs/BACKEND.md) and [`.env.example`](.env.example). External accounts and hosted deployment still require configuration and live validation.

## Run locally

Use Node.js **22.13.0 or later** and npm. Versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
```

Open `http://localhost:4173`. To use another development port:

```sh
npm run dev -- --port 3000
```

Production build and local production server:

```sh
npm run build
npm start
```

`npm start` serves the production build at port 4173. The demo needs no credentials. For the connected app, copy `.env.example` to `.env.local`, configure services, run `npm run db:migrate` and `npm run storage:setup`, then start `npm run worker` alongside the web process.

Verification commands:

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm run test:e2e
npm run test:api
```

Unit tests use `node --import tsx --test`. Database/browser suites create disposable PostgreSQL clusters; install PostgreSQL server binaries and run `npx playwright install chromium` before the first browser test. The browser suite uses the production web app and real worker with isolated provider test services. See `docs/BACKEND.md` for connected verification; older frontend handoff documents describe the retained demo. A source build is not evidence of a live deployment.

## Try the sample

These sample instructions apply when the backend flag is disabled.

1. Open `/` and choose the sample workspace, or open `/app/home` directly in a fresh browser.
2. Review Northstar's proposed offer from Home. The initial offer is awaiting review; there is no accepted project, reservation, invoice or received payment yet.
3. Use **Sample workspace** in the header to load one of twelve independent scenarios, reset edited records, or advance the frozen clock. Scenario changes replace the branch instead of merging different histories.
4. Use the offer's actual buyer link after sharing. It includes the engagement, grant and shared version needed by the local buyer projection. Bare buyer URLs without a matching grant are unavailable.
5. For a ready-to-inspect example, load `active_paid_project` and explore Work, Money and the buyer continuation. For reconciliation, load `partial_receipt` or `wrong_currency_receipt`.

Useful entry points:

| Surface | Local path |
| --- | --- |
| Product introduction | `/` |
| Owner Home / Team | `/app/home`, `/app/team` |
| Opportunities / offers | `/app/opportunities`, `/app/offers` |
| Projects / clients / calendar | `/app/projects`, `/app/clients`, `/app/calendar` |
| Invoices / payments / expenses | `/app/money/invoices`, `/app/money/payments`, `/app/money/expenses` |
| Business profile / tools | `/app/settings/profile`, `/app/connections` |
| Sample public freelancer | `/u/alya` |
| Sample public service | `/u/alya/services/launch-animation` |
| Account and setup | `/auth/sign-in`, `/auth/sign-up`, `/onboarding` |
| Northstar buyer conversation | `/inquiry/engagement_northstar?grant=grant_northstar` |
| Northstar buyer offer | `/buyer/engagement_northstar/offer?grant=grant_northstar` |
| Northstar buyer continuation | `/buyer/engagement_northstar?grant=grant_northstar` |

Buyer availability depends on the active scenario and exact shared version. These grant strings are sample navigation identifiers, not production credentials. Owner/buyer views in the same browser read the same normalized local records; this is how the demonstration stays synchronized.

## Saved state and files

This section describes demo persistence. Connected records live in PostgreSQL; files use private Storage and scoped signed downloads. Connected sessions do not save owner records in browser localStorage.

Committed records are stored under `localStorage['crewmori.workspace.v1']`, using runtime schema `1.1.0`. Local receipt/project/source bytes are stored in IndexedDB database `crewmori-files-v1`, object store `files`. A different browser or cleared site data has a different workspace. Downloaded files are ordinary files on your device.

The sample clock begins at **16 October 2026, 09:00, Asia/Jakarta**. Business calculations use that clock, not the machine's present time. Explicit day advancement checks expiry and prerequisites. Changing a display preference does not rewrite agreed dates, currency, or commercial terms.

Corrupt/incompatible saved state shows recovery/export and reset actions rather than silently overwriting it. There is no automatic schema migration. Reset replaces the workspace record snapshot; unreferenced local binary blobs are not a managed cloud archive and may remain in browser storage until site data is cleared. Onboarding supports Save and leave/resume. Most ordinary unsaved editor buffers live in React and are protected by dirty-change warnings; they are not all restored after a hard reload.

Uploads accept actual **PDF, PNG, JPEG or TXT**, with matching type/content signatures, at most **10 MiB per file and five per action**. Expense receipt replacement accepts one file. User SVG, HTML and ZIP are rejected. Approved bundled SVG artwork is separate from user uploads. Missing file bytes are shown as unavailable; the application does not manufacture substitute receipts. Expense ZIP exports include real available bytes and a hash manifest identifying omissions.

## Deploy from GitHub to Vercel

1. Extract the source archive so `package.json`, `src/`, `public/` and this README are at the repository root.
2. Commit the source and lockfile to a GitHub repository. Exclude `node_modules`, `.next`, `.git`, local caches and private test captures. Preserve the supplied documentation, licensed source references and historical archive parts as repository material.
3. Import the repository into Vercel with the **Next.js** framework preset and **Root Directory `.`**.
4. Use **Install Command `npm ci`**, **Build Command `npm run build`**, and the framework's default output configuration. Do not set `output: 'export'` or a custom static output directory.
5. Choose a supported Node runtime satisfying `>=22.13.0`. Leave environment variables empty for the demo, or follow `docs/BACKEND.md` to configure the connected web app and separate persistent worker.
6. After deployment, check `/`, a direct owner detail URL and a valid buyer link in the deployed browser. The repository does not include a claim that this deployment has already happened.

Documentation, research, reference images and skill snapshots belong outside `public/` and are not imported into the app. The root `.vercelignore` excludes handoff-only material from Vercel CLI source uploads; Git-based deployment still builds the same root project. Only `public/assets/` contains publicly served assets. Source-upload limits and runtime bundle limits are different concerns.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/app/[[...slug]]/page.tsx` | Next App Router entry with suspense; all declared paths enter the client application |
| `src/components/application.tsx` | Route dispatch and owner-session guard |
| `src/components/ui.tsx` | Shared controls, fields, native-dialog overlays, dirty navigation guard and feedback |
| `src/components/shell.tsx` | Owner navigation, search, scenarios, notifications, recap and delegation |
| `src/views/` | Home/Team, acquisition, Work, Money, public/buyer/account and Settings domain views |
| `src/lib/engine.ts` | Shared transactional business rules plus independent demo scenarios |
| `src/lib/store.tsx`, `connected-store.tsx` | Demo/connected store selection, asynchronous commands and refresh |
| `src/lib/projections.ts` | Explicit public profile, inquiry, buyer offer and buyer portal field allowlists |
| `src/lib/downloads.ts` | Real PDF/CSV/ZIP generation, upload checks, hashes and IndexedDB file access |
| `src/lib/local-crypto.ts` | Local sample IDs and hash support, including restricted browser contexts |
| `src/lib/i18n.ts` | Central English/Bahasa Indonesia interface dictionary |
| `src/lib/fixture.json`, `scenarios.json` | Canonical baseline and twelve independent sample branches |
| `src/lib/spec-contracts.ts` | Retained typed contract vocabulary alongside the runtime adapter |
| `tests/` | Domain, projection, lifecycle, stale/replay, file and arithmetic checks |
| `src/server/`, `src/app/api/` | Opt-in authenticated APIs, provider adapters and backend services |
| `supabase/migrations/`, `scripts/worker.ts` | Private database schema and durable worker process |
| `docs/BACKEND.md` | Connected activation, API inventory, provider setup and verification boundaries |
| `public/assets/` | Used local fonts, approved logo vectors, characters, map and sample portfolio artwork |
| `docs/MASTER_AI_CONTEXT.md` | Current architecture, product decisions, known limits and continuation context |
| `docs/DEVELOPER_FUNCTIONALITY.md` | Route/action inventory and production replacement responsibilities |

## Design and provenance

The supplied first two Stitch references govern Home's editorial briefing and Team's Global Studio composition. The supplied brand package governs palette and logo geometry. The active overlay intentionally uses **Newsreader + Inter**, forest `#245C47`, warm canvas `#F5F3EC`, paper `#FFFEFA`, ink `#202A25`, and large approximately 24px panels. Six supplied coworker illustrations and the subdued world map are local assets. The original brand kit's generic DejaVu/12px-card defaults do not override this application overlay.

Consult `DESIGN.md`, `UX-CONTRACT.md`, the retained design/contract documents, asset provenance manifests, font OFL notices and licensed skill snapshots. Supplied brand/reference material does not become an unrestricted open-source asset merely because it is included in a source handoff. No brand-guideline builder is an application build dependency.

## Material boundaries

- Disabled mode is a local Alya sample workspace with simulated accounts and provider actions. Connected mode uses verified server sessions, scoped workspaces and real provider transports. External `.example`/`.test` identities in fixtures/tests are synthetic.
- Payment modes are sandbox and Stripe test. Live money, escrow, refunds and tax calculation are not enabled. Hosted providers, microphone conversations and deployment need account-specific validation.
- Reviewed successor amendments reuse the existing project and preserve accepted versions, original invoices and receipts. A positive upfront difference creates an authorized amendment-deposit draft/request; new funds and usable inputs must arrive before revised duration dates apply. Reductions requiring credits/refunds, insufficient capacity and elapsed/conflicting schedules return explicit review requirements. Saved operational schedule-change proposals remain proposals until separately agreed.
- English/Bahasa dictionaries cover shared UI and substantial Settings content; some domain prose/native labels remain English. The application is not represented as fully translated word for word.
- Connected buyer authorization and response allowlists are enforced on the server. Demo browser storage remains independent of connected accounts.
- Generic generated PDFs use standard PDF fonts; full multilingual typography and jurisdiction-specific invoicing/tax rules remain production work.

Approval, share, acceptance, receipt allocation and professional delivery remain distinct operations. See `docs/BACKEND.md` for implementation limits and account activation.


## Verified handoff

The following release notes preserve the original frontend handoff. Connected implementation evidence is maintained in `docs/BACKEND.md`.

The delivered revision passes clean `npm ci`, type checking, lint, 95 automated tests and the production build. All 34 route patterns were opened; selected owner/buyer, invoice, setup, preference and responsive journeys received browser checks. Read `docs/VERIFICATION.md` for the exact scope.

`docs/TRACEABILITY.md` explicitly records 12 detailed interaction differences plus partial Indonesian copy and non-universal draft recovery. It is the continuation checklist for those remaining frontend details; a passing build does not imply exhaustive control or accessibility verification.


## Spacing polish release 1.0.1

This patch refines Team action spacing, search borders/focus, filter layout, command-field shrinking, phone header labels and small control targets. Read `docs/POLISH_NOTES.md` for the exact scope and validation. Upload the extracted project contents to the existing repository and commit to its Vercel-connected branch to publish this revision.


## Taste refinement release 1.1.0

This version quiets the supporting chrome, simplifies Home decisions/updates, improves Team illustration/state hierarchy, and replaces repeated public/acquisition cards with open sections or ruled lists. It preserves the original brand and local workflows. See `docs/TASTE_REFINEMENT.md` for design references and exact verification. The updated master context is version 2.2.

Replace the existing GitHub repository contents with this ZIP's extracted project files and commit to the branch connected to Vercel. Keep the repository root, Next.js preset, `npm ci`, and `npm run build`. Existing browser sample records remain compatible. A new source ZIP does not automatically update the deployed site.
