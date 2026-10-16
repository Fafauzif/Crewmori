# Crewmori Full Application Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` if those skills are available. Assign one bounded task at a time, preserve its contract, and require evidence before closing it.

**Goal:** Build the complete owner workspace, buyer experience and operations surface for a freelancer's six-agent AI business team.

**Architecture:** Use a modular TypeScript application with separate web and durable worker processes. Keep business truth in Postgres, agent execution in persisted graphs, and vendor calls behind adapters. Route UI, agent and voice actions through the same authorized domain commands.

**Tech stack:** Next.js/React/TypeScript, Node worker, LangGraph.js, pg-boss, Supabase Postgres/Auth/private Storage, Zod, Claude through configurable model settings, Gemini as an evaluated alternative, ElevenLabs browser voice, imports with optional Exa search, and the internal payment sandbox.

**Spec:** Read [01_PRD.md](01_PRD.md), [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md), [03_API_AND_DATA_CONTRACTS.md](03_API_AND_DATA_CONTRACTS.md), [04_INTEGRATIONS.md](04_INTEGRATIONS.md) and [sample-data/README.md](sample-data/README.md). Contract names and schemas in document 03 govern implementation; update dependent documents when changing them.

## Global constraints

- Treat Crewmori as a provisional name; configure the displayed name.
- Keep Scout, Promoter, Sales, Account Manager, Operations and Finance as genuine scoped agents with useful saved artifacts and six cute visible characters.
- Keep the full application as the delivery target. The connected text journey is an integration milestone, followed by browser voice, recovery, administration and release evidence.
- Preserve immutable accepted offers, atomic capacity reservations, current satisfied payment routes, cancellation control versions and atomic goal-wide budget reservations.
- Let the builder manage team allocation, sequencing detail, account setup and spending ceilings. These choices do not block this handoff or require renewed founder confirmation.

## Review focus

1. Two buyers compete for one remaining capacity window: one feasible acceptance succeeds.
2. A worker resumes after cancellation: no later consequential dispatch occurs.
3. A late or duplicate receipt arrives: record cash once and preserve reservation history.
4. A public campaign visitor supplies an existing engagement ID: no existing-client access follows.
5. A model invents missing fees or route facts: dependent conclusions remain unknown and dispatch stays blocked.

## Module ownership

Assign a human or coding agent as the accountable maintainer of each area. One builder can own several areas. Use these boundaries to prevent overlapping edits and contradictory rules.

| Area and suggested paths | Owns | Integration contract |
|---|---|---|
| `packages/contracts/src/*` | Zod schemas, command results, event/artifact versions | Shared inputs and reason codes from document 03 |
| `supabase/migrations/*`; `packages/domain/src/identity/*` | Membership, buyer grants, RLS, storage scopes | Server-resolved actor/workspace/engagement |
| `packages/domain/src/{commercial,capacity,payments}/*` | Terms, approval, acceptance, allocation, reconciliation | Transactional commands; immutable snapshots |
| `apps/worker/src/*`; `packages/agents/src/*` | Queue handlers, six role graphs, context, control and budgets | Versioned input references and persisted outputs |
| `packages/domain/src/{profile,acquisition,conversation,crm}/*` | Evidence, import, campaigns, requirements, client timeline | Audience-filtered read models and commands |
| `apps/web/*`; `packages/ui/*` | Owner, buyer and restricted operations pages | Persisted activity and command outcomes |
| `packages/adapters/src/*` | Models, embeddings, voice, search and payments | Verified normalized provider data; no commercial policy |
| `evaluations/*`; `tests/*`; `docs/*` | Fixtures, independent checks, setup, release evidence | Reproducible commands and actual results |

The Payments domain owns reconciliation, invoice matching/allocation, duplicate-credit protection, outstanding gross balance and the capacity-commit transition. A payment adapter verifies events and normalizes receipts; it must not decide commercial success.

## Task contract for coding agents

Create a task card before each implementation slice. Include: task ID and phase; prerequisite task/contract versions; allowed files; exact exported functions/types from document 03; inputs and saved outputs; authority and idempotency checks; fixture IDs; verification command and expected assertions; excluded work; and reviewer/merge owner. Require a migration/rollback note for schema changes.

Each card follows this cycle:

- [ ] Read its listed contracts and current implementation; report conflicts before inventing interfaces.
- [ ] Add a meaningful failing command, concurrency or journey test for the behavior.
- [ ] Implement the smallest complete slice, including error outcomes and durable events.
- [ ] Run the named check, inspect saved state and capture the result.
- [ ] Request review, then commit a coherent change with any contract update.

Keep independent agents in separate branches/worktrees when available. The integrator owns shared schema changes and merges dependencies before dependent work. UI agents may develop against labeled fixtures; they cannot declare integration complete from fixture output.

## Dependency-based milestones

### Phase 1: Foundation and feasibility probes

**Depends on:** none. Establish the repository, pinned dependencies, configuration schema, local setup, CI, migrations, two-tenant seed and test reset. Implement authenticated command envelopes, idempotency records, transactional outbox/inbox, pg-boss dispatch, persistent LangGraph checkpoints, audit events and private storage rules.

Build `FinancialSandboxAdapter` and independent arithmetic tests first. Probe a real configured model's tool call and an ElevenLabs session/tool round-trip now; record account restrictions and outcomes. Probe Exa only if the builder wants early live discovery. A failed voice probe leaves Phase 1 text work runnable while the integration owner resolves it.

**Exit:** an owner command returns a task ID; a restarted worker saves/read-backs an artifact without duplicate effects; cross-tenant access fails; finance fixtures match expected values. Document the voice probe rather than claiming full voice delivery.

### Phase 2: Visible team, explicitly fixture-driven smoke

**Depends on:** Phase 1 contracts and worker. Implement separate role prompts, context builders, allowlists, structured outputs and role budgets. Add the six-character dock, task canvas, artifact inspector, reconnectable activity, and pause/resume/cancel/redirect controls.

**Exit:** labeled fixture smoke tests exercise six role runs through the worker and UI; Scout and Promoter overlap; refresh restores saved state. A character's “completed” indicator requires a validated saved output. Test atomic shared-budget reservation and stale control-version rejection. This phase does not prove the connected product journey.

### Phase 3: Acquisition, evidence and buyer text

**Depends on:** Phases 1–2. Build onboarding/profile evidence approval, text/CSV/approved-URL import, source provenance, grounded Scout fit, contextual Promoter share packages and attribution. Add owner review/copy/share status without equating copy with publication. Add buyer text qualification, structured requirements and Indonesian owner briefing.

Implement separate public-campaign inquiry creation and verified existing-client invitation exchange. Store invitation tokens hashed, single-use, expiring and revocable; authorize later calls from the resulting scoped grant.

**Exit:** one imported opportunity leads through Scout and Promoter to an attributed new inquiry. Sales saves grounded requirements and both audience-specific summaries. Unknown facts produce questions; buyer retrieval excludes private owner material.

### Phase 4: Connected commercial and CRM text journey

**Depends on:** Phase 3 requirement versions plus Phase 1 financial gates. Join Operations and Finance assessments against the same current requirements. Implement computed offer options, exact-term owner approval, explicit buyer acceptance, atomic provisional capacity reservation, immutable invoice, payment request, verified sandbox receipt, domain reconciliation and Account Manager next action.

Require a current `RouteAssessment.status = satisfied` with all required prerequisites before request dispatch. Reject `blocked`, `unknown`, expired or stale assessments. Preserve every accepted offer; amendments need new approval/acceptance and transactional capacity deltas. Handle unpaid expiry and late cash through owner recovery.

**Exit:** the actual text application path connects all six agents from import to checked deposit and saved onboarding action. Confirm USD 270 gross deposit, USD 180 outstanding and one capacity commitment in the inherited fixture. Passing isolated Phase 2 fixtures cannot satisfy this exit.

### Phase 5: Browser voice on the same commands

**Depends on:** early voice probe and Phase 4 business commands. Add ElevenLabs session grants, narrow authenticated tools, final transcript persistence, webhook deduplication, turn interruption, visible consent and text continuation. Keep structured terms authoritative across speech and bilingual summaries.

**Exit:** a live authorized buyer can qualify through voice and continue the same engagement by text after disconnect. Denied microphone permission, slow tools, repeat events and revoked grants have tested outcomes. Measure product latency before setting targets.

### Phase 6: Complete surfaces and release evidence

**Depends on:** Phases 4–5. Finish owner settings, client history, cost visibility, restricted operations/recovery tools, retention/deletion, responsive layouts, keyboard access and error/empty states. Run [08_VERIFICATION_AND_RELEASE.md](08_VERIFICATION_AND_RELEASE.md); publish reproducible setup and known limitations.

**Exit:** reviewers can install the app, run meaningful checks, inspect actual evidence, recover interrupted work and reproduce the full demonstration. The builder records remaining failures and chooses the release scope from evidence.

## Scope and completion rules

Remove extra search providers, automatic publishing, email/calendar connectors, additional payment rails and advanced retention features before reducing core depth. Simplify animation while retaining six useful agents and owner controls. If voice remains incomplete, label the build an interim text-only demonstration, not P0 or full-app completion. Keep PRD-011 open and record the failed, blocked or not-run voice checks.

Do not promise hours from this plan. Estimate each task after its dependencies and integration probe outcomes exist. A task closes after code, migrations, authorization, failure behavior, test evidence and documentation agree; a polished screen alone does not close a business workflow.
