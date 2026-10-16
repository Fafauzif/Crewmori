# Verification and Release

**Status:** This document specifies checks for the future application. No tests, provider transactions, deployment or production-readiness assessment have been executed for this handoff. Crewmori remains a provisional name.

Use [01_PRD.md](01_PRD.md) for required behavior, [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) for authority boundaries, [03_API_AND_DATA_CONTRACTS.md](03_API_AND_DATA_CONTRACTS.md) for schemas and invariants, [04_INTEGRATIONS.md](04_INTEGRATIONS.md) for adapter behavior, and [sample-data/README.md](sample-data/README.md) for synthetic inputs and expected results. Execute the milestones in [05_IMPLEMENTATION_PLAN.md](05_IMPLEMENTATION_PLAN.md).

## Verification modes and evidence

Run deterministic tests against a disposable database first. Keep fixture, live model, voice and payment-sandbox modes visible in the UI, trace and report. Never seed a developer's real client records into shared demo data.

The builder should wire reproducible scripts such as `test:unit`, `test:db`, `test:integration`, `test:e2e`, `eval:agents` and `verify:release` into the repository. Record the actual commands after implementation; these script names are proposed interfaces, not existing passing commands.

For each check, save the commit, environment mode, fixture/version, model/SDK configuration, command, expected assertion, actual result and artifact/trace reference. Redact secrets and private content. Classify outcomes as pass, fail, blocked or not run. An unavailable account produces a recorded limitation rather than a simulated pass.

Phase 2 proves labeled role/worker/UI fixture smoke only. Phase 4 must prove the connected application text path through all six agents. Test voice separately after its early feasibility probe and after text business commands work.

## Deterministic domain checks

Use independent expected calculations rather than calling the production calculator to generate test expectations. Store amounts in integer currency minor units and rates in decimal form. Include currency scale and rounding in each case.

| Check | Required assertion |
|---|---|
| Full package constraints | USD 600 exceeds USD 500 buyer budget; 18 hours exceeds 12 available; requested five-business-day window cannot satisfy the full package |
| Reduced package | USD 450 less 2% fee yields USD 441; fixture FX yields IDR 6,615,000; contribution before acquisition equals IDR 1,815,000 |
| Forty-percent deposit | USD 180 gross, USD 3.60 fee, IDR 2,646,000 net and IDR 354,000 upfront gap |
| Sixty-percent deposit | USD 270 gross, USD 5.40 fee, IDR 3,969,000 net and zero upfront gap |
| Gross versus net balance | A valid USD 270 gross allocation leaves USD 180 gross outstanding; never subtract only USD 264.60 net cash |
| Optional acquisition extension | Labeled USD 6 cash plus 30 minutes selling time yields IDR 165,000 cost and IDR 1,650,000 contribution after acquisition |
| Missing facts and rounding | Missing required fee/FX remains unknown; zero-minor-unit currencies and half-rounding boundaries match declared policy |
| Route gate | Missing, blocked, unknown, expired or stale required prerequisites prevent dispatch; only a current satisfied assessment passes |

Test scope, deposit, price, deadline, beneficiary and relevant route/quote changes against approval freshness. A stale approval cannot authorize the new terms. Every buyer acceptance remains immutable before and after payment. An amendment creates new terms, approvals and acceptance; history and historical receipt allocations remain readable.

## Concurrency, receipts and recovery

Use database integration tests with barriers or controlled worker dispatch so races actually overlap. Sequential duplicate calls cannot prove concurrency safety.

| Scenario | Required behavior |
|---|---|
| Competing acceptances | Lock capacity in stable order; persist only feasible acceptance/reservation combinations; return actionable conflict for the loser |
| Retry same acceptance | Same idempotency key/body returns its prior result; altered body with that key fails |
| Amendment capacity delta | Reallocate against the existing reservation in one transaction; preserve the original acceptance |
| Unpaid hold expiry | Release the disclosed reservation once; repeated expiry jobs have no added effect |
| Late receipt after release | Persist/reconcile cash, keep capacity released and request owner recovery; do not promise the old delivery date |
| Duplicate/reordered receipt | Unique inbox/provider references prevent duplicate credit; payment state does not regress from a later verified state |
| Partial/excess/mismatch | Persist valid receipts; preserve unapplied/review-required amounts; wrong currency, invoice or beneficiary cannot reconcile as success |
| Request submission timeout | Save pending/unknown external state and query the original reference before another creation attempt |
| Worker crash | Restart from durable job/checkpoint; saved artifacts survive; consequential effects remain deduplicated |
| Cancel/redirect race | Increment control version; a committed cancellation before dispatch blocks the effect, including retry/resume; record effects already dispatched |
| Concurrent budget use | Reserve allowance atomically across roles/retries under the goal; neither agent can spend the other's reserved remainder |
| Revoked connector | Preserve local outputs, mark unavailable and expose a recovery action without endless retries |

Test payment adapters for signature verification and normalization. Test the shared Payments domain separately for matching, allocation, duplicate protection, gross balance and capacity commitment. A verified event alone cannot mark an engagement paid. Simulate invalid signatures, malformed payloads, replay delivery, pending, failed, partial and late receipts through authenticated sandbox controls.

Exercise restricted operations actions: inspect pending requests, retry safe reads, resume allowed tasks and record owner review. Audit who acted and why. Do not offer a generic “retry everything” button for uncertain external mutations.

## Agent, language and UI checks

Require a distinct useful artifact from each role: Scout fit/evidence; Promoter versioned share package; Sales requirements and buyer/owner recaps; Operations capacity/input checklist; Finance computed terms and gated payment record; Account Manager timeline/next-action draft. Confirm each run uses its own scoped context, allowlist and structured output schema.

Run at least 12 supported/unsupported capability questions and 12 paired English/Indonesian term cases. Check amounts, currencies, dates/timezones, conditions and acceptance meaning against structured records. Unknown capabilities remain unknown. Include at least five hostile source snippets that request secrets, private retrieval, arbitrary tools or changed beneficiaries; record the denied behavior.

Verify two independent agents overlap, refresh/reconnect recovers ordered durable events, and cursor animation reflects real work. A failed save cannot display completed. Test loading, blocked, approval, conflict, empty and failure states. Check mobile owner/buyer layouts, keyboard operation, focus visibility, reduced motion and readable status labels for the six cute agents.

For voice, test microphone denial, interrupted speech, disconnect/reconnect, duplicate final transcript/webhook, slow task tools, expired grant and text continuation on the same engagement. Measure session connection, final speech-to-first-response, tool round-trip and fallback success. Record actual product measurements; vendor benchmarks do not establish these results.

## Security and data checks

Seed two owners and two buyers. Attempt cross-workspace HTTP access, retrieval, private storage URLs, realtime subscriptions and worker commands with guessed IDs. A privileged worker connection still needs explicit scope checks. Buyer output must exclude internal pricing floors, owner-private briefings and acquisition spending.

Test a public campaign token as attribution for a new isolated inquiry. It must not grant access to an existing engagement. Test single-use hashed invitation exchange, expiry, revocation and attempted replay; scope later text/voice calls to the issued grant. Check that tokens and secrets do not enter logs or browser bundles.

Exercise CSRF/session handling, file type/size limits, escaped imported content, URL-import private-network/redirect rejection, webhook authentication and voice allowed origins. Verify retention/deletion across files, transcript rows, chunks/embeddings, cached excerpts and applicable vendor records. Use raw-audio-off defaults unless the test has consent.

## Demonstration and release gates

Use a resettable synthetic dataset and show these steps in the running application:

1. Owner reviews profile evidence, limits and capacity, then delegates a goal.
2. Scout and Promoter run; owner reviews a grounded brief and share package.
3. Buyer arrives through campaign attribution and qualifies by text; Sales saves requirements.
4. Operations and Finance assess the same version; the owner approves computed terms.
5. Buyer accepts; the application reserves capacity and creates a sandbox request.
6. An authenticated signed sandbox event produces one checked deposit, correct balance and committed capacity.
7. Account Manager saves the next action; refresh shows all six artifacts and their history.
8. Replay the receipt and change a material term; show duplicate protection and fresh-review requirements. Demonstrate live browser voice and continuation by text on the same engagement.

Before a reviewable release, check:

- [ ] A new builder can install, migrate, seed, run web/worker and reproduce checks from the README and environment template.
- [ ] Required connected text and live browser voice journeys pass; failed, blocked and not-run cases appear in the report. A text-only demonstration leaves PRD-011 open and cannot be marked P0 or full-app complete.
- [ ] Security/concurrency gates pass; no unresolved issue permits unauthorized data, stale terms, duplicate credit, overselling or budget bypass.
- [ ] Sandbox/live boundaries, provider limitations, cost usage, owner interventions and known defects appear in the demo notes.
- [ ] Deployment health, worker liveness, failed jobs, pending external requests, backups and recovery procedures have an assigned owner.
- [ ] Migration/revert procedures preserve accepted commitments and financial history; irreversible changes have a recovery plan.
- [ ] Demo recording and traces exclude secrets and private customer data; assets and dependencies have attribution.

Compare the connected task with a general chat assistant plus manual quote/CRM handling using identical facts. Report grounded final states, term mistakes, checking/repair time and all attempted-run costs. A bounded evaluation supports only the tested behavior. Mark a restricted demonstration, consented pilot and broader production release as separate decisions, with the evidence and open issues for each.
