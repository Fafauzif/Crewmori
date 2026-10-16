# Final spacing polish — 1.0.1

Reviewed the existing Crewmori deployment at https://crewmori.vercel.app/ and the supplied cropped screenshot on 16 October 2026. The source revision is a focused presentation patch.

## Changes

- Team decision summaries place “At a glance” on its own line, followed by a wrapping button row with 12px gaps. The same shared card retains the Home amount summary.
- Search controls have a single border and one visible focus treatment. The shared native-input baseline uses low-specificity selectors so existing component styling can apply. Clear-search targets remain 44px and return focus to the input.
- Opportunities filters retain accessible names without duplicate visible captions. Desktop sorting stays compact; mobile filters retain their two-column wrap.
- Ask fields shrink within their row while Delegate keeps its width. Phone headers show a short localized “Sample” label with the full accessible name.
- Home update dismiss actions have centered 44px targets; the existing notification indicator has an explicit visual style.
- Money filter fields have sufficient desktop minimum width for “All currencies” without clipping, and keep their existing mobile widths.

## Changed runtime files

`src/app/globals.css`, `src/views/acquisition.css`, `src/views/money.css`, `src/components/shell.tsx`. Package and lockfile identify the patch as 1.0.1. Domain services, projections, data fixtures and workflow implementation remain byte-identical to the previous source archive.

## Verification

The deployed baseline was inspected in Chromium. Revised source was inspected through the local Next.js preview at the native desktop viewport and in 1280x900 and 390x844 iframe layout viewports. Home/Team, populated and empty Opportunities lists, search clearing, longer command text, invoice filters and the invoice form were checked. The Team footer has a separate label line and 12px measured gaps; the phone footer retains 44px actions; inspected narrow layouts have no document-wide horizontal overflow. Escape dismisses the untouched invoice editor and returns focus to Create invoice.

The existing 95 regression tests pass; lint, TypeScript, the strict static UI audit and production build pass. No extra tests were added for this CSS-focused patch. This is selected visual/browser verification, not an exhaustive accessibility or device certification. Previous documented functional differences and localization coverage limits remain in TRACEABILITY.md.

## Publish this revision

Replace the repository files with the extracted source ZIP and commit to the branch connected to Vercel. Keep the Next.js preset, repository-root directory, `npm ci` and `npm run build`. The revised source was verified locally; the existing public deployment still requires this GitHub update to receive the patch.
