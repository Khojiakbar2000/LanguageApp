import { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StreakSummary } from '../lib/database.types';
import { colors } from './ui';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
function previousDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - offset);
  return dayKey(date);
}
function weekday(day: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${day}T12:00:00.000Z`),
  );
}

export function StreakDetails({
  visible,
  onClose,
  streak,
}: {
  visible: boolean;
  onClose: () => void;
  streak: StreakSummary | null;
}) {
  const [scale] = useState(() => new Animated.Value(0.96));
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.96);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18 }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, fade]);
  const days = useMemo(() => {
    if (!streak) return [];
    const entries = new Map(streak.week.map((day) => [day.date, day]));
    return Array.from({ length: 7 }, (_, i) => {
      const date = previousDay(streak.today, 6 - i);
      return { date, item: entries.get(date), current: date === streak.today };
    });
  }, [streak]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: '#081F5C66',
          opacity: fade,
        }}
      >
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          accessibilityLabel="Close streak details"
        />
        <Animated.View
          accessibilityViewIsModal
          style={{
            transform: [{ scale }],
            backgroundColor: colors.paper,
            paddingHorizontal: 22,
            paddingTop: 13,
            paddingBottom: 34,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            gap: 20,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 42,
              height: 4,
              borderRadius: 4,
              backgroundColor: colors.border,
            }}
          />
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '800' }}>
                Your streak
              </Text>
              <Text style={{ color: colors.muted }}>Little moments add up.</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
            >
              <Ionicons name="close-circle" size={28} color={colors.sky} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View
              style={{ flex: 1, backgroundColor: '#FFF1E7', borderRadius: 22, padding: 16, gap: 5 }}
            >
              <Text style={{ fontSize: 25 }}>🔥</Text>
              <Text style={{ color: colors.ink, fontSize: 26, fontWeight: '800' }}>
                {streak?.current_streak ?? 0}
              </Text>
              <Text style={{ color: colors.muted }}>Current days</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.ice,
                borderRadius: 22,
                padding: 16,
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 25 }}>🏅</Text>
              <Text style={{ color: colors.ink, fontSize: 26, fontWeight: '800' }}>
                {streak?.longest_streak ?? 0}
              </Text>
              <Text style={{ color: colors.muted }}>Longest streak</Text>
            </View>
          </View>
          <View style={{ gap: 13 }}>
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Last 7 days</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {days.map(({ date, item, current }) => {
                const status = item?.status ?? (current ? 'today' : 'missed');
                const completed = status === 'practice';
                const protectedDay = status === 'protected';
                const missed = status === 'missed';
                const background = completed
                  ? colors.primary
                  : protectedDay
                    ? '#E9E2FF'
                    : missed
                      ? '#EEF1F6'
                      : colors.paper;
                const foreground = completed
                  ? 'white'
                  : protectedDay
                    ? '#6B4DB5'
                    : missed
                      ? colors.muted
                      : colors.ink;
                return (
                  <View key={date} style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{weekday(date)}</Text>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: background,
                        borderWidth: current ? 2 : protectedDay || missed ? 1 : 0,
                        borderColor: current
                          ? colors.sky
                          : protectedDay
                            ? '#B7A6E5'
                            : missed
                              ? colors.border
                              : 'transparent',
                      }}
                    >
                      <Text style={{ color: foreground, fontSize: 13, fontWeight: '700' }}>
                        {completed
                          ? '✓'
                          : protectedDay
                            ? '❄'
                            : missed
                              ? '·'
                              : String(Number(date.slice(-2)))}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              <Legend color={colors.primary} label="Practice" />
              <Legend color="#E9E2FF" label="Freeze used" />
              <Legend color="#EEF1F6" label="Missed" />
            </View>
          </View>
          <View style={{ backgroundColor: colors.sage, borderRadius: 20, padding: 16, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>❄️</Text>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>
                {streak?.streak_freezes_available ?? 0} streak freeze
                {streak?.streak_freezes_available === 1 ? '' : 's'}
              </Text>
            </View>
            <Text style={{ color: colors.muted, lineHeight: 21 }}>
              One free freeze is included. It is used automatically to protect one missed day.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Stat label="Practice days" value={streak?.total_practice_days ?? 0} />
            <Stat label="Korean XP" value={streak?.total_xp ?? 0} />
            <Stat
              label="Next milestone"
              value={streak?.next_milestone ? `${streak.next_milestone} days` : 'All earned'}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
