import { useEffect, useRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Tutor } from './Tutor';
import type { TutorState } from '../lib/types';
import { colors } from './ui';

type Icon = keyof typeof Ionicons.glyphMap;

export function OnboardingFrame({
  children,
  footer,
  step,
  onBack,
  onSkip,
  totalSteps = 7,
  accent = colors.primary,
  background = colors.paper,
}: {
  children: ReactNode;
  footer: ReactNode;
  step?: number;
  totalSteps?: number;
  accent?: string;
  background?: string;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const scroll = useRef<ScrollViewInstance>(null);
  const progress = useSharedValue(((step ?? 0) + 1) / totalSteps);
  useEffect(() => {
    progress.value = withTiming(((step ?? 0) + 1) / totalSteps, {
      duration: reducedMotion ? 0 : 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, totalSteps, progress, reducedMotion]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: background }]}>
      <View style={s.column}>
        {step !== undefined ? (
          <View style={s.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={({ pressed }) => [s.iconButton, pressed && { opacity: 0.5 }]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.muted} />
            </Pressable>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Getting started"
              aria-valuemin={0}
              aria-valuemax={totalSteps}
              aria-valuenow={step + 1}
              aria-valuetext={`Step ${step + 1} of ${totalSteps}`}
              accessibilityValue={{
                min: 0,
                max: totalSteps,
                now: step + 1,
                text: `Step ${step + 1} of ${totalSteps}`,
              }}
              style={s.progress}
            >
              <Animated.View style={[s.progressFill, { backgroundColor: accent }, fill]} />
            </View>
            <Text style={s.step}>
              {step + 1}/{totalSteps}
            </Text>
            {onSkip && (
              <Pressable
                accessibilityRole="button"
                onPress={onSkip}
                style={({ pressed }) => [s.skip, pressed && { opacity: 0.5 }]}
              >
                <Text style={s.skipText}>Skip</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={s.brandRow}>
            <Text style={s.brand}>
              haru<Text style={s.brandKorean}> 하루</Text>
            </Text>
            <Text style={s.step}>KOREAN, EVERY DAY</Text>
          </View>
        )}
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <View style={[s.footer, { backgroundColor: background }]}>{footer}</View>
      </View>
    </SafeAreaView>
  );
}

export function DoriHint({
  children,
  happy = false,
  state,
}: {
  children: string;
  happy?: boolean;
  state?: TutorState;
}) {
  return (
    <View style={s.hintRow}>
      <Tutor size={92} state={state ?? (happy ? 'happy' : 'idle')} />
      <View style={s.bubble}>
        <Text style={s.hint}>{children}</Text>
      </View>
    </View>
  );
}

export function OnboardingChoice({
  title,
  description,
  icon,
  selected,
  onPress,
  disabled = false,
}: {
  title: string;
  description?: string;
  icon: Icon;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.choice,
        selected && s.selectedChoice,
        pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
      ]}
    >
      <View style={s.choiceIcon}>
        <Ionicons name={icon} color={selected ? colors.primary : colors.muted} size={24} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={s.choiceTitle}>{title}</Text>
        {description && <Text style={s.description}>{description}</Text>}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={23}
        color={selected ? colors.primary : colors.border}
      />
    </Pressable>
  );
}

export function OnboardingButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { backgroundColor: colors.border, borderColor: colors.border },
        pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          secondary && { color: colors.primary },
          disabled && { color: colors.muted },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export const onboardingStyles = StyleSheet.create({
  title: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.7,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontWeight: '700', color: colors.primary },
  stack: { gap: 12 },
  section: { gap: 22 },
});
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  progress: {
    flex: 1,
    height: 14,
    borderRadius: 8,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    transformOrigin: 'left',
  },
  step: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.7 },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    gap: 8,
    flexWrap: 'wrap',
  },
  brand: { fontSize: 30, fontWeight: '900', letterSpacing: -1.5, color: colors.primary },
  brandKorean: { fontSize: 16, letterSpacing: 0, fontWeight: '500' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 24,
    boxSizing: 'border-box',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bubble: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.card,
  },
  hint: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.ink },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 16,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 72,
  },
  selectedChoice: { borderColor: colors.primary, backgroundColor: colors.ice },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: { fontSize: 17, lineHeight: 23, fontWeight: '700', color: colors.ink },
  description: { fontSize: 13, lineHeight: 19, color: colors.muted },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.ink,
    borderRadius: 17,
  },
  secondary: { backgroundColor: colors.card, borderColor: colors.border },
  buttonText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.paper,
  },
});
