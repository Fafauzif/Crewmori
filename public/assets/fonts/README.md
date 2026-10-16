# Self-hosted application fonts

The approved product overlay uses **Newsreader** for editorial headings and selected short italic context, and **Inter** for application body, controls and metadata. These are actual downloaded font binaries, not placeholders or network-only imports.

| File | Family/style | Variable axes |
|---|---|---|
| `Newsreader-Roman-VF.ttf` | Newsreader upright | Weight 200-800; optical size 6-72 |
| `Newsreader-Italic-VF.ttf` | Newsreader italic | Weight 200-800; optical size 6-72 |
| `Inter-Roman-VF.ttf` | Inter upright | Weight 100-900; optical size 14-32 |
| `Inter-Italic-VF.ttf` | Inter italic | Weight 100-900; optical size 14-32 |

Downloaded from the official `google/fonts` repository on 16 October 2026; URLs, byte sizes and SHA-256 hashes are in `provenance.json`. FontTools parsed all four binaries and confirmed the listed axes. Both `*-OFL.txt` files contain the corresponding SIL Open Font License and copyright notices; preserve them when distributing the source/fonts.

In Next.js, load with `next/font/local` or equivalent local `@font-face`. Declare the real weight range and style, enable `font-optical-sizing:auto`, and do not request a Newsreader weight above 800. Default display weight is 400, occasional 500; Inter 400/500/600 with 700 reserved for short emphasis. There is no need to fetch Google Fonts during a production page request.

Fallbacks: Newsreader -> Georgia -> Times New Roman -> serif; Inter -> Arial -> system-ui -> sans-serif. Check long-label wrapping and layout stability with fallback fonts. The original brand package's DejaVu fonts remain in that original package, because they are the guide's original application-font specification and its logo's construction source. This frontend intentionally follows the approved Stitch typography instead. Do not retype or change the supplied outlined logo to match the UI font.
