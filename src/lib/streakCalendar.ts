export type StreakDayStatus =
  'practice' | 'protected' | 'missed' | 'today' | 'future' | 'untracked' | 'unknown';

export type StreakDayRecord = {
  learning_date: string;
  qualifying_activity_count: number;
  day_status: 'practice' | 'protected' | 'missed';
  total_xp: number;
};

const utcDate = (day: string) => new Date(`${day}T12:00:00.000Z`);
export function shiftLearningDate(day: string, amount: number) {
  const date = utcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function mondayStart(day: string) {
  const date = utcDate(day);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return shiftLearningDate(day, -mondayOffset);
}

export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const values: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    values.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (values.length % 7) values.push(null);
  return Array.from({ length: values.length / 7 }, (_, row) => values.slice(row * 7, row * 7 + 7));
}

export function dateInTimezone(timestamp: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function streakDayStatus({
  date,
  today,
  trackingStart,
  record,
  loaded,
}: {
  date: string;
  today: string;
  trackingStart: string;
  record?: StreakDayRecord;
  loaded: boolean;
}): StreakDayStatus {
  if (!loaded) return 'unknown';
  if (date < trackingStart) return 'untracked';
  if (date > today) return 'future';
  if (record?.qualifying_activity_count) return 'practice';
  if (record?.day_status === 'protected') return 'protected';
  if (date === today) return 'today';
  return 'missed';
}

export function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1, 12)));
}

export function monthBounds(year: number, month: number) {
  return {
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end: `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(Date.UTC(year, month + 1, 0)).getUTCDate()).padStart(2, '0')}`,
  };
}
