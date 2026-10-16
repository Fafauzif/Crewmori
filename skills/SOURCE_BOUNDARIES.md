# Source snapshot boundaries

This document makes upstream dependencies explicit so that source text is useful without pretending this is a complete installation of another tool.

## Impeccable

The retained main skill and ten playbooks are unchanged documentation at the pinned commit. They contain optional references to native iOS/Android branches, additional playbooks, CLI launchers, deterministic detectors, critique-storage commands and live/browser helpers. Those are not bundled and must not be invoked from this snapshot. Crewmori is a web project; native branches are not applicable. An upstream suggestion to redesign or generate visual alternatives cannot replace the approved anchors.

For this pack's intended use, the self-contained review questions/checklists in the retained playbooks are the reference material; the executable workflow is replaced by the explicitly project-owned adapter and verification playbook. `operate`, `distill`, `clarify`, `harden`, `audit`, `critique` and `polish` map to task completion, disclosure, copy, resilience and review. `layout` and `animate` support the approved surface. `craft-floor` supplies a baseline subject to the explicit brief-first overrides. Omitted relative links are upstream documentation references, not missing app dependencies. Use their original source URL in `SOURCES.json` for provenance; do not create empty files to make an absent command look installed.

The original Apache-2.0 license and `NOTICE.md` remain with the source. The notice mentions derived native platform documents, which are not included here; preserving the original notice avoids silently stripping upstream attribution.

## Vercel React / composition

Each selected skill has its original overview and full compiled `AGENTS.md` adjacent to it. The compiled guide includes the actual rule explanations and examples. Individual `rules/*.md` paths mentioned by the overview are not required: use the complete compiled guide rather than fetching duplicate per-rule copies. Both full compiled guides have been downloaded and hashed; they are not summaries or placeholders.

The repository's pinned README says MIT; the React/composition skill front matter also says MIT. The official Contents API returned 404 for a repository root `LICENSE`. `LICENSE-MIT-TEXT.txt` is explicitly a standard license-body reference added by this pack, not a fabricated original upstream file. Keep the original README, author metadata and license declarations intact. Do not imply Vercel endorsement of Crewmori.

## Vercel Web Design Guidelines

The original wrapper points to the separate Web Interface Guidelines repository. Both the wrapper and the complete `command.md` rule snapshot are included, each at its own pinned commit. The latter repository's original MIT license is included. This resolves the substantive rule dependency locally. The adapter explains optional future refresh behavior.

## Taste

The selected minimalist skill is complete and self-contained, with its original MIT license. The generic prescriptions are intentionally scoped by the Crewmori adapter. The full default art-direction pipeline, image search, browsers/scripts, other style variants and output-enforcement skill are not installed or needed.

## Manifest conventions

`SOURCES.json` lists upstream files under `status: vendored_unchanged`. Each hash is computed over the actual bundled bytes. An unchanged source file may have a different bundle path; both paths are recorded. Project-owned documents are identified separately. No unavailable source is represented as downloaded, and no upstream executable is represented as run.

The bundle is complete for this documented scope. It deliberately is not a complete distribution of the upstream repositories. A future developer choosing to install an upstream CLI must review its installation, dependency and trust requirements separately; the app, build and handoff cannot depend on that installation.
