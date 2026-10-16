# AI Business Team : Product Requirements

**Version:** 1.0 · **Prepared:** 16 October 2026  
**Status:** Implementation specification; implementation and test execution are not established.  
**Name:** Crewmori is a proposed working name. The final name is unchosen; make display branding configurable.

## Product and release boundary

Build a functional full-stack application that gives an independent professional an AI business team: **Scout, Promoter, Sales, Account Manager, Operations and Finance**. The owner directs six cute, visible specialists working on shared business records. Each specialist has distinct context, permitted tools, tasks and saved outputs. Independent specialists genuinely execute concurrently; their cursors reflect recorded work.

The team finds and assesses opportunities, prepares promotion, qualifies buyers, coordinates commitments, maintains relationships and checks payment records. **The owner performs the commissioned professional work.** Do not turn this into a project-production agent, a generic chatbot, a payment-only utility or a static animated dashboard.

Direct relationships, informal requests, communities, referrals, owned inbound and international clients are central channels. Marketplace accounts are optional. The initial scenario is an Indonesian motion designer and an English-speaking US buyer; this is a fixture and customer hypothesis, not a finalized launch segment or corridor.

P0 is one integrated application, including durable backend execution, authenticated owner workspace, buyer surface, live configured English browser voice and text, Indonesian owner briefs, six role outputs, approval-bound offers, capacity reservation, checked sandbox payments and a continuing client record. An internal payment sandbox is an explicit product mode, never evidence of real settlement. Imports and owner-assisted community sharing are supported acquisition workflows. Builder-managed stack, capacity, accounts and budget are implementation choices, not prerequisites to reconfirm with the founder.

## Users, authority and visibility

| Actor | Can see and do | Boundary |
|---|---|---|
| Owner | Profile, evidence, business limits, capacity, acquisition costs, all team artifacts, conversations, offers, approvals, financial records and client history | Approves consequential actions; can pause, redirect and cancel tasks |
| Buyer | Approved services/portfolio, their conversation, buyer-safe assessment/offer, acceptance and relevant payment status | Scoped access to their engagement; no internal floor, private Indonesian briefing, other clients or acquisition economics |
| Restricted operator | Redacted failures, task recovery, provider-event reconciliation and measured usage | Explicit authorization and audit trail; no public administrative surface |

Agents receive scoped application tools, not owner-equivalent credentials. Approval of one offer, recipient or destination is not blanket authority over future actions. Browser voice identifies the representative as AI and explains its role before conversation. Recording and retention choices are visible and configurable.

## Research basis and limits

The supplied analysis screened **83,523 canonical records: 18,713 social records and 64,810 Google Play reviews**. It closely reviewed **374 selected records: 180 social records and 194 Play reviews**. These purposefully selected, reported experiences support failure mechanisms; they do not estimate population prevalence or establish product demand.

| Original evidence | Product implication |
|---|---|
| Financial F09; E0166/E0169/E0020: acquisition spending without reported contracts/exposure | Track source, cash spending, owner selling time, inquiries, agreements and collections separately |
| E0307: a writer describes winning poorly matched work | Assess deliverables against approved capability/portfolio evidence; disclose gaps |
| Financial F18; E0292: reported nonpayment after work without upfront payment | Make scope, deposit, milestones and cancellation terms explicit before commitment |
| Financial F17; E0276/E0250: conditional sender costs and incompatible receiving details | Qualify payer/recipient capabilities and preserve unknown costs |
| Financial F08; E0069/E0142/E0144: inconsistent totals or activity without saved records | Require persisted, checked outputs; measure owner repair effort |
| Financial F10; E0289: payment arrived while documentation questions remained | Preserve matched agreement, invoice and receipt evidence |

E0069's USD 36 discrepancy is not proven lost earnings. E0276 does not establish a matched cheaper alternative; E0289's tax/banking interpretation is unverified. Counterexamples E0197, E0148 and E0268 remain in the evidence register. Cute agents, English voice, retention automation and willingness to pay remain preferences or hypotheses. Financial F-numbering must remain separate from competition-dossier F-numbering. See [07_EVIDENCE_AND_DECISIONS.md](07_EVIDENCE_AND_DECISIONS.md).

## P0 requirements

All requirements below are release requirements. Their details are distributed across the companion architecture, contracts, integration, interaction and verification specifications.

| ID | Requirement and observable result |
|---|---|
| **PRD-001** | **Owner setup.** Persist workspace membership, approved services/packages, portfolio claims, commercial limits, language/timezone, delivery effort, working capacity and payment preferences. Distinguish missing values from zero. Allow later edits with versioned dependencies. |
| **PRD-002** | **Six genuine specialists.** Each named role receives a goal, scoped context, tool allowlist, budget and output schema. Runs may retrieve evidence, use tools, clarify or block. Save role-specific artifacts with creator run and input versions. A generic response relabeled six times does not qualify. |
| **PRD-003** | **Coordination.** Delegate owner goals into persistent tasks and structured handoffs. Scout/Promoter and other independent work can overlap. Sales joins current Operations/Finance assessments for the same requirements version. A handoff includes origin, recipient and artifact references. |
| **PRD-004** | **Visible work.** Show six original cute characters, role labels, task canvas, decision queue and client timeline. Named cursors/focus highlights target records actually read or changed. Inspector exposes sources, concise actions, outcomes, usage and saved outputs. No invented activity or private chain-of-thought. |
| **PRD-005** | **Owner intervention.** Support assignment, clarification replies, redirection, pause, resume and cancellation at safe boundaries. Show idle, working, waiting, review-needed, completed, blocked, failed and cancelled accurately. Cancellation prevents further dispatch; it does not claim to reverse completed external effects. |
| **PRD-006** | **Grounded evidence.** Ingest approved profile/portfolio and imported opportunity material with source, date, version and visibility. Retrieve relevant evidence; distinguish fact, owner assumption, estimate and unknown. Unsupported questions produce uncertainty/clarification, not invented claims. |
| **PRD-007** | **Scout.** Assess an imported request against deliverable-level capability, channel context and commercial constraints. Save a source-linked fit brief, gaps and next questions. Label actual requests separately from inferred needs or generic listings. Do not invent conversion or nonpayment probabilities. |
| **PRD-008** | **Promoter.** Prepare channel-specific promotion using approved claims and recorded channel rules. Save text version, destination, audience and campaign link. Owner approval binds content/destination. Copying produces ready-to-share; owner-confirmed posting records publication evidence. P0 does not promise automatic Facebook Groups publishing. |
| **PRD-009** | **Attribution and economics.** Link campaign/request, inquiry, client, engagement, agreement and collection. Record acquisition cash and valued selling time separately, with measured/estimated/unknown labels. Track budgets and suppression preferences. A visit, qualified inquiry, accepted engagement and paid installment are distinct outcomes. |
| **PRD-010** | **Buyer surface.** Provide scoped access to approved services, conversation, proposed/accepted terms and payment status. Disclose AI representation. Expired or revoked grants cannot retrieve private engagement data. Never include owner-private retrieval results in buyer context. |
| **PRD-011** | **Sales and languages.** Conduct English browser voice/text qualification; persist final messages and structured scope, budget, timing, timezone, buyer inputs and payment expectations. Produce an English recap and Indonesian owner brief preserving amounts, conditions and acceptance status. Text continues from saved state after voice failure; unfinished audio is not claimed recovered. |
| **PRD-012** | **Joint assessment.** Before presenting confirmed terms, combine Scout capability, acquisition context, buyer requirements, client history, Operations capacity and Finance economics/route facts. Explain feasible options, failed constraints and missing facts. Missing required facts block dependent conclusions. |
| **PRD-013** | **Specific commercial approval.** Create immutable offer versions containing scope, price/currency, deposit, deadline/timezone, beneficiary, route, quote and relevant assessment/policy versions. Owner approval references the exact material snapshot/hash. Material change creates new review; it cannot reuse stale approval. |
| **PRD-014** | **Buyer acceptance and capacity.** Buyer explicitly accepts an approved, current offer. Atomically validate freshness and reserve sufficient capacity; conflicting acceptances cannot double-book hours. Preserve acceptance permanently. Later change is an explicit amendment or cancellation/new agreement, with fresh approval/acceptance and capacity adjustment. |
| **PRD-015** | **Payment route gate.** Record route prerequisites as satisfied, blocked or unknown, with freshness and evidence. Dispatch requires every required prerequisite currently satisfied plus current commercial authority. Unknown and blocked both prevent dispatch. A satisfied check is not provider approval or settlement. |
| **PRD-016** | **Invoice and payment integrity.** Issue an immutable invoice from accepted terms. Create a gated sandbox request and process verified, deduplicated events. Keep gross credit, fees, net cash, receipt FX and outstanding balance separate. Reconcile exact single-invoice deposits; preserve partial, excess, late or unmatched cash as review-required. |
| **PRD-017** | **Account Manager.** Maintain one sourced client timeline across conversations, accepted commitments, checked receipts, preferences and next actions. Save an editable onboarding/follow-up draft. Sending requires separate authorization. A deposit-triggered checklist demonstrates continuity, not measured retention. |
| **PRD-018** | **Operations.** Assess capacity and dependencies, propose timing and persist a buyer-input/onboarding checklist. Commit reservation after checked deposit and release under the disclosed unpaid-expiry policy. Late money after expiry triggers owner recovery; the app cannot silently restore a delivery promise. Professional delivery status is separate and owner/buyer reported. |
| **PRD-019** | **Durability and recovery.** Save tasks, artifacts, business records and activity independently of browser/voice sessions. Reconnect replays/refetches missed events without duplication. Retry is idempotent. Timeout after an external submission remains pending/unknown until checked, rather than triggering a blind duplicate request. |
| **PRD-020** | **Authority and accessibility.** Enforce workspace/buyer isolation, server-only secrets, authenticated commands, injection-resistant tools, event verification and bounded execution. Keep redacted audits. Provide keyboard access, readable labels and reduced motion; agent activity must remain understandable without color or animation. |

## Connected journeys

**Owner setup and delegation.** The owner configures services, evidence and limits, then asks in Indonesian for another suitable international client. Scout evaluates an imported request while Promoter prepares a community share package. Separate live tasks and cursor focuses appear; opening either shows its own inputs and saved artifact. The owner corrects a claim and approves the corresponding promotion version. Copy/open destination and publication confirmation remain distinct actions.

**Buyer qualification and commitment.** An attributed link opens the buyer-safe page. The disclosed Sales representative qualifies the English-speaking buyer by voice or text. Operations and Finance assess the same saved requirements; capability gaps request clarification. Sales presents only checked options and gives the owner an Indonesian brief. Owner approval precedes explicit buyer acceptance. Acceptance reserves capacity atomically. An altered deadline or beneficiary produces an amendment/review path, while earlier commitments remain visible.

**Collection and relationship continuity.** Finance dispatches only after satisfied route checks. A verified sandbox receipt is allocated against the invoice; replay produces no second credit. The owner sees gross paid, fee, net cash and remaining gross balance. Account Manager saves the next client action using checked facts. Delivery remains unfinished until separately reported/accepted. An unmatched payment stays visible for recovery.

## Required synthetic financial fixture

Every amount, fee and FX rate below is fictional. Store money with explicit currency/scale and exact decimal/minor-unit arithmetic.

| Input | Full package | Reduced package |
|---|---:|---:|
| Motion assets | 4 | 2 |
| Gross price | USD 600 | USD 450 |
| Delivery effort | 18 hours | 12 hours |
| Earliest delivery | 10 business days | 5 business days |
| Required pre-delivery expense | IDR 3,000,000 | IDR 3,000,000 |

Availability is 12 hours in five business days; buyer budget is USD 500. Owner time value is IDR 150,000/hour; minimum contribution before acquisition is IDR 1,500,000. Simulated recipient fee is 2%; FX is 15,000 IDR/USD; no other deductions or committed project cash.

The full package fails budget and five-day timing/capacity. Reduced-package net project receipts are USD 441 / IDR 6,615,000. Less IDR 3,000,000 expense and IDR 1,800,000 valued delivery time gives **IDR 1,815,000 contribution before acquisition**.

| Deposit | Gross USD | Fee USD | Net USD | Net IDR | Upfront gap IDR |
|---|---:|---:|---:|---:|---:|
| 40% | 180 | 3.60 | 176.40 | 2,646,000 | 354,000 |
| 60% | 270 | 5.40 | 264.60 | 3,969,000 | 0 |

Propose 60% for specific owner approval and buyer acceptance. Its checked receipt credits **USD 270 gross**, records **USD 5.40 fee / USD 264.60 net** and leaves **USD 180 gross outstanding**. Future receipts need their own quote. Acquisition inputs are unknown, so contribution after acquisition is unknown. Deposits are not earned profit or completed delivery; contribution excludes taxes/fixed overhead unless explicitly supplied.

## Release acceptance

These are required future checks, not executed results. Detailed cases and evidence capture belong in [08_VERIFICATION_AND_RELEASE.md](08_VERIFICATION_AND_RELEASE.md).

| ID | Required evidence |
|---|---|
| **AC-01** | All six roles save useful distinct artifacts in the connected journey; two independent runs have overlapping execution intervals. |
| **AC-02** | Cursor/focus events resolve to actual task records; refresh and event replay preserve outputs without invented completion. |
| **AC-03** | Owner pause, clarification, redirect and cancellation change dispatch/state and preserve prior checked work. |
| **AC-04** | Unsupported portfolio questions identify gaps; imported injection cannot approve terms, alter beneficiaries or disclose private data. |
| **AC-05** | Promotion approval binds exact content/destination; copying never becomes confirmed publication automatically. |
| **AC-06** | Voice and text reach shared requirements; paired English/Indonesian cases preserve critical amounts, timing and conditions. |
| **AC-07** | Changed scope/beneficiary, expired quote and stale assessment reject old authorization; accepted history survives amendments. |
| **AC-08** | Simultaneous conflicting acceptances cannot reserve the same capacity; expired-reservation payment enters recovery. |
| **AC-09** | Fixture values match independently calculated expectations; missing acquisition inputs never become zero or profit claims. |
| **AC-10** | Blocked/unknown routes cannot dispatch; request timeout reconciles the original reference. |
| **AC-11** | Duplicate receipt causes one allocation; mismatch remains review-required; deposit does not mark delivery complete. |
| **AC-12** | Owner/buyer/workspace isolation, keyboard access, reduced motion and reconnect/restart recovery pass the specified release cases. |

## Later scope and success measures

After P0, add one authorized live discovery adapter, then selected email/calendar or provider-payment integrations. Broader source coverage, supported social publishing, outbound telephony, deeper repeat-engagement automation, additional language/currency corridors and predictive learning follow measured need. Do not reduce six-agent coverage to make room for connector breadth. Professional project production remains outside scope.

Measure task completion, evidence support, commercial errors, owner corrections/checking time, cost per successful task, qualified inquiries, accepted engagements, collections and repeat paid engagements separately. Compare the same facts/journey with general chat plus manual quote/CRM handling. No conversion uplift, earnings, retention, trained model or willingness-to-pay result is claimed.

## Companion specifications

Read [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md) for execution boundaries, [03_API_AND_DATA_CONTRACTS.md](03_API_AND_DATA_CONTRACTS.md) for schemas/state transitions, [04_INTEGRATIONS.md](04_INTEGRATIONS.md) for adapters and setup, [05_IMPLEMENTATION_PLAN.md](05_IMPLEMENTATION_PLAN.md) for build sequence, and [06_DESIGN_AND_INTERACTIONS.md](06_DESIGN_AND_INTERACTIONS.md) for the visible team experience. This PRD governs product scope; technical choices must preserve its authority, financial and visibility rules.
