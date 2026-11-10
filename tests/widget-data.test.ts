import { describe, expect, it } from 'vitest';
import type { LearningStats } from '../src/lib/types';
import type { StreakSummary } from '../src/lib/database.types';
import {
  widgetSnapshot,
  widgetProps,
  widgetTimeline,
  widgetPhrases,
} from '../src/features/panda-widget/data';
const stats = (patch: object = {}) =>
  ({
    last_practice_date: '2026-11-03',
    current_streak: 5,
    daily_turns: 2,
    display_name: 'Private fixture',
    access_token: 'never-share-this-fixture',
    ...patch,
  }) as unknown as LearningStats;
describe('native widget public snapshot', () => {
  it('exports only public aggregate fields and normalizes invalid counts', () => {
    expect(widgetSnapshot(stats())).toEqual({ practiceDay: '2026-11-03', streak: 5, turns: 2 });
    expect(widgetSnapshot(null)).toEqual({ practiceDay: '', streak: 0, turns: 0 });
    expect(widgetSnapshot(stats({ daily_turns: 999, current_streak: -1 }))).toEqual({
      practiceDay: '2026-11-03',
      streak: 0,
      turns: 3,
    });
    expect(
      widgetSnapshot(
        stats({ daily_turns: NaN, current_streak: Infinity, last_practice_date: 'invalid' }),
      ),
    ).toEqual({ practiceDay: '', streak: 36500, turns: 0 });
  });
  it('matches the app UTC day, resets progress at midnight, and expires an inactive streak', () => {
    const snapshot = widgetSnapshot(stats());
    expect(widgetProps(snapshot, new Date('2026-11-03T23:59:59Z'))).toMatchObject({
      streak: 5,
      turns: 2,
    });
    expect(widgetProps(snapshot, new Date('2026-11-04T00:00:00Z'))).toMatchObject({
      streak: 5,
      turns: 0,
    });
    expect(widgetProps(snapshot, new Date('2026-11-05T00:00:00Z'))).toMatchObject({
      streak: 0,
      turns: 0,
    });
  });
  it('uses the server timezone and available freezes for the streak in native widgets', () => {
    const summary = {
      today: '2026-11-07',
      timezone: 'Pacific/Kiritimati',
      current_streak: 7,
      last_qualifying_date: '2026-11-06',
      longest_streak: 9,
      streak_freezes_available: 1,
      total_xp: 200,
      total_practice_days: 12,
      next_milestone: 14,
      user_id: 'fixture',
      week: [],
    } satisfies StreakSummary;
    const snapshot = widgetSnapshot(stats(), summary);
    expect(widgetProps(snapshot, new Date('2026-11-06T12:00:00Z')).streak).toBe(7);
    expect(widgetProps(snapshot, new Date('2026-11-07T12:00:00Z')).streak).toBe(7);
    expect(widgetProps(snapshot, new Date('2026-11-08T12:00:00Z')).streak).toBe(0);
  });
  it('schedules a month of local daily entries without inventing future learning progress', () => {
    const entries = widgetTimeline(widgetSnapshot(stats()), new Date('2026-11-03T12:34:56Z'));
    expect(entries).toHaveLength(31);
    expect(entries[0].date.toISOString()).toBe('2026-11-03T12:34:56.000Z');
    expect(entries[1].date.toISOString()).toBe('2026-11-04T00:00:00.000Z');
    expect(entries.slice(1).every((e) => e.props.turns === 0)).toBe(true);
    expect(entries.slice(2).every((e) => e.props.streak === 0)).toBe(true);
    expect(widgetPhrases).toContainEqual({
      korean: entries[0].props.korean,
      english: entries[0].props.english,
    });
  });
});
