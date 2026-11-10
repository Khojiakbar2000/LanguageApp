import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Back, Body, Button, ErrorNotice, Field, Heading, Screen } from '../src/components/ui';
import { configured, db } from '../src/lib/supabase';
import { errorMessage } from '../src/lib/learning';
import { useApp, usePreferences } from '../src/state/store';
import { usePanda } from '../src/state/panda';
export default function Auth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [signup, setSignup] = useState(params.mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const prefs = usePreferences();
  async function submit() {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      if (!email.trim() || password.length < 8)
        throw new Error('Enter an email address and a password of at least 8 characters.');
      const result = signup
        ? await db().auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: Linking.createURL('/auth/callback'),
              data: {
                display_name: name.trim() || 'Learner',
                level: prefs.level,
                goal: prefs.goal,
                ...(usePanda.getState().guestPending
                  ? {
                      panda_outfit: usePanda.getState().guest.outfit,
                      panda_accessory: usePanda.getState().guest.accessory,
                    }
                  : {}),
                ...(prefs.futurePendingProfile &&
                (!prefs.futureSyncOwner ||
                  prefs.futureSyncOwner === useApp.getState().session?.user.id)
                  ? prefs.futurePendingProfile
                  : {}),
              },
            },
          })
        : await db().auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (!result.data.session) {
        setNotice('Check your email to confirm your account. Then return here to sign in.');
        return;
      }
      useApp.getState().setSession(result.data.session);
      prefs.setPreferences({ onboarded: true });
      await useApp.getState().refresh();
      router.replace('/(tabs)');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      if (!email.trim()) throw new Error('Enter your email address first.');
      const { error } = await db().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Linking.createURL('/auth/callback', { queryParams: { next: 'reset' } }),
      });
      if (error) throw error;
      setNotice('If this account exists, a password-reset link will arrive by email.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Back />
      <Heading>{signup ? 'Make room for\na little Korean.' : 'Good to see you.'}</Heading>
      <Body muted>
        {signup
          ? 'Your conversations, corrections and small wins, all in one place.'
          : 'Sign in to pick up where you left off.'}
      </Body>
      {!configured && (
        <>
          <ErrorNotice message="Live practice needs a Supabase connection. The lesson catalog is available to explore." />
          <Button title="Open setup instructions" secondary onPress={() => router.push('/setup')} />
        </>
      )}
      <View style={{ gap: 18 }}>
        {signup && (
          <Field
            label="Your name"
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoComplete="given-name"
          />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={signup ? 'new-password' : 'current-password'}
        />
      </View>
      <ErrorNotice message={error} />
      {notice ? <Body>{notice}</Body> : null}
      <Button
        title={signup ? 'Create account' : 'Sign in'}
        loading={busy}
        disabled={!configured}
        onPress={() => void submit()}
      />
      <Button
        title={signup ? 'Already a member? Sign in' : 'New here? Create an account'}
        secondary
        disabled={busy}
        onPress={() => {
          setSignup(!signup);
          setError(null);
          setNotice('');
        }}
      />
      {!signup && (
        <Button
          title="Send password reset email"
          secondary
          disabled={busy || !configured}
          onPress={() => void reset()}
        />
      )}
      <Body muted>
        Your recordings are sent to the configured speech provider for transcription. Haru does not
        retain raw microphone recordings on its server. See Setup for data and service details.
      </Body>
    </Screen>
  );
}
