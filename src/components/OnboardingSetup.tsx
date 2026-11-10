import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './ui';
import { ageRanges, learningInterests } from '../lib/koreanFuture';
import { lessons } from '../content/lessons';

const interestIcons: Record<(typeof learningInterests)[number], keyof typeof Ionicons.glyphMap> = {
  'Everyday life': 'home-outline',
  'Food & cafés': 'cafe-outline',
  Travel: 'airplane-outline',
  'People & culture': 'people-outline',
  Work: 'briefcase-outline',
  Study: 'school-outline',
};
const categoryForInterest: Record<(typeof learningInterests)[number], string> = {
  'Everyday life': 'Everyday',
  'Food & cafés': 'Food',
  Travel: 'Travel',
  'People & culture': 'People',
  Work: 'Work',
  Study: 'Campus',
};

export function InterestScene({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View
      accessibilityRole="group"
      accessibilityLabel="Choose topics for Korean practice"
      style={s.grid}
    >
      {learningInterests.map((interest) => {
        const active = selected.includes(interest);
        return (
          <Pressable
            key={interest}
            accessibilityRole="checkbox"
            accessibilityLabel={interest}
            accessibilityState={{ checked: active }}
            aria-checked={active}
            onPress={() => onToggle(interest)}
            style={({ pressed }) => [s.interest, active && s.selected, pressed && s.pressed]}
          >
            <Ionicons
              name={interestIcons[interest]}
              size={21}
              color={active ? colors.primary : colors.muted}
            />
            <Text style={[s.optionText, active && s.selectedText]}>{interest}</Text>
            <Ionicons
              name={active ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={active ? colors.primary : colors.border}
            />
          </Pressable>
        );
      })}
      <Text style={s.helper}>Choose any that sound useful. You can change your mind later.</Text>
    </View>
  );
}

export function AgeScene({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (value: (typeof ageRanges)[number]) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Your age range" style={s.stack}>
      <Text style={s.helper}>A range is enough. This stays on this device and is optional.</Text>
      {ageRanges.map((range) => {
        const active = selected === range;
        return (
          <Pressable
            key={range}
            accessibilityRole="radio"
            accessibilityLabel={range}
            accessibilityState={{ checked: active }}
            aria-checked={active}
            onPress={() => onSelect(range)}
            style={({ pressed }) => [s.age, active && s.selected, pressed && s.pressed]}
          >
            <Text style={[s.optionText, active && s.selectedText]}>{range}</Text>
            <Ionicons
              name={active ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={active ? colors.primary : colors.border}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const reminderTimes = [
  { hour: 8, title: 'Morning', time: '8:00 am', icon: 'sunny-outline' },
  { hour: 12, title: 'Lunch break', time: '12:00 pm', icon: 'partly-sunny-outline' },
  { hour: 18, title: 'Evening', time: '6:00 pm', icon: 'cloudy-night-outline' },
  { hour: 20, title: 'Later evening', time: '8:00 pm', icon: 'moon-outline' },
] as const;

export function ReminderScene({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (hour: number) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Choose a reminder time"
      style={s.stack}
    >
      <Text style={s.helper}>
        A gentle daily nudge, in your local time. You can turn it off any time.
      </Text>
      {reminderTimes.map((option) => {
        const active = selected === option.hour;
        return (
          <Pressable
            key={option.hour}
            accessibilityRole="radio"
            accessibilityLabel={`${option.title}, ${option.time}`}
            accessibilityState={{ checked: active }}
            aria-checked={active}
            onPress={() => onSelect(option.hour)}
            style={({ pressed }) => [s.age, active && s.selected, pressed && s.pressed]}
          >
            <Ionicons name={option.icon} size={22} color={active ? colors.primary : colors.muted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.optionText, active && s.selectedText]}>{option.title}</Text>
              <Text style={s.helper}>{option.time}</Text>
            </View>
            <Ionicons
              name={active ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={active ? colors.primary : colors.border}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export function CourseReadyScene({ interests }: { interests: string[] }) {
  const chosen = learningInterests.filter((item) => interests.includes(item));
  const categories = chosen.length ? chosen.map((item) => categoryForInterest[item]) : ['Everyday'];
  const picks = lessons.filter((lesson) => categories.includes(lesson.category)).slice(0, 3);
  return (
    <View style={s.course}>
      <View style={s.courseMark}>
        <Ionicons name="checkmark" size={30} color={colors.paper} />
      </View>
      <Text style={s.courseTitle}>Your first lessons are ready.</Text>
      <Text style={s.helper}>
        Picked from Haru’s Korean lesson library using the topics you chose.
      </Text>
      <View style={s.lessonList}>
        {picks.map((lesson, index) => (
          <View key={lesson.id} style={s.lessonRow}>
            <Text style={s.lessonNumber}>0{index + 1}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optionText}>{lesson.title}</Text>
              <Text style={s.helper}>{lesson.korean_title}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        ))}
      </View>
      <Text style={s.courseFoot}>You can explore these from Lessons after setup.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { gap: 10 },
  stack: { gap: 10 },
  interest: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
  },
  age: {
    minHeight: 53,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingHorizontal: 15,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.ice },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 1 },
  optionText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  selectedText: { color: colors.primary },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  course: { alignItems: 'center', gap: 14 },
  courseMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  courseTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  lessonList: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
  lessonRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
  },
  lessonNumber: { width: 35, color: colors.primary, fontSize: 16, fontWeight: '800' },
  courseFoot: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 4 },
});
