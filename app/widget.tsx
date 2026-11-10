import { Redirect } from 'expo-router';
// Both operating-system widgets use harukorean://widget. Paid practice remains auth-gated.
export default function WidgetEntry() {
  return <Redirect href="/(tabs)" />;
}
