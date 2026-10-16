# Flow-file format and shared behavior

Each domain JSON uses `schema_version: 1`, `domain`, `flows: []`. Flow fields: `id`, `title`, `actor`, `route`, `record_refs` (array), `preconditions` (array), `initial_state` (object or string), `controls` (array), `steps` (array), `cancel_back`, `persistence`, `cross_screen` (array), `success_assertions` (array), `negative_assertions` (array), `scenario_tests` (array).

Control: `id` (globally unique dotted string), `label`, `kind` (button/link/input/select/tab/menu/event), `behavior` (plain exact behavior), `enabled_when`, `validation` (string or array). Input change may use the shared field contract; don't invent a full flow per keystroke. Register all important visible controls including search/filter, row action, edit/save/cancel, tabs, overlay close, download, empty-state action, task controls.

Step: `id` (unique within flow), `control_id` (must exist in flow controls), `trigger`, `before`, `validation`, `mutation`, `visible_result`, `failure_recovery`, `focus`. Exact record IDs may be logical references rather than requiring a fixture row for every temporary record. State `mutation: none` explicitly for view-only controls. Every control must be referenced by at least one step or carry `shared_contract` explaining standard field/nav behavior; every flow needs meaningful successful assertions and negative assertions.

Shared contracts (reference by name, don't duplicate pages of prose):
- `field`: labeled controlled input, change updates draft only; inline validation; retain onerror; no native validation bubbles; focus firstinvalid onsubmit.
- `search_filter`: committed query+filter+sort in URL, combined predicate, clearX, reset/clamp paging, no-results separate from empty; remote mock stale-safe; Enter/clear immediate.
- `navigation`: real route, browser Back/Forward, relevant list query restore, scroll/focus, safe notfound; no domain mutation.
- `overlay`: app-owned dialog/drawer, title, initialfocus, Escape/outside policy, modalfocus+inert/scrolllock, close/cancel preservespriorcommit, confirmonlyifdirty, restoretriggerfocus.
- `save`: validate, stablebusybutton, preventduplicate, expectedversion, sharedmutation, event, visibleupdatedrecord, persistedcommit, inlinerecovery; no timer-onlysuccess.
- `download`: create actual valid PDF/CSV/ZIP/JSON asset as specified; meaningfulfilename, buyer-safeprojection, fail/retry if generation fails, no label-onlydownload.
- `reversible_remove`: archive/dismiss ordinary drafts with honestUndo; noharddeleteacceptedhistory; exactscopeconfirmationforbulk/consequential.
- `task_control`: pause/resume/cancel/retry applies actual task state; preserve completed artifacts/effects; retrynewattempt linkedtofailed; noduplicateoutputs.

All domain files must obey DECISIONS.md. Screenshot states and old source code are evidence only. Flows are obligations for the next implementation agent, not a claim that code already exists. Keep common requirements in this file/UX contract and write concrete domain differences in JSON.
