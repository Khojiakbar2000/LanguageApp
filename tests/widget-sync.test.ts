import { describe, it, expect, vi } from 'vitest';
import { createWidgetSyncQueue } from '../src/features/panda-widget/syncQueue';
const old = { practiceDay: '2026-11-03', streak: 8, turns: 2 },
  empty = { practiceDay: '', streak: 0, turns: 0 };
describe('native widget synchronization ownership', () => {
  it('lets a queued sign-out clear data after a delayed authenticated write', async () => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const write = vi
      .fn()
      .mockImplementationOnce(() => hold)
      .mockResolvedValue(undefined);
    const enqueue = createWidgetSyncQueue(write);
    const first = enqueue(old);
    const last = enqueue(empty);
    release();
    await Promise.all([first, last]);
    expect(write.mock.calls.map((c) => c[0])).toEqual([old, empty]);
  });
  it('does not strand a newer sign-out behind a failed older update', async () => {
    let fail!: (error: Error) => void;
    const hold = new Promise<void>((_, reject) => {
      fail = reject;
    });
    const write = vi
      .fn()
      .mockImplementationOnce(() => hold)
      .mockResolvedValue(undefined);
    const enqueue = createWidgetSyncQueue(write);
    const first = enqueue(old);
    const last = enqueue(empty);
    fail(new Error('offline fixture'));
    await Promise.all([first, last]);
    expect(write).toHaveBeenLastCalledWith(empty);
  });
});
