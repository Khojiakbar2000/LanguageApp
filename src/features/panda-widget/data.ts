import type { LearningStats } from '../../lib/types';
import { activeStreak, todayTurns } from '../../lib/learning';
import type { StreakSummary } from '../../lib/database.types';
export const widgetPhrases = [
  { korean: '오늘도 화이팅!', english: 'You’ve got this today!' },
  { korean: '오늘도 조금씩 성장해요.', english: 'Let’s improve a little every day.' },
  { korean: '천천히 해도 괜찮아요.', english: 'It’s okay to take your time.' },
  { korean: '작은 시작이 큰 변화를 만들어요.', english: 'Small beginnings make a big difference.' },
  { korean: '함께 한국어를 연습해요.', english: 'Let’s practice Korean together.' },
] as const;
export type WidgetSnapshot = {
  practiceDay: string;
  streak: number;
  turns: number;
  localToday?: string;
  timezone?: string;
  freezes?: number;
};
export type WidgetProps = { korean: string; english: string; streak: number; turns: number };
export function widgetSnapshot(
  stats: LearningStats | null,
  summary?: StreakSummary | null,
): WidgetSnapshot {
  if (summary) {
    return {
      practiceDay: summary.last_qualifying_date ?? '',
      streak: Math.max(0, Math.min(36500, Math.floor(summary.current_streak) || 0)),
      turns: Math.max(0, Math.min(3, Math.floor(stats?.daily_turns ?? 0) || 0)),
      localToday: summary.today,
      timezone: summary.timezone,
      freezes: summary.streak_freezes_available,
    };
  }
  return {
    practiceDay: /^\d{4}-\d{2}-\d{2}$/.test(stats?.last_practice_date ?? '')
      ? stats!.last_practice_date!
      : '',
    streak: Math.max(0, Math.min(36500, Math.floor(stats?.current_streak ?? 0) || 0)),
    turns: Math.max(0, Math.min(3, Math.floor(stats?.daily_turns ?? 0) || 0)),
  };
}
export function widgetProps(snapshot: WidgetSnapshot, date = new Date()): WidgetProps {
  const index =
    ((Math.floor(date.getTime() / 86400000) % widgetPhrases.length) + widgetPhrases.length) %
    widgetPhrases.length;
  const stats = {
    last_practice_date: snapshot.practiceDay,
    current_streak: snapshot.streak,
    daily_turns: snapshot.turns,
  } as LearningStats;
  let streak = activeStreak(stats, date);
  if (snapshot.localToday && snapshot.timezone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: snapshot.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const localDate = `${fields.year}-${fields.month}-${fields.day}`;
    const utcDayNumber = (value: string) => Date.parse(`${value}T00:00:00.000Z`) / 86_400_000;
    const offset = utcDayNumber(localDate) - utcDayNumber(snapshot.localToday);
    streak =
      offset === 0 || (offset > 0 && offset <= (snapshot.freezes ?? 0)) ? snapshot.streak : 0;
  }
  return {
    ...widgetPhrases[index],
    streak,
    turns: Math.min(todayTurns(stats, date), 3),
  };
}
export function widgetTimeline(snapshot: WidgetSnapshot, now = new Date()) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: 31 }, (_, i) => {
    const date = i === 0 ? now : new Date(midnight + i * 86400000);
    return { date, props: widgetProps(snapshot, date) };
  });
}
