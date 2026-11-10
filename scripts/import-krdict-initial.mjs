import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DOMParser } from '@xmldom/xmldom';

const root = process.cwd();
process.loadEnvFile(`${root}/.env`);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const krdictKey = process.env.KRDICT_API_KEY;
if (!supabaseUrl || !krdictKey || krdictKey.includes('PASTE_YOUR_KRDICT_API_KEY_HERE')) {
  throw new Error('Configure the Supabase URL and a real KRDICT_API_KEY in .env before importing. The key value is never printed.');
}

const ref = new URL(supabaseUrl).hostname.split('.')[0];
let linkedRef = '';
try { linkedRef = readFileSync(`${root}/supabase/.temp/project-ref`, 'utf8').trim(); } catch { /* require an explicit CLI link below */ }
if (!linkedRef || linkedRef !== ref) throw new Error('Refusing import: the authenticated Supabase CLI link does not match the project URL configured in .env.');

const candidates = [
  ['greetings', ['인사','안녕','반갑다','감사하다','고맙다','미안하다','이름','친구','사람']],
  ['family', ['가족','부모','어머니','아버지','엄마','아빠','형','누나','동생','아들','딸','할머니','할아버지']],
  ['food', ['음식','밥','물','커피','차','김치','과일','빵','우유','고기','먹다','마시다','맛있다','배고프다']],
  ['transportation', ['버스','지하철','택시','자동차','기차','역','가다','오다','타다','내리다']],
  ['shopping', ['사다','돈','가격','얼마','가게','시장','옷','신발','물건','계산하다']],
  ['work', ['일','회사','직장','직업','선생님','학생','의사','공부','일하다']],
  ['education', ['학교','책','배우다','읽다','쓰다','한국어','말하다','듣다','수업']],
  ['travel', ['여행','나라','서울','호텔','가방','지도','표','비행기','공항']],
  ['emotions', ['좋다','싫다','기쁘다','슬프다','행복하다','재미있다','예쁘다','무섭다','기분']],
  ['daily-life', ['오늘','내일','어제','지금','시간','집','있다','없다','자다','일어나다','아침','밤','보다','쉬다']],
].flatMap(([topic, words]) => words.map((query) => ({ topic, query })));

async function requestKrdictXml(href) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const response = await fetch(href);
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(60_000, retryAfter * 1000) : 1_000 * 2 ** attempt));
        continue;
      }
      if (!response.ok) throw new Error(`KRDICT preview returned HTTP ${response.status}.`);
      return await response.text();
    } catch (_error) {
      if (attempt === 3) throw new Error('KRDICT preview request failed after retries; the key value was not logged.');
      await new Promise((resolve) => setTimeout(resolve, Math.min(15_000, 1_000 * 2 ** attempt)));
    }
  }
  throw new Error('KRDICT preview request failed after retries; the key value was not logged.');
}

if (process.argv.includes('--preview')) {
  const seen = new Set();
  const preview = [];
  for (const { topic, query } of candidates) {
    const params = new URLSearchParams({ key: krdictKey, q: query, advanced: 'y', target: '1', part: 'word', level: 'level1', start: '1', num: '10', translated: 'y', trans_lang: '1' });
    const xml = await requestKrdictXml(`https://krdict.korean.go.kr/api/search?${params}`);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const channel = doc.getElementsByTagName('channel').item(0);
    const rows = channel ? Array.from(channel.getElementsByTagName('item')).map((item) => ({
      id: item.getElementsByTagName('target_code').item(0)?.textContent?.trim(),
      word: item.getElementsByTagName('word').item(0)?.textContent?.trim(),
    })).filter((row) => row.id && row.word) : [];
    const added = rows.filter((row) => !seen.has(row.id));
    for (const row of added) seen.add(row.id);
    if (added.length) preview.push({ query, topic, matches: added.length });
    if (seen.size >= 50) break;
  }
  console.info(JSON.stringify({ preview: true, uniqueKrdictEntries: seen.size, matchingQueries: preview }));
  process.exit(seen.size >= 50 ? 0 : 2);
}

// Retrieve the existing service-role key through the authenticated Supabase CLI. Keep it
// in process memory and pass it only to the importer child process; never write or log it.
const keyResult = spawnSync('npx', ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', ref, '--output', 'json'], {
  cwd: root, encoding: 'utf8', maxBuffer: 2_000_000, timeout: 90_000,
});
if (keyResult.status !== 0) throw new Error('Could not read the Supabase service-role key from the authenticated CLI. Complete Supabase CLI login, then retry.');
let apiKeys;
try { apiKeys = JSON.parse(keyResult.stdout); } catch { throw new Error('Supabase CLI returned an unreadable API-key response. No credential values were logged.'); }
const serviceKey = Array.isArray(apiKeys) ? apiKeys.find((row) => row.name === 'service_role')?.api_key : null;
if (!serviceKey) throw new Error('The linked Supabase project did not return a service-role key. No credential values were logged.');

const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const before = await admin.from('vocabulary_entries').select('id', { count: 'exact', head: true });
if (before.error) throw new Error(`Cannot inspect the vocabulary catalog (${before.error.code ?? 'database error'}).`);
const baseline = before.count ?? 0;
const targetAdded = Math.max(0, 50 - baseline);
let added = 0;
let attempted = 0;
const env = {
  ...process.env,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  KRDICT_API_KEY: krdictKey,
  KRDICT_LEVEL: 'level1',
  KRDICT_MAX_ENTRIES: '1',
  KRDICT_MAX_REQUESTS: '5',
};
function safeChildOutput(output) {
  return output
    .split(krdictKey).join('[redacted]')
    .split(serviceKey).join('[redacted]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[redacted]');
}

for (const { topic, query } of candidates) {
  if (added >= targetAdded) break;
  attempted++;
  const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/import-krdict.ts'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 2_000_000,
    timeout: 90_000,
    env: { ...env, KRDICT_QUERY: query, KRDICT_TOPIC: topic },
  });
  if (result.status !== 0) {
    const detail = safeChildOutput(`${result.stdout ?? ''}\n${result.stderr ?? ''}`).trim().slice(-1200);
    throw new Error(`KRDICT import stopped at query ${query} (exit ${result.status ?? 'unknown'}). ${detail || 'No child-process error output.'}`);
  }
  const current = await admin.from('vocabulary_entries').select('id', { count: 'exact', head: true });
  if (current.error) throw new Error(`Cannot verify the vocabulary catalog (${current.error.code ?? 'database error'}).`);
  const previousTotal = baseline + added;
  added = Math.max(0, (current.count ?? 0) - baseline);
  const pageLogs = result.stdout.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { const parsed = JSON.parse(line); return [{ upserted: parsed.upserted ?? 0, status: parsed.status ?? 'unknown' }]; }
    catch { return []; }
  });
  console.info(JSON.stringify({ query, topic, addedUnique: Math.max(0, (current.count ?? 0) - previousTotal), importedTotal: added, status: pageLogs.at(-1)?.status ?? 'no-match' }));
}

const final = await admin.from('vocabulary_entries').select('id', { count: 'exact', head: true });
if (final.error) throw new Error(`Final catalog verification failed (${final.error.code ?? 'database error'}).`);
const imported = Math.max(0, (final.count ?? 0) - baseline);
console.info(JSON.stringify({ requestedTotal: 50, baseline, importedThisRun: imported, attemptedQueries: attempted, totalCatalogEntries: final.count ?? 0 }));
if ((final.count ?? 0) < 50) {
  throw new Error(`KRDICT returned only ${imported} new exact beginner entries across the configured queries; broaden the verified query list before claiming a 50-word import.`);
}
