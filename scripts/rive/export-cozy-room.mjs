/* eslint-disable import/no-unresolved */
// Uses only the installed MCP's public SVG import, authoring and runtime tools.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
const root = process.cwd();
execFileSync('python3', ['scripts/rive/prepare-cozy-room.py'], { stdio: 'inherit' });
const client = new Client({ name: 'haru-cozy-room', version: '1.0.0' });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('node_modules/rive-mcp-server/dist/index.js')],
    stderr: 'inherit',
  }),
);
async function call(name, args) {
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 });
  if (r.isError)
    throw new Error(
      r.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n'),
    );
  return r;
}
try {
  await call('riv_import_svg', {
    svgPath: path.join(root, 'src/features/cozy-room/assets/room-source.svg'),
    outSpec: path.join(root, 'src/features/cozy-room/assets/room.import.json'),
    idPrefix: 'room',
  });
  execFileSync(process.execPath, ['scripts/rive/build-cozy-room.mjs'], { stdio: 'inherit' });
  const scene = JSON.parse(await readFile('src/features/cozy-room/assets/room.scene.json', 'utf8'));
  const rivPath = path.join(root, 'public/mascot/cozy-room.riv');
  await call('riv_create', { outPath: rivPath, scene, previewTime: 0 });
  execFileSync(process.execPath, ['scripts/rive/prepare-room-fallback.mjs'], { stdio: 'inherit' });
  const result = await call('riv_play_state_machine', {
    path: rivPath,
    stateMachine: 'PandaStateMachine',
    width: 540,
    steps: [
      { advance: 0.5, capture: true },
      { input: 'coffee', advance: 1.5, capture: true },
      { advance: 1.5, capture: true },
      { advance: 1.3, capture: true },
      { advance: 2.4, capture: true },
      { advance: 3, capture: true },
      { input: 'night', value: 1, advance: 1.1, capture: true },
      { input: 'wave', advance: 1, capture: true },
      { advance: 3 },
      { input: 'blink', advance: 0.15 },
      { advance: 0.5 },
      { input: 'look', advance: 1 },
    ],
  });
  const report = JSON.parse(result.content.find((c) => c.type === 'text').text);
  const reached = new Set(report.report.flatMap((s) => s.statesChanged ?? []));
  for (const name of [
    'Idle',
    'ReachCoffee',
    'PickUpCoffee',
    'DrinkCoffee',
    'PutDownCoffee',
    'Happy',
    'ReturnToIdle',
    'Night',
    'Wave',
    'Blink',
    'LookAround',
  ])
    if (!reached.has(name)) throw new Error(`Room state not exercised: ${name}`);
  await mkdir('/tmp/haru-cozy-validation', { recursive: true });
  const frames = result.content.filter((c) => c.type === 'image');
  const labels = ['day', 'reach', 'drink', 'sip', 'put-down', 'idle', 'night', 'wave'];
  for (const [i, frame] of frames.entries())
    await writeFile(
      `/tmp/haru-cozy-validation/${labels[i]}.png`,
      Buffer.from(frame.data, 'base64'),
    );
  await writeFile('/tmp/haru-cozy-validation/runtime-report.json', JSON.stringify(report, null, 2));
  await writeFile('public/mascot/cozy-room-day.png', Buffer.from(frames[0].data, 'base64'));
  await writeFile('public/mascot/cozy-room-night.png', Buffer.from(frames[6].data, 'base64'));
  console.log(
    'Compiled and exercised all ten character states, the full coffee cycle, atmosphere and day/night in the official Rive runtime.',
  );
} finally {
  await client.close();
}
