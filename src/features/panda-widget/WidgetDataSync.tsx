import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useApp } from '../../state/store';
import { widgetSnapshot } from './data';
import { createWidgetSyncQueue } from './syncQueue';
import { syncNativeWidgets } from './widgetPlatform';
export const queueWidgetSnapshot = createWidgetSyncQueue(syncNativeWidgets);
export function WidgetDataSync() {
  const stats = useApp((s) => s.stats);
  const streak = useApp((s) => s.streak);
  const signedIn = useApp((s) => !!s.session);
  useEffect(() => {
    const refresh = () => {
      void queueWidgetSnapshot(widgetSnapshot(signedIn ? stats : null, signedIn ? streak : null));
    };
    refresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => listener.remove();
  }, [stats, streak, signedIn]);
  return null;
}
