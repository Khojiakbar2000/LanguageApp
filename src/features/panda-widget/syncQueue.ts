import type { WidgetSnapshot } from './data';
// Serialize native writes so a delayed signed-in update cannot win over sign-out.
export function createWidgetSyncQueue(write: (snapshot: WidgetSnapshot) => Promise<void>) {
  let latest: WidgetSnapshot | null = null;
  let running: Promise<void> | null = null;
  return (snapshot: WidgetSnapshot) => {
    latest = snapshot;
    if (running) return running;
    running = (async () => {
      while (latest) {
        const next = latest;
        latest = null;
        try {
          await write(next);
        } catch {
          if (latest) continue;
          latest = next;
          break; // A future foreground/state update retries the latest snapshot.
        }
      }
    })().finally(() => {
      running = null;
    });
    return running;
  };
}
