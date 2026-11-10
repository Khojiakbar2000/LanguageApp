import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Tutor } from './Tutor';
import { StreakFlame } from './StreakFlame';

type Props = {
  visible: boolean;
  currentStreak: number;
  xp: number;
  milestones?: number[];
  onContinue: () => void;
};

const milestoneCopy: Record<number, { title: string; message: string; badge: string }> = {
  3: {
    title: '3-DAY STREAK!',
    message: 'Three days of Korean practice!',
    badge: 'A little flame, a lovely start',
  },
  7: {
    title: '7-DAY STREAK!',
    message: 'A whole week of Korean practice!',
    badge: 'One week strong',
  },
  14: {
    title: '14-DAY STREAK!',
    message: 'Two weeks of showing up for Korean!',
    badge: 'Two weeks in a row',
  },
  30: {
    title: '30-DAY STREAK!',
    message: 'A month of Korean practice!',
    badge: 'Golden streak badge earned',
  },
  100: {
    title: '100-DAY STREAK!',
    message: 'One hundred days of learning together!',
    badge: 'A remarkable milestone',
  },
  365: {
    title: '365-DAY STREAK!',
    message: 'A whole year of Korean practice!',
    badge: 'Your Korean anniversary',
  },
};

export function StreakCelebration({
  visible,
  currentStreak,
  xp,
  milestones = [],
  onContinue,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [shownCount, setShownCount] = useState(currentStreak);
  const [contentVisible, setContentVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const playedFor = useRef<number | null>(null);
  const pandaY = useSharedValue(24);
  const pandaOpacity = useSharedValue(0);
  const flameScale = useSharedValue(0.2);
  const counterScale = useSharedValue(0.65);
  const contentOpacity = useSharedValue(0);
  const particleProgress = useSharedValue(0);
  const milestone = milestones.length ? milestones[milestones.length - 1] : null;
  const special = milestoneCopy[milestone ?? 0];
  const displayedCount = reduceMotion ? currentStreak : shownCount;
  const messageReady = reduceMotion || contentVisible;

  useEffect(() => {
    if (!visible || playedFor.current === currentStreak) return;
    playedFor.current = currentStreak;
    setShownCount(Math.max(0, currentStreak - 1));
    setContentVisible(false);
    pandaY.value = reduceMotion ? 0 : 28;
    pandaOpacity.value = reduceMotion ? 1 : 0;
    flameScale.value = reduceMotion ? 1 : 0.2;
    counterScale.value = reduceMotion ? 1 : 0.65;
    contentOpacity.value = reduceMotion ? 1 : 0;
    particleProgress.value = 0;
    if (reduceMotion) return;
    pandaY.value = withDelay(360, withSpring(0, { damping: 10, stiffness: 150 }));
    pandaOpacity.value = withDelay(360, withTiming(1, { duration: 260 }));
    flameScale.value = withDelay(850, withSequence(withSpring(1.18), withSpring(1)));
    counterScale.value = withDelay(1380, withSequence(withSpring(1.18), withSpring(1)));
    particleProgress.value = withDelay(
      1850,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
    );
    contentOpacity.value = withDelay(2380, withTiming(1, { duration: 320 }));
    const counterTimer = setTimeout(() => setShownCount(currentStreak), 1460);
    const contentTimer = setTimeout(() => setContentVisible(true), 2380);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    return () => {
      clearTimeout(counterTimer);
      clearTimeout(contentTimer);
    };
  }, [
    visible,
    currentStreak,
    reduceMotion,
    pandaY,
    pandaOpacity,
    flameScale,
    counterScale,
    contentOpacity,
    particleProgress,
  ]);

  const pandaStyle = useAnimatedStyle(() => ({
    opacity: pandaOpacity.value,
    transform: [{ translateY: pandaY.value }],
  }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flameScale.value }] }));
  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: counterScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: (1 - contentOpacity.value) * 10 }],
  }));
  const particleStyle = useAnimatedStyle(() => ({
    opacity: particleProgress.value,
    transform: [{ scale: 0.65 + particleProgress.value * 0.35 }],
  }));

  return (
    <Modal
      visible={visible && !dismissed}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        setDismissed(true);
        onContinue();
      }}
    >
      <View style={styles.root}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="streak-bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFAE45" />
              <Stop offset="1" stopColor="#FFD96A" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#streak-bg)" />
        </Svg>
        <View style={styles.topline}>
          <Text style={styles.toplineText}>TODAY, WE GREW</Text>
        </View>
        <View style={styles.hero}>
          {!reduceMotion && (
            <Animated.View pointerEvents="none" style={[styles.particles, particleStyle]}>
              {['✦', '·', '✧', '✦', '·', '✧'].map((star, index) => (
                <Text
                  key={index}
                  style={[
                    styles.particle,
                    styles[`particle${index}` as keyof typeof styles] as object,
                  ]}
                >
                  {star}
                </Text>
              ))}
            </Animated.View>
          )}
          <Animated.View style={[styles.flame, flameStyle]}>
            <StreakFlame size={58} />
          </Animated.View>
          <Animated.View style={pandaStyle}>
            <Tutor state="celebrating" size={220} />
          </Animated.View>
          <Animated.Text style={[styles.count, countStyle]}>{displayedCount}</Animated.Text>
          <Text style={styles.dayLabel}>{shownCount === 1 ? 'DAY STREAK' : 'DAY STREAK'}</Text>
        </View>
        <Animated.View style={[styles.messageArea, contentStyle]}>
          <Text style={styles.title}>{special?.title ?? `${currentStreak}-DAY STREAK!`}</Text>
          <Text style={styles.message}>
            {special?.message ?? 'Another day of Korean practice. Dori is cheering you on!'}
          </Text>
          {special && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{special.badge}</Text>
            </View>
          )}
          <Text style={styles.xp}>+{xp} XP earned</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDismissed(true);
              onContinue();
            }}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.86 }]}
          >
            <Text style={styles.buttonText}>{messageReady ? 'CONTINUE' : ' '}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFB84C',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingBottom: 36,
    paddingHorizontal: 28,
  },
  topline: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(255,248,216,0.75)',
  },
  toplineText: { color: '#8B5722', fontSize: 13, letterSpacing: 2, fontWeight: '900' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 300 },
  flame: { marginBottom: -10, zIndex: 2 },
  count: {
    color: '#FFF9DC',
    fontSize: 88,
    lineHeight: 98,
    fontWeight: '900',
    textShadowColor: 'rgba(172,92,22,0.3)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 3 },
  },
  dayLabel: { color: '#FFF8DB', fontSize: 19, letterSpacing: 3, fontWeight: '800' },
  particles: { position: 'absolute', width: 270, height: 300, top: '16%' },
  particle: { position: 'absolute', color: '#FFF2A5', fontSize: 28, fontWeight: '800' },
  particle0: { top: 28, left: 28 },
  particle1: { top: 96, left: 0 },
  particle2: { top: 180, left: 32 },
  particle3: { top: 24, right: 24 },
  particle4: { top: 110, right: 2 },
  particle5: { top: 195, right: 28 },
  messageArea: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 10 },
  title: { color: '#FFFDF1', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  message: { color: '#FFF9E8', fontSize: 17, lineHeight: 24, textAlign: 'center' },
  badge: {
    backgroundColor: 'rgba(255,249,232,0.9)',
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  badgeText: { color: '#985E20', fontSize: 14, fontWeight: '800' },
  xp: { color: '#FFF6D9', fontSize: 14, fontWeight: '700', marginTop: 2 },
  button: {
    marginTop: 10,
    width: '100%',
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF5',
    borderBottomWidth: 4,
    borderBottomColor: '#E8C66E',
  },
  buttonText: { color: '#4C596A', fontSize: 16, letterSpacing: 1.2, fontWeight: '900' },
});
