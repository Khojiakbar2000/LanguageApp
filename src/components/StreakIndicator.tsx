import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StreakFlame } from './StreakFlame';
import { colors } from './ui';

export function StreakIndicator({ streak, onPress }: { streak: number; onPress: () => void }) {
  const pulse = useSharedValue(0);
  const previous = useRef(streak);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced && streak > previous.current) {
      pulse.value = withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }),
      );
    }
    previous.current = streak;
  }, [streak, reduced, pulse]);
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.16 }],
    shadowOpacity: 0.08 + pulse.value * 0.3,
    shadowRadius: 3 + pulse.value * 8,
  }));
  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.1 }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.55 + pulse.value * 0.7 }, { rotate: `${pulse.value * 22}deg` }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}. Open streak calendar.`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        minWidth: 66,
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E4',
        borderRadius: 24,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#FFE1B7',
        opacity: pressed ? 0.84 : 1,
      })}
    >
      <View style={{ width: 22, height: 26, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              shadowColor: '#EF8B2C',
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            },
            flameStyle,
          ]}
        >
          <StreakFlame size={19} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, burstStyle]}>
          <Ionicons name="sparkles" size={22} color="#FFC85B" />
        </Animated.View>
      </View>
      <Animated.Text style={[{ color: colors.ink, fontSize: 17, fontWeight: '800' }, numberStyle]}>
        {streak}
      </Animated.Text>
    </Pressable>
  );
}
