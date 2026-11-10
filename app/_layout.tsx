import '../global.css';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeApp, useApp, usePreferences } from '../src/state/store';
import { usePanda } from '../src/state/panda';
import { LaunchScreen } from '../src/components/LaunchScreen';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../src/lib/supabase';
import { colors } from '../src/components/ui';
import { WidgetDataSync } from '../src/features/panda-widget/WidgetDataSync';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
  SplashScreen.setOptions({ duration: 150, fade: true });
}

export default function RootLayout() {
  const [launchVisible, setLaunchVisible] = useState(true);
  const initialized = useApp((s) => s.initialized);
  const preferencesHydrated = usePreferences((s) => s.hydrated);
  const pandaHydrated = usePanda((s) => s.hydrated);
  const finishLaunch = useCallback(() => setLaunchVisible(false), []);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void initializeApp().then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
      subscription.remove();
    };
  }, []);
  return (
    <SafeAreaProvider>
      <WidgetDataSync />
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="conversation/[id]" options={{ gestureEnabled: false }} />
        </Stack>
        {launchVisible && (
          <LaunchScreen
            ready={initialized && preferencesHydrated && pandaHydrated}
            onFinished={finishLaunch}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}
