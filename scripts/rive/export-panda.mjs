// Consume the installed MCP's public tools; do not embed or alter its implementation.
/* eslint-disable import/no-unresolved */
import { Buffer } from 'node:buffer';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const root = process.cwd();
const scene = JSON.parse(await readFile('src/panda_rive_assets/panda.scene.json', 'utf8'));
const client = new Client({ name: 'haru-panda-export', version: '1.0.0' });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('node_modules/rive-mcp-server/dist/index.js')],
    stderr: 'inherit',
  }),
);
const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 });
  if (result.isError)
    throw new Error(
      result.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n'),
    );
  return result;
};
try {
  await call('riv_create', { outPath: path.join(root, 'public/mascot/panda.riv'), scene });
  console.log(
    'Compiled one panda rig with independent Motion and Accessories layers; no clothing or fur recoloring.',
  );
  const outfits = ['original'];
  const accessories = ['headphones', 'glasses', 'hat', 'none'];
  const motions = [
    'idle',
    'listening',
    'thinking',
    'speaking',
    'happy',
    'encouraging',
    'celebrating',
  ];
  await mkdir('/tmp/haru-panda-validation', { recursive: true });
  for (const outfit of outfits) {
    const steps = [{ input: 'outfit', value: 3, advance: 0.04 }];
    for (let accessory = 0; accessory < 4; accessory++) {
      steps.push({ input: 'accessory', value: accessory, advance: 0.04 });
      for (const motion of motions)
        steps.push({
          input: motion,
          advance: ['happy', 'celebrating'].includes(motion) ? 0.36 : 0.65,
          capture: true,
        });
    }
    const result = await call('riv_play_state_machine', {
      path: path.join(root, 'public/mascot/panda.riv'),
      stateMachine: 'Panda',
      steps,
      width: 240,
    });
    const frames = result.content.filter((c) => c.type === 'image');
    if (frames.length !== accessories.length * motions.length)
      throw new Error(`Expected 28 validation frames for ${outfit}, got ${frames.length}`);
    for (const [i, frame] of frames.entries())
      await writeFile(
        `/tmp/haru-panda-validation/${outfit}-${accessories[Math.floor(i / motions.length)]}-${motions[i % motions.length]}.png`,
        Buffer.from(frame.data, 'base64'),
      );
    console.log(`Verified ${outfit}: four accessories across seven motion states.`);
  }
  // The exact same scene, frozen at its neutral pose, generates still fallbacks.
  // Only this temporary export asset is frozen; the shipped .riv stays animated.
  const frozen = {
    ...scene,
    animations: scene.animations.map((a) =>
      motions.includes(a.name)
        ? {
            ...a,
            duration: 1,
            tracks: a.tracks.map((t) => ({ ...t, keyframes: [t.keyframes[0]] })),
          }
        : a,
    ),
  };
  const frozenPath = '/tmp/haru-panda-fallback-source.riv';
  await call('riv_create', { outPath: frozenPath, scene: frozen });
  const steps = [];
  const looks = [];
  for (const outfit of outfits) {
    steps.push({ input: 'outfit', value: 3, advance: 0.04 });
    for (const [accessoryIndex, accessory] of accessories.entries()) {
      steps.push({ input: 'accessory', value: accessoryIndex, advance: 0.04, capture: true });
      looks.push({ outfit, accessory });
    }
  }
  const result = await call('riv_play_state_machine', {
    path: frozenPath,
    stateMachine: 'Panda',
    steps,
    width: 480,
  });
  const frames = result.content.filter((c) => c.type === 'image');
  if (frames.length !== 4) throw new Error('Incomplete fallback image export.');
  await mkdir('src/panda_rive_assets/looks', { recursive: true });
  for (const [i, frame] of frames.entries())
    await writeFile(
      `src/panda_rive_assets/looks/${looks[i].outfit}-${looks[i].accessory}.png`,
      Buffer.from(frame.data, 'base64'),
    );
  await copyFile(
    'src/panda_rive_assets/looks/original-none.png',
    'src/panda_rive_assets/panda-still.png',
  );
  // Reuse the V2 head subtree verbatim, including separate ears/expressions.
  const faceIds = new Set(['head']);
  for (const group of scene.groups) if (faceIds.has(group.parent)) faceIds.add(group.id);
  const faceGroups = scene.groups
    .filter((g) => faceIds.has(g.id))
    .map((g) => (g.id === 'head' ? { ...g, parent: undefined, x: 300, y: 300 } : g));
  const faceShapes = scene.shapes.filter((s) => faceIds.has(s.parent) && !s.id.startsWith('wear'));
  const shapeIds = new Set(faceShapes.map((s) => s.id));
  const idle = scene.animations.find((a) => a.name === 'idle');
  const faceTracks = idle.tracks.filter(
    (t) =>
      (faceIds.has(t.target) || shapeIds.has(t.target)) &&
      !(t.target === 'head' && ['x', 'y'].includes(t.property)),
  );
  const facePath = path.join(root, 'public/mascot/panda-face.riv');
  await call('riv_create', {
    outPath: facePath,
    scene: {
      artboard: { name: 'Panda face', width: 600, height: 600 },
      groups: faceGroups,
      shapes: faceShapes,
      animations: [
        { name: 'look-around', fps: 60, duration: 180, loop: 'loop', tracks: faceTracks },
      ],
      stateMachine: {
        name: 'Face',
        states: [{ name: 'curious', animation: 'look-around' }],
        transitions: [{ from: 'entry', to: 'curious' }],
      },
    },
  });
  await call('riv_render_frame', {
    path: facePath,
    animation: 'look-around',
    time: 0,
    width: 600,
    outPath: path.join(root, 'src/panda_rive_assets/panda-face.png'),
  });
  // Generate a statically analyzable require map for Metro on native and web.
  const map = ['purple', 'blue', 'pink', 'original']
    .map(
      (outfit) =>
        `  ${outfit}: {\n${accessories.map((accessory) => `    ${accessory}: require('./looks/original-${accessory}.png'),`).join('\n')}\n  },`,
    )
    .join('\n');
  await writeFile(
    'src/panda_rive_assets/appearances.ts',
    `// Generated from the existing Rive rig by npm run mascot:build.\nimport type { ImageSourcePropType } from 'react-native';\nimport type { PandaAppearance } from '../lib/panda';\nexport const pandaStills: Record<PandaAppearance['outfit'], Record<PandaAppearance['accessory'], ImageSourcePropType>> = {\n${map}\n};\n`,
  );
  console.log(
    'Exported all four original-fur stills and the original panda face for the launch screen.',
  );
} finally {
  await client.close();
}
