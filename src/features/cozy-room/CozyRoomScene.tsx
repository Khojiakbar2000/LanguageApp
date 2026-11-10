import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Tutor } from '../../components/Tutor';

export function CozyRoomScene() {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [pandaWaved, setPandaWaved] = useState(false);
  const [status, setStatus] = useState('Dori is enjoying a quiet moment.');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const px = useSharedValue(0);
  const py = useSharedValue(0);
  const view = useRef<ComponentRef<typeof View>>(null);
  const offset = useRef({ x: 0, y: 0 });
  const height = (width * 1672) / 941;
  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: px.value },
      { translateY: py.value },
      { scale: reducedMotion ? 1 : 1.012 },
    ],
  }));
  const reset = () => {
    px.set(withTiming(0, { duration: 300 }));
    py.set(withTiming(0, { duration: 300 }));
  };
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);
  const greetDori = () => {
    setPandaWaved(true);
    setStatus('안녕! Dori says hello.');
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setPandaWaved(false);
      setStatus('Dori is enjoying a quiet moment.');
    }, reducedMotion ? 0 : 1800);
  };

  return (
    <View testID="cozy-room" style={s.container}>
      <View style={s.captionRow}>
        <View style={{ gap: 5 }}>
          <Text style={s.eyebrow}>DORI’S ROOM</Text>
          <Text style={s.roomTitle}>A little space to learn.</Text>
        </View>
      </View>
      <View
        ref={view}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
          view.current?.measureInWindow((x, y) => {
            offset.current = { x, y };
          });
        }}
        style={[s.viewport, { height: height || 480 }]}
        onTouchMove={(event) => {
          if (reducedMotion || !width) return;
          px.set(
            withTiming(
              Math.max(
                -3,
                Math.min(3, ((event.nativeEvent.pageX - offset.current.x - width / 2) / width) * 6),
              ),
              { duration: 180 },
            ),
          );
          py.set(
            withTiming(
              Math.max(
                -2,
                Math.min(
                  2,
                  ((event.nativeEvent.pageY - offset.current.y - height / 2) / height) * 4,
                ),
              ),
              { duration: 180 },
            ),
          );
        }}
        onTouchEnd={reset}
        onTouchCancel={reset}
      >
        {width > 0 && (
          <Animated.View style={[{ width, height }, parallax]}>
            <ImageBackground
              testID="panda-room-scene"
              source={require('../../assets/panda-room-background.png')}
              resizeMode="cover"
              style={s.background}
            >
              <Pressable
                testID="room-panda"
                accessibilityRole="button"
                accessibilityLabel="Say hello to Dori the panda"
                onPress={greetDori}
                style={s.pandaPosition}
              >
                <Tutor state={pandaWaved ? 'celebrating' : 'happy'} size={Math.min(width * 0.68, 290)} />
              </Pressable>
              <View pointerEvents="none" style={s.sceneNote}>
                <Text style={s.korean}>여기서, 조금씩.</Text>
                <Text style={s.sceneNoteText}>A little Korean, right here.</Text>
              </View>
            </ImageBackground>
          </Animated.View>
        )}
      </View>
      <View style={s.instructions}>
        <Text testID="room-status" accessibilityLiveRegion="polite" style={s.hint}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginHorizontal: -24, backgroundColor: '#C5E0DF' },
  captionRow: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 13,
    alignItems: 'flex-start',
  },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, color: '#627B7C' },
  roomTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.7,
    color: '#354F52',
  },
  viewport: { overflow: 'hidden' },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: '18%',
  },
  pandaPosition: { justifyContent: 'center' },
  sceneNote: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 3,
  },
  korean: { fontSize: 14, fontWeight: '500', letterSpacing: 1.5, color: '#5D554B' },
  sceneNoteText: { fontSize: 10, color: '#665F53' },
  instructions: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#C5E0DF',
  },
  hint: { fontSize: 10, lineHeight: 16, color: '#546C63', textAlign: 'center', flexShrink: 1 },
});
