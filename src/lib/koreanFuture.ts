export const dailyMinuteOptions = [10, 15, 30, 45, 60, 90, 120] as const;
export type DailyMinutes = (typeof dailyMinuteOptions)[number];
export const learningDreams = [
  {
    id: 'everyday',
    title: 'Everyday Korean',
    description: 'Have comfortable everyday conversations.',
    icon: '🌱',
  },
  {
    id: 'confident',
    title: 'Confident Speaker',
    description: 'Express yourself naturally in Korean.',
    icon: '💬',
  },
  {
    id: 'advanced',
    title: 'Advanced Korean',
    description: 'Work toward advanced proficiency and TOPIK 5–6.',
    icon: '🎓',
  },
] as const;
export const startingPoints = [
  {
    id: 'complete_beginner',
    title: 'Complete beginner',
    hint: 'A fresh page. A good place to begin.',
  },
  {
    id: 'some_expressions',
    title: 'Know a few Korean expressions',
    hint: 'You already have a little spark.',
  },
  {
    id: 'basic_conversations',
    title: 'Can have basic conversations',
    hint: 'Let’s build on what you know.',
  },
  {
    id: 'intermediate',
    title: 'Intermediate speaker',
    hint: 'More nuance. More of your own voice.',
  },
] as const;
export type LearningDream = (typeof learningDreams)[number]['id'];
export type StartingPoint = (typeof startingPoints)[number]['id'];
export const ageRanges = ['18–24', '25–34', '35–44', '45–54', '55+', 'Prefer not to say'] as const;
export type AgeRange = (typeof ageRanges)[number];
export const learningInterests = [
  'Everyday life',
  'Food & cafés',
  'Travel',
  'People & culture',
  'Work',
  'Study',
] as const;
export const practiceMilestones = [50, 100, 200, 500] as const;
export const timelineDays = [30, 90, 180, 365] as const;
function positive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be a positive finite number.`);
}
export function practiceHours(dailyMinutes: number, days: number): number {
  positive(dailyMinutes, 'Daily minutes');
  if (!Number.isFinite(days) || days < 0)
    throw new RangeError('Days must be a nonnegative finite number.');
  return (dailyMinutes * days) / 60;
}
export function annualHours(dailyMinutes: number): number {
  return practiceHours(dailyMinutes, 365);
}
export function daysToMilestone(targetHours: number, dailyMinutes: number): number {
  positive(targetHours, 'Target hours');
  positive(dailyMinutes, 'Daily minutes');
  return (targetHours * 60) / dailyMinutes;
}
// Whole hours everywhere; keep the calculations themselves unrounded.
export function displayHours(hours: number): string {
  return Math.round(hours).toLocaleString('en-US');
}
export function calendarTime(days: number): string {
  positive(days, 'Days');
  const total = Math.ceil(days);
  if (total < 60) return `About ${total} days`;
  if (total < 365) return `About ${Math.ceil(total / (365 / 12))} months`;
  const years = Math.floor(total / 365);
  const months = Math.ceil((total % 365) / (365 / 12));
  const fullYears = years + (months === 12 ? 1 : 0);
  return `About ${fullYears} ${fullYears === 1 ? 'year' : 'years'}${months > 0 && months < 12 ? `, ${months} ${months === 1 ? 'month' : 'months'}` : ''}`;
}
export interface FutureProfilePatch {
  learning_goal: LearningDream;
  starting_level: StartingPoint;
  daily_goal_minutes: DailyMinutes;
  daily_reminders_enabled?: boolean;
  daily_reminder_hour?: number;
  onboarding_completed_at: string;
}
export function validFutureProfile(value: unknown): value is FutureProfilePatch {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    learningDreams.some((g) => g.id === v.learning_goal) &&
    startingPoints.some((p) => p.id === v.starting_level) &&
    dailyMinuteOptions.includes(v.daily_goal_minutes as DailyMinutes) &&
    (v.daily_reminders_enabled === undefined || typeof v.daily_reminders_enabled === 'boolean') &&
    (v.daily_reminder_hour === undefined ||
      (Number.isInteger(v.daily_reminder_hour) &&
        (v.daily_reminder_hour as number) >= 0 &&
        (v.daily_reminder_hour as number) <= 23)) &&
    typeof v.onboarding_completed_at === 'string' &&
    Number.isFinite(Date.parse(v.onboarding_completed_at))
  );
}
