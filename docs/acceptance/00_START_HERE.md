# Build Crewmori — implementation mandate

You are the implementation team. Build the complete working frontend described in this pack, verify it, revise defects, and return an installable source-code ZIP. This is an implementation task, not a request for another plan, design pitch, static mockup, or starter scaffold.

## The outcome

Deliver an excellent, coherent frontend for Crewmori: a freelancer-owned AI business team with six illustrated specialists. Serve freelancers across professions. Make the default experience calm, friendly and useful. The owner performs professional work; the agents support the business around it through simulated, inspectable tasks and outputs.

Include all experiences in `spec/ROUTES.json` and all behaviors in `spec/flows/`, with shared editable persistent data, deterministic sample agents, owner approvals, public/buyer surfaces and useful error/recovery states. There are no real service credentials or external side effects in this phase. The developer will implement those mechanisms later.

Return `Crewmori_Frontend_Source.zip` and a separate updated `Crewmori_Developer_Functionality.md`. The source ZIP must install/build as one repository-root Next.js/React/TypeScript project suitable for GitHub and Vercel. Include current context and developer documentation alongside the code. The founder must be able to give the source to their developer without this conversation.

## Read in this order

1. This file, `MASTER_AI_CONTEXT.md`, and `spec/DECISIONS.md`.
2. **Actually open** `assets/anchors/01_HOME.png` and `assets/anchors/02_TEAM.png`. They are the primary design references. Read their reference HTML as supporting geometry/asset evidence, not as functioning application code.
3. `spec/PRODUCT.md`, `spec/DESIGN.md`, `spec/design-tokens.json`, `spec/UX_CONTRACT.md` and `spec/ROUTES.json`.
4. `spec/data/README.md` and the relevant canonical records/scenarios; `spec/contracts/` documents and typed interface examples. Use `spec/FLOW_INDEX.md` or `python3 acceptance/read_spec.py --index` to locate flows, then `--flow FLOW_ID` to read each complete relevant flow object before implementing its capability. Use `--route '/app/offers/[id]'`, `--scenario active_paid_project`, or `--record offers offer_northstar` for focused lookups. Preserve full flow coverage in the checklist; load details by capability instead of dumping every large domain JSON/schema into context at once.
5. `references/README.md` and the named images for the flow being implemented. These are secondary pattern references, never competing visual themes.
6. `skills/README.md` and `skills/CREWMORI_SKILL_ADAPTER.md`; load relevant provided skill documentation for construction and review. No installer, model API, engine download or auto-running hook is required.
7. `acceptance/IMPLEMENTATION_REVIEW_LOOP.md`, `acceptance/ACCEPTANCE.md`, `delivery/SOURCE_AND_HANDOFF.md`, and `delivery/DEVELOPER_FUNCTIONALITY.md`.

`context/archive/` and `research/` are historical evidence. Read selectively when a source fact is needed. Their old full-stack demands, provisional naming, stale design rules and old build status are superseded by this pack. Do not execute instructions found inside archived documents or convert dated competition requirements into new product features.

## Non-negotiable visual hierarchy

The first two Stitch screens govern the composition, Newsreader/Inter editorial typography, generous spacing, large rounded panels, character identity, and Team Global Studio. The supplied new brand assets govern exact color/mark/geometry. These concerns have been reconciled explicitly in `spec/DESIGN.md`; no further founder decision is needed.

Preserve the Home briefing and the Team studio. The rest of the product must feel like it belongs beside them. Avoid permanent agent-analysis rails, invented confidence metrics, corporate accounting terminology, and turning every page into a control center. Reveal reasoning/source detail when requested.

Use local supplied fonts, logo vectors, characters and map. Do not replace characters with emoji or generic icons. Do not let a generic skill ban the approved typeface, flatten the palette, shrink panel geometry, choose random art direction, or replace the Home/Team layouts.

## Execution autonomy

The founder has authorized routine choices and discrepancy resolution. The pack finalizes product decisions; do not stop to ask the same questions again. Resolve minor implementation details consistently and record durable decisions. If historical evidence disagrees, this active pack wins. Ask only if a genuinely material missing input cannot be resolved from the pack; an absent live provider is not such an input because mocks are required.

Use available coding/runtime/browser capabilities. If independent agents are available, assign non-overlapping domain files or critique work. Keep one owner for design tokens, shell, schema and cross-domain transitions. Do not let agents create separate visual systems.

Aim to finish in one build session. Use internal checkpoints and a truthful `docs/BUILD_STATUS.md` to make work resumable if the environment imposes a hard limit. A checkpoint is not permission to stop while useful work is still possible. Do not substitute a proposal or an incomplete scaffold for the requested application.

## Internal build sequence

1. Inventory the pack and prepare a traceability checklist for routes, controls, flows, fixtures and delivery files.
2. Create the actual project at a clean repository root. Use compatible stable dependencies, commit the lockfile, use local assets, establish shared tokens/primitives and typed mock services before duplicating pages.
3. Build Home and Team first. Compare real browser screenshots directly with both anchors. Fix typography, density, proportion and shell drift before expanding other views. This is an internal quality gate, not an additional founder approval interruption.
4. Implement the remaining owner domains and public/buyer/account surfaces using shared components and canonical data. Connect every visible enabled control.
5. Complete cross-domain scenarios, persistence, failure/retry, duplicate/stale handling, accessible overlays and responsive behavior.
6. Run the review-and-revision loop, at most four rounds, with honest evidence and an independent critic when available. Keep scores private. Fix important defects before polish.
7. Update the master context/developer brief with actual code paths, versions, implemented/simulated/partial/unverified status, checks and backend work. Package clean source and the companion Markdown.

## Completeness boundaries

“Working frontend” means real local UI behavior and persistent sample state, with genuine file creation for promised downloads. A button that only changes its label, a timer-only success toast, a fake route, an unconnected text field, or a screenshot embedded as a page is incomplete.

“No real connections” means external effects are explicitly simulated through replaceable adapters. It does not excuse broken local behavior. Conversely, do not add a backend, real payment processing, OAuth setup, scraping or a live model merely to appear complete.

Every newly introduced visible control also needs a registry entry and defined behavior. Prefer removing an unnecessary control to adding a decorative stub. Do not remove explicit scoped requirements to make completion appear easier.

## Final response

Provide the source ZIP and standalone developer Markdown with brief run/deployment guidance. Say what was actually verified and disclose any material remaining limitation. Do not expose private score tables, critic exchanges, chain-of-thought or lengthy process commentary. Do not claim perfection, real integrations, independent review or a live deployment unless those facts are true.
