# Crewmori brand identity package

Version 1.0 — 16 October 2026

Selected direction: **02 Working Seam**. This is the complete reusable identity
package for the selected direction, including both requested guideline formats.

## Open first

- `guide/Crewmori_Brand_Guidelines.pdf` — the 40-page reading and sharing copy.
- `guide/Crewmori_Brand_Guidelines.pptx` — editable PowerPoint source with live
  text, native tables, editable layout diagrams and application examples.
- `BRAND.md` — concise implementation rules for future design and frontend work.

Install the four fonts in `assets/fonts/` before editing the PowerPoint so the
intended typography and line wrapping remain available. The PDF embeds its
fonts. Logo SVGs contain outlined wordmarks and need no installed fonts.

## Package map

| Folder / file | Contents |
|---|---|
| `assets/primary/` | Primary horizontal logo, forest / black / reversed white |
| `assets/horizontal/` | Explicit horizontal aliases of the primary logo |
| `assets/stacked/` | Stacked lockup in the same color variants |
| `assets/symbol/` | Symbol-only masters and raw construction geometry |
| `assets/wordmark/` | Outlined wordmark masters |
| `assets/favicon/` | SVG, native 16/24/32/48/64px PNGs and multi-size ICO |
| `assets/app-icon/` | SVG and 128/192/512/1024px icon tiles |
| `assets/fonts/` | DejaVu Serif and Sans, Regular and Bold, with license |
| `assets/illustration-studies/` | Transparent six-coworker direction study and provenance note |
| `assets/geometry.json` | Exact logo measurements, padding, ratios and minimum sizes |
| `tokens/crewmori-tokens.json` | Exact palette, type, spacing, layout, focus and motion data |
| `tokens/crewmori-tokens.css` | Reusable CSS variables, font faces and example utilities |
| `tokens/contrast-report.json` | Calculated solid-color matrix and approved pairs |
| `source/build_assets.py` | Rebuilds the actual vector and raster logo exports |
| `source/build_tokens.py` | Rebuilds JSON, CSS, contrast data and BRAND.md |
| `source/build_guidelines.mjs` | Complete editable guide authoring source |
| `source/finish_pdf.py` | PDF metadata and outline/bookmark source |
| `references/` | Original Stage 1 exploration and supplied visual reference |
| `MANIFEST.json` | Paths, exact file sizes and SHA-256 hashes |

All production PNG logo exports derive from their corresponding SVG artwork.
The generated coworker artwork is an **illustration direction study**, not a
recovered approved application asset or a replacement for an existing character
system. Exact role colors come from the tokens; do not sample image pixels.

## Logo rules at a glance

- x is the ribbon thickness, **22 raw units**. The visible mark is **84 × 76**.
- Clear space is at least x from every visible edge. Production canvases already
  contain that space. The primary symbol–wordmark gap is x.
- Minimum full-canvas digital widths: primary **200px**, stacked **160px**,
  wordmark **150px**. Standard symbol: **24 × 24px canvas**.
- Dedicated compact browser favicons at every supplied 16–64px size waive x
  inside the browser slot. **16px is the minimum slot**, not the only exception.
- Keep the two bands together. Use the supplied artwork rather than typing the
  name, changing the seam or reconstructing the mark.

## Editable and reusable source

The PPTX is the primary portable editing source. The SVGs can be edited in a
vector editor. JSON/CSS and BRAND.md are ready for future implementation work.

The JavaScript guide builder uses the Codex `@oai/artifact-tool` runtime and its
presentation finalizer, plus the bundled headless LibreOffice converter. Those
runtime dependencies are not redistributed in this ZIP. The builder reads
`CODEX_PRIMARY_RUNTIME*` environment paths. It accepts `CREWMORI_WORKSPACE`,
`CREWMORI_BUILD_DIR` and a fresh `CREWMORI_REVISION` for local rebuilds. In a
Codex workspace, expose the runtime node_modules to `source/` with a local
symlink or equivalent package resolution, then run the builder with the runtime
Node executable. Run the PDF finishing script after final conversion.

The Python asset builders use fontTools, PyMuPDF, Pillow and NumPy. Exact
versions used are in `source/requirements.txt`. These builders use bundled font
files and require no remote font or image downloads.

## Reference files

The reference PDF is the user-supplied third-party visual reference. It is
included only as an input record, not as Crewmori artwork or a grant to reuse
its logo. The Stage 1 archive preserves the full original exploration. The
current identity rules and selected direction are defined by this package.

## Licensing

DejaVu fonts use the Bitstream Vera Fonts License, with DejaVu changes in the
public domain. Keep the included notices when redistributing font files. The
logo wordmark is outlined from DejaVu Serif Bold 2.37. Do not recreate it with
live text. This package does not make a trademark-clearance claim.
