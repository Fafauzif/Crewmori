# Crewmori implementation verification playbook

Use this in the future implementation run, inside the user's single review-and-revision loop. It is original Crewmori guidance informed by the included upstream material. It is not a claim that any app has already been built or tested during pack preparation.

## Establish testable success

Read the final route/flow/control inventory and design/brand contracts. Keep an implementation completion matrix mapping each required route, action and state to code and verification evidence. Distinguish build checks, behavior checks, rendered inspection and subjective design assessment. No one type substitutes for the others.

Acceptance includes the complete scoped owner/buyer/public/onboarding/auth/settings surfaces; preservation of the first two visual anchors; editable normalized local records and deterministic curated agent tasks; honest simulated services; all specified transitions and recovery paths; responsive fallback; accessible keyboard/focus behavior; complete source/lockfile/assets/docs; and an updated master context plus developer brief. Use the project's detailed acceptance criteria for exact flows and values.

## Build and source checks

- Install with the lockfile's package manager; run the actual configured type, lint and production-build commands. Fix failures, then recheck affected areas.
- Confirm every imported dependency exists, local assets/fonts resolve, paths work on a case-sensitive filesystem, and the production start succeeds.
- Confirm there are no required secrets, real credentials, remote AI/payment/account dependencies, committed passwords or runtime dependency on the documentation bundle.
- Keep public assets intentional. Do not copy prompts, licensed skill text, raw research screenshots or business-private owner data into `public/` by accident.
- Check the deployable root and README against the actual app scripts. Packaging source code is not proof of a completed Vercel deployment.

## Behavior checks

Exercise representative complete journeys using the rendered app and the canonical shared store. Verify the final flow matrix, including branches, rather than only clicking one success button per route.

- Open Home, Team, Offers and Work references to the same object and confirm they use its canonical ID/state.
- Edit/cancel/save drafts, validate required fields, preserve entered text on failure and recover without duplicate commands.
- Verify approval is version-specific; editing invalidates approval; sharing is separate; buyer acceptance is blocked for stale, expired, withdrawn or superseded versions.
- Verify accepted-offer side effects happen once: project, provisional reservation and deposit request. Later deposit/input/timing transitions must follow the explicit project rules.
- Verify receipt mismatch handling, USD gross/fee/net arithmetic, IDR estimates and outstanding balance. Sample receipt confirmation comes only from the deliberate simulation action.
- Verify combined search/filter/sort/selection behavior and clear/reset paths. Empty results should not masquerade as no records.
- Verify cancel, pause, retry, reconnect, not-found/invalid ID, unsaved navigation, browser refresh and Back/Forward. Deliberate scenario reset must not silently destroy edited work.
- Test actual file downloads and their contents, not only the toast label. Test uploads as specified local metadata/file simulations and their limits.
- Verify public/buyer projections never show owner-only margin, draft reasoning, approval controls or private notes. Local role simulation must be documented as conceptual, not production authorization.
- Verify unknown team requests get the defined clarification/manual-draft path, not fabricated unrestricted AI completion.

Use browser role/name locators and auto-retrying assertions for observable app outcomes. Await app-specific ready conditions or expected UI, not arbitrary sleeps. Do not use global network silence as proof that an animated app, local state or request has completed. Official Playwright references: https://playwright.dev/docs/test-assertions and https://playwright.dev/docs/best-practices . Use the environment's permitted browser/test tools rather than inventing an unavailable skill CLI.

## Rendered review

Inspect Home and Team against their actual anchor PNGs first. Then inspect representative list, editor, detail, public, buyer, settings and error states using shared components. Review the output at desktop, a narrower laptop/tablet width and 390 px. Include long names, long labels, multi-line copy, sparse/empty records and core Bahasa Indonesia flows.

Check typography, panel geometry, spacing, consistent sidebar/header, semantic color use, role accents and supplied characters. Check that simplification did not hide the primary action and that dense detail remains behind intentional disclosure. At narrow widths verify no clipped forms/actions, unusable miniaturized studio, accidental horizontal scrolling or overlapping navigation. Use an accessible simplified Team alternative when the wide scene cannot fit.

Motion must correspond to actual task transitions, keep teammate positions stable, use at most two task-linked cursors, preserve control access, support pause and honor reduced motion. Inspect a resting state as well as the active state; the app should remain readable when no agent is moving.

## Accessibility checks

Use semantic elements and accessible names; inspect keyboard-only journeys, focus visibility/return/traps, inline validation announcements, dialog behavior and tab order. Verify status labels do not depend on color alone. Check contrast for the actual semantic foreground/background pair, including muted text, fields, focus and disabled states. Automated scans are useful but do not certify complete accessibility; report their actual scope and add manual checks.

## Review and revision

Use the user's requested dimensions: task fulfillment, correctness, completeness, clarity/usability, and presentation/execution quality. Anchor every internal score in observed strengths and defects. Fix unmet requirements, broken state/flows, privacy projection leaks and build failures before substantive usability or visual polish.

Use a real independent critic when available; otherwise perform a distinct self-review. Recheck changed areas and likely regressions. Repeat for no more than four rounds; stop only when every applicable dimension is at least 8.5 and no known critical error or unmet explicit requirement remains, or after the four-round limit with an honest material limitation disclosure. Never change a score merely to satisfy the threshold.

Keep scores and critique exchanges out of the delivered product and ordinary handoff narrative. Retain an honest verification record with commands actually run, test outcomes, reviewed states/widths, remaining gaps and relevant artifacts. Update the master context, developer brief and interfaces to match the actual implemented source before packaging.
