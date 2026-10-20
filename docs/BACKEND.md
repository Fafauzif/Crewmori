# Connected backend

Updated 18 October 2026 (release 1.2.1). Crewmori uses one TypeScript repository: Next.js web/API, a persistent Node worker, and Supabase PostgreSQL/Auth/private Storage. Set `CREWMORI_BACKEND_ENABLED=true` to select the connected frontend. Disabled mode retains the independent browser demo. Connected accounts start with empty workspaces; demo fixtures are never imported.

## What is connected

- Accounts sign up and sign in only with Google through Supabase Auth (PKCE, HTTP-only cookies); password sign-up, sign-in and recovery endpoints return `GOOGLE_SIGN_IN_REQUIRED`. The callback returns through /auth/verify; POST /api/auth/complete prepares the empty workspace with readable progress and retry. Onboarding saves real profile, services, availability and policy records.
- Owner commands run the shared business rules inside serialized PostgreSQL transactions. Stable transport keys, expected record versions and workspace revisions protect retries and concurrent decisions. Browser roles cannot write the private domain schema.
- Public profiles expose reviewed publication snapshots. Inquiries create scoped engagements. Owner-issued invitations exchange a single-use token for an expiring HTTP-only buyer session; the invitation token travels in a URL fragment and is removed after exchange. Buyer responses contain explicit projections, never the owner's store.
- Six AI roles (Gemini by default, Claude optional) run through pg-boss, an outbox and LangGraph PostgreSQL checkpoints. Sources are versioned and rechecked before publication/application. The owner reviews an artifact before saving an assessment, offer draft, message draft, promotional draft or team note. Business approval and external delivery remain separate actions.
- Private TXT and selectable-text PDF sources are extracted, chunked and embedded with Gemini. Knowledge search supports semantic ranking. Archived or superseded source versions do not enter retrieval. Drive imports use the same storage and ingestion path. Images/scanned PDFs require a written summary; OCR is not implemented.
- Reviewed email uses Gmail or Resend. Approved invitations use Google Calendar. Exact recipients/content are captured before dispatch and locked against concurrent edits. Uncertain provider outcomes require owner review and are never silently resent. Client portal messages and files also work without email transport.
- Authorized invoices create sandbox or Stripe **test** Checkout requests. Verified receipts are deduplicated and allocated transactionally; outstanding balance, deposits and project prerequisites update together. Wrong currencies and excess receipts require review. Unknown fees remain unknown. Returning from Checkout never proves payment.
- Buyer voice uses the ElevenLabs browser SDK, explicit microphone/transcript consent, private signed sessions and narrow session-bound tools. Signed final transcripts return to the engagement; text continuation remains available.
- Connections provides selected-scope Google OAuth, Drive import, Calendar availability, bounded Exa discovery and external dispatch review. An external search result becomes private evidence for review; it does not authorize outreach.

Working calendars use the agreement's timezone, local hours, working days and holidays, including daylight saving transitions. Display language/timezone preferences do not rewrite accepted terms.

## Local activation

Use Node.js **22.13 or newer**, npm and a Supabase project. Store secrets in `.env.local` or the host's secret store; never commit them.

```sh
npm ci
cp .env.example .env.local
npm run backend:check
```

Fill the core variables first:

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Exact application origin; HTTPS when hosted, HTTP on localhost |
| `DATABASE_URL` | Privileged server PostgreSQL connection; direct/session pooler for persistent workers |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Auth project and publishable key |
| `SUPABASE_SECRET_KEY` | Server-only Auth/Storage access |
| `STORAGE_BUCKET` | Private bucket, default `crewmori-private` |
| `CREWMORI_BACKEND_ENABLED` | `true` enables the connected application |

`backend:check` reports missing variable names without printing values. Configuration presence does not prove connectivity. Configure Supabase Auth Site URL to `APP_URL` and allow `${APP_URL}/api/auth/callback**`. Enable the Google provider in Supabase with a Google OAuth web client, and add `https://<project-ref>.supabase.co/auth/v1/callback` to that client's authorized redirect URIs. Disable the Email provider so accounts cannot be created outside Google.

```sh
npm run db:migrate
npm run storage:setup
npm run dev
# Start a second process with the same environment:
npm run worker
```

Set the flag before starting the web and worker processes. Every five minutes the worker runs a maintenance sweep: knowledge jobs running longer than 15 minutes fail with `INDEXING_INTERRUPTED` so Retry works again, agent runs stuck running for 30 minutes become blocked with `WORKER_INTERRUPTED` (unconfirmed model calls stay reserved as unknown), pending uploads older than one hour are removed from storage before their records are retired, expired OAuth states, old invitations and stale rate-limit windows are purged, and finished bookkeeping is removed in batches (dispatched outbox rows after 7 days, idempotency receipts after 30, processed provider events after 90, buyer grants 90 days past expiry). Domain records and the event log are never deleted by the sweep. Migrations are ordered and checksum-checked; add successor migrations rather than editing applied files. `storage:setup` refuses a public bucket. The worker initializes its queue/checkpoint schemas. New accounts have no client, payment or project fixtures.

For production, run `npm run build` and `npm start`, or deploy Next.js to the selected web host. Run `npm run worker` separately as a persistent process; request-limited web functions are unsuitable for the worker. `Dockerfile.worker` prepares that process. Run migrations as a release step before updating web/worker instances. Use verified database TLS, configure backups/restore, provider quotas and host monitoring. No hosted deployment or external account was created during implementation.

## Provider configuration

### Gemini and Claude

`REASONING_PROVIDER` selects the role model: `gemini` (default) uses `GEMINI_API_KEY` and `GEMINI_MODEL` with structured JSON output and a low thinking level; `anthropic` uses `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`. Gemini thinking tokens count as output against the token budget. Set `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL` and `GEMINI_EMBEDDING_DIMENSIONS` to matching values. Model IDs are explicit configuration. Changing the embedding model/dimension requires reindexing sources with Refresh/Retry processing.

`AGENT_MAX_OUTPUT_TOKENS` bounds each response; `AGENT_DAILY_TOKEN_BUDGET` is a shared daily workspace token allowance. The worker reserves a conservative input/output bound before dispatch and saves confirmed usage. Uncertain calls retain their reservation and block silent paid retries. An explicit retry creates a new attempt with current source versions. These token limits are not currency-denominated billing guarantees. Knowledge ingestion/search have separate request quotas.

### Google and mail

Create a Web OAuth client, enable Gmail/Calendar/Drive APIs and register `${APP_URL}/api/connections/google/callback`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and an independent 32-byte base64 `TOKEN_ENCRYPTION_KEY`.

In Connections select `gmail`, `calendar_read`, `calendar_write` and/or `drive`. Updating consent replaces the stored capability set. `gmail.compose` includes sending authority; the application requires separate exact-content approval. `drive.file` accesses files shared with this application, not every file in an account. Choose files from Drive opens Google Picker, which grants that access to the selected files: enable the Google Picker API, create a browser API key restricted to that API and `APP_URL` referrers as `GOOGLE_PICKER_API_KEY`, and add `APP_URL` to the OAuth client's authorized JavaScript origins. The browser requests its own `drive.file`-only token; stored server credentials never reach it. Disconnect removes stored credentials; provider-side revocation is managed in Google settings.

Choose `MAIL_PROVIDER=google` or `resend`. Resend requires `RESEND_API_KEY` and verified `RESEND_FROM`. Email currently sends reviewed text; share attachments through the secure client portal. Automatic Gmail inbox synchronization, calendar synchronization and social publishing are not implemented. Calendar invitations are explicit approved sends.

If delivery is uncertain, inspect the provider account and review the attempt in Connections. Releasing an attempt does not resend it. If the provider reference was saved but local finalization failed, use Finish recording confirmed delivery in Connections; it completes local recording without sending again. Replaying the original transport key has the same behavior.

Set `EXA_API_KEY` for bounded domain-restricted discovery in Connections. Search results require owner review before use.

### ElevenLabs

Set `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET` and an independent `ELEVENLABS_TOOL_SECRET`. Configure a private agent, allowed application origins, a conversation duration bound and retention settings. The browser stops after 15 minutes. The application stores final transcripts, not raw audio; provider audio retention must be configured in the provider account.

The browser requests `/api/voice/session` with buyer cookies and `{ "consent": true }`, then passes the returned signed URL and `dynamicVariables` to the SDK. Configure provider tools to POST to `/api/voice/tools/{tool}` with the server-only `X-Crewmori-Voice-Secret` header:

```json
{
  "sessionBinding": "{{crewmori_session}}",
  "eventId": "a stable UUID for this tool invocation",
  "input": {}
}
```

Use schemas in `src/server/voice-tools.ts`: `capture_requirements`, `get_public_offer_status`, `request_owner`. Voice cannot approve/accept offers or move money. Supplied workspace/engagement IDs are not authority. Configure signed final transcript events at `/api/webhooks/elevenlabs`, preserving initiation dynamic variables. Duplicate transcripts replay safely; invalid bindings are rejected or quarantined. A captured brief does not amend accepted terms.

### Payments

Start with `PAYMENT_PROVIDER=sandbox` and a `PAYMENT_SANDBOX_SECRET`. Buyers explicitly confirm a labelled test payment; no money is charged. Because a sandbox confirmation marks an invoice paid, it only works on a localhost `APP_URL` unless `ALLOW_HOSTED_SANDBOX_PAYMENTS=true` is set; otherwise payment start returns `PAYMENTS_NOT_CONFIGURED`. The signed external sandbox webhook also accepts `receiptSchema` from `src/server/contracts.ts`. Its header is `X-Crewmori-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>` over `<timestamp>.<raw-body>`, within five minutes.

For Stripe use `PAYMENT_PROVIDER=stripe_test`, a **test** secret key and `STRIPE_WEBHOOK_SECRET`. Register `/api/webhooks/stripe`, forwarding the unchanged body and `Stripe-Signature`. Live keys/events are rejected. A paid Checkout session must map to a server-authorized request. USD cents map directly to Stripe minor units; IDR rupiah multiply by 100 at the Stripe boundary. Unknown events/references are quarantined, not settled. Checkout return UI is `/payment/return`.

Live money, escrow, refunds, tax calculation and Wise are outside this implementation. Financial corrections preserve the original receipt/allocation history and require explicit review.

## HTTP boundaries

Responses use `no-store`. Except verified callbacks/webhooks/provider tools, mutations require matching `Origin`. Owners use Supabase cookies; buyers use scoped cookies or Bearer grants. Server code resolves actor/workspace scope for every operation, including when a database credential bypasses RLS.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness and mode; no database/provider health claim |
| `GET /api/health?check=ready` | Readiness: database round trip and worker relay; 503 when the database is unavailable or an outbox row has waited over 5 minutes |
| `GET /api/backend/status` | Authenticated configuration presence |
| `/api/auth/{sign-up,sign-in,sign-out,recover,reset,user,callback,complete}` | Auth/session lifecycle |
| `GET/POST /api/workspaces`, `GET /api/workspace/state` | Empty workspace bootstrap and owner projection |
| `POST /api/commands`, `POST /api/buyer/commands` | Versioned domain commands with idempotency |
| `GET /api/public/profile`, `POST /api/public/inquiries` | Reviewed public profile and bounded intake |
| `/api/buyer/{invitations,session,state}` | Single-use invitation exchange and scoped buyer projection |
| `POST /api/sources`, `POST /api/knowledge/search` | Private text ingestion and retrieval |
| `POST /api/tasks`, `GET/POST /api/runs/{id}` | Role tasks and pause/resume/cancel/retry |
| `POST /api/runs/{id}/apply` | Owner review/application of current artifacts |
| `GET /api/activity?after=N` | Durable owner event replay, 100/page |
| `/api/connections/google` | Selected-scope OAuth and disconnect |
| `POST /api/integrations` | Drive list/import, availability, Exa discovery |
| `POST/PATCH /api/dispatch` | Approved external sends and uncertain attempt review |
| `POST/GET /api/files` | Private bytes/scoped short-lived signed download; buyer uses `?buyer=true` |
| `/api/payments/{start,sandbox,status}` | Authorized Checkout, explicit sandbox confirmation, verified status |
| `/api/voice/session`, `/api/voice/tools/{tool}` | Consented voice and narrow tools |
| `/api/webhooks/{sandbox,stripe,elevenlabs}` | Verified provider events |

Use a new UUID for each deliberate command and reuse that UUID for network retries of unchanged input. Changed input requires a new key. UI commands are asynchronous and serialized; stale edits are rejected for review. Owner state polls every five seconds and on focus. No frontend fallback to sample data occurs when the backend is unavailable.

## Verification and operational limits

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm run test:e2e
npm run test:api
npm audit --omit=dev
```

`test:db` and `test:e2e` create and remove disposable PostgreSQL clusters; they never use an existing application `DATABASE_URL`. Install PostgreSQL server binaries (`PG_BIN` may select their directory). Before first browser run use `npx playwright install chromium`. E2E requires a production build.

The browser suite runs the production web server and actual durable worker against isolated Auth/Storage and Claude/Gemini HTTP test services. It exercises signup, onboarding, public inquiry, scoped buyer access, reviewed AI assessments, exact offer approval/share/acceptance, sandbox settlement, private upload and indexed knowledge search. SDK traffic follows the production code paths. These controlled responses do not verify external account credentials or provider availability.

Locally verified: 109 unit/domain tests, 29 database integration tests, typecheck/lint and production build. The connected browser journey and production HTTP smoke test passed on 17 October 2026. Production dependency audit has zero reported vulnerabilities at verification time. Development-only audit findings remain in the lint toolchain's transitive glob dependencies. CI repeats the automated checks.

Hosted Supabase confirmation/recovery, Google consent/send, paid Claude/Gemini calls, Stripe test-account Checkout, microphone/ElevenLabs conversation and deployed hosting still require configured accounts and live validation. Automatic notification email, account deletion/retention automation, provider quarantine reconciliation and deployment-specific operational alerts remain operational follow-up work. Financial/legal localization and full multilingual document fonts remain product-specific work.

## Primary references

- [Supabase server clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Claude Messages](https://platform.claude.com/docs/en/api/messages/create), [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence), [pg-boss workers](https://pgboss.io/api/workers)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail send](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send), [Calendar events](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [ElevenLabs signed sessions](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url)
- [Stripe webhooks](https://docs.stripe.com/webhooks), [currency units](https://docs.stripe.com/currencies)
- [Exa](https://exa.ai/docs/reference/search), [Resend](https://resend.com/docs/api-reference/emails/send-email)
