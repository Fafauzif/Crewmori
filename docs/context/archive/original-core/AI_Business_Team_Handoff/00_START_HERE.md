# AI Business Team: Complete Developer Handoff

**Package version:** 1.0  
**Updated:** 16 October 2026, Asia/Jakarta  
**Build target:** Full working application.  
**Working name:** Crewmori, proposed but not selected. Principal is the former name.  
**Current state:** Context/specifications/fixtures only. No application source or executed product tests are included.

## What you are building

A freelancer-owned AI business team with six genuine, cute, visible specialists: **Scout, Promoter, Sales, Account Manager, Operations and Finance**. They help acquire international clients, promote services, handle English conversations, manage relationships, coordinate commitments and check payment. The freelancer performs the commissioned professional work.

The owner delegates through a shared dashboard with real task states, named cursors, artifacts, sources and approval controls. The initial integrated release connects promotion/request import, qualification, joint opportunity assessment, an approved/accepted offer, a reconciled sandbox deposit and a saved client next action. Direct/informal/community relationships remain central, alongside marketplace-origin work.

The founder confirmed that the recipient will build the **full app using AI agents**. The builder manages stack familiarity, staffing, available hours, accounts and spending. Do not restart that intake. Use the baseline below, probe dependencies and resolve concrete setup issues as implementation work. The project name, launch segment and official competition topic remain open choices.

## Read in this order

| Order | Document | Purpose |
|---|---|---|
| 1 | [01_PRD.md](01_PRD.md) | What must work, what stays outside scope and how release acceptance is defined |
| 2 | [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) | Components, ownership, execution, storage and security boundaries |
| 3 | [03_API_AND_DATA_CONTRACTS.md](03_API_AND_DATA_CONTRACTS.md) | Schemas, routes, state vocabulary and critical invariants |
| 4 | [04_INTEGRATIONS.md](04_INTEGRATIONS.md) | Default vendors, alternatives, API/auth requirements and fallbacks |
| 5 | [05_IMPLEMENTATION_PLAN.md](05_IMPLEMENTATION_PLAN.md) | Milestones, dependencies and coding-agent task boundaries |
| 6 | [06_DESIGN_AND_INTERACTIONS.md](06_DESIGN_AND_INTERACTIONS.md) | Screens, characters, real cursors and owner/buyer interaction |
| 7 | [08_VERIFICATION_AND_RELEASE.md](08_VERIFICATION_AND_RELEASE.md) | Meaningful tests, evidence and release gates |

Use [07_EVIDENCE_AND_DECISIONS.md](07_EVIDENCE_AND_DECISIONS.md) for research and decision history. See [sample-data/README.md](sample-data/README.md) before loading fixtures. The [AI start prompt](AI_START_PROMPT.md) is ready to paste into an implementation assistant.

## Recommended baseline

Next.js/React/TypeScript; shared typed domain commands; Supabase Postgres/Auth/private Storage; Node worker; pg-boss for jobs; LangGraph.js for role execution/checkpoints; one configured tool-calling model; source-linked retrieval; authorized persisted activity updates; ElevenLabs browser voice; imported opportunities; internal payment sandbox. Optional providers extend this baseline rather than creating separate authority rules.

The six agents are task-scoped runs with distinct context/tools and useful outputs. They do not require six services or six audio sessions. The real-time UI is driven by stored events. A pretty animated mock does not satisfy functional completion.

## Document authority and history

- The PRD governs required product behavior. The architecture/contracts govern the proposed technical baseline. Changing a shared contract requires updating dependent documents/tests.
- Latest founder decisions in [07_EVIDENCE_AND_DECISIONS.md](07_EVIDENCE_AND_DECISIONS.md) supersede earlier intake/scope assumptions.
- [Updated master AI context](context/FINTECHATHON_2026_INTERNATIONAL_MASTER_CONTEXT.md) is self-contained: event rules/history, original concept, technical handoff and latest continuation state.
- [Idea context](context/IDEA_CONTEXT.md) gives the standalone product history and the current full-app clarification.
- `reference/` preserves earlier PRD, technical plan and source-context snapshots. They explain history and sources; they do not override current root-level specifications.
- `design/stitch/` preserves the earlier frontend-only exploration brief. Its simulated events and former name are historical design references. The working application connects them to real records and events.

Original competition sources are dated 15 October 2026. Earlier technical documentation was inspected during this conversation; this packaging step did not refresh every external page. The master retains conflicts and exact source links. Verify living rules/provider versions when implementing or submitting.

## All context is inside the archive

The `research/original/` folder includes all three supplied research workbooks, unchanged. The context pack includes source URLs and evidence IDs. The earlier Clearwork concept diagram is archived as historical reference. No prior chat, private scratch path or missing companion file is required to understand the accepted direction.

The research makes this a larger ZIP. Read the Markdown first; inspect full workbooks only for source verification or further research. Do not upload entire raw corpora into every coding-agent prompt or ship them in the public web client. Runtime development uses the fictional sample data.

## Start the build

Begin with Phase 1 of the implementation plan. Establish contracts, migrations, authority checks, durable jobs and an independently checked financial fixture. Probe model and voice credentials early, then build the visible team, connected text path and live voice. Record actual progress in [BUILD_STATUS.md](BUILD_STATUS.md).

Publishing, contacting prospects, spending beyond configured allowances, sending invitations and moving real money require their own application/operator authorization. This archive is a development handoff, not proof that those effects have happened.

`PACKAGE_MANIFEST.json` records included files, byte sizes and SHA-256 hashes. The ZIP was checked for complete entries, readable JSON, local document links, fixture arithmetic and source preservation. Those packaging checks are distinct from application tests.
