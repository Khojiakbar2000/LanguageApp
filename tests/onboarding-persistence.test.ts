import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../src/lib/types';
import { usePreferences } from '../src/state/preferences';
import { useApp, synchronizeFutureProfile } from '../src/state/store';
const mock = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  fail: false,
  updates: vi.fn(),
  owner: '',
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mock.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mock.storage.set(key, value);
    },
    removeItem: async (key: string) => {
      mock.storage.delete(key);
    },
  },
}));
vi.mock('../src/lib/supabase', () => ({
  supabase: null,
  db: () => ({
    from: () => ({
      update: (patch: object) => {
        mock.updates(patch);
        return {
          eq: (_key: string, id: string) => {
            mock.owner = id;
            return {
              select: () => ({
                single: async () => ({
                  data: { id, ...patch },
                  error: mock.fail ? { message: 'offline' } : null,
                }),
              }),
            };
          },
        };
      },
    }),
  }),
}));
const session = (id: string) => ({ user: { id } }) as Session;
const profile = (id: string) =>
  ({
    id,
    display_name: 'Learner',
    level: 'Beginner',
    goal: 'Daily Conversation',
    created_at: '2026-11-03',
  }) as Profile;
beforeEach(async () => {
  mock.storage.clear();
  mock.fail = false;
  mock.updates.mockClear();
  await usePreferences.persist.rehydrate();
  usePreferences.setState({
    hydrated: true,
    onboarded: false,
    learningDream: null,
    startingPoint: null,
    dailyMinutes: 30,
    futureStep: 0,
    futureInProgress: false,
    onboardingCompletedAt: null,
    futurePendingProfile: null,
    futureSyncOwner: null,
    level: 'Beginner',
    goal: 'Daily Conversation',
  });
  useApp.setState({ session: null });
});
function finishGuest() {
  usePreferences.getState().setPreferences({
    learningDream: 'advanced',
    startingPoint: 'complete_beginner',
    dailyMinutes: 60,
  });
  usePreferences.getState().completeFuture(null);
}
describe('onboarding persistence and account ownership', () => {
  it('keeps the dream separate from starting level across storage hydration', async () => {
    finishGuest();
    await usePreferences.persist.rehydrate();
    expect(usePreferences.getState()).toMatchObject({
      onboarded: true,
      learningDream: 'advanced',
      startingPoint: 'complete_beginner',
      dailyMinutes: 60,
    });
    expect(usePreferences.getState().futurePendingProfile).toMatchObject({
      learning_goal: 'advanced',
      starting_level: 'complete_beginner',
      daily_goal_minutes: 60,
    });
  });
  it('claims a guest plan on sign-in and clears pending data only after successful sync', async () => {
    finishGuest();
    useApp.setState({ session: session('account-a') });
    await synchronizeFutureProfile('account-a', profile('account-a'));
    expect(mock.owner).toBe('account-a');
    expect(mock.updates).toHaveBeenCalledWith(
      expect.objectContaining({
        learning_goal: 'advanced',
        starting_level: 'complete_beginner',
        daily_goal_minutes: 60,
        onboarding_completed_at: expect.any(String),
      }),
    );
    expect(usePreferences.getState().futurePendingProfile).toBeNull();
  });
  it('retains failed saves for retry and never leaks them across accounts', async () => {
    finishGuest();
    useApp.setState({ session: session('account-a') });
    mock.fail = true;
    await expect(synchronizeFutureProfile('account-a', profile('account-a'))).rejects.toThrow(
      'saved on this device',
    );
    expect(usePreferences.getState().futurePendingProfile).not.toBeNull();
    useApp.setState({ session: session('account-b') });
    const returning = {
      ...profile('account-b'),
      learning_goal: 'everyday',
      starting_level: 'intermediate',
      daily_goal_minutes: 15,
      onboarding_completed_at: '2026-11-01T00:00:00Z',
    } as Profile;
    await synchronizeFutureProfile('account-b', returning);
    await synchronizeFutureProfile('account-b', returning);
    expect(mock.updates).toHaveBeenCalledTimes(1);
    expect(usePreferences.getState().futureSyncOwner).toBe('account-a');
    mock.fail = false;
    useApp.setState({ session: session('account-a') });
    await synchronizeFutureProfile('account-a', profile('account-a'));
    expect(usePreferences.getState().futurePendingProfile).toBeNull();
    expect(mock.updates).toHaveBeenCalledTimes(2);
  });
  it('restores completion from an existing account without overwriting an active draft', async () => {
    useApp.setState({ session: session('a') });
    const remote = {
      ...profile('a'),
      learning_goal: 'confident',
      starting_level: 'some_expressions',
      daily_goal_minutes: 45,
      onboarding_completed_at: '2026-11-01T00:00:00Z',
    } as Profile;
    await synchronizeFutureProfile('a', remote);
    expect(usePreferences.getState()).toMatchObject({
      onboarded: true,
      learningDream: 'confident',
      dailyMinutes: 45,
    });
    usePreferences.getState().setPreferences({ futureInProgress: true, dailyMinutes: 90 });
    await synchronizeFutureProfile('a', remote);
    expect(usePreferences.getState().dailyMinutes).toBe(90);
  });
  it('preserves returning legacy users when older minute options are upgraded', async () => {
    mock.storage.set(
      'haru-preferences',
      JSON.stringify({
        state: { onboarded: true, level: 'Advanced', dailyMinutes: 5 },
        version: 0,
      }),
    );
    await usePreferences.persist.rehydrate();
    expect(usePreferences.getState()).toMatchObject({
      onboarded: true,
      level: 'Advanced',
      dailyMinutes: 30,
    });
  });
  it('maps unfinished four-step drafts to the equivalent new scene', async () => {
    mock.storage.set(
      'haru-preferences',
      JSON.stringify({
        state: { futureStep: 2, futureInProgress: true, dailyMinutes: 45 },
        version: 0,
      }),
    );
    await usePreferences.persist.rehydrate();
    expect(usePreferences.getState()).toMatchObject({
      futureStep: 3,
      futureInProgress: true,
      dailyMinutes: 45,
      onboardingFlowVersion: 3,
    });
  });
  it('resumes a retired room-preview draft at the Korean Future reveal', async () => {
    mock.storage.set(
      'haru-preferences',
      JSON.stringify({
        state: { onboardingFlowVersion: 2, futureStep: 5, futureInProgress: true },
        version: 0,
      }),
    );
    await usePreferences.persist.rehydrate();
    expect(usePreferences.getState()).toMatchObject({
      futureStep: 4,
      futureInProgress: true,
      onboardingFlowVersion: 3,
    });
  });
});
