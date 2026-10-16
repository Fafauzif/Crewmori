# Team identity and prototype interactions

## Six original characters

Use role names as the primary labels. Nicknames are unnecessary in this first exploration. All characters share one original illustration family and should look like coworkers in the same product.

| Role | Accent tint | Silhouette/detail | Initial workspace state | Current task |
|---|---|---|---|---|
| Scout | Apricot #F2C983 | Rounded bean, small binocular-like lenses | Working | Assessing Northstar's request |
| Promoter | Coral #EFAF9B | Soft star-like shape, small speech pennant | Working | Preparing the community post |
| Sales | Sky #B9D8EC | Rounded capsule, small headset | Waiting | Ready for buyer questions |
| Account Manager | Lilac #D3C6E7 | Rounded square, tiny envelope | Draft ready | Preparing the client follow-up |
| Operations | Sage #C6D4B5 | Compact rounded arch, checklist detail | Checked | Reviewing capacity and buyer inputs |
| Finance | Mint #B6D9C6 | Round body, small ledger detail | Review needed | Checking scope and deposit |

Do not use color alone to convey role or state. Add name, short status and optional accessible symbol. Character accessories should remain simple enough to read at 48px. Keep the characters outside sensitive text and button hit targets.

## Core interaction model

1. Owner enters a goal in the delegation field.
2. The workspace illustrates task assignment to Scout and Promoter.
3. Their named cursors focus on separate request/post artifacts.
4. Selecting a character opens that specialist's inspector without discarding the current screen.
5. A completed output becomes a saved artifact with a check and timestamp. A required input becomes a waiting question.
6. Sales passes the buyer brief to Operations and Finance. Handoff labels name the sender, receiver and artifact.
7. Finance prepares an offer; owner approval is a distinct decision. The buyer's acceptance and sandbox receipt are separate states.
8. Account Manager receives checked agreement/payment context and prepares the next action.

This pack simulates those steps with fixture data. It does not implement actual agent runs. Keep “Prototype · Sample data” visible. In a future functional product, the same visual events must come from real actions and persisted results.

## Cursor behavior

Show a maximum of two moving named cursors in the initial viewport, one on the opportunity artifact and one on the promotional draft. Rest other agents in the dock. A cursor can point to a highlighted source snippet, an edited sentence or a saved card. It should not wander randomly or track the owner's mouse.

If static screen generation cannot animate, use clear frozen focus locations with small labels such as “Scout · Reviewing portfolio” and “Promoter · Editing draft”. This still communicates collaboration. Use a subtle selected outline around the relevant artifact.

## Owner controls

- **Message:** enter a task-specific instruction, such as “Focus on US agencies with launch work”.
- **Pause:** show a paused state and a Resume action.
- **Cancel:** show confirmation appropriate to cancelling a mock task; keep prior saved outputs.
- **Approve:** acknowledge the exact offer or promotional draft shown. Do not combine approval with publication, acceptance or payment.
- **Sources:** open a compact evidence panel with named sample portfolio/request excerpts.

Avoid a confirmation dialog for every harmless interaction. Use dialogs for meaningful mock commitments or cancellation; use inline feedback for navigation and draft edits.

## Motion

Animate panel transitions and short cursor movements with 160–240ms easing. Character blink/lean can be occasional and subtle. Waiting is visually calm. Saved output gets one small confirmation transition. Avoid constant bouncing, sound effects, confetti and typing streams that imply progress without an output.

Reduced motion preserves static characters, labeled cursor positions and all state changes. A screenshot should remain understandable with every animation disabled.

## Useful microcopy

- “Scout found relevant motion-design examples.”
- “Operations checked 12 available hours.”
- “Finance needs your review.”
- “The full package exceeds the buyer's budget.”
- “A 40% deposit leaves IDR 354,000 unfunded.”
- “Draft ready. You choose when to share it.”
- “Offer approved. Awaiting buyer acceptance.”
- “Sandbox receipt checked. USD 180 remains on the invoice.”
- “Scope changed. Review the offer again.”

Keep owner-private explanation out of the buyer page. Show business reasons and source evidence rather than model names, token logs or hidden reasoning.
