import { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Lightweight motion fallback uses the exact V2 head rendered from the Rive asset.
export function PandaFaceFallback({ size = 240, onReady }: { size?: number; onReady: () => void }) {
  const reduced = useReducedMotion();
  const time = useSharedValue(0);
  useEffect(() => {
    if (!reduced)
      time.value = withRepeat(
        withTiming(2.4, { duration: 2400, easing: Easing.linear }),
        -1,
        false,
      );
    return () => cancelAnimation(time);
  }, [reduced, time]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ rotate: `${reduced ? 0 : Math.sin((time.value / 2.4) * Math.PI * 2) * 3}deg` }],
  }));
  return (
    <Animated.View style={[{ width: size, height: size }, motion]}>
      <Image
        source={require('../panda_rive_assets/panda-face.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onLoad={onReady}
        onError={onReady}
      />
    </Animated.View>
  );
}
