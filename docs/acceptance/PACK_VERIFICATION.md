# Input pack verification

This report concerns the implementation input pack. It is not evidence that the future website has been built, tested, deployed or connected to services.

## Completed checks

- Aggregate flow/index checks:34 route patterns,88 flows,734 globally unique controls,363 explicit domain steps; every control has a mapped step or named shared behavior contract. Every required route has flow coverage.
- Canonical data verifier:46 normalized tables,62 default records and12 independent scenario branches; references, supported schema keywords, meaningful onboarding drafts, branch state invariants, money, dates, prerequisite gates and real bundled asset locators pass.
- Selected references:24 original image hashes verified against provenance.
- Assets:30 SVGs parse; character/demo renders and font axes were separately inspected during asset preparation. Four local Newsreader/Inter font variants and their two licenses are included.
- Skills:23 genuine pinned upstream source documents have matching hashes/byte counts; scoped adapters and license/notices accompany them. No downloaded engine, installer or hook was executed or required.
- Original context:all six parts concatenate to the original107246926-byte archive SHA-256 `98ca29226e7e8c326a44b98860783da68a79eca64bc9211200c8262ec8ec61c8`. The restore helper was executed to a temporary output, its original hash matched, and all40 ZIP entries passed CRC checking. Original core docs are available separately; research workbooks remain intact in the parts.
- Active Markdown local links resolve. No node_modules, build cache, unrelated Git metadata or Python cache is packaged. No individual file reaches25MiB.
- Separate reviewers inspected cross-domain scope, missing flows, source authority, offline/provider independence and loading practicality. Findings were corrected:public intake aggregate/grant creation, project completion/cancellation, service slug, portfolio bytes, resumable setup schema, invoice issuance, upload policy, local-only speech and granular flow loading.

## Reproducible commands

From the unpacked input pack root:

```bash
python3 acceptance/build_indexes.py
python3 spec/data/verify_fixtures.py
python3 acceptance/validate_pack.py
python3 acceptance/read_spec.py --index
python3 acceptance/read_spec.py --flow acq.offer-approval
```

`build_indexes.py` changes derived indexes; if the pack is deliberately edited, rebuild its manifest before claiming the original package hashes still match. `validate_pack.py` is read-only and checks the final file manifest when present. The saved JSON report records the pre-manifest validation; the final manifest check was also run before delivery.

## Limits of this evidence

The standard-library fixture verifier checks the supplied schema subset and domain invariants. An external full JSON Schema validator and TypeScript compiler were unavailable in the authoring runtime, so no external schema/TS compile claim is made. Typed contract examples are implementation inputs. The implementation chat must create and test the actual runtime schemas/services/UI, run the production build and real browser workflows, compare actual screenshots, and execute the founder's review loop.

No frontend runtime, provider, authentication, payment, accessibility-conformance or Vercel-deployment claim follows from these pack checks. Internal ratings and critique exchanges are not included.
