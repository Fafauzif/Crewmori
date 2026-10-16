# Principal screen briefs

All content is fictional. Use `04_DEMO_DATA.json` consistently. Generate A first and reuse its components across B–E. Desktop is the primary exploration. An agent inspector is a reusable overlay, not a replacement for visible agent presence in the workspace.

## A. Business workspace

**Purpose:** Alya sees what her team is doing and which decision needs her.

Header: “Good evening, Alya.” Delegation prompt: “Find my next US motion design client.” Primary action: “Delegate to team”. Add a small persistent “Prototype · Sample data” label.

Main artifacts: Northstar's buyer request with Scout's portfolio assessment; Creative Founders promotional draft with Promoter's cursor. Show the original request as four assets, five business days and USD 500 budget. Do not show a request budget as an accepted price. Add a compact “12 hours available” capacity note.

Context rail: “Needs your attention”, with “Review scope and deposit”. Recent updates: “Operations checked 12 available hours” and “Account Manager prepared a client-input checklist”. Six-agent dock shows full role names and distinct states.

Interactions: select agent → inspector; open opportunity → B; review post → draft overlay; open client → C; review offer → E.

Empty variant: no active goal, six resting agents, “What would you like your team to handle?” and example goal chips. Preserve the product's team identity without inventing activity.

## B. Opportunity assessment

**Purpose:** Explain why a request is or is not worth pursuing before making promises.

Title: “Northstar Studio · Launch animations”. Source badge: “Imported request · Sample”. Buyer: Emma Reed, US. Show the requested four animations, five-day deadline and USD 500 budget.

Center: sourced portfolio cards for “Luma launch loops” and “Orbit product teaser”. Show motion-design fit supported by those sample portfolio items. Keep original request and proposed service scope separate.

Below: specialist contributions. Scout: “Relevant motion work found”. Operations: “18 hours required; 12 available”. Finance: “Full package is USD 600; buyer budget is USD 500”. Questions: “Can the buyer reduce scope?” and “Which payment methods can the buyer use?”

Primary action: “Prepare a smaller offer”. Secondary: “Ask buyer a question”. Use conditions and explanations, not an invented numerical lead-quality or nonpayment score. A small acquisition section can show USD 6 demo research cost and 30 minutes owner time, labeled sample estimates.

## C. Client workspace

**Purpose:** Keep the relationship and its next step connected to the work.

Client: Northstar Studio. Contact: Emma Reed. Tabs: Overview, Conversation, Offer, Payments. Keep the agent dock or a compact team strip present.

Show a readable timeline: imported request, Sales qualification, Operations capacity result, Finance offer draft. English conversation: buyer requests four launch animations within five business days at USD 500. Indonesian owner recap preserves those numbers and distinguishes the request from the proposed two-asset USD 450 offer.

Next action: “Confirm reduced scope with Emma”. Account Manager prepares a separate onboarding draft requesting logo files, brand colors and the launch date. Label it a draft; do not imply that the buyer accepted or that onboarding demonstrates retention.

Offer status progresses only through explicit mock controls. Primary action: “Review offer”. Secondary: “Open buyer preview”. Compact future relationship note: “After delivery, ask whether monthly launch assets would be useful”, labeled suggested follow-up, not booked recurring revenue.

## D. Buyer voice page

**Purpose:** Let a prospective US client experience Alya's AI representative.

Use a simpler owner-branded layout: Alya Putri, Motion Designer; short service description; two sample portfolio cards; availability summary. The central panel says “Talk to Alya's AI representative” with an explicit disclosure and a simulated listening/speaking waveform.

Include “Start demo conversation”, “Type instead”, mute and end controls. These are mock controls. Do not request microphone access or call a voice API. Place a short English transcript below the panel. Example: “I can help clarify your brief and prepare options for Alya to review.”

Show no private owner documents, internal pricing floor, acquisition spending or Indonesian private recap. If an offer is displayed, distinguish “Proposed by Alya” from “Accepted by you”. Avoid displaying the owner's full six-agent dock to the buyer.

## E. Offer and payment review

**Purpose:** Make the team's commercial reasoning visible and let the owner inspect terms.

Header: “A workable option for Northstar”. Comparison: full package USD 600 / four assets / 18 hours / ten business days; reduced package USD 450 / two assets / 12 hours / five business days. Mark the full package outside the current request's budget/deadline. Mark the reduced package as proposed.

Deposit choice: 40% or 60%. At 40%, show USD 180 gross, USD 176.40 estimated net, IDR 2,646,000 local equivalent and IDR 354,000 pre-delivery funding gap. At 60%, show USD 270 gross, USD 5.40 fee, USD 264.60 net and IDR 3,969,000 local equivalent against IDR 3,000,000 required expense.

All rates/fees are fictional. Use explicit “Simulated FX” and “Sandbox” labels. Initial primary action: “Approve offer”. Next illustrated states: “Awaiting buyer acceptance”, “Sandbox payment pending”, then “Receipt checked”. Final gross outstanding invoice amount is USD 180. Do not mark a deposit as project profit or completed delivery.

If the prototype supports interactions, editing scope or deposit after approval changes the status to “Review required”. The screen may show a small “Demo state” control for exploring these states without implying a real transaction.

## Reusable agent inspector

Use the same drawer on owner screens. Header: character, role name, state. Sections: Current task; Working with; Recent actions; Output; Needs from you. Include source chips and a timestamp. Footer: instruction field, Send instruction, Pause and Cancel.

Example Finance output: “A 60% deposit covers the fictional upfront expense. Owner approval and buyer acceptance are still required.” Example blocked state: “Payment method not confirmed”. Explain what input would unblock the task. Never fill the drawer with raw model logs or internal reasoning.

## Review states

Provide one empty, one waiting and one recoverable error state using existing components. Example: imported document unavailable → retain other work and show “Choose another file”. An illustrated tool failure should not turn the whole app into a blank screen. Keep all state labels consistent with the agent interaction brief.
