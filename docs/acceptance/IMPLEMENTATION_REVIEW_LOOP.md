# Crewmori implementation review and revision contract

Version 0.2 · 16 October 2026 · Instructions for the future implementation run

This contract belongs to the chat that builds the complete frontend. It does not instruct the current planning chat to implement the application or run four rounds of frontend review.

## 1. Define success before implementation

Build one coherent, editable frontend for a freelancer-owned AI business team, serving freelancers across professions. Include the agreed owner workspace, public freelancer/service experience, buyer conversation and offer journey, onboarding, and sign-in/recovery surfaces. Use persistent sample records and curated deterministic agent outcomes. The run must not require real accounts, AI providers, authentication, payments, or live integrations.

The first two approved Stitch screens control composition, editorial typography, spaciousness, illustrated teammates, and the Team studio experience. Use the new Crewmori palette, supplied outlined logos, identity colors, and compatible brand rules. Follow the explicit project overrides where the brand kit's generic UI examples conflict with those anchors. Shopify and Contra supply named interaction patterns only.

Success means all of the following:

- The route, flow, control, entity, and scenario inventories declared in the final pack are implemented. A screenshot or a renamed button is not an implemented interaction.
- Every enabled control has its specified effect; save/cancel/validation/retry/back/direct-link behaviors work; shared record changes propagate to every applicable view.
- Offers, approvals, send events, acceptance, reservations, invoices, receipts, and professional delivery retain their distinct meanings. Version checks, deduplication, money arithmetic, and calendar rules are correct in the simulation.
- Home and Team remain recognizably faithful to the approved references; new screens use the same shell, primitives, character identity, and restrained density.
- All six specialists have distinct useful outputs and meaningful task/event states. Animation reflects those states, has bounded repetition, and remains useful with reduced motion.
- Public and buyer views use deliberately safe projections. No owner-private notes, internal financial reasoning, other client data, or owner-only controls appear in shared views or downloads.
- Browser interaction, keyboard/focus, responsive layout, empty/error states, and relevant recovery paths receive actual verification. A passing build is insufficient on its own.
- The source installs and builds with its included manifest, lockfile, assets, and configuration. Vercel instructions identify the correct project root. Do not claim a live deployment unless it was actually created and checked.
- The final source ZIP includes current context, flows, service/mock contracts, developer functionality, decisions, verification evidence, brand assets and provenance, selected references, skill snapshots/licenses, and practical run/deploy instructions.
- Update the active master AI context and developer brief after implementation with actual code paths, implemented/simulated/partial/unverified status, test results, and remaining backend work. Deliver the same developer brief separately as Markdown outside the ZIP.

Before building, turn these requirements into a traceability checklist. Explicit requirements and the final pack's product decisions are gates. Resolve routine implementation choices independently. Ask only about genuinely missing material decisions; do not ask again about choices already settled in the pack. An unavailable production service is not a blocker because this run uses mocks.

## 2. Produce a complete first attempt

Complete the declared application before the final evaluation. Internal milestones may establish the shared shell, Home/Team fidelity, domain flows, cross-domain state, and delivery package. They do not substitute for a complete first attempt or require repeated founder approval.

Use shared tokens, components, records and service interfaces. If parallel agents are available, give clear ownership of files and shared contracts; domain delegation must not produce competing shells or inconsistent schemas. Keep recovery checkpoints so context/tool interruption can be resumed accurately.

## 3. Review as a demanding evaluator

Compare the actual rendered application and delivered files against the final requirements, reference images, flow assertions, and scope matrix.

If separate agents are available, obtain an independent critic's review of the actual result. Prefer complementary reviews for visual/UX fidelity and behavioral/data correctness where capacity permits. Do not describe a self-review as independent. The implementer must still reproduce and resolve relevant findings.

Otherwise, perform a distinct review pass after implementation with an explicit evaluator role. Do not merely restate what the code was intended to do.

## 4. Score applicable dimensions privately

Use these five dimensions, each scored from 0–10. Adapt their subchecks to the agreed frontend scope, not to unavailable production mechanisms.

| Dimension | Evidence and defects to assess |
|---|---|
| Task fulfillment | The specified experiences exist, the result matches the founder's approved direction, and all requested delivery/context/developer files are included. |
| Correctness | Actual control behavior, canonical states, versioning, financial/date calculations, buyer projections, persistence, and repeat/retry behavior. |
| Completeness | Route/flow/control coverage, alternate states, recovery, meaningful six-role outputs, usable downloads, and coherent end-to-end journeys. |
| Clarity and usability | Clear next actions, progressive disclosure, friendly precise copy, readable lists/forms, useful feedback, keyboard/focus behavior, and manageable visual density. |
| Presentation and execution quality | Fidelity to the two anchors plus reconciled brand; coherent typography/spacing/color/motion; reusable code and adapters; responsive stability; clean install/build and developer handoff. |

Apply the founder's scale:

- **0–5:** Substantial revision needed; fails core expectations or contains critical flaws.
- **6–7:** Usable but has clear weaknesses and noticeable gaps.
- **8.5:** Strong quality with only minor polish issues remaining.
- **9.0:** Exceptional standard, requiring overwhelming concrete evidence and pristine execution to attain.
- **10.0:** A monumental breakthrough across every field; reserved exclusively for ground-breaking, state-of-the-art perfection.

Scores between these anchors are permitted, but must have evidence. Justify each score with observable strengths, concrete remaining defects, and relevant verification gaps. Never raise a score merely to pass. Do not use an average to conceal a dimension below 8.5 or a failed explicit requirement.

Keep scores and critic exchanges private. Do not put rating tables, critique transcripts, or process commentary into the app, source ZIP, README, public UI, context handoff, or developer brief. This review-loop instruction document itself may be included as requested. Factual verification results and unresolved gaps belong in the handoff without self-awarded ratings.

## 5. Verify the result, not the intention

Use appropriate checks and record exact outcomes:

- Clean installation, type checking, linting, and production build using the chosen project scripts.
- Browser journeys spanning lead assessment, offer edit/approve/send, buyer acceptance, deliberate sample payment, onboarding, project/task changes, and synchronized owner/buyer views.
- Stale offer versions, duplicate submit/events, cancelled edits, invalid inputs, combined search/filters, empty/no-results, disconnected tool, recoverable failure, and unsupported free-text intent.
- Correct gross/fee/net/balance arithmetic; expense totals; timezone, weekday and business-day calculations; availability versus capacity versus commitments.
- Real file contents for any PDF/CSV/ZIP download offered in scope.
- Screenshots of actual implementation at the agreed desktop sizes and a narrow fallback, including overlays and representative long content. Compare directly with the approved Crewmori anchors; do not compare only with the newer generated screens.
- Keyboard access, accessible names, focus return, modal behavior, visible errors, contrast in rendered context, and reduced motion. Automated scans support, but do not replace, interaction checks.
- Documentation and source ZIP inventory: actual code paths, no broken required links, no secrets/caches/node_modules, updated master context, consistent developer brief copies, preserved upstream licenses and reference provenance.

Treat unchecked behavior as unverified. Distinguish subjective visual judgment from tested behavior. Do not claim production authorization, real funds, provider delivery, accessibility conformance, deployed availability, or independent review without actual supporting checks.

If a tool is unavailable, use a relevant permitted fallback and state its limits. Do not manufacture screenshots, passing test logs, or a browser-review claim. A material verification gap must remain visible to the evaluator.

## 6. Rank, revise, and recheck

Fix in this order:

1. Critical errors and unmet explicit requirements: missing required experiences, broken core flows, destructive state errors, buyer-data exposure, invalid money/date results, failed build, or missing delivery files.
2. Substantive weaknesses: misleading states, poor recovery, lost drafts, inconsistent shared state, major reference drift, inaccessible core controls, or overly dense pages.
3. Polish: alignment, rhythm, concise copy, subtle motion and low-impact visual details.

Each revision must target a named defect and an observable improvement. Recheck the affected flow/component and its shared consumers for regressions. Do not repeatedly run unrelated checks without a new reason.

Run at most **four review-and-revision rounds** after the complete first attempt. Reuse this single loop for skill-guided critique and independent-agent findings; do not nest additional open-ended loops from third-party skills.

Stop early only when every applicable dimension reaches **at least 8.5**, there are **no known critical errors**, and **no unmet explicit requirements**. Passing a few automated checks does not waive these conditions.

If four rounds end with unresolved issues, deliver the strongest verified result and briefly disclose the material limitation outside the deliverable. Do not relabel unfinished work complete, quietly drop requirements, or keep revising without a concrete improvement.

## 7. Final delivery

Return the complete source-code ZIP and a standalone updated developer functionality Markdown file. Explain briefly how to run/deploy the source and identify any material unresolved limitation or verification gap. Keep internal ratings, critique exchanges, and process commentary out of the deliverable and final narrative unless the founder asks for them.

Do not claim perfection. State only what exists and what was actually verified.
