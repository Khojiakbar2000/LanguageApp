import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import {
  preConversationLessons,
  type Exercise,
  type LessonStage,
  type PreConversationLesson as CurriculumLesson,
} from '../content/preConversationLessons';
import {
  loadLessonProgress,
  saveLessonProgress,
  emptyLessonProgress,
  type LessonProgressRecord,
} from '../lib/lessonProgress';
import { invoke } from '../lib/supabase';
import { useApp } from '../state/store';
import { Back, Body, Button, Card, Chip, colors, Eyebrow, Heading, Row, Screen } from './ui';
import { Tutor } from './Tutor';

const stages: LessonStage[] = [
  'introduction',
  'vocabulary',
  'expressions',
  'grammar',
  'practice',
  'ready',
];
const stageNames = ['Intro', 'Words', 'Phrases', 'Pattern', 'Practice', 'Talk'];
const expectedStage: Record<LessonStage, number> = {
  introduction: 0,
  vocabulary: 1,
  expressions: 2,
  grammar: 3,
  practice: 4,
  ready: 5,
};

export function isPreConversationLesson(id: string) {
  return preConversationLessons.some((lesson) => lesson.id === id);
}

export function PreConversationLesson({ lesson }: { lesson: CurriculumLesson }) {
  const app = useApp();
  const userId = app.session?.user.id ?? null;
  const player = useAudioPlayer(null);
  const [progress, setProgress] = useState<LessonProgressRecord>(() =>
    emptyLessonProgress(lesson.id),
  );
  const [hydrated, setHydrated] = useState(false);
  const [romanization, setRomanization] = useState(false);
  const [audioBusy, setAudioBusy] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stage = progress.currentStage;

  useEffect(() => {
    let alive = true;
    void loadLessonProgress(lesson.id, userId)
      .then((saved) => {
        if (alive) {
          setProgress(saved);
          setHydrated(true);
        }
      })
      .catch(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, [lesson.id, userId]);

  async function persist(next: LessonProgressRecord) {
    setProgress(next);
    try {
      await saveLessonProgress(next, userId);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Progress could not be saved.');
    }
  }
  async function moveTo(nextStage: LessonStage) {
    const completedStages = [...new Set([...progress.completedStages, stage])];
    const completedAt =
      nextStage === 'ready'
        ? (progress.completedAt ?? new Date().toISOString())
        : progress.completedAt;
    await persist({
      ...progress,
      currentStage: nextStage,
      completedStages,
      completedAt,
      updatedAt: new Date().toISOString(),
    });
    setPracticeIndex(0);
    setAnswer('');
    setSelected([]);
    setFeedback(null);
  }
  async function play(text: string) {
    setAudioError(null);
    setAudioBusy(text);
    try {
      const { url } = await invoke<{ url: string }>('speak-lesson', { text });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      player.replace(url);
      player.play();
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : 'Audio could not play. Please try again.',
      );
    } finally {
      setAudioBusy(null);
    }
  }

  const exercise = lesson.exercises[practiceIndex];
  function exerciseAnswer(item: Exercise) {
    if (item.type === 'arrange') return selected.join('');
    return answer.trim().replace(/[.?!。？！]$/u, '');
  }
  function expectedAnswer(item: Exercise) {
    return item.answer.replace(/[.?!。？！]$/u, '');
  }
  async function checkAnswer() {
    if (!exercise) return;
    const attempts = {
      ...progress.attempts,
      [exercise.id]: (progress.attempts[exercise.id] ?? 0) + 1,
    };
    const isCorrect =
      exerciseAnswer(exercise).replace(/\s+/g, '') === expectedAnswer(exercise).replace(/\s+/g, '');
    const correctExercises = isCorrect
      ? [...new Set([...progress.correctExercises, exercise.id])]
      : progress.correctExercises;
    setFeedback(isCorrect ? 'correct' : 'retry');
    await persist({ ...progress, attempts, correctExercises, updatedAt: new Date().toISOString() });
  }
  function nextExercise() {
    setFeedback(null);
    setAnswer('');
    setSelected([]);
    if (practiceIndex === 0) setPracticeIndex(1);
    else void moveTo('ready');
  }

  async function startConversation() {
    if (!app.session) {
      router.push('/auth');
      return;
    }
    setSaving(true);
    router.push({
      pathname: '/conversation/[id]',
      params: { id: Crypto.randomUUID(), lessonId: lesson.id },
    });
  }

  if (!hydrated)
    return (
      <Screen>
        <Back title="Lessons" />
        <Body muted>Resuming your lesson…</Body>
      </Screen>
    );
  const currentIndex = expectedStage[stage];
  return (
    <Screen>
      <Row>
        <Back title="Lessons" />
        <Chip label={`${currentIndex + 1} of 6`} />
      </Row>
      <View style={{ gap: 10 }}>
        <View
          style={{ flexDirection: 'row', gap: 5 }}
          accessibilityLabel={`Lesson step ${currentIndex + 1} of 6`}
        >
          {stages.map((item, index) => (
            <View
              key={item}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 5,
                backgroundColor: index <= currentIndex ? colors.primary : colors.ice,
              }}
            />
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          {stageNames[currentIndex]} · {lesson.durationMinutes} min · A1 beginner
        </Text>
      </View>

      {stage === 'introduction' && (
        <>
          <View style={{ gap: 12, alignItems: 'center' }}>
            <Tutor size={154} state="happy" />
            <Eyebrow>YOUR NEXT REAL-LIFE MOMENT</Eyebrow>
            <Heading>{lesson.title}</Heading>
            <Body muted style={{ textAlign: 'center' }}>
              {lesson.description}
            </Body>
          </View>
          <Card style={{ gap: 10 }}>
            <Heading small>After this, you can…</Heading>
            {lesson.objectives.map((objective, index) => (
              <Body key={objective}>
                {index + 1}. {objective}
              </Body>
            ))}
            <Body muted>{lesson.scenario}</Body>
          </Card>
          <Button
            title={stage !== 'introduction' ? 'Resume learning' : 'Start learning'}
            icon="arrow-forward"
            onPress={() => void moveTo('vocabulary')}
          />
          <Button
            title="Skip prep and start talking"
            secondary
            icon="mic-outline"
            onPress={() => void startConversation()}
          />
        </>
      )}

      {stage === 'vocabulary' && (
        <>
          <View style={{ gap: 8 }}>
            <Heading>Useful words</Heading>
            <Body muted>Tap the speaker to hear each word. Keep the ones you need.</Body>
          </View>
          <Row>
            <Body muted>{lesson.vocabulary.length} words for this moment</Body>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: romanization }}
              onPress={() => setRomanization(!romanization)}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {romanization ? 'Hide' : 'Show'} romanization
              </Text>
            </Pressable>
          </Row>
          <View style={{ gap: 9 }}>
            {lesson.vocabulary.map((item) => (
              <Card key={item.korean} style={{ padding: 16 }}>
                <Row>
                  <View style={{ gap: 3, flex: 1 }}>
                    <Text
                      style={{ fontSize: 26, lineHeight: 34, fontWeight: '700', color: colors.ink }}
                    >
                      {item.korean}
                    </Text>
                    <Body muted>{item.english}</Body>
                    {romanization && (
                      <Text style={{ color: colors.muted, fontSize: 13 }}>{item.romanization}</Text>
                    )}
                  </View>
                  <AudioButton
                    busy={audioBusy === item.korean}
                    onPress={() => void play(item.korean)}
                  />
                </Row>
              </Card>
            ))}
          </View>
          <Body muted>Audio is generated by Panda’s Korean speech service.</Body>
          <Button title="I know these words" onPress={() => void moveTo('expressions')} />
        </>
      )}

      {stage === 'expressions' && (
        <>
          <View style={{ gap: 8 }}>
            <Heading>Say it this way</Heading>
            <Body muted>Listen, then repeat each phrase aloud.</Body>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRomanization(!romanization)}
            style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {romanization ? 'Hide' : 'Show'} romanization
            </Text>
          </Pressable>
          <View style={{ gap: 12 }}>
            {lesson.expressions.map((item, index) => (
              <Card
                key={item.korean}
                style={{
                  backgroundColor: index === 0 ? colors.ice : colors.card,
                  borderColor: index === 0 ? colors.sky : colors.border,
                }}
              >
                <Eyebrow>PHRASE {index + 1}</Eyebrow>
                <Text
                  style={{ color: colors.ink, fontSize: 25, lineHeight: 36, fontWeight: '700' }}
                >
                  {item.korean}
                </Text>
                <Body muted>{item.english}</Body>
                {romanization && (
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{item.romanization}</Text>
                )}
                <Row>
                  <AudioButton
                    busy={audioBusy === item.korean}
                    onPress={() => void play(item.korean)}
                  />
                  <Button
                    title="Repeat"
                    secondary
                    icon="refresh"
                    onPress={() => void play(item.korean)}
                  />
                </Row>
              </Card>
            ))}
          </View>
          <Button title="Continue to the pattern" onPress={() => void moveTo('grammar')} />
        </>
      )}

      {stage === 'grammar' && (
        <>
          <View style={{ gap: 8 }}>
            <Heading>One useful pattern</Heading>
            <Body muted>Keep this shape in your pocket for the conversation.</Body>
          </View>
          <Card style={{ alignItems: 'center', backgroundColor: colors.ice, gap: 10 }}>
            <Eyebrow>THE SHAPE</Eyebrow>
            <Text
              style={{
                color: colors.ink,
                fontSize: 24,
                lineHeight: 34,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {lesson.grammar.pattern}
            </Text>
          </Card>
          <View style={{ gap: 8 }}>
            <Heading small>When to use it</Heading>
            <Body>{lesson.grammar.when}</Body>
          </View>
          <View style={{ gap: 8 }}>
            <Heading small>How it changes</Heading>
            <Body>{lesson.grammar.changes}</Body>
          </View>
          <View style={{ gap: 10 }}>
            <Heading small>Try these examples</Heading>
            {lesson.grammar.examples.map((item) => (
              <Card key={item.korean} style={{ padding: 16 }}>
                <Row>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 21, fontWeight: '700', color: colors.ink }}>
                      {item.korean}
                    </Text>
                    <Body muted>{item.english}</Body>
                  </View>
                  <AudioButton
                    busy={audioBusy === item.korean}
                    onPress={() => void play(item.korean)}
                  />
                </Row>
              </Card>
            ))}
          </View>
          <Button title="Try a quick practice" onPress={() => void moveTo('practice')} />
        </>
      )}

      {stage === 'practice' && (
        <>
          <View style={{ gap: 8 }}>
            <Heading>Let’s try it</Heading>
            <Body muted>Two quick turns. Mistakes are part of finding your words.</Body>
          </View>
          <Chip label={`Practice ${practiceIndex + 1} of 2`} />
          <Card style={{ gap: 16 }}>
            <Body>{exercise.prompt}</Body>
            {exercise.type === 'choice' && (
              <View style={{ gap: 8 }}>
                {exercise.options.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: answer === option }}
                    onPress={() => {
                      setAnswer(option);
                      setFeedback(null);
                    }}
                    style={{
                      minHeight: 54,
                      justifyContent: 'center',
                      paddingHorizontal: 16,
                      borderRadius: 16,
                      backgroundColor: answer === option ? colors.ice : colors.paper,
                      borderWidth: 1,
                      borderColor: answer === option ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '600' }}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {exercise.type === 'blank' && (
              <TextInput
                accessibilityLabel="Your answer"
                placeholder="Type the missing Korean…"
                placeholderTextColor={colors.muted}
                value={answer}
                onChangeText={(value) => {
                  setAnswer(value);
                  setFeedback(null);
                }}
                autoCapitalize="none"
                style={{
                  minHeight: 54,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  color: colors.ink,
                  fontSize: 18,
                }}
              />
            )}
            {exercise.type === 'arrange' && (
              <>
                <View
                  style={{
                    minHeight: 54,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 14,
                    backgroundColor: colors.ice,
                  }}
                >
                  {selected.map((item, index) => (
                    <Pressable
                      key={`${index}-${item}`}
                      onPress={() => {
                        setSelected(selected.filter((_, i) => i !== index));
                        setFeedback(null);
                      }}
                    >
                      <Chip label={`${item} ×`} />
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {exercise.words
                    .filter((item) => !selected.includes(item))
                    .map((item, index) => (
                      <Pressable
                        key={`${item}-${index}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setSelected([...selected, item]);
                          setFeedback(null);
                        }}
                        style={{
                          minHeight: 44,
                          justifyContent: 'center',
                          paddingHorizontal: 13,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.ink, fontWeight: '600' }}>{item}</Text>
                      </Pressable>
                    ))}
                </View>
              </>
            )}
            {feedback === 'retry' && (
              <View
                accessibilityLiveRegion="polite"
                style={{ gap: 4, padding: 12, borderRadius: 14, backgroundColor: '#FDF3E7' }}
              >
                <Body>Not quite. You’re close.</Body>
                <Body muted>{exercise.hint}</Body>
              </View>
            )}
            {feedback === 'correct' && (
              <View
                accessibilityLiveRegion="polite"
                style={{ gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.sage }}
              >
                <Body>That’s it. Nice work.</Body>
                <Body muted>{exercise.hint}</Body>
              </View>
            )}
            {feedback ? (
              <Button
                title={
                  feedback === 'correct'
                    ? practiceIndex === 0
                      ? 'Next practice'
                      : 'Ready to talk'
                    : 'Try again'
                }
                onPress={() => (feedback === 'correct' ? nextExercise() : setFeedback(null))}
              />
            ) : (
              <Button
                title="Check answer"
                disabled={!exerciseAnswer(exercise)}
                onPress={() => void checkAnswer()}
              />
            )}
          </Card>
        </>
      )}

      {stage === 'ready' && (
        <>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Tutor size={170} state="happy" />
            <Eyebrow>YOU’RE READY</Eyebrow>
            <Text
              style={{
                color: colors.ink,
                fontSize: 28,
                lineHeight: 36,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {lesson.conversationInvite}
            </Text>
            <Body muted style={{ textAlign: 'center' }}>
              {lesson.scenario}
            </Body>
          </View>
          <Card style={{ gap: 10 }}>
            <Heading small>Take these with you</Heading>
            {lesson.expressions.map((item) => (
              <Row key={item.korean}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>
                    {item.korean}
                  </Text>
                  <Body muted>{item.english}</Body>
                </View>
                <AudioButton
                  busy={audioBusy === item.korean}
                  onPress={() => void play(item.korean)}
                />
              </Row>
            ))}
          </Card>
          <Button
            title="Start conversation"
            icon="mic-outline"
            loading={saving}
            onPress={() => void startConversation()}
          />
          <Button title="Review expressions" secondary onPress={() => void moveTo('expressions')} />
        </>
      )}
      <Body muted>{saveError}</Body>
      <Body muted>{audioError}</Body>
    </Screen>
  );
}

function AudioButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Loading Korean audio' : 'Play Korean audio'}
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.ice,
      }}
    >
      <Ionicons
        name={busy ? 'hourglass-outline' : 'volume-high-outline'}
        size={23}
        color={colors.primary}
      />
    </Pressable>
  );
}
