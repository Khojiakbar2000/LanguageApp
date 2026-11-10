import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Body,
  Button,
  Card,
  colors,
  ErrorNotice,
  Heading,
  Row,
  Screen,
} from '../src/components/ui';
import { StreakFlame } from '../src/components/StreakFlame';
import { db } from '../src/lib/supabase';
import {
  dateInTimezone,
  monthBounds,
  monthGrid,
  monthTitle,
  mondayStart,
  shiftLearningDate,
  streakDayStatus,
  type StreakDayRecord,
} from '../src/lib/streakCalendar';
import { useApp } from '../src/state/store';

const weekLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const milestones = [3, 7, 14, 30, 100, 365];

export default function StreakScreen() {
  const app = useApp();
  const userId = app.session?.user.id ?? null;
  const summary = app.streak;
  const hasSummary = !!summary;
  const timezone = summary?.timezone ?? app.stats?.timezone ?? 'UTC';
  const today = summary?.today ?? dateInTimezone(new Date().toISOString(), timezone);
  const [monthSelection, setMonthSelection] = useState<{ year: number; month: number } | null>(
    null,
  );
  const [weekSelection, setWeekSelection] = useState<string | null>(null);
  const month = monthSelection ?? {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  };
  const currentWeekStart = mondayStart(today);
  const weekStart = weekSelection ?? currentWeekStart;
  const [records, setRecords] = useState<Map<string, StreakDayRecord>>(new Map());
  const monthRange = monthBounds(month.year, month.month);
  const weekEnd = shiftLearningDate(weekStart, 6);
  const historyStart = monthRange.start < weekStart ? monthRange.start : weekStart;
  const historyEnd = monthRange.end > weekEnd ? monthRange.end : weekEnd;
  const historyKey = `${userId ?? 'guest'}:${historyStart}:${historyEnd}`;
  const [loadedHistoryKey, setLoadedHistoryKey] = useState<string | null>(null);
  const [historyFailure, setHistoryFailure] = useState<{ key: string; message: string } | null>(
    null,
  );
  const historyLoaded = loadedHistoryKey === historyKey;
  const historyError = historyFailure?.key === historyKey ? historyFailure.message : null;
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!userId || !hasSummary) return;
    void (async () => {
      const { data, error } = await db()
        .from('daily_learning_activity')
        .select('learning_date,qualifying_activity_count,day_status,total_xp')
        .eq('user_id', userId)
        .gte('learning_date', historyStart)
        .lte('learning_date', historyEnd)
        .order('learning_date', { ascending: true });
      if (!alive) return;
      if (error) throw new Error(error.message);
      setRecords(new Map((data ?? []).map((entry) => [entry.learning_date, entry])));
      setLoadedHistoryKey(historyKey);
    })().catch((error: unknown) => {
      if (!alive) return;
      setHistoryFailure({
        key: historyKey,
        message: error instanceof Error ? error.message : 'Streak history could not load.',
      });
    });
    return () => {
      alive = false;
    };
  }, [userId, hasSummary, historyKey, historyStart, historyEnd, retry]);

  const trackingStart = summary
    ? dateInTimezone(app.stats?.streak_started_at ?? new Date().toISOString(), timezone)
    : today;
  const daysForWeek = useMemo(
    () => Array.from({ length: 7 }, (_, index) => shiftLearningDate(weekStart, index)),
    [weekStart],
  );
  const monthWeeks = useMemo(() => monthGrid(month.year, month.month), [month.year, month.month]);
  const visibleRecords = userId && summary ? records : new Map<string, StreakDayRecord>();
  const visibleHistoryLoaded = !!userId && !!summary && historyLoaded;
  const monthPracticeDays = Array.from(visibleRecords.values()).filter(
    (record) =>
      record.learning_date.startsWith(
        `${month.year}-${String(month.month + 1).padStart(2, '0')}-`,
      ) && record.qualifying_activity_count > 0,
  ).length;
  const maxMonth = `${today.slice(0, 4)}-${today.slice(5, 7)}`;
  const currentSelectedMonth = `${month.year}-${String(month.month + 1).padStart(2, '0')}`;
  const canAdvanceMonth = currentSelectedMonth < maxMonth;
  const canAdvanceWeek = weekStart < currentWeekStart;
  const nextMilestone = summary?.next_milestone ?? null;
  const targetMilestone = nextMilestone ?? milestones.at(-1)!;
  const milestoneProgress = nextMilestone
    ? Math.min(1, (summary?.current_streak ?? 0) / targetMilestone)
    : 1;

  function shiftMonth(amount: number) {
    const date = new Date(Date.UTC(month.year, month.month + amount, 1, 12));
    setMonthSelection({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  }

  return (
    <Screen refreshing={app.loading} onRefresh={() => void app.refresh()}>
      <BackButton />
      <View style={{ alignItems: 'center', gap: 9, paddingTop: 6, paddingBottom: 4 }}>
        <StreakFlame size={42} />
        <Text style={{ color: '#E98124', fontSize: 36, lineHeight: 42, fontWeight: '900' }}>
          {summary?.current_streak ?? 0}-day streak
        </Text>
        <Body muted style={{ textAlign: 'center' }}>
          Keep your Korean journey going!
        </Body>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 15,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <SummaryStat label="Longest" value={`${summary?.longest_streak ?? 0} days`} />
        <View style={{ width: 1, height: 35, backgroundColor: colors.border }} />
        <SummaryStat label="Practice days" value={summary?.total_practice_days ?? 0} />
        <View style={{ width: 1, height: 35, backgroundColor: colors.border }} />
        <SummaryStat label="XP earned" value={summary?.total_xp ?? 0} />
      </View>

      <Card style={{ gap: 14, backgroundColor: '#EEF6FF' }}>
        <Row>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Ionicons name="shield-checkmark" color="#4F9BD7" size={24} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>
                {summary?.streak_freezes_available ?? 0} of 2 freezes available
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                One protects a missed day automatically.
              </Text>
            </View>
          </View>
        </Row>
      </Card>

      <View style={{ gap: 15 }}>
        <Row>
          <View style={{ gap: 3 }}>
            <Heading small>This week</Heading>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {weekRangeLabel(weekStart, shiftLearningDate(weekStart, 6))}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <CalendarArrow
              label="Previous week"
              icon="chevron-back"
              onPress={() => setWeekSelection(shiftLearningDate(weekStart, -7))}
            />
            <CalendarArrow
              label="Next week"
              icon="chevron-forward"
              disabled={!canAdvanceWeek}
              onPress={() => setWeekSelection(shiftLearningDate(weekStart, 7))}
            />
          </View>
        </Row>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
          {daysForWeek.map((date, index) => (
            <DayCell
              key={date}
              date={date}
              weekday={weekLabels[index]}
              today={today}
              trackingStart={trackingStart}
              record={visibleRecords.get(date)}
              loaded={visibleHistoryLoaded}
              size="week"
            />
          ))}
        </View>
        <Legend />
      </View>

      <View style={{ gap: 15 }}>
        <Row>
          <View style={{ gap: 3 }}>
            <Heading small>Streak calendar</Heading>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {monthPracticeDays} practice {monthPracticeDays === 1 ? 'day' : 'days'} this month
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CalendarArrow
              label="Previous month"
              icon="chevron-back"
              onPress={() => shiftMonth(-1)}
            />
            <Text
              style={{ minWidth: 102, textAlign: 'center', color: colors.ink, fontWeight: '700' }}
            >
              {monthTitle(month.year, month.month)}
            </Text>
            <CalendarArrow
              label="Next month"
              icon="chevron-forward"
              disabled={!canAdvanceMonth}
              onPress={() => shiftMonth(1)}
            />
          </View>
        </Row>
        <View style={{ gap: 7 }}>
          <View style={{ flexDirection: 'row' }}>
            {weekLabels.map((label) => (
              <Text
                key={label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  color: colors.muted,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {label.slice(0, 2)}
              </Text>
            ))}
          </View>
          {monthWeeks.map((week, rowIndex) => (
            <View key={`week-${rowIndex}`} style={{ flexDirection: 'row', gap: 4 }}>
              {week.map((date, dayIndex) =>
                date ? (
                  <DayCell
                    key={date}
                    date={date}
                    today={today}
                    trackingStart={trackingStart}
                    record={visibleRecords.get(date)}
                    loaded={visibleHistoryLoaded}
                    size="month"
                  />
                ) : (
                  <View
                    key={`blank-${rowIndex}-${dayIndex}`}
                    style={{ flex: 1, aspectRatio: 0.9 }}
                  />
                ),
              )}
            </View>
          ))}
        </View>
        <Legend />
        <ErrorNotice message={historyError} onRetry={() => setRetry((value) => value + 1)} />
        {userId && summary && !historyLoaded && !historyError && (
          <ActivityIndicator accessibilityLabel="Loading streak calendar" color={colors.primary} />
        )}
      </View>

      <Card style={{ gap: 12 }}>
        <Row>
          <View style={{ flex: 1, gap: 4 }}>
            <Heading small>
              {nextMilestone ? `Next milestone · ${nextMilestone} days` : 'All milestones earned'}
            </Heading>
            <Body muted>
              {nextMilestone
                ? `${summary?.current_streak ?? 0} of ${nextMilestone} days on your way.`
                : 'Keep your Korean practice going.'}
            </Body>
          </View>
          <Ionicons name={nextMilestone ? 'flag-outline' : 'ribbon'} size={26} color="#E99A38" />
        </Row>
        <View
          style={{ height: 8, borderRadius: 8, backgroundColor: colors.ice, overflow: 'hidden' }}
        >
          <View
            style={{
              width: `${milestoneProgress * 100}%`,
              height: 8,
              borderRadius: 8,
              backgroundColor: '#F0A43B',
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}

function BackButton() {
  return <Button title="Back to Haru" secondary icon="arrow-back" onPress={() => router.back()} />;
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function CalendarArrow({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: 'chevron-back' | 'chevron-forward';
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
        backgroundColor: pressed ? colors.ice : 'transparent',
        opacity: disabled ? 0.35 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
    </Pressable>
  );
}

function DayCell({
  date,
  weekday,
  today,
  trackingStart,
  record,
  loaded,
  size,
}: {
  date: string;
  weekday?: string;
  today: string;
  trackingStart: string;
  record?: StreakDayRecord;
  loaded: boolean;
  size: 'week' | 'month';
}) {
  const status = streakDayStatus({ date, today, trackingStart, record, loaded });
  const isToday = date === today;
  const compact = size === 'month';
  const dayNumber = String(Number(date.slice(8, 10)));
  const statusLabel = {
    practice: 'completed practice',
    protected: 'protected by a streak freeze',
    missed: 'missed',
    today: 'today, not completed',
    future: 'future day',
    untracked: 'before streak tracking began',
    unknown: 'activity unavailable',
  }[status];
  const background =
    status === 'practice' ? '#F7A13C' : status === 'protected' ? '#DCEEFF' : 'transparent';
  const numberColor =
    status === 'practice'
      ? '#FFFFFF'
      : status === 'protected'
        ? '#347DB5'
        : status === 'missed'
          ? '#8492A7'
          : colors.ink;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${weekday ? `${weekday}, ` : ''}${date}: ${statusLabel}`}
      style={{ flex: 1, alignItems: 'center', gap: 6 }}
    >
      {weekday ? (
        <Text style={{ color: colors.muted, fontSize: 9, fontWeight: '700' }}>{weekday}</Text>
      ) : null}
      <View
        style={{
          width: compact ? '100%' : 38,
          maxWidth: compact ? 40 : 38,
          aspectRatio: compact ? 0.9 : 1,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          borderWidth: isToday ? 2 : status === 'future' || status === 'today' ? 1 : 0,
          borderColor: isToday
            ? '#E89A3A'
            : status === 'future' || status === 'today'
              ? colors.border
              : 'transparent',
        }}
      >
        {status === 'practice' ? (
          <StreakFlame size={compact ? 13 : 17} />
        ) : status === 'protected' ? (
          <Ionicons name="shield-checkmark" color="#3F8CC9" size={compact ? 14 : 18} />
        ) : (
          <Text
            style={{
              color: numberColor,
              fontSize: compact ? 11 : 12,
              fontWeight: isToday ? '800' : '600',
              opacity:
                status === 'future' || status === 'untracked' || status === 'unknown' ? 0.58 : 1,
            }}
          >
            {dayNumber}
          </Text>
        )}
      </View>
      {status === 'missed' && (
        <View
          style={{
            position: 'absolute',
            top: compact ? 31 : 39,
            width: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: '#ADB8C6',
          }}
        />
      )}
    </View>
  );
}

function Legend() {
  return (
    <View style={{ flexDirection: 'row', gap: 15, flexWrap: 'wrap' }}>
      <LegendItem label="Practice" icon={<StreakFlame size={12} />} />
      <LegendItem
        label="Freeze used"
        icon={<Ionicons name="shield-checkmark" color="#3F8CC9" size={14} />}
      />
      <LegendItem
        label="Missed"
        icon={<View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#ADB8C6' }} />}
      />
      <LegendItem
        label="Today"
        icon={
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: '#E89A3A',
            }}
          />
        }
      />
    </View>
  );
}

function LegendItem({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {icon}
      <Text style={{ color: colors.muted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

function weekRangeLabel(start: string, end: string) {
  const format = (day: string) =>
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${day}T12:00:00.000Z`),
    );
  return `${format(start)} – ${format(end)}`;
}
