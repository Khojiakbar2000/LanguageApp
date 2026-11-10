# Korean Vocabulary System

## Scope and current status

The implementation adds a dictionary-backed vocabulary catalog, user-owned review state, topic browsing, five practice modes, audio, and tutor retrieval. No dictionary entries are bundled or fabricated. The linked Supabase catalog now contains 4,083 entries imported from KRDICT.

This is an additive feature: it reuses the existing `lessons`, `profiles`, Supabase Auth, Edge Function authentication/quota handling, `speak-lesson` Korean TTS, and the existing `record_learning_activity` streak function. Phrase saves in `saved_expressions` remain separate from dictionary word saves.

## KRDICT API research

Official documentation: [KRDICT Open API](https://krdict.korean.go.kr/eng/openApi/openApiInfo). The app importer uses the documented XML endpoints `/api/search` and `/api/view`.

- Registration is required at [KRDICT API registration](https://krdict.korean.go.kr/eng/openApi/openApiRegister). KRDICT issues a 32-character hexadecimal key following the registration process. The API documentation states a service request allowance of 50,000 requests per day. It does not provide a general per-second limit in the referenced page; the importer still spaces calls and retries HTTP 429 responses.
- Search requires a key and a `q` term. Search supports pagination with `start` from 1 through 1,000 and `num` from 10 through 100. Search results can include `target_code`, word, pronunciation, part of speech, dictionary grade, sense order, Korean definition, and optional translated data. Fields may be absent.
- The documented level filters are `level1` (초급), `level2` (중급), and `level3` (고급). These are retained as dictionary metadata and mapped only to the app labels beginner/intermediate/advanced. They are not TOPIK levels.
- English translations are requested with `translated=y&trans_lang=1`; the importer stores them only where an English translation is actually present. Definitions are stored in Korean. Example translations are stored only when KRDICT returns a translation explicitly marked English; otherwise they remain null.
- `/api/view` can supply entry detail and examples. The importer requests detail per word within a configurable request budget. Pronunciation/audio multimedia is not downloaded or assumed available. App playback uses the existing server-side `speak-lesson` service.
- The documentation page reviewed did not establish a downloadable complete bulk dataset or a supported empty-query catalog scan. Since the documented search requires a query and limits `start` to 1,000, exhaustive import is **not verified**. The importer requires an explicit query and marks a result set partial at the pagination cap or request budget. Separate queries can be imported by rerunning with a different query. A safe exhaustive thousands-of-entries backfill needs KRDICT confirmation of an official export or documented query partition strategy.
- The official [copyright policy](https://krdict.korean.go.kr/eng/kboardPolicy/copyRightTermsInfo) identifies most text materials as CC BY-SA and says multimedia can have separate terms. Attribution is stored on each entry and source links are retained. If redistributed or adapted, the applicable ShareAlike and attribution conditions must be preserved; review any multimedia asset’s individual license before use. This implementation does not ingest audio or other multimedia.

These limits are deliberately recorded instead of treating dictionary coverage, TOPIK equivalence, or missing fields as established facts.

## Database and security

Migration: `supabase/migrations/202611070001_vocabulary.sql`.

- `vocabulary_entries` stores the KRDICT source ID, original `dictionary_grade`, normalized app `difficulty_level`, pronunciation, POS, source URL, source categories, and attribution.
- `vocabulary_meanings` stores ordered Korean senses and optional English translations. `vocabulary_examples` stores Korean examples and an optional explicitly returned English translation.
- `vocabulary_topics` is a stable app taxonomy; `vocabulary_topic_entries` connects entries to it. Import topic tags are a conservative category-text match and are app classifications, not KRDICT proficiency metadata.
- `lesson_vocabulary` connects an existing lesson to ordered target words. No duplicate course/unit/lesson system is introduced; staff can populate these links once a real catalog is imported.
- `user_vocabulary_progress`, review sessions, and answers are user-scoped. RLS permits users to read their own progress, while owner-checked security-definer RPCs record answers and saves. Client users cannot write dictionary rows or import runs.
- Search has a trigram word index and a level/word index. Topic links and due reviews are indexed.
- A review answer is idempotent by request UUID. Correct answers advance familiarity and schedule 1, 3, 7, 14, then 30 days; incorrect answers reduce familiarity by one and schedule a 10-minute retry. Familiarity 5 is mastered. A review qualifies toward streaks only after at least three saved answers, through the existing idempotent streak function.

## Importing

1. Apply Supabase migrations with the project’s normal migration workflow.
2. Keep the registered KRDICT key in the ignored project-root `.env` as `KRDICT_API_KEY=...`. The importer reads that file directly; never use an `EXPO_PUBLIC_*` name. `.env.example` and `supabase/.env.example` contain placeholders only.
3. The URL can come from the existing `NEXT_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_URL` setting. The importer requires a server-side `SUPABASE_SERVICE_ROLE_KEY`; the initial batch runner obtains it in memory from an already authenticated, correctly linked Supabase CLI session.
4. Run `npm run vocabulary:import:initial` to import up to 50 unique beginner entries from KRDICT and tag them with the existing topics. The command verifies the linked project and reads the current catalog count before importing.
5. For subsequent batches, set `KRDICT_QUERY`, optionally `KRDICT_LEVEL=level1|level2|level3`, `KRDICT_SEARCH_METHOD=exact|include|start|end`, `KRDICT_MAX_ENTRIES`, and `KRDICT_MAX_REQUESTS`, then run `npm run vocabulary:import`. Import state is persisted by search method, query, and dictionary grade; rerunning resumes at its stored page. Set `KRDICT_REFRESH=1` to restart that query from page 1 and idempotently refresh entries. Failures and counts are recorded in `vocabulary_import_runs` and printed as JSON per page.
6. To expand a level toward its larger catalog target using documented Hangul-prefix searches, run `npm run vocabulary:import:level -- level1 1000`, `npm run vocabulary:import:level -- level2 2000`, or `npm run vocabulary:import:level -- level3 1000`. The job walks deterministic Hangul syllable prefixes, filters by KRDICT grade, resumes completed prefixes from `vocabulary_import_runs`, and stops at the requested count. Bulk mode imports all fields returned by search but skips the separate detail request for examples to reduce API calls; set `KRDICT_INCLUDE_DETAILS=1` with the standard importer to retrieve examples. Use Node 22.13 or newer. It is a finite source catalog import, not an unlimited generator.

For example, `KRDICT_QUERY=가 KRDICT_SEARCH_METHOD=start KRDICT_LEVEL=level1 npm run vocabulary:import` imports authentic KRDICT headwords beginning with 가. The official API requires a query, accepts 10–100 results per page, and limits `start` to 1–1000; one prefix can therefore be capped. The importer does not scrape the website and does not bypass account access or API limits.

## Product behavior

- The Words tab shows totals by app difficulty, per-level learned/mastered counts, search, topics, and available words. Empty catalog states explain that authorized data must first be imported.
- Word detail shows source-provided pronunciation, POS, dictionary grade, meanings, translations, and examples where available; audio is generated through the app’s existing TTS endpoint. Save state is persisted in `user_vocabulary_progress.saved_at`.
- Practice includes self-rated flashcards, meaning multiple choice, listening (TTS followed by word selection), sentence completion (only when a source example contains the exact headword), and speaking. Speaking displays the STT transcript only; it does not score pronunciation.
- The app practice flow uses only a 100-word page at a time and orders due/less-familiar words first within the loaded set. It does not claim to implement FSRS.
- The conversation Edge Function asks the database for at most eight lesson-linked or already-reviewed words at the learner’s app level. It does not send the full dictionary to Gemini. Tutor vocabulary context is supplementary to the existing lesson scenario and expression context.
- TOPIK I/II/1–6 mappings are not created. `dictionary_grade` remains separate from profile levels and TOPIK goals.

## Current setup and verification limits

- Verified the linked Supabase catalog contains 1,000 beginner, 2,026 intermediate, and 1,057 advanced entries (4,083 total). The app's `search_vocabulary` RPC returns a 60-entry first page. The 4,083 entries have source IDs and attribution; 4,000 have part of speech, 3,594 have pronunciation, and 6,851 meanings currently have English translations.
- Bulk prefix imports use search-response fields and intentionally skip per-entry detail requests to reduce API calls. There are 5,468 saved examples from detailed imports. Topic links currently cover the original 50 explicitly topic-tagged entries; the additional broad prefix imports are searchable in the full library but are not yet assigned to topics.
- The Expo Supabase aliases are present in ignored `.env`; the restarted Expo bundle points at the linked project and does not contain the KRDICT secret variable. The replaced KRDICT key passed an HTTP 200 search validation.
- A complete catalog path (official bulk data or valid partitioning beyond `start=1000`) is unverified. Thousands of entries are therefore not promised until KRDICT confirms that path.
- Deploy the new migration and Edge Function before using cloud-backed screens. Deploy `pronounce-vocabulary` with the existing ElevenLabs STT secret for speaking transcript display.
- Topic matching, sentence examples, and tutor retrieval should be checked against actual authorized import data before claiming broad coverage.
- Validate attribution and ShareAlike handling with the organization’s licensing reviewer before redistributing an adapted dictionary database.
