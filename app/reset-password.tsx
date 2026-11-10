import { useState } from 'react';
import { router } from 'expo-router';
import { db } from '../src/lib/supabase';
import { errorMessage } from '../src/lib/learning';
import { Button, ErrorNotice, Field, Heading, Screen } from '../src/components/ui';
export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (password.length < 8) throw new Error('Use at least 8 characters.');
      const { error } = await db().auth.updateUser({ password });
      if (error) throw error;
      router.replace('/(tabs)');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading>A fresh password.</Heading>
      <Field
        label="New password"
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <ErrorNotice message={error} />
      <Button title="Save password" loading={busy} onPress={() => void save()} />
    </Screen>
  );
}
