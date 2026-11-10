import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioPlayer, useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Back, Body, Button, Card, Chip, colors, ErrorNotice, Heading, Screen } from '../../src/components/ui';
import { db, invoke } from '../../src/lib/supabase';
import { useApp } from '../../src/state/store';
import { sentenceCloze, vocabularyLoadError } from '../../src/lib/vocabulary';

type Entry = { id: string; word: string; pronunciation: string | null; part_of_speech: string | null; difficulty_level: string; meanings: { definition: string; translation: string | null }[]; examples: { korean_sentence: string; english_translation: string | null }[]; familiarity: number };
type Mode = 'flashcards' | 'choice' | 'listening' | 'sentence' | 'speaking';
const modes: { id: Mode; title: string }[] = [
  { id: 'flashcards', title: 'Flashcards' }, { id: 'choice', title: 'Meaning' },
  { id: 'listening', title: 'Listening' }, { id: 'sentence', title: 'Sentence' }, { id: 'speaking', title: 'Speaking' },
];

export default function VocabularyPractice() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  const selectedLevel = level === 'intermediate' || level === 'advanced' || level === 'unclassified' ? level : 'beginner';
  const app = useApp();
  const client = db();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const [mode, setMode] = useState<Mode>('flashcards');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const current = entries[index];

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        if (!app.session) throw new Error('Sign in to save vocabulary progress.');
        const [result, dueResult] = await Promise.all([
          client.from('vocabulary_entries').select('id,word,pronunciation,part_of_speech,difficulty_level').eq('difficulty_level', selectedLevel).order('word').limit(100),
          client.from('user_vocabulary_progress').select('vocabulary_id,next_review_at').eq('user_id', app.session.user.id).lte('next_review_at', new Date().toISOString()).order('next_review_at').limit(50),
        ]);
        if (result.error || dueResult.error) throw result.error ?? dueResult.error;
        const dueIds = (dueResult.data ?? []).map((row) => row.vocabulary_id);
        const dueEntries = dueIds.length ? await client.from('vocabulary_entries').select('id,word,pronunciation,part_of_speech,difficulty_level').eq('difficulty_level', selectedLevel).in('id', dueIds) : { data: [], error: null };
        if (dueEntries.error) throw dueEntries.error;
        const allRows = [...new Map([...(result.data ?? []), ...(dueEntries.data ?? [])].map((row) => [row.id, row])).values()];
        const ids = allRows.map((row) => row.id);
        if (!ids.length) { if (alive) setEntries([]); return; }
        const [meanings, examples, progress] = await Promise.all([
          client.from('vocabulary_meanings').select('vocabulary_id,definition,translation,sense_order').in('vocabulary_id', ids).order('sense_order'),
          client.from('vocabulary_examples').select('vocabulary_id,korean_sentence,english_translation').in('vocabulary_id', ids),
          client.from('user_vocabulary_progress').select('vocabulary_id,familiarity,next_review_at').eq('user_id', app.session.user.id).in('vocabulary_id', ids),
        ]);
        if (meanings.error || examples.error || progress.error) throw meanings.error ?? examples.error ?? progress.error;
        const due = new Set(dueIds);
        const merged = allRows.map((row) => ({ ...row,
          meanings: (meanings.data ?? []).filter((m) => m.vocabulary_id === row.id),
          examples: (examples.data ?? []).filter((e) => e.vocabulary_id === row.id),
          familiarity: progress.data?.find((p) => p.vocabulary_id === row.id)?.familiarity ?? 0,
          due: due.has(row.id),
        })).sort((a, b) => Number(b.due) - Number(a.due) || a.familiarity - b.familiarity);
        if (alive) {
          setEntries(merged as Entry[]);
          const created = await client.rpc('start_vocabulary_review_session');
          if (created.error) throw created.error;
          setSessionId(created.data);
        }
      } catch (cause) { if (alive) setError(vocabularyLoadError(cause)); }
      finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [client, app.session, selectedLevel]);

  const options = useMemo(() => {
    if (!current) return [];
    const others = entries.filter((entry) => entry.id !== current.id && (mode !== 'sentence' || entry.examples.some((ex) => sentenceCloze(ex.korean_sentence, entry.word))));
    const pool = [current, ...others.slice((index * 3) % Math.max(1, others.length), (index * 3) % Math.max(1, others.length) + 3)];
    return pool.sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [current, entries, index, mode]);

  async function answer(correct: boolean, selfRated = false) {
    if (!current || !sessionId || feedback || reviewComplete) return;
    try {
      const { error: saveError } = await client.rpc('record_vocabulary_review_answer', {
        p_answer_id: Crypto.randomUUID(), p_session_id: sessionId, p_vocabulary_id: current.id, p_correct: correct,
      });
      if (saveError) throw saveError;
      setFeedback(selfRated ? (correct ? 'Self-rating saved.' : 'Saved for an earlier review.') : (correct ? 'Correct. Progress saved.' : `Not quite. The answer is ${current.word} — ${current.meanings[0]?.translation ?? current.meanings[0]?.definition ?? 'meaning unavailable'}. Saved for review.`));
      setRevealed(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your review could not be saved.'); }
  }
  async function next() {
    setIndex((i) => (i + 1) % Math.max(1, entries.length));
    setRevealed(false); setFeedback(null); setTranscript(null);
  }
  async function playWord(text = current?.word) {
    if (!text) return;
    try {
      const response = await invoke<{ url: string }>('speak-lesson', { text });
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      player.replace(response.url); player.play();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Audio could not be played.'); }
  }
  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone permission is needed for speaking practice.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(); recorder.record(); setRecording(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start recording.'); }
  }
  async function stopRecording() {
    setRecording(false);
    try {
      await recorder.stop(); await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri || !current) throw new Error('The recording was empty. Try again.');
      let audio: string;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        audio = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
      } else audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await invoke<{ transcript: string }>('pronounce-vocabulary', { audio, mimeType: Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4' });
      setTranscript(result.transcript);
      if (Platform.OS === 'web') URL.revokeObjectURL(uri); else await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Speech could not be transcribed.'); }
  }
  async function finish() {
    if (!sessionId) return;
    const result = await client.rpc('complete_vocabulary_review_session', { p_session_id: sessionId });
    if (result.error) setError(result.error.message);
    else {
      if (result.data) setReviewComplete(true);
      setFeedback(result.data ? 'Review complete. Your progress is saved.' : 'Answer at least three cards to complete this review.');
    }
  }

  if (loading) return <Screen><Back /><Heading>Loading practice…</Heading></Screen>;
  if (!current) return <Screen><Back /><Heading>Vocabulary practice</Heading><ErrorNotice message={error} /><Body muted>No imported vocabulary is available for this level yet.</Body></Screen>;
  const meaning = current.meanings[0]?.translation ?? current.meanings[0]?.definition ?? 'Meaning unavailable';
  const sentence = current.examples.find((ex) => sentenceCloze(ex.korean_sentence, current.word));
  return <Screen>
    <Back title="Vocabulary" />
    <Heading>Practice a little, remember a lot.</Heading>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{modes.map((item) => <Chip key={item.id} label={item.title} selected={mode === item.id} onPress={() => { setMode(item.id); setFeedback(null); setRevealed(false); }} />)}</View>
    <ErrorNotice message={error} />
    <Card style={{ gap: 12 }}>
      {mode === 'listening' ? <Button title="Listen to the Korean word" icon="volume-high" onPress={() => void playWord()} /> : null}
      {mode === 'sentence' && sentence ? <Text style={{ fontSize: 22, textAlign: 'center', color: colors.ink }}>{sentenceCloze(sentence.korean_sentence, current.word)}</Text> : null}
      {mode === 'sentence' && !sentence ? <Body muted>No source example contains this exact headword, so sentence practice is unavailable for this card.</Body> : null}
      {mode === 'flashcards' || mode === 'speaking' ? <Text style={{ fontSize: 34, textAlign: 'center', fontWeight: '800', color: colors.ink }}>{current.word}</Text> : null}
      {mode === 'flashcards' && revealed ? <Body style={{ textAlign: 'center' }}>{meaning}</Body> : null}
      {mode === 'flashcards' && !revealed ? <Button title="Reveal meaning" onPress={() => setRevealed(true)} /> : null}
      {mode === 'flashcards' && revealed && !feedback ? <View style={{ gap: 10 }}><Button title="I remembered it" onPress={() => void answer(true, true)} /><Button title="Review again" secondary onPress={() => void answer(false, true)} /></View> : null}
      {mode === 'speaking' ? <><Button title={recording ? 'Stop and show transcript' : 'Record yourself'} icon={recording ? 'stop' : 'mic'} onPress={() => void (recording ? stopRecording() : startRecording())} /><Body muted>Speech recognition displays what it heard; it does not score pronunciation.</Body>{transcript ? <Body>Recognizer heard: {transcript}</Body> : null}<Button title="I practiced this word" secondary onPress={() => void answer(true, true)} /></> : null}
      {(mode === 'choice' || mode === 'listening' || mode === 'sentence') && (mode !== 'sentence' || !!sentence) ? options.map((option) => <Pressable key={option.id} disabled={reviewComplete || !!feedback} onPress={() => void answer(option.id === current.id)} style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{mode === 'listening' || mode === 'sentence' ? option.word : option.meanings[0]?.translation ?? option.meanings[0]?.definition ?? option.word}</Text>
      </Pressable>) : null}
      {feedback ? <Body style={{ textAlign: 'center', fontWeight: '700' }}>{feedback}</Body> : null}
      <Button title="Next word" secondary onPress={() => void next()} />
    </Card>
    <Body muted>{index + 1} of {entries.length} in this session</Body>
    <Button title={reviewComplete ? 'Review complete' : 'Finish review'} disabled={reviewComplete} onPress={() => void finish()} />
  </Screen>;
}
