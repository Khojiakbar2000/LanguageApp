import type { LearningStats } from './types';
export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);
export function activeStreak(stats: LearningStats | null, date = new Date()) {
  if (!stats?.last_practice_date) return 0;
  const today = utcDay(date);
  const yesterday = utcDay(new Date(date.getTime() - 86_400_000));
  return [today, yesterday].includes(stats.last_practice_date) ? stats.current_streak : 0;
}
export function todayTurns(stats: LearningStats | null, date = new Date()) {
  return stats?.last_practice_date === utcDay(date) ? stats.daily_turns : 0;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
