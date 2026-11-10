import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  Back,
  Body,
  Button,
  Card,
  Chip,
  colors,
  ErrorNotice,
  Eyebrow,
  Heading,
  Screen,
} from '../../src/components/ui';
import { Tutor } from '../../src/components/Tutor';
import { useApp } from '../../src/state/store';
import { errorMessage } from '../../src/lib/learning';
import { preConversationLessons } from '../../src/content/preConversationLessons';
import { PreConversationLesson } from '../../src/components/PreConversationLesson';
export default function LessonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const lesson = app.lessons.find((l) => l.id === id);
  const guidedLesson = preConversationLessons.find((item) => item.id === id);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (guidedLesson) return <PreConversationLesson lesson={guidedLesson} />;
  if (!lesson)
    return (
      <Screen>
        <Back />
        <Heading>Lesson not found.</Heading>
        <Button title="Browse lessons" onPress={() => router.replace('/(tabs)/lessons')} />
      </Screen>
    );
  async function save(korean: string, english: string) {
    setSaving(true);
    setError(null);
    try {
      await app.saveExpression(korean, english);
      setSaved(korean);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Screen>
      <Back title="Lessons" />
      <Tutor size={150} />
      <View style={{ gap: 10 }}>
        <Eyebrow>
          {lesson.category} · {lesson.duration_minutes} min
        </Eyebrow>
        <Heading>{lesson.title}</Heading>
        <Body muted>{lesson.korean_title}</Body>
        <Chip label={lesson.level} />
      </View>
      <Card>
        <Heading small>In this conversation</Heading>
        {lesson.objectives.map((o, i) => (
          <Body key={o}>
            {i + 1}. {o}
          </Body>
        ))}
      </Card>
      <View style={{ gap: 16 }}>
        <Heading small>A few words to take with you</Heading>
        {lesson.expressions.map((e) => (
          <Card key={e.korean}>
            <Text selectable style={{ fontSize: 22, lineHeight: 32, color: colors.ink }}>
              {e.korean}
            </Text>
            <Body muted>{e.english}</Body>
            <Button
              title={
                saved === e.korean || app.expressions.some((x) => x.korean === e.korean)
                  ? 'Saved to Review'
                  : 'Save expression'
              }
              secondary
              disabled={saving || app.expressions.some((x) => x.korean === e.korean)}
              onPress={() => (app.session ? void save(e.korean, e.english) : router.push('/auth'))}
            />
          </Card>
        ))}
      </View>
      <ErrorNotice message={error} />
      <Body muted>
        Practice with polite Korean. Your tutor will adapt to the level in your profile.
      </Body>
      <Button
        title="Let’s talk"
        icon="mic-outline"
        onPress={() =>
          app.session
            ? router.push({
                pathname: '/conversation/[id]',
                params: { id: Crypto.randomUUID(), lessonId: lesson.id },
              })
            : router.push('/auth')
        }
      />
    </Screen>
  );
}
