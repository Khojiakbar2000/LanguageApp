import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Body, Button, Card, colors, Eyebrow, Field, Heading, Screen } from '../../src/components/ui';
import { db } from '../../src/lib/supabase';
import { vocabularyLoadError } from '../../src/lib/vocabulary';
import { useApp } from '../../src/state/store';

type Topic = { id: string; name: string; slug: string };
type Entry = { id: string; word: string; pronunciation: string | null; part_of_speech: string | null; difficulty_level: string; definition: string | null; translation: string | null };
const PAGE_SIZE = 60;
const levels = [
  { id: 'beginner', label: 'Beginner · 초급', copy: 'Essential words for everyday situations.' },
  { id: 'intermediate', label: 'Intermediate · 중급', copy: 'Build words for conversations, work, and daily life.' },
  { id: 'advanced', label: 'Advanced · 고급', copy: 'Practice nuanced words and sophisticated expression.' },
] as const;
const topicIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  greetings: 'chatbubble-ellipses-outline', family: 'people-outline', food: 'restaurant-outline',
  transportation: 'bus-outline', shopping: 'bag-handle-outline', work: 'briefcase-outline',
  education: 'school-outline', travel: 'airplane-outline', emotions: 'heart-outline', 'daily-life': 'sunny-outline',
};

export default function Vocabulary() {
  const app = useApp();
  const client = db();
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, { learned: number; mastered: number }>>({});
  const [topics, setTopics] = useState<Topic[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const pageRequestRef = useRef(false);

  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    pageRequestRef.current = false;
    setLoadingPage(false);
    setLoading(true); setError(null);
    try {
      const totalCounts = await Promise.all(levels.map(async (level) => {
        const { count, error: countError } = await client.from('vocabulary_entries').select('id', { count: 'exact', head: true }).eq('difficulty_level', level.id);
        if (countError) throw countError;
        return [level.id, count ?? 0] as const;
      }));
      const topicResult = await client.from('vocabulary_topics').select('id,name,slug').order('name');
      if (topicResult.error) throw topicResult.error;
      let nextProgress: Record<string, { learned: number; mastered: number }> = {};
      if (app.session) {
        const p = await client.rpc('get_vocabulary_progress_summary');
        if (p.error) throw p.error;
        nextProgress = p.data ?? {};
      }
      const result = await client.rpc('search_vocabulary', { p_query: query.trim() || null, p_topic_id: topic?.id ?? null, p_limit: PAGE_SIZE + 1, p_offset: 0 });
      if (result.error) throw result.error;
      if (generation !== requestGeneration.current) return;
      setTotals(Object.fromEntries(totalCounts));
      setTopics(topicResult.data ?? []);
      setProgress(nextProgress);
      const firstPage = result.data ?? [];
      setEntries(firstPage.slice(0, PAGE_SIZE));
      setPageIndex(0);
      setHasMore(firstPage.length > PAGE_SIZE);
    } catch (cause) {
      if (generation === requestGeneration.current) setError(vocabularyLoadError(cause));
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [client, app.session, topic, query]);

  async function loadPage(targetPage: number) {
    if (loading || pageRequestRef.current || targetPage < 0 || targetPage === pageIndex || (targetPage > pageIndex && !hasMore)) return;
    const generation = requestGeneration.current;
    pageRequestRef.current = true;
    setLoadingPage(true);
    setError(null);
    try {
      const offset = targetPage * PAGE_SIZE;
      const result = await client.rpc('search_vocabulary', { p_query: query.trim() || null, p_topic_id: topic?.id ?? null, p_limit: PAGE_SIZE + 1, p_offset: offset });
      if (result.error) throw result.error;
      if (generation !== requestGeneration.current) return;
      const page = result.data ?? [];
      setEntries(page.slice(0, PAGE_SIZE));
      setPageIndex(targetPage);
      setHasMore(page.length > PAGE_SIZE);
    } catch (cause) {
      if (generation === requestGeneration.current) setError(vocabularyLoadError(cause));
    } finally {
      if (generation === requestGeneration.current) {
        pageRequestRef.current = false;
        setLoadingPage(false);
      }
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const learned = Object.values(progress).reduce((sum, p) => sum + p.learned, 0);
  const mastered = Object.values(progress).reduce((sum, p) => sum + p.mastered, 0);
  return (
    <Screen bottom={false} refreshing={loading} onRefresh={() => void load()}>
      <Eyebrow>Words that stay with you</Eyebrow>
      <Heading>Your Korean words</Heading>
      <Body muted>Explore dictionary-backed words, then practice what you want to remember.</Body>
      {error ? <Body style={{ color: colors.danger }}>{error}</Body> : null}
      <Card style={{ gap: 12 }}>
        <Body><Text style={{ fontWeight: '800', color: colors.ink }}>{learned}</Text> learned · <Text style={{ fontWeight: '800', color: colors.ink }}>{mastered}</Text> mastered</Body>
        {levels.map((level) => {
          const total = totals[level.id] ?? 0;
          const count = progress[level.id]?.learned ?? 0;
          const done = progress[level.id]?.mastered ?? 0;
          const percent = total ? Math.round(Math.min(1, count / total) * 100) : 0;
          return <View key={level.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ fontWeight: '800', color: colors.ink }}>{level.label}</Text>
            <Body muted>{level.copy}</Body>
            <Body muted>{total.toLocaleString()} available · {count} learned · {done} mastered · {percent}%</Body>
            <Button title={!total ? 'No words imported yet' : app.session ? 'Continue learning' : 'Sign in to continue'} disabled={!total || !app.session} secondary onPress={() => router.push({ pathname: '/vocabulary/practice', params: { level: level.id } })} />
          </View>;
        })}
      </Card>
      <Heading small>Browse by topic</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {topics.map((t) => <Pressable key={t.id} onPress={() => setTopic(topic?.id === t.id ? null : t)} style={{ width: '48%' }}>
          <Card style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: topic?.id === t.id ? colors.ice : colors.card }}>
            <Ionicons name={topicIcons[t.slug] ?? 'sparkles-outline'} size={24} color={colors.primary} />
            <Text style={{ color: colors.ink, fontWeight: '700', flexShrink: 1 }}>{t.name}</Text>
          </Card>
        </Pressable>)}
      </View>
      <Field label="Search Korean words" placeholder="Type a Korean word" value={query} onChangeText={setQuery} />
      <Heading small>{topic?.name ?? 'Word library'}</Heading>
      {entries.length ? <Body muted>Page {pageIndex + 1} · {entries.length.toLocaleString()} words{loadingPage ? ' · loading' : ''}</Body> : null}
      {entries.map((entry) => <Pressable key={entry.id} onPress={() => router.push({ pathname: '/vocabulary/[id]', params: { id: entry.id } })}>
        <Card style={{ marginBottom: 8 }}><Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{entry.word}</Text>
          <Body muted>{entry.pronunciation ?? 'Pronunciation not listed'} · {entry.part_of_speech ?? 'Part of speech not listed'} · {entry.difficulty_level}</Body>
          <Body>{entry.translation ?? entry.definition ?? 'Meaning not available'}</Body>
        </Card>
      </Pressable>)}
      {entries.length && (pageIndex > 0 || hasMore) ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Button title="Previous page" secondary onPress={() => void loadPage(pageIndex - 1)} disabled={loading || loadingPage || pageIndex === 0} />
        <Button title="Next page" secondary onPress={() => void loadPage(pageIndex + 1)} disabled={loading || loadingPage || !hasMore} />
      </View> : null}
      {!loading && !entries.length ? <Card><Body muted>No dictionary words are available for this selection yet. Import authorized KRDICT data to populate the library.</Body></Card> : null}
    </Screen>
  );
}
