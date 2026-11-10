import { useApp } from '../state/store';
import { usePanda } from '../state/panda';
import { defaultPanda, type PandaAppearance } from '../lib/panda';
export function usePandaAppearance(): PandaAppearance {
  const userId = useApp((s) => s.session?.user.id);
  const appearance = usePanda((s) =>
    userId ? (s.accounts[userId]?.appearance ?? defaultPanda) : s.guest,
  );
  // Preserve saved accessories; legacy hoodie selections never recolor V2 fur.
  return { ...appearance, outfit: 'original' };
}
