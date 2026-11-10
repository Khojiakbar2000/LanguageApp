import { describe, it, expect } from 'vitest';
import {
  annualHours,
  practiceHours,
  daysToMilestone,
  displayHours,
  calendarTime,
  dailyMinuteOptions,
  practiceMilestones,
} from '../src/lib/koreanFuture';

describe('Korean future practice-time projections', () => {
  it.each(
    dailyMinuteOptions.map((minutes, i) => [
      minutes,
      [365 / 6, 91.25, 182.5, 273.75, 365, 547.5, 730][i],
    ]),
  )('projects %i minutes/day without early rounding', (minutes, hours) => {
    expect(annualHours(minutes)).toBeCloseTo(hours, 10);
    for (const days of [30, 90, 180, 365])
      expect(practiceHours(minutes, days)).toBeCloseTo((minutes * days) / 60, 10);
    for (const target of practiceMilestones) {
      const days = daysToMilestone(target, minutes);
      expect(practiceHours(minutes, days)).toBeCloseTo(target, 10);
    }
  });
  it('rounds displayed hours consistently and rounds calendar estimates up', () => {
    expect(displayHours(annualHours(10))).toBe('61');
    expect(displayHours(annualHours(30))).toBe('183');
    expect(displayHours(annualHours(60))).toBe('365');
    expect(calendarTime(daysToMilestone(50, 120))).toBe('About 25 days');
    expect(calendarTime(365)).toBe('About 1 year');
    expect(calendarTime(730)).toBe('About 2 years');
    expect(calendarTime(60)).toBe('About 2 months');
    expect(calendarTime(400)).toBe('About 1 year, 2 months');
  });
  it('rejects invalid calculations rather than showing misleading infinities', () => {
    for (const value of [0, -1, NaN, Infinity]) {
      expect(() => annualHours(value)).toThrow(RangeError);
      expect(() => daysToMilestone(50, value)).toThrow(RangeError);
      expect(() => daysToMilestone(value, 30)).toThrow(RangeError);
    }
    expect(practiceHours(30, 0)).toBe(0);
    expect(() => practiceHours(30, -1)).toThrow(RangeError);
  });
});
