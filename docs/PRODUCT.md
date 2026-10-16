# Product scope and page jobs

## Product promise

Crewmori helps a freelancer run the business around their professional work. Six specialists find and assess opportunities, prepare promotion and offers, maintain client relationships, coordinate commitments and explain money. They produce useful artifacts, use supported existing-tool connections in the future, and ask for owner decisions where authority is required.

The first release in this pack is a frontend simulation. It should be useful to explore, edit and demonstrate without configured services. The same typed domain interfaces should later accept real backend results without rebuilding the views.

## Audiences

Owner: a freelancer across any profession who wants to see what needs attention, assess a suggestion, and manage work without reading an agent's internal operational dashboard.

Buyer: someone interested in the freelancer's services who can explain a need, inspect an offer, request changes, accept exact terms, provide inputs and understand next steps. The AI representative is disclosed; owner-private notes/economics are not shared.

Developer: the person replacing sample adapters with real authentication, storage, task execution, events, integrations and financial mechanisms. They need a clear source/context handoff, not a second unstructured specification hidden inside components.

## Record ownership

| Domain | Owns | Summary behavior elsewhere |
|---|---|---|
| Home | Owner's briefing presentation, read/dismiss state | Links actual offers/tasks/events; no cloned business records |
| Team | Agent tasks, runs, handoffs, artifacts, execution activity | Small attribution elsewhere opens the same inspector |
| Opportunities | Leads, fit assessments, promotion, offer versions/approvals/share | Home/Team link canonical offer and assessment |
| Work | Clients, accepted projects, professional tasks, milestones, files, input requirements, calendar | Project can link invoices; does not own payment confirmation |
| Money | Invoices, requests, observed receipts/allocations, issues, expenses | Summary fields derive from Money records |
| Connections | Tool capabilities, connection/recovery state | Interrupted action can return after reconnect |
| Settings | Profile, public projection, services, rules, preferences, knowledge | Changing rules does not rewrite accepted history |

MECE means clear canonical ownership. It does not ban cross-links or contextual summaries.

## Default information hierarchy

First: what happened, what matters, what can the owner do next.
Second: the supporting record details, terms and assumptions.
Third: evidence, version history, detailed execution and sources.

Team is the main rich visualization. Ordinary record pages stay quiet. Use optional inspectors/disclosures instead of displaying every agent assessment and cash-flow calculation simultaneously. A complex state model does not require a complex first view.

## Page jobs

- Home: read a friendly brief and act on the most important decision.
- Team overview: see six teammates coordinating work, inspect a meaningful handoff, and open resulting artifacts.
- Team activity: find who did what, when, with which inputs and outputs.
- Opportunities: find and assess prospective work; move from a request to an owner-reviewed offer.
- Offers: draft, edit/version, review, share and track exact terms without conflating approval and acceptance.
- Promotion: prepare and approve useful business outreach with clear content/destination and honest publication state.
- Projects: understand active work, the next task, due date and current blocker.
- Project detail: coordinate the brief, milestones, files, inputs and delivery while leaving professional production in existing tools.
- Clients: find contact/relationship context and linked work; keep private notes separate.
- Calendar: see proposed and confirmed commitments with a clear timezone and deadline basis.
- Money: know what is owed/received, inspect an invoice/receipt, resolve a record issue, and record expenses.
- Connections: understand available tool capabilities and recover a connection; sample state only in this phase.
- Settings: edit the business, policies, public profile, knowledge and preferences without duplicating operational workspaces.
- Public profile/service: understand the freelancer's approved services and start an inquiry.
- Buyer conversation: explain the request, clarify material facts and reach a concrete next step.
- Buyer offer/portal: review current terms, explicitly accept or request changes, provide prerequisites and inspect relevant shared work.
- Account/setup: enter and personalize a sample workspace with reliable validation/resume behavior.

## Core demonstration

The Northstar story links the app: Scout assesses a four-asset request, Operations/Finance show that a smaller offer fits the sample window, Sales prepares terms, the owner reviews an exact version, the buyer accepts, sample payment and required inputs permit a committed project, and every domain reflects the same records.

A separate neutral non-motion example prevents overfitting fields/copy to animation. Other curated tasks show promotion, account follow-up, scheduling and Money issue handling. Include first-use and failure scenarios, not only a perfectly populated success snapshot.

## Boundaries

Include all routes/flows explicitly enumerated in this pack. Do not add marketplace search at internet scale, a forum, referral system, ecommerce inventory, subscription billing, tax advice, real escrow, arbitrary creative-production automation, or a production admin suite. Do not drop agreed public/buyer/account surfaces because the Home and Team screens receive extra design attention.

Professional work remains the freelancer's job. Agent completion is an administrative/task outcome, not proof a commissioned deliverable was created or accepted.
