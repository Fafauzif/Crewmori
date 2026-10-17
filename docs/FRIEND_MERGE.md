# Friend update merged — Crewmori 1.2.1

Received `docs(2).zip` and `scripts.zip` on 18 October 2026 (Asia/Jakarta). The archives were compared by path and SHA-256 against the 428-file source baseline used for the completed UX implementation. All 428 source paths were present; 426 were identical to that baseline. There were two changed files, no added source files and no missing baseline source files. Incoming Git metadata was excluded from the handoff.

| Incoming change | Merged result |
| --- | --- |
| `src/app/api/auth/[action]/route.ts` adds a cached Google-provider settings check before OAuth. | Preserved the feature and combined it with the UX release's contextual sign-in recovery, `/auth/verify` handoff and `POST /api/auth/complete`. The check lives in the testable server helper `src/server/auth-provider.ts`. |
| `tests/e2e/mock-services.mjs` adds `/auth/v1/settings` with Google enabled and email disabled. | The incoming behavior was retained; line endings were normalized to match the maintained source. |

## Conflict resolution

Both branches changed the auth route. Replacing the route with either branch would discard useful behavior. The combined route computes the safe workspace destination first, checks provider settings, and returns to Crewmori sign-in recovery when Google is explicitly disabled. Otherwise it starts the existing Google OAuth/PKCE flow. The provider callback URI remains `/api/auth/callback`; no provider registration change or database migration was added.

The settings request has a five-second timeout. Only a successful HTTP response containing an explicit boolean `external.google` is cached for 60 seconds, scoped to the configured Supabase project and publishable key. Failed HTTP requests, malformed responses and unknown settings defer to the existing OAuth path instead of being cached as disabled. This small correction avoids treating a transient settings error as a one-minute provider outage. It does not grant a session or bypass authentication; Supabase OAuth and PKCE remain authoritative.

## Preservation and verification

The previously implemented UI, commands, account isolation and recovery behavior were retained. The merge added eight focused tests for the settings request/cache, cache expiry, configuration changes, non-success/malformed responses, network/timeout recovery, missing configuration, the supplied service mock and the actual disabled-provider redirect with a workspace deep link. See `IMPLEMENTATION_VERIFICATION.md` for the final full-suite results and unchanged hosted-testing limits.

The combined package is `Crewmori_Updated_Source_1_2_1.zip`. Extract it once, then work from its `Crewmori/` folder. Root `PACKAGE_LAYOUT.json` describes the single archive and `SOURCE_INVENTORY.json` records source-file hashes. Existing local secrets, dependencies, build output, test captures and Git metadata are excluded. Keep your existing repository remote and hosted secrets when copying in the assembled source.
