import { describe, expect, it } from 'vitest';
import { lessons } from '../src/content/lessons';
import { activeStreak, todayTurns } from '../src/lib/learning';
import { tutorReplySchema, turnInputSchema } from '../supabase/functions/_shared/contracts';
import type { LearningStats } from '../src/lib/types';

describe('original curriculum', () => {
  it('has exactly twenty unique, complete, seedable lessons', () => {
    expect(lessons).toHaveLength(20);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(20);
    for (const l of lessons) {
      expect(l.objectives.length).toBeGreaterThanOrEqual(2);
      expect(l.expressions).toHaveLength(2);
      expect(l.scenario.length).toBeGreaterThan(70);
      expect(turnInputSchema.shape.lessonId.safeParse(l.id).success).toBe(true);
    }
    expect(new Set(lessons.map((l) => l.level)).size).toBe(3);
  });
});
const stats = {
  current_streak: 5,
  longest_streak: 8,
  daily_turns: 3,
  total_turns: 25,
  completed_sessions: 4,
  practice_seconds: 500,
  last_practice_date: '2026-11-01',
} satisfies LearningStats;
describe('honest progress display', () => {
  it('preserves yesterday’s streak but resets stale streaks', () => {
    expect(activeStreak(stats, new Date('2026-11-02T12:00Z'))).toBe(5);
    expect(activeStreak(stats, new Date('2026-11-03T12:00Z'))).toBe(0);
    expect(activeStreak(null)).toBe(0);
  });
  it('does not show yesterday’s replies as today’s progress', () => {
    expect(todayTurns(stats, new Date('2026-11-02T12:00Z'))).toBe(0);
    expect(todayTurns(stats, new Date('2026-11-01T23:59Z'))).toBe(3);
  });
});
describe('AI contract', () => {
  it('rejects unbounded or invented pronunciation-scoring fields', () => {
    expect(
      tutorReplySchema.safeParse({
        korean: '안녕하세요?',
        english: 'Hello?',
        encouragement: '',
        corrections: [],
        pronunciationScore: 99,
      }).success,
    ).toBe(false);
    expect(
      tutorReplySchema.safeParse({
        korean: 'a'.repeat(1201),
        english: 'Hello',
        encouragement: '',
        corrections: [],
      }).success,
    ).toBe(false);
  });
  it('rejects a caller-supplied user identity', () => {
    expect(
      turnInputSchema.safeParse({
        conversationId: lessons[0].id,
        requestId: lessons[1].id,
        lessonId: null,
        userId: lessons[2].id,
      }).success,
    ).toBe(false);
  });
});
