# Design and interaction handoff

Crewmori is provisional; Principal is the historical name in the Stitch pack. Use a configurable app name. Files under [design/stitch/](design/stitch/) guide visual exploration/frontend mocks; they do not establish functioning agents, voice or payments. The application uses persisted state and real events from [03_API_AND_DATA_CONTRACTS.md](03_API_AND_DATA_CONTRACTS.md).

Keep the warm canvas, useful artifacts, owner decisions and cute coworkers. The owner performs commissioned work; the team handles acquisition, selling, relationships, operations and finance. Preserve the team workspace rather than introducing a generic chat interface.

## 1. Visual system

Use [design/stitch/DESIGN.md](design/stitch/DESIGN.md) as the visual baseline, prioritizing readability.

| Element | Default |
|---|---|
| Canvas / surface / muted surface | `#F5F3EC` / `#FFFEFA` / `#ECEAE1` |
| Text / secondary / border | `#202A25` / `#566159` / `#D9DED3` |
| Primary / on-primary / selected | `#245C47` / white / `#E5EFE7` |
| Attention / blocked | Dark amber on `#FFF1D6`; dark red on `#FBE8E4`; always include text. |
| Typography | Manrope headings, Inter body; system sans-serif fallback. Body 15–16px, metadata at least 12px. |
| Cards / buttons / fields | Cards 16–20px radius; buttons 10–12px; primary controls at least 44px high. |
| Desktop shell | About 208px sidebar, 68px header, 24px workspace padding, 16–24px gaps. |
| Team / inspector | Dock 96–116px with reserved space; selected-agent drawer about 360–400px. |

Use tabular numerals and aligned amount rows for money. One dominant action belongs to each decision group. Render imported text safely; do not let source markup alter the layout or imitate system controls. Use a coherent outline icon family and original characters, not emoji or stock robot heads.

## 2. Six real specialists

Distinguish characters by silhouette, role name and output. Role tints identify coworkers, not status. Use 48–64px dock illustrations and 96px inspector illustrations without obscuring terms.

| Role | Visual reference | Work shown in the application |
|---|---|---|
| Scout | Apricot `#F2C983`, rounded bean, lens detail | Source-backed opportunity/portfolio fit and missing facts. |
| Promoter | Coral `#EFAF9B`, soft star, speech pennant | Versioned community/share draft and attribution. |
| Sales | Sky `#B9D8EC`, capsule, headset | Requirements, buyer conversation and offer explanation. |
| Account Manager | Lilac `#D3C6E7`, rounded square, envelope | Client timeline, onboarding draft and next action. |
| Operations | Sage `#C6D4B5`, rounded arch, checklist | Capacity, proposed schedule and required inputs. |
| Finance | Mint `#B6D9C6`, round body, ledger | Computed options, approval needs and reconciliation. |

Show all six in owner workspaces even when only two runs are active. Use “Resting” without a task. Active characters link to actual runs; idle characters must not appear busy.

## 3. Five connected screens

Use [design/stitch/02_SCREENS.md](design/stitch/02_SCREENS.md) for composition and [design/stitch/04_DEMO_DATA.json](design/stitch/04_DEMO_DATA.json) for labeled fixtures. Preserve engagement/context during navigation.

| Screen | Required content and actions | State rules |
|---|---|---|
| **A. Business workspace** | Delegation field; opportunity and promotional artifacts; owner decision queue; recent meaningful events; six-agent dock. Open opportunity → B, client → C, commercial review → E. | Delegate returns a saved task ID and queued state. Display work only after real events. Empty view retains six resting agents and useful example goals. |
| **B. Opportunity assessment** | Original request/source dates; evidence-backed fit; separate requested versus proposed scope; Operations/Finance contributions; unresolved questions. Prepare smaller offer or ask a question. | Unsupported facts remain unknown. No invented conversion/default score. Stale/missing source offers refresh/re-import while preserving other work. |
| **C. Client workspace** | Overview, Conversation, Offer and Payments tabs; timeline; English buyer conversation; Indonesian private owner recap; editable next-action draft. Review offer → E; buyer preview → D. | Request, proposal and acceptance remain distinct. Onboarding is a draft until sent; follow-up is a suggestion, not recurring revenue. |
| **D. Buyer page** | Owner-approved service/portfolio projection; explicit AI representative disclosure; Talk/Type entry; transcript; mute/end; public offer status and explicit acceptance action. | Use live voice only after grant/session creation. Explain mic permission when needed; support text fallback. No owner dock or private rationale. |
| **E. Offer and payment review** | Compare viable options, delivery/capacity, deposit, fee/FX assumptions, upfront gap and route prerequisites. Approve exact terms; show acceptance/payment/reconciliation separately. | Material edits create a new version/review. Owner approval is not buyer acceptance; request acknowledgement is not settlement. |

Setup, uploads, connector settings, sources, draft editing and recovery use supporting panels/routes within this shell.

For the inherited fixture, the buyer requests four assets in five business days at USD 500. The proposed reduced package is two assets at USD 450; the full USD 600 package needs 18 hours and ten business days. With fictional 2% fee and 15,000 IDR/USD, a 40% deposit leaves IDR 354,000 unfunded; 60% yields USD 264.60 net/IDR 3,969,000. After the checked USD 270 gross deposit, USD 180 gross remains. Label these rates/fees and events Sandbox/Sample; a deposit is neither profit nor delivery completion.

## 4. Reusable agent inspector and controls

Role selection opens the inspector without losing edits. Show character/role/state, Current task, Working with, Recent actions, Output, Sources and Needs from you. Include timestamps and saved artifact/input-version links. Show action summaries, never hidden reasoning or raw model logs.

| Control | Required behavior |
|---|---|
| Send instruction | Saves task-scoped input, increments the control version and confirms the accepted update. A redirect refreshes relevant context before another material action. |
| Pause / Resume | Requests a safe-boundary stop/resume and reflects server acknowledgement. Waiting for an input is visually different from paused. |
| Cancel | Explains the task being cancelled, preserves saved work and stops future dispatch. Already dispatched effects remain visible. |
| Approve | Names the exact artifact/version and destination or commercial terms. Approval does not also publish, accept or pay. |
| Sources | Opens allowed source excerpts/version/date; offers a recoverable state if the source is unavailable. |

Avoid dialogs for selection, harmless navigation and draft saving. Use a focused confirmation/review for consequential acceptance, sending/publication and cancellation where work would be stopped. Keep server conflict feedback inline: “Scope changed. Review this version again.”

## 5. Event-driven activity and multiple cursors

The Stitch mocks illustrate behavior; the final application subscribes to authorized durable activity. Map run state to labels such as Queued, Working, Waiting for input, Awaiting your approval, Paused, Blocked and Completed. “Draft ready” describes the artifact; “Receipt checked” describes reconciliation. Neither should overwrite the run or engagement state.

Register semantic DOM targets, for example `opportunity.portfolio_match`, `promotion.body`, `capacity.available_hours`, `offer.deposit` and `payment.receipt`. Resolve `{recordType, recordId, artifactId, anchor}` from event focus to the current rendered element. Durable events never store desktop pixel coordinates. If a target is offscreen, closed or missing, highlight its card/open action and show a labeled activity chip; do not jump the page unexpectedly.

| Event | Visual response |
|---|---|
| `run.started` / `tool.started` | Mark the matching run Working; show its focus label when the target exists. |
| `evidence.retrieved` / `tool.completed` | Focus the relevant source/result and append a meaningful action summary. Tool completion alone does not imply artifact persistence. |
| `artifact.saved` | Render/update the saved artifact, timestamp and one restrained confirmation. |
| `handoff.created` | Name sender, receiver and referenced artifact/version; receiving run is navigable. |
| `review.required` / `run.blocked` | Place an actionable owner item with the exact missing approval/fact. |
| Pause/cancel/finish | Update from acknowledged state; stop stale motion and preserve prior outputs. |

Animate at most two cursors concurrently in the initial viewport, normally Scout and Promoter on separate artifacts. All six remain visible. Queue/coalesce visual focus without dropping timeline events. Cursor labels name the role and action; they never follow the owner's mouse, wander randomly or simulate typing while no event occurred.

Deduplicate by event ID, order by workspace sequence and refetch on gaps/reconnection. A stale subscription shows a quiet reconnecting indicator while retaining saved content. Replaying old events must not replay every celebration or imply fresh work; restore current state first.

## 6. Privacy, responsive layout and access

Owner routes expose private evidence, internal pricing floors, acquisition spending, Indonesian briefing and task controls only to authorized members. Buyer routes use a separately constructed public projection. A campaign link creates an isolated inquiry, not access to an existing engagement. Invitation exchange controls existing-client access. “Buyer preview” uses the same projection so hidden fields cannot leak through alternate tabs or realtime events.

At approximately 1024px collapse the context rail; at 768px stack artifacts and simplify navigation. Around 390px use a top header and bottom navigation: Workspace, Clients, Team, Money, with other routes in More. Mobile Team is a two-column grid of all six roles, not six compressed cards. The inspector becomes a full-height sheet with a clear close control. Reserve space for fixed navigation/dock; no page-wide horizontal scrolling.

Use semantic headings, landmarks, real buttons/links, labeled fields, visible focus, logical tab order and accessible errors. Drawer opening moves focus to its heading/first control, traps focus while modal and returns it to the invoking agent. Statuses must have text and sufficient contrast; verify actual rendered combinations. Provide tap controls for every hover affordance and keyboard access to source chips, tabs and approval terms.

Use 160–240ms transitions and occasional gentle expressions. Reduced motion preserves static labeled focus and state changes. Hide decorative cursors from assistive technology; announce meaningful updates through a polite live region. Acceptance and money remain understandable without animation.

Review desktop/mobile empty, queued, working, waiting, blocked, disconnected, stale-version and recoverable-error states. Validate keyboard journey A → B → C → E and buyer text/voice fallback. Fixtures retain “Prototype · Sample data”; functional routes identify Sandbox/live connectors accurately. Demo controls must never imply real financial actions.
