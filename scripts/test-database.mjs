import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';

// Uses a newly initialized cluster on an ephemeral loopback port, never a configured DATABASE_URL.
const directory = mkdtempSync(join(tmpdir(), 'haru-db-'));
const server = createServer();
await new Promise((resolve, reject) => {
  server.on('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
let started = false;
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw new Error(`${command} is required: ${result.error.message}`);
  if (result.status !== 0)
    throw new Error(`${command} failed:\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}
function runAsync(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (status) =>
      status === 0
        ? resolve(stdout)
        : reject(new Error(`${command} failed:\n${stderr}\n${stdout}`)),
    );
  });
}
try {
  run('initdb', [
    '-D',
    directory,
    '-A',
    'trust',
    '-U',
    'haru_test',
    '--no-locale',
    '--encoding=UTF8',
  ]);
  run('pg_ctl', [
    '-D',
    directory,
    '-l',
    join(directory, 'server.log'),
    '-o',
    `-p ${port} -k ${directory} -h 127.0.0.1`,
    '-w',
    'start',
  ]);
  started = true;
  const output = run('psql', [
    '-h',
    '127.0.0.1',
    '-p',
    String(port),
    '-U',
    'haru_test',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    'tests/database-bootstrap.sql',
    ...readdirSync('supabase/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .flatMap((name) => ['-f', join('supabase/migrations', name)]),
    '-f',
    'supabase/seed.sql',
    '-f',
    'tests/database-security.sql',
    '-f',
    'tests/database-streaks.sql',
    '-f',
    'tests/database-onboarding.sql',
    '-f',
    'tests/database-panda.sql',
    '-f',
    'tests/database-vocabulary.sql',
  ]);
  const connection = [
    '-h',
    '127.0.0.1',
    '-p',
    String(port),
    '-U',
    'haru_test',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
  ];
  const concurrentSql =
    "select public.record_learning_activity('b1000000-0000-4000-8000-000000000002','conversation','e2000000-0000-4000-8000-000000000099');";
  await Promise.all(
    Array.from({ length: 10 }, () => runAsync('psql', [...connection, '-c', concurrentSql])),
  );
  const duplicateCount = run('psql', [
    ...connection,
    '-Atc',
    "select count(*) from public.learning_events where user_id='b1000000-0000-4000-8000-000000000002' and source_activity_id='e2000000-0000-4000-8000-000000000099'",
  ]).trim();
  if (duplicateCount !== '1')
    throw new Error(`Concurrent duplicate was recorded ${duplicateCount} times.`);
  console.log(output.trim().split('\n').slice(-5).join('\n'));
  console.log('Concurrent duplicate event test passed.');
} catch (error) {
  console.error(error.message);
  try {
    console.error(
      readFileSync(join(directory, 'server.log'), 'utf8').split('\n').slice(-5).join('\n'),
    );
  } catch {
    /* init may not have reached startup */
  }
  process.exitCode = 1;
} finally {
  let stopped = !started;
  if (started) {
    try {
      run('pg_ctl', ['-D', directory, '-m', 'fast', '-w', 'stop']);
      stopped = true;
    } catch {
      console.error(`Test database retained at ${directory}; automatic shutdown failed.`);
    }
  }
  if (stopped) rmSync(directory, { recursive: true, force: true });
}
