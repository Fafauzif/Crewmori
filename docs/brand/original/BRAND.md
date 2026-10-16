# Crewmori design implementation

Crewmori is a freelancer-owned AI business team. Six specialists support finding work, promotion, sales, client relationships, operations, and finance; the freelancer performs the commissioned professional work. The owner approves consequential actions. Do not imply that a prepared draft was sent, an offer was accepted, or money was received unless the corresponding acknowledged state exists.

This package develops the selected **02 Working Seam** direction. The stable mark represents coordinated work; expressive original coworkers provide personality around it. Preserve the warm editorial interface: ivory surfaces, forest actions, clear outputs, useful context, and readable controls. Stakeholder assessments in exploration were simulated perspectives, not validated user research.

## Source of truth

- `tokens/crewmori-tokens.json` holds exact design values. `tokens/crewmori-tokens.css` is the matching opt-in CSS implementation.
- `tokens/contrast-report.json` contains the calculated full pair matrix and approved semantic pairs. Threshold decisions use unrounded calculations; displayed ratios use six decimals.
- `assets/geometry.json` is authoritative for logo coordinates, clear space, placement, and minimum sizes. The token file mirrors its final values; use supplied artwork rather than redrawing it from these measurements.
- `source/build_tokens.py` rebuilds this document and token files with Python’s standard library, using package-relative paths and the geometry file.

## Logo geometry and placement

The symbol’s visible bounds are **84 × 76 raw units**, from `(8,12)` to `(92,88)`. Define **x = 22 raw units**, the vertical thickness of either horizontal band (`y12–34` or `y66–88`). Maintain at least **x clear space measured from visible artwork on every side**. Production SVG canvases already include this clear space; do not crop them to the visible paths.

The horizontal lockup has an **x gap** between symbol and wordmark. The wordmark’s cap height is **41.8 units**, exactly **55% of the 76-unit symbol height**. Preserve its optical alignment and outlined spacing. The stacked lockup has an **x vertical gap**. Do not retype the wordmark or independently scale, rotate, or move the two symbol pieces.

| Supplied export | Minimum digital full-canvas width | Minimum print full-canvas width |
|---|---:|---:|
| Horizontal | 200px | 45mm |
| Stacked | 160px | 35mm |
| Wordmark only | 150px | 30mm |
| Standard symbol canvas | 24px | 6mm |

These digital minima refer to the **entire exported canvas including clear space**, not the visible mark. Print minima are conservative implementation recommendations. The dedicated **compact browser favicon assets** waive normal x clear space inside browser icon slots at **all supplied sizes: 16, 24, 32, 48, and 64px**, with **16px as the minimum**. Their symbol path is unchanged; only the canvas is compact. Do not reuse this exception for application navigation or print.

The standard app tile is **128 × 128**, with **24-unit corners**, and symbol bounds **`(22,26)` to `(106,102)`**. Scale the tile proportionally and keep the symbol placement intact. Use the separately supplied compact favicon tile in browser slots; do not replace its padding with the standard app tile’s padding.

## Brand behavior and copy

Write as a capable coworker: concise, helpful, factual. Name the artifact, person, destination, version, or needed decision. Keep the owner’s agency visible. Avoid unsupported praise, fictional results, unexplained AI terminology, and claims of autonomous business success.

| Situation | Example interface copy — illustrative fixture |
|---|---|
| Draft ready | “Your proposal draft is ready to review.” |
| Owner decision | “Approve proposal v3 for Alex?” |
| Waiting for a fact | “What delivery date can you commit to?” |
| Handoff | “Scout shared the brief with Sales.” |
| Saved work | “Draft saved. You can return to it later.” |
| State conflict | “Scope changed. Review this version again.” |
| Connection recovery | “Reconnecting. Your saved work is still here.” |

Examples are copy fixtures, not product-event claims. Use “Resting” when a role has no task. “Working,” “Awaiting your approval,” “Paused,” and “Blocked” describe distinct acknowledged states. Buyer-facing experiences disclose the AI representative and show only an owner-approved public projection.

## Color rules

| Role | Exact color | Rule |
|---|---|---|
| Primary / forest | `#245C47` | Primary actions, key links, mark on light backgrounds |
| Canvas | `#F5F3EC` | Workspace background |
| Surface | `#FFFEFA` | Cards, forms, readable document areas |
| Ink | `#202A25` | Main text, icons, labels on pastel tints |
| Muted | `#566159` | Secondary text and required control boundaries |
| Decorative border | `#D9DED3` | Quiet card edges and dividers only |
| Selected surface | `#E5EFE7` | Selection with forest text and a second visible cue |
| On primary / reversed | `#FFFFFF` | Text or supplied reversed logo on forest |

Use one dominant forest action in each decision group. Keep large reading areas ivory. Do not recolor the core logo by agent role, add gradients, or create a general dark product theme from the reversed-logo examples.

| Primary interaction state | Background | Label |
|---|---|---|
| Default | `#245C47` | `#FFFFFF` |
| Hover | `#1B4B39` | `#FFFFFF` |
| Pressed | `#153F30` | `#FFFFFF` |
| Disabled | `#D9DED3` | `#566159` |
| Normal selected surface | `#E5EFE7` | `#245C47` |

Keep disabled values opaque instead of lowering the whole control’s opacity. Disabled controls do not react to hover or pressed styling. Selection is a navigation or choice state, not a semantic success signal.

### Agent identity is separate from status

| Role | Identity tint | Text |
|---|---|---|
| Scout | `#F2C983` apricot | Ink |
| Promoter | `#EFAF9B` coral | Ink |
| Sales | `#B9D8EC` sky | Ink |
| Account Manager | `#D3C6E7` lilac | Ink |
| Operations | `#C6D4B5` sage | Ink |
| Finance | `#B6D9C6` mint | Ink |

Use tints in coworker illustrations, role badges, and task ownership. Every identity cue includes the role name or an accessible label. A green Finance tint never means success; a coral Promoter tint never means error. Do not use white text on these tints.

| Status | Foreground | Background | Required label example — fixture |
|---|---|---|---|
| Success | `#1E6848` | `#EDF5EF` | Saved |
| Warning | `#80520B` | `#FFF1D6` | Needs your review |
| Error | `#9B3431` | `#FBE8E4` | Connection failed |
| Information | `#255F82` | `#E9F2F8` | Queued |

State text is always required. Add an icon or equivalent non-color cue when a semantic color treatment encodes state. Plain state text on a neutral surface is sufficient. Pair each status foreground with its corresponding background; do not substitute an agent tint.

### Contrast implementation

Internal targets are **4.5:1 for normal text** and **3:1 for required UI boundaries and focus indicators**. This is a local solid-color calculation, not a whole-product compliance claim.

| Approved pair | Calculated ratio |
|---|---:|
| Ink on canvas | 13.326114:1 |
| Ink on surface | 14.661401:1 |
| Muted on canvas | 5.820005:1 |
| White on forest | 7.786838:1 |
| White on hover forest | 9.942642:1 |
| White on pressed forest | 11.760959:1 |
| Muted on disabled background | 4.720105:1 |
| Forest on selected | 6.612178:1 |
| Success ink on success surface | 6.043093:1 |
| Warning ink on warning surface | 6.008818:1 |
| Error ink on error surface | 6.064597:1 |
| Info ink on info surface | 6.096684:1 |

The decorative border is only 1.356574:1 against surface and 1.233024:1 against canvas. It must not be the sole visible input boundary or focus indicator. Use muted for required control edges. Use a 2px forest focus outline, offset 2px, on light surfaces; use a 2px white outline on forest. Keep the offset area clear so the ring remains distinguishable. Recheck rendered pairs if transparency, imagery, or backgrounds change.

## Typography and licensing

Use **DejaVu Serif Regular** for editorial display headings and **DejaVu Sans Regular/Bold** for application text. The supplied logo wordmark is outlined from **DejaVu Serif Bold 2.37** and has no runtime font dependency. Do not recreate the logo by typing the name.

| Role | Family / weight | Size / line height |
|---|---|---|
| H1, above 768px | DejaVu Serif / 400 | 44 / 52px |
| H1, 768px and below | DejaVu Serif / 400 | 32 / 40px |
| H2 | DejaVu Serif / 400 | 32 / 40px |
| H3 | DejaVu Sans / 700 | 24 / 32px |
| Body | DejaVu Sans / 400 | 16 / 24px |
| Small | DejaVu Sans / 400 | 14 / 20px |
| Metadata | DejaVu Sans / 400 | 12 / 16px |

Display fallback: `"DejaVu Serif", Georgia, "Times New Roman", serif`. UI fallback: `"DejaVu Sans", Arial, system-ui, sans-serif`. Install or self-host the fonts for intended metrics; test wrapping when a fallback is used. Use tabular numerals and right alignment for amounts. Never reduce essential content below the metadata size; allow labels to wrap instead of truncating decision terms.

DejaVu fonts use the **Bitstream Vera font license**, with DejaVu changes in the public domain. Preserve the font copyright and license notice when distributing the fonts. The locally inspected license permits use and redistribution subject to its conditions; see `assets/fonts/LICENSE-DejaVu.txt`. Regular and bold files for both families are bundled in `assets/fonts`; the supplied CSS self-hosts them with relative URLs. Logo outlining removes the runtime dependency; it does not replace the font license notice for bundled fonts.

## Geometry, layout, and components

- Spacing scale: **4, 8, 12, 16, 24, 32, 48, 64px**. Use 16px between related controls, 24px between card groups, and 32px between desktop sections.
- Corners: **8px buttons and fields; 12px cards; 16px drawers**. Keep logo geometry unchanged when placed inside these containers.
- Elevation: flat by default. Only overlays use `0 8px 24px rgba(32,42,37,.10)`.
- Interactive targets and fields are at least **44px** high. Buttons are real buttons; links are real links. Supply labels, keyboard focus, and inline error text.
- At **1280px and above**: **224px sidebar**, **72px header**, **32px workspace padding**. From 769–1279px, workspace padding is 24px.
- The desktop artifact grid uses **`2fr 1fr` columns with a 24px content gutter**; it collapses to one column at **768px and below**.
- At **1024px and below**: collapse the context rail into a labeled open action; its content remains available in a drawer.
- At **768px and below**: one content column, 16px workspace padding, no persistent sidebar, and bottom navigation. The 390px fixture must show **Workspace, Clients, Team, Money**, with other routes under **More**.
- Bottom navigation reserves **64px plus safe-area inset**; reserve matching content space. At the **390px reference width**, Team is a two-column grid of all six roles. The inspector is a full-height sheet with a visible close action.
- Do not cause page-wide horizontal scrolling. Preserve drafts and selected business context during navigation.

Use a coherent outline icon family, clear silhouettes, rounded joins, and at least a readable 2px stroke at a 24px icon size. Icons supplement labels for ambiguous or consequential actions. Coworkers remain original illustrated characters with stable role colors and distinct silhouettes. They never replace the Crewmori mark or overlap its protected space. Keep character expression subordinate to terms, outputs, and owner decisions.

## Motion and activity

Use **160–240ms**, with **200ms** as the default, and `cubic-bezier(.2,0,0,1)`. Animate in response to persisted activity events; do not simulate progress or typing. Show at most **two task-linked cursors concurrently**, while all six coworkers remain accessible. Cursor labels name the role and action. If a target is missing or offscreen, show a labeled chip instead of moving the page unexpectedly.

With reduced motion, disable travel, looping expression, and decorative cursor animation. Retain static labeled focus, visible state changes, and useful outputs. Hide decorative cursors from assistive technology; announce meaningful updates through a polite live region. Replayed history restores current state without replaying every celebration.

## Applications and data fixtures

Use the supplied horizontal lockup in desktop headers and proposal/invoice headers at **200px or wider full canvas**; use the standard symbol variant in constrained navigation at **24px or larger canvas**. Use the dedicated compact browser favicon assets in all browser icon slots, with a 16px minimum; supplied 16–64px favicon assets all use the compact canvas. Use the standard supplied tile for app icons. Apply the minimum-size and clear-space rules above consistently. Use approved forest or monochrome artwork on light surfaces, and supplied reversed white artwork on forest. Never place a logo on a busy image without a clear solid field.

Connected-tool marks retain their official proportions and colors and sit in a separate “Connected tools” area. Do not merge them with Crewmori’s mark or imply a partnership from connection support alone. Social and presentation layouts can use broader pastel fields, but the core mark remains stable. Realistic example screens in the guide are **Example · Sample data**, not evidence of functioning integrations, live agents, or financial outcomes.

Required review fixtures: desktop and 390px mobile; empty, queued, working, waiting, blocked, disconnected, stale version, and recoverable error; long names, long currency values, keyboard focus, reduced motion, and fallback font wrapping. Review the owner decision journey and the separate public buyer projection. Token contrast checks do not substitute for these interaction checks.
