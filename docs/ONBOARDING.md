# Dori's first Korean journey

`/welcome` opens with Dori on a plain warm-ivory background and one main action, **Say Hello**. `/onboarding` starts with a first spoken Korean phrase using bundled audio and an optional microphone. It then asks the learner's goal, interests, optional age range, and starting point, followed by the daily-time selector, optional reminder time, Korean Future reveal, and a preview of real catalog lessons. Interests and age range stay in local preferences. Reminder permission is requested only when the learner presses **Turn on daily reminder**; **Not now** remains available. After the phrase, onboarding explains that a streak day is earned by completing a conversation. Completing the reveal and course preview enters the existing cozy room. The separate guest lesson-catalog route and existing Supabase email auth route remain available.

The onboarding uses the app's navy, blue, and sky tokens on a warm ivory background. Dream illustrations are original SVG shapes. Dori uses the existing `panda.riv` state-machine triggers and still-image fallback. Rive is paused off-screen by its shared components. Reduced motion removes scene entrance and selection motion.

## First phrase

The first screen uses a beginner Korean phrase from bundled audio, before asking for the learner's level. The user can replay the phrase, reveal romanization, and tap to speak. On web, `SpeechService` uses browser speech recognition when available. Native onboarding records the attempt with `expo-audio`; its swappable mock recognition implementation returns no transcript. Neither path produces a pronunciation score. Denial and recognition errors keep a visible **Continue without microphone** action. A completed attempt and a skipped microphone are stored separately.

## Persistence and completion

`src/state/preferences.ts` persists the scene number and answers in the existing `haru-preferences` AsyncStorage entry. Older drafts map to the corresponding scenes, including the retired room-preview step. The index route resumes an unfinished flow. The final action calls `completeFuture`, which stores `learning_goal`, `starting_level`, `daily_goal_minutes`, the reminder opt-in and time, and completion timestamp for later Supabase profile sync. Interests and age range stay on-device. The 10–120 minute options are unchanged. Migration `202611100001_onboarding_reminder_time.sql` adds the account reminder hour with an 18:00 default for existing profiles. Account creation is still optional, and the widget and home implementations are untouched.

Practice hours are `daily minutes × days ÷ 60`, shown in the restored Korean Future reveal. The screen labels these as practice-time estimates, not proficiency or fluency guarantees.

## Verification and limits

Browser tests cover the full journey, back/reload persistence, a small 320-pixel viewport, reduced motion, denied microphone, a mocked recognized attempt, and arrival in the existing cozy room. Unit tests cover local persistence, profile synchronization, and practice-hour calculations. Native microphone capture, audio output, haptics, and Rive playback still need device checks. The panda rig has no dedicated `look-at` input or mic-amplitude input, so onboarding warns in development and uses a subtle character tilt with existing mood triggers. It does not claim eye tracking or lip synchronization.
