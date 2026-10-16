# Implementation traceability

This companion map links the original specification to the delivered local frontend. **It is an ownership and static coverage map, not a claim that every control passed manual testing.** The original route, flow and control registries remain unchanged.

The supplied inventory contains **34 routes, 88 flows, 734 controls and 363 named steps**. All original IDs are present in [CONTROL_IMPLEMENTATION_MAP.json](CONTROL_IMPLEMENTATION_MAP.json), including owning code symbols, command boundaries, source flow, status and verification scope. The file also registers 30 implementation-added controls/options under `impl.*`; these are not added to the original counts. SHA-256 hashes record the unchanged source inventory.

| Surface | Code owner | Mutation and effect boundary |
| --- | --- | --- |
| Public entry, auth, onboarding, buyer conversation/offer/portal | `src/views/public.tsx` | Sample session/setup commands; scoped buyer commands; approved public and buyer projections |
| Leads, offers, amendments, promotion | `src/views/acquisition.tsx` | Opportunity/offer/promotion commands; exact-version review; sample sharing/publication |
| Home, Global Studio, activity | `src/views/home-team.tsx` | Saved events, deterministic `agent.control` checkpoints, canonical artifact links |
| Navigation, search, notifications, scenarios, delegation, recap | `src/components/shell.tsx` | Local UI/preferences, explicit scenario replacement and frozen clock; `agent.start` |
| Projects, tasks, milestones, files, inputs, client messages, calendar | `src/views/work.tsx` | Project/task/message/calendar commands; retained files; exact review before simulated send/invite |
| Invoices, receipts, allocation issues, expenses and exports | `src/views/money.tsx` | Integer money arithmetic, invoice/finance/expense commands, actual PDF/CSV/ZIP bytes |
| Profile/services, rules, preferences, connections, knowledge | `src/views/settings.tsx` | Saved drafts, exact public publication snapshot, simulated connection capabilities, retained sources |
| Command policy and normalized state | `src/lib/engine.ts`, `src/lib/store.tsx` | Local persistent command transaction, version/idempotency checks, workspace snapshot |
| Audience and file boundaries | `src/lib/projections.ts`, `src/lib/downloads.ts` | Allowlisted public/buyer DTOs, scoped grants, actual IndexedDB/approved asset bytes |
| Route and shared interaction layer | `src/components/application.tsx`, `src/components/ui.tsx` | Catch-all route dispatch, sample session guard, app overlays, dirty navigation, focus and feedback |

`implemented_local_route` confirms that all 34 route patterns dispatch to a concrete view, including app-owned missing-record states. Owner routes require a local sample session. Public/buyer views use approved/scoped projections; an owner session does not substitute for a buyer grant.

The original control entries use conservative statuses:

- `shared_local_behavior`: 468 controls. Local field/navigation/overlay/filter behavior uses the named component and shared UI; not individually certified.
- `mapped_local_surface`: 244 controls. Owning local component and flow command boundary exist; behavior is mapped, not individually certified.
- `simulated_external_effect`: 10 controls. Local sample state or browser/device behavior only. No provider, payment, email, account or publishing side effect is real.
- `partial`: 12 controls. Specific behavior differs or is incomplete; read note.

Commands listed per control are explicitly **flow-level command ownership**, not a claim that a field or navigation link calls every command. Field editing, previews, sorting, paging and closing usually remain React/URL/browser state until the explicit commit action. Source labels may have changed; `exact_spec_label_literal_found_in_owning_surface` is evidence for inspection, not a pass/fail result.

## Verification scope

Automated domain suites exercise core happy paths and negative boundaries, including exact offer approvals, accepted immutability, buyer grants, cross-client attachment isolation, stale writes, atomic bulk task completion, project lifecycle preservation, currency/receipt reconciliation, and actual export generation. Root browser review covers selected desktop/mobile and workflow routes; see [BUILD_STATUS.md](BUILD_STATUS.md) and [MASTER_CONTEXT.md](MASTER_CONTEXT.md) for the executed commands and observations. **Control-level manual checks are not complete.** No row in this map invents an individual browser pass.

All email, invitations, provider receipts, promotion publication, auth/recovery and connections are explicitly local simulations. Voice uses an available device speech voice with written transcript fallback. Source URL imports retain references; arbitrary web retrieval, live AI, real external sends/payments and production authentication are outside this frontend runtime.

## Remaining acceptance differences

The detailed partial controls below need their original flow reviewed before production completion. These are tracked differences, not silently reclassified as optional requirements.

- `foundation.delegate_clarification.answer_text` — Unknown requests are retained and resolved through a supported-intent choice or manual draft; no multi-turn free-text clarification interpreter.
- `foundation.delegate_clarification.back` — Clarification is a one-screen task choice rather than a sequence with a previous-answer step.
- `foundation.delegate_compose.preview` — Selected source chips can be removed; full retained source preview is in Knowledge rather than a dedicated composer preview.
- `foundation.delegate_output.edit_result` — Saved artifacts link to their domain editor; there is no generic inline result editor.
- `team.inspector.tabs` — Inspector uses sections and disclosure rather than four separately selectable tabs.
- `team.inspector.instruction` — Follow-up opens a new delegation request rather than editing an active task instruction in place.
- `work.project.amend` — Accepted-offer link leads to amendment action; no direct scope-change control in the project editor.
- `work.inputs.review` — Input answers and status are shown; attached evidence is available through project Files rather than an embedded review preview.
- `work.inputs.request` — Change request retains feedback and resets input state; shared communication is separate.
- `work.inputs.save_request` — Feedback saves locally; owner can prepare a separate reviewed reminder message.
- `work.event.remove` — Already-sent invitation cancellation is retained as an internal proposal; no completing simulated cancellation-send path is exposed.
- `work.client.tab_next` — Next work is displayed in the client overview; no dedicated Next steps tab.

Cross-cutting limits: most ordinary form buffers have dirty navigation/before-unload protection but are not restored after forced reload; persisted committed data and selected setup/delegation drafts are retained. EN/ID coverage does not include every long-form domain message. Local browser storage is not production multi-user isolation or a durable server. Uploaded blobs can become unavailable after browser storage clearing; the UI reports unavailable originals. Scenario replacement can leave unreferenced IndexedDB blobs.

The final work review added a real delivery-preview step and separate message review, a buyer-safe post-cancellation draft action, and an amendment-backed revised-schedule path. Revised dates preserve the prior promise, require exact buyer acceptance and prerequisites, and have a separate owner review when later application is needed. These changes close earlier proposal-only/delivery-message gaps; implementation status should be read with the final test evidence rather than historical review notes.

## Reading the map

1. Find a route, flow or control ID in `CONTROL_IMPLEMENTATION_MAP.json`.
2. Open its `implementation_refs` and the untouched `spec_source` flow.
3. Use `command_ownership` to inspect validation, event effects and persistence.
4. Run the relevant domain regression and then manually check the exact control, keyboard/cancel path, stale/error state and cross-screen result before marking it individually verified.

The companion map includes every original flow’s named step IDs and assertion counts. It intentionally does not rewrite source controls to make the implementation appear complete.
