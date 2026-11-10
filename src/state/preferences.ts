import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Goal, Level } from '../lib/types';
import {
  dailyMinuteOptions,
  validFutureProfile,
  type DailyMinutes,
  type AgeRange,
  type FutureProfilePatch,
  type LearningDream,
  type StartingPoint,
} from '../lib/koreanFuture';

interface PreferenceValues {
  onboarded: boolean;
  level: Level;
  goal: Goal;
  captions: boolean;
  dailyMinutes: DailyMinutes;
  learningInterests: string[];
  ageRange: AgeRange | null;
  reminderHour: number;
  reminderEnabled: boolean;
  learningDream: LearningDream | null;
  startingPoint: StartingPoint | null;
  futureStep: number;
  onboardingFlowVersion: number;
  firstPhraseDone: boolean;
  firstPhraseAttempted: boolean;
  futureInProgress: boolean;
  onboardingCompletedAt: string | null;
  futurePendingProfile: FutureProfilePatch | null;
  futureSyncOwner: string | null;
}
interface Preferences extends PreferenceValues {
  hydrated: boolean;
  setHydrated: () => void;
  setPreferences: (patch: Partial<PreferenceValues>) => void;
  completeFuture: (userId: string | null) => void;
}
export const usePreferences = create<Preferences>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      level: 'Beginner',
      goal: 'Daily Conversation',
      captions: true,
      dailyMinutes: 30,
      learningInterests: [],
      ageRange: null,
      reminderHour: 18,
      reminderEnabled: false,
      learningDream: null,
      startingPoint: null,
      futureStep: 0,
      onboardingFlowVersion: 5,
      firstPhraseDone: false,
      firstPhraseAttempted: false,
      futureInProgress: false,
      onboardingCompletedAt: null,
      futurePendingProfile: null,
      futureSyncOwner: null,
      setHydrated: () => set({ hydrated: true }),
      setPreferences: (patch) => set(patch),
      completeFuture: (userId) => {
        const current = get();
        if (!current.learningDream || !current.startingPoint)
          throw new Error('Choose your Korean dream and starting point first.');
        const completed = new Date().toISOString();
        set({
          onboarded: true,
          futureInProgress: false,
          onboardingCompletedAt: completed,
          futureSyncOwner: userId,
          futurePendingProfile: {
            learning_goal: current.learningDream,
            starting_level: current.startingPoint,
            daily_goal_minutes: current.dailyMinutes,
            daily_reminders_enabled: current.reminderEnabled,
            daily_reminder_hour: current.reminderHour,
            onboarding_completed_at: completed,
          },
        });
      },
    }),
    {
      name: 'haru-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        hydrated: _hydrated,
        setHydrated: _setHydrated,
        setPreferences: _setPreferences,
        completeFuture: _completeFuture,
        ...values
      }) => values,
      // Keep existing completion/lesson preferences while upgrading older minute options.
      merge: (persisted, current) => {
        const saved =
          persisted && typeof persisted === 'object'
            ? (persisted as Partial<PreferenceValues>)
            : {};
        return {
          ...current,
          ...saved,
          dailyMinutes: dailyMinuteOptions.includes(saved.dailyMinutes as DailyMinutes)
            ? saved.dailyMinutes!
            : 30,
          learningInterests: Array.isArray(saved.learningInterests)
            ? saved.learningInterests.filter((item): item is string =>
                [
                  'Everyday life',
                  'Food & cafés',
                  'Travel',
                  'People & culture',
                  'Work',
                  'Study',
                ].includes(item),
              )
            : [],
          ageRange: ['18–24', '25–34', '35–44', '45–54', '55+', 'Prefer not to say'].includes(
            saved.ageRange ?? '',
          )
            ? saved.ageRange!
            : null,
          reminderHour:
            Number.isInteger(saved.reminderHour) &&
            saved.reminderHour! >= 6 &&
            saved.reminderHour! <= 22
              ? saved.reminderHour!
              : 18,
          reminderEnabled: saved.reminderEnabled === true,
          futureStep: Number.isInteger(saved.futureStep)
            ? Math.max(
                0,
                Math.min(
                  8,
                  saved.onboardingFlowVersion === 5
                    ? saved.futureStep!
                    : saved.onboardingFlowVersion === 4
                      ? [0, 1, 4, 5, 7][Math.max(0, Math.min(4, saved.futureStep!))]
                      : saved.onboardingFlowVersion === 3 || saved.onboardingFlowVersion === 2
                        ? [1, 4, 0, 5, 7][Math.max(0, Math.min(4, saved.futureStep!))]
                        : [1, 4, 5, 7][Math.max(0, Math.min(3, saved.futureStep!))],
                ),
              )
            : 0,
          onboardingFlowVersion: 5,
          firstPhraseDone: saved.firstPhraseDone === true,
          firstPhraseAttempted: saved.firstPhraseAttempted === true,
          futurePendingProfile: validFutureProfile(saved.futurePendingProfile)
            ? saved.futurePendingProfile
            : null,
          learningDream: ['everyday', 'confident', 'advanced'].includes(saved.learningDream ?? '')
            ? saved.learningDream!
            : null,
          startingPoint: [
            'complete_beginner',
            'some_expressions',
            'basic_conversations',
            'intermediate',
          ].includes(saved.startingPoint ?? '')
            ? saved.startingPoint!
            : null,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated();
        else usePreferences.setState({ hydrated: true });
      },
    },
  ),
);
export async function preferencesReady() {
  if (usePreferences.getState().hydrated) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = usePreferences.subscribe((state) => {
      if (state.hydrated) {
        unsubscribe();
        resolve();
      }
    });
    if (usePreferences.getState().hydrated) {
      unsubscribe();
      resolve();
    }
  });
}
