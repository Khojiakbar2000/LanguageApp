import { useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Body,
  Button,
  Card,
  Chip,
  colors,
  ErrorNotice,
  Eyebrow,
  Field,
  Heading,
  Row,
  Screen,
} from '../../src/components/ui';
import { useApp, usePreferences } from '../../src/state/store';
import { goals, levels } from '../../src/lib/types';
import { activeStreak, errorMessage } from '../../src/lib/learning';
import { invoke } from '../../src/lib/supabase';
import { confirmAction } from '../../src/lib/confirm';
import { PandaCustomizer } from '../../src/components/PandaCustomizer';
import { setDailyLearningReminder } from '../../src/lib/dailyReminder';
export default function Profile() {
  const profile = useApp((s) => s.profile);
  const hydrated = usePreferences((s) => s.hydrated);
  return (
    <ProfileForm
      key={
        profile
          ? `${profile.id}:${profile.display_name}:${profile.level}:${profile.goal}`
          : `guest:${hydrated}`
      }
    />
  );
}
function ProfileForm() {
  const app = useApp();
  const prefs = usePreferences();
  const [name, setName] = useState(app.profile?.display_name ?? '');
  const [level, setLevel] = useState(app.profile?.level ?? prefs.level);
  const [goal, setGoal] = useState(app.profile?.goal ?? prefs.goal);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen bottom={false} refreshing={app.loading} onRefresh={() => void app.refresh()}>
      <Eyebrow>Your own pace</Eyebrow>
      <Heading>
        {app.profile?.display_name ? `${app.profile.display_name}’s corner.` : 'A little more you.'}
      </Heading>
      <Body muted>Shape your practice around the life you want to live.</Body>
      <PandaCustomizer />
      <Button
        title="Add Panda to Home Screen"
        secondary
        icon="grid-outline"
        onPress={() => router.push('/panda-widget')}
      />
      <ErrorNotice message={error ?? app.error} />
      {notice ? <Body>{notice}</Body> : null}
      {!app.session && (
        <Card>
          <Heading small>Keep your small wins.</Heading>
          <Body>Create an account to save your conversations and progress.</Body>
          <Button title="Sign in or create an account" onPress={() => router.push('/auth')} />
        </Card>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          [String(app.stats?.total_turns ?? 0), 'Replies practiced'],
          [String(app.stats?.completed_sessions ?? 0), 'Sessions finished'],
          [String(app.streak?.current_streak ?? activeStreak(app.stats)), 'Day streak'],
          [String(app.expressions.filter((e) => e.learned).length), 'Phrases learned'],
        ].map(([value, label]) => (
          <View
            key={label}
            style={{
              width: '47%',
              borderRadius: 20,
              backgroundColor: colors.ice,
              padding: 20,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 30, fontWeight: '700', color: colors.primary }}>{value}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
          </View>
        ))}
      </View>
      <Body muted>
        Your streak follows your device timezone and counts completed learning activities. It is not
        a proficiency score.
      </Body>
      {app.session && (
        <Field label="Your name" value={name} onChangeText={setName} maxLength={60} />
      )}
      <Heading small>Your Korean level</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {levels.map((l) => (
          <Chip key={l} label={l} selected={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>
      <Heading small>Your learning goal</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {goals.map((g) => (
          <Chip key={g} label={g} selected={goal === g} onPress={() => setGoal(g)} />
        ))}
      </View>
      <Button
        title="Save preferences"
        loading={busy}
        onPress={() =>
          void run(async () => {
            if (app.session) {
              if (!name.trim()) throw new Error('Please enter your name.');
              await app.updateProfile({ display_name: name.trim(), level, goal });
            } else prefs.setPreferences({ level, goal });
            setNotice('Your preferences are saved.');
          })
        }
      />
      <Row>
        <View style={{ flex: 1 }}>
          <Body>English captions</Body>
          <Body muted>Translations beside Korean replies</Body>
        </View>
        <Switch
          accessibilityLabel="English captions"
          value={prefs.captions}
          onValueChange={(captions) => prefs.setPreferences({ captions })}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </Row>
      {app.session && (
        <Row>
          <View style={{ flex: 1 }}>
            <Body>Daily Korean reminder</Body>
            <Body muted>
              {Platform.OS === 'web'
                ? 'Set reminders in the mobile app.'
                : `A gentle Haru note at ${prefs.reminderHour % 12 || 12} ${prefs.reminderHour < 12 ? 'am' : 'pm'}, using your local time.`}
            </Body>
          </View>
          <Switch
            accessibilityLabel="Daily Korean reminder"
            value={!!app.profile?.daily_reminders_enabled}
            disabled={busy || Platform.OS === 'web'}
            onValueChange={(enabled) =>
              void run(async () => {
                try {
                  if (enabled) await setDailyLearningReminder(true, prefs.reminderHour);
                  await app.updateProfile({ daily_reminders_enabled: enabled });
                  if (!enabled) await setDailyLearningReminder(false);
                  prefs.setPreferences({ reminderEnabled: enabled });
                  setNotice(
                    enabled ? 'Your gentle daily reminder is on.' : 'Your daily reminder is off.',
                  );
                } catch (error) {
                  if (enabled) await setDailyLearningReminder(false).catch(() => undefined);
                  throw error;
                }
              })
            }
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </Row>
      )}
      <Heading small>Conversation history</Heading>
      {!app.history.length && <Body muted>Your saved practice sessions will appear here.</Body>}
      {app.history.map((c) => (
        <Button
          key={c.id}
          title={`${c.title} · ${c.status === 'completed' ? 'Finished' : 'Resume'} · ${new Date(c.created_at).toLocaleDateString()}`}
          secondary
          onPress={() =>
            router.push({
              pathname: '/conversation/[id]',
              params: { id: c.id, lessonId: c.lesson_id ?? undefined },
            })
          }
        />
      ))}
      <Button title="Setup & data information" secondary onPress={() => router.push('/setup')} />
      {app.session && (
        <>
          <Button
            title="Sign out"
            secondary
            disabled={busy}
            onPress={() =>
              confirmAction(
                'Sign out?',
                'Your saved lessons and conversations will remain in your account.',
                () =>
                  void run(async () => {
                    await app.signOut();
                    router.replace('/welcome');
                  }),
              )
            }
          />
          <Button
            title={deleting ? 'Cancel account deletion' : 'Delete my account'}
            secondary
            disabled={busy}
            onPress={() => setDeleting(!deleting)}
          />
          {deleting && (
            <Card>
              <Body>
                Deletion permanently removes your Haru profile, conversations, corrections, saved
                expressions and tutor audio. External provider policies still apply.
              </Body>
              <Field
                label="Type DELETE to confirm"
                value={confirmation}
                onChangeText={setConfirmation}
                autoCapitalize="characters"
              />
              <Button
                title="Permanently delete account"
                disabled={confirmation !== 'DELETE' || busy}
                loading={busy}
                onPress={() =>
                  void run(async () => {
                    await invoke('delete-account', { confirmation });
                    await app.signOut();
                    router.replace('/welcome');
                  })
                }
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
