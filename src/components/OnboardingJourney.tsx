import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  learningDreams,
  startingPoints,
  type LearningDream,
  type StartingPoint,
} from '../lib/koreanFuture';
import { colors } from './ui';

const ivory = '#FFFDF7';
const sky = '#D9ECFF';
export function touchFeedback() {
  void Haptics.selectionAsync().catch(() => {});
}

function DreamArt({ kind }: { kind: LearningDream }) {
  const ink = colors.primary;
  return (
    <Svg width={76} height={68} viewBox="0 0 76 68" accessibilityLabel={`${kind} illustration`}>
      <Rect
        x={2}
        y={3}
        width={72}
        height={62}
        rx={22}
        fill={kind === 'everyday' ? '#E7F2EA' : kind === 'confident' ? '#E7F1FF' : '#F8EFD9'}
      />
      {kind === 'everyday' ? (
        <>
          <Path
            d="M17 21 Q17 13 28 13 H46 Q58 13 58 24 V35 Q58 44 45 44 H33 L24 53 V43 Q17 41 17 33 Z"
            fill={ivory}
            stroke={ink}
            strokeWidth={2.5}
          />
          <Circle cx={30} cy={29} r={2.6} fill={ink} />
          <Circle cx={38} cy={29} r={2.6} fill={ink} />
          <Circle cx={46} cy={29} r={2.6} fill={ink} />
        </>
      ) : kind === 'confident' ? (
        <>
          <Path
            d="M19 42 Q12 29 23 19 Q36 9 48 19 Q60 31 51 43"
            fill="none"
            stroke={ink}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path
            d="M25 31 Q34 22 43 31 M30 37 Q36 31 42 37"
            fill="none"
            stroke={colors.sky}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle cx={51} cy={44} r={6} fill={colors.primary} />
        </>
      ) : (
        <>
          <Path
            d="M17 45 V23 Q27 17 38 22 Q49 17 59 23 V45 Q47 40 38 46 Q28 40 17 45 Z"
            fill={ivory}
            stroke={ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path
            d="M38 22 V46 M24 29 H32 M44 29 H52 M24 35 H32 M44 35 H52"
            stroke={colors.sky}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path d="M58 12 L60 17 L65 19 L60 21 L58 26 L56 21 L51 19 L56 17 Z" fill="#D4A85A" />
        </>
      )}
    </Svg>
  );
}

function SelectedMark({ selected }: { selected: boolean }) {
  return (
    <Ionicons
      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
      size={23}
      color={selected ? colors.primary : colors.border}
    />
  );
}

function SelectionMotion({
  selected,
  children,
  style,
}: {
  selected: boolean;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(selected ? 1.015 : 1);
  useEffect(() => {
    scale.value = withTiming(selected ? 1.015 : 1, {
      duration: reduced ? 0 : 180,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(scale);
  }, [selected, reduced, scale]);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, motion]}>{children}</Animated.View>;
}

export function DreamScene({
  selected,
  onSelect,
}: {
  selected: LearningDream | null;
  onSelect: (value: LearningDream) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Your Korean dream" style={s.dreams}>
      {learningDreams.map((dream, index) => (
        <SelectionMotion
          key={dream.id}
          selected={selected === dream.id}
          style={index === 1 ? s.dreamOffset : undefined}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={dream.title}
            aria-checked={selected === dream.id}
            accessibilityState={{ checked: selected === dream.id }}
            onPress={() => {
              touchFeedback();
              onSelect(dream.id);
            }}
            style={[s.dream, selected === dream.id && s.selected]}
          >
            <DreamArt kind={dream.id} />
            <View style={s.dreamWords}>
              <Text style={s.dreamTitle}>{dream.title}</Text>
              <Text style={s.dreamDescription}>{dream.description}</Text>
            </View>
            <SelectedMark selected={selected === dream.id} />
          </Pressable>
        </SelectionMotion>
      ))}
    </View>
  );
}

const levelIcons: (keyof typeof Ionicons.glyphMap)[] = [
  'leaf-outline',
  'sparkles-outline',
  'chatbubbles-outline',
  'book-outline',
];
export function LevelScene({
  selected,
  onSelect,
}: {
  selected: StartingPoint | null;
  onSelect: (value: StartingPoint) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Your starting level" style={s.levels}>
      {startingPoints.map((point, index) => (
        <SelectionMotion key={point.id} selected={selected === point.id}>
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={point.title}
            aria-checked={selected === point.id}
            accessibilityState={{ checked: selected === point.id }}
            onPress={() => {
              touchFeedback();
              onSelect(point.id);
            }}
            style={[s.level, selected === point.id && s.selected]}
          >
            <View style={s.levelIcon}>
              <Ionicons name={levelIcons[index]} size={25} color={colors.primary} />
            </View>
            <View style={s.dreamWords}>
              <Text style={s.dreamTitle}>{point.title}</Text>
              <Text style={s.dreamDescription}>{point.hint}</Text>
            </View>
            <SelectedMark selected={selected === point.id} />
          </Pressable>
        </SelectionMotion>
      ))}
      <Text style={s.smallNote}>This helps Dori choose your first phrase. It is not a test.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  dreams: { gap: 11, paddingHorizontal: 3 },
  dream: {
    minHeight: 81,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 26,
    backgroundColor: ivory,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  dreamOffset: { marginLeft: 12 },
  selected: { borderColor: colors.primary, backgroundColor: sky },
  dreamWords: { flex: 1, gap: 3 },
  dreamTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.ink },
  dreamDescription: { fontSize: 12, lineHeight: 17, color: colors.muted },
  levels: { gap: 9 },
  level: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: ivory,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 9,
  },
  levelIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ice,
  },
  smallNote: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
