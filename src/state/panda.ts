import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  defaultPanda,
  isPandaAppearance,
  pandaFromProfile,
  samePanda,
  type PandaAppearance,
} from '../lib/panda';

type AccountLook = { appearance: PandaAppearance; pending: boolean };
interface PandaState {
  hydrated: boolean;
  guest: PandaAppearance;
  guestPending: boolean;
  accounts: Record<string, AccountLook>;
  save: (appearance: PandaAppearance, userId: string | null) => void;
  claimGuest: (userId: string) => void;
  acceptProfile: (
    userId: string,
    profile: { panda_outfit?: unknown; panda_accessory?: unknown },
  ) => void;
  markSynced: (userId: string, expected: PandaAppearance) => void;
}
export const usePanda = create<PandaState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      guest: defaultPanda,
      guestPending: false,
      accounts: {},
      save: (appearance, userId) => {
        if (!isPandaAppearance(appearance))
          throw new Error('Choose a supported outfit and accessory.');
        if (userId)
          set((s) => ({ accounts: { ...s.accounts, [userId]: { appearance, pending: true } } }));
        else set({ guest: appearance, guestPending: true });
      },
      claimGuest: (userId) => {
        const s = get();
        if (!s.guestPending) return;
        set({
          guestPending: false,
          guest: defaultPanda,
          accounts: { ...s.accounts, [userId]: { appearance: s.guest, pending: true } },
        });
      },
      acceptProfile: (userId, profile) => {
        const s = get();
        if (s.accounts[userId]?.pending) return;
        set({
          accounts: {
            ...s.accounts,
            [userId]: { appearance: pandaFromProfile(profile), pending: false },
          },
        });
      },
      markSynced: (userId, expected) => {
        const s = get();
        const account = s.accounts[userId];
        if (account && samePanda(account.appearance, expected))
          set({ accounts: { ...s.accounts, [userId]: { ...account, pending: false } } });
      },
    }),
    {
      name: 'haru-panda',
      version: 2,
      migrate: (persisted, version) => {
        const saved =
          persisted && typeof persisted === 'object' ? (persisted as Partial<PandaState>) : {};
        return { ...saved, guest: version < 2 && !saved.guestPending ? defaultPanda : saved.guest };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ guest, guestPending, accounts }) => ({ guest, guestPending, accounts }),
      merge: (persisted, current) => {
        const saved =
          persisted && typeof persisted === 'object' ? (persisted as Partial<PandaState>) : {};
        const accounts: Record<string, AccountLook> = {};
        if (saved.accounts && typeof saved.accounts === 'object')
          for (const [id, look] of Object.entries(saved.accounts))
            if (look && isPandaAppearance(look.appearance))
              accounts[id] = { appearance: look.appearance, pending: look.pending === true };
        return {
          ...current,
          guest: isPandaAppearance(saved.guest) ? saved.guest : defaultPanda,
          guestPending: saved.guestPending === true,
          accounts,
        };
      },
      onRehydrateStorage: () => () => usePanda.setState({ hydrated: true }),
    },
  ),
);
export async function pandaReady() {
  if (usePanda.getState().hydrated) return;
  await new Promise<void>((resolve) => {
    const off = usePanda.subscribe((s) => {
      if (s.hydrated) {
        off();
        resolve();
      }
    });
    if (usePanda.getState().hydrated) {
      off();
      resolve();
    }
  });
}
