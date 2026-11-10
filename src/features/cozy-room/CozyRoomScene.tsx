import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RoomRenderer } from './RoomRenderer';
import { usePandaAnimation } from './usePandaAnimation';
export function CozyRoomScene({ onOpenBook }: { onOpenBook: () => void }) {
  const [width, setWidth] = useState(0);
  const [night, setNight] = useState(false);
  const { controls, busy, status, request } = usePandaAnimation(night);
  const px = useSharedValue(0),
    py = useSharedValue(0);
  const view = useRef<ComponentRef<typeof View>>(null);
  const offset = useRef({ x: 0, y: 0 });
  const height = (width * 1680) / 1080;
  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: px.value },
      { translateY: py.value },
      { scale: controls.reduced ? 1 : 1.012 },
    ],
  }));
  const reset = () => {
    px.set(withTiming(0, { duration: 300 }));
    py.set(withTiming(0, { duration: 300 }));
  };
  const hotspot = (
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onPress: () => void,
    id: string,
  ) => (
    <Pressable
      key={id}
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: id === 'room-panda' || id === 'room-coffee' ? busy : undefined }}
      onPress={onPress}
      style={[
        s.hotspot,
        {
          left: (x / 1080) * width,
          top: (y / 1680) * height,
          width: Math.max(44, (w / 1080) * width),
          height: Math.max(44, (h / 1680) * height),
        },
      ]}
    />
  );
  return (
    <View testID="cozy-room" style={s.container}>
      <View style={s.captionRow}>
        <View style={{ gap: 5, flex: 1 }}>
          <Text style={s.eyebrow}>DORI’S STUDY ROOM</Text>
          <Text style={s.roomTitle}>A little room for Korean.</Text>
        </View>
        <Pressable
          testID="room-time-toggle"
          accessibilityRole="button"
          accessibilityLabel={night ? 'Switch room to day' : 'Switch room to night'}
          onPress={() => setNight((v) => !v)}
          style={s.mode}
        >
          <Ionicons name={night ? 'moon-outline' : 'sunny-outline'} size={17} color="#46636A" />
          <Text style={s.modeLabel}>{night ? 'Evening' : 'Daylight'}</Text>
        </Pressable>
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
          if (controls.reduced || !width) return;
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
            <RoomRenderer width={width} height={height} controls={controls} />
            {hotspot(
              'Say hello to Dori the panda',
              205,
              850,
              405,
              485,
              () => {
                request('wave');
              },
              'room-panda',
            )}
            {hotspot(
              'Give Dori a coffee break',
              470,
              1105,
              190,
              130,
              () => {
                request('coffee');
              },
              'room-coffee',
            )}
            {hotspot('Open your Korean study book', 735, 1165, 230, 170, onOpenBook, 'room-book')}
            {hotspot(
              night ? 'Switch the window to daylight' : 'Switch the window to evening',
              170,
              150,
              605,
              580,
              () => setNight((v) => !v),
              'room-window',
            )}
          </Animated.View>
        )}
        <View pointerEvents="none" style={s.sceneNote}>
          <Text style={s.korean}>여기서, 조금씩.</Text>
          <Text style={s.sceneNoteText}>A little at a time, right here.</Text>
        </View>
      </View>
      <View style={s.instructions}>
        <Ionicons name={busy ? 'cafe-outline' : 'hand-left-outline'} size={14} color="#60766E" />
        <Text testID="room-status" accessibilityLiveRegion="polite" style={s.hint}>
          {busy || status !== 'Dori is enjoying a quiet moment.'
            ? status
            : 'Tap Dori, the coffee, the book, or the window.'}
        </Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { marginHorizontal: -24, backgroundColor: '#EAF4F6' },
  captionRow: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, color: '#627B7C' },
  roomTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.7,
    color: '#354F52',
  },
  mode: {
    minHeight: 44,
    flexShrink: 0,
    borderRadius: 24,
    backgroundColor: '#F8F4E9',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeLabel: { fontSize: 11, fontWeight: '600', color: '#46636A' },
  viewport: { overflow: 'hidden' },
  hotspot: { position: 'absolute', borderRadius: 30 },
  sceneNote: { position: 'absolute', bottom: 9, left: 0, right: 0, alignItems: 'center', gap: 3 },
  korean: { fontSize: 14, fontWeight: '500', letterSpacing: 1.5, color: '#5D554B' },
  sceneNoteText: { fontSize: 10, color: '#665F53' },
  instructions: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#F3F2E9',
  },
  hint: { fontSize: 10, lineHeight: 16, color: '#546C63', textAlign: 'center', flexShrink: 1 },
});
