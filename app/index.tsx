import { Redirect } from 'expo-router';
import { useApp, usePreferences } from '../src/state/store';
export default function Index() {
  const initialized = useApp((s) => s.initialized);
  const hydrated = usePreferences((s) => s.hydrated);
  const onboarded = usePreferences((s) => s.onboarded);
  const inProgress = usePreferences((s) => s.futureInProgress);
  const session = useApp((s) => s.session);
  // The root launch screen covers initialization, including direct deep links.
  if (!initialized || !hydrated) return null;
  return (
    <Redirect href={session || onboarded ? '/(tabs)' : inProgress ? '/onboarding' : '/welcome'} />
  );
}
