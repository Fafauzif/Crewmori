# Principal: Hackathon Product Requirements Document

**Version:** 0.2, visible subagent team restored as a core requirement  
**Prepared:** 16 October 2026, Asia/Jakarta  
**Stage:** Product planning. No implementation or market validation claimed.  
**Working proposition:** An AI international sales and business team for independent professionals.

## 1. Product decision

Preserve the company vision: a freelancer directs a visible AI team that helps promote their services, develop international clients, communicate across languages, manage relationships and collect payment through existing tools. The freelancer performs the professional work.

For the hackathon, prove one complete journey:

**Community promotion or a buyer request → qualified international conversation → financially workable offer → approved sandbox deposit → recorded next relationship action.**

The central decision is whether the freelancer can accept a buyer's requested scope, deadline and payment terms while respecting capacity, required upfront funding and commercial limits. Lead discovery and voice bring the parties into that financial workflow.

For this prototype, **financially workable** means the configured capacity, price, contribution and upfront-funding checks pass under explicit fee/FX assumptions. It does not establish production payment eligibility or guarantee settlement. P0 prepares promotion and handles attributed interested prospects; automatic discovery remains P1.

The product's defining interface is a dashboard of six visible, independently dispatchable specialist subagents: Scout, Promoter, Sales, Account Manager, Operations and Finance. They have separate tasks, bounded tools and inspectable outputs, coordinated through one supervisor and shared business records. Agent characters and cursors reflect actual work. The hackathon limits each specialist to one useful task and a connected demonstration journey; it preserves the team experience. Custom model training, broad scraping and unrestricted social publishing do not belong on the critical path.

## 2. Planning assumptions and questions

The user requested clarifying questions. Optional questions about team capacity, initial profession and demo focus received no answers. The defaults below support a reviewable plan; they are not confirmed user decisions.

| Decision | Provisional default | What could change |
|---|---|---|
| Build capacity | Two or three builders, approximately four focused build days plus submission buffer | Team size, skills, usable hours and existing code may change the scope |
| Initial user | Experienced Indonesian motion designer with a credible portfolio and spare capacity | A different creative or software service changes qualification and offer fixtures |
| Initial buyer | English-speaking US small business or agency | Other markets need adapted language, scheduling and payment assumptions |
| Demonstration centerpiece | Live browser voice qualification followed by a financial offer correction and sandbox deposit | Voice access or team preference may move emphasis to text or promotion |
| Acquisition | Both self-promotion and responses to explicit buyer requests | Source access determines which discovery adapter can be live |
| Community publishing | Owner-assisted publishing of an approved share package | Supported external publishing requires separately verified channel access |
| Payment | Explicit financial sandbox with synthetic fees, FX and settlement events | A provider test integration can replace the adapter if access is ready |
| Accounts and API budget | Unconfirmed; use existing team accounts where available | A named owner must set provider limits and the total experiment budget |

**Clarifications requested before implementation:**

1. Who will build this, what are their strengths, and how many focused hours remain before submission?
2. Which first freelancer profession and service should the demo represent?
3. Which demo moment matters most: bilingual voice selling, community promotion, or cross-border deal/payment execution?
4. Which working accounts or credits already exist for the LLM, voice provider, hosting/database and optional discovery/payment services? What is the total spending ceiling?
5. Can the team provide a permissioned portfolio and real community rules or buyer requests? Synthetic material is the default where permission is absent.

A response to these questions should update this document before build commitments. The current draft does not authorize implementation, outreach, publication, calls or real-money transactions.

## 3. Problem and customer

### Primary customer hypothesis

An experienced Indonesian independent creative has skills and portfolio evidence, receives work through referrals, communities, direct messages or occasional marketplaces, and wants recurring overseas clients. They lack a dedicated sales, account-management and finance team. This is a hypothesis to validate, not a proven segment size or willingness to pay.

### Jobs to be done

- Promote a service in a relevant community using accurate claims and appropriate context.
- Recognize a suitable international request and explain why the freelancer fits it.
- Handle an interested buyer's English-language inquiry while the owner directs the business in Indonesian.
- Agree on a feasible scope, price, deadline and payment schedule.
- Know whether the deposit funds required expenses and what may remain after payment costs.
- Keep conversations, commitments, payments and follow-ups connected.

### Evidence and boundaries

The supplied `Financial_Experiences_Research.xlsx` reports programmatic screening of 83,523 records and purposeful close reading of 374. Its Findings F09, F17 and F18 distinguish expenditure before freelance income, conditional payment costs/compatibility, and contractual effects on retained pay. Those findings support investigating commercial and financial coordination. They do not establish demand for Principal, the prevalence of language barriers, conversion uplift, or willingness to delegate sales.

The user's stated English-communication and international-acquisition problems are product inputs awaiting direct customer validation. App ratings, public posts and synthetic conversations are not substitutes for paid-user outcomes.

### Value proposition

**Your own AI business team helps sell your expertise internationally, coordinate the client relationship and track the money while you do the work.**

## 4. Company vision and hackathon boundary

| Capability | Full company direction | Hackathon proof |
|---|---|---|
| Promotion | Campaigns across permitted communities, owned channels and agency partnerships | Generate a context-specific promotional post and response, with evidence and an attributed buyer link |
| Discovery | Multiple authorized sources and outcome-trained matching | Import a buyer request or community context; optionally use one public-source adapter |
| Communication | Multilingual representation across voice and messaging | English browser voice, typed fallback and Indonesian owner briefing |
| Commercial planning | Portfolio-aware pricing, capacity and cash-flow decisions | Two defined service packages and explicit financial/capacity constraints |
| Finance | Supported cross-border payment providers, reconciliation and documentation | Synthetic fee/FX quotes, a checked payment request and a reconciled sandbox deposit |
| Relationships | Retention, referrals and repeat-engagement intelligence | One persisted client timeline and an editable follow-up action |
| Team interface | A visible specialist team operating across the business and existing tools | Six independently dispatchable roles, real task events, artifact cursors, owner direction and at least two concurrent task runs |
| Learning | Models trained on consented operating outcomes | Instrument outcomes and evaluate the workflow; claim no trained conversion or cash-flow model |

The hackathon boundary is one coherent product slice. It preserves the international-sales vision instead of reducing Principal to an invoice generator.

## 5. Pareto prioritization

The 80/20 principle is a prioritization heuristic here. The percentages are not measured estimates of development effort or business impact.

### Highest-value concentration

1. **One shared engagement record** prevents promotion, conversation, offer and payment from becoming disconnected demos.
2. **A grounded bilingual representative** makes the international-access value visible and interactive.
3. **A financial offer engine and checked deposit** demonstrate a complete financial task.
4. **Evidence and permission checks** make the same journey credible under corrections and adversarial input.
5. **A real, visible subagent team** makes delegation tangible. Preserve the breadth of business roles; constrain the depth of each role's first task and the number of connectors.

### Priority table

| Priority | Requirement | Why it earns the time |
|---|---|---|
| P0 | Business profile with approved portfolio claims, packages, capacity and payment limits | Grounds selling and constrains commitments |
| P0 | Promotion/request workspace with source context, rules and an owner-approved share package | Preserves informal, community-driven selling |
| P0 | Branded buyer page with attribution and English voice plus text fallback | Provides an inspectable path from promotion to a conversation |
| P0 | Typed qualification and English/Indonesian summaries | Shows useful language support while preserving commercial meaning |
| P0 | Offer calculation, correction, owner approval and buyer acceptance | Creates the core financial decision |
| P0 | Sandbox request, receipt and reconciliation | Completes the task and produces execution evidence |
| P0 | Shared relationship timeline and editable next action | Demonstrates continuity beyond lead generation |
| P0 | Six genuine specialist subagents with individual tasks, tools, artifacts and accurate status | Makes the AI business team a working product rather than a decorative layer |
| P0 | Owner assignment, pause/cancel, structured handoffs and two concurrent independent task runs | Demonstrates useful delegation and coordination across the business |
| P1 | One authorized public discovery adapter, such as an Apify Actor | Adds live acquisition research after the full core journey works |
| P1 | One email/calendar integration | Adds an external handoff without spreading effort across connectors |
| P1 | Provider-specific payment test adapter | Strengthens execution evidence if account access is already ready |
| P1 | History-grounded repeat-engagement suggestion | Adds retention depth after deposit completion |
| Later | Broad autonomous prospecting, social publishing and outbound telephony | Requires channel-specific access, operating controls and more integration work |
| Later | Graphiti, multiple vector databases and dedicated infrastructure per agent | Useful only when shared persistence and bounded task execution become inadequate; task-scoped subagent autonomy is P0 |
| Later | Predictive lead ranking, payment-delay ML and learned negotiation policies | Requires appropriate outcomes, evaluation and operational data |
| Later | Simultaneous interpretation inside third-party meeting products | A separate real-time integration from the web representative |
| Excluded | Performing the freelancer's creative or technical project | Contradicts the selected product role |

## 6. Core user journeys

### A. Set up the business

The owner provides a service description, a small portfolio, approved claims, package prices, availability, minimum deposit, required pre-delivery expenses and receiving preferences. Principal extracts candidate facts and asks the owner to confirm material commercial fields. Each portfolio claim retains its source. Missing evidence stays missing.

**Completion:** the owner has a versioned business profile that can support a buyer conversation and offer calculation.

### B. Sell in communities and informal channels

The owner supplies a community's rules or context, or imports an explicit buyer request. Principal identifies the difference between a promotional opportunity, an actual request and an inferred need. It prepares an English service post or response with supported portfolio examples and a campaign-specific buyer-page link. The owner can review and edit it.

For Facebook Groups, P0 provides **approve, copy and open destination**. The owner publishes and can record the actual post URL. A copied draft remains `ready_to_share`; it never becomes `published` without confirmation. Principal must not claim it monitored private groups or automatically posted through a supported Groups API.

**Completion:** an approved, attributed share package exists. Publication status records the method and supporting confirmation.

### C. Qualify an international prospect

The buyer opens the freelancer's page and starts a disclosed AI voice conversation or typed chat. The representative answers from the approved profile, gathers deliverables, budget, deadline and payment expectations, and asks useful clarifications. It checks available packages through backend tools rather than inventing prices or commitments.

The owner receives an Indonesian briefing. An English recap remains available to the buyer. Both preserve currencies, amounts, conditions, dates and whether a statement is a request, proposal or acceptance.

**Completion:** a structured inquiry and transcript are attached to the correct engagement, with missing details visible.

### D. Reach financially workable terms

The buyer asks for a change. Principal checks scope, available hours, price floor, upfront funding and the documented or simulated payment route. It prepares feasible alternatives or explains what must change. The owner approves a specific offer version. The buyer then accepts that version on the buyer page.

An approved offer binds its scope, amount/currency, deposit, deadlines, beneficiary, route and quote version. Material edits invalidate the approval. The representative can discuss options but cannot silently expand its commercial authority. On buyer acceptance, the backend atomically rechecks and reserves the required capacity so two engagements cannot consume the same available hours. Release the reservation when the engagement is cancelled or an unpaid acceptance/payment window expires; keep capacity committed when an engagement remains active after a reconciled deposit.

**Completion:** an accepted, current offer supports one authorized payment request.

### E. Collect a sandbox deposit and continue the relationship

The buyer completes the clearly labeled sandbox payment. Principal verifies the event, records gross payment, fees, net receipt and invoice allocation, and compares the result with expectations. A mismatch remains unresolved. A repeated event cannot credit a second deposit.

The relationship timeline records the accepted engagement, deposit and next action, such as requesting client assets. A follow-up draft is prepared for owner review. Principal must not infer that the freelancer completed the project because a deposit arrived.

**Completion:** the deposit is reconciled, the remaining balance is visible, and the next relationship action is recorded.

## 7. Functional requirements

| ID | Requirement | Acceptance condition |
|---|---|---|
| FR01 | Version the owner profile and portfolio evidence | Material claims can be traced to provided sources; unsupported claims are omitted or marked unverified |
| FR02 | Support both self-promotion and request responses | The owner can generate either artifact from the same business profile |
| FR03 | Record source and channel permissions | Each campaign stores source method, destination, rules/context and publication mode |
| FR04 | Ground promotion in actual services | No invented client names, results, credentials or guarantees appear in the evaluation cases |
| FR05 | Attribute inbound interest | A campaign token links an inquiry to its source without treating a page visit as a qualified lead |
| FR06 | Provide voice and text interaction | A buyer can complete qualification with either interface; voice failure preserves the engagement |
| FR07 | Preserve bilingual commercial meaning | Amount, currency, date, condition and acceptance state match across the tested English and Indonesian summaries |
| FR08 | Use typed commercial tools | The representative requests offer options from the backend and cannot set arbitrary accepted prices |
| FR09 | Recalculate after relevant changes | A scope, deadline, fee or deposit change updates feasibility and invalidates dependent approvals |
| FR10 | Enforce owner and buyer stages | Owner approval and buyer acceptance are separate recorded events |
| FR11 | Create a checked sandbox request | Only a current approved/accepted offer can create the request; destination and amount match it |
| FR12 | Reconcile receipt and balance | Gross paid, fees, net receipt and outstanding invoice balance reconcile independently |
| FR13 | Handle retries and uncertainty | Duplicate events do not duplicate credits; pending and mismatched events do not appear settled |
| FR14 | Maintain the relationship record | The owner can inspect campaign, conversation, decisions, payment and next action together |
| FR15 | Provide onboarding and relationship continuity | The owner can edit a grounded next-action draft; a request for project assets does not count as retention or repeat business |
| FR16 | Direct six genuine dashboard subagents | Each role has a goal, scoped tools, task state and artifact; owner can assign, redirect, pause or cancel. Status/cursors derive from actual events; demonstrate two concurrent independent tasks |
| FR17 | Reserve capacity on acceptance | Concurrent acceptance cannot allocate the same hours twice; cancellation or expired unpaid acceptance releases its reservation |

## 8. Financial engine and synthetic evaluation example

### Rules

Use integer minor units or decimal arithmetic. Store original currencies and source amounts. Keep FX direction explicit as IDR per USD. Show unknown fees and expired quotes. Do not describe a simulated quote as an executable provider offer.

For this prototype:

`estimated net IDR = (gross USD payment − recipient fees in USD) × quoted IDR per USD − documented IDR deductions`

`project contribution = estimated net project receipts − delivery expenses − owner hours × owner-selected hourly value`

`upfront funding gap = required cash expenses before delivery − available net deposit − separately committed project cash`

Project contribution excludes taxes and fixed overhead unless explicit inputs include them. It is not the same as cash available today. A deposit is a customer prepayment with an obligation to perform, not an automatic profit or full project revenue.

### Synthetic test fixture

All values below are invented for deterministic evaluation. They are not current exchange rates, provider fees or typical industry economics.

| Input | Full package | Reduced package |
|---|---:|---:|
| Deliverables | Four short motion assets | Two short motion assets |
| Price | USD 600 | USD 450 |
| Owner effort | 18 hours | 12 hours |
| Earliest delivery | 10 business days | 5 business days |
| Cash expenses required before delivery | IDR 3,000,000 | IDR 3,000,000 |

Other fixture inputs: 12 owner hours available in the next five business days; buyer budget USD 500; owner value IDR 150,000/hour; minimum project contribution IDR 1,500,000; minimum deposit 40%, with owner-permitted deposit options of 40% or 60%; simulated recipient fee 2% of each payment; simulated FX 15,000 IDR/USD; no additional deductions or separately committed project cash. The expense is a fixed required license/resource cost in this fictional case.

**Expected decision:** a five-day full package is infeasible on capacity and exceeds the buyer's budget. The reduced package fits both. Its full-project estimated net receipt is USD 441 × 15,000 = IDR 6,615,000. After IDR 3,000,000 expenses and IDR 1,800,000 valued owner effort, project contribution is IDR 1,815,000.

A 40% deposit is USD 180 gross and USD 176.40 after the simulated fee, or IDR 2,646,000. That leaves an upfront funding gap of IDR 354,000. A 60% deposit is USD 270 gross and USD 264.60 net, or IDR 3,969,000, which covers the stated expenses. Principal can propose that alternative; owner approval and buyer acceptance remain necessary.

**Expected receipt:** record USD 270 gross against the invoice, USD 5.40 fee and USD 264.60 net, with IDR 3,969,000 simulated settlement. Remaining gross invoice balance is USD 180. Future settlement values require their own current quote; this fixture does not lock future FX.

The demonstrable intelligence is translating a changed request into feasible commercial terms, then checking the payment outcome.

Add one synthetic route variation: if a fixture marks the payer's proposed transfer type incompatible with the recipient instructions, the result is `blocked`; if a required route fact is missing, it is `unknown`. Neither result permits the payment request. This tests an explicit condition without implying a complete real-provider routing engine.

## 9. Architecture and technology decisions

### Recommended stack

| Component | Choice for the draft | Role and boundary |
|---|---|---|
| Web application | Next.js, React and TypeScript | Owner workspace, buyer page and backend routes in one application |
| Data and owner identity | Supabase Postgres, Auth and private storage | Business records, source documents, approvals, events and workspace access |
| Language reasoning | One structured-output/tool-calling LLM provider, such as Claude | Extract, qualify, retrieve, summarize and draft; backend validates every commercial mutation |
| Retrieval | Small source index; use Postgres full-text/pgvector if needed | Retrieve portfolio and agreement evidence with source IDs and versions |
| Financial logic | TypeScript functions with decimal arithmetic | Evaluate permitted packages, funding gaps and receipt reconciliation |
| Voice | ElevenLabs browser React SDK | Managed speech session with backend commercial tools; text uses the same business rules |
| Orchestration | LangGraph.js supervisor and six role subgraphs, with persisted task state | Dispatch bounded agent runs, stream events, pause for owner input and coordinate typed handoffs |
| Payments | Custom financial sandbox adapter | Request, pending, success/failure, receipt and idempotent reconciliation; provider test adapter is P1 |
| Activity UI | Server-sent events or equivalent event stream | Drive agent status and artifact highlights from recorded work |
| Discovery | User import in P0; Apify or a reviewed Treg route in P1 | No discovery provider gains general access to private communities |
| External automations | n8n only if it removes integration work | Optional connector adapter; never the authoritative financial record |

This stack is a recommendation, not a claim that credentials, quotas or deployments exist. Choose the LLM and voice accounts during the first integration check and keep provider adapters replaceable.

### Specialist responsibilities

| Subagent | Business responsibility | One hackathon task and output |
|---|---|---|
| Scout | Find and assess suitable international opportunities | Analyze an imported buyer request against portfolio evidence; produce a fit brief with sources and missing facts. A live discovery adapter remains P1 |
| Promoter | Position the freelancer and prepare channel-specific marketing | Use supplied community rules and approved claims to create a promotional share package with an attributed buyer link |
| Sales | Represent the business in English and qualify prospects | Run a disclosed voice/text conversation; produce a structured buyer brief and proposed next step with an Indonesian owner recap |
| Account Manager | Maintain client context, follow-ups and repeat-business opportunities | Update the relationship timeline from checked events and prepare an editable follow-up with its reason and due date |
| Operations | Coordinate availability, client inputs, onboarding and commitments | Check a proposed deadline against capacity and required buyer inputs; produce an onboarding checklist and capacity assessment |
| Finance | Check prices, deposits, payment costs and receipts | Evaluate offer alternatives, route an approval, create a sandbox request and reconcile its receipt through validated tools |

Each specialist is a genuine task-scoped agent run: it receives a goal and scoped context, chooses among its allowed tools, inspects results, and returns an artifact, a clarification or a blocked outcome. Store `agent_id`, `task_id`, parent task, input versions, allowed tools, budget, status and output references. Several roles can use the same foundation model while retaining separate context and authority. Six roles do not require six models or six microservices.

The supervisor assigns work and routes structured handoffs. Independent research, promotion and account tasks can run concurrently. Dependent work waits for its prerequisite: Sales requests an Operations capacity check and Finance offer calculation before proposing confirmed terms. Account Manager consumes accepted commitments and checked payment events. Agents cannot grant themselves new permissions or silently convert proposals into commitments.

Use Postgres as the authoritative business state and a source-linked retrieval index for portfolio, channel rules and client history. LangGraph checkpoints preserve execution progress; business records preserve commercial truth. Retrieved text is evidence, not authority. The execution gate validates record versions, owner approvals, permitted beneficiaries, capacity reservations and idempotency before any external effect.

For P0, give each run a bounded tool-step, token/cost and elapsed-time budget. Stop with an explicit partial or blocked result when a limit is reached. Support owner redirection, pause and cancellation at safe boundaries. Give concurrent agents separate task workspaces; coordinate shared record writes through transactions and version checks.

### Coordination example

The owner says, "Help me land a US client for motion design." Scout assesses a supplied request while Promoter prepares a relevant community post. Their cursors move across different artifacts as real updates arrive. An interested buyer talks to Sales. Sales asks Operations about the deadline and Finance about a viable deposit; their results become a reviewed offer. After acceptance and a sandbox deposit, Account Manager prepares the onboarding follow-up. The freelancer produces the motion design outside this workflow.

### Authoritative state

Logical concepts: `Workspace`, `BusinessProfileVersion`, `EvidenceSource`, `ServicePackageVersion`, `CapacityWindow`, `Campaign`, `SourceOpportunity`, `Lead`, `Engagement`, `Conversation`, `Requirement`, `OfferVersion`, `Approval`, `BuyerAcceptance`, `FXFeeQuote`, `PaymentRequest`, `PaymentEvent`, `LedgerEntry`, `FollowUp`, `AgentTask`, `AgentRun` and `AgentEvent`.

These are domain concepts, not a requirement for one table or service per concept. For P0, use core records for workspace/profile, evidence, campaign, engagement, payment events, agent tasks/runs and activity events, plus orchestration checkpoints. Keep versioned profile/offer/approval snapshots and structured conversation data in their owning records. Separate tables where constraints or access rules require them. Use a transaction and a workspace capacity lock when accepting an offer; payment-event uniqueness and access isolation remain mandatory.

Store requests, proposals, approved offers and accepted commitments as different states. Keep the original source and timestamp. An LLM's inferred fact must not overwrite an accepted agreement or confirmed payment.

Promotion states: `draft → approved → ready_to_share → published_confirmed`, with paused/cancelled states. Publication requires confirmation or supported adapter evidence.

Commercial states: `inquiry → qualifying → offer_draft → owner_approved → buyer_accepted → payment_requested → deposit_pending → deposit_reconciled`, with declined, expired and unresolved states. A separate work status remains `not_started`, `in_progress`, `owner_reported_delivered` or `buyer_accepted`; payment never implies completion.

### Execution contracts

Suggested tools: `retrieve_service_evidence`, `capture_inquiry`, `evaluate_offer_options`, `request_owner_review`, `accept_offer`, `create_sandbox_payment_request`, `inspect_payment_status`, `reconcile_payment` and `prepare_follow_up`.

Every mutation receives the workspace/engagement ID, validated arguments and current record versions. The server authenticates the caller and checks authority. Replayed events use stable unique IDs. Approval binds a hash/version of material terms. Slow or non-returning tools produce a waiting/failed state rather than an assumed success.

## 10. UI and interaction

The owner sees three connected areas:

1. **Business overview:** available capacity, confirmed deposits, outstanding balances and decisions requiring attention. Forecasts and estimates have explicit labels.
2. **Engagement workspace:** source context, promotion, portfolio evidence, conversation, offer alternatives and payment status.
3. **Visible AI team:** Scout, Promoter, Sales, Account Manager, Operations and Finance characters with idle, working, waiting, review-needed, completed, cancelled and failed states. This team is a primary navigation and delegation surface, present from the first build stage.

The shared dashboard combines a task board, business artifacts and an agent dock. The owner can assign a goal to an individual specialist or ask the supervisor to coordinate the team. Selecting an agent opens its task, sources, proposed action, tool results, output, budget usage and controls to redirect, pause or cancel. Show concise action explanations and execution traces, not private chain-of-thought.

Each active agent has its own named cursor or focus highlight attached to the artifact it is editing or inspecting. Two independent tasks should visibly progress at once. Cursor position derives from recorded actions and artifact locations; it does not imply an agent is controlling a browser when it is using an API. Waiting agents show the input or approval they need. Handoff events link the originating task, receiving specialist and transferred artifact. Provide labels alongside colors and a reduced-motion setting; animations must not obscure decisions.

The buyer page shows the professional's services, verified portfolio examples, disclosed AI representative, voice/text entry, current offer and sandbox payment status. It exposes only the relevant buyer-scoped information.

## 11. Security, permissions and reliability

These requirements support the competition's supplied security dimension and the product's financial authority boundaries.

- Separate owner-private documents from buyer-visible claims and offers; test cross-workspace isolation.
- Keep provider credentials and privileged tools server-side; issue scoped buyer/session tokens.
- Treat imported posts, portfolios, transcripts and web pages as data. Embedded instructions cannot change beneficiary, spending limits or approval requirements.
- Validate structured outputs, amounts, currency precision, dates and time zones at backend boundaries.
- Bind approval to material terms and invalidate it when those terms change.
- Allow only configured payment beneficiaries and routes. A conversational request cannot substitute another destination.
- Verify signed provider events when using real provider webhooks; deduplicate provider event/conversation IDs.
- Require tool results before announcing successful writes, accepted offers or payments. A transcript summary is not execution evidence.
- Make voice identity, source uncertainty, simulated finance and replayed fixtures visible.
- Preserve the typed journey if microphone access or voice service fails. Keep pending financial events pending until checked.
- Give the owner pause/cancel controls for promotion and follow-up. Respect recorded declines and channel preferences.

Do not add unsupported claims such as bank-grade security, guaranteed conversion, perfect translation or fully compliant global operation.

## 12. Five-minute demonstration

The following is a proposed script, not a measured run or official test.

| Approximate segment | Show | Evidence |
|---|---|---|
| 0:00–0:40 | Assign a business goal; Scout assesses a request while Promoter prepares a post | Two real task runs, distinct cursors, portfolio evidence and source context |
| 0:40–1:10 | Inspect their artifacts, approve the share package and open the buyer link | Task handoffs and owner-assisted publication boundary; no fabricated Facebook success |
| 1:10–2:10 | Judge speaks as an English-language prospect | Live qualification, source-grounded answers and Indonesian owner recap |
| 2:10–3:20 | Sales asks Operations and Finance to assess a five-day deadline and USD 500 budget | Capacity and funding artifacts; full package blocked, reduced package and sufficient deposit proposed |
| 3:20–4:15 | Owner approves, buyer accepts and sandbox deposit completes | Bound offer version, gross/fee/net amounts, receipt and remaining balance |
| 4:15–5:00 | Account Manager prepares onboarding follow-up; show one adversarial correction | All six roles contributed; shared relationship record and beneficiary/approval protection |

If a live voice response takes longer, shorten the introduction and replay a previously labeled source fixture; do not skip the financial completion. Prepare a recording and a clearly identified text fallback.

### Live, sandbox and fixture boundaries

| Surface | Intended proof mode |
|---|---|
| Profile extraction, promotion, qualification, offer reasoning, summaries and CRM updates | Live application behavior |
| Facebook publication | Owner-assisted handoff; optional confirmed URL, no automatic success claim |
| International buyer | Judge role-play or consenting test participant |
| Fees, FX and payment movement | Explicit sandbox fixtures unless a verified provider test adapter is used |
| Discovery if external access fails | Labeled imported or synthetic request |
| Existing client history | Permissioned real history or visibly synthetic fixtures |
| Retention | Recorded next action/draft; no claim of acquired repeat revenue |

## 13. Evaluation and completion criteria

All targets below are proposed acceptance targets. No tests have been executed for this PRD.

| Check | Target and evidence |
|---|---|
| Complete journey | Run the accepted-offer-to-reconciled-deposit path and retain its event/ledger trace |
| Portfolio grounding | Evaluate 12 supported/unsupported buyer questions; material capability claims link to sources or remain unknown |
| Financial correctness | Evaluate at least eight package/deposit/fee/capacity cases against independent expected values, including the fixture in section 8 |
| Bilingual meaning | Review at least 12 paired utterances covering amounts, currency, dates, conditions and acceptance; zero critical term changes in this set |
| Approval control | Reject changed scope, expired quote, beneficiary substitution and stale approval in every specified case |
| Injection resistance | Evaluate at least five malicious source snippets; none can expand authority or expose private owner data |
| Event reliability | Replay the same receipt and conversation event; no duplicate credit or duplicate engagement |
| Capacity concurrency | Attempt to accept two offers that need the same available hours; only a feasible allocation succeeds and expiry/cancellation releases the appropriate reservation |
| Synthetic route conditions | A blocked route cannot request payment; a missing prerequisite remains unknown rather than becoming a successful compatibility check |
| Channel truthfulness | Copying a post never marks it published; a page visit never marks a paying client |
| Recovery | Refresh during an engagement, deny microphone permission and interrupt a payment result; state remains coherent and text/pending recovery works |
| Task interaction | Record owner corrections, required inputs, elapsed task time and unresolved questions; report actual values without invented performance claims |
| Genuine subagent execution | Run one useful task for each of the six roles; retain task-specific tool traces and output artifacts. Run two independent tasks concurrently and show their distinct events in the dashboard |
| Agent coordination and control | Sales waits for capacity and finance results; a stale handoff triggers rechecking. Pause/cancel prevents subsequent tool dispatch, and bounded runs stop with an explicit status |

A target of zero failures applies only to these specified cases, not to all possible inputs. Have a bilingual reviewer assess commercial meaning where available; otherwise disclose the review limitation.

### Baseline comparison

Compare the core journey with a general-purpose chat assistant using the same portfolio, service rules and task requests, plus manual quote/CRM handling. Compare source support, term preservation, constraint mistakes, owner interventions and completed final states. Give both approaches the same facts. Treat any observed advantage as a bounded prototype result, not market validation.

### Definition of hackathon-ready

The team has a working core journey, a recorded live/fixture boundary, results for the required evaluation cases, reproducible setup, an environment-variable template, a short demo video, an execution trace and a security self-assessment. Unresolved defects remain explicit. No provider feature is claimed solely because it appears in a mockup.

## 14. Build plan and dependency cuts

The following is a relative workback for the provisional team assumption. It is not an effort guarantee or an official event build window.

| Stage | Main work | Exit condition |
|---|---|---|
| Day 1 | Shared state, six role definitions, supervisor/task runtime, basic team dashboard, owner profile and financial fixture | Two specialists run separate bounded tasks and stream truthful events; financial calculations match the fixture |
| Day 2 | Scout import assessment, Promoter share package, attributed buyer page, Sales text/voice and bilingual recap | An inquiry reaches the shared engagement; Scout and Promoter can work concurrently |
| Day 3 | Operations capacity/onboarding task, Finance offer/approval/payment task and Account Manager follow-up | All six roles have a useful task and one complete journey reaches a checked sandbox deposit |
| Day 4 | Cursor and handoff polish, owner controls, adversarial/recovery checks, baseline comparison and recording | Reviewable evidence package, truthful team activity and known-issue list exist |
| Buffer | Fix core defects, package submission and refresh organizer requirements | Deliverables are received before the verified cutoff |

Suggested ownership: one builder owns the workflow/data/finance path; one owns buyer/owner UI and activity; a third owns voice, integrations and evaluation. If only two builders exist, keep discovery and external connectors out of P0 and share testing.

### Cut order if time contracts

1. Remove automated discovery, additional enrichment and extra providers.
2. Remove email/calendar integrations and advanced retention generation.
3. Simplify character animation and cursor choreography while preserving all six roles, their genuine task runs, owner controls and truthful activity.
4. Use text fallback if voice remains unreliable, and disclose that the voice centerpiece is incomplete.

Protect the visible six-agent team, shared relationship record, financial constraints, approval boundaries, receipt reconciliation and a complete demonstrable journey. Limit connectors, task depth and background concurrency before removing the team experience. Never silently relabel a P0 failure as a working feature.

### Critical dependency checks

Verify voice and LLM credentials, usable quotas, browser microphone/HTTPS, database/auth setup and sandbox behavior during Day 1. Record per-provider spending and choose a hard team budget before automated runs. If a provider is unavailable, switch the adapter or fall back as described instead of leaving the entire application blocked.

## 15. Product-manager and investor assessment

### Recommendation

Proceed with the focused prototype if the team can prove a complete journey and access usable voice/LLM services early. Keep the company vision broad, but judge this entry on one financially meaningful outcome. Reassess if promotion and voice consume the build while payment-aware decisions remain a mockup.

### Differentiation hypothesis

Principal combines the individual's demonstrated expertise, Indonesian–English representation, community/direct-client acquisition, actual capacity and cross-border payment terms in one continuing relationship. The hypothesis is that this combination improves commercial outcomes for independent professionals who cannot justify a dedicated sales/account team.

Individual features already have competition. Artisan describes AI prospecting and sales communication; HoneyBook describes client management, proposals, contracts, invoices and payments. The animated team is an interface advantage, not a defensible asset by itself. Integration and bounded task evidence are the prototype advantages; measured outcome data could become a later moat.

### Sustainable acquisition and business model

Use community promotion and explicit buyer requests alongside agency partnerships, owned inbound pages, referrals and repeat work. Relevance, channel preferences and fulfilled promises protect the freelancer's reputation. Do not optimize message volume as the business goal.

Hypothesis: charge a subscription for ongoing representation and business operations, plus transparent usage for expensive research/voice. An optional fee on attributable newly collected business requires clear attribution and agreement; pre-existing clients should not automatically incur an acquisition commission. No prices, margins, market size or willingness to pay are established here.

Measure these quantities using actual inputs:

- **Freelancer acquisition cost per paying client:** research, promotion and communication spending plus owner selling time at an owner-selected value, divided by new paying clients. If there are none, report the spend and zero conversions instead of a fabricated ratio.
- **Client relationship contribution:** collected revenue minus delivery expenses, attributable acquisition costs, payment/FX costs and valued owner time. Avoid counting a cost twice.
- **Principal contribution:** subscription/usage revenue minus model, voice, data, infrastructure and variable servicing costs.
- **Retention outcomes:** repeat paid engagements, repeat collected revenue, owner renewal and client-initiated repeat inquiries, each with an explicit cohort/window.

The learning asset would link acquisition source, portfolio evidence, conversation, terms, delivery acceptance, collection and repeat work with permission. Public contact lists and synthetic conversations do not establish that asset.

### Business validation after the prototype

Test whether skilled freelancers authorize representation, buyers accept the interaction, qualified conversations become paid work, clients return and servicing costs fit revenue. Interview owners and buyers separately. Observe real tasks and compare with current practice. Synthetic tests establish workflow behavior, not customer acquisition or earnings uplift.

## 16. Competition fit and submission assumptions

Recommended provisional direction: **Topic C, cross-border finance**, because the proof centers on a cross-border service deal's funding, payment arrangement and checked receipt. Present acquisition and communication as the context that creates the financial task. Topic E is a possible alternative for a small-business finance framing, but choose one direction and verify that its wording covers the final entry.

The supplied master context reports weights of 40% task completion, 30% security/compliance and 30% innovation/interaction. Current detailed scoring was not independently re-established from the JavaScript-only organizer site for this draft. Use these supplied weights as a working lens, not a prediction of scores.

| Dimension from supplied brief | Proposed evidence |
|---|---|
| Completion | Current accepted offer, executed sandbox request, reconciled receipt and persistent next action |
| Security | Source injection, approval invalidation, beneficiary control, isolation and duplicate-event checks |
| Innovation/interaction | Community-to-finance continuity, grounded bilingual voice, useful clarification and visible correction of financial options |

IEEE's public announcement confirms an October 20, 2026 registration/submission date. The supplied context records 23:59 Beijing / 22:59 WIB and conflicts in other administrative dates. Recheck the actual organizer notice and required submission package before committing a submission schedule. Avoid importing Domestic AI build-window rules.

## 17. Risks and decision triggers

| Risk | Product response | Trigger to change the plan |
|---|---|---|
| Scope spreads across six product categories | Protect one shared community-to-deposit journey | Core journey is still disconnected after the first integration stage |
| Facebook access is mistaken for a standard API integration | Owner-assisted sharing and explicit publication evidence | No supported channel adapter has been verified |
| Voice is fluent but changes commercial meaning | Typed terms, tool-generated options and bilingual checks | Critical amounts, conditions or acceptance states change in evaluation |
| Product looks like generic AI sales software | Demonstrate capacity, upfront funding, FX/fee assumptions and checked settlement | The demo can finish without making any financial decision |
| Team adds thin ML models to claim novelty | Use grounded reasoning and deterministic finance now; instrument outcomes | Training labels do not match the claimed decision |
| Discovery/data/voice spend grows faster than value | Provider budgets, channel attribution and cost logs | No useful qualified outcomes within the agreed experiment budget |
| Payment is mistaken for profit or project completion | Separate cash, obligations, contribution and work status | Any view merges these states |
| Buyers or owners reject delegated selling | Support owner review and alternative communication modes | Observed use shows persistent trust or quality problems |

## 18. Sources and access notes

Sources were inspected during this conversation. Product documentation supports described components, not Principal's performance or market demand. Check living documentation again during implementation.

| Source | Used for | Access note |
|---|---|---|
| User-provided `FINTECHATHON_2026_INTERNATIONAL_MASTER_CONTEXT.md`, sections 3, 4, 5 and 6 | Topic boundaries, deadline conflicts, deliverables and working rubric | Supplied research snapshot dated 15 October 2026; detailed current organizer rules remain to be refreshed |
| User-provided `Financial_Experiences_Research.xlsx`, Research_Summary and Findings F09, F17, F18 | Research scope and financial problem distinctions | Previously inspected in this conversation; purposeful sample, not prevalence evidence |
| [IEEE event announcement](https://events.vtools.ieee.org/m/564095) | October 20 submission-date corroboration | Public page opened; its calendar metadata and narrative have discrepancies noted in the supplied context |
| [Meta Graph API v19 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/) and [announcement](https://developers.facebook.com/blog/post/2024/01/23/introducing-facebook-graph-and-marketing-api-v19/) | Published Groups API deprecation and April 22, 2024 transition | Official-domain search excerpts available; direct retrieval returned HTTP 429 during this review. No restored supported Groups publishing path was verified |
| [ElevenLabs React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react) | Browser conversation, microphone permission, text mode and tool-result behavior | Current page opened; commercial tools must wait for checked results |
| [LangGraph.js overview](https://docs.langchain.com/oss/javascript/langgraph/overview) | Stateful agent orchestration, persistence, streaming and owner intervention | Opened during architecture research; proposed foundation, no implementation claimed |
| [ElevenLabs post-call webhooks](https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks) | Conversation events and webhook processing | Current page opened; implement signature verification and deduplication |
| [ElevenLabs n8n integration](https://elevenlabs.io/agents/integrations/n8n) | Optional voice/workflow connection | Opened earlier in this conversation |
| [Apify n8n integration](https://docs.apify.com/integrations/n8n) | Actors, datasets and event-driven integrations | Opened; does not establish access permission to a target community |
| [Treg repository](https://github.com/superdesigndev/treg) and [lead-signals recipe](https://github.com/superdesigndev/treg/blob/main/skills/lead-signals/SKILL.md) | Optional research-tool access and signal qualification | Opened; registry/recipe, not evidence of buyer intent or conversion |
| [Stripe invoice testing](https://docs.stripe.com/invoicing/integration/testing) and [idempotency](https://docs.stripe.com/api/idempotent_requests) | Optional test adapter and duplicate-request behavior | Opened; does not establish production account eligibility or corridor support |
| [Artisan sales agent](https://www.artisan.co/ai-sales-agent) | Existing AI sales overlap | Opened; vendor-described capabilities |
| [HoneyBook](https://www.honeybook.com/) | Existing client-management and payment overlap | Opened; vendor-described capabilities |

## 19. Four-paragraph explanation

Skilled freelancers can deliver valuable work while struggling to promote their services, communicate with overseas prospects and manage the steps between an inquiry and payment. Their business information often sits across community posts, messages, documents and payment records. These are the problems Principal would investigate; their frequency and economic impact still need customer validation.

Principal is an AI business team that the freelancer directs through a dashboard of six visible specialists: Scout, Promoter, Sales, Account Manager, Operations and Finance. They help find and assess international opportunities, promote services, qualify English-speaking buyers, brief the owner in Indonesian and manage relationships, commitments and payment. The freelancer performs the professional work.

For the hackathon, each specialist would execute one useful task within a shared journey from community promotion or a buyer request to a bilingual conversation, an approved offer and a reconciled sandbox deposit. Independent agents work concurrently, exchange structured handoffs and update artifacts with visible cursors. Source-linked retrieval grounds their work; backend tools check capacity, funding and commercial authority. Facebook-group promotion uses an owner-approved share package.

The intended impact is to help independent professionals pursue suitable international work, reduce avoidable communication and payment mistakes, and develop repeat client relationships. The prototype would test task completion, financial correctness and reliable execution. Actual conversion, income gains, retention and willingness to pay remain business outcomes to measure with real users after the hackathon.
