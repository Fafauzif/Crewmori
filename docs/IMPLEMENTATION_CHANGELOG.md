# Crewmori 1.2.1 — experience and workflow changes

The release keeps the original six teammates, forest/ivory palette, Newsreader/Inter typography and Team Global Studio. It focuses on helping a user continue their work, understand what is happening and recover without losing their input.

## Friend update merged in 1.2.1

A bounded Google-provider settings preflight keeps explicitly disabled-provider recovery inside Crewmori. Known settings are cached for 60 seconds by project/key; failed or unknown settings defer to OAuth without caching an incorrect disabled state. Safe return destinations, the visible verification handoff and workspace completion remain intact. The controlled Supabase mock now supports the settings endpoint. Eight targeted regressions cover the merged behavior. See `FRIEND_MERGE.md`.

## Loading, navigation and recovery

The owner shell and provider persist across navigation. Public/auth/buyer/payment audiences use their own loading scope. Route-shaped skeletons replace repeated full-screen opening states when destination code has not loaded. Returning owners avoid a redundant workspace-creation request; genuinely missing workspaces retain an idempotent fallback.

Reads coalesce, cancel when abandoned, pause while hidden/offline and back off after failure. Unchanged projections are skipped. Confirmed saves return from their command receipt before a background state refresh completes. Saved-but-stale, expired-session and uncertain-write outcomes have explicit recovery. Owner writes stay bound to the account/workspace that rendered their form, and account changes remount private drafts. Expired-session drafts survive in the original tab while the user signs in separately and reconnects; they are not durable browser-wide drafts.

## Forms and interaction feedback

Shared forms own authored validation, linked field errors, error summaries and focus. Pending writes freeze relevant controls, prevent duplicate submission and block accidental modal dismissal. Confirmations await completion and retain inline failure feedback. Promise-aware buttons keep their dimensions. Dialog-aware toast placement makes feedback visible in the native top layer. Knowledge search remains editable while a read is pending, and replacing/clearing a query discards obsolete results.

Inputs use readable 16px text; touch controls, visible focus, scrollbars, sticky actions and reduced-motion behavior were strengthened. Long textareas grow to a bounded height before scrolling. Mobile navigation is a modal drawer with contained focus and a stable return target. Full assistive-technology and real-device testing remains open.

## Auth, tools, payments and external communication

Google sign-in and reconnect show branded progress, useful contrast and contextual cancellation/error recovery. Permission displays derive from actual granted scopes; disconnected tools explain their prerequisite. Payment return uses provider-confirmed status, stops on terminal states and offers a bounded/manual retry path. A checkout redirect never proves payment.

Replacing a buyer invitation requires an explicit revocation-aware confirmation. Existing invitation tokens can be recopied from memory without silently rotating them; tokens do not enter audit events. Buyer messages and public inquiries retain the exact pending payload/key on an uncertain retry. Successful uploaded attachments are reused after a later message failure. Public/buyer files use private download handling and constrained links, and buyer task visibility is explicitly projected.

## Business workflows and hierarchy

Dedicated task/milestone/file/calendar commands repair rejected generic saves. Milestone task assignment is atomic. Uploaded-file metadata, relation scope, versions and accepted-file immutability are checked on the server; generic edit paths cannot bypass these rules. Money expense/receipt requests use supported commands and preserve evidence on retry.

Home prioritizes the next supported action rather than repeating a large welcome block for returning workspaces. Team reports actual tasks, last activity and delayed-worker explanation without claiming a heartbeat. Empty artifact rails disappear. Search exposes its full result count and more results, clears immediately, and distinguishes empty/no-match states. Notification read state no longer generates self-notifications. Money distinguishes absent/search-filtered/archived data, omits meaningless single-page pagination and avoids mixing currencies into one misleading total. Service prices retain their intended major-unit display.

English/Bahasa chrome and new status/recovery copy were expanded. Authored business content remains the user's content. Exhaustive translation review is deferred.

## Design/context drift resolved

- Runtime palette, fonts and illustrations stay canonical; this is an evolution of Crewmori's existing identity.
- Shared `Form`, `Field`, `Button`, `Modal`, `Confirm` and `NotificationToast` own interaction contracts. Feature views supply domain intent and copy.
- Current connected context replaces outdated frontend-only instructions; historical master files remain under `context/history`.
- Package version is 1.2.1; persisted state schema stays 1.1.0. No new migration was introduced.
- Worker operations and provider readiness are documented as release checks, with no invented deployment or connection success.

See `UX_IMPLEMENTATION_STATUS.json` for every audit item and its limits, and `IMPLEMENTATION_VERIFICATION.md` for actual executed checks. Full-state transport, hosted performance profiling, exhaustive localization/accessibility and the unknown worker deployment remain explicit follow-up work.
