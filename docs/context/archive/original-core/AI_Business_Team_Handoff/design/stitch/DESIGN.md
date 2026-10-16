# Principal design system

## Intent

A warm, expressive business workspace for an independent professional and their AI team. The interface balances readable business information with six original cute characters. This is a custom visual proposal, not an existing Principal brand system.

Prioritize: meaningful agent presence, clear artifact hierarchy, obvious owner decisions, readable commercial terms and consistent navigation.

## Color tokens

| Token | Value | Use |
|---|---|---|
| canvas | #F5F3EC | Main app background |
| surface | #FFFEFA | Cards and panels |
| surface-muted | #ECEAE1 | Subtle grouped regions |
| text | #202A25 | Main copy and titles |
| text-secondary | #566159 | Supporting text |
| border | #D9DED3 | Panel separators and input boundaries |
| primary | #245C47 | Main action, selected navigation |
| on-primary | #FFFFFF | Primary button text |
| primary-soft | #E5EFE7 | Selected backgrounds |
| warning-text | #80520B | Warning labels |
| warning-bg | #FFF1D6 | Conditions needing attention |
| error-text | #9B3431 | Blocked/error text |
| error-bg | #FBE8E4 | Blocked/error surfaces |
| focus | #245C47 | Visible keyboard focus |

Use role tints from the agent file as small accents with dark text. Role color identifies an agent; a separate text label communicates state. Do not use a pastel color as low-contrast body text. Verify actual rendered foreground/background contrast.

## Type

- Display/page titles: Manrope, 600–700; 28–32px desktop, 24px mobile.
- Section titles: Manrope 600, 18–20px.
- Body: Inter 400/500, 15–16px, line height about 1.5.
- Labels and status: Inter 500, 13–14px.
- Small metadata: 12px minimum; keep important information larger.
- Currency and dates: tabular numerals, aligned consistently.
- Fallback: system sans-serif. Fonts are suggestions, not an integration dependency.

Keep copy concrete. Use “Draft ready”, “Awaiting your approval”, “2 assets · 5 business days” and “Receipt checked”. Avoid vague AI claims and promotional text inside work panels.

## Desktop composition

- Reference frame: 1440 × 1000.
- Left sidebar: approximately 208px.
- Header: approximately 68px.
- Main workspace padding: 24px; gaps 16–24px.
- Canvas has two useful artifact columns when space permits.
- Optional context rail: about 280px, with a compact approval queue.
- Persistent team dock: approximately 96–116px tall, six visible agent cards. Reserve layout space so it does not cover content.
- Reusable selected-agent inspector: right drawer around 360–400px wide; replace or overlay the context rail appropriately.

The initial viewport must show the delegation field, two working artifacts, one owner decision and all six specialists. Keep secondary history below the primary work. The page can scroll vertically.

## Components

- Cards: 16–20px radius, 1px border, restrained soft shadow only where elevation clarifies interaction.
- Buttons: 10–12px radius, 44px minimum primary touch target. One dominant action per decision group.
- Fields: visible label; 44–48px minimum height; clear focus and error states.
- Status badges: restrained tinted fill, short text and optional icon.
- Artifact headers: title, responsible agent, status, source and clear open/review action.
- Agent cards: original character, full role label, current state, one short task line.
- Cursor labels: small pointer plus role name; readable on the artifact background.
- Timeline: aligned event rows with actor, action, outcome and timestamp. No terminal styling.
- Amount breakdown: aligned rows for gross, fee, net and remaining balance.

Use a consistent simple outline icon set for navigation. Reserve the custom characters for agents. Do not substitute emoji, stock robot heads or random profile photos for the team.

## Character style

Create six characters from a shared visual family: rounded compact silhouettes, dark expressive eyes, small limbs or simple geometric accessories. Differentiate by silhouette as well as color. Keep flat/vector-like shading with a gentle dimensional highlight, not photorealistic 3D. Use 48–64px illustrations in the dock and 96px in the inspector.

Characters should work on light backgrounds and remain recognizable at small sizes. Never place large decorative mascots over money, approvals or source text. Agent personality comes from expressions, subtle motion and useful work.

## Responsive behavior

- At 1024px, collapse the context rail and use the inspector on demand.
- At 768px, stack work artifacts and use a compact navigation rail.
- At 390px, use a top header and bottom navigation with Workspace, Clients, Team and Money; put other routes in More.
- Mobile team view uses a two-column grid with all six agents. Do not shrink six desktop cards into an unreadable row.
- Provide explicit tap actions instead of hover-only controls. No page-wide horizontal scrolling.

## Motion and access

Use 160–240ms transitions for opening panels and state changes. Cursors can travel only between relevant artifact locations. Working characters can gently blink or lean; waiting characters rest. No constant bouncing or decorative loops that compete with the task.

Respect reduced motion by showing final cursor positions and static activity labels. Keep logical keyboard order, visible focus, readable contrast and text descriptions for character/state controls. Announce simulated task updates politely if an interactive prototype supports accessible live regions.

## Visual guardrails

Keep research statistics, architecture diagrams, model names and API configuration out of product screens. Show business decisions and source evidence. Use charts only if they answer a real question with actual fixture data. The desired exploration is an app workspace, not a marketing site or investor presentation.
