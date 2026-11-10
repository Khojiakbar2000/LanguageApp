import { useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Back, Body, Button, Card, colors, ErrorNotice, Eyebrow, Heading, Screen } from '../../src/components/ui';
import { db, invoke } from '../../src/lib/supabase';
import { useApp } from '../../src/state/store';
import { vocabularyLoadError } from '../../src/lib/vocabulary';

type Entry = { id: string; word: string; pronunciation: string | null; part_of_speech: string | null; dictionary_grade: string | null; difficulty_level: string; source_url: string | null; attribution: string };
type Meaning = { id: string; definition: string; translation: string | null; sense_order: number };
type Example = { korean_sentence: string; english_translation: string | null };
export default function VocabularyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = db();
  const app = useApp();
  const player = useAudioPlayer(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [meanings, setMeanings] = useState<Meaning[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      const [word, senses, sample] = await Promise.all([
        client.from('vocabulary_entries').select('*').eq('id', id).single(),
        client.from('vocabulary_meanings').select('id,definition,translation,sense_order').eq('vocabulary_id', id).order('sense_order'),
        client.from('vocabulary_examples').select('korean_sentence,english_translation').eq('vocabulary_id', id).order('source_example_order'),
      ]);
      if (word.error || senses.error || sample.error) { if (alive) setError(vocabularyLoadError(word.error ?? senses.error ?? sample.error)); return; }
      if (alive) { setEntry(word.data as Entry); setMeanings(senses.data ?? []); setExamples(sample.data ?? []); }
      if (app.session) {
        const progress = await client.from('user_vocabulary_progress').select('saved_at').eq('user_id', app.session.user.id).eq('vocabulary_id', id).maybeSingle();
        if (!progress.error && alive) setSaved(!!progress.data?.saved_at);
      }
    }
    void load(); return () => { alive = false; };
  }, [client, id, app.session]);
  async function audio() {
    if (!entry) return;
    try { const result = await invoke<{ url: string }>('speak-lesson', { text: entry.word }); await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); player.replace(result.url); player.play(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Audio is unavailable.'); }
  }
  async function toggleSaved() {
    if (!entry || !app.session) { setError('Sign in to save vocabulary.'); return; }
    const result = await client.rpc('save_vocabulary', { p_vocabulary_id: entry.id, p_saved: !saved });
    if (result.error) setError(result.error.message); else setSaved(!saved);
  }
  return <Screen>
    <Back title="Word library" />
    <ErrorNotice message={error} />
    {entry ? <>
      <Eyebrow>{entry.difficulty_level} · {entry.part_of_speech ?? 'Part of speech not listed'}</Eyebrow>
      <Heading>{entry.word}</Heading>
      <Body muted>{entry.pronunciation ?? 'Pronunciation not provided by source'}{entry.dictionary_grade ? ` · Dictionary grade: ${entry.dictionary_grade}` : ''}</Body>
      <Button title="Play Korean audio" icon="volume-high" onPress={() => void audio()} />
      {meanings.map((meaning) => <Card key={meaning.id} style={{ gap: 8 }}>
        <Heading small>Meaning {meaning.sense_order}</Heading><Body>{meaning.definition}</Body>
        {meaning.translation ? <Body muted>{meaning.translation}</Body> : null}
      </Card>)}
      {examples.length ? <><Heading small>Examples</Heading>{examples.map((example, i) => <Card key={`${i}-${example.korean_sentence}`} style={{ gap: 6 }}><Body>{example.korean_sentence}</Body>{example.english_translation ? <Body muted>{example.english_translation}</Body> : null}</Card>)}</> : null}
      <Button title={saved ? 'Saved · remove' : 'Save word'} secondary icon={saved ? 'bookmark' : 'bookmark-outline'} onPress={() => void toggleSaved()} />
      <Button title="Practice this level" onPress={() => router.push({ pathname: '/vocabulary/practice', params: { level: entry.difficulty_level } })} />
      <Body muted>{entry.attribution}{entry.source_url ? ` · ${entry.source_url}` : ''}</Body>
      <Text onPress={() => void Linking.openURL('https://krdict.korean.go.kr/eng/kboardPolicy/copyRightTermsInfo')} accessibilityRole="link" style={{ color: colors.primary, fontSize: 14, textDecorationLine: 'underline' }}>
        KRDICT text license: CC BY-SA 2.0 Korea
      </Text>
      <Body muted>Audio and other multimedia are excluded; check each item’s license separately.</Body>
    </> : <Text style={{ color: colors.muted }}>Loading word…</Text>}
  </Screen>;
}
