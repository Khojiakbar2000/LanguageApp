import { describe, expect, it } from 'vitest';
import {
  dateInTimezone,
  monthBounds,
  monthGrid,
  monthTitle,
  mondayStart,
  shiftLearningDate,
  streakDayStatus,
} from '../src/lib/streakCalendar';

describe('timezone-aware streak calendar', () => {
  it('uses Monday-first weeks and correctly pads month and year boundaries', () => {
    const march = monthGrid(2026, 2);
    expect(march).toHaveLength(6);
    expect(march[0]).toEqual([null, null, null, null, null, null, '2026-03-01']);
    expect(march.at(-1)?.at(-1)).toBeNull();
    expect(march.flat().filter(Boolean)).toHaveLength(31);
    expect(monthBounds(2025, 11)).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(monthTitle(2025, 0)).toMatch(/January 2025/);
  });

  it('moves weeks and dates across month and year boundaries without local clock drift', () => {
    expect(mondayStart('2026-11-08')).toBe('2026-11-02');
    expect(shiftLearningDate('2025-12-31', 1)).toBe('2026-01-01');
    expect(shiftLearningDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('assigns DST-transition timestamps to the correct local learning date', () => {
    expect(dateInTimezone('2026-03-08T09:59:00.000Z', 'America/Los_Angeles')).toBe('2026-03-08');
    expect(dateInTimezone('2026-03-08T10:00:00.000Z', 'America/Los_Angeles')).toBe('2026-03-08');
    expect(dateInTimezone('2026-11-01T08:30:00.000Z', 'America/Los_Angeles')).toBe('2026-11-01');
    expect(dateInTimezone('2026-11-01T09:30:00.000Z', 'America/Los_Angeles')).toBe('2026-11-01');
  });

  it('distinguishes real practice, protected, missed, today, future, untracked and loading days', () => {
    const base = { today: '2026-11-06', trackingStart: '2026-11-01', loaded: true };
    expect(
      streakDayStatus({
        ...base,
        date: '2026-11-03',
        record: {
          learning_date: '2026-11-03',
          qualifying_activity_count: 1,
          day_status: 'practice',
          total_xp: 15,
        },
      }),
    ).toBe('practice');
    expect(
      streakDayStatus({
        ...base,
        date: '2026-11-04',
        record: {
          learning_date: '2026-11-04',
          qualifying_activity_count: 0,
          day_status: 'protected',
          total_xp: 0,
        },
      }),
    ).toBe('protected');
    expect(streakDayStatus({ ...base, date: '2026-11-05' })).toBe('missed');
    expect(streakDayStatus({ ...base, date: '2026-11-06' })).toBe('today');
    expect(streakDayStatus({ ...base, date: '2026-11-07' })).toBe('future');
    expect(streakDayStatus({ ...base, trackingStart: '2026-11-06', date: '2026-11-05' })).toBe(
      'untracked',
    );
    expect(streakDayStatus({ ...base, date: '2026-11-05', loaded: false })).toBe('unknown');
  });
});
