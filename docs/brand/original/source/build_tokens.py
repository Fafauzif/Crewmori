from pathlib import Path
from itertools import combinations
import json

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent if SCRIPT_DIR.name == 'source' else SCRIPT_DIR.parent / 'output' / 'crewmori-brand'
GEOMETRY = json.loads((ROOT / 'assets' / 'geometry.json').read_text())
TOKENS = ROOT / 'tokens'
TOKENS.mkdir(parents=True, exist_ok=True)

colors = {
    'forest': '#245C47', 'canvas': '#F5F3EC', 'surface': '#FFFEFA',
    'primary-hover': '#1B4B39', 'primary-pressed': '#153F30',
    'ink': '#202A25', 'muted': '#566159', 'border': '#D9DED3',
    'selected': '#E5EFE7', 'white': '#FFFFFF',
    'agent-scout': '#F2C983', 'agent-promoter': '#EFAF9B',
    'agent-sales': '#B9D8EC', 'agent-account': '#D3C6E7',
    'agent-operations': '#C6D4B5', 'agent-finance': '#B6D9C6',
    'success-ink': '#1E6848', 'success-surface': '#EDF5EF',
    'warning-ink': '#80520B', 'warning-surface': '#FFF1D6',
    'error-ink': '#9B3431', 'error-surface': '#FBE8E4',
    'info-ink': '#255F82', 'info-surface': '#E9F2F8',
}

def luminance(hex_color):
    rgb = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4) for c in rgb]
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]

def contrast(a, b):
    la, lb = sorted((luminance(colors[a]), luminance(colors[b])), reverse=True)
    return (la + .05) / (lb + .05)

approved_specs = [
    ('body-on-canvas', 'ink', 'canvas', 'normal-text', 4.5),
    ('body-on-surface', 'ink', 'surface', 'normal-text', 4.5),
    ('secondary-on-canvas', 'muted', 'canvas', 'normal-text', 4.5),
    ('secondary-on-surface', 'muted', 'surface', 'normal-text', 4.5),
    ('primary-button-label', 'white', 'forest', 'normal-text', 4.5),
    ('primary-hover-label', 'white', 'primary-hover', 'normal-text', 4.5),
    ('primary-pressed-label', 'white', 'primary-pressed', 'normal-text', 4.5),
    ('disabled-label', 'muted', 'border', 'normal-text', 4.5),
    ('primary-link-on-canvas', 'forest', 'canvas', 'normal-text', 4.5),
    ('primary-link-on-surface', 'forest', 'surface', 'normal-text', 4.5),
    ('selected-label', 'forest', 'selected', 'normal-text', 4.5),
    ('focus-on-canvas', 'forest', 'canvas', 'ui-focus', 3),
    ('focus-on-surface', 'forest', 'surface', 'ui-focus', 3),
    ('focus-on-dark', 'white', 'forest', 'ui-focus', 3),
    ('control-boundary-on-surface', 'muted', 'surface', 'ui-focus', 3),
    ('control-boundary-on-canvas', 'muted', 'canvas', 'ui-focus', 3),
]
for status in ('success', 'warning', 'error', 'info'):
    approved_specs.append((f'{status}-label', f'{status}-ink', f'{status}-surface', 'normal-text', 4.5))
for agent in ('scout', 'promoter', 'sales', 'account', 'operations', 'finance'):
    approved_specs.append((f'{agent}-label', 'ink', f'agent-{agent}', 'normal-text', 4.5))

approved = [
    dict(name=name, foreground=fg, background=bg, role=role, target=target,
         ratio=round(contrast(fg, bg), 6), passes=contrast(fg, bg) >= target)
    for name, fg, bg, role, target in approved_specs
]
assert all(pair['passes'] for pair in approved)

report = {
    'title': 'Crewmori internal color contrast calculation',
    'scope': 'Solid, opaque sRGB color pairs only; final rendered interfaces require a separate review.',
    'method': {
        'channelNormalization': '8-bit sRGB / 255',
        'linearization': 'c / 12.92 for c <= 0.04045; ((c + 0.055) / 1.055)^2.4 otherwise',
        'relativeLuminance': '0.2126 R + 0.7152 G + 0.0722 B',
        'ratio': '(lighter luminance + 0.05) / (darker luminance + 0.05)',
        'displayPrecision': '6 decimal places; pass/fail uses unrounded calculated values',
    },
    'internalTargets': {'normalText': 4.5, 'requiredUiBoundaryAndFocus': 3},
    'colors': colors,
    'relativeLuminance': {key: round(luminance(value), 12) for key, value in colors.items()},
    'approvedPairs': approved,
    'fullPairMatrix': {a: {b: round(contrast(a, b), 6) for b in colors} for a in colors},
    'restrictedPairs': [
        {'foreground': 'border', 'background': 'surface', 'ratio': round(contrast('border', 'surface'), 6),
         'rule': 'Decorative dividers and card edges only. Do not use for a required input boundary, icon, or focus indicator.'},
        {'foreground': 'border', 'background': 'canvas', 'ratio': round(contrast('border', 'canvas'), 6),
         'rule': 'Decorative dividers and card edges only. Use muted for required control boundaries.'},
        {'foreground': 'white', 'background': 'agent-*',
         'rule': 'Never use white text on agent tints. Use ink and a visible role name.'},
    ],
    'limitations': [
        'This calculation does not establish whole-product accessibility compliance.',
        'Opacity, imagery, gradients, antialiasing, disabled treatments, adjacent colors, and dynamic states can change practical visibility.',
        'Pair colors are semantic rules, not permission to use any matrix combination that happens to pass.',
    ],
}

tokens = {
    'name': 'Crewmori', 'version': '1.0.0', 'selectedConcept': '02 Working Seam',
    'status': 'Final package tokens; authoritative logo measurements mirror assets/geometry.json.',
    'color': {
        'brand': {'primary': colors['forest'], 'onPrimary': colors['white']},
        'interaction': {
            'primary': {'defaultBg': colors['forest'], 'hoverBg': colors['primary-hover'], 'pressedBg': colors['primary-pressed'], 'label': colors['white'], 'disabledBg': colors['border'], 'disabledText': colors['muted']},
            'selectedBg': colors['selected'],
        },
        'background': {'canvas': colors['canvas'], 'surface': colors['surface'], 'selected': colors['selected']},
        'text': {'primary': colors['ink'], 'secondary': colors['muted'], 'onDark': colors['white']},
        'border': {'decorative': colors['border'], 'control': colors['muted']},
        'agentIdentity': {
            'scout': {'name': 'Scout', 'tint': colors['agent-scout'], 'label': colors['ink']},
            'promoter': {'name': 'Promoter', 'tint': colors['agent-promoter'], 'label': colors['ink']},
            'sales': {'name': 'Sales', 'tint': colors['agent-sales'], 'label': colors['ink']},
            'accountManager': {'name': 'Account Manager', 'tint': colors['agent-account'], 'label': colors['ink']},
            'operations': {'name': 'Operations', 'tint': colors['agent-operations'], 'label': colors['ink']},
            'finance': {'name': 'Finance', 'tint': colors['agent-finance'], 'label': colors['ink']},
        },
        'status': {s: {'foreground': colors[f'{s}-ink'], 'background': colors[f'{s}-surface']} for s in ('success', 'warning', 'error', 'info')},
    },
    'typography': {
        'displayFamily': ['DejaVu Serif', 'Georgia', 'Times New Roman', 'serif'],
        'uiFamily': ['DejaVu Sans', 'Arial', 'system-ui', 'sans-serif'],
        'fontLicense': 'Bitstream Vera font license; DejaVu changes are in the public domain. Preserve the accompanying font license notice when distributing the fonts.',
        'logoWordmark': {'source': 'DejaVu Serif Bold', 'version': '2.37', 'construction': 'Outlined paths', 'runtimeFontDependency': False},
        'applicationFontDependency': 'Install or self-host the licensed DejaVu fonts; defined fallback stacks apply when they are unavailable.',
        'scale': {
            'h1': {'family': 'display', 'sizePx': 44, 'lineHeightPx': 52, 'weight': 400},
            'h2': {'family': 'display', 'sizePx': 32, 'lineHeightPx': 40, 'weight': 400},
            'h3': {'family': 'ui', 'sizePx': 24, 'lineHeightPx': 32, 'weight': 700},
            'body': {'family': 'ui', 'sizePx': 16, 'lineHeightPx': 24, 'weight': 400},
            'small': {'family': 'ui', 'sizePx': 14, 'lineHeightPx': 20, 'weight': 400},
            'metadata': {'family': 'ui', 'sizePx': 12, 'lineHeightPx': 16, 'weight': 400},
        },
        'responsiveOverrides': {'maxWidthPx': 768, 'h1': {'family': 'display', 'sizePx': 32, 'lineHeightPx': 40, 'weight': 400}},
        'amounts': {'fontVariantNumeric': 'tabular-nums', 'alignment': 'right'},
    },
    'spacePx': [4, 8, 12, 16, 24, 32, 48, 64],
    'radiusPx': {'button': 8, 'field': 8, 'card': 12, 'drawer': 16},
    'elevation': {'default': 'none', 'overlay': '0 8px 24px rgba(32, 42, 37, 0.10)'},
    'layout': {
        'desktopMinWidthPx': 1280, 'sidebarWidthPx': 224, 'headerHeightPx': 72,
        'desktopContentGrid': '2fr 1fr', 'contentGutterPx': 24,
        'desktopWorkspacePaddingPx': 32, 'compactWorkspacePaddingPx': 24, 'mobileWorkspacePaddingPx': 16,
        'contextRailCollapseMaxWidthPx': 1024, 'singleColumnMaxWidthPx': 768,
        'bottomNavigationMaxWidthPx': 768, 'compactMobileReferenceWidthPx': 390,
        'bottomNavigationHeightPx': 64, 'safeAreaInsetRequired': True,
        'minimumInteractiveTargetPx': 44, 'minimumFieldHeightPx': 44,
    },
    'motion': {
        'durationFastMs': 160, 'durationStandardMs': 200, 'durationSlowMs': 240,
        'easing': 'cubic-bezier(0.2, 0, 0, 1)', 'maximumConcurrentCursors': 2,
        'trigger': 'Persisted task, artifact, handoff, or acknowledged state events only',
        'reducedMotion': 'No travel, looping expression, or cursor animation; retain static labeled focus and state changes.',
    },
    'focus': {'widthPx': 2, 'offsetPx': 2, 'onLight': colors['forest'], 'onDark': colors['white']},
    'logoMeasurements': {
        'status': 'Final; use supplied artwork rather than reconstructing from token values.',
        'source': '../assets/geometry.json',
        'coordinateSystem': GEOMETRY['coordinate_system'],
        'rawPath': GEOMETRY['raw_path'],
        'rawBounds': GEOMETRY['raw_bounds'],
        'visibleWidth': GEOMETRY['visible_symbol_width'],
        'visibleHeight': GEOMETRY['visible_symbol_height'],
        'unitX': GEOMETRY['unit_x'],
        'xDefinition': GEOMETRY['x_definition'],
        'clearSpace': {'minimumRawUnits': GEOMETRY['unit_x'], 'measuredFrom': 'Visible artwork on all sides', 'includedInProductionSvgCanvases': True},
        'horizontalGap': GEOMETRY['horizontal']['symbol_wordmark_gap'],
        'stackedGap': GEOMETRY['stacked']['symbol_wordmark_vertical_gap'],
        'wordmarkCapHeight': GEOMETRY['wordmark']['cap_height'],
        'wordmarkCapToSymbolHeight': GEOMETRY['horizontal']['cap_to_symbol_height'],
        'horizontal': GEOMETRY['horizontal'],
        'stacked': GEOMETRY['stacked'],
        'wordmarkOnly': GEOMETRY['wordmark_only'],
        'symbol': GEOMETRY['symbol'],
        'appIcon': GEOMETRY['app_icon'],
        'favicon': GEOMETRY['favicon'],
        'browserFaviconUsage': {'minimumSlotPx': 16, 'suppliedSlotsPx': [16, 24, 32, 48, 64], 'canvas': 'Dedicated compact browser favicon canvas at every supplied slot size', 'pathChanged': False, 'clearSpaceException': 'Normal x clear space is waived only for these dedicated browser favicon assets, at all supplied sizes; it is not waived for application navigation or print.'},
        'minimumSizes': GEOMETRY['minimum_sizes'],
    },
    'contrast': {'report': 'contrast-report.json', 'normalTextTarget': 4.5, 'requiredUiBoundaryAndFocusTarget': 3},
}

css = '''/* Crewmori 1.0 — Working Seam identity application tokens.
   Values mirror crewmori-tokens.json. Logo artwork uses outlined paths.
   Font paths resolve to the bundled assets directory; preserve its license notice. */
@font-face { font-family: "DejaVu Serif"; src: url("../assets/fonts/DejaVuSerif.ttf") format("truetype"); font-style: normal; font-weight: 400; font-display: swap; }
@font-face { font-family: "DejaVu Serif"; src: url("../assets/fonts/DejaVuSerif-Bold.ttf") format("truetype"); font-style: normal; font-weight: 700; font-display: swap; }
@font-face { font-family: "DejaVu Sans"; src: url("../assets/fonts/DejaVuSans.ttf") format("truetype"); font-style: normal; font-weight: 400; font-display: swap; }
@font-face { font-family: "DejaVu Sans"; src: url("../assets/fonts/DejaVuSans-Bold.ttf") format("truetype"); font-style: normal; font-weight: 700; font-display: swap; }
:root {
  --cm-forest: #245C47;
  --cm-primary-hover: #1B4B39;
  --cm-primary-pressed: #153F30;
  --cm-disabled-bg: #D9DED3;
  --cm-disabled-text: #566159;
  --cm-canvas: #F5F3EC;
  --cm-surface: #FFFEFA;
  --cm-ink: #202A25;
  --cm-muted: #566159;
  --cm-border: #D9DED3; /* decorative only */
  --cm-control-border: #566159;
  --cm-selected: #E5EFE7;
  --cm-on-primary: #FFFFFF;
  --cm-agent-scout: #F2C983;
  --cm-agent-promoter: #EFAF9B;
  --cm-agent-sales: #B9D8EC;
  --cm-agent-account: #D3C6E7;
  --cm-agent-operations: #C6D4B5;
  --cm-agent-finance: #B6D9C6;
  --cm-success-ink: #1E6848;
  --cm-success-surface: #EDF5EF;
  --cm-warning-ink: #80520B;
  --cm-warning-surface: #FFF1D6;
  --cm-error-ink: #9B3431;
  --cm-error-surface: #FBE8E4;
  --cm-info-ink: #255F82;
  --cm-info-surface: #E9F2F8;
  --cm-font-display: "DejaVu Serif", Georgia, "Times New Roman", serif;
  --cm-font-ui: "DejaVu Sans", Arial, system-ui, sans-serif;
  --cm-h1-size: 44px; --cm-h1-line: 52px;
  --cm-h2-size: 32px; --cm-h2-line: 40px;
  --cm-h3-size: 24px; --cm-h3-line: 32px;
  --cm-body-size: 16px; --cm-body-line: 24px;
  --cm-small-size: 14px; --cm-small-line: 20px;
  --cm-meta-size: 12px; --cm-meta-line: 16px;
  --cm-space-1: 4px; --cm-space-2: 8px; --cm-space-3: 12px; --cm-space-4: 16px;
  --cm-space-6: 24px; --cm-space-8: 32px; --cm-space-12: 48px; --cm-space-16: 64px;
  --cm-radius-button: 8px; --cm-radius-field: 8px;
  --cm-radius-card: 12px; --cm-radius-drawer: 16px;
  --cm-shadow-default: none;
  --cm-shadow-overlay: 0 8px 24px rgba(32, 42, 37, .10);
  --cm-sidebar-width: 224px; --cm-header-height: 72px;
  --cm-content-grid: 2fr 1fr; --cm-content-gutter: 24px;
  --cm-workspace-padding: 24px; --cm-bottom-nav-height: 64px;
  --cm-control-min-height: 44px;
  --cm-motion-fast: 160ms; --cm-motion-standard: 200ms; --cm-motion-slow: 240ms;
  --cm-motion-easing: cubic-bezier(.2, 0, 0, 1);
  --cm-focus-width: 2px; --cm-focus-offset: 2px; --cm-focus-color: var(--cm-forest);
}

/* Opt in through a scope; importing this file does not restyle host documents. */
.cm-app { background: var(--cm-canvas); color: var(--cm-ink); font: 400 var(--cm-body-size)/var(--cm-body-line) var(--cm-font-ui); }
.cm-display-1 { font: 400 var(--cm-h1-size)/var(--cm-h1-line) var(--cm-font-display); }
.cm-display-2 { font: 400 var(--cm-h2-size)/var(--cm-h2-line) var(--cm-font-display); }
.cm-heading-3 { font: 700 var(--cm-h3-size)/var(--cm-h3-line) var(--cm-font-ui); }
.cm-small { font: 400 var(--cm-small-size)/var(--cm-small-line) var(--cm-font-ui); }
.cm-metadata { font: 400 var(--cm-meta-size)/var(--cm-meta-line) var(--cm-font-ui); }
.cm-amount { font-variant-numeric: tabular-nums; text-align: right; }
.cm-artifact-grid { display: grid; grid-template-columns: var(--cm-content-grid); gap: var(--cm-content-gutter); }
.cm-primary { color: var(--cm-on-primary); background: var(--cm-forest); border-radius: var(--cm-radius-button); min-height: var(--cm-control-min-height); }
.cm-primary:hover:not(:disabled):not([aria-disabled="true"]) { background: var(--cm-primary-hover); }
.cm-primary:active:not(:disabled):not([aria-disabled="true"]) { background: var(--cm-primary-pressed); }
.cm-primary:disabled, .cm-primary[aria-disabled="true"] { color: var(--cm-disabled-text); background: var(--cm-disabled-bg); opacity: 1; }
.cm-input { color: var(--cm-ink); background: var(--cm-surface); border: 1px solid var(--cm-control-border); border-radius: var(--cm-radius-field); min-height: var(--cm-control-min-height); }
.cm-app :where(button, a, input, select, textarea, [tabindex]):focus-visible { outline: var(--cm-focus-width) solid var(--cm-focus-color); outline-offset: var(--cm-focus-offset); }
.cm-dark { --cm-focus-color: #FFFFFF; color: #FFFFFF; background: var(--cm-forest); }
.cm-context-rail-trigger, .cm-bottom-nav { display: none; }
@media (min-width: 1280px) { :root { --cm-workspace-padding: 32px; } }
@media (max-width: 1024px) {
  .cm-context-rail { display: none; }
  .cm-context-rail-trigger { display: inline-flex; }
}
@media (max-width: 768px) {
  :root { --cm-workspace-padding: 16px; --cm-h1-size: 32px; --cm-h1-line: 40px; }
  .cm-artifact-grid { grid-template-columns: minmax(0, 1fr); }
  .cm-team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cm-sidebar { display: none; }
  .cm-bottom-nav { display: flex; min-height: var(--cm-bottom-nav-height); padding-bottom: env(safe-area-inset-bottom); }
  .cm-workspace { padding-bottom: calc(var(--cm-bottom-nav-height) + env(safe-area-inset-bottom) + var(--cm-space-4)); }
}
@media (prefers-reduced-motion: reduce) {
  .cm-app *, .cm-app *::before, .cm-app *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  .cm-task-cursor { display: none; }
  .cm-static-focus-label { display: inline-flex; }
}
'''

def ratio(name):
    return next(p['ratio'] for p in approved if p['name'] == name)

brand = f'''# Crewmori design implementation

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
| Ink on canvas | {ratio('body-on-canvas'):.6f}:1 |
| Ink on surface | {ratio('body-on-surface'):.6f}:1 |
| Muted on canvas | {ratio('secondary-on-canvas'):.6f}:1 |
| White on forest | {ratio('primary-button-label'):.6f}:1 |
| White on hover forest | {ratio('primary-hover-label'):.6f}:1 |
| White on pressed forest | {ratio('primary-pressed-label'):.6f}:1 |
| Muted on disabled background | {ratio('disabled-label'):.6f}:1 |
| Forest on selected | {ratio('selected-label'):.6f}:1 |
| Success ink on success surface | {ratio('success-label'):.6f}:1 |
| Warning ink on warning surface | {ratio('warning-label'):.6f}:1 |
| Error ink on error surface | {ratio('error-label'):.6f}:1 |
| Info ink on info surface | {ratio('info-label'):.6f}:1 |

The decorative border is only {contrast('border', 'surface'):.6f}:1 against surface and {contrast('border', 'canvas'):.6f}:1 against canvas. It must not be the sole visible input boundary or focus indicator. Use muted for required control edges. Use a 2px forest focus outline, offset 2px, on light surfaces; use a 2px white outline on forest. Keep the offset area clear so the ring remains distinguishable. Recheck rendered pairs if transparency, imagery, or backgrounds change.

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
'''

(TOKENS / 'crewmori-tokens.json').write_text(json.dumps(tokens, indent=2) + '\n')
(TOKENS / 'contrast-report.json').write_text(json.dumps(report, indent=2) + '\n')
(TOKENS / 'crewmori-tokens.css').write_text(css)
(ROOT / 'BRAND.md').write_text(brand)
print(json.dumps({'approvedPairCount': len(approved), 'matrixSize': len(colors), 'allApprovedPairsPass': all(p['passes'] for p in approved), 'output': str(ROOT)}, indent=2))
for pair in approved:
    print(f"{pair['name']}: {pair['ratio']:.6f}:1")
