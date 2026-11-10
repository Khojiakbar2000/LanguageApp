# MVP validation

Validated locally on November 2, 2026. No live AI requests or paid provider operations were performed.

| Check | Result | Scope |
| --- | --- | --- |
| TypeScript | Passed | Mobile client types |
| ESLint | Passed | App and test source |
| Vitest | 18 tests passed | Learning helpers and Edge handlers with mocked network boundaries |
| Deno check | Passed, four functions | Conversation, transcription, speech and account deletion |
| PostgreSQL security tests | Passed | Real migration and 20-lesson seed; RLS, private audio ownership, quotas, turn commits and completion idempotency |
| Browser checks | 7 passed | Onboarding, exercise retry, back/skip, small-screen layout, catalog, preferences, corrupt-cache recovery and authentication gates |
| Learning journey | 1 passed | Sign-in, lesson, text reply, correction, save, completion, review, learned flag and sign-out with intercepted backend responses |
| Expo export | Passed | iOS, Android and web JavaScript bundles |
| Expo package compatibility | Passed offline check | Local SDK package map; offline validation has limited authority |

The learning-journey test deliberately returns a speech-service error and verifies recovery. Test fixtures are confined to tests. They do not replace production Gemini, Supabase or speech integrations.

Database tests use a fresh temporary PostgreSQL cluster and minimal Supabase auth/storage schema shims. They verify actual SQL behavior, but do not validate hosted Auth, Storage uploads or deployed Edge Functions.

## Still requires external configuration and device verification

- Apply the migration and seed, configure Supabase Auth redirects, and deploy the four Edge Functions.
- Provide Supabase public configuration plus server-only Gemini and ElevenLabs credentials.
- Approve provider usage before live requests; opening a live conversation can generate billable greeting and speech operations.
- Test native recording, permissions, interruption recovery, playback and session persistence on iOS and Android.
- Measure actual Korean recognition accuracy, voice quality, correction quality and round-trip latency with real providers.
- Verify email delivery, account deletion and storage cleanup against the deployed services.

See [README](../README.md) for setup and the complete device checklist. Native compilation, installation and store release have not been verified; successful exports do not establish those outcomes.

## Dependency audit

The implementation-time `npm audit --omit=dev` report contains 11 moderate advisories and no high or critical advisories, including transitive Expo tooling dependencies on glob/minimatch. The suggested automatic fix downgrades Expo to SDK 51 and was not applied. Review compatible upstream fixes before release; this is not a clean security audit or a claim that all reported issues affect the shipped mobile runtime.
