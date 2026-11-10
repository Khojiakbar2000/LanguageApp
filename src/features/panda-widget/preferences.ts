import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
type InvitationStatus = 'unseen' | 'shown' | 'dismissed' | 'requested';
export const useWidgetInvitation = create<{
  status: InvitationStatus;
  hydrated: boolean;
  record: (status: InvitationStatus) => void;
}>()(
  persist((set) => ({ status: 'unseen', hydrated: false, record: (status) => set({ status }) }), {
    name: 'haru-widget-invitation',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: ({ status }) => ({ status }),
    merge: (persisted, current) => {
      const status = (persisted as { status?: unknown } | null)?.status;
      return {
        ...current,
        status: ['shown', 'dismissed', 'requested'].includes(String(status))
          ? (status as InvitationStatus)
          : 'unseen',
      };
    },
    onRehydrateStorage: () => () => useWidgetInvitation.setState({ hydrated: true }),
  }),
);
