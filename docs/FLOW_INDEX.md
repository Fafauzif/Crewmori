# Compact flow index

Read shared DECISIONS/UX/FLOW_FORMAT first. Use `python3 acceptance/read_spec.py --flow FLOW_ID` for complete relevant objects. This index does not omit any scoped capability.

| Flow ID | Job | Route | Controls |
|---|---|---|---:|
| acq.public-entry | Public entry, freelancer profile and service inquiry | `/ ; /u/[handle] ; /u/[handle]/services/[slug]` | 14 |
| buyer.conversation | Buyer text qualification and brief | `/inquiry/[id]` | 11 |
| buyer.sample-voice | Sample voice playback from stored transcript | `/inquiry/[id]` | 6 |
| acq.lead-list | Leads list, combined search and navigation | `/app/opportunities` | 8 |
| acq.lead-edit | Add, import or edit a lead/request | `/app/opportunities ; /app/opportunities/[id]` | 7 |
| acq.lead-source | Inspect and refresh source evidence | `/app/opportunities/[id]?panel=source` | 5 |
| acq.lead-assessment | Assess, qualify, decline or restore a lead | `/app/opportunities/[id]` | 10 |
| acq.offer-list | Offers list and canonical entry points | `/app/offers` | 6 |
| acq.offer-edit | Create/edit/version an offer draft | `/app/offers/[id]?edit=1` | 10 |
| acq.offer-detail | Offer detail, version history and comparison | `/app/offers/[id]` | 7 |
| acq.offer-approval | Exact-version owner approval and return for revision | `/app/offers/[id]` | 6 |
| acq.offer-share | Buyer-safe preview and deliberate sample share | `/app/offers/[id]` | 6 |
| acq.offer-withdraw-expire | Withdraw, expire and supersede unaccepted offers | `/app/offers/[id]` | 5 |
| acq.offer-amendment | Prepare and accept an amendment without rewriting history | `/app/offers/[id] ; /buyer/[id]/offer` | 6 |
| acq.promotion-draft | Promotion list, draft creation and editing | `/app/promotion` | 11 |
| acq.promotion-approval | Review and approve exact promotional content/destination | `/app/promotion?draft=[id]` | 5 |
| acq.promotion-publication | Copy and simulate confirmed publication with evidence | `/app/promotion?draft=[id]` | 7 |
| buyer.offer-review | Buyer-safe review of exact shared terms | `/buyer/[id]/offer` | 6 |
| buyer.offer-change | Request changes before acceptance or request an amendment | `/buyer/[id]/offer` | 3 |
| buyer.offer-accept | Explicit idempotent buyer acceptance and linked records | `/buyer/[id]/offer` | 4 |
| buyer.invalid-link | Invalid, expired, withdrawn and superseded buyer links | `/buyer/[id]/offer ; /buyer/[id] ; /inquiry/[id]` | 4 |
| buyer.project-portal | Accepted buyer portal and continuing navigation | `/buyer/[id]` | 8 |
| buyer.deposit-request | Issue approved deposit request and show instructions | `/buyer/[id]?tab=payment` | 5 |
| buyer.payment-simulation | Deliberate sample receipt events and reconciliation | `/buyer/[id]?tab=payment` | 5 |
| buyer.required-inputs | Submit and revise required client inputs | `/buyer/[id]?tab=inputs` | 6 |
| buyer.project-messages | Scoped project messages and safe attachments | `/buyer/[id]?tab=messages` | 6 |
| buyer.project-files | Shared file/link list and real download behavior | `/buyer/[id]?tab=files` | 8 |
| buyer.delivery-review | Review reported delivery, accept or request revisions | `/buyer/[id]` | 6 |
| foundation.public_entry | Public product entry and audience-safe navigation | `/` | 7 |
| foundation.auth_sign_in | Simulated sign-in and protected-route return | `/auth/sign-in` | 7 |
| foundation.auth_sign_up | Simulated sign-up and new-owner setup | `/auth/sign-up` | 7 |
| foundation.auth_recover | Simulated recovery request and local reset preview | `/auth/recover` | 5 |
| foundation.auth_reset | Simulated reset with invalid, expired, and completed states | `/auth/reset` | 5 |
| foundation.session_demo | Demo entry, session continuation, and sign-out | `/auth/sign-in` | 5 |
| foundation.onboarding_basics | Resumable business basics setup | `/onboarding` | 7 |
| foundation.onboarding_services | Services and portfolio setup with optional sample evidence | `/onboarding` | 10 |
| foundation.onboarding_availability | Availability, capacity, and business preferences setup | `/onboarding` | 6 |
| foundation.onboarding_finish | Optional sample tools and setup completion | `/onboarding` | 5 |
| foundation.home_brief | Home briefing, priority review, and useful updates | `/app/home` | 9 |
| foundation.navigation_search | Global navigation, contextual subnavigation, and search | `/app/home` | 15 |
| foundation.delegate_compose | Global task request, context attachments, and intent dispatch | `/app/home` | 11 |
| foundation.delegate_clarification | Bounded clarification and manual-draft fallback | `/app/team` | 7 |
| foundation.delegate_output | Task execution, result artifacts, and record continuation | `/app/team` | 7 |
| foundation.notifications | Notification center, unread counts, and action links | `/app/home` | 8 |
| foundation.scenarios | Deliberate sample scenarios, schema recovery, clock advance, and reset | `/app/home` | 9 |
| team.overview | Global Studio map, teammate selection, handoffs, and list alternative | `/app/team` | 9 |
| team.inspector | Agent, task, artifact, and source inspection | `/app/team` | 11 |
| team.activity | Activity search, date filters, pagination, and evidence trail | `/app/team/activity` | 15 |
| team.recap_focus | Catch-me-up recap and calm presentation controls | `/app/team` | 9 |
| team.task_controls | Execution pause, resume, cancel, and retry with durable outputs | `/app/team` | 7 |
| settings.connections | Connection directory, sample setup, and explicit reconnect | `/app/connections` | 9 |
| settings.connection_capabilities | Connection capability review, usage evidence, and disconnect | `/app/connections` | 9 |
| settings.profile_public_services | Business profile, service editing, and exact public snapshot publication | `/app/settings/profile` | 13 |
| settings.availability_defaults | Public intake availability, working capacity, and new-draft defaults | `/app/settings/profile` | 10 |
| settings.rules | Plain-language team operating and approval rules | `/app/settings/rules` | 9 |
| settings.preferences | Locale, display timezone, notifications, focus, and motion preferences | `/app/settings/preferences` | 10 |
| settings.knowledge | Knowledge/source upload, processing, replacement, audience, and archive | `/app/settings/knowledge` | 15 |
| work.projects.list | Find and select accepted projects | `/app/projects` | 11 |
| work.project.create_edit | Create and edit project facts | `/app/projects?new=1 or /app/projects/[id]?edit=overview` | 9 |
| work.project.detail | Inspect project and shared sections | `/app/projects/[id]` | 11 |
| work.project.lifecycle | Explicitly complete or cancel a project without rewriting delivery or money history | `/app/projects/[id]` | 13 |
| work.task.create_edit | Create and edit project tasks | `/app/projects/[id]?tab=tasks&task=[taskId or new]` | 10 |
| work.task.transitions | Complete, reopen, archive and bulk-select tasks | `/app/projects/[id]?tab=tasks` | 8 |
| work.milestone.edit | Plan milestones and handle commitment changes | `/app/projects/[id]?tab=tasks&milestone=[id or new]` | 8 |
| work.delivery.report | Report professional delivery with buyer-safe evidence | `/app/projects/[id]?action=deliver` | 7 |
| work.files.manage | Upload, inspect, download and archive project files | `/app/projects/[id]?tab=files` | 10 |
| work.inputs.review | Request and verify client inputs | `/app/projects/[id]?inputs=1` | 8 |
| work.clients.list | Find clients and preserve directory context | `/app/clients` | 8 |
| work.client.create_edit | Create/edit contact and private notes | `/app/clients?new=1 or /app/clients/[id]?edit=1` | 9 |
| work.client.workspace | Inspect relationship and archive safely | `/app/clients/[id]` | 10 |
| work.client.communication | Draft, review and simulate client messages | `/app/clients/[id]?tab=messages&draft=[id]` | 11 |
| work.calendar.browse | Navigate work calendar and agenda | `/app/calendar` | 12 |
| work.calendar.edit | Edit internal time blocks and prepare invitations | `/app/calendar?event=[id or new]` | 12 |
| work.calendar.reservation | Inspect reservation expiry and resolve rescheduling | `/app/calendar?reservation=[id]` | 8 |
| money.invoices.list | Find invoices and inspect outstanding amounts | `/app/money/invoices` | 10 |
| money.invoice.create_edit | Draft/edit invoice line items | `/app/money/invoices?new=1 or /app/money/invoices/[id]?edit=1` | 14 |
| money.invoice.issue | Review and issue exact invoice snapshot | `/app/money/invoices/[id]?review=1` | 5 |
| money.invoice.send | Review destination and simulate invoice dispatch | `/app/money/invoices/[id]?send=1` | 7 |
| money.invoice.download | Generate buyer-safe invoice PDF and data export | `/app/money/invoices/[id]` | 4 |
| money.invoice.void | Void unpaid invoice with preserved history | `/app/money/invoices/[id]?action=void` | 6 |
| money.payments.list | Inspect expected requests and actual receipts | `/app/money/payments` | 9 |
| money.payment.detail | Inspect payment evidence and unknown outcome | `/app/money/payments/[id]` | 8 |
| money.payment.match | Allocate confirmed receipt with exact amounts | `/app/money/payments/[id]?match=1` | 6 |
| money.payment.issue | Resolve partial, wrong-currency, duplicate and unknown issues honestly | `/app/money/payments/[id]?issue=1` | 12 |
| money.expenses.list_archive | Browse and archive expense records | `/app/money/expenses` | 11 |
| money.expense.create_edit | Record expense and preserve corrections | `/app/money/expenses?expense=[id or new]` | 14 |
| money.expense.receipt | Attach, replace and download actual receipt files | `/app/money/expenses?expense=[id]&receipt=1` | 9 |
| money.expenses.export | Export useful CSV and receipt ZIP with exact scope | `/app/money/expenses?export=1` | 7 |
