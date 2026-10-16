# Curated design and frontend skills

This folder supplies real, pinned source documentation for the implementation run. It is a documentation bundle, not a skill installation. No launcher, hook, downloaded engine, or installer is required or bundled. The frontend must build and run without this folder being served to the browser.

Read `CREWMORI_SKILL_ADAPTER.md` first. Then load the relevant source and playbook for the work in progress. Do not read every vendor document into active context at once.

## Loading order

| When | Read | Purpose |
| --- | --- | --- |
| Before UI work | `CREWMORI_SKILL_ADAPTER.md`, the project design/brand contracts and `../spec/DECISIONS.md` | Preserve approved visual identity, scope and behavior. |
| Before building shared shell/components | `vendor/vercel-agent-skills/skills/composition-patterns/SKILL.md`, then relevant sections of adjacent `AGENTS.md` | Reusable, explicit components and state boundaries. |
| While establishing editorial spacing | `vendor/taste/skills/minimalist-skill/SKILL.md` | Warm editorial restraint, subject to the adapter's explicit overrides. |
| While simplifying task screens | `vendor/impeccable/reference/operate.md`, `distill.md`, `clarify.md` | App task completion and progressive disclosure. |
| Before shipping behavior | `vendor/impeccable/reference/harden.md`, `vendor/vercel-web-interface/command.md`, `VERIFICATION_PLAYBOOK.md` | Recovery, validation, focus, state and actual verification. |
| During performance review | `vendor/vercel-agent-skills/skills/react-best-practices/SKILL.md`, then relevant sections of adjacent `AGENTS.md` | React/Next performance; avoid irrelevant server work. |
| During the user's review loop | Relevant Impeccable `audit.md`, `critique.md`, `layout.md`, `polish.md` | Evidence-based technical and visual review. The user's single loop governs rounds and scores. |
| For specified agent motion | `vendor/impeccable/reference/animate.md`, `vendor/vercel-web-interface/command.md` animation checks | Task-linked, pausable, reduced-motion-safe feedback. |

`vendor/impeccable/SKILL.md` and `reference/craft-floor.md` are retained as source context, with the documentation-only boundary in `SOURCE_BOUNDARIES.md`. The main skill's CLI setup and its absent command branches are not required in this pack. Use the adapted procedure here through the implementation environment's permitted tools.

## What is actually included

- Taste's complete `minimalist-ui` skill and original MIT license.
- Impeccable 4.6.0's complete main skill plus ten relevant, unchanged playbooks: operate, craft-floor, critique, audit, distill, harden, clarify, polish, layout and animate; original Apache-2.0 license and notice.
- Vercel's complete Web Design Guidelines skill wrapper and a complete pinned snapshot of the underlying Web Interface Guidelines command/rules, with its original MIT license.
- Vercel's complete React Best Practices and Composition Patterns skill overviews and full compiled guides, including their examples. These compiled guides resolve the rule dependencies without duplicating every individual rule file.
- The original Vercel agent-skills README containing its MIT declaration, and a clearly labeled standard MIT license body. That pinned repo has no root license file; no upstream copyright notice was fabricated.
- Crewmori-owned adapters, verification guidance, provenance and boundaries.

`SOURCES.json` records exact source repositories, commits, original paths, bundle paths, byte counts, SHA-256 hashes, license declarations and scope. Copied upstream text is unchanged. Crewmori adaptations live outside the vendor folders, except the explicitly labeled additional MIT text file.

## Exclusions and source collection

Do not install the full Taste collection. Its current default targets public marketing pages and chooses art directions and photography; the approved workspace already has an identity. Brutalist/high-motion variants, native-mobile Impeccable branches, executable hooks and live engines are outside scope.

The previously supplied [Awesome DESIGN.md collection](https://github.com/VoltAgent/awesome-design-md) remains a discovery reference. It is not an active skill and is not vendored: copying another brand's system would create a competing design authority. The original Crewmori design contract and the selected Shopify/Contra pattern index are the relevant inputs.

If a future developer deliberately updates a skill, compare it against this adapter, record the new commit/hash/license and changes, and re-run affected checks. Do not silently replace a pinned snapshot by whatever happens to be on `main`.

Keep skills, prompts, references and review documentation outside `public/`. They may accompany the source handoff but must not be bundled as browser runtime dependencies or publicly exposed by an accidental static copy.
