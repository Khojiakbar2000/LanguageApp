import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { lessons as catalog } from '../content/lessons';
import { withGuidedLessonContent } from '../content/lessonCatalog';
import { db, supabase } from '../lib/supabase';
import { errorMessage } from '../lib/learning';
import type {
  Conversation,
  Correction,
  LearningStats,
  Lesson,
  Profile,
  Progress,
  SavedExpression,
} from '../lib/types';

import { usePreferences, preferencesReady } from './preferences';
import { validFutureProfile } from '../lib/koreanFuture';
import { usePanda, pandaReady } from './panda';
import type { StreakSummary } from '../lib/database.types';
export { usePreferences } from './preferences';

interface AppState {
  initialized: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  lessons: Lesson[];
  catalogError: string | null;
  progress: Progress[];
  stats: LearningStats | null;
  streak: StreakSummary | null;
  expressions: SavedExpression[];
  corrections: Correction[];
  history: Conversation[];
  error: string | null;
  setSession: (session: Session | null) => void;
  refresh: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  clearError: () => void;
  saveExpression: (korean: string, english: string, note?: string) => Promise<void>;
  toggleLearned: (id: string, learned: boolean) => Promise<void>;
  removeExpression: (id: string) => Promise<void>;
  updateProfile: (
    patch: Partial<
      Pick<
        Profile,
        'display_name' | 'level' | 'goal' | 'daily_reminders_enabled' | 'daily_reminder_hour'
      >
    >,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}
const userEmpty = {
  profile: null,
  progress: [],
  stats: null,
  streak: null,
  expressions: [],
  corrections: [],
  history: [],
  error: null,
};
export const useApp = create<AppState>((set, get) => ({
  initialized: false,
  loading: false,
  session: null,
  lessons: withGuidedLessonContent(catalog),
  catalogError: null,
  ...userEmpty,
  clearError: () => set({ error: null }),
  setSession: (session) => {
    const changed = get().session?.user.id !== session?.user.id;
    set({
      ...(changed ? userEmpty : {}),
      session,
      initialized: true,
      loading: changed ? false : get().loading,
    });
  },
  loadCatalog: async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('lessons').select('*').order('sort_order');
    if (!error && data?.length)
      set({ lessons: withGuidedLessonContent(data as Lesson[]), catalogError: null });
    else if (error?.code === 'PGRST205')
      set({
        lessons: withGuidedLessonContent(catalog),
        catalogError:
          'Supabase is reachable, but its lesson tables are missing. Apply the project migrations to enable the live catalog and conversation context. Panda’s bundled lessons remain available.',
      });
    else if (error)
      set({
        lessons: withGuidedLessonContent(catalog),
        catalogError:
          'The live lesson catalog could not be loaded. Panda’s bundled lessons remain available; check the Supabase connection and try again.',
      });
    else
      set({
        lessons: withGuidedLessonContent(catalog),
        catalogError:
          'The live lesson catalog is empty. Run the Supabase lesson seed to add lessons.',
      });
  },
  refresh: async () => {
    const userId = get().session?.user.id;
    if (!userId) return;
    set({ loading: true, error: null });
    try {
      const client = db();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { error: timezoneError } = await client.rpc('set_streak_timezone', {
        p_timezone: timezone,
      });
      if (timezoneError) throw new Error(timezoneError.message);
      const results = await Promise.all([
        client.from('profiles').select('*').eq('id', userId).single(),
        client.from('lesson_progress').select('*').eq('user_id', userId),
        client.from('learning_stats').select('*').eq('user_id', userId).single(),
        client
          .from('saved_expressions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        client
          .from('corrections')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        client
          .from('conversations')
          .select('id,lesson_id,title,status,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        client.rpc('get_streak_summary'),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      if (get().session?.user.id !== userId) return;
      const remoteProfile = results[0].data as unknown as Profile;
      let profile = remoteProfile;
      let syncError: string | null = null;
      try {
        profile = await synchronizeFutureProfile(userId, remoteProfile);
      } catch (error) {
        syncError = errorMessage(error);
      }
      try {
        profile = await synchronizePandaProfile(userId, profile);
      } catch (error) {
        syncError = [syncError, errorMessage(error)].filter(Boolean).join(' ');
      }
      if (get().session?.user.id !== userId) return;
      if (profile.daily_reminder_hour !== undefined)
        usePreferences.getState().setPreferences({ reminderHour: profile.daily_reminder_hour });
      void import('../lib/dailyReminder')
        .then(({ syncDailyLearningReminder }) =>
          syncDailyLearningReminder(
            profile.daily_reminders_enabled ?? false,
            profile.daily_reminder_hour ?? 18,
          ),
        )
        .catch(() => undefined);
      set({
        profile,
        error: syncError,
        progress: results[1].data as unknown as Progress[],
        stats: results[2].data as unknown as LearningStats,
        streak: results[6].data as StreakSummary,
        expressions: results[3].data as unknown as SavedExpression[],
        corrections: results[4].data as unknown as Correction[],
        history: results[5].data as unknown as Conversation[],
      });
    } catch (error) {
      if (get().session?.user.id === userId) set({ error: errorMessage(error) });
    } finally {
      if (get().session?.user.id === userId) set({ loading: false });
    }
  },
  saveExpression: async (korean, english, note = '') => {
    const userId = get().session?.user.id;
    if (!userId) throw new Error('Sign in to save expressions.');
    const { error } = await db()
      .from('saved_expressions')
      .upsert(
        { user_id: userId, korean, english, note },
        { onConflict: 'user_id,korean', ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    await get().refresh();
  },
  toggleLearned: async (id, learned) => {
    const { error } = await db()
      .from('saved_expressions')
      .update({ learned })
      .eq('id', id)
      .eq('user_id', get().session?.user.id ?? '');
    if (error) throw new Error(error.message);
    await get().refresh();
  },
  removeExpression: async (id) => {
    const { error } = await db()
      .from('saved_expressions')
      .delete()
      .eq('id', id)
      .eq('user_id', get().session?.user.id ?? '');
    if (error) throw new Error(error.message);
    await get().refresh();
  },
  updateProfile: async (patch) => {
    const { error } = await db()
      .from('profiles')
      .update(patch)
      .eq('id', get().session?.user.id ?? '');
    if (error) throw new Error(error.message);
    if (patch.level && patch.goal)
      usePreferences.getState().setPreferences({ level: patch.level, goal: patch.goal });
    await get().refresh();
  },
  signOut: async () => {
    const { error } = await db().auth.signOut();
    if (error) throw new Error(error.message);
    await import('../lib/dailyReminder')
      .then(({ syncDailyLearningReminder }) => syncDailyLearningReminder(false))
      .catch(() => undefined);
    set({ ...userEmpty, session: null });
  },
}));

const futureSyncs = new Map<string, Promise<Profile>>();
export async function synchronizeFutureProfile(userId: string, profile: Profile): Promise<Profile> {
  await preferencesReady();
  if (useApp.getState().session?.user.id !== userId) return profile;
  if (futureSyncs.has(userId)) return futureSyncs.get(userId)!;
  const work = async () => {
    const local = usePreferences.getState();
    const pending = local.futurePendingProfile;
    if (pending && (!local.futureSyncOwner || local.futureSyncOwner === userId)) {
      // Claim the guest draft before sending, so a later account cannot receive it.
      local.setPreferences({ futureSyncOwner: userId });
      const { data, error } = await db()
        .from('profiles')
        .update(pending)
        .eq('id', userId)
        .select('*')
        .single();
      if (error)
        throw new Error(
          'Your learning plan is saved on this device. We’ll retry syncing it when your account reconnects.',
        );
      if (useApp.getState().session?.user.id !== userId) return profile;
      if (
        JSON.stringify(usePreferences.getState().futurePendingProfile) === JSON.stringify(pending)
      ) {
        usePreferences.getState().setPreferences({ futurePendingProfile: null });
      }
      return data as Profile;
    }
    if (validFutureProfile(profile) && !local.futureInProgress) {
      local.setPreferences({
        onboarded: true,
        learningDream: profile.learning_goal,
        startingPoint: profile.starting_level,
        dailyMinutes: profile.daily_goal_minutes,
        onboardingCompletedAt: profile.onboarding_completed_at,
        futureSyncOwner: pending ? local.futureSyncOwner : userId,
      });
    }
    return profile;
  };
  const task = work();
  futureSyncs.set(userId, task);
  try {
    return await task;
  } finally {
    futureSyncs.delete(userId);
  }
}

const pandaSyncs = new Map<string, Promise<Profile>>();
export async function synchronizePandaProfile(userId: string, profile: Profile): Promise<Profile> {
  await pandaReady();
  if (useApp.getState().session?.user.id !== userId) return profile;
  if (pandaSyncs.has(userId)) return pandaSyncs.get(userId)!;
  const work = async () => {
    usePanda.getState().claimGuest(userId);
    const local = usePanda.getState().accounts[userId];
    if (local?.pending) {
      const { data, error } = await db()
        .from('profiles')
        .update({
          panda_outfit: local.appearance.outfit,
          panda_accessory: local.appearance.accessory,
        })
        .eq('id', userId)
        .select('*')
        .single();
      if (error)
        throw new Error('Dori’s look is saved on this device. Retry when your account reconnects.');
      if (useApp.getState().session?.user.id !== userId) return profile;
      usePanda.getState().markSynced(userId, local.appearance);
      return data as Profile;
    }
    usePanda.getState().acceptProfile(userId, profile);
    return profile;
  };
  const task = work();
  pandaSyncs.set(userId, task);
  try {
    return await task;
  } finally {
    pandaSyncs.delete(userId);
  }
}

export async function initializeApp() {
  if (!supabase) {
    useApp.setState({ initialized: true });
    return () => {};
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    useApp.getState().setSession(data.session);
    if (error) useApp.setState({ error: error.message });
    if (data.session) void useApp.getState().refresh();
  } catch {
    useApp.setState({
      initialized: true,
      error: 'Your saved session could not be restored. Please sign in again.',
    });
  }
  void useApp.getState().loadCatalog();
  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    useApp.getState().setSession(session);
    if (session)
      setTimeout(() => {
        void useApp.getState().refresh();
      }, 0);
  });
  return () => subscription.subscription.unsubscribe();
}
