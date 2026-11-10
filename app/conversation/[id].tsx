import { useState, useRef, useEffect } from 'react';
import { useWidgetInvitation } from '../../src/features/panda-widget/preferences';
import { Pressable, Text, View, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Back,
  Body,
  Button,
  Card,
  Chip,
  colors,
  ErrorNotice,
  Field,
  Heading,
  Row,
} from '../../src/components/ui';
import { Tutor } from '../../src/components/Tutor';
import { StreakCelebration } from '../../src/components/StreakCelebration';
import { useConversation } from '../../src/hooks/useConversation';
import { useApp, usePreferences } from '../../src/state/store';
import { errorMessage } from '../../src/lib/learning';
import type { TutorState } from '../../src/lib/types';
import { preConversationLessons } from '../../src/content/preConversationLessons';

export default function ConversationScreen() {
  const app = useApp();
  if (!app.session)
    return (
      <Screen>
        <Back />
        <Heading>Your practice is waiting.</Heading>
        <Body>Sign in to start a real conversation with Dori.</Body>
        <Button title="Sign in" onPress={() => router.replace('/auth')} />
      </Screen>
    );
  return <ConnectedConversation />;
}
function ConnectedConversation() {
  const { id, lessonId, target } = useLocalSearchParams<{
    id: string;
    lessonId?: string;
    target?: string;
  }>();
  const app = useApp();
  const prefs = usePreferences();
  const chat = useConversation(id, lessonId ?? null);
  const invitationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (invitationTimer.current) clearTimeout(invitationTimer.current);
    },
    [],
  );
  async function finishPractice() {
    const first = app.stats?.completed_sessions === 0;
    const succeeded = await chat.finish();
    if (
      succeeded &&
      first &&
      useWidgetInvitation.getState().hydrated &&
      useWidgetInvitation.getState().status === 'unseen'
    ) {
      invitationTimer.current = setTimeout(() => {
        useWidgetInvitation.getState().record('shown');
        router.replace('/panda-widget');
      }, 1100);
    }
  }
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lesson = app.lessons.find((l) => l.id === lessonId);
  const guidedLesson = preConversationLessons.find((l) => l.id === lessonId);
  const latest = chat.messages.filter((m) => m.role === 'assistant').at(-1);
  const states: Record<string, TutorState> = {
    loading: 'thinking',
    idle: chat.completed ? 'celebrating' : 'idle',
    recording: 'listening',
    transcribing: 'thinking',
    thinking: 'thinking',
    speaking: 'speaking',
  };
  const labels: Record<string, string> = {
    loading: 'Getting your practice ready…',
    idle: chat.completed ? 'A little more confident.' : 'Take your time. Your turn.',
    recording: `Listening · ${chat.recordingSeconds}s / 45s`,
    transcribing: 'Listening back to your words…',
    thinking: 'Dori is thinking…',
    speaking: 'Dori is speaking…',
  };
  const busy = !['idle', 'recording'].includes(chat.phase);
  async function save(korean: string, english: string, note = '') {
    setSaving(true);
    setSaveError(null);
    try {
      await app.saveExpression(korean, english, note);
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Screen>
      <Row>
        <Back title="Leave practice" />
        <Chip label={app.profile?.level ?? 'Korean practice'} />
      </Row>
      <Heading small>{lesson?.title ?? 'Free Talk'}</Heading>
      {guidedLesson && (
        <Card style={{ gap: 8, backgroundColor: colors.ice }}>
          <Body>{guidedLesson.scenario}</Body>
          <Body muted>Goal: {guidedLesson.objectives.join(' · ')}</Body>
          <Body muted>
            Try: {guidedLesson.expressions.map((item) => item.korean).join('  ·  ')}
          </Body>
        </Card>
      )}
      <Tutor state={states[chat.phase]} size={155} />
      <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, textAlign: 'center' }}>
        {labels[chat.phase]}
      </Text>
      {target && (
        <Card style={{ backgroundColor: colors.sage }}>
          <Body muted>Try saying this phrase in your next reply:</Body>
          <Heading small>{target.slice(0, 1200)}</Heading>
        </Card>
      )}
      <Row>
        <Body>English captions</Body>
        <Chip
          label={prefs.captions ? 'On' : 'Off'}
          selected={prefs.captions}
          onPress={() => prefs.setPreferences({ captions: !prefs.captions })}
        />
      </Row>
      {chat.messages.map((m) => (
        <View
          key={m.id}
          style={{
            gap: 10,
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '96%',
            backgroundColor: m.role === 'user' ? colors.ice : colors.card,
            borderRadius: 22,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>
            {m.role === 'user' ? 'YOU' : 'DORI'}
          </Text>
          <Text selectable style={{ color: colors.ink, fontSize: 21, lineHeight: 32 }}>
            {m.content}
          </Text>
          {prefs.captions && m.translation && <Body muted>{m.translation}</Body>}
          {m.role === 'assistant' && (
            <Row>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Replay Korean audio"
                disabled={busy || chat.phase === 'recording'}
                onPress={() => void chat.speak(m)}
                style={{ minHeight: 44, justifyContent: 'center', padding: 8 }}
              >
                <Ionicons name="volume-high-outline" size={22} color={colors.primary} />
              </Pressable>
              <Button
                title={
                  app.expressions.some((e) => e.korean === m.content) ? 'Saved' : 'Save phrase'
                }
                secondary
                disabled={saving || app.expressions.some((e) => e.korean === m.content)}
                onPress={() => void save(m.content, m.translation ?? '')}
              />
            </Row>
          )}
        </View>
      ))}
      {chat.corrections.length > 0 && <Heading small>A more natural way</Heading>}
      {chat.corrections.map((c) => (
        <Card key={c.id} style={{ backgroundColor: colors.sage }}>
          <Chip label={c.category} />
          <Body muted>You said: {c.original}</Body>
          <Heading small>{c.corrected}</Heading>
          <Body>{c.explanation}</Body>
          <Button
            title={
              app.expressions.some((e) => e.korean === c.corrected)
                ? 'Saved to Review'
                : 'Save correction'
            }
            secondary
            disabled={saving || app.expressions.some((e) => e.korean === c.corrected)}
            onPress={() => void save(c.corrected, '', c.explanation)}
          />
          <Button
            title="Try this sentence"
            secondary
            disabled={busy || chat.completed || chat.phase === 'recording'}
            onPress={() => chat.setDraft(c.corrected)}
          />
        </Card>
      ))}
      <ErrorNotice message={saveError} />
      <ErrorNotice
        message={chat.speechError}
        onRetry={latest ? () => void chat.speak(latest) : undefined}
      />
      <ErrorNotice message={chat.error} onRetry={chat.canRetry ? chat.retry : undefined} />
      {chat.error?.includes('Microphone permission') && (
        <Button
          title="Open microphone settings"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(() =>
              setSaveError('Open your device settings and allow Haru microphone access.'),
            );
          }}
        />
      )}
      {chat.encouragement ? <Body muted>{chat.encouragement}</Body> : null}
      {chat.completed ? (
        <>
          {!!chat.streakAward?.recorded && !!chat.streakAward.first_activity_today && (
            <StreakCelebration
              visible
              currentStreak={chat.streakAward.current_streak ?? 0}
              xp={chat.streakAward.xp_awarded ?? 15}
              milestones={chat.streakAward.milestones ?? []}
              onContinue={() => undefined}
            />
          )}
          <Card>
            <Heading small>You showed up. That counts.</Heading>
            <Body>
              Your conversation and corrections are saved. Review a phrase, or choose another
              moment.
            </Body>
            <Button
              title="Review my expressions"
              onPress={() => router.replace('/(tabs)/review')}
            />
            <Button
              title="Choose another lesson"
              secondary
              onPress={() => router.replace('/(tabs)/lessons')}
            />
          </Card>
        </>
      ) : (
        <View style={{ gap: 12 }}>
          {chat.phase === 'speaking' && (
            <Button title="Stop audio" secondary onPress={chat.stopSpeech} />
          )}
          <Button
            title={chat.phase === 'recording' ? 'Stop & transcribe' : 'Tap to record'}
            icon={chat.phase === 'recording' ? 'stop-circle-outline' : 'mic-outline'}
            disabled={busy || !chat.messages.length || chat.finishing}
            onPress={() => void chat.toggleRecording()}
          />
          <Body muted>
            Tap once to record, then again to stop. Check the transcript before sending. You can
            also type.
          </Body>
          <Field
            label="Your Korean reply"
            placeholder="한국어로 말해 보세요…"
            multiline
            value={chat.draft}
            onChangeText={chat.setDraft}
            editable={!busy && chat.phase !== 'recording'}
            maxLength={1000}
          />
          <Button
            title="Send reply"
            icon="arrow-up"
            disabled={
              busy ||
              chat.phase === 'recording' ||
              !chat.draft.trim() ||
              !chat.messages.length ||
              chat.finishing
            }
            onPress={chat.send}
          />
          <Button
            title="Finish practice"
            secondary
            loading={chat.finishing}
            disabled={
              busy || chat.phase === 'recording' || !chat.messages.some((m) => m.role === 'user')
            }
            onPress={() => void finishPractice()}
          />
        </View>
      )}
    </Screen>
  );
}
