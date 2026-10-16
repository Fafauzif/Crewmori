# Approved-anchor character assets

These standalone SVG files were extracted from the inline artwork in the first two user-approved Stitch screens. They preserve the authored paths, proportions, outlines, and exact role tints. They are not crops of the brand package's raster direction study.

| Canonical role ID | File | Source |
|---|---|---|
| `scout` | `scout.svg` | Team Overview |
| `promoter` | `promoter.svg` | Team Overview |
| `sales` | `sales.svg` | Team Overview |
| `account_manager` | `account-manager.svg` | Team Overview |
| `operations` | `operations.svg` | Team Overview |
| `finance` | `finance.svg` | Team Overview |
| `scout` hero variant | `scout-hero.svg` | Editorial Home |

The six compact assets retain their original 72x72 viewBoxes. The Home hero retains its original 140x140 viewBox and secondary pencil/hat/shadow accents. All seven were parsed as XML, rendered through PyMuPDF, and visually inspected together. No clipping or missing character geometry was observed. Color/stroke differences are those present in the approved source, not a newly invented character system.

Use as local images or convert to React SVG components, preserving viewBox and geometry. If inline components repeat, generate unique accessible title IDs (`useId`) or mark a decorative SVG `aria-hidden` when an adjacent text label already supplies its accessible name. Do not embed several identical IDs in a document. No animation is baked into these assets; apply transient event-driven motion around their wrapper so paths stay stable.

Small ownership avatars may display at 24-32px; teammate controls use a larger 48-72px visual inside a minimum 44px target. The 140px hero can render proportionally at roughly 150-180px within its larger art panel. Do not stretch either axis, replace the illustrated specialist with a generic icon, add faces to the Crewmori mark, or use these illustrations as the product logo.

`provenance.json` records input files, selected SVG indices, transformations and SHA-256 hashes. Original user-supplied references remain the provenance source; these assets are included to make the new implementation independent of remote Stitch image URLs.
