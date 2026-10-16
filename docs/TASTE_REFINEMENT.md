# Crewmori visual refinement

Release 1.1.0 · 16 October 2026. This pass reduces repeated boxes and competing controls so the owner's decision and illustrated crew carry the hierarchy. It refines the existing application; routes, business commands, approval gates, buyer projections, and stored records remain governed by the existing contracts.

## Direction and references

The bundled `skills/vendor/taste/skills/minimalist-skill/SKILL.md` was applied through `skills/CREWMORI_SKILL_ADAPTER.md`: editorial contrast, deliberate spacing, restrained surfaces, and fewer decorative containers. The adapter preserves Newsreader + Inter, forest and cream, supplied artwork, six role colors, the Global Studio map, and approximately 24px major panels. Taste's alternate fonts, black buttons, sharper global radii, and animation prescriptions do not replace this identity.

External references were reviewed for specific principles:

- [Linear: A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh) informed quieter supporting navigation, lower visual weight for utility controls, and fewer unnecessary borders.
- [Linear: How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui) informed alignment, predictable control placement, and a consistent hierarchy across views.
- [Basecamp: Designing a custom home](https://basecamp.com/projects/custom-home-design) was a reference for clear content centered on requests, decisions, files, and work. It did not supply a copied layout.

These references contribute principles, not imported assets, themes, or new product features. Crewmori's original anchor images and brand remain the visual authority.

## Implemented changes

| Surface | Refinement |
|---|---|
| Shared composer and header | The composer uses a 12px radius with an 8px inset button and no shadow. Supporting header controls have quieter borders/backgrounds while retaining hover and focus feedback. |
| Home greeting | A flat apricot Scout backing replaces the gradient. Studio facts are unboxed text with tabular numeric emphasis; capacity is no longer repeated in the greeting eyebrow. |
| Owner decision | Original-request comparison sits in a native disclosure. Its columns are flat, and the visible terms rail uses a divider instead of a nested card. Total, deposit, timing, and the canonical action remain available. |
| Saved updates | Three independently tinted cards become one paper strip with internal dividers. Inter headings, 14px summaries, and 12px dates distinguish updates from the editorial decision. Dismissal and record links remain. Columns adapt when updates are dismissed; the all-dismissed state provides a clear message and Undo. |
| Team | Character containers grow to 76×80px with lighter borders and no shadow. Map nodes show role and 12px written state; compact rosters retain 12px job labels. Map and compact selectors expose selection through `aria-pressed` and a persistent forest treatment. All six characters, source context, handoffs, and inspectors remain. Assessment callouts show their saved dates to distinguish historical advice from current commitments. |
| Public entry | Benefits become open semantic articles separated by rules, with concrete inquiry, offer, project, and owner-approval copy. The closing invitation also uses an open section; the hero artwork remains. The lead uses readable Inter body type and specific product copy; benefit labels name their actual domains. |
| Opportunities and promotion | Leads share one panel with divided records and Inter functional titles. Secondary actions are quieter. Promotion sections use flat rules and readable Inter preview text while retaining full content and editors. |

The 12px floor applies to decision facts, update metadata, roster labels, and written task state; optional decorative eyebrows retain the established type contract. Major panels keep their existing geometry. Mobile layouts preserve stacking, reachable controls, and the two-column six-role Team view.

Runtime ownership: `src/app/globals.css`, `src/views/home-team.tsx`, `src/views/public.tsx`, `src/views/public.css`, `src/views/acquisition.tsx`, `src/views/acquisition.css`, and `src/lib/i18n.ts`. `DESIGN.md` records the durable visual decisions; this note records the scope and reference rationale.

## Verification

| Check | Result |
|---|---|
| Production build, TypeScript, lint, and existing regression suite | Pass; optimized build, tsc, ESLint and all 95 tests. Changed runtime files pass Prettier; strict static UI audit reports zero findings. |
| Home and Team screenshots after local fonts load, including desktop and 390px | Reviewed at native desktop, 1440x1000 and 390x844; Team also at 1280x900. Saved-date captions inspected after the final revision. |
| Representative public, opportunity, and promotion views | Public desktop/390px; Leads populated/no-results desktop and populated 390px; Promotion 390px. Actions/content remain available. |
| Comparison disclosure, update dismissal/undo, map/list selection, and canonical actions | Enter opens comparison; dismissal/all-dismissed/Undo pass. Lead clear-search and form opening pass. Independent teammate inspector review passes; canonical destinations retained. |
| Keyboard focus, readable metadata, reduced motion, and overflow | Visible disclosure focus and updated text inspected; no document-wide overflow in measured wide/phone views. Existing reduced-motion rules retained, no new motion added. Full device/accessibility coverage remains unverified. |

An independent review identified historical-assessment ambiguity and small comparison text; the saved-date captions and 12px comparison copy resolve those findings. The browser also prompted the adaptive dismissed-update layout and caught-up state. The revised source preserves original service/projection/fixture bytes. Broader original limits remain in `VERIFICATION.md` and `TRACEABILITY.md`. No deployment or production integration is claimed.
