import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInRight,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { OnboardingFrame } from '../src/components/Onboarding';
import { Tutor } from '../src/components/Tutor';
import { DreamScene, LevelScene } from '../src/components/OnboardingJourney';
import { ClassicDailyScene, FutureReveal } from '../src/components/KoreanFuture';
import {
  AgeScene,
  CourseReadyScene,
  InterestScene,
  ReminderScene,
} from '../src/components/OnboardingSetup';
import { FirstPhrase } from '../src/components/FirstPhrase';
import { colors } from '../src/components/ui';
import { startingPoints } from '../src/lib/koreanFuture';
import type { TutorState } from '../src/lib/types';
import { useApp, usePreferences } from '../src/state/store';
import { setDailyLearningReminder } from '../src/lib/dailyReminder';

const ivory = '#FFFDF7';
const titles = [
  'Say your first Korean phrase.',
  'What brings you to Korean?',
  'What would you like to talk about?',
  'Which age range are you in?',
  'How much Korean do you know?',
  'How much time can you give your Korean every day?',
  'When should Haru remind you?',
  'Your Korean future starts today.',
  'Your Korean course is ready.',
];
const labels = [
  'YOUR FIRST LESSON',
  'YOUR GOALS',
  'YOUR INTERESTS',
  'ABOUT YOU',
  'YOUR STARTING POINT',
  'YOUR DAILY COMMITMENT',
  'A GENTLE REMINDER',
  'YOUR KOREAN FUTURE',
  'READY WHEN YOU ARE',
];
const hints = [
  'Listen once, then say it with me.',
  'I’m glad you’re here.',
  'We’ll find lessons that fit your life.',
  'A little context helps us make this feel like yours.',
  'No test today. We will start together.',
  'A few minutes can make a lovely habit.',
  'Pick a time that works for you.',
  'Look at the practice time we could share.',
  'Your first lessons are ready to explore.',
];
const responses = {
  everyday: 'Everyday words make good memories.',
  confident: 'We’ll make space for your voice.',
  advanced: 'Big dreams begin with one phrase.',
} as const;

export default function Onboarding() {
  const prefs = usePreferences();
  const step = prefs.futureStep;
  const reduced = useReducedMotion();
  const { height, width } = useWindowDimensions();
  const compact = height < 730 || width < 355;
  const [reminderError, setReminderError] = useState('');
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reaction, setReaction] = useState<{
    step: number;
    mood: TutorState;
    bubble: string;
  } | null>(null);
  const activeReaction = reaction?.step === step ? reaction : null;
  const mood = activeReaction?.mood ?? (step >= 7 ? 'happy' : step === 0 ? 'speaking' : 'thinking');
  const bubble = activeReaction?.bubble ?? hints[step];
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeWarning = useRef(false);
  const gaze = useSharedValue(0);
  const pandaMotion = useAnimatedStyle(() => ({
    transform: [{ rotate: `${gaze.value}deg` }, { translateY: Math.abs(gaze.value) * 0.5 }],
  }));
  useEffect(() => {
    if (prefs.hydrated && !prefs.futureInProgress)
      usePreferences.getState().setPreferences({ futureInProgress: true });
  }, [prefs.hydrated, prefs.futureInProgress]);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(titles[step]);
    gaze.set(withTiming(0, { duration: reduced ? 0 : 180 }));
  }, [step, gaze, reduced]);
  useEffect(
    () => () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
      cancelAnimation(gaze);
    },
    [gaze],
  );
  const react = (state: TutorState, message: string) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction({ step, mood: state, bubble: message });
    if (state !== 'listening') reactionTimer.current = setTimeout(() => setReaction(null), 520);
  };
  const lookTo = (angle: number) => {
    if (__DEV__ && !gazeWarning.current) {
      console.warn('Panda Rive has no look-at input; onboarding uses a small character tilt.');
      gazeWarning.current = true;
    }
    gaze.set(withTiming(angle, { duration: reduced ? 0 : 210 }));
  };
  const back = useCallback(() => {
    if (step > 0) usePreferences.getState().setPreferences({ futureStep: step - 1 });
    else router.replace('/welcome');
  }, [step]);
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => listener.remove();
    }, [back]),
  );
  async function advance() {
    if (step === 6) {
      if (Platform.OS === 'web') {
        prefs.setPreferences({ reminderEnabled: false });
        prefs.setPreferences({ futureStep: 7 });
        return;
      }
      setReminderBusy(true);
      setReminderError('');
      try {
        await setDailyLearningReminder(true, prefs.reminderHour);
        prefs.setPreferences({ reminderEnabled: true });
        prefs.setPreferences({ futureStep: 7 });
      } catch (error) {
        setReminderError(error instanceof Error ? error.message : 'Could not set that reminder.');
      } finally {
        setReminderBusy(false);
      }
      return;
    }
    if (step < 8) {
      prefs.setPreferences({ futureStep: step + 1 });
      return;
    }
    prefs.completeFuture(useApp.getState().session?.user.id ?? null);
    if (useApp.getState().session) void useApp.getState().refresh();
    router.replace('/(tabs)');
  }
  async function skipReminder() {
    setReminderError('');
    prefs.setPreferences({ reminderEnabled: false, futureStep: 7 });
    if (Platform.OS !== 'web') await setDailyLearningReminder(false).catch(() => undefined);
  }
  const disabled =
    !prefs.hydrated ||
    (step === 0 && !prefs.firstPhraseDone) ||
    (step === 1 && !prefs.learningDream) ||
    (step === 4 && !prefs.startingPoint) ||
    reminderBusy;
  const cta = [
    'Continue',
    'Continue',
    'Continue',
    'Continue',
    'Let’s speak',
    'Continue',
    Platform.OS === 'web' ? 'Continue' : 'Turn on daily reminder',
    'Meet My Korean Future',
    'Start My Korean Journey',
  ][step];
  return (
    <OnboardingFrame
      step={step}
      totalSteps={9}
      accent={colors.primary}
      background={ivory}
      onBack={back}
      footer={
        <>
          <Pressable
            testID="onboarding-continue"
            accessibilityRole="button"
            accessibilityLabel={cta}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={advance}
            style={({ pressed }) => [s.cta, disabled && s.ctaDisabled, pressed && s.ctaPressed]}
          >
            <Text style={[s.ctaText, disabled && s.ctaTextDisabled]}>{cta}</Text>
            <Ionicons
              name={step === 8 ? 'sparkles' : 'arrow-forward'}
              size={19}
              color={disabled ? colors.muted : ivory}
            />
          </Pressable>
          {step >= 5 && step !== 6 && step !== 8 && (
            <Text style={s.footerNote}>
              {step === 7
                ? 'A little time. A future that’s yours.'
                : 'Your pace. Your path. You can change this later.'}
            </Text>
          )}
        </>
      }
    >
      <View style={s.scene}>
        {(step === 0 || step === 1 || step === 4) && (
          <View
            style={[s.pandaStage, step === 0 && s.firstLessonPanda, compact && { minHeight: 140 }]}
          >
            <View style={s.pandaHalo} />
            <Animated.View style={pandaMotion}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Say hello to Dori"
                onPress={() => react('happy', '안녕! I’m right here with you.')}
              >
                <Tutor
                  state={mood}
                  size={step === 0 ? (compact ? 100 : 112) : compact ? 130 : 165}
                />
              </Pressable>
            </Animated.View>
            <View style={s.bubble}>
              <Text style={s.bubbleText}>{bubble}</Text>
            </View>
          </View>
        )}
        <Animated.View
          key={step}
          entering={reduced ? undefined : FadeInRight.duration(230)}
          style={s.content}
        >
          <Text style={s.eyebrow}>{labels[step]}</Text>
          <Text accessibilityRole="header" style={[s.title, compact && s.compactTitle]}>
            {titles[step]}
          </Text>
          {step === 0 && (
            <>
              <FirstPhrase
                level="complete_beginner"
                completed={prefs.firstPhraseDone}
                onCompleted={() => prefs.setPreferences({ firstPhraseDone: true })}
                onAttempted={() => prefs.setPreferences({ firstPhraseAttempted: true })}
                onMood={(value) =>
                  react(
                    value,
                    value === 'listening'
                      ? 'I’m listening.'
                      : value === 'celebrating'
                        ? 'You did it! Our first Korean moment.'
                        : value === 'speaking'
                          ? 'Listen to this.'
                          : 'We can take our time.',
                  )
                }
              />
              {prefs.firstPhraseDone && (
                <View style={s.streakNote} accessibilityLiveRegion="polite">
                  <Ionicons name="flame-outline" size={21} color={colors.primary} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.streakTitle}>Your first phrase is in.</Text>
                    <Text style={s.streakCopy}>
                      Complete a conversation to start your streak. Come back tomorrow to keep it
                      going.
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
          {step === 1 && (
            <DreamScene
              selected={prefs.learningDream}
              onSelect={(value) => {
                prefs.setPreferences({
                  learningDream: value,
                  goal: value === 'advanced' ? 'TOPIK' : 'Daily Conversation',
                });
                lookTo(value === 'everyday' ? -3 : value === 'confident' ? 0 : 3);
                react('happy', responses[value]);
              }}
            />
          )}
          {step === 2 && (
            <InterestScene
              selected={prefs.learningInterests}
              onToggle={(value) =>
                prefs.setPreferences({
                  learningInterests: prefs.learningInterests.includes(value)
                    ? prefs.learningInterests.filter((item) => item !== value)
                    : [...prefs.learningInterests, value],
                })
              }
            />
          )}
          {step === 3 && (
            <AgeScene
              selected={prefs.ageRange}
              onSelect={(value) => prefs.setPreferences({ ageRange: value })}
            />
          )}
          {step === 4 && (
            <LevelScene
              selected={prefs.startingPoint}
              onSelect={(value) => {
                const index = startingPoints.findIndex((point) => point.id === value);
                prefs.setPreferences({
                  startingPoint: value,
                  level: index < 2 ? 'Beginner' : 'Intermediate',
                });
                lookTo((index - 1.5) * 2);
                react('happy', 'Perfect. Let’s start right where you are.');
              }}
            />
          )}
          {step === 5 && (
            <ClassicDailyScene
              minutes={prefs.dailyMinutes}
              onSelect={(value) => prefs.setPreferences({ dailyMinutes: value })}
            />
          )}
          {step === 6 && (
            <>
              <ReminderScene
                selected={prefs.reminderHour}
                onSelect={(hour) => prefs.setPreferences({ reminderHour: hour })}
              />
              {Platform.OS === 'web' && (
                <Text style={s.footerNote}>
                  Reminders can be enabled later in Profile on mobile.
                </Text>
              )}
              {!!reminderError && (
                <Text accessibilityLiveRegion="polite" style={s.reminderError}>
                  {reminderError}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => void skipReminder()}
                style={s.notNow}
              >
                <Text style={s.notNowText}>Not now</Text>
              </Pressable>
            </>
          )}
          {step === 7 && <FutureReveal minutes={prefs.dailyMinutes} />}
          {step === 8 && <CourseReadyScene interests={prefs.learningInterests} />}
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}

const s = StyleSheet.create({
  scene: { flex: 1, gap: 6 },
  pandaStage: {
    minHeight: 175,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 2,
  },
  firstLessonPanda: { minHeight: 128, paddingTop: 0 },
  pandaHalo: {
    position: 'absolute',
    width: 184,
    height: 116,
    borderRadius: 92,
    backgroundColor: colors.ice,
    top: 25,
  },
  bubble: {
    position: 'absolute',
    right: 0,
    top: 7,
    maxWidth: 147,
    backgroundColor: ivory,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  bubbleText: { fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.ink },
  content: { gap: 16, paddingBottom: 20 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: {
    color: colors.ink,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.8,
    fontWeight: '800',
  },
  compactTitle: { fontSize: 26, lineHeight: 31 },
  cta: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.primary,
  },
  ctaDisabled: { backgroundColor: colors.border },
  ctaPressed: { opacity: 0.85, transform: [{ translateY: 2 }] },
  ctaText: { color: ivory, fontSize: 16, fontWeight: '800' },
  ctaTextDisabled: { color: colors.muted },
  footerNote: { fontSize: 11, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  streakNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.ice,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  streakTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  streakCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  reminderError: { color: '#A23D4B', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  notNow: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notNowText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
