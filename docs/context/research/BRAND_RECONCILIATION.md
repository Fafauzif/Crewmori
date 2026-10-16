# Crewmori brand-to-product reconciliation

Status: planning audit, 16 October 2026. This is an explicit implementation overlay, not an edit to the uploaded brand package. No frontend has been built and no uploaded source script was executed.

## Reviewed inputs and evidence

- Uploaded `Crewmori_Complete_Brand_Package(1).zip`, safely extracted to `reference-review/brand/package/Crewmori_Brand_Package/` (75 files; 19 SVG, 30 PNG, 4 TTF).
- Read `BRAND.md`, package README, asset README/index, illustration-study README, JSON/CSS tokens, geometry and manifest.
- Verified the 74 files covered by its manifest: every byte count and SHA-256 matches. `MANIFEST.json` itself is the 75th file.
- Read the separately uploaded 40-page PDF; rendered all pages and visually inspected the page contact sheets, including logo construction, palette, type, character studies, Home/Team application studies and document examples.
- The standalone PDF differs in binary hash from the PDF inside the package, but their complete extracted layout text is identical. Preserve the user-supplied originals as inputs; use the token JSON/geometry for exact machine values.
- Compared the actual first two Stitch PNGs and their HTML: `crewmori_magazine_editorial_warmth_desktop` and `crewmori_team_overview_global_studio`.

## Authority by dimension

The latest user steering makes the first two Stitch images the main product references; later screens follow those plus curated Shopify/Contra interaction references. The new brand package supplies the palette, mark, logo variants and identity rules. Resolve conflicts explicitly:

| Dimension | Authority | Implementation consequence |
|---|---|---|
| Product composition, editorial atmosphere, generous spacing, large rounded panels, teammate presence | First two approved Stitch screens | Preserve Home briefing hierarchy, large Scout portrait area, Team's Global Studio map, six stable teammate positions, curved handoffs and owner decision area. Refine broken wrapping/collisions rather than copying them. |
| Exact brand palette, role tints, functional status pairs | New brand JSON | Apply the exact values below across all routes. Do not sample pixels from PDFs or screenshots. |
| Logo artwork and protected geometry | New supplied SVG/PNG and `assets/geometry.json` | Replace old remote/duplicated wordmarks with supplied Working Seam lockups. No retyping or redrawing. |
| Application typography | Explicit product overlay retaining approved anchors | Newsreader for editorial titles and selected italic context; Inter for readable body, controls and metadata. The original brand package specifies DejaVu Serif/Sans as primary application fonts; do not misdescribe those as merely bundled fallbacks. They are consciously overridden for this frontend, not changed in the originals. |
| Application card shapes | Explicit product overlay retaining approved anchors | Preserve approximately 24px major panel corners, 16px nested sections, appropriately rounded buttons/chips. Do not globally impose the brand kit's 12px cards and 8px buttons if this flattens the approved aesthetic. Keep one documented scale rather than arbitrary radii. |
| Main navigation and entity ownership | Agreed product specification | Home / Team / Opportunities / Work / Money. Clients belong within Work. Brand application studies showing Workspace / Opportunities / Clients / Team / Money are illustrative and superseded. |
| Forms, lists, selection, progressive disclosure and AI conversation patterns | Curated Shopify/Contra screenshots | Borrow patterns only after mapping them to a concrete Crewmori flow. They do not override Crewmori identity or expand scope automatically. |
| Commercial states, fixture data and permissions | Canonical data and interaction contracts | Do not copy contradictory copy, bogus success claims, scores or financial outcomes from any mockup. |

Preserve uploaded brand originals untouched. Add this overlay to the future master pack and maintain it alongside the active product `DESIGN.md`. A future implementation agent must not import the supplied brand CSS wholesale and accidentally replace Newsreader/Inter, corner values or navigation with brand-study defaults.

## Exact color-to-UI mapping

| Token | Value | UI use |
|---|---|---|
| Forest | `#245C47` | Primary action, key link, selected text, main logo on light surfaces. One dominant action per decision group. |
| Hover forest | `#1B4B39` | Enabled primary-button hover. |
| Pressed forest | `#153F30` | Enabled primary-button pressed state. |
| Canvas / ivory | `#F5F3EC` | Main workspace and large quiet background areas. Replaces Home's older `#F7F5EE`. |
| Surface / paper | `#FFFEFA` | Cards, fields, drawers, document-reading areas. |
| Ink | `#202A25` | Main text and icons; all text on role tints. |
| Muted | `#566159` | Supporting text; required form-control boundaries. |
| Decorative border | `#D9DED3` | Quiet separators/card edges only. |
| Selected surface | `#E5EFE7` | Navigation/choice selection with a second cue such as weight, position, icon or marker. |
| On forest | `#FFFFFF` | Primary labels; supplied reversed-white mark. |
| Disabled background / text | `#D9DED3` / `#566159` | Opaque disabled controls; no hover/pressed reaction. |

Role identity belongs to the coworker, not to success/error or an entire product domain:

| Role | Tint | Recommended use |
|---|---|---|
| Scout | `#F2C983` | Lens character, owner badges, small task attribution. |
| Promoter | `#EFAF9B` | Star character, promotion ownership. |
| Sales | `#B9D8EC` | Sales specialist and conversation ownership. |
| Account Manager | `#D3C6E7` | Client-relationship ownership. |
| Operations | `#C6D4B5` | Capacity/schedule ownership. |
| Finance | `#B6D9C6` | Payment-record ownership. |

Each role cue includes a visible name or accessible label. Use the full tint for small character/badge regions; keep reading areas ivory. Subtle derived tints may be used only if defined centrally and rechecked. Do not make every Money panel mint or every client page lilac.

| State | Foreground | Background |
|---|---|---|
| Success | `#1E6848` | `#EDF5EF` |
| Warning / review | `#80520B` | `#FFF1D6` |
| Error | `#9B3431` | `#FBE8E4` |
| Information | `#255F82` | `#E9F2F8` |

Write the state in words. When semantic color carries meaning, add a non-color cue. A Finance mint circle is not evidence that money arrived. Promoter coral is not an error.

## Contrast checks and constraints

Independently recalculated using sRGB relative luminance for solid colors:

| Pair | Ratio |
|---|---:|
| Ink on canvas | 13.326114:1 |
| Muted on canvas | 5.820005:1 |
| White on forest | 7.786838:1 |
| Forest on selected | 6.612178:1 |
| Decorative border on surface | 1.356574:1 |
| Decorative border on canvas | 1.233024:1 |
| Muted control border on surface | 6.403174:1 |

Ink on the six role tints ranges from 7.94:1 to 9.93:1. White on them is only approximately 1.49:1 to 1.86:1: do not use white labels on agent tints. The light decorative border cannot be the sole input boundary or focus indicator. Use a 2px forest focus ring with a 2px offset on light surfaces, or white on forest; verify actual rendered backgrounds, overflow and adjacency. These are token checks, not a whole-app accessibility certification.

## Typography and font handling

- Product overlay: self-host or reliably bundle Newsreader and Inter in the eventual source app; preserve their respective distribution licenses. The current brand ZIP does not include these fonts. Do not rely on runtime Google Fonts access as the only production path.
- Use Newsreader Regular/Medium for editorial headings, with italic used sparingly. Body and consequential terms remain upright Inter. Retain the approved scale and hierarchy while fixing screenshot wrapping defects. Functional section labels and UI controls can use Inter 500/600; a third family is not required merely because Manrope was imported by Stitch.
- Original brand package: DejaVu Serif Regular display, DejaVu Sans Regular/Bold UI; four TTF files are present and licensed. Preserve their license and original guide for the developer. Do not silently rename or swap the originals.
- The supplied Working Seam wordmark was outlined from DejaVu Serif Bold 2.37. That is a separate fixed logo asset, so Newsreader application headings do not require changing the logo or installing DejaVu at runtime.
- Actual inspected primary and stacked SVGs have two paths and no `<text>` elements; the standalone wordmark has one path and no `<text>` elements. No logo text rendering depends on the page font.

## Logo placement and selected asset set

Use these originals in the future pack and copy the needed production subset into the eventual app:

- `assets/primary/crewmori-primary-green.svg`: main horizontal identity on light product/public pages and documents.
- `assets/primary/crewmori-primary-white.svg`: reversed identity on approved solid forest fields.
- `assets/primary/crewmori-primary-black.svg`: monochrome export/print use when required.
- `assets/symbol/crewmori-symbol-green.svg`: constrained navigation, minimum 24px full canvas.
- `assets/stacked/*` and `assets/wordmark/*`: retain as brand assets, use only where composition calls for them. `horizontal/*` duplicates `primary/*`; no need duplicate both in app public assets.
- `assets/favicon/favicon.ico`, SVG and native 16/24/32/48/64 PNGs: browser slots.
- `assets/app-icon/crewmori-app-icon.svg` and 192/512 PNGs: app identity/manifest if needed; these are not an adaptive/maskable icon specification.
- `assets/geometry.json`, token JSON/CSS, contrast report and relevant notices: preserve in the handoff.

Logo geometry is not an app theme knob. Visible symbol is 84x76 raw units; x is 22 units. Production canvases already contain x clear space. Preserve the seam and the two bands' relationship. Minimum full-canvas widths: horizontal 200px, stacked 160px, wordmark 150px; standard symbol 24px. Browser-only compact favicon canvases waive x at all supplied 16-64px slots; this exception does not apply to sidebar icons. Do not use `crewmori-symbol-raw.svg` as placement-ready artwork.

A practical shell issue: 224px sidebar minus 16px padding on both sides leaves only 192px, less than the logo's 200px horizontal minimum. Give the brand row 12px side padding (200px available), or put the full lockup in the header and a standard symbol in constrained navigation. Never shrink the primary logo below its minimum to satisfy a generic padding rule. Do not add a duplicate typed “Crewmori” beside an already complete lockup, as the Stitch Team source did.

Connected-tool marks stay separate from Crewmori. State “Demo connection” or another accurate prototype label until a corresponding simulated/real state exists. Connection support alone does not imply a partnership.

## Coworkers and motion

The package's transparent `assets/illustration-studies/six-coworkers-direction-study.png` is a **direction study**, explicitly not approved production character artwork, a vector master, or a sprite sheet. Its provenance note makes this distinction clear. Do not automatically replace the first two screens' illustrated characters with crops from that study. Reuse/extract the approved Stitch inline SVG characters as the initial component source, recoloring using exact role tokens and preserving recognizable silhouettes. The new study may inform refinement, subject to the visual-anchor comparison.

Keep the main logo stable. Teammates occupy the work area and never enter its protected space or cover terms. Team remains the rich Global Studio experience, rather than being replaced by the brand PDF's basic six-card application study. Every specialist remains accessible; inactive roles say “Resting.” Stable positions and clear labels matter more than arbitrary movement.

Adopt compatible brand motion rules: 160-240ms transitions, default 200ms, `cubic-bezier(.2,0,0,1)`, at most two task-linked cursors concurrently. In this frontend, cursors may respond to acknowledged persisted **demo** events; their context must disclose simulation. No random idle typing or looping fake progress. Reduced motion removes travel and loops while retaining labels, static state and outputs. Replay history must not retrigger every animation or duplicate business effects.

## What not to carry over

- Do not import brand PDF Home/Team application studies as replacements for the approved Stitch composition. Their role is showing identity application, not prescribing a new product layout.
- Do not resurrect the old `quiet_workbench/DESIGN.md` or the 14 drifted Stitch screens as style authority.
- Do not copy anchor collisions, poorly wrapped controls, duplicated marks, fixed-width errors or incorrect offer/economics copy. Preserve visual intent and correct defects.
- Do not run the brand package's source scripts as part of the app build. The guideline builder depends on a Codex artifact runtime; the working SVG/PNG/tokens are already supplied. Keep source in the handoff as provenance/editing material, outside the app production build.
- No separate dark product theme follows from reversed-logo examples. Reading areas remain light.

## Checks for the future implementation run

Compare completed Home and Team screenshots directly against the first two approved references before expanding the remaining pages. Confirm the new palette/mark, retained Newsreader/Inter hierarchy and large panel geometry together. Include keyboard focus, long labels/currencies, compact widths and reduced motion. Test controls and state changes separately from visual similarity. Update the active master context pack with the actual product overrides, implemented font files, asset paths, real fixture states and any deliberate deviation.
