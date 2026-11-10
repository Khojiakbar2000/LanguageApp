import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useWidgetInvitation } from './preferences';
import { requestWidget, type WidgetSize, type InstallResult } from './widgetPlatform';
const stepsIOS = [
  'Go to your Home Screen.',
  'Touch and hold an empty area.',
  'Tap Edit, then Add Widget (or the + button).',
  'Search for Haru.',
  'Choose Panda Companion or Daily Korean.',
  'Tap Add Widget, then Done.',
];
const stepsAndroid = [
  'Go to your Home Screen.',
  'Touch and hold an empty area.',
  'Open Widgets and find Haru.',
  'Touch and hold Panda Companion or Daily Korean.',
  'Drag it onto your Home Screen.',
];
export function WidgetInvitationScreen() {
  const { width, height } = useWindowDimensions();
  const heroHeight = Math.min(width * 0.78, height * 0.36, 330);
  const artWidth = Math.min(width - 32, 410, heroHeight * 1399 / 1124);
  const reduced = useReducedMotion();
  const [step, setStep] = useState<'intro' | 'guide'>('intro');
  const [size, setSize] = useState<WidgetSize>('small');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InstallResult>('manual');
  const [guideOS, setGuideOS] = useState<'ios' | 'android'>(
    Platform.OS === 'android' ? 'android' : 'ios',
  );
  const [error, setError] = useState('');
  const entrance = useSharedValue(reduced ? 1 : 0),
    float = useSharedValue(0),
    press = useSharedValue(1);
  useEffect(() => {
    if (useWidgetInvitation.getState().status === 'unseen')
      useWidgetInvitation.getState().record('shown');
  }, []);
  useFocusEffect(
    useCallback(() => {
      entrance.set(
        reduced ? 1 : withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      );
      if (!reduced)
        float.set(
          withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true),
        );
      return () => {
        cancelAnimation(entrance);
        cancelAnimation(float);
        cancelAnimation(press);
      };
    }, [reduced, entrance, float, press]),
  );
  const sheetMotion = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 58 }],
  }));
  const illustrationMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : float.value * -4 }],
  }));
  const heartMotion = useAnimatedStyle(() => ({
    opacity: reduced ? 0.7 : 0.5 + float.value * 0.3,
    transform: [
      { translateY: reduced ? 0 : float.value * -9 },
      { rotate: reduced ? '0deg' : `${-8 + float.value * 10}deg` },
    ],
  }));
  const buttonMotion = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const leave = (status: 'dismissed' | 'requested') => {
    useWidgetInvitation.getState().record(status);
    router.replace('/(tabs)');
  };
  async function add() {
    setBusy(true);
    setError('');
    try {
      const response = await requestWidget(size);
      setResult(response);
      setStep('guide');
      entrance.set(reduced ? 1 : 0);
      entrance.set(reduced ? 1 : withTiming(1, { duration: 240 }));
    } catch {
      setResult('manual');
      setError('Your launcher couldn’t open the widget prompt. You can add Panda manually.');
      setStep('guide');
      entrance.set(reduced ? 1 : 0);
      entrance.set(reduced ? 1 : withTiming(1, { duration: 240 }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.brandRow}>
          <Text style={s.wordmark}>
            haru <Text style={s.hangul}>하루</Text>
          </Text>
          <Text style={s.tag}>A FRIEND FOR EVERY DAY</Text>
        </View>
        <View style={[s.hero, { height: heroHeight }]}>
          <Animated.View style={[s.artwork, illustrationMotion]}>
            <Image
              source={require('../../../public/imagePanda.png')}
              accessibilityLabel="Panda smiling and waving from a phone home screen"
              resizeMode="contain"
              style={{
                width: artWidth,
                height: artWidth * 1124 / 1399,
              }}
            />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[s.heart, heartMotion]}>
            <Ionicons name="heart" size={24} color="#DC9FB6" />
          </Animated.View>
        </View>
        <Animated.View style={[s.sheet, sheetMotion]}>
          <View style={s.handle} />
          {step === 'intro' ? (
            <>
              <Text accessibilityRole="header" style={s.title}>
                Take Panda{'\n'}Everywhere 🐼
              </Text>
              <Text style={s.description}>
                Your Korean-speaking companion is just one tap away.
              </Text>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Widget size"
                style={s.options}
              >
                {(
                  [
                    ['small', 'Companion', 'A little hello'],
                    ['medium', 'Daily Korean', 'A phrase & your progress'],
                  ] as const
                ).map(([value, label, subtitle]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label} widget`}
                    accessibilityState={{ checked: size === value }}
                    aria-checked={size === value}
                    onPress={() => setSize(value)}
                    style={[s.option, size === value && s.selected]}
                  >
                    <View style={s.optionTop}>
                      <Ionicons
                        name={value === 'small' ? 'square-outline' : 'albums-outline'}
                        size={19}
                        color="#426D8C"
                      />
                      <Text style={s.optionTitle}>{label}</Text>
                      {size === value && (
                        <Ionicons name="checkmark-circle" size={17} color="#426D8C" />
                      )}
                    </View>
                    <Text style={s.optionCaption}>{subtitle}</Text>
                  </Pressable>
                ))}
              </View>
              <Animated.View style={buttonMotion}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add Panda Widget"
                  accessibilityState={{ busy, disabled: busy }}
                  disabled={busy}
                  onPress={() => void add()}
                  onPressIn={() => press.set(reduced ? 1 : withTiming(0.98, { duration: 100 }))}
                  onPressOut={() => press.set(reduced ? 1 : withTiming(1, { duration: 140 }))}
                  style={s.primary}
                >
                  <Ionicons name="add-circle-outline" size={21} color="#163E64" />
                  <Text style={s.primaryText}>{busy ? 'Opening…' : 'Add Panda Widget'}</Text>
                </Pressable>
              </Animated.View>
              <Pressable
                accessibilityRole="button"
                onPress={() => leave('dismissed')}
                style={s.secondary}
              >
                <Text style={s.secondaryText}>Maybe Later</Text>
              </Pressable>
              <Text style={s.fine}>A gentle nudge. No notifications needed.</Text>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={s.title}>
                {result === 'requested'
                  ? 'One little tap to confirm.'
                  : 'Make a little space for Panda.'}
              </Text>
              <Text accessibilityLiveRegion="polite" style={s.description}>
                {error ||
                  (result === 'requested'
                    ? 'Your launcher will ask you to confirm. If no prompt appears, add Panda using the steps below.'
                    : result === 'preview'
                      ? 'Widgets need an installed Haru development or release build. This browser or Expo Go preview can show the guide, but cannot install a widget.'
                      : 'You choose where Panda lives. Add the widget from your Home Screen gallery.')}
              </Text>
              {Platform.OS === 'web' && (
                <View style={s.platforms}>
                  {(['ios', 'android'] as const).map((os) => (
                    <Pressable
                      key={os}
                      accessibilityRole="button"
                      accessibilityState={{ selected: guideOS === os }}
                      onPress={() => setGuideOS(os)}
                      style={[s.platform, guideOS === os && s.selected]}
                    >
                      <Text style={s.optionTitle}>{os === 'ios' ? 'iPhone' : 'Android'}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <View style={s.steps}>
                {(guideOS === 'ios' ? stepsIOS : stepsAndroid).map((text, i) => (
                  <View key={text} style={s.step}>
                    <View style={s.number}>
                      <Text style={s.numberText}>{i + 1}</Text>
                    </View>
                    <Text style={s.stepText}>{text}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to My Cozy Room"
                onPress={() => leave(result === 'requested' ? 'requested' : 'dismissed')}
                style={s.primary}
              >
                <Text style={s.primaryText}>Back to My Cozy Room</Text>
                <Ionicons name="arrow-forward" size={20} color="#163E64" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep('intro')}
                style={s.secondary}
              >
                <Text style={s.secondaryText}>Back</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E7F1FF' },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 540, alignSelf: 'center' },
  brandRow: {
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: { fontSize: 24, fontWeight: '800', letterSpacing: -1, color: '#334EAC' },
  hangul: { fontSize: 11, fontWeight: '400', letterSpacing: 0 },
  tag: { fontSize: 8, letterSpacing: 1.3, color: '#4E6593' },
  hero: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  artwork: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  heart: {
    position: 'absolute',
    right: 27,
    top: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FCFF',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FCFAF5',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 18,
    boxShadow: '0px -5px 24px rgba(55,80,110,0.05)',
  },
  handle: {
    height: 4,
    width: 32,
    borderRadius: 4,
    backgroundColor: '#D9E1E8',
    alignSelf: 'center',
    marginBottom: 1,
  },
  title: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: -1.1,
    textAlign: 'center',
    color: '#173B5C',
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#566D80',
    textAlign: 'center',
    maxWidth: 360,
    alignSelf: 'center',
  },
  options: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E0E6E8',
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  selected: { backgroundColor: '#E7F1FF', borderColor: '#7096D1' },
  optionTop: { flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap' },
  optionTitle: { fontSize: 12, fontWeight: '600', color: '#264C6B' },
  optionCaption: { fontSize: 10, lineHeight: 16, color: '#566D80' },
  primary: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#9EDAF2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#163E64' },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600', color: '#607389' },
  fine: { fontSize: 11, textAlign: 'center', color: '#63798A' },
  steps: { gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  number: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#E7F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: 12, fontWeight: '700', color: '#426D8C' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#36566C' },
  platforms: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  platform: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#DEE5EB',
    borderRadius: 20,
  },
});
