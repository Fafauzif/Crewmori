# Entity dictionary and ownership

Stable IDs are contract values, not display strings. All records belong to `workspace_alya`. Tables are normalized; lists of IDs express membership, while selectors derive totals and summaries. `version` is an optimistic-lock record version; `offer_versions.revision` is the commercial revision number. They must not be confused. Accepted commercial content and its acceptance snapshot cannot be edited in place.

`audience` is a coarse classification, not authorization. Owner tables contain information not safe for a buyer. The projection allowlists in `../contracts/AUDIENCE_PROJECTIONS.md` govern rendering and downloads. A frontend demo cannot enforce production isolation.

| Table | Meaning, required domain fields and relations |
|---|---|
| `workspaces` | Owner, name, IANA timezone, default/reporting currency, locale, explicit sample flag. |
| `owners` | Owner display identity, reserved sample contact address, public handle, profession, locale. No password. |
| `profiles` | Public-approved identity/biography/contact/location, availability, publication revision, approved service/portfolio IDs. |
| `services` | Profile, unique slug, title/description, profession-neutral deliverables, pricing label, category, published flag. |
| `portfolio_items` | Profile, title/summary, attachment and service IDs, approval/publication status. |
| `policies` | Deposit/fee basis points, decimal-string FX assumption, planned upfront cost, available effort minutes, workweek/holidays/timezone basis, 48-hour reservation and input gates. Policy version joins assessments. |
| `preferences` | Owner locale/timezone/motion/notification choices and last-seen event sequence. |
| `connections` | Stable provider alias (`gmail`, `calendar`, `drive`), sample mode/state, supported and approved capabilities, interrupted command correlation, typed error. No token. |
| `sources` | Kind, label, opaque sample locator, observed timestamp, content, connection, attachment IDs, fact provenance. Readable even if its mock connection later disconnects unless explicitly revoked. |
| `clients` | Relationship identity, contacts, prospect/active/archive status, website, context, next action, private-note IDs. |
| `contacts` | Client, display name, email, role label and locale; buyer view is restricted to its own contact. |
| `opportunities` | Client/contact/source/requirements/conversation/offer IDs, title, qualification state, assigned role; acquisition cash/time may be null. No unexplained demand/match score. |
| `requirements` | Opportunity, requested deliverables, optional count/budget/duration, supplied inputs, missing fields and sources. Source budget differs from proposed offer price. |
| `engagements` | Stable inquiry/buyer route identity; links one client, contact, opportunity, conversation, offer and buyer grant; optional project after acceptance. |
| `conversations` | Client/buyer contact, status, latest message, requirements and owner-review flag. |
| `messages` | Conversation, sender kind/ID, content, attachment IDs, sample delivery state, audience/shared flag, exact approved content version. |
| `assessments` | Role, opportunity, requirements/policy input versions, current/pending/stale/failed state, concise findings, separate assumptions and unknowns, source/run IDs, effort where meaningful. |
| `offers` | Mutable aggregate: client/opportunity, current version, lifecycle, shared and accepted version IDs. |
| `offer_versions` | Commercial revision: deliverables, price, effort estimate, terms snapshot, requirements/policy versions, assessments, buyer-safe note, expiry, predecessor, immutable-after-acceptance marker. |
| `approvals` | Exact subject ref/version, action, owner, destination, approved timestamp and current/invalidated/consumed state. No blanket permission. |
| `share_records` | Exact offer/version/approval/contact, sample share state, timestamp, connection and command correlation. |
| `acceptances` | Buyer contact, shared exact offer revision, price/terms snapshots, accepted timestamp and command correlation. Immutable. |
| `buyer_grants` | Engagement/contact/conversation/offer and optional project, expiry/revocation state; local demo navigation marker only. |
| `projects` | Accepted snapshot/acceptance/client/opportunity, prerequisite/deposit/input states, professional delivery state, reservation, committed dates, input/milestone/task/file IDs. |
| `required_inputs` | Project, stable key, label, required flag, missing/provided state, answer/files and provided timestamp. |
| `milestones` | Project, title, state, derived/approved due date and buyer-sharing flag. |
| `work_tasks` | Project, title/state, owner assignee, due date, notes. These are professional/administrative tasks, distinct from agent runs. |
| `reservations` | Project/acceptance, effort, provisional/committed/released/expired state, expiry, commitment/start/due timestamps. |
| `calendar_events` | Project, title/kind/state, start/end/timezone, connection, external invitation state and sharing. Internal calendar commitment does not imply an external invitation. |
| `invoices` | Client/project/offer version, installment kind, number, draft/issued/partially_paid/paid/void state, currency, line IDs, issue/due timestamps, acceptance authorization. Totals are selectors. |
| `invoice_lines` | Invoice, description, positive quantity, exact unit amount and tax basis points. Supplied sample has zero tax; do not invent tax policy. |
| `payment_requests` | Invoice, expected gross money, created/pending/confirmed/failed/cancelled/unknown state, explicit sample mode, expiry/attempt/external reference. |
| `receipts` | Payment request, observed gross/fee/net, evidence/source/provider-event IDs, observed timestamp, observation state separate from reconciliation state. |
| `allocations` | Receipt → invoice, same-currency gross allocated amount, posted/reversed state and reason. Never allocate net cash to gross debt. |
| `finance_issues` | Invoice/receipt, mismatch kind/state/summary, assigned finance role, explicit resolution and evidence IDs. Resolving a note cannot invent payment evidence. |
| `expenses` | Category, description, exact money/currency, expense date, attachment/project IDs and paid flag. Planned upfront cost is not automatically an expense. |
| `attachments` | Name/media type, local/bundled/metadata-only storage location, optional byte length, availability, source/sharing. Missing bytes have explicit unavailable UI. |
| `private_notes` | Client and owner-only content. Never public/buyer. |
| `promotions` | Service, current revision, lifecycle and published revision. |
| `promotion_versions` | Exact content/destination, public claim refs, sources, approval revision, state and publication evidence. Copy is not publication. |
| `agent_runs` | Distinct role/task/title, lifecycle, attempt/previous attempt, versioned inputs, outputs, blocked/error state, actual progress checkpoint, control version, semantic focus target. |
| `artifacts` | Creator run/role, kind/title, referenced output, input versions, sources and current/stale state. No hidden reasoning transcript. |
| `handoffs` | From/to runs, versioned artifact, pending/consumed/rejected state. Same-requirements joins required. |
| `events` | Unique ID + workspace sequence, occurred timestamp, kind, safe owner summary, role/run, record refs, semantic anchor, command cause, visibility. |
| `command_receipts` | Interactively executed idempotent command key/fingerprint/result/event IDs; a repeated command returns the same recorded outcome. Seeded history uses correlations without fabricating executed receipts. |
| `onboarding_sessions` | Owner, resumable state/step, completed/skipped steps and typed draft. Never credentials. |

## Vocabulary

Role IDs: `scout`, `promoter`, `sales`, `account_manager`, `operations`, `finance`. Display names are centralized copy. Role colors identify roles, not success/error.

Money: `{amount_minor: integer, currency: "USD" | "IDR", scale: 2 | 0}`. USD always scale 2, IDR always 0. Money is never binary floating point. Percentages use integer basis points (`6000` = 60%). Effort uses integer minutes. FX is a decimal string, here `"15000"` IDR per USD.

Snapshots and references: `{table, id, version}`. A reference to an older version is valid historical evidence if that version existed; it is not current approval. New IDs generated during interactive CRUD must be stable random UUID-based IDs, not array indexes or `Date.now()` alone. Preserve unknown IDs as not-found; never fall back to Northstar.
