# Canonical sample data

These are implementation inputs, not a claim that an application or backend has been built. Adopt the identities and invariants; create the real typed mock adapter during the implementation run.

Read [ENTITY_DICTIONARY.md](ENTITY_DICTIONARY.md), [SOURCE_FACTS_AND_ASSUMPTIONS.md](SOURCE_FACTS_AND_ASSUMPTIONS.md), then [../contracts/TRANSITIONS_AND_POLICIES.md](../contracts/TRANSITIONS_AND_POLICIES.md). Runtime schema validation is the implementer's responsibility.

| File | Purpose |
|---|---|
| `fixture_v1.json` | Normalized default store, schema 1.0.0. Northstar awaits owner review. |
| `scenarios_v1.json` | Twelve independent branches; restore baseline before applying one. |
| `fixture_v1.schema.json` | JSON Schema 2020-12 covering supplied fixture/branch row shapes and enums. |
| `scenarios_v1.schema.json` | JSON Schema for scenario overlay structure. |
| `verify_fixtures.py` | Standard-library verification of supplied schemas, references, arithmetic, dates and scenario invariants. |
| `build_fixtures.py` | Deterministic fixture generator; rerun if changing the fixture source, then verify. |

Run from this directory: `python3 build_fixtures.py` and `python3 verify_fixtures.py`. The verifier checks supplied planning data; passing it does not test the future UI or prove service behavior.

## Store and loading rules

`tables` is a dictionary of entity tables, each a dictionary keyed by exact record ID. Never maintain separate Home, Team, Money or buyer copies. Derive views through selectors and safe projections. Every record carries `id`, `workspace_id`, `version`, `audience`, `created_at`, `updated_at`.

Use a versioned persistence envelope, e.g. key `crewmori:sample:1`, with schema version, revision counter, clock, tables and separate UI preferences. Persist committed state atomically; keep form drafts separately by record/version. Do not persist passwords, real credentials or third-party tokens. Validate before hydration. On a corrupt or unsupported schema offer explicit recovery/export and sample reset; do not silently discard edits. Reset clears this app's sample keys and local binaries only, never browser-wide storage.

The clock is **2026-10-16T09:00:00+07:00**. Read relative copy from that sample clock. Advancing a day is a deliberate controller action that runs reservation expiry and overdue selectors, emits actual sample events, and persists the new clock. Ordinary page renders and animation timers do not advance business state.

Each scenario contains complete records in `upsert_records`, not partial record patches. Apply to a fresh deep copy of the baseline: clear `replace_tables`, upsert records, validate, atomically commit, then apply `ui_state`. Never stack scenarios. Ask for confirmation only when loading would lose user edits. Idempotency receipts from the previous branch must be reset with its state.

Historical `command_id`, `cause_command_id` and `interrupted_command_id` are opaque correlation identifiers, not foreign keys. Historical pre-seeded events do not require mock command receipts; commands performed interactively must persist their receipts for deduplication. Stable role IDs and semantic UI anchors are vocabulary, not entity references. All actual seeded entity references resolve.

## Branch inventory

| ID | Entry result |
|---|---|
| `review_ready` | Default; one Northstar decision, no project/reservation/receipt. |
| `first_use` | Resumable onboarding; skip explicitly enters the sample workspace. |
| `running_handoff` | Operations/Finance run; Sales waits; unfinished outputs are absent. |
| `shared_offer` | Exact approved offer shared to Emma; no acceptance/project. |
| `accepted_awaiting_prerequisites` | One project + 48-hour provisional reservation + draft deposit invoice/request. |
| `active_paid_project` | Earlier branch has confirmed full deposit and inputs, starts at the frozen clock. |
| `partial_receipt` | USD100 gross recorded against USD270 deposit; USD170 remains. |
| `wrong_currency_receipt` | IDR27000 observation against USD270 stays unallocated. |
| `disconnected_gmail` | Approved offer retained; reconnect and deliberate retry required to share. |
| `recoverable_task_failure` | Failed Finance attempt without a success artifact; Sales waits. |
| `stale_offer` | Shared v1 superseded; v2 needs review; old buyer acceptance rejected. |
| `empty_filtered_list` | Combined filters produce no matches; canonical records remain intact. |

The active branch accepted 14 October at 08:30, completed prerequisites 15 October at 08:10, and committed **16 October 09:00 → 22 October 17:00**. The default branch did not do any of those things. Branches are alternative sample histories, not chronological screens to mix together.

## Editing and extensibility

The fixture schema describes the supplied sample states. Empty reserved tables allow base record properties and additional fields because their new-row command shapes are specified in contracts, not exemplified by a fictional completed record. Do not interpret an empty table as permission to omit its product flow. Add strongly typed runtime schemas for all editable records; reject extra buyer-controlled fields and enforce the transition contracts.

`null` is intentional unknown/not-yet-created data. It is never rendered as zero or replaced with invented facts. The Lumen consulting example deliberately lacks budget/timing/effort; it demonstrates profession-neutral requirements and a useful clarification state. Portfolio attachments point to actual `assets/demo/portfolio-kinetic-launch.svg` and `assets/demo/portfolio-research-synthesis.svg` source-pack files with exact byte lengths. The implementation must copy them into its runtime asset tree and map the source locator to a working local URL; Open shows a genuine sample artifact/details view, never pretend video playback or evidence of real client work. `https://*.example`, `*.test`, and `sample://` values are reserved synthetic addresses; never fetch them or imply they are live connections.
