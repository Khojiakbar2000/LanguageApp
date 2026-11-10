import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeInDown,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Tutor } from './Tutor';
import { colors } from './ui';
import type { TutorState } from '../lib/types';
import {
  annualHours,
  calendarTime,
  daysToMilestone,
  displayHours,
  practiceHours,
  practiceMilestones,
  timelineDays,
  type DailyMinutes,
} from '../lib/koreanFuture';

export const futureColors = {
  ink: colors.ink,
  muted: colors.muted,
  accent: colors.primary,
  soft: colors.ice,
  paper: '#FFFDF7',
  border: colors.border,
  card: colors.card,
};
export function selectionHaptic() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
}

export function FutureChoice({
  title,
  description,
  icon,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withTiming(selected ? 1.015 : 1, { duration: reduce ? 0 : 180 });
  }, [selected, reduce, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={title}
        accessibilityHint={description}
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        onPress={() => {
          selectionHaptic();
          onPress();
        }}
        style={({ pressed }) => [s.choice, selected && s.selected, pressed && { opacity: 0.85 }]}
      >
        <View style={[s.choiceIcon, selected && { backgroundColor: colors.border }]}>
          <Text style={{ fontSize: 27 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.choiceTitle}>{title}</Text>
          <Text style={s.choiceDescription}>{description}</Text>
        </View>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={23}
          color={selected ? futureColors.accent : futureColors.border}
        />
      </Pressable>
    </Animated.View>
  );
}

// Rive reactions share the existing six-state rig. The same asset still works if
// Rive is unavailable: Reanimated supplies small nods/lifts around its still.
export function FuturePanda({
  mood,
  size = 112,
  reaction = 0,
}: {
  mood: 'idle' | 'thinking' | 'curious' | 'happy' | 'excited' | 'celebrating';
  size?: number;
  reaction?: number;
}) {
  const reduce = useReducedMotion();
  const lift = useSharedValue(0);
  const state: TutorState = {
    idle: 'idle',
    thinking: 'thinking',
    curious: 'listening',
    happy: 'happy',
    excited: 'happy',
    celebrating: 'celebrating',
  }[mood] as TutorState;
  useEffect(() => {
    lift.value = 0;
    lift.value = withTiming(1, { duration: reduce ? 0 : 480, easing: Easing.out(Easing.cubic) });
  }, [reaction, mood, reduce, lift]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduce ? 0 : -Math.sin(lift.value * Math.PI) * 9 },
      { rotate: `${reduce ? 0 : Math.sin(lift.value * Math.PI) * 4}deg` },
    ],
  }));
  return (
    <Animated.View style={style}>
      <Tutor key={`${mood}-${reaction}`} state={state} size={size} />
    </Animated.View>
  );
}

export function AnimatedHours({ value, large = false }: { value: number; large?: boolean }) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? value : 0);
  const [shown, setShown] = useState(reduce ? Math.round(value) : 0);
  useEffect(() => {
    progress.value = withTiming(value, {
      duration: reduce ? 0 : 1550,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, reduce, progress]);
  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setShown)(current);
    },
  );
  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      numberOfLines={1}
      accessibilityLabel={`${displayHours(value)} hours`}
      style={[s.hours, large && s.largeHours]}
    >
      {displayHours(shown)}
    </Text>
  );
}

function ComparisonBar({ minutes, delay }: { minutes: number; delay: number }) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(0);
  const ratio = annualHours(minutes) / annualHours(60);
  useEffect(() => {
    fill.value = withTiming(ratio, {
      duration: reduce ? 0 : 1000 + delay,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, ratio, delay, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <View style={{ gap: 8 }}>
      <View style={s.between}>
        <Text style={s.small}>{minutes} min / day</Text>
        <Text style={s.comparisonHours}>
          {minutes === 10 ? '≈ ' : ''}
          {displayHours(annualHours(minutes))} hours / year
        </Text>
      </View>
      <View style={s.barTrack}>
        <Animated.View
          style={[s.barFill, style, minutes === 10 && { backgroundColor: colors.sky }]}
        />
      </View>
    </View>
  );
}

export function FutureReveal({ minutes }: { minutes: DailyMinutes }) {
  const reduce = useReducedMotion();
  const compact = useWindowDimensions().width < 360;
  return (
    <View style={{ gap: 28 }}>
      <Animated.View entering={reduce ? undefined : FadeInDown.duration(350)} style={s.revealHero}>
        <Text style={s.heroKorean}>나의 한국어 미래</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flex: 1 }}>
            <AnimatedHours value={annualHours(minutes)} large />
            <Text style={s.hoursLabel}>HOURS</Text>
          </View>
          <FuturePanda mood="celebrating" size={compact ? 80 : 112} />
        </View>
        <Text style={s.heroCaption}>of Korean practice in one year.</Text>
        <Text style={s.small}>Projected study time, not a proficiency estimate.</Text>
        <View style={s.commitment}>
          <Ionicons name="time-outline" color={futureColors.accent} size={15} />
          <Text style={s.commitmentText}>{minutes} minutes a day. A future you’re building.</Text>
        </View>
      </Animated.View>
      <Text style={s.quote}>
        Imagine how much you could learn by showing up for yourself every day.
      </Text>
      <View style={{ gap: 16 }}>
        <Text style={s.sectionTitle}>Watch your time add up</Text>
        <View style={s.timeline}>
          {timelineDays.map((days, index) => (
            <Animated.View
              key={days}
              entering={reduce ? undefined : FadeInDown.delay(index * 100 + 150).duration(300)}
              style={s.timelineStop}
            >
              <View style={[s.timelineDot, index === 3 && s.finalDot]}>
                <Text
                  style={{
                    fontSize: 11,
                    color: index === 3 ? futureColors.paper : futureColors.accent,
                  }}
                >
                  ✦
                </Text>
              </View>
              <Text style={s.day}>{days} days</Text>
              <Text style={s.milestoneHours}>{displayHours(practiceHours(minutes, days))} h</Text>
            </Animated.View>
          ))}
        </View>
      </View>
      <View style={{ gap: 16 }}>
        <Text style={s.sectionTitle}>Small minutes. A real difference.</Text>
        <ComparisonBar minutes={10} delay={0} />
        <ComparisonBar minutes={60} delay={150} />
        <Text style={s.small}>
          {minutes === 10
            ? 'Even ten minutes makes room for Korean every day.'
            : `Your ${minutes}-minute plan adds about ${displayHours(annualHours(minutes) - annualHours(10))} more hours a year than ten minutes a day.`}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.sectionTitle}>Your practice-hour milestones</Text>
        <Text style={s.small}>At {minutes} minutes every day, you could accumulate:</Text>
        {practiceMilestones.map((hours) => (
          <View key={hours} style={s.milestoneRow}>
            <Text style={s.milestoneHours}>{hours} practice hours</Text>
            <Text style={s.milestoneTime}>{calendarTime(daysToMilestone(hours, minutes))}</Text>
          </View>
        ))}
      </View>
      <View style={s.disclaimer}>
        <Ionicons name="information-circle-outline" size={18} color={futureColors.muted} />
        <Text style={[s.small, { flex: 1 }]}>
          These are projections of practice time, assuming daily consistency, not promises of
          fluency or validated proficiency thresholds. Progress depends on how you practice and your
          starting point. Hours are rounded; calendar estimates round up.
        </Text>
      </View>
    </View>
  );
}

export function ClassicDailyScene({
  minutes,
  onSelect,
}: {
  minutes: DailyMinutes;
  onSelect: (value: DailyMinutes) => void;
}) {
  const reduced = useReducedMotion();
  const [reaction, setReaction] = useState(0);
  return (
    <View style={dailyStyles.root}>
      <Text style={dailyStyles.body}>
        There’s no perfect number. Pick a little time you can make your own.
      </Text>
      <View style={dailyStyles.timeStage}>
        <View style={dailyStyles.minuteNumber}>
          <Animated.Text
            key={minutes}
            entering={reduced ? undefined : FadeInDown.duration(180)}
            style={dailyStyles.minutes}
          >
            {minutes}
          </Animated.Text>
          <Text style={dailyStyles.minutesLabel}>minutes / day</Text>
        </View>
        <View style={dailyStyles.weekly}>
          <Ionicons name="calendar-outline" size={16} color={futureColors.accent} />
          <Text style={dailyStyles.weeklyText}>
            About {((minutes * 7) / 60).toLocaleString('en-US', { maximumFractionDigits: 1 })} hours
            of Korean each week
          </Text>
        </View>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Daily practice minutes"
        style={dailyStyles.timeOptions}
      >
        {([10, 15, 30, 45, 60, 90, 120] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${value} minutes`}
            accessibilityState={{ checked: value === minutes }}
            aria-checked={value === minutes}
            onPress={() => {
              selectionHaptic();
              onSelect(value);
              setReaction((current) => current + 1);
            }}
            style={({ pressed }) => [
              dailyStyles.minuteOption,
              value === minutes && dailyStyles.minuteSelected,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text
              style={[dailyStyles.optionText, value === minutes && { color: futureColors.paper }]}
            >
              {value}
            </Text>
            <Text
              style={[dailyStyles.optionUnit, value === minutes && { color: futureColors.paper }]}
            >
              min
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={dailyStyles.dailyPanda}>
        <FuturePanda mood={reaction === 0 ? 'curious' : 'excited'} reaction={reaction} size={152} />
        <Text style={dailyStyles.pandaHello}>Small steps still move you forward.</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 17,
    borderWidth: 1.5,
    borderColor: futureColors.border,
    borderRadius: 22,
    backgroundColor: futureColors.card,
    minHeight: 104,
  },
  selected: { borderColor: futureColors.accent, backgroundColor: futureColors.soft },
  choiceIcon: {
    width: 49,
    height: 52,
    borderRadius: 17,
    backgroundColor: futureColors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: { fontSize: 17, fontWeight: '700', lineHeight: 23, color: futureColors.ink },
  choiceDescription: { fontSize: 13, lineHeight: 19, color: futureColors.muted },
  revealHero: { padding: 22, gap: 10, borderRadius: 30, backgroundColor: futureColors.soft },
  heroKorean: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: futureColors.accent },
  hours: {
    fontSize: 58,
    lineHeight: 68,
    fontWeight: '800',
    letterSpacing: -3,
    color: futureColors.ink,
    fontVariant: ['tabular-nums'],
  },
  largeHours: { fontSize: 66, lineHeight: 76 },
  hoursLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 3, color: futureColors.accent },
  heroCaption: { fontSize: 17, lineHeight: 25, color: futureColors.ink },
  commitment: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  commitmentText: { fontSize: 11, lineHeight: 17, color: futureColors.accent, flex: 1 },
  quote: {
    fontSize: 18,
    lineHeight: 28,
    color: futureColors.muted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: futureColors.ink },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: futureColors.border,
    marginTop: 15,
  },
  timelineStop: { alignItems: 'center', gap: 7, flex: 1, marginTop: -14 },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: futureColors.border,
    backgroundColor: futureColors.paper,
  },
  finalDot: { backgroundColor: futureColors.accent, borderColor: futureColors.accent },
  day: { fontSize: 11, color: futureColors.muted },
  milestoneHours: { fontSize: 15, fontWeight: '700', color: futureColors.ink },
  small: { fontSize: 12, lineHeight: 19, color: futureColors.muted },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  comparisonHours: { fontSize: 12, lineHeight: 19, fontWeight: '700', color: futureColors.ink },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: futureColors.soft, overflow: 'hidden' },
  barFill: {
    height: '100%',
    width: '100%',
    backgroundColor: futureColors.accent,
    transformOrigin: 'left',
    borderRadius: 5,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: futureColors.border,
  },
  milestoneTime: { fontSize: 12, color: futureColors.muted, flexShrink: 1, textAlign: 'right' },
  disclaimer: { flexDirection: 'row', gap: 8, paddingTop: 4 },
});

const dailyStyles = StyleSheet.create({
  root: { gap: 24 },
  body: { fontSize: 15, lineHeight: 23, color: futureColors.muted },
  timeStage: { alignItems: 'center', gap: 16, paddingTop: 6 },
  minuteNumber: { alignItems: 'center' },
  minutes: {
    fontSize: 96,
    lineHeight: 108,
    letterSpacing: -5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: futureColors.ink,
  },
  minutesLabel: { fontSize: 15, color: futureColors.muted },
  weekly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 15,
    backgroundColor: futureColors.soft,
    borderRadius: 20,
  },
  weeklyText: { fontSize: 11, lineHeight: 17, color: futureColors.accent, flexShrink: 1 },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  minuteOption: {
    flexGrow: 1,
    flexBasis: '21%',
    minHeight: 64,
    borderWidth: 1.5,
    borderColor: futureColors.border,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: futureColors.card,
  },
  minuteSelected: { backgroundColor: futureColors.accent, borderColor: futureColors.accent },
  optionText: { fontSize: 20, fontWeight: '700', color: futureColors.ink },
  optionUnit: { fontSize: 10, color: futureColors.muted },
  dailyPanda: { alignItems: 'center', gap: 8 },
  pandaHello: { fontSize: 16, lineHeight: 23, color: futureColors.accent, fontWeight: '700' },
});
