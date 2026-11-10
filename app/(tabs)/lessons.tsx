import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Heading, Body, Chip, Field, ErrorNotice, CatalogNotice, Eyebrow } from '../../src/components/ui';
import { LessonRow } from '../../src/components/LessonRow';
import { useApp } from '../../src/state/store';
import { levels } from '../../src/lib/types';
export default function Lessons() {
  const app = useApp();
  const [level, setLevel] = useState('All');
  const [query, setQuery] = useState('');
  const filtered = app.lessons.filter(
    (l) =>
      (level === 'All' || l.level === level) &&
      `${l.title} ${l.korean_title} ${l.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen bottom={false} refreshing={app.loading} onRefresh={() => void app.loadCatalog()}>
      <Eyebrow>20 ways to find your words</Eyebrow>
      <Heading>Korean for your life.</Heading>
      <Body muted>
        From your morning coffee to your first campus day. Choose a moment that matters.
      </Body>
      <Field
        label="Find a lesson"
        placeholder="Coffee, campus, friends…"
        value={query}
        onChangeText={setQuery}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {['All', ...levels].map((l) => (
          <Chip key={l} label={l} selected={level === l} onPress={() => setLevel(l)} />
        ))}
      </View>
      <CatalogNotice message={app.catalogError} onRetry={() => void app.loadCatalog()} />
      <ErrorNotice message={app.error} />
      <View>
        {filtered.map((l) => (
          <LessonRow
            key={l.id}
            lesson={l}
            progress={app.progress.find((p) => p.lesson_id === l.id)}
          />
        ))}
        {!filtered.length && (
          <Body muted>No lessons match that search. Try another word or level.</Body>
        )}
      </View>
    </Screen>
  );
}
