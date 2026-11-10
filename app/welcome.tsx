import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingFrame } from '../src/components/Onboarding';
import { Tutor } from '../src/components/Tutor';
import { colors } from '../src/components/ui';
import { usePreferences } from '../src/state/store';

const ivory = '#FFFDF7';
export default function Welcome() {
  const compact = useWindowDimensions().height < 720;
  return (
    <OnboardingFrame
      background={ivory}
      footer={
        <View style={s.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Say Hello"
            onPress={() => router.push('/onboarding')}
            style={s.primary}
          >
            <Text style={s.primaryText}>Say Hello</Text>
            <Ionicons name="arrow-forward" size={20} color={ivory} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/auth')}
            style={s.account}
          >
            <Text style={s.accountText}>I already have an account</Text>
          </Pressable>
        </View>
      }
    >
      <View style={[s.hero, compact && s.heroCompact]}>
        <View style={s.panda}>
          <Tutor state="happy" size={compact ? 170 : 230} />
        </View>
        <View style={s.helloBubble}>
          <Text style={s.helloText}>안녕! I’m Dori.</Text>
        </View>
        <Text accessibilityRole="header" style={[s.title, compact && s.titleCompact]}>
          Your Korean-speaking buddy is here.
        </Text>
        <Text style={s.subtitle}>One little hello is a lovely place to start.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore the lesson catalog"
          onPress={() => {
            usePreferences.getState().setPreferences({ onboarded: true });
            router.replace('/(tabs)/lessons');
          }}
          style={s.explore}
        >
          <Text style={s.exploreText}>Explore lessons first</Text>
        </Pressable>
      </View>
    </OnboardingFrame>
  );
}

const s = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15, paddingVertical: 18 },
  heroCompact: { gap: 9, paddingVertical: 7 },
  panda: { width: '100%', alignItems: 'center' },
  helloBubble: {
    backgroundColor: colors.ice,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  helloText: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  titleCompact: { fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  explore: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  exploreText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  footer: { gap: 6 },
  primary: {
    minHeight: 58,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 18,
  },
  primaryText: { color: ivory, fontSize: 17, fontWeight: '800' },
  account: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  accountText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
