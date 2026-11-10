import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../src/lib/types';
import {
  defaultPanda,
  isPandaAppearance,
  pandaInputs,
  pandaOutfits,
  pandaAccessories,
} from '../src/lib/panda';
import { usePanda } from '../src/state/panda';
import { useApp, synchronizePandaProfile } from '../src/state/store';
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
    panda_outfit: 'blue',
    panda_accessory: 'headphones',
  }) as Profile;
beforeEach(async () => {
  mock.storage.clear();
  mock.fail = false;
  mock.updates.mockClear();
  await usePanda.persist.rehydrate();
  usePanda.setState({ hydrated: true, guest: defaultPanda, guestPending: false, accounts: {} });
  useApp.setState({ session: null });
});
describe('one-rig panda appearance and persistence', () => {
  it('maps maps legacy outfits to unchanged V2 fur and retains accessory controls', () => {
    for (const outfit of pandaOutfits)
      for (const [accessoryIndex, accessory] of pandaAccessories.entries()) {
        const appearance = { outfit: outfit.id, accessory: accessory.id };
        expect(isPandaAppearance(appearance)).toBe(true);
        expect(pandaInputs(appearance)).toEqual({ outfit: 3, accessory: accessoryIndex });
      }
    expect(isPandaAppearance({ outfit: 'unknown', accessory: 'hat' })).toBe(false);
    expect(isPandaAppearance({ outfit: 'pink', accessory: 'unknown' })).toBe(false);
  });
  it('retains an explicit guest choice across hydration, then claims it for one account', async () => {
    usePanda.getState().save({ outfit: 'pink', accessory: 'glasses' }, null);
    await usePanda.persist.rehydrate();
    expect(usePanda.getState().guest).toEqual({ outfit: 'pink', accessory: 'glasses' });
    useApp.setState({ session: session('a') });
    await synchronizePandaProfile('a', profile('a'));
    expect(mock.owner).toBe('a');
    expect(mock.updates).toHaveBeenCalledWith({ panda_outfit: 'pink', panda_accessory: 'glasses' });
    expect(usePanda.getState().guestPending).toBe(false);
    expect(usePanda.getState().accounts.a.pending).toBe(false);
  });
  it('keeps a failed save attached to its owner across sign-out and account switching', async () => {
    usePanda.getState().save({ outfit: 'pink', accessory: 'hat' }, null);
    useApp.setState({ session: session('a') });
    mock.fail = true;
    await expect(synchronizePandaProfile('a', profile('a'))).rejects.toThrow(
      'saved on this device',
    );
    expect(usePanda.getState().accounts.a.pending).toBe(true);
    useApp.setState({ session: session('b') });
    await synchronizePandaProfile('b', profile('b'));
    expect(mock.updates).toHaveBeenCalledTimes(1);
    expect(usePanda.getState().accounts.b.appearance).toEqual({
      outfit: 'blue',
      accessory: 'headphones',
    });
    expect(usePanda.getState().accounts.a.appearance).toEqual({ outfit: 'pink', accessory: 'hat' });
    mock.fail = false;
    useApp.setState({ session: session('a') });
    await synchronizePandaProfile('a', profile('a'));
    expect(mock.owner).toBe('a');
    expect(usePanda.getState().accounts.a.pending).toBe(false);
  });
  it('does not clear or overwrite a newer local selection with a stale server response', () => {
    usePanda.getState().save({ outfit: 'blue', accessory: 'glasses' }, 'a');
    usePanda.getState().save({ outfit: 'pink', accessory: 'none' }, 'a');
    usePanda.getState().markSynced('a', { outfit: 'blue', accessory: 'glasses' });
    usePanda.getState().acceptProfile('a', profile('a'));
    expect(usePanda.getState().accounts.a).toEqual({
      appearance: { outfit: 'pink', accessory: 'none' },
      pending: true,
    });
  });
  it('coalesces duplicate refreshes without duplicate writes', async () => {
    usePanda.getState().save({ outfit: 'blue', accessory: 'none' }, 'a');
    useApp.setState({ session: session('a') });
    await Promise.all([
      synchronizePandaProfile('a', profile('a')),
      synchronizePandaProfile('a', profile('a')),
    ]);
    expect(mock.updates).toHaveBeenCalledTimes(1);
  });
  it('falls back safely when cached appearance data is malformed', async () => {
    mock.storage.set(
      'haru-panda',
      JSON.stringify({
        version: 0,
        state: {
          guest: { outfit: 'bad', accessory: 'bad' },
          accounts: { a: { appearance: null } },
        },
      }),
    );
    await usePanda.persist.rehydrate();
    expect(usePanda.getState().guest).toEqual(defaultPanda);
    expect(usePanda.getState().accounts).toEqual({});
  });
});
