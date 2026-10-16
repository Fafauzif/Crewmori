# Backend preparation and activation

Updated 17 October 2026. The application now selects the connected frontend when `CREWMORI_BACKEND_ENABLED=true`. The default disabled mode retains the demo for local design review. Connected accounts use real server sessions and empty workspaces; business mutations run through serialized PostgreSQL transactions with idempotency and stale-version checks.

Connected flows now include auth/recovery, onboarding, published profiles, public inquiries, single-use buyer invitations, scoped buyer projections, and the domain command API. The remaining provider integration work is tracked below; setting the flag alone does not configure external accounts. Keep credentials in the hosting secret store or `.env.local`.

The detailed preparation inventory below describes the initial provider boundaries. The connected implementation supersedes its statements that StoreProvider and domain commands are entirely local. See the final integration status before activating a deployment.

## Implemented and prepared

| Area | Implemented now | Still required for the connected product |
| --- | --- | --- |
| Identity/workspaces | Server-verified Supabase sessions, HTTP-only cookies, signup/signin/recovery/reset endpoints, owner workspace lookup, CSRF origin checks | Connect account/onboarding UI; test email confirmation/recovery against the actual project; account deletion/retention |
| Database | Versioned SQL migrations, private schema, workspace RLS, normalized versioned JSONB records, transactional idempotency/event helpers | Port the complete domain command layer; add specific relational constraints where records become commercial/financial authority |
| Files | Server type/signature/size validation, private bucket check, pending/available records, scoped signed download links | Connect existing upload/download UI; buyer upload/share workflow, deletion and orphan cleanup |
| Buyer identity | Cryptographic tokens stored as hashes, engagement-bound expiring grants, replacement revocation | Migrate inquiry/engagement creation and buyer UI; single-use invitation-to-session exchange |
| Claude | Official SDK, six distinct role prompts, structured draft output, source-ID validation, token caps | Configure an available model; run live task/evidence evaluations; map reviewed artifacts to business-specific commands |
| Worker | pg-boss dispatch through an outbox, LangGraph Postgres checkpoints, pause/cancel/resume/retry, atomic daily token reservations, saved usage/artifacts | Operational alerting and cleanup; cost budgets calibrated to actual account pricing; complete handoff orchestration |
| Google | OAuth PKCE/state/owner binding, encrypted token storage, refresh/version checks, disconnect; Gmail draft/send, Calendar free/busy/invite and Drive file-list adapters | Provider OAuth verification where applicable; owner-approved dispatch service and existing Connections UI wiring; Drive picker/import |
| Gemini | Configurable embedding SDK and dimension validation | Extraction/chunking/index migrations, retrieval ranking and ingestion jobs |
| Voice | Buyer-authorized ElevenLabs signed sessions, consent, session quota, signed transcript webhook, session-bound narrow tools | Browser microphone/ElevenLabs client integration, provider agent configuration and live voice recovery tests |
| Payments | Signed sandbox webhook, Stripe test Checkout/status/signature/normalization adapters, immutable observations, event/checkout deduplication, quarantine | Connect authorized invoices to provider request creation; transactional allocations, settlement, prerequisite/calendar effects and buyer payment UI |
| Discovery/email | Bounded Exa search and Resend transport adapters | Task dispatch, reviewed recipients/content, explicit owner approval and uncertain-outcome recovery |

The prepared voice tools are `capture_requirements`, `get_public_offer_status` and `request_owner`. Voice cannot approve an offer, accept for a buyer, move money or inspect owner-private records. Draft model artifacts always require owner review. External send/invite/payment creation adapters are not exposed through unrestricted HTTP dispatch endpoints.

Verified payment observations remain `review_required`. A signed webhook does not mark an invoice paid or commit a project start. Unknown provider events/references remain quarantined. Stripe events for the same Checkout session are deduplicated even when their event IDs differ. Unknown fees stay null. This intentionally leaves the commercial allocation step visible as outstanding work.

## Local setup

Use Node.js **22.12 or newer** (the worker's pg-boss requirement), npm, and a Supabase project. Keep credentials in `.env.local` or the hosting secret store.

```sh
npm ci
cp .env.example .env.local
npm run backend:check
```

`backend:check` reports missing variable names without printing values. “Configured” means present, not authenticated or connection-tested. Fill the core configuration first:

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Exact application origin; HTTPS when hosted, HTTP allowed on localhost |
| `DATABASE_URL` | Server PostgreSQL connection; use direct or session-pooler access for the worker, with verified TLS when hosted |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server-side user session integration |
| `SUPABASE_SECRET_KEY` | Server-only Supabase storage access; never a public frontend variable |
| `STORAGE_BUCKET` | Private bucket name, default template `crewmori-private` |
| `CREWMORI_BACKEND_ENABLED` | Set `true` only after core setup; defaults to `false` |

Use an administrative database credential for migrations. Browser roles receive no domain mutation grants. Privileged application and worker code must continue resolving workspace/actor scope even when the database credential bypasses RLS.

```sh
npm run db:migrate
npm run storage:setup
npm run dev
# In another terminal, after setting CREWMORI_BACKEND_ENABLED=true:
npm run worker
```

Migrations are ordered and checksum-checked; an applied file must not be edited. Add a successor migration. `storage:setup` creates a private bucket and refuses an existing public bucket. The worker initializes its own queue/checkpoint tables in separate private schemas. A PostgreSQL restart does not require reseeding application records.

All new workspaces start empty. The Alya/Northstar browser fixture is not imported into new accounts. The repository has no general-purpose endpoint that lets a browser write arbitrary normalized domain records.

## Provider setup

### Supabase Auth

Configure Site URL to `APP_URL` and allow `${APP_URL}/api/auth/callback` as a redirect. Verify email confirmation, recovery delivery and session refresh with the project's Auth settings. Auth APIs establish server cookies; the existing sample forms still need their migration. `GET /api/auth/callback` currently returns a confirmation response rather than navigating the sample UI.

### Claude and Gemini

Set `ANTHROPIC_API_KEY` and an account-supported `ANTHROPIC_MODEL`. Set `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL` and `GEMINI_EMBEDDING_DIMENSIONS` for the embedding adapter. Model IDs are deliberately explicit configuration, not guessed current defaults. Changing the embedding model/dimension will require rebuilding the future index.

The worker over-reserves input plus maximum output tokens before a model call. A confirmed result is saved before a graph can advance. An uncertain request retains its reservation and blocks silent paid retries; an owner can create a new attempt. Configure `AGENT_DAILY_TOKEN_BUDGET` for the account and expected source sizes. This is a token allowance, not a verified currency-denominated spending limit. No provider API was called during repository verification.

### Google

Create a Web OAuth client, enable Gmail/Calendar/Drive APIs and register `${APP_URL}/api/connections/google/callback`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Generate an independent 32-byte base64 `TOKEN_ENCRYPTION_KEY`; rotating it requires a credential re-encryption plan or reconnection.

POST selected capabilities to `/api/connections/google`: `gmail`, `calendar_read`, `calendar_write`, `drive`. Consent is limited to the selected scopes. `gmail.compose` includes sending authority, so the application still needs exact-content/destination approval before dispatch. `drive.file` lists files accessible to this application; it does not grant unrestricted access to every Drive file. Disconnect removes the application's stored credential and blocks its future use; provider-account revocation is managed separately in Google settings.

### ElevenLabs

Set `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET` and an independent `ELEVENLABS_TOOL_SECRET`. Configure a private agent, allowed application origins, a bounded conversation duration, and appropriate transcript/audio retention. The application does not store raw audio; disabling provider-side audio retention is an account configuration step, not something a response flag can establish.

The future browser client obtains `/api/voice/session` with a buyer Bearer token and `{ "consent": true }`, then passes the returned `dynamicVariables` when connecting. Configure provider tools to POST to `/api/voice/tools/{tool}` with the server-only `X-Crewmori-Voice-Secret` header and this body:

```json
{
  "sessionBinding": "{{crewmori_session}}",
  "eventId": "a stable UUID for this tool invocation",
  "input": {}
}
```

Use the exact tool input schemas in `src/server/voice-tools.ts`. The binding is scoped and short-lived; supplied engagement/workspace IDs are not accepted as authority. Configure final transcript webhooks at `/api/webhooks/elevenlabs`, preserving the dynamic variables. Duplicate final transcripts are replay-safe. Revoked or mismatched sessions are rejected or quarantined. A saved brief is a draft for review and does not amend accepted terms.

### Payments

Keep `PAYMENT_PROVIDER=sandbox` initially and set `PAYMENT_SANDBOX_SECRET`. `/api/webhooks/sandbox` requires `X-Crewmori-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>` over `<timestamp>.<raw-body>`, within five minutes. The body follows `receiptSchema` in `src/server/contracts.ts`. A corresponding server-created payment request must already exist; missing mappings are quarantined.

For Stripe preparation, set `PAYMENT_PROVIDER=stripe_test`, a **test** secret key and webhook signing secret. Register `/api/webhooks/stripe`; forward the untouched raw body and `Stripe-Signature`. Live keys/events are rejected. Checkout completion with an unpaid state cannot create a receipt. USD domain cents map directly to Stripe minor units; IDR domain rupiah multiply by 100 at the Stripe boundary, and fractional-rupiah responses are rejected. Fee data is not invented.

The Checkout adapter's return URL is reserved as `/payment/return`; its production UI and authorized request dispatch are still part of the next commercial integration slice. No live settlement, Wise route, escrow, tax policy or refunds are implemented.

### Optional discovery and transactional mail

Set `EXA_API_KEY` for capped, domain-restricted search. Set `RESEND_API_KEY` and a verified `RESEND_FROM` for transactional transport. Neither adapter is automatically invoked by adding a key. Both need explicit domain workflows; a search result never authorizes outreach.

## API inventory

All API responses use `no-store`. Except verified provider webhooks/tools, mutations require an exact matching `Origin`. Owner requests use a validated Supabase session cookie and optional `X-Workspace-Id`. Buyer requests use a Bearer grant. Secrets, owner records and owner event streams are not included in buyer responses.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Process liveness and backend mode, no connectivity assertion |
| `GET /api/backend/status` | Authenticated configuration presence |
| `POST /api/auth/{sign-up,sign-in,sign-out,recover,reset}` | Real server Auth APIs |
| `GET /api/auth/{user,callback}` | Session identity / code exchange |
| `GET/POST /api/workspaces` | List/create the current owner's workspace |
| `POST /api/sources` | Save an owner text source with a stable idempotency UUID |
| `POST /api/tasks` | Queue a role task with versioned source references |
| `GET/POST /api/runs/{id}` | Inspect or control a run with expected control version |
| `GET /api/activity?after=N` | Durable owner event replay, up to 100 events/page |
| `POST /api/connections/google` | Start selected-capability OAuth |
| `GET /api/connections/google/callback` | Consume single-use state and save consent |
| `DELETE /api/connections/google` | Disable connector and remove stored credential |
| `POST /api/files` | Raw file bytes, MIME Content-Type and X-File-Name; max 10 MiB |
| `GET /api/files?id=UUID` | Scoped 60-second signed download |
| `POST /api/buyer/grants` | Owner-issued grant for an existing engagement; replaces prior grants |
| `POST /api/voice/session` | Consented buyer voice session |
| `POST /api/voice/tools/{tool}` | Authenticated, session-bound narrow provider tool |
| `POST /api/webhooks/{sandbox,stripe,elevenlabs}` | Verified event intake |

Task input example:

```json
{
  "role": "scout",
  "instruction": "Assess this request against the saved capability evidence.",
  "references": [{ "table": "sources", "id": "source-id-from-api", "version": 1 }],
  "idempotencyKey": "a new UUID for this deliberate action"
}
```

Use the same idempotency key for network retries of unchanged input. Changed input needs a new key. Source references are scoped before model invocation, and source versions are rechecked before artifact publication. Promoter requires published, public sources; the production publication command is still outstanding.

## Deployment preparation

The Next.js application can remain on the selected web host. The durable worker requires a persistent Node/container process with database access; run it separately from request-limited web functions. `Dockerfile.worker` and `.dockerignore` prepare this process without copying credentials into the image. The TypeScript worker image includes its pinned `tsx` runner and development toolchain. The Docker image itself has not been built in this verification run.

Run migrations as a release step before starting updated web/worker processes. Store shared secrets in the host's secret store. Use a direct/session-pooler database connection compatible with long-lived workers and verify TLS; do not disable certificate checks. Backups, restore drills, application-level retention and provider health alerts still need deployment-specific configuration. No service was purchased, deployed or connected in this preparation.

## Verification evidence

Executed locally with Node 25.8.0 and disposable PostgreSQL 16.14 on 16 October 2026:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 107 passed, including the original 95 frontend/domain tests.
- `npm run test:db`: 15 passed. PostgreSQL RLS, cross-workspace denial, rollback, concurrent idempotency, shared budget reservation, cancellation, stored model response replay, durable LangGraph/pg-boss, payment event deduplication, voice tool scope and worker lifecycle checks.
- `npm run build`: passed, including the new API routes.
- `npm run test:api`: production HTTP health, disabled-backend rejection, unknown API rejection and existing frontend route passed.
- `npm run backend:check`: confirmed missing provider configuration; no secret values printed.

`test:db` always creates and removes a disposable local cluster. It does not use an existing application `DATABASE_URL`. Install PostgreSQL server binaries first; `PG_BIN` can select their directory. Provider adapters use controlled responses in tests. Supabase-hosted Auth/Storage, Google consent/send, Claude/Gemini calls, Stripe test-account checkout, live browser voice and deployed hosting have **not** been exercised.

## Next integration slices

1. Replace sample account/setup flows with the Auth/workspace APIs and create real profile/policy records.
2. Split owner, public and buyer query stores; adopt asynchronous commands and remove hardcoded Alya identifiers from production paths.
3. Port commercial commands from `engine.ts` into authenticated database transactions, retaining the existing acceptance/amendment/version tests and adding actual capacity races.
4. Connect approved provider dispatch and payment requests to immutable commercial authority; implement receipt allocation and prerequisite scheduling in the same transaction.
5. Connect role artifacts, knowledge ingestion/retrieval, activity subscriptions and owner interventions to the existing UI.
6. Complete buyer grant exchange, browser voice/text continuation and scoped file workflows; run live provider and end-to-end tests with configured accounts.

The original frontend acceptance contracts still govern business semantics. Historical claims about a finished live backend remain superseded by this explicit implementation/verification inventory.

## Primary API references checked during preparation

- [Supabase server-side session clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Claude Messages API and tool output](https://platform.claude.com/docs/en/api/messages/create)
- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence), [pg-boss workers](https://pgboss.io/api/workers)
- [Google Web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail drafts](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create), [Calendar events](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [ElevenLabs signed sessions](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url), [signed webhooks](https://elevenlabs.io/docs/eleven-api/resources/webhooks)
- [Stripe webhooks](https://docs.stripe.com/webhooks), [currency minor units](https://docs.stripe.com/currencies)
- [Exa search](https://exa.ai/docs/reference/search), [Resend email](https://resend.com/docs/api-reference/emails/send-email)
