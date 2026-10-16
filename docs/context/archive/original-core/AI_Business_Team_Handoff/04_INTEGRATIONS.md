# Integration implementation guide

Crewmori is the provisional product name; Principal appears in historical reference assets. This guide selects concrete defaults for the complete application. Optional providers extend the same commands and records rather than introducing another source of business authority. Route bodies, event envelopes and domain schemas in [03_API_AND_DATA_CONTRACTS.md](03_API_AND_DATA_CONTRACTS.md) are authoritative when implementing these examples.

The primary vendor documentation below was inspected for the supplied technical plan on 16 October 2026. This handoff reuses that inspection; it claims neither fresh provider verification nor working credentials. Pin SDKs, models and supported account features during setup.

## 1. Default choices and replacement triggers

| Capability | Default | Alternative and concrete trigger |
|---|---|---|
| Identity, records, private files | Supabase Auth, Postgres and private Storage | Separate managed services only when an existing deployment already supplies equivalent authorization and migrations. |
| Role reasoning | One Claude tool-calling model behind `ReasoningAdapter` | Gemini if available account access and the same held-out task evaluation favor it. |
| Embeddings | One configured Gemini model/dimension | Replace only after evaluation or account constraints; rebuild the index. |
| Agent persistence/jobs | LangGraph.js checkpoints plus pg-boss | Typed state machines if library integration prevents durable recovery; a managed queue only if it becomes the single dispatch owner. |
| Activity delivery | Supabase Realtime notifications over durable rows | SSE when deployment supports persistent connections; preserve replay semantics. |
| Discovery | Pasted text, CSV and permitted URL import | Exa is the first optional live search adapter. Apify follows only for a reviewed source. |
| Browser voice | ElevenLabs managed conversation | LiveKit for runtime/audio control; Retell when call operations become central. |
| Promotion/email/calendar | Owner-assisted sharing, local drafts, manual availability | Gmail/Calendar after OAuth readiness; Resend for verified transactional transport. |
| Payments | Internal `FinancialSandboxAdapter` | Stripe test mode to validate its actual integration; Wise only for a supported, approved provider-specific route. |

All six roles remain genuine scoped workers under every choice. Voice represents Sales and invokes backend tools; it does not become a seventh decision authority.

## 2. Common adapter and event boundary

Adapters receive validated application inputs plus server-resolved workspace, actor, command and run references. They return normalized results, provider references and measured/estimated usage. Models request tools; domain commands decide whether the action is permitted. Neither a prompt nor a provider session ID establishes authorization.

Store credentials server-side. Encrypt owner OAuth refresh tokens, record consent/scopes, refresh safely and mark revoked connectors unavailable. Never send service keys to React, source importers or agent prompts. A service credential that bypasses RLS still requires explicit tenant checks in worker code.

For webhooks: capture the raw body, verify the provider's supported signature/authentication and freshness rules, resolve the saved session/request mapping, then insert a unique inbox row before processing. Persist the business result and outbox/activity event transactionally. Repeated delivery returns the prior result. Unknown or unverifiable events remain quarantined; they never credit cash or publish completion.

Use application idempotency for consequential commands and vendor idempotency where supported. After an external mutation times out, retain `pending_external`/unknown and reconcile the original reference before resubmission. Retry safe reads with bounded backoff; token revocation and invalid domain facts require an actionable blocked state.

## 3. Reasoning, retrieval and activity

| Integration | Concrete interface | Setup and implementation dependency |
|---|---|---|
| Claude | Official SDK for `POST https://api.anthropic.com/v1/messages`; configured model, tool definitions and constrained output schema | Server API key; validate output/evidence IDs again; no arbitrary SQL, code or network tool. |
| Gemini | Official function-calling/embedding interfaces | Server key, supported model and fixed embedding dimension; store model/chunker versions. |
| Supabase | Auth session, Postgres migrations, private object storage and authorized Postgres Changes subscription | Project, worker DB access, RLS tests and private storage policies before importing real files. |
| LangGraph / pg-boss | Persist checkpoint thread by stable run ID; queue outbox reference as durable job identity | Database schemas/migrations and persistent Node worker; serialize resumes of one thread. |

Owner documents are versioned and audience-tagged before extraction. Start with text/Markdown and text-extractable PDF; proposed limits are 10 MB/20 pages, not vendor limits. Store hashes, source offsets and processing failures. Retrieval filters by workspace and audience before ranking. Re-index when the embedding model/dimension or chunking changes. Imported material is evidence, including any embedded instructions.

Realtime only signals that durable events exist. On reconnect, fetch missing sequence ranges and the current snapshot. Emit `tool.started`, `tool.completed`, `artifact.saved`, `handoff.created` and run-control events from recorded actions; a socket connection itself is not completion. See the design guide for semantic cursor targets.

Primary references: [Claude outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Gemini tools](https://ai.google.dev/gemini-api/docs/function-calling), [embeddings](https://ai.google.dev/gemini-api/docs/embeddings), [hybrid retrieval](https://supabase.com/docs/guides/ai/hybrid-search), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime](https://supabase.com/docs/guides/realtime/postgres-changes), [checkpoints](https://docs.langchain.com/oss/javascript/langgraph/persistence), [interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts), [pg-boss](https://pgboss.io/introduction).

## 4. Acquisition, communication and scheduling

Import is required for P0 and remains useful in the full application. Save `manual_import`, `live_source` or `demo`, original URL/native ID, fetched/published dates, access basis, content hash, excerpt and adapter version. Deduplicate within the workspace. URL import must reject private/link-local destinations and revalidate redirects. Unknown intent stays unknown: a company listing is an inferred prospect, not a buyer request.

| Adapter | Request shape / authentication | Result and action boundary |
|---|---|---|
| Exa | `POST https://api.exa.ai/search`, server `x-api-key`; `{query,type:"auto",numResults:5,includeDomains,contents:{highlights:true}}` | Normalize dated results; cap domains/results/queries and reconcile usage. Search creates evidence, never outreach permission. |
| Apify | Bearer token; `POST https://api.apify.com/v2/actors/{owner~name}/runs`, Actor-specific JSON; poll `/v2/actor-runs/{runId}`, read `/v2/datasets/{datasetId}/items` | Review source permission, Actor/build/schema, runtime/output/cost semantics before enabling. No generic unrestricted scraping tool. |
| Gmail | Owner OAuth; `POST https://gmail.googleapis.com/gmail/v1/users/me/drafts`, `{message:{raw:base64urlMime}}`; separate `/drafts/send`, `{id:draftId}` | Persist recipient/content version approval and provider draft ID. Draft creation and authorized sending are different commands. |
| Resend | Server Bearer key; `POST https://api.resend.com/emails`, `{from,to,subject,text}` or supported HTML | Test recipient/domain setup first; preserve idempotency and delivery mode. No access to the owner's mailbox. |
| Google Calendar | Owner OAuth; `POST https://www.googleapis.com/calendar/v3/freeBusy`, `{timeMin,timeMax,timeZone,items:[{id}]}` | Feed capacity assessment. Event insertion requires separate write consent, approval and explicit guest-notification handling. |

Gmail `gmail.compose` includes sending and is restricted; a “draft-only” UI does not narrow OAuth authority. Public verification can block connector rollout. Keep application send gates, recipient suppression and shared contact history across Sales/Account Manager. Calendar free/busy does not reserve capacity or authorize invitations.

Facebook community promotion defaults to a versioned approved share package, copy/open destination and owner-confirmed publication URL. Copy means `ready_to_share`. Do not promise automatic Groups publishing: the earlier review found removal of Groups API permissions, with no supported replacement established. Revisit only after independently validating a current permitted interface. Treg is a later routing option if multiple research tools justify it, never a prerequisite.

References: [Exa](https://exa.ai/docs/reference/search), [Apify runs](https://docs.apify.com/api/v2/actors-runs-post), [dataset results](https://docs.apify.com/api/v2/dataset-items-get), [Gmail drafts](https://developers.google.com/workspace/gmail/api/guides/drafts), [scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Resend](https://resend.com/docs/api-reference/emails/send-email), [test recipients](https://resend.com/docs/dashboard/emails/send-test-emails), [free/busy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query), [event insertion](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Meta changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/), [Treg](https://github.com/superdesigndev/treg).

## 5. Voice uses the same business commands

Create the canonical conversation before requesting backend-issued ElevenLabs session credentials. `POST /api/voice/session` resolves a valid fresh-inquiry or engagement grant and usage allowance; it does not accept a client-supplied engagement ID as authority. Exchange a single-use, expiring existing-client invitation for a scoped session before exposing existing records.

Use the current `@elevenlabs/react` integration after pinning its supported version. The application configures narrow server tools such as `lookup_public_service`, `capture_requirements`, `request_assessments` and `get_public_offer_status` through `/api/voice/tools/:tool`. Authenticate the provider/session mapping and constrain every tool to that audience. Slow analysis returns a task ID/pending state; speech retrieves the actual public result before claiming completion. Client tools may focus panels, never approve offers or allocate money.

Persist final transcript segments idempotently, retain partial/final distinction and generate the Indonesian owner briefing from structured terms plus original wording. Offer acceptance remains an explicit page action. Disclose AI representation and transcript retention before connection; keep raw audio off by default. Permission denial/disconnection offers text continuation from saved state.

LiveKit substitutes backend room tokens, dispatch and a deployed agent runtime when control warrants that work. Retell substitutes its current web-call SDK/Create Web Call flow and verified lifecycle tools when call operations matter. Neither changes command authority. References: [ElevenLabs React](https://elevenlabs.io/docs/eleven-agents/libraries/react), [tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools), [post-call events](https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks), [LiveKit authentication](https://docs.livekit.io/frontends/build/authentication/), [tools](https://docs.livekit.io/agents/logic/tools/), [Retell web calls](https://docs.retellai.com/deploy/web-call), [Create Web Call](https://docs.retellai.com/api-references/create-web-call).

## 6. Payments and getting started

`PaymentAdapter` implements `createRequest`, `getStatus`, `verifyEvent`, `normalizeReceipt`. The default internal adapter exposes authenticated test controls and signs deterministic pending/success/failure/mismatch/duplicate events. Clearly label Sandbox. Stripe test mode is optional; Wise quote/recipient interfaces require applicable account/product access and route-specific validation. Neither establishes Indonesian merchant eligibility or production settlement.

Payments domain code owns immutable invoice snapshots, amount/currency/beneficiary matching, allocation, duplicate protection, outstanding balance and capacity commitment. Require a current satisfied route assessment, accepted offer and exact invoice installment before dispatch. Persist verified unmatched/partial/excess/late receipts as unapplied/review-required. Gross allocations reduce invoice balance; fees reduce cash, not gross credit. P0 auto-reconciles only exact single-invoice deposits. Never auto-refund an exception.

Implement in dependency order: configure DB/auth/private storage and worker; prove one model tool round-trip and saved artifact; connect import/retrieval/activity; complete owner approval, buyer acceptance and sandbox reconciliation; probe voice credentials/tools early, then attach voice to the working text flow; add optional connectors independently. Supply `.env.example` names for app URL, Supabase, DB, model/embedding, voice agent/key, webhook secrets, sandbox mode and caps; optional keys remain absent until used. Record one real setup result per adapter, including revocation/timeout behavior, without treating documentation as a passed test.

References: [Wise quotes](https://docs.wise.com/guides/product/send-money/quotes), [recipients](https://docs.wise.com/guides/product/send-money/recipients), [Stripe invoice testing](https://docs.stripe.com/invoicing/integration/testing), [idempotency](https://docs.stripe.com/api/idempotent_requests).
