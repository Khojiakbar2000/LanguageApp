import { DOMParser } from '@xmldom/xmldom';
import { createClient } from '@supabase/supabase-js';
import { dictionaryGradeToLevel } from '../src/lib/vocabulary';
import { pathToFileURL } from 'node:url';

const API = 'https://krdict.korean.go.kr/api';
const topicMatchers: Record<string, string[]> = {
  greetings: ['인사', 'greeting'], family: ['가족', '친족', 'family'], food: ['음식', '식생활', 'food'],
  transportation: ['교통', '운송', 'transport'], shopping: ['구매', '쇼핑', 'shopping'],
  work: ['직업', '직장', '일하기', 'work'], education: ['교육', '학교', '학습', 'education'],
  travel: ['여행', '숙박', 'travel'], emotions: ['감정', '기분', 'emotion'],
  'daily-life': ['생활', '일상', 'daily'],
};
type Sense = { order: number; definition: string; translation: string | null };
type Example = { sentence: string; translation: string | null };
type Entry = {
  code: string; word: string; pronunciation: string | null; pos: string | null;
  grade: string | null; origin: string | null; link: string | null;
  senses: Sense[]; categories: string[];
};
const text = (parent: Element, name: string) => {
  const found = parent.getElementsByTagName(name).item(0)?.textContent?.trim();
  return found || null;
};
const children = (parent: Element, name: string) => Array.from(parent.getElementsByTagName(name));

export function parseKrdictSearch(xml: string): { entries: Entry[]; total: number; start: number; error: string | null } {
  const doc = new DOMParser({ onError: (level, message) => { if (level === 'fatalError') throw new Error(message); } }).parseFromString(xml, 'text/xml');
  const channel = doc.getElementsByTagName('channel').item(0);
  if (!channel) return { entries: [], total: 0, start: 1, error: text(doc.documentElement, 'error') };
  const entries = children(channel, 'item').map((item) => {
    const senses = children(item, 'sense').map((sense, index) => {
      const translations = children(sense, 'translation');
      const english = translations.find((t) => /영어|English/i.test(text(t, 'trans_lang') ?? ''));
      return { order: Number(text(sense, 'sense_order') ?? index + 1), definition: text(sense, 'definition') ?? '',
        translation: english ? text(english, 'trans_dfn') ?? text(english, 'trans_word') : null };
    }).filter((sense) => sense.definition);
    return { code: text(item, 'target_code') ?? '', word: text(item, 'word') ?? '',
      pronunciation: text(item, 'pronunciation'), pos: text(item, 'pos'), grade: text(item, 'word_grade'),
      origin: text(item, 'origin'), link: text(item, 'link'), senses,
      categories: children(item, 'category_info').map((c) => c.textContent?.trim() ?? '').filter(Boolean) };
  }).filter((e) => e.code && e.word);
  return { entries, total: Number(text(channel, 'total') ?? 0), start: Number(text(channel, 'start') ?? 1), error: null };
}

export function parseKrdictExamples(xml: string): Example[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return children(doc.documentElement, 'example_info').map((item) => {
    const translations = children(item, 'translation');
    const english = translations.find((t) => /영어|English/i.test(text(t, 'trans_lang') ?? ''));
    return { sentence: text(item, 'example') ?? '',
      translation: english ? text(english, 'trans_dfn') ?? text(english, 'trans_word') : null };
  }).filter((row) => row.sentence);
}

export function importPageDisposition(start: number, pageSize: number, total: number, returned: number) {
  const nextStart = start + returned;
  const reachedPageEnd = returned < pageSize || nextStart > total;
  const capped = nextStart > 1000 && nextStart <= total;
  return { nextStart, capped, complete: reachedPageEnd && !capped };
}

async function main() {
  try { process.loadEnvFile('.env'); } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.KRDICT_API_KEY;
  const query = process.env.KRDICT_QUERY?.trim();
  const grade = process.env.KRDICT_LEVEL?.trim() || null;
  const searchMethod = process.env.KRDICT_SEARCH_METHOD?.trim() || 'exact';
  const importIdentity = searchMethod === 'exact' ? query : `${searchMethod}:${query}`;
  const includeDetails = process.env.KRDICT_INCLUDE_DETAILS !== '0';
  const maxEntriesValue = process.env.KRDICT_MAX_ENTRIES;
  const parsedMaxEntries = maxEntriesValue ? Number(maxEntriesValue) : Number.POSITIVE_INFINITY;
  if (maxEntriesValue && (!Number.isFinite(parsedMaxEntries) || parsedMaxEntries < 1))
    throw new Error('KRDICT_MAX_ENTRIES must be a positive integer.');
  const maxEntries = Number.isFinite(parsedMaxEntries) ? Math.max(1, Math.trunc(parsedMaxEntries)) : Number.POSITIVE_INFINITY;
  const configuredBudget = Number(process.env.KRDICT_MAX_REQUESTS ?? 500);
  const maxRequests = Number.isFinite(configuredBudget) ? Math.max(1, Math.min(49_000, Math.trunc(configuredBudget))) : 500;
  if (!url || !serviceKey || !apiKey || !query || apiKey.includes('PASTE_YOUR_KRDICT_API_KEY_HERE')) throw new Error('Set a Supabase service-role key, a real KRDICT_API_KEY, and an explicit KRDICT_QUERY; the Supabase URL can come from the existing public URL setting.');
  if (grade && !['level1','level2','level3'].includes(grade)) throw new Error('KRDICT_LEVEL must be level1, level2, or level3.');
  if (!['exact','include','start','end'].includes(searchMethod)) throw new Error('KRDICT_SEARCH_METHOD must be exact, include, start, or end.');
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const topicRows = await admin.from('vocabulary_topics').select('id,slug');
  if (topicRows.error) throw topicRows.error;
  const topicBySlug = new Map((topicRows.data ?? []).map((row) => [row.slug, row.id]));
  const requestedTopic = process.env.KRDICT_TOPIC?.trim().toLowerCase();
  if (requestedTopic && !topicBySlug.has(requestedTopic)) throw new Error(`KRDICT_TOPIC does not match an existing vocabulary topic: ${requestedTopic}`);
  let runQuery = admin.from('vocabulary_import_runs').select('*').eq('query', importIdentity);
  runQuery = grade ? runQuery.eq('dictionary_level', grade) : runQuery.is('dictionary_level', null);
  let { data: run, error } = await runQuery.maybeSingle();
  if (error) throw error;
  if (!run) {
    const created = await admin.from('vocabulary_import_runs').insert({ query: importIdentity, dictionary_level: grade, status: 'running' }).select().single();
    if (created.error) throw created.error;
    run = created.data;
  }
  if (run.status === 'complete' && process.env.KRDICT_REFRESH !== '1') {
    console.info(JSON.stringify({ query, searchMethod, grade, status: 'complete', skipped: true, entriesSeen: run.entries_seen }));
    return;
  }
  if (process.env.KRDICT_REFRESH === '1') {
    const refreshed = await admin.from('vocabulary_import_runs').update({ next_start: 1, status: 'running', error_message: null, updated_at: new Date().toISOString() }).eq('id', run.id).select().single();
    if (refreshed.error) throw refreshed.error;
    run = refreshed.data;
  }
  let requests = 0;
  async function fetchKrdict(href: string) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4 && requests < maxRequests; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      requests++;
      try {
        const response = await fetch(href);
        if (response.status !== 429 && response.status < 500) return response;
        lastError = new Error(`KRDICT temporary response (${response.status})`);
        const retryAfter = Number(response.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1_000 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, Math.min(60_000, delay)));
      } catch (cause) {
        lastError = cause;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, Math.min(15_000, 1_000 * 2 ** attempt)));
      }
    }
    throw lastError ?? new Error('KRDICT request budget exhausted before the request completed.');
  }
  try {
    while (requests < maxRequests && run.next_start <= 1000) {
      const remainingEntries = Number.isFinite(maxEntries) ? Math.max(0, maxEntries - run.entries_seen) : Number.POSITIVE_INFINITY;
      if (remainingEntries === 0) {
        const stopped = await admin.from('vocabulary_import_runs').update({ status: 'partial', error_message: `Entry limit ${maxEntries} reached; increase KRDICT_MAX_ENTRIES to continue.`, updated_at: new Date().toISOString() }).eq('id', run.id);
        if (stopped.error) throw stopped.error;
        break;
      }
      const requestedPageSize = Math.max(10, Math.min(run.page_size, remainingEntries));
      const params = new URLSearchParams({ key: apiKey, q: query, method: searchMethod, advanced: 'y', target: '1', part: 'word', start: String(run.next_start), num: String(requestedPageSize), translated: 'y', trans_lang: '1' });
      if (grade) params.set('level', grade);
      const response = await fetchKrdict(`${API}/search?${params}`);
      if (!response.ok) throw new Error(`KRDICT search failed (${response.status})`);
      const parsed = parseKrdictSearch(await response.text());
      if (parsed.error) throw new Error(`KRDICT error: ${parsed.error}`);
      if (parsed.start !== run.next_start) throw new Error(`KRDICT returned unexpected start ${parsed.start}`);
      let upserted = 0;
      const entriesToImport = parsed.entries.slice(0, Number.isFinite(remainingEntries) ? remainingEntries : undefined);
      for (const entry of entriesToImport) {
        const { data: saved, error: saveError } = await admin.from('vocabulary_entries').upsert({
          source_entry_id: entry.code, word: entry.word, pronunciation: entry.pronunciation,
          part_of_speech: entry.pos, dictionary_grade: entry.grade,
          difficulty_level: dictionaryGradeToLevel(entry.grade), origin: entry.origin,
          source_url: entry.link, source_categories: entry.categories, source: 'krdict',
          attribution: 'Source: Korean Basic Dictionary (한국어기초사전), National Institute of Korean Language. Text: CC BY-SA 2.0 Korea (https://krdict.korean.go.kr/eng/kboardPolicy/copyRightTermsInfo). Multimedia may have separate licenses.',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'source_entry_id' }).select('id').single();
        if (saveError || !saved) throw saveError ?? new Error(`Could not save ${entry.word}`);
        upserted++;
        const matchedTopics = entry.categories.flatMap((category) => Object.entries(topicMatchers)
          .filter(([, terms]) => terms.some((term) => category.toLowerCase().includes(term.toLowerCase())))
          .map(([slug]) => topicBySlug.get(slug)).filter((topicId): topicId is string => !!topicId));
        if (matchedTopics.length) {
          const topicLinks = await admin.from('vocabulary_topic_entries').upsert(
            [...new Set(matchedTopics)].map((topic_id) => ({ vocabulary_id: saved.id, topic_id })),
            { onConflict: 'vocabulary_id,topic_id' },
          );
          if (topicLinks.error) throw topicLinks.error;
        }
        if (requestedTopic) {
          const topicLink = await admin.from('vocabulary_topic_entries').upsert(
            { vocabulary_id: saved.id, topic_id: topicBySlug.get(requestedTopic)! },
            { onConflict: 'vocabulary_id,topic_id' },
          );
          if (topicLink.error) throw topicLink.error;
        }
        if (entry.senses.length) {
          const rows = entry.senses.map((sense) => ({ vocabulary_id: saved.id, language: 'ko', definition: sense.definition,
            translation: sense.translation, translation_language: 'en', sense_order: sense.order }));
          const { error: sensesError } = await admin.from('vocabulary_meanings').upsert(rows, { onConflict: 'vocabulary_id,sense_order' });
          if (sensesError) throw sensesError;
        }
        if (includeDetails && requests < maxRequests) {
          const viewParams = new URLSearchParams({ key: apiKey, method: 'target_code', q: entry.code });
          const detail = await fetchKrdict(`${API}/view?${viewParams}`);
          if (detail.ok) {
            const examples = parseKrdictExamples(await detail.text());
            for (const [index, example] of examples.entries()) {
              const { error: exampleError } = await admin.from('vocabulary_examples').upsert({ vocabulary_id: saved.id,
                korean_sentence: example.sentence, english_translation: example.translation, source: 'krdict', source_example_order: index + 1 },
              { onConflict: 'vocabulary_id,source_example_order' });
              if (exampleError) throw exampleError;
            }
          } else if (detail.status !== 404) throw new Error(`KRDICT detail failed (${detail.status})`);
        }
      }
      const processedEntries = entriesToImport.length;
      const nextStart = run.next_start + processedEntries;
      const paginationCapped = nextStart > 1000 && nextStart <= parsed.total;
      const queryComplete = processedEntries === parsed.entries.length &&
        (parsed.entries.length < requestedPageSize || nextStart > parsed.total);
      const entryLimitReached = Number.isFinite(maxEntries) && run.entries_seen + processedEntries >= maxEntries && !queryComplete;
      const complete = queryComplete && !paginationCapped;
      const status = complete ? 'complete' : (paginationCapped || entryLimitReached || requests >= maxRequests ? 'partial' : 'running');
      const errorMessage = paginationCapped
        ? 'KRDICT start pagination is capped at 1000; remaining results require a verified alternate export/query.'
        : entryLimitReached
          ? `Entry limit ${maxEntries} reached; increase KRDICT_MAX_ENTRIES to continue.`
          : status === 'partial' ? 'Request budget reached; rerun to resume.' : null;
      const savedRun = await admin.from('vocabulary_import_runs').update({ next_start: nextStart, total_reported: parsed.total,
        entries_seen: run.entries_seen + processedEntries, entries_upserted: run.entries_upserted + upserted,
        status, error_message: errorMessage,
        updated_at: new Date().toISOString() }).eq('id', run.id).select().single();
      if (savedRun.error) throw savedRun.error;
      run = savedRun.data;
      console.info(JSON.stringify({ query, searchMethod, grade, start: parsed.start, pageEntries: processedEntries, upserted, requests, status: run.status }));
      if (status !== 'running') break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (run.status === 'running') {
      const savedRun = await admin.from('vocabulary_import_runs').update({ status: 'partial', error_message: 'Request budget reached; rerun to resume at the saved page.', updated_at: new Date().toISOString() }).eq('id', run.id);
      if (savedRun.error) throw savedRun.error;
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await admin.from('vocabulary_import_runs').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', run.id);
    throw cause;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => { console.error(error); process.exitCode = 1; });
