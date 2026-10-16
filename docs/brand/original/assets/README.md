# Crewmori approved logo assets

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

Use the forest logo on ivory or white, the black logo for single-color printing, and reversed white on forest or a plain dark background. Do not use a green logo on forest. Icon tiles use warm ivory #F5F3EC; reversed-white logo assets use #FFFFFF.

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
