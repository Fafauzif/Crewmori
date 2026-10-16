# Required route to flow coverage

| Route | Relevant flows |
|---|---|
| `/` | acq.public-entry, buyer.conversation, buyer.sample-voice, acq.lead-list, acq.lead-edit, acq.lead-source, acq.lead-assessment, acq.offer-list, acq.offer-edit, acq.offer-detail, acq.offer-approval, acq.offer-share, acq.offer-withdraw-expire, acq.offer-amendment, acq.promotion-draft, acq.promotion-approval, acq.promotion-publication, buyer.offer-review, buyer.offer-change, buyer.offer-accept, buyer.invalid-link, buyer.project-portal, buyer.deposit-request, buyer.payment-simulation, buyer.required-inputs, buyer.project-messages, buyer.project-files, buyer.delivery-review, foundation.public_entry, foundation.auth_sign_in, foundation.auth_sign_up, foundation.auth_recover, foundation.auth_reset, foundation.session_demo, foundation.onboarding_basics, foundation.onboarding_services, foundation.onboarding_availability, foundation.onboarding_finish, foundation.home_brief, foundation.navigation_search, foundation.delegate_compose, foundation.delegate_clarification, foundation.delegate_output, foundation.notifications, foundation.scenarios, team.overview, team.inspector, team.activity, team.recap_focus, team.task_controls, settings.connections, settings.connection_capabilities, settings.profile_public_services, settings.availability_defaults, settings.rules, settings.preferences, settings.knowledge, work.projects.list, work.project.create_edit, work.project.detail, work.project.lifecycle, work.task.create_edit, work.task.transitions, work.milestone.edit, work.delivery.report, work.files.manage, work.inputs.review, work.clients.list, work.client.create_edit, work.client.workspace, work.client.communication, work.calendar.browse, work.calendar.edit, work.calendar.reservation, money.invoices.list, money.invoice.create_edit, money.invoice.issue, money.invoice.send, money.invoice.download, money.invoice.void, money.payments.list, money.payment.detail, money.payment.match, money.payment.issue, money.expenses.list_archive, money.expense.create_edit, money.expense.receipt, money.expenses.export |
| `/auth/sign-in` | foundation.auth_sign_in, foundation.session_demo |
| `/auth/sign-up` | foundation.auth_sign_up |
| `/auth/recover` | foundation.auth_recover |
| `/auth/reset` | foundation.auth_reset |
| `/onboarding` | foundation.onboarding_basics, foundation.onboarding_services, foundation.onboarding_availability, foundation.onboarding_finish |
| `/app/home` | foundation.home_brief, foundation.navigation_search, foundation.delegate_compose, foundation.notifications, foundation.scenarios |
| `/app/team` | foundation.delegate_clarification, foundation.delegate_output, team.overview, team.inspector, team.activity, team.recap_focus, team.task_controls |
| `/app/team/activity` | team.activity |
| `/app/opportunities` | acq.lead-list, acq.lead-edit, acq.lead-source, acq.lead-assessment |
| `/app/opportunities/[id]` | acq.lead-edit, acq.lead-source, acq.lead-assessment |
| `/app/offers` | acq.offer-list, acq.offer-edit, acq.offer-detail, acq.offer-approval, acq.offer-share, acq.offer-withdraw-expire, acq.offer-amendment |
| `/app/offers/[id]` | acq.offer-edit, acq.offer-detail, acq.offer-approval, acq.offer-share, acq.offer-withdraw-expire, acq.offer-amendment |
| `/app/promotion` | acq.promotion-draft, acq.promotion-approval, acq.promotion-publication |
| `/app/projects` | work.projects.list, work.project.create_edit, work.project.detail, work.project.lifecycle, work.task.create_edit, work.task.transitions, work.milestone.edit, work.delivery.report, work.files.manage, work.inputs.review |
| `/app/projects/[id]` | work.project.create_edit, work.project.detail, work.project.lifecycle, work.task.create_edit, work.task.transitions, work.milestone.edit, work.delivery.report, work.files.manage, work.inputs.review |
| `/app/clients` | work.clients.list, work.client.create_edit, work.client.workspace, work.client.communication |
| `/app/clients/[id]` | work.client.create_edit, work.client.workspace, work.client.communication |
| `/app/calendar` | work.calendar.browse, work.calendar.edit, work.calendar.reservation |
| `/app/money/invoices` | money.invoices.list, money.invoice.create_edit, money.invoice.issue, money.invoice.send, money.invoice.download, money.invoice.void |
| `/app/money/invoices/[id]` | money.invoice.create_edit, money.invoice.issue, money.invoice.send, money.invoice.download, money.invoice.void |
| `/app/money/payments` | money.payments.list, money.payment.detail, money.payment.match, money.payment.issue |
| `/app/money/payments/[id]` | money.payment.detail, money.payment.match, money.payment.issue |
| `/app/money/expenses` | money.expenses.list_archive, money.expense.create_edit, money.expense.receipt, money.expenses.export |
| `/app/connections` | settings.connections, settings.connection_capabilities |
| `/app/settings/profile` | settings.profile_public_services, settings.availability_defaults |
| `/app/settings/rules` | settings.rules |
| `/app/settings/preferences` | settings.preferences |
| `/app/settings/knowledge` | settings.knowledge |
| `/u/[handle]` | acq.public-entry |
| `/u/[handle]/services/[slug]` | acq.public-entry |
| `/inquiry/[id]` | buyer.conversation, buyer.sample-voice, buyer.invalid-link |
| `/buyer/[id]/offer` | acq.offer-amendment, buyer.offer-review, buyer.offer-change, buyer.offer-accept, buyer.invalid-link |
| `/buyer/[id]` | acq.offer-amendment, buyer.offer-review, buyer.offer-change, buyer.offer-accept, buyer.invalid-link, buyer.project-portal, buyer.deposit-request, buyer.payment-simulation, buyer.required-inputs, buyer.project-messages, buyer.project-files, buyer.delivery-review |
