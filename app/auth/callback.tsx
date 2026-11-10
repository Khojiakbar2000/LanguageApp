import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { db } from '../../src/lib/supabase';
import { errorMessage } from '../../src/lib/learning';
import { Body, Button, ErrorNotice, Heading, Screen } from '../../src/components/ui';
export default function Callback() {
  const { code, next } = useLocalSearchParams<{ code?: string; next?: string }>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function finish() {
      try {
        if (!code)
          throw new Error(
            'This email link is incomplete. Return to sign in and request a new link.',
          );
        const { error } = await db().auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (active) router.replace(next === 'reset' ? '/reset-password' : '/(tabs)');
      } catch (e) {
        if (active) setError(errorMessage(e));
      }
    }
    void finish();
    return () => {
      active = false;
    };
  }, [code, next]);
  return (
    <Screen>
      <Heading>Welcome back.</Heading>
      <Body>Finishing your secure sign-in…</Body>
      <ErrorNotice message={error} />
      {error && <Button title="Return to sign in" onPress={() => router.replace('/auth')} />}
    </Screen>
  );
}
