import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import {
  Body,
  Button,
  Card,
  Chip,
  ErrorNotice,
  Eyebrow,
  Heading,
  Row,
  Screen,
} from '../../src/components/ui';
import { useApp } from '../../src/state/store';
import { errorMessage } from '../../src/lib/learning';
import { confirmAction } from '../../src/lib/confirm';
export default function Review() {
  const app = useApp();
  const [tab, setTab] = useState('Expressions');
  const [showLearned, setShowLearned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const items = app.expressions.filter((e) => showLearned || !e.learned);
  return (
    <Screen bottom={false} refreshing={app.loading} onRefresh={() => void app.refresh()}>
      <Eyebrow>Keep the words that matter</Eyebrow>
      <Heading>Make it yours.</Heading>
      <Body muted>Useful phrases and thoughtful corrections, ready for another try.</Body>
      <Row>
        {['Expressions', 'Corrections'].map((t) => (
          <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />
        ))}
      </Row>
      <ErrorNotice message={error ?? app.error} />
      {!app.session ? (
        <Card>
          <Heading small>A home for your words</Heading>
          <Body>
            Sign in to save expressions, review corrections and keep your learning history.
          </Body>
          <Button title="Sign in" onPress={() => router.push('/auth')} />
        </Card>
      ) : tab === 'Expressions' ? (
        <>
          <Chip
            label={showLearned ? 'Showing all expressions' : 'Showing expressions to review'}
            selected={showLearned}
            onPress={() => setShowLearned(!showLearned)}
          />
          {!items.length && (
            <Card>
              <Heading small>Your collection starts small.</Heading>
              <Body>Save a useful phrase from a lesson or conversation. It will appear here.</Body>
              <Button
                title="Find a lesson"
                secondary
                onPress={() => router.push('/(tabs)/lessons')}
              />
            </Card>
          )}
          {items.map((e) => (
            <Card key={e.id}>
              <Heading small>{e.korean}</Heading>
              <Body muted>{e.english}</Body>
              {e.note ? <Body>{e.note}</Body> : null}
              <Button
                title="Practice aloud"
                secondary
                disabled={busy}
                onPress={() =>
                  router.push({
                    pathname: '/conversation/[id]',
                    params: { id: Crypto.randomUUID(), target: e.korean },
                  })
                }
              />
              <View style={{ gap: 10 }}>
                <Button
                  title={e.learned ? 'Move back to review' : 'Mark as learned'}
                  disabled={busy}
                  onPress={() => void action(() => app.toggleLearned(e.id, !e.learned))}
                />
                <Button
                  title="Remove expression"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    confirmAction(
                      'Remove expression?',
                      'This removes it from your saved review collection.',
                      () => void action(() => app.removeExpression(e.id)),
                    )
                  }
                />
              </View>
            </Card>
          ))}
        </>
      ) : (
        <>
          {!app.corrections.length && (
            <Card>
              <Heading small>Mistakes have a place here.</Heading>
              <Body>
                After a conversation, useful grammar and vocabulary corrections will appear here.
                Dori won’t invent one for every sentence.
              </Body>
            </Card>
          )}
          {app.corrections.map((c) => (
            <Card key={c.id}>
              <Chip label={c.category} />
              <Body muted>You said: {c.original}</Body>
              <Heading small>{c.corrected}</Heading>
              <Body>{c.explanation}</Body>
              <Button
                title="Save corrected expression"
                secondary
                disabled={busy || app.expressions.some((e) => e.korean === c.corrected)}
                onPress={() =>
                  void action(() => app.saveExpression(c.corrected, '', c.explanation))
                }
              />
              <Button
                title="Try the sentence again"
                disabled={busy}
                onPress={() =>
                  router.push({
                    pathname: '/conversation/[id]',
                    params: { id: Crypto.randomUUID(), target: c.corrected },
                  })
                }
              />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
