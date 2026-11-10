import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
process.loadEnvFile(`${root}/.env`);
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const apiKey = process.env.KRDICT_API_KEY;
if (!url || !apiKey || apiKey.includes('PASTE_YOUR_KRDICT_API_KEY_HERE')) {
  throw new Error('Set the Supabase URL and a real server-side KRDICT_API_KEY in .env. The key is never printed.');
}

const grade = process.argv[2] ?? 'level1';
const levelConfig = {
  level1: { appLevel: 'beginner', defaultTarget: 1000 },
  level2: { appLevel: 'intermediate', defaultTarget: 2000 },
  level3: { appLevel: 'advanced', defaultTarget: 1000 },
}[grade];
if (!levelConfig) throw new Error('Choose level1, level2, or level3.');
const target = Number(process.argv[3] ?? levelConfig.defaultTarget);
if (!Number.isSafeInteger(target) || target < 1 || target > 10_000) {
  throw new Error('Target must be an integer from 1 to 10,000 catalog entries.');
}

const projectRef = new URL(url).hostname.split('.')[0];
let linkedRef = '';
try { linkedRef = readFileSync(`${root}/supabase/.temp/project-ref`, 'utf8').trim(); } catch { /* checked below */ }
if (!linkedRef || linkedRef !== projectRef) throw new Error('Refusing import: Supabase CLI link and configured project URL do not match.');

const keyResult = spawnSync('npx', ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'], {
  cwd: root, encoding: 'utf8', maxBuffer: 2_000_000, timeout: 90_000,
});
if (keyResult.status !== 0) throw new Error('Could not read the service-role key from the authenticated Supabase CLI. Login and link the intended project before retrying.');
let apiKeys;
try { apiKeys = JSON.parse(keyResult.stdout); } catch { throw new Error('Supabase CLI returned an unreadable API-key response.'); }
const serviceKey = Array.isArray(apiKeys) ? apiKeys.find((entry) => entry.name === 'service_role')?.api_key : null;
if (!serviceKey) throw new Error('The linked project did not return a service-role key.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const countEntries = async () => {
  const result = await admin.from('vocabulary_entries').select('id', { count: 'exact', head: true }).eq('difficulty_level', levelConfig.appLevel);
  if (result.error) throw new Error(`Could not read ${levelConfig.appLevel} catalog count (${result.error.code ?? 'database error'}).`);
  return result.count ?? 0;
};
let current = await countEntries();
if (current >= target) {
  console.info(JSON.stringify({ grade, current, target, status: 'already-at-target' }));
  process.exit(0);
}

// Start with syllables already represented in the catalog and common open syllables,
// then deterministically shuffle the rest for broad coverage.
const existing = await admin.from('vocabulary_entries').select('word').eq('difficulty_level', levelConfig.appLevel);
if (existing.error) throw new Error(`Could not read ${levelConfig.appLevel} prefixes (${existing.error.code ?? 'database error'}).`);
const preferred = new Set((existing.data ?? []).map((entry) => entry.word.slice(0, 1)).filter(Boolean));
const initialConsonants = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const commonVowelIndexes = [0, 4, 8, 13, 18, 20, 1, 5];
for (const [initialIndex] of initialConsonants.entries()) {
  for (const vowelIndex of commonVowelIndexes) {
    // Hangul syllable composition with no final consonant (jongseong).
    const syllable = String.fromCharCode(0xac00 + (initialIndex * 21 + vowelIndex) * 28);
    preferred.add(syllable);
  }
}
const prefixes = Array.from({ length: 0xd7a4 - 0xac00 }, (_, index) => String.fromCharCode(0xac00 + index));
let seed = 0x4b524449;
for (let index = prefixes.length - 1; index > 0; index--) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const swap = seed % (index + 1);
  [prefixes[index], prefixes[swap]] = [prefixes[swap], prefixes[index]];
}
const orderedPrefixes = [...preferred, ...prefixes.filter((prefix) => !preferred.has(prefix))];

let attempted = 0;
for (const prefix of orderedPrefixes) {
  if (current >= target) break;
  attempted++;
  const child = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/import-krdict.ts'], {
    cwd: root, encoding: 'utf8', maxBuffer: 2_000_000, timeout: 5 * 60_000,
    env: {
      ...process.env,
      SUPABASE_URL: url,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      KRDICT_API_KEY: apiKey,
      KRDICT_QUERY: prefix,
      KRDICT_SEARCH_METHOD: 'start',
      KRDICT_LEVEL: grade,
      KRDICT_MAX_REQUESTS: '500',
      KRDICT_INCLUDE_DETAILS: '0',
    },
  });
  const safeOutput = `${child.stdout ?? ''}\n${child.stderr ?? ''}`
    .split(apiKey).join('[redacted]')
    .split(serviceKey).join('[redacted]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[redacted]');
  if (child.status !== 0) {
    const detail = safeOutput.trim().slice(-1000);
    throw new Error(`Prefix import stopped at ${prefix} after ${attempted} prefixes. ${detail || 'No child-process error output.'}`);
  }
  current = await countEntries();
  console.info(JSON.stringify({ grade, prefix, current, target, status: 'running' }));
}

console.info(JSON.stringify({ grade, current, target, attemptedPrefixes: attempted, status: current >= target ? 'complete' : 'prefix-space-exhausted' }));
if (current < target) process.exitCode = 2;
