# Haru · Korean, every day

An original Expo + React Native Korean speaking-practice MVP. The character, lesson curriculum and interface are original. The earlier research documents are background, not the current implementation stack.

## Implemented

- Expo Router onboarding, home, lesson catalog/detail, conversation, review, auth and profile routes.
- Dori-led onboarding starts with a first Korean speaking moment and no-mic route, then asks goals, interests, optional age range, level, practice time, and optional reminder time before previewing real lessons. Age and interest preferences stay on-device. See [onboarding notes](docs/ONBOARDING.md).
- 20 original lessons with goals, Korean expressions, translations, scenarios and difficulty.
- Original V2 panda tutor, Dori, with unchanged white belly/dark paws, seven learning animation states, optional accessories, and a ten-state interactive cozy Home. Both use real Rive files built from supplied vectors. See [panda implementation](docs/PANDA.md) and [room details](docs/COZY_ROOM.md).
- Sky-blue launch screen with the original panda face, animated blinking/glancing, and native splash handoff.
- Supabase email/password auth, email-confirmation callback, password reset, profile preferences and sign-out.
- Tap-to-start/tap-to-stop microphone recording using expo-audio, with a 45-second client limit, permission handling, editable transcription and typed fallback.
- Gemini conversation/correction requests through authenticated Edge Functions and validated JSON schemas.
- ElevenLabs Korean transcription and TTS through server-only API keys. Tutor speech is privately cached in Supabase Storage and replayed with expiring signed URLs.
- Conversation history, supported grammar/vocabulary/register corrections, saved expressions, learned flags, retry practice and progress.
- Server-owned daily streaks based on completed three-reply conversations, with timezone-aware activity history, XP, milestone rewards, free freezes and a weekly home calendar. See [streak implementation and limits](docs/STREAKS.md).
- RLS, server-owned statistics/progress, atomic quota reservation, serialized conversation turns and idempotent commits/retries.
- Account deletion endpoint and confirmation UI.

There are no fake AI replies or simulated production accounts. Without credentials, browsing lessons and setting local preferences work; live sign-in, voice and account data correctly require setup. No LiveKit, streaming, Firebase, NestJS, Next.js or Redis is used.

## Run the interface

Use Node 24 LTS and npm. The lockfile pins the installed versions. This project currently targets Expo SDK 58.

```sh
nvm use
npm ci
npm run web
```

If you do not use nvm, select Node 24 using your preferred version manager instead.

Open the URL printed by Expo. Use **Explore the lesson catalog** to browse without an account. Public routes include `/welcome`, `/onboarding`, `/lessons`, `/review` and `/profile`. The conversation route is authentication-gated.

For mobile:

```sh
npm start
```

Scan the QR code using a compatible Expo Go version. If the current store version of Expo Go does not support this SDK, use a development build matching SDK 58. Do not downgrade individual native packages independently of Expo's compatibility set.

```sh
npx expo run:ios
npx expo run:android
```

Local iOS builds require Xcode; Android builds require the Android SDK/JDK. Physical devices can use a development build without running an emulator. Native build installation and microphone behavior still require real-device testing. Web microphone capture requires a secure context; localhost works, but a plain HTTP LAN address may not.

## Connect Supabase

Create or select a Supabase project. This repository does not create a hosted project, subscribe to a provider, deploy automatically or make paid API calls during tests.

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from that project. A legacy anon key is also supported. These are public client values, protected by RLS. Never place service-role or AI keys here.
3. For a new project, apply all files in `supabase/migrations/` in filename order, then `supabase/seed.sql`. For an existing Haru database with the initial schema, apply any unapplied migrations in order, including `202611030001_korean_future.sql` and `202611030002_panda_customization.sql`. Use the Supabase SQL editor or the CLI; do not re-run the initial schema against an existing database.

CLI alternative (requires the Supabase CLI):

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --include-seed
```

`src/content/lessons.ts` is the source for both the offline catalog and the SQL seed. After editing curriculum data, run `npm run seed:generate` and apply the new seed. This is static educational content, not generated AI responses.

### Deploy Edge Functions

Copy `supabase/.env.example` to `supabase/.env`, then set:

| Secret                 | Purpose                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `GEMINI_API_KEY`       | Server-only Gemini access                                                                        |
| `GEMINI_MODEL`         | A model available to your account supporting `generateContent` and JSON-schema structured output |
| `ELEVENLABS_API_KEY`   | Server-only transcription and speech access                                                      |
| `ELEVENLABS_VOICE_ID`  | A permitted Korean-capable voice from your account                                               |
| `ELEVENLABS_STT_MODEL` | Defaults to `scribe_v2`                                                                          |
| `ELEVENLABS_TTS_MODEL` | Defaults to `eleven_flash_v2_5`; verify current model/voice availability                         |

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. The service-role key is used only inside the Edge Functions.

```sh
supabase secrets set --env-file supabase/.env
supabase functions deploy conversation
supabase functions deploy transcribe
supabase functions deploy speak
supabase functions deploy delete-account
```

Opening an authenticated conversation generates the opening AI reply and attempts speech synthesis. With real credentials, those provider operations can incur charges. Only perform live testing after approving provider usage.

The function config uses `verify_jwt = false` because **each handler explicitly verifies the bearer token with Supabase Auth `getUser` before any database/provider operation**. Do not remove this authentication check. It supports projects using asymmetric JWT signing keys as well as legacy projects.

### Auth and email links

In Supabase Authentication settings, configure the site URL and allow appropriate redirect URLs:

- Native development build: `harukorean://auth/callback` and `harukorean://auth/callback?next=reset` (or an appropriate restricted wildcard for this scheme).
- Local browser: `http://localhost:8081/auth/callback` and the corresponding `127.0.0.1` address if used, including the reset query.
- Expo Go: allow the exact `exp://.../--/auth/callback` URL produced by your dev environment. A custom-scheme development build is more reliable for email-link testing.

Set an email provider/SMTP configuration appropriate to your Supabase environment. Sign-up shows an email-confirmation message when confirmation is enabled. With PKCE, open confirmation/reset links on the device/browser that requested them. Session tokens are stored in Keychain/Keystore on native platforms, in chunked SecureStore items; web uses localStorage.

Restart Expo after changing `.env`. Only the `EXPO_PUBLIC_*` values are bundled into the client.

### Optional local Supabase

With the Supabase CLI and Docker already configured:

```sh
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env
```

Use the local URL and anon key printed by `supabase status`. These are actual local-development credentials generated by Supabase, not hosted-project credentials. On a physical phone, replace loopback in the public URL with the Mac's reachable LAN address, and configure the local stack and redirects accordingly. Keep the service role out of the mobile environment. Do not expose a local development database to the public internet.

## Conversation lifecycle

1. The app opens/resumes an authenticated conversation and generates a unique request ID.
2. The server derives ownership from the verified Auth user and level from the database profile.
3. The server loads the selected lesson and recent user corrections; it claims the turn and reserves usage atomically.
4. Gemini receives bounded conversation history, lesson context and the structured-output schema.
5. Validated replies, exact-substring-supported corrections and statistics commit in one database transaction.
6. TTS uses only an owned, stored assistant message; it does not accept arbitrary client text. Audio is stored privately and returned through a short-lived signed URL.
7. The learner records up to 45 seconds, stops, checks/edits the transcript, then sends. Grammar feedback is based on the transcript, so review recognition errors before sending.
8. Finish practice marks the session complete only after a learner reply. Leaving practice keeps it resumable through history/Home. Completion means practice was finished, not mastery was certified.

The server caps request payloads and audio bytes (4 MB decoded); the 45-second duration cap is client-side. Daily limits are per user and reset at midnight UTC: 20 starts, 60 Gemini attempts, 50 transcriptions and 80 newly synthesized audio replies. Failed provider attempts still consume quota; retries cannot create an unlimited paid loop. Cached replays do not consume new synthesis quota. These are request limits, not a guaranteed monetary budget.

Raw recordings are used transiently for transcription and cleaned from the client on success or conversation cleanup. User text, corrections and progress are persisted. Third-party provider logging/retention policies still apply. Native interruption behavior, long-running deletion/storage cleanup and provider-specific data policies must be reviewed before a public production launch.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run check:functions
npm run test:db
npm run test:browser
npm run test:journey
npx expo export --platform all --max-workers 2
```

- Unit and Edge-handler tests mock network boundaries, so they cannot incur AI charges. They cover authorization, strict contracts, foreign-resource access, quota rejection, idempotent replies, unsupported corrections, invalid audio and cached playback.
- `test:db` needs PostgreSQL's `initdb`, `pg_ctl` and `psql` on PATH. It starts a fresh temporary UTF-8 cluster on an ephemeral loopback port and shuts it down afterward. It executes the real migration and seed with minimal `auth`/`storage` test shims. It verifies SQL/RLS/transaction behavior, not the entire Supabase deployment or Storage service.
- `test:browser` uses the installed Google Chrome, with no browser download. It reuses the local Expo preview on port 8081 or starts one. Run it with no Supabase configuration for the explicit unconfigured-state assertions. It covers onboarding, lesson navigation, persistent preferences, review account-gating and protected practice routes.
- iOS/Android/web exports validate JavaScript bundling, not native device behavior.
- `test:journey` starts an isolated Expo server on port 8082 with test-only public configuration. Its browser intercepts every backend request. It verifies sign-in → lesson → text conversation → correction → saved review → completion → learned flag → sign-out, including a deliberate speech-service failure. These fixtures exist only in tests; this is client-contract verification, not a claim of live AI, speech or Supabase testing. It stops its test server when done and does not change the normal preview configuration.

## Live-device acceptance checklist

After providing credentials and approving API usage, test on both an iPhone and an Android device:

1. Sign up, confirm email, sign in, restart the app and verify session persistence. Reset the password using the same device.
2. Start a lesson. Confirm a real Korean greeting, correct English caption and audible speech. Replay and verify cached audio.
3. Grant and deny microphone permission; check typed fallback. Record, stop, edit the transcript and send. Confirm the stored turn and reply after reopening history.
4. Practice a deliberately incorrect particle and a polite-register expression; have a Korean educator assess whether the correction is useful and accurate.
5. Save a phrase/correction, restart, mark it learned and try it again. Change level/goal and confirm the next new conversation uses them.
6. Finish a session twice/retry after a network interruption. Verify one completion and no duplicate turn/stat increments.
7. Background during recording, interrupt audio, disconnect/reconnect the network, deny playback or expire a session. Confirm recoverable states and no stuck microphone.
8. Use two accounts to verify separation of transcripts, reviews and cached audio. Inspect the deployed functions/storage policies, not just the local tests.
9. Test quota boundaries, email-provider rate limits, malformed provider responses, account deletion and storage cleanup in the deployed environment.

## Project map

```text
app/                         Expo Router screens
src/components/              Native UI primitives and original tutor
src/content/lessons.ts        Original lesson catalog
src/hooks/useConversation.ts  Recording, playback and conversation lifecycle
src/lib/                     Supabase client, types and progress helpers
src/state/                   Zustand preferences and account data
supabase/migrations/         PostgreSQL schema, RLS and transactional functions
supabase/functions/           Authenticated Gemini, STT, TTS and deletion handlers
supabase/seed.sql             Generated 20-lesson seed
tests/                       Unpaid handler/unit/SQL/browser verification
research/                    Earlier research and superseded architecture proposals
```

## External configuration and remaining validation

A hosted/local Supabase instance and actual Gemini/ElevenLabs credentials are still required for live accounts and AI voice. No real provider calls were made during implementation. Exact voice quality, Korean recognition accuracy, response latency, native microphone/playback, email delivery and deployed Storage/Edge Function behavior require live testing. The app does not claim acoustic pronunciation scoring or official TOPIK assessment. UI polish, native release builds and store submission are subsequent work.

### Interactive cozy Home

Home now uses the supplied four-phase room artwork with the original uncolored V2 panda, a real Rive state machine, a complete hand-attached coffee sequence, rain, steam, plant/clock/lamp motion, and day/night. The book opens the existing learning flow. Expo Go uses animated native SVG parts. See [the room implementation and verification notes](docs/COZY_ROOM.md). Rebuild with `npm run room:build` using Node 24 and Chrome.

### Panda home screen widgets

The optional `/panda-widget` invitation uses the supplied `imagePanda.png`. Small/medium iOS WidgetKit and native Android App Widgets show the original panda, public Korean phrases and learning aggregates. First practice offers the invitation; Profile can reopen it. Native installation requires a new build, not Expo Go. See [widget implementation, validation and native build steps](docs/PANDA_WIDGET.md).
