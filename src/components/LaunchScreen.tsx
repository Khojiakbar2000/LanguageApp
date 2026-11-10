import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from './ui';
import { PandaFace } from './PandaFace';

export function LaunchScreen({ ready, onFinished }: { ready: boolean; onFinished: () => void }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  const entered = useSharedValue(0);
  const [imageReady, setImageReady] = useState(false);
  const [brandBeat, setBrandBeat] = useState(false);
  const finishing = useRef(false);
  useEffect(() => {
    entered.value = withTiming(1, {
      duration: reduced ? 0 : 450,
      easing: Easing.out(Easing.cubic),
    });
    // A single short brand beat, never a simulated loading progress indicator.
    const timer = setTimeout(() => setBrandBeat(true), reduced ? 0 : 750);
    return () => clearTimeout(timer);
  }, [entered, reduced]);
  useEffect(() => {
    if (!ready || !imageReady || !brandBeat || finishing.current) return;
    finishing.current = true;
    opacity.value = withTiming(0, { duration: reduced ? 0 : 200 }, (finished) => {
      if (finished) runOnJS(onFinished)();
    });
  }, [ready, imageReady, brandBeat, reduced, opacity, onFinished]);
  const overlay = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const face = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : 0.7 + entered.value * 0.3,
    transform: [{ scale: reduced ? 1 : 0.96 + entered.value * 0.04 }],
  }));
  const showFace = useCallback(() => {
    setImageReady(true);
    if (Platform.OS !== 'web') void SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <Animated.View
      testID="launch-screen"
      accessibilityRole="image"
      accessibilityLabel="Haru, Korean every day. Dori the panda."
      style={[s.root, overlay]}
    >
      <SafeAreaView style={s.safe}>
        <View style={s.facePosition}>
          <Animated.View style={face}>
            <PandaFace size={240} onReady={showFace} />
          </Animated.View>
        </View>
        <View style={s.wordmark}>
          <Text style={s.brand}>haru</Text>
          <Text style={s.korean}>하루</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.border,
    zIndex: 1000,
  },
  safe: { flex: 1 },
  facePosition: { position: 'absolute', left: 0, right: 0, top: '34%', alignItems: 'center' },
  face: { width: 240, height: 240 },
  wordmark: { position: 'absolute', bottom: '7%', left: 0, right: 0, alignItems: 'center', gap: 0 },
  brand: {
    fontSize: 61,
    lineHeight: 72,
    fontWeight: '900',
    letterSpacing: -3,
    color: colors.ink,
  },
  korean: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 4,
    color: colors.ink,
  },
});
