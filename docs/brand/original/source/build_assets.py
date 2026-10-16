"""Rebuild Crewmori's approved Working Seam logo system.

Run from any directory: python source/build_assets.py
Dependencies: Python 3, fontTools, PyMuPDF, Pillow.
Every PNG is rasterized directly from its SVG; wordmarks are outlined.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import math
import shutil
import struct
import xml.etree.ElementTree as ET
import fitz
from PIL import Image, ImageDraw, ImageFont, ImageChops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
FONT_DIR = ASSETS / 'fonts'
FONT_DIR.mkdir(parents=True, exist_ok=True)
FONT_FILE = FONT_DIR / 'DejaVuSerif-Bold.ttf'
if not FONT_FILE.exists():
    shutil.copy('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', FONT_FILE)

GREEN = '#245C47'
IVORY = '#F5F3EC'
COLORS = {'green': GREEN, 'black': '#000000', 'white': '#FFFFFF'}
X = 22.0
SYMBOL_W, SYMBOL_H = 84.0, 76.0
RAW_D = ('M12 12H54Q60 12 64 16L88 40L72 56L50 34H12Q8 34 8 30V16Q8 12 12 12Z'
         'M88 88H46Q40 88 36 84L12 60L28 44L50 66H88Q92 66 92 70V84Q92 88 88 88Z')

def path_bounds(d):
    pen = BoundsPen(None)
    parse_path(d, pen)
    return pen.bounds

font = TTFont(FONT_FILE)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
word_pen = SVGPathPen(glyphs)
cursor = 0
word = 'Crewmori'
pair_adjust = {'Cr': -22, 're': -25, 'ew': -40, 'wm': -36, 'mo': -22, 'or': -10, 'ri': -30}
for i, ch in enumerate(word):
    if i:
        cursor += pair_adjust.get(word[i-1]+ch, 0)
    glyph = cmap[ord(ch)]
    glyphs[glyph].draw(TransformPen(word_pen, (1, 0, 0, 1, cursor, 0)))
    cursor += font['hmtx'][glyph][0] - 12
WORD_D = word_pen.getCommands()
WB = path_bounds(WORD_D)
CAP_HEIGHT_FONT = 1493.0  # H flat-cap height, DejaVu Serif Bold 2.37.
CAP_HEIGHT = SYMBOL_H * .55
WS = CAP_HEIGHT / CAP_HEIGHT_FONT
WORD_W = (WB[2]-WB[0]) * WS
WORD_H = (WB[3]-WB[1]) * WS

def number(v):
    return f'{v:.7f}'.rstrip('0').rstrip('.')

def svg(body, w, h, title, desc='Crewmori Working Seam. Original filled vector symbol and outlined wordmark. No font dependency.'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{number(w)}" height="{number(h)}" '
            f'viewBox="0 0 {number(w)} {number(h)}" role="img" aria-labelledby="title desc">'
            f'<title id="title">{title}</title><desc id="desc">{desc}</desc>{body}</svg>')

def symbol_at(left, top, color, scale=1):
    return (f'<path fill="{color}" transform="translate({number(left-8*scale)} {number(top-12*scale)}) '
            f'scale({number(scale)})" d="{RAW_D}"/>')

def word_at(left, top, color):
    return (f'<path fill="{color}" transform="translate({number(left-WB[0]*WS)} {number(top+WB[3]*WS)}) '
            f'scale({number(WS)} {number(-WS)})" d="{WORD_D}"/>')

def render(source, width=None, height=None):
    doc = fitz.open(stream=source.encode('utf-8'), filetype='svg')
    page = doc[0]
    sx = width/page.rect.width if width else height/page.rect.height
    pix = page.get_pixmap(matrix=fitz.Matrix(sx, sx), alpha=True)
    im = Image.open(BytesIO(pix.tobytes('png'))).convert('RGBA')
    doc.close()
    return im

index = []
def export(folder, stem, source, png_width=None, png_height=None):
    dest = ASSETS/folder
    dest.mkdir(parents=True, exist_ok=True)
    (dest/(stem+'.svg')).write_text(source, encoding='utf-8')
    image = render(source, png_width, png_height)
    image.save(dest/(stem+'.png'))
    index.append({'svg': str((dest/(stem+'.svg')).relative_to(ASSETS)),
                  'png': str((dest/(stem+'.png')).relative_to(ASSETS)), 'png_size': list(image.size)})
    return image

H_W = 2*X + SYMBOL_W + X + WORD_W
H_H = 2*X + SYMBOL_H
STACK_W = WORD_W + 2*X
STACK_H = 2*X + SYMBOL_H + X + WORD_H
for variant, color in COLORS.items():
    horizontal = svg(symbol_at(X, X, color)+word_at(X+SYMBOL_W+X, (H_H-WORD_H)/2, color),
                     H_W, H_H, f'Crewmori / horizontal / {variant}')
    export('horizontal', f'crewmori-horizontal-{variant}', horizontal, 3600)
    # The primary logo is exactly the horizontal composition, with the same geometry.
    export('primary', f'crewmori-primary-{variant}', horizontal, 3600)
    stacked = svg(symbol_at((STACK_W-SYMBOL_W)/2, X, color)+word_at(X, X+SYMBOL_H+X, color),
                  STACK_W, STACK_H, f'Crewmori / stacked / {variant}')
    export('stacked', f'crewmori-stacked-{variant}', stacked, 2200)
    sym = svg(symbol_at(X, (128-SYMBOL_H)/2, color), 128, 128, f'Crewmori / symbol / {variant}')
    export('symbol', f'crewmori-symbol-{variant}', sym, 1024)
    wm = svg(word_at(X, X, color), WORD_W+2*X, WORD_H+2*X, f'Crewmori / wordmark / {variant}')
    export('wordmark', f'crewmori-wordmark-{variant}', wm, 3000)

# Raw exact approved geometry; deliberately no clear space, for construction diagrams.
raw = svg(symbol_at(0, 0, GREEN), SYMBOL_W, SYMBOL_H, 'Crewmori / raw approved symbol',
          'Exact approved Working Seam geometry. Tight construction bounds; not a placement-ready logo.')
(ASSETS/'symbol'/'crewmori-symbol-raw.svg').write_text(raw)

# At 16 px, the approved seam stays open. No geometry alteration is needed.
# Dedicated browser favicons at every supplied slot (16–64 px) use a compact
# 100-unit canvas. This is the only placement exception to standard x clear space.
micro = svg(f'<path fill="{GREEN}" d="{RAW_D}"/>', 100, 100, 'Crewmori / favicon symbol',
            'Exact approved geometry on a compact favicon-only canvas; no optical path changes.')
(ASSETS/'symbol'/'crewmori-symbol-favicon.svg').write_text(micro)
favicon_dir = ASSETS/'favicon'
favicon_dir.mkdir(exist_ok=True)
favicon_tile_sources = {}
for size in [16, 24, 32, 48, 64]:
    render(micro, size).save(favicon_dir/f'crewmori-favicon-{size}-transparent.png')
    tile = svg(f'<rect width="100" height="100" rx="18.75" fill="{GREEN}"/>'
               + f'<path fill="{IVORY}" transform="translate(9 9) scale(.82)" d="{RAW_D}"/>',
               100, 100, 'Crewmori / favicon tile')
    native = render(tile, size)
    native.save(favicon_dir/f'crewmori-favicon-{size}.png')
    favicon_tile_sources[size] = native
(favicon_dir/'crewmori-favicon.svg').write_text(tile)
# Native-size SVG-derived PNG entries are written directly into an ICO container.
png_blobs = []
for size, im in favicon_tile_sources.items():
    b = BytesIO(); im.save(b, format='PNG'); png_blobs.append((size, b.getvalue()))
offset = 6 + 16*len(png_blobs)
ico = bytearray(struct.pack('<HHH', 0, 1, len(png_blobs)))
for size, data in png_blobs:
    ico.extend(struct.pack('<BBBBHHII', size, size, 0, 0, 1, 32, len(data), offset)); offset += len(data)
for _, data in png_blobs: ico.extend(data)
(favicon_dir/'favicon.ico').write_bytes(ico)

app_dir = ASSETS/'app-icon'
app_dir.mkdir(exist_ok=True)
app = svg(f'<rect width="128" height="128" rx="24" fill="{GREEN}"/>'
          + symbol_at(X, (128-SYMBOL_H)/2, IVORY), 128, 128, 'Crewmori / app icon',
          'Ivory approved symbol on forest green. Radius 18.75% of tile; symbol width 65.625% of tile.')
(app_dir/'crewmori-app-icon.svg').write_text(app)
for size in [128, 192, 512, 1024]: render(app, size).save(app_dir/f'crewmori-app-icon-{size}.png')

license_text = font['name'].getDebugName(13)
(FONT_DIR/'LICENSE-DejaVu.txt').write_text(license_text+'\n', encoding='utf-8')
font.close()
geometry = {
    'name': 'Working Seam', 'approved_stage1_concept': '02', 'coordinate_system': 'raw symbol units',
    'raw_path': RAW_D, 'raw_bounds': [8,12,92,88], 'visible_symbol_width': SYMBOL_W,
    'visible_symbol_height': SYMBOL_H, 'unit_x': X,
    'x_definition': '22 raw units: vertical thickness of either horizontal band (y12–34 or y66–88).',
    'clear_space': 'At least x measured from the visible artwork on all sides; supplied production SVG canvases include this space.',
    'rotation_symmetry_degrees': 180,
    'wordmark': {'font': 'DejaVu Serif Bold', 'version': '2.37', 'license': 'Bitstream Vera Fonts License; DejaVu changes public domain',
                 'outlined': True, 'font_units_bounds': list(WB), 'font_cap_height_H': CAP_HEIGHT_FONT,
                 'scale': WS, 'cap_height': CAP_HEIGHT, 'visible_width': WORD_W, 'visible_height': WORD_H,
                 'pair_adjust_font_units': pair_adjust, 'tracking_font_units': -12,
                 'note': 'Exact Stage 1 wordmark outlines and spacing retained; placement and scale refined.'},
    'horizontal': {'viewBox': [0,0,H_W,H_H], 'symbol_bounds': [X,X,X+SYMBOL_W,X+SYMBOL_H],
                   'wordmark_bounds': [X+SYMBOL_W+X,(H_H-WORD_H)/2,H_W-X,(H_H+WORD_H)/2],
                   'visible_artwork_width': H_W-2*X, 'visible_artwork_height': SYMBOL_H,
                   'symbol_wordmark_gap': X, 'cap_to_symbol_height': .55,
                   'wordmark_baseline_y': (H_H-WORD_H)/2+WB[3]*WS},
    'stacked': {'viewBox': [0,0,STACK_W,STACK_H],
                'symbol_bounds': [(STACK_W-SYMBOL_W)/2,X,(STACK_W+SYMBOL_W)/2,X+SYMBOL_H],
                'wordmark_bounds': [X,X+SYMBOL_H+X,X+WORD_W,X+SYMBOL_H+X+WORD_H],
                'symbol_wordmark_vertical_gap': X},
    'symbol': {'viewBox': [0,0,128,128], 'artwork_bounds': [22,26,106,102]},
    'wordmark_only': {'viewBox': [0,0,WORD_W+2*X,WORD_H+2*X], 'artwork_bounds': [X,X,X+WORD_W,X+WORD_H]},
    'favicon': {'viewBox': [0,0,100,100], 'geometry_changed': False,
                'exported_slot_sizes_px': [16,24,32,48,64], 'minimum_slot_size_px': 16,
                'exception': 'Dedicated compact browser-favicon assets at all supplied 16–64 px slots are exempt from standard x clear space. 16 px is the minimum slot, not the only exception size. Standard logo and app-icon assets retain at least x.',
                'transparent_symbol_bounds': [8,12,92,88],
                'tile_symbol_bounds': [15.56,18.84,84.44,81.16], 'tile_corner_radius_percent': 18.75},
    'app_icon': {'tile_size': 128, 'corner_radius': 24, 'symbol_bounds': [22,26,106,102],
                 'symbol_width_percent': 65.625, 'minimum_horizontal_padding': X},
    'minimum_sizes': {'horizontal_digital_canvas_width_px': 200, 'horizontal_print_canvas_width_mm': 45,
                      'stacked_digital_canvas_width_px': 160, 'stacked_print_canvas_width_mm': 35,
                      'wordmark_digital_canvas_width_px': 150, 'wordmark_print_canvas_width_mm': 30,
                      'symbol_standard_canvas_px': 24, 'symbol_standard_print_canvas_mm': 6,
                      'favicon_slot_px': 16,
                      'basis': 'Digital sizes refer to the full exported canvas including clear space; print minima are conservative recommendations.'},
    'colors': {'forest': GREEN, 'ivory': IVORY, 'black': '#000000', 'reversed_logo': '#FFFFFF',
               'note': 'Tile icons use warm ivory; reversed logo artwork uses pure white.'},
    'local_verification_only': 'No trademark clearance or worldwide uniqueness claim.'
}
(ASSETS/'geometry.json').write_text(json.dumps(geometry, indent=2)+'\n')
(ASSETS/'asset-index.json').write_text(json.dumps(index, indent=2)+'\n')

readme = f'''# Crewmori approved logo assets

Direction: 02 Working Seam. Two substantial reciprocal bands preserve the approved silhouette and 180° rotational relationship. The same approved DejaVu Serif Bold 2.37 wordmark outlines and letter spacing are retained. Final lockups refine scale, visible-artwork spacing, and optical vertical placement.

## Files

- `primary/` is the approved horizontal logo; `horizontal/` is an identical, explicitly named copy.
- `stacked/`, `symbol/`, `wordmark/`: green, black, and reversed-white SVG plus transparent PNG.
- `favicon/`: exact-size 16, 24, 32, 48, 64 PNGs; ivory-on-forest tile is the standard browser favicon. Transparent forest versions are also supplied. ICO contains those native rendered tile sizes, not scaled screenshots.
- `app-icon/`: ivory-on-forest SVG and 128, 192, 512, 1024 PNGs. This is an app-identity tile, not a store-specific adaptive/maskable icon package.
- `geometry.json`: all bounds, sizing, spacing, minimum-size recommendations, and placement exceptions.
- `fonts/`: DejaVu Serif Bold 2.37 and complete embedded license for editing/rebuilding. Production SVGs contain paths and require no installed font.

## Consistent construction rule

`x = 22` raw symbol units, measured vertically across a horizontal band. Visible symbol bounds are 84 × 76. Keep at least x clear of adjacent content on every side. Production logo SVGs already contain this margin; do not add a second margin when measuring minimum sizes.

Horizontal gap between visible symbol and visible wordmark = x. Wordmark cap height (flat H measure) = 41.8 units = 55% of symbol height; round-letter overshoot and the i dot extend slightly beyond this measure. The wordmark's visible bounds are vertically centered against the symbol. Stacked symbol-to-wordmark vertical gap = x.

Use the forest logo on ivory or white, the black logo for single-color printing, and reversed white on forest or a plain dark background. Do not use a green logo on forest. Icon tiles use warm ivory {IVORY}; reversed-white logo assets use #FFFFFF.

## Minimum sizes

Digital sizes measure the **entire supplied canvas**, including clear space.

| Version | Digital minimum | Print minimum |
|---|---:|---:|
| Horizontal / primary | 200 px wide | 45 mm wide |
| Stacked | 160 px wide | 35 mm wide |
| Wordmark alone | 150 px wide | 30 mm wide |
| Standard symbol | 24 × 24 px canvas | 6 × 6 mm canvas |
| Browser favicon | 16 × 16 px minimum slot; supplied 16–64 px | Not for print |

All dedicated browser-favicon assets at the supplied 16, 24, 32, 48, and 64 px slots use the compact favicon canvas and are exempt from standard x clear space inside the browser slot. **16 px is the minimum browser slot, not the only exception size.** All favicon sizes retain the exact approved path; the seam stays open at 16 px, so no optical path variant was introduced. Standard logo and app-icon assets retain at least x clear space. `crewmori-symbol-raw.svg` is a tight construction source for diagrams; it is not a placement-ready asset.

## Rebuild

Run `python source/build_assets.py` with Python 3, fontTools, PyMuPDF and Pillow. The generator outlines the bundled font, constructs SVG paths, rasterizes each actual SVG, and writes a validation report. It uses no remote resources, raster-wrapped SVGs, scripts inside SVGs, or effects.

Print minima are conservative design recommendations. Native SVG/PNG rendering has been checked locally; this is not trademark clearance or a claim of worldwide uniqueness.
'''
(ASSETS/'README.md').write_text(readme)

# SVG and PNG checks complement visual review.
report = {'renderer': f'PyMuPDF {fitz.VersionBind}', 'svg_checks': [], 'png_checks': [],
          'geometry': 'Original approved raw path retained without alteration', 'font_dependency': False}
managed_dirs = ['app-icon', 'favicon', 'horizontal', 'primary', 'stacked', 'symbol', 'wordmark']
managed_svgs = sorted(p for folder in managed_dirs for p in (ASSETS/folder).glob('*.svg'))
managed_pngs = sorted(p for folder in managed_dirs for p in (ASSETS/folder).glob('*.png'))
for file in managed_svgs:
    root = ET.fromstring(file.read_text())
    tags = {el.tag.rsplit('}',1)[-1] for el in root.iter()}
    assert root.get('viewBox'), file
    assert not tags & {'image','text','script','foreignObject','filter','style'}, file
    for el in root.iter():
        for key, val in el.attrib.items():
            assert key.rsplit('}',1)[-1] not in {'href','src'}, file
            assert 'url(' not in val and 'font-family' not in key, file
    report['svg_checks'].append({'file': str(file.relative_to(ASSETS)), 'viewBox': root.get('viewBox'),
                                 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
for file in managed_pngs:
    im = Image.open(file).convert('RGBA')
    alpha = im.getchannel('A')
    assert alpha.getextrema() == (0,255), (file,alpha.getextrema())
    report['png_checks'].append({'file': str(file.relative_to(ASSETS)), 'size': list(im.size),
                                 'alpha_bounds': alpha.getbbox()})
report['svg_count'] = len(report['svg_checks'])
report['png_count'] = len(report['png_checks'])
(ASSETS/'validation.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({'asset_root': str(ASSETS), 'horizontal_viewBox': [H_W,H_H],
                  'stacked_viewBox': [STACK_W,STACK_H], 'wordmark_visible_size': [WORD_W,WORD_H],
                  'svgs': report['svg_count'], 'pngs': report['png_count']}, indent=2))
