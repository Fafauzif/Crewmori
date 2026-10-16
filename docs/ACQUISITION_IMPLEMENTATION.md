# Acquisition implementation and review evidence

Implementation: `src/views/acquisition.tsx`, `src/views/acquisition.css`. Canonical data and mutations are provided by `src/lib/store.tsx` and `src/lib/engine.ts`; there is no separate per-screen fixture store. These routes belong to the Opportunities primary navigation item.

| Flow | Implemented surface and behavior |
| --- | --- |
| `acq.lead-list` | Combined URL search/status/source/sort, deterministic tie-breaking, eight-row pagination, count, empty/no-results, canonical detail links with list return query. Stale out-of-range page queries are clamped. |
| `acq.lead-edit` | Manual client selection or deliberately separate client creation, original request, exact requested money/currency, requested duration, source metadata. TXT/CSV-text import provides column mapping and a row preview. Save creates linked source/brief/client/conversation context atomically. |
| `acq.lead-source` | Original source content, stored versions and dates, safe external links, sample refresh, replacement editor. Replacements retain earlier source records; the lead displays the latest source. |
| `acq.lead-assessment` | Explicit Scout task with canonical task link, concise findings/assumptions/unknowns, source inspection, deliberate qualification, private missing-information draft, optional-reason decline and restoration. Won/accepted leads do not expose decline. |
| `acq.offer-list` | Current canonical version/client/amount/status, combined search/filter/sort and pagination, unknown-ID handling, create from an explicit client and its own opportunity. |
| `acq.offer-edit` | Scope and quantities, exact price, percentage deposit, integer installment preview, business-day duration, prerequisites, expiry, buyer note and private planning fields. Uncommitted edits are local; save creates a successor; save-and-submit is one validated transaction. |
| `acq.offer-detail` | Essential exact terms first; client/source/project links; supporting assessments behind disclosure; read-only historical version selection and actual term comparison. |
| `acq.offer-approval` | Exact terms and client contact review, current-version approval, owner-private revision instruction, cancellation without effects. A changed destination needs fresh approval. |
| `acq.offer-share` | Explicit buyer-safe preview and PDF content allowlist, deliberate sample share, scoped buyer link containing the matching grant and shared version, clipboard feedback/fallback. Share does not accept or create payment evidence. |
| `acq.offer-withdraw-expire` | Named-version withdrawal confirmation, history retention, sample-clock expiry display, revised-draft entry. |
| `acq.offer-amendment` | Accepted content remains immutable; owner creates a successor with a change reason. Accepted amendments update the existing project and append acceptance history. Positive price/deposit adjustments create only the authorized upfront delta; invoice adjustments and schedule history preserve previous evidence. Reviewed duration or proposed-start changes retain the original reservation and need buyer acceptance plus project prerequisites before commitment. Credit/refund, capacity-conflict, and unresolved rescheduling branches return explicit review errors. Owner exact-term previews display proposed dates in Asia/Jakarta alongside previous commitments when available. |
| `acq.promotion-draft` | Search/status/channel query, manual versioned editor, published-service claim source, selected channel/audience/URL, explicit Promoter task, archive/restore. |
| `acq.promotion-approval` | Exact content/destination/claim-reference review. Stale or unpublished source claims block approval. |
| `acq.promotion-publication` | Successful copy is distinct from publication; safe destination navigation; explicit sample evidence/date confirmation; exact immutable published snapshot and publication evidence; pause preserves prior evidence. |

## Failure, safety and accessibility behavior

- Unknown lead, offer, historical version and promotion IDs produce app-owned unavailable states. There is no Northstar fallback.
- Form versions are captured when the form opens. Concurrent updates reject stale saves and keep entered values. Required-field and command failures focus an error summary.
- App-owned dialogs use shared native-dialog focus handling. Dirty editors use the shared navigation/unload guard and explicit discard confirmation.
- Source text is rendered as text. Source/destination external links are restricted to HTTP(S) and use new-tab protections.
- USD/IDR input parses decimal strings to integer minor units. Deposit previews use integer/BigInt half-up arithmetic.
- Buyer preview and PDF are explicitly assembled from commercial fields; internal effort, costs, assessments and private notes are absent.
- All sample publication, sharing and task effects are local. No social account, email provider, microphone, live AI service or payment provider is invoked.

## Verification

`tests/acquisition.test.ts` exercises the exact command shapes used by the UI. It checks manual lead graph creation, source-history retention, assessment invalidation, decline/restoration, approval/share separation, replay deduplication, edited approval invalidation, atomic validation failure, captured stale form versions, promotion claim/destination/audience/evidence, selected Promoter task context, unknown IDs, recipient reapproval, client/opportunity scope, immutable publication history and amendment project/ledger consistency.

Run with `node --import tsx --test tests/acquisition.test.ts`. The `tsx --test` CLI attempts a local IPC socket, which is unavailable in some restricted runners; the Node import invocation does not need that socket. Browser verification is recorded in the central verification report; this document does not imply a separate browser run.
