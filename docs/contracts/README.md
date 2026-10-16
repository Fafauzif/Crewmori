# Contracts for the implementation run

These specifications guide the next chat's application code. They are not implemented services or production guarantees.

1. [TRANSITIONS_AND_POLICIES.md](TRANSITIONS_AND_POLICIES.md): authority, idempotency, commercial/work/money/run lifecycle and timing.
2. [SERVICE_AND_EVENT_CONTRACTS.md](SERVICE_AND_EVENT_CONTRACTS.md): complete service family inventory, observable outcomes/errors, ordered events and replacement boundary.
3. [domain-contracts.ts](domain-contracts.ts): typed core examples to adopt/extend into actual runtime validators and services.
4. [AUDIENCE_PROJECTIONS.md](AUDIENCE_PROJECTIONS.md): explicit public/buyer allowlists and negative leak tests.
5. [EDITOR_AND_RUNTIME_EXTENSIONS.md](EDITOR_AND_RUNTIME_EXTENSIONS.md): concrete setup/editor/session/notification/publication extensions required beyond seed schemas.

The canonical tables/scenarios live in `../data/`. Route and domain flow files elsewhere in `spec/` bind every visible control to these effects. New runtime DTOs must preserve these semantics, exact IDs, money/date representations and failure behavior; document final code paths in the updated developer brief and master context.
