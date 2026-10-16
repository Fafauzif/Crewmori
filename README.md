# Crewmori frontend

Crewmori is a freelancer-owned AI business team. Six illustrated specialists help with opportunities, sales, promotion, client relationships, operations and money. The freelancer performs the commissioned professional work.

This repository is a working **local frontend simulation**. It contains the owner workspace, public freelancer/service pages, inquiry and buyer journey, sample account/setup screens, editable records and real downloadable files. Agent outputs, connected tools, sending, publishing and payments are deterministic sample effects. No live service credentials or business backend are required.

## Run locally

Use Node.js **20.9.0 or later** and npm. Versions are pinned in `package.json` and `package-lock.json`.

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

`npm start` serves the production build at port 4173. No `.env` file, API key, OAuth credential, database, or model connection is needed.

Verification commands:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The test command uses `node --import tsx --test`; it does not require the IPC socket opened by the separate `tsx --test` CLI. See `docs/BUILD_STATUS.md` and `docs/VERIFICATION.md` for the final evidence record. A source build is not evidence of a live Vercel deployment.

## Try the sample

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

Committed records are stored under `localStorage['crewmori.workspace.v1']`, using runtime schema `1.1.0`. Local receipt/project/source bytes are stored in IndexedDB database `crewmori-files-v1`, object store `files`. A different browser or cleared site data has a different workspace. Downloaded files are ordinary files on your device.

The sample clock begins at **16 October 2026, 09:00, Asia/Jakarta**. Business calculations use that clock, not the machine's present time. Explicit day advancement checks expiry and prerequisites. Changing a display preference does not rewrite agreed dates, currency, or commercial terms.

Corrupt/incompatible saved state shows recovery/export and reset actions rather than silently overwriting it. There is no automatic schema migration. Reset replaces the workspace record snapshot; unreferenced local binary blobs are not a managed cloud archive and may remain in browser storage until site data is cleared. Onboarding supports Save and leave/resume. Most ordinary unsaved editor buffers live in React and are protected by dirty-change warnings; they are not all restored after a hard reload.

Uploads accept actual **PDF, PNG, JPEG or TXT**, with matching type/content signatures, at most **10 MiB per file and five per action**. Expense receipt replacement accepts one file. User SVG, HTML and ZIP are rejected. Approved bundled SVG artwork is separate from user uploads. Missing file bytes are shown as unavailable; the application does not manufacture substitute receipts. Expense ZIP exports include real available bytes and a hash manifest identifying omissions.

## Deploy from GitHub to Vercel

1. Extract the source archive so `package.json`, `src/`, `public/` and this README are at the repository root.
2. Commit the source and lockfile to a GitHub repository. Exclude `node_modules`, `.next`, `.git`, local caches and private test captures. Preserve the supplied documentation, licensed source references and historical archive parts as repository material.
3. Import the repository into Vercel with the **Next.js** framework preset and **Root Directory `.`**.
4. Use **Install Command `npm ci`**, **Build Command `npm run build`**, and the framework's default output configuration. Do not set `output: 'export'` or a custom static output directory.
5. Choose a supported Node runtime satisfying `>=20.9.0`. Leave environment variables empty for this simulation.
6. After deployment, check `/`, a direct owner detail URL and a valid buyer link in the deployed browser. The repository does not include a claim that this deployment has already happened.

Documentation, research, reference images and skill snapshots belong outside `public/` and are not imported into the app. The root `.vercelignore` excludes handoff-only material from Vercel CLI source uploads; Git-based deployment still builds the same root project. Only `public/assets/` contains publicly served assets. Source-upload limits and runtime bundle limits are different concerns.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/app/[[...slug]]/page.tsx` | Next App Router entry with suspense; all declared paths enter the client application |
| `src/components/application.tsx` | Route dispatch and local sample owner-session guard |
| `src/components/ui.tsx` | Shared controls, fields, native-dialog overlays, dirty navigation guard and feedback |
| `src/components/shell.tsx` | Owner navigation, search, scenarios, notifications, recap and delegation |
| `src/views/` | Home/Team, acquisition, Work, Money, public/buyer/account and Settings domain views |
| `src/lib/engine.ts` | Pure transactional sample commands, validations, lifecycle rules, events and scenarios |
| `src/lib/store.tsx` | React context, browser persistence, storage recovery and cross-tab refresh |
| `src/lib/projections.ts` | Explicit public profile, inquiry, buyer offer and buyer portal field allowlists |
| `src/lib/downloads.ts` | Real PDF/CSV/ZIP generation, upload checks, hashes and IndexedDB file access |
| `src/lib/local-crypto.ts` | Local sample IDs and hash support, including restricted browser contexts |
| `src/lib/i18n.ts` | Central English/Bahasa Indonesia interface dictionary |
| `src/lib/fixture.json`, `scenarios.json` | Canonical baseline and twelve independent sample branches |
| `src/lib/spec-contracts.ts` | Retained typed contract vocabulary alongside the runtime adapter |
| `tests/` | Domain, projection, lifecycle, stale/replay, file and arithmetic checks |
| `public/assets/` | Used local fonts, approved logo vectors, characters, map and sample portfolio artwork |
| `docs/MASTER_AI_CONTEXT.md` | Current architecture, product decisions, known limits and continuation context |
| `docs/DEVELOPER_FUNCTIONALITY.md` | Route/action inventory and production replacement responsibilities |

## Design and provenance

The supplied first two Stitch references govern Home's editorial briefing and Team's Global Studio composition. The supplied brand package governs palette and logo geometry. The active overlay intentionally uses **Newsreader + Inter**, forest `#245C47`, warm canvas `#F5F3EC`, paper `#FFFEFA`, ink `#202A25`, and large approximately 24px panels. Six supplied coworker illustrations and the subdued world map are local assets. The original brand kit's generic DejaVu/12px-card defaults do not override this application overlay.

Consult `DESIGN.md`, `UX-CONTRACT.md`, the retained design/contract documents, asset provenance manifests, font OFL notices and licensed skill snapshots. Supplied brand/reference material does not become an unrestricted open-source asset merely because it is included in a source handoff. No brand-guideline builder is an application build dependency.

## Material boundaries

- This is one local Alya sample workspace. Sign-in/recovery and buyer grants demonstrate navigation and lifecycle behavior, not server authentication or tenant security. Password fields are never persisted or transmitted.
- AI work, Gmail/Calendar/Drive, sending, publication, payments and status checks are simulated. External `.example`/`.test` identities are synthetic.
- Reviewed successor amendments reuse the existing project and preserve accepted versions, original invoices and receipts. A positive upfront difference creates an authorized amendment-deposit draft/request; new funds and usable inputs must arrive before revised duration dates apply. Reductions requiring credits/refunds, insufficient capacity and elapsed/conflicting schedules return explicit review requirements. Saved operational schedule-change proposals remain proposals until separately agreed.
- English/Bahasa dictionaries cover shared UI and substantial Settings content; some domain prose/native labels remain English. The application is not represented as fully translated word for word.
- Browser storage is not a multi-user durable database. The safe buyer rendering boundary must become a server-enforced authorization and response boundary before production.
- Generic generated PDFs use standard PDF fonts; full multilingual typography and jurisdiction-specific invoicing/tax rules remain production work.

The developer should replace the command/store/projection boundary with authenticated, versioned server APIs, durable storage/jobs/events and scoped provider adapters. Keep approval, share, acceptance, receipt allocation and professional delivery as distinct operations.


## Verified handoff

The delivered revision passes clean `npm ci`, type checking, lint, 95 automated tests and the production build. All 34 route patterns were opened; selected owner/buyer, invoice, setup, preference and responsive journeys received browser checks. Read `docs/VERIFICATION.md` for the exact scope.

`docs/TRACEABILITY.md` explicitly records 12 detailed interaction differences plus partial Indonesian copy and non-universal draft recovery. It is the continuation checklist for those remaining frontend details; a passing build does not imply exhaustive control or accessibility verification.


## Spacing polish release 1.0.1

This patch refines Team action spacing, search borders/focus, filter layout, command-field shrinking, phone header labels and small control targets. Read `docs/POLISH_NOTES.md` for the exact scope and validation. Upload the extracted project contents to the existing repository and commit to its Vercel-connected branch to publish this revision.


## Taste refinement release 1.1.0

This version quiets the supporting chrome, simplifies Home decisions/updates, improves Team illustration/state hierarchy, and replaces repeated public/acquisition cards with open sections or ruled lists. It preserves the original brand and local workflows. See `docs/TASTE_REFINEMENT.md` for design references and exact verification. The updated master context is version 2.2.

Replace the existing GitHub repository contents with this ZIP's extracted project files and commit to the branch connected to Vercel. Keep the repository root, Next.js preset, `npm ci`, and `npm run build`. Existing browser sample records remain compatible. A new source ZIP does not automatically update the deployed site.
