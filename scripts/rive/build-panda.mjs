// Build an editable scene from the MCP-imported user artwork. No third-party art.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const source = JSON.parse(await readFile('src/panda_rive_assets/panda.import.json', 'utf8'));
const accessoriesSource = JSON.parse(
  await readFile('src/panda_rive_assets/accessories.import.json', 'utf8'),
);
// Keep each supplied component independently editable. Coordinates below are the
// SVG's data-pivot anchors; local translations compensate for every reparenting.
const manifest = JSON.parse(await readFile('src/panda_rive_assets/panda-v2.manifest.json', 'utf8'));
const aliases = {
  panda_root: 'rig',
  body: 'torso',
  leg_left: 'legLeft',
  leg_right: 'legRight',
  arm_left: 'armLeft',
  arm_right: 'armRight',
  eye_left: 'eyesLeft',
  eye_right: 'eyesRight',
  mouth_neutral: 'mouth',
};
const anchors = {
  panda_root: [400, 750],
  head_fur: [400, 316],
  cheek_left: [253, 398],
  cheek_right: [547, 398],
  brow_left: [310, 290],
  brow_right: [490, 290],
  nose: [400, 390],
  mouth_neutral: [400, 408],
  mouth_speaking: [400, 425],
  mouth_happy: [400, 433],
  eyes_closed: [400, 354],
};
for (const g of manifest.groups) if (g.pivot) anchors[g.id] = g.pivot;
const absolute = Object.fromEntries(
  manifest.groups.map((g) => [aliases[g.id] ?? g.id, anchors[g.id]]),
);
const groups = manifest.groups.map((g) => {
  const id = aliases[g.id] ?? g.id;
  const parent =
    id === 'rig'
      ? null
      : ['head', 'armLeft', 'armRight', 'tail'].includes(id)
        ? 'torso'
        : (aliases[g.parent] ?? g.parent);
  const origin = parent ? absolute[parent] : [0, -100]; // 100px top clearance for hops.
  return {
    id,
    ...(parent ? { parent } : {}),
    x: absolute[id][0] - origin[0],
    y: absolute[id][1] - origin[1],
  };
});
// Sorting keeps every parent before its children, including reparented head/tail.
const ordered = [];
const pending = [...groups];
while (pending.length) {
  const index = pending.findIndex((g) => !g.parent || ordered.some((p) => p.id === g.parent));
  if (index < 0) throw new Error('Invalid V2 hierarchy');
  ordered.push(pending.splice(index, 1)[0]);
}
groups.splice(0, groups.length, ...ordered);
// Stable, empty attachment nodes are reserved for future modular costume layers.
groups.push(
  { id: 'outfit_slot', parent: 'torso', x: 0, y: 0 },
  { id: 'head_accessory_slot', parent: 'head', x: 0, y: 0 },
  { id: 'neck_accessory_slot', parent: 'torso', x: 0, y: 0 },
);
const shapes = source.shapes.map((s, i) => {
  const component = manifest.shapes[i];
  if (s.id !== component.id) throw new Error('SVG shape order no longer matches its named groups.');
  const parent = aliases[component.group] ?? component.group;
  return {
    ...s,
    parent,
    x: s.x - absolute[parent][0],
    y: s.y - absolute[parent][1],
    ...(component.hidden ? { opacity: 0 } : {}),
  };
});
// SVG open strokes must stay unfilled. Some SVG importers supply a default fill.
for (const i of [2, 25, 26, 32, 36, 37]) delete shapes[i].fill;
const wearableShapes = accessoriesSource.shapes.map((s, i) => {
  const parent = i < 3 ? 'neck_accessory_slot' : 'head_accessory_slot';
  const origin = i < 3 ? absolute.torso : absolute.head;
  const shape = { ...s, parent, x: s.x - origin[0], y: s.y - origin[1], opacity: 0 };
  if (i === 0 || i === 5) delete shape.fill;
  return shape;
});

// Frames are authored in seconds so fast anticipation, airborne hang time and
// delayed head/limb follow-through remain readable when changing a loop's length.
const track = (target, property, values) => ({
  target,
  property,
  keyframes: values.map(([time, value, easing = 'ease-in-out']) => ({
    frame: Math.round(time * 60),
    value,
    easing,
  })),
});
const neutral = {
  rig: { x: 400, y: 870, rotation: 0, scaleX: 1, scaleY: 1 },
  torso: { x: 0, y: -294, rotation: 0, scaleX: 1, scaleY: 1 },
  head: { x: 0, y: -46, rotation: 0, scaleX: 1, scaleY: 1 },
  armLeft: { rotation: 0 },
  armRight: { rotation: 0 },
  legLeft: { rotation: 0, y: -100 },
  legRight: { rotation: 0, y: -100 },
  eyesLeft: { x: -81, y: -137, scaleX: 1, scaleY: 1 },
  eyesRight: { x: 78, y: -138, scaleX: 1, scaleY: 1 },
  mouth: { scaleX: 1, scaleY: 1 },
  ground: { scaleX: 1, opacity: 0.14 },
};
// Deterministic Rive vector particles: two shoulder-height emitters fan out,
// tumble and fall. Every other state explicitly hides/resets the effects.
const partyColors = ['#334EAC', '#7096D1', '#081F5C', '#D0E3FF'];
const confetti = Array.from({ length: 24 }, (_, i) => ({
  id: `confetti${i}`,
  type: i % 5 === 0 ? 'ellipse' : 'rect',
  x: i % 2 === 0 ? 310 : 515,
  y: 420 + (i % 3) * 12,
  width: i % 4 === 0 ? 12 : 20,
  height: i % 5 === 0 ? 18 : i % 4 === 0 ? 44 : 28,
  cornerRadius: 2,
  opacity: 0,
  fill: { color: partyColors[i % 4] },
}));
const sparklePositions = [
  [145, 240],
  [655, 210],
  [210, 115],
  [580, 100],
  [105, 465],
  [710, 445],
];
const sparkles = sparklePositions.map(([x, y], i) => ({
  id: `sparkle${i}`,
  type: 'polygon',
  x,
  y,
  opacity: 0,
  points: [
    { x: 0, y: -21 },
    { x: 6, y: -6 },
    { x: 21, y: 0 },
    { x: 6, y: 6 },
    { x: 0, y: 21 },
    { x: -6, y: 6 },
    { x: -21, y: 0 },
    { x: -6, y: -6 },
  ],
  fill: { color: partyColors[i % 4] },
}));
for (const piece of [...confetti, ...sparkles])
  neutral[piece.id] = { x: piece.x, y: piece.y, rotation: 0, scaleX: 1, scaleY: 1, opacity: 0 };
const blink = (duration, at = 1.5) =>
  ['eyesLeft', 'eyesRight'].map((id) =>
    track(id, 'scaleY', [
      [0, 1],
      [at, 1],
      [at + 0.07, 0.06],
      [at + 0.14, 1],
      [duration, 1],
    ]),
  );
function animation(name, seconds, authored) {
  // Key every joint in every state so a wave or lean cannot leak into the next pose.
  const tracks = new Map();
  for (const [id, props] of Object.entries(neutral)) {
    for (const [property, value] of Object.entries(props)) {
      tracks.set(
        `${id}:${property}`,
        track(id, property, [
          [0, value],
          [seconds, value],
        ]),
      );
    }
  }
  for (const item of [...blink(seconds), ...authored])
    tracks.set(`${item.target}:${item.property}`, item);
  return {
    name,
    fps: 60,
    duration: Math.round(seconds * 60),
    loop: 'loop',
    tracks: [...tracks.values()],
  };
}
const idle = animation('idle', 3, [
  track('rig', 'x', [
    [0, 400],
    [0.65, 410],
    [1.55, 390],
    [2.35, 403],
    [3, 400],
  ]),
  track('torso', 'y', [
    [0, -294],
    [0.6, -309],
    [1.4, -294],
    [2.1, -305],
    [3, -294],
  ]),
  track('torso', 'rotation', [
    [0, 0],
    [0.8, 3],
    [1.7, -3],
    [2.5, 1],
    [3, 0],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [0.95, -5],
    [1.85, 5],
    [2.6, -2],
    [3, 0],
  ]),
  track('armRight', 'rotation', [
    [0, 0],
    [0.8, -9],
    [1.7, 10],
    [2.5, -4],
    [3, 0],
  ]),
  track('armLeft', 'rotation', [
    [0, 0],
    [0.9, 7],
    [1.8, -8],
    [2.6, 3],
    [3, 0],
  ]),
  track('legRight', 'rotation', [
    [0, 0],
    [1.7, 0],
    [1.88, -13],
    [2.05, 0],
    [2.2, -9],
    [2.4, 0],
    [3, 0],
  ]),
  track('eyesLeft', 'x', [
    [0, -81],
    [0.6, -72],
    [1.2, -72],
    [1.7, -88],
    [2.3, -88],
    [3, -81],
  ]),
  track('eyesRight', 'x', [
    [0, 78],
    [0.6, 87],
    [1.2, 87],
    [1.7, 71],
    [2.3, 71],
    [3, 78],
  ]),
]);
const happy = animation('happy', 2.4, [
  track('rig', 'y', [
    [0, 870],
    [0.13, 886, 'ease-in'],
    [0.34, 765, 'ease-out'],
    [0.47, 761],
    [0.68, 870, 'ease-in'],
    [0.77, 881],
    [0.98, 793, 'ease-out'],
    [1.12, 788],
    [1.32, 870, 'ease-in'],
    [1.42, 879],
    [1.58, 867],
    [1.76, 870],
    [2.4, 870],
  ]),
  track('rig', 'scaleX', [
    [0, 1],
    [0.13, 1.12],
    [0.32, 0.94],
    [0.5, 0.98],
    [0.7, 1.13],
    [0.86, 1],
    [1.04, 0.96],
    [1.34, 1.1],
    [1.55, 0.98],
    [1.76, 1],
    [2.4, 1],
  ]),
  track('rig', 'scaleY', [
    [0, 1],
    [0.13, 0.88],
    [0.32, 1.07],
    [0.5, 1.02],
    [0.7, 0.88],
    [0.86, 1],
    [1.04, 1.04],
    [1.34, 0.91],
    [1.55, 1.02],
    [1.76, 1],
    [2.4, 1],
  ]),
  track('torso', 'rotation', [
    [0, 0],
    [0.15, -4],
    [0.4, 6],
    [0.73, -5],
    [1.05, 5],
    [1.4, -3],
    [1.7, 0],
    [2.4, 0],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [0.22, 7],
    [0.48, -8],
    [0.82, 7],
    [1.14, -7],
    [1.52, 3],
    [1.82, 0],
    [2.4, 0],
  ]),
  track('armRight', 'rotation', [
    [0, 0],
    [0.13, 15],
    [0.3, -28],
    [0.48, 31],
    [0.66, -28],
    [0.84, 31],
    [1.02, -27],
    [1.2, 25],
    [1.4, -17],
    [1.64, 5],
    [1.85, 0],
    [2.4, 0],
  ]),
  track('armLeft', 'rotation', [
    [0, 0],
    [0.15, -12],
    [0.38, 36],
    [0.72, 12],
    [1.04, 30],
    [1.35, 8],
    [1.65, 0],
    [2.4, 0],
  ]),
  track('legLeft', 'rotation', [
    [0, 0],
    [0.18, 0],
    [0.4, 20],
    [0.67, 0],
    [1.06, -14],
    [1.32, 0],
    [2.4, 0],
  ]),
  track('legRight', 'rotation', [
    [0, 0],
    [0.18, 0],
    [0.4, -18],
    [0.67, 0],
    [1.06, 17],
    [1.32, 0],
    [2.4, 0],
  ]),
  track('mouth', 'scaleX', [
    [0, 1],
    [0.28, 1.17],
    [1.3, 1.17],
    [1.7, 1],
    [2.4, 1],
  ]),
  track('mouth', 'scaleY', [
    [0, 1],
    [0.28, 1.28],
    [1.3, 1.28],
    [1.7, 1],
    [2.4, 1],
  ]),
  track('ground', 'scaleX', [
    [0, 1],
    [0.14, 1.1],
    [0.4, 0.65],
    [0.7, 1.1],
    [1.04, 0.74],
    [1.35, 1.08],
    [1.7, 1],
    [2.4, 1],
  ]),
  track('ground', 'opacity', [
    [0, 0.14],
    [0.4, 0.07],
    [0.7, 0.16],
    [1.04, 0.09],
    [1.35, 0.16],
    [1.7, 0.14],
    [2.4, 0.14],
  ]),
]);
const listening = animation('listening', 2.6, [
  track('torso', 'rotation', [
    [0, 0],
    [0.25, -5],
    [1.85, -5],
    [2.6, 0],
  ]),
  track('head', 'x', [
    [0, 0],
    [0.3, -19],
    [1.9, -19],
    [2.6, 0],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [0.32, -13],
    [0.65, -9],
    [1, -13],
    [1.6, -10],
    [2, -13],
    [2.6, 0],
  ]),
  track('head', 'scaleX', [
    [0, 1],
    [0.35, 1.07],
    [2, 1.07],
    [2.6, 1],
  ]),
  track('head', 'scaleY', [
    [0, 1],
    [0.35, 1.07],
    [2, 1.07],
    [2.6, 1],
  ]),
  track('armRight', 'rotation', [
    [0, 0],
    [0.3, -24],
    [0.6, -19],
    [1.9, -19],
    [2.6, 0],
  ]),
  track('armLeft', 'rotation', [
    [0, 0],
    [0.35, 12],
    [2, 12],
    [2.6, 0],
  ]),
  track('mouth', 'scaleY', [
    [0, 1],
    [0.3, 0.45],
    [2, 0.45],
    [2.6, 1],
  ]),
]);
const thinking = animation('thinking', 2.8, [
  track('torso', 'rotation', [
    [0, 0],
    [0.5, 5],
    [1.4, -4],
    [2.1, 3],
    [2.8, 0],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [0.35, 14],
    [0.9, 10],
    [1.4, -10],
    [2.05, -7],
    [2.8, 0],
  ]),
  track('head', 'y', [
    [0, -46],
    [0.4, -55],
    [1.4, -46],
    [2.1, -53],
    [2.8, -46],
  ]),
  track('armRight', 'rotation', [
    [0, 0],
    [0.35, -32],
    [0.65, -22],
    [0.95, -31],
    [1.25, -22],
    [1.55, -31],
    [2, -22],
    [2.8, 0],
  ]),
  track('eyesLeft', 'x', [
    [0, -81],
    [0.3, -65],
    [1.15, -65],
    [1.4, -94],
    [2.15, -94],
    [2.8, -81],
  ]),
  track('eyesRight', 'x', [
    [0, 78],
    [0.3, 94],
    [1.15, 94],
    [1.4, 65],
    [2.15, 65],
    [2.8, 78],
  ]),
  track('eyesLeft', 'y', [
    [0, -137],
    [0.3, -146],
    [2.2, -146],
    [2.8, -137],
  ]),
  track('eyesRight', 'y', [
    [0, -138],
    [0.3, -147],
    [2.2, -147],
    [2.8, -138],
  ]),
  track('mouth', 'scaleY', [
    [0, 1],
    [0.3, 0.25],
    [2.25, 0.25],
    [2.8, 1],
  ]),
]);
const speaking = animation('speaking', 2, [
  track('torso', 'y', [
    [0, -294],
    [0.25, -307],
    [0.5, -294],
    [0.8, -305],
    [1.1, -294],
    [1.45, -308],
    [1.75, -294],
    [2, -294],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [0.3, -7],
    [0.65, 5],
    [1.05, -5],
    [1.4, 7],
    [1.75, -3],
    [2, 0],
  ]),
  track('armRight', 'rotation', [
    [0, 0],
    [0.22, -20],
    [0.5, 9],
    [0.85, -17],
    [1.2, 13],
    [1.55, -13],
    [2, 0],
  ]),
  track('armLeft', 'rotation', [
    [0, 0],
    [0.35, 22],
    [0.7, 5],
    [1.05, 25],
    [1.5, 8],
    [2, 0],
  ]),
  track(
    'mouth',
    'scaleY',
    Array.from({ length: 21 }, (_, i) => [i / 10, [1, 0.35, 1.25, 0.65, 1.1][i % 5]]),
  ),
  track('mouth', 'scaleX', [
    [0, 1],
    [0.35, 0.85],
    [0.7, 1.13],
    [1.1, 0.9],
    [1.5, 1.12],
    [2, 1],
  ]),
]);
const encouraging = animation('encouraging', 2.4, [
  track('torso', 'rotation', [
    [0, 0],
    [0.25, -5],
    [0.65, 4],
    [1.1, -3],
    [1.6, 0],
    [2.4, 0],
  ]),
  track('head', 'y', [
    [0, -46],
    [0.25, -31],
    [0.45, -53],
    [0.65, -31],
    [0.9, -50],
    [1.2, -46],
    [2.4, -46],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [0.2, -8],
    [0.55, -4],
    [0.9, -7],
    [1.4, 0],
    [2.4, 0],
  ]),
  track('armLeft', 'rotation', [
    [0, 0],
    [0.25, 33],
    [0.55, 20],
    [0.8, 32],
    [1.1, 20],
    [1.55, 0],
    [2.4, 0],
  ]),
  track('armRight', 'rotation', [
    [0, 0],
    [0.3, -14],
    [0.7, 4],
    [1, -10],
    [1.6, 0],
    [2.4, 0],
  ]),
]);
const celebrationTracks = [];
for (const [i, piece] of confetti.entries()) {
  const launch = 0.16 + (i % 6) * 0.025;
  const peak = 0.52 + (i % 5) * 0.055;
  const fade = 1.62 + (i % 6) * 0.055;
  const endX = 65 + ((i * 113) % 670);
  const peakY = 85 + ((i * 47) % 215);
  celebrationTracks.push(
    track(piece.id, 'x', [
      [0, piece.x],
      [launch, piece.x],
      [peak, endX, 'ease-out'],
      [fade, endX + (i % 2 ? 20 : -20)],
      [2.4, piece.x],
    ]),
    track(piece.id, 'y', [
      [0, piece.y],
      [launch, piece.y],
      [peak, peakY, 'ease-out'],
      [fade, 610 + (i % 4) * 38, 'ease-in'],
      [2.4, piece.y],
    ]),
    track(piece.id, 'opacity', [
      [0, 0],
      [launch, 0],
      [launch + 0.03, 1],
      [fade - 0.2, 1],
      [fade, 0],
      [2.4, 0],
    ]),
    track(piece.id, 'rotation', [
      [0, 0],
      [launch, i * 17],
      [fade, (i % 2 ? 1 : -1) * (240 + i * 13), 'linear'],
      [2.4, 0],
    ]),
    track(piece.id, 'scaleX', [
      [0, 1],
      [launch, 1],
      [peak, 0.35],
      [peak + 0.22, 1],
      [fade, 0.3],
      [2.4, 1],
    ]),
  );
}
for (const [i, piece] of sparkles.entries()) {
  const start = 0.3 + i * 0.09;
  celebrationTracks.push(
    track(piece.id, 'opacity', [
      [0, 0],
      [start, 0],
      [start + 0.1, 1],
      [start + 0.38, 1],
      [start + 0.6, 0],
      [2.4, 0],
    ]),
    track(piece.id, 'scaleX', [
      [0, 0.2],
      [start, 0.2],
      [start + 0.16, 1.15],
      [start + 0.5, 0.3],
      [2.4, 0.2],
    ]),
    track(piece.id, 'scaleY', [
      [0, 0.2],
      [start, 0.2],
      [start + 0.16, 1.15],
      [start + 0.5, 0.3],
      [2.4, 0.2],
    ]),
    track(piece.id, 'rotation', [
      [0, 0],
      [start, 0],
      [start + 0.6, 70],
      [2.4, 0],
    ]),
  );
}
celebrationTracks.push(
  track('rig', 'x', [
    [0, 400],
    [1.55, 400],
    [1.78, 385],
    [1.98, 415],
    [2.18, 393],
    [2.4, 400],
  ]),
  track('torso', 'rotation', [
    [0, 0],
    [0.15, -4],
    [0.4, 6],
    [0.73, -5],
    [1.05, 5],
    [1.4, -3],
    [1.7, 0],
    [1.85, -6],
    [2.05, 6],
    [2.23, -3],
    [2.4, 0],
  ]),
  track('legRight', 'rotation', [
    [0, 0],
    [0.18, 0],
    [0.4, -18],
    [0.67, 0],
    [1.06, 17],
    [1.32, 0],
    [1.83, -22],
    [2.05, 0],
    [2.4, 0],
  ]),
  track('eyesRight', 'scaleY', [
    [0, 1],
    [1.5, 1],
    [1.57, 0.06],
    [1.68, 1],
    [1.88, 1],
    [1.95, 0.06],
    [2.14, 1],
    [2.4, 1],
  ]),
);
for (const item of celebrationTracks) {
  happy.tracks = happy.tracks.filter(
    (t) => t.target !== item.target || t.property !== item.property,
  );
  happy.tracks.push(item);
}
const celebrating = { ...structuredClone(happy), name: 'celebrating' };
const effectIds = new Set([...confetti, ...sparkles].map((s) => s.id));
// Keep the happy motion; the celebration state owns the particle burst.
happy.tracks = happy.tracks.filter((t) => !effectIds.has(t.target));
for (const target of effectIds)
  happy.tracks.push({
    target,
    property: 'opacity',
    keyframes: [
      { frame: 0, value: 0 },
      { frame: happy.duration, value: 0 },
    ],
  });
const motionAnimations = [idle, listening, thinking, speaking, happy, encouraging, celebrating];
// Transfer motion deltas, never V1 anatomy. All V2 joints begin at their exact
// supplied source pivots and each state resets the full tracked pose.
const originalRest = {
  rig: { x: 400, y: 870 },
  torso: { x: 0, y: -294 },
  head: { x: 0, y: -46 },
  legLeft: { y: -100 },
  legRight: { y: -100 },
  eyesLeft: { x: -81, y: -137 },
  eyesRight: { x: 78, y: -138 },
};
const v2Rest = Object.fromEntries(groups.map((g) => [g.id, g]));
const mouthIds = { neutral: ['v2p32'], speaking: ['v2p33', 'v2p34'], happy: ['v2p35', 'v2p36'] };
const faceEyes = ['v2p27', 'v2p28', 'v2p29', 'v2p30'];
for (const a of motionAnimations) {
  const seconds = a.duration / 60;
  for (const t of a.tracks) {
    if (['x', 'y'].includes(t.property) && originalRest[t.target]?.[t.property] !== undefined) {
      const delta = v2Rest[t.target][t.property] - originalRest[t.target][t.property];
      for (const key of t.keyframes) key.value += delta;
    }
  }
  const cheerful = ['happy', 'celebrating', 'encouraging'].includes(a.name);
  const expression = cheerful ? 'happy' : a.name === 'speaking' ? 'speaking' : 'neutral';
  for (const [name, ids] of Object.entries(mouthIds))
    for (const id of ids)
      a.tracks.push(
        track(id, 'opacity', [
          [0, name === expression ? 1 : 0],
          [seconds, name === expression ? 1 : 0],
        ]),
      );
  // Speaking uses the supplied open mouth, with syllabic opening and closing.
  if (a.name === 'speaking') {
    a.tracks.push(
      track('mouth_speaking', 'scaleY', [
        [0, 0.55],
        [0.15, 1],
        [0.3, 0.4],
        [0.46, 0.85],
        [0.65, 0.35],
        [0.82, 1],
        [1.05, 0.45],
        [1.24, 0.9],
        [1.45, 0.3],
        [1.7, 1],
        [2, 0.55],
      ]),
    );
  } else
    a.tracks.push(
      track('mouth_speaking', 'scaleY', [
        [0, 1],
        [seconds, 1],
      ]),
    );
  for (const [ear, sign] of [
    ['ear_left', 1],
    ['ear_right', -1],
  ]) {
    const amount = a.name === 'listening' ? 11 : cheerful ? 9 : a.name === 'thinking' ? 6 : 3;
    a.tracks.push(
      track(ear, 'rotation', [
        [0, 0],
        [seconds * 0.18, amount * sign],
        [seconds * 0.36, -amount * 0.4 * sign],
        [seconds * 0.55, amount * 0.65 * sign],
        [seconds * 0.8, -amount * 0.25 * sign],
        [seconds, 0],
      ]),
    );
  }
  a.tracks.push(
    track('tail', 'rotation', [
      [0, 0],
      [seconds * 0.25, cheerful ? -12 : -3],
      [seconds * 0.6, cheerful ? 10 : 3],
      [seconds, 0],
    ]),
  );
  // Keep both original fur paws visible. The supplied seated pose tucks them
  // under the head, so expressive gestures move outwards before lifting.
  for (const [arm, sign] of [
    ['armLeft', -1],
    ['armRight', 1],
  ]) {
    const rest = v2Rest[arm];
    const extend = cheerful
      ? 82
      : a.name === 'speaking'
        ? 42
        : a.name === 'listening'
          ? sign === 1
            ? 45
            : 12
          : a.name === 'thinking'
            ? sign === 1
              ? 45
              : 8
            : 5;
    a.tracks.push(
      track(arm, 'x', [
        [0, rest.x],
        [seconds * 0.18, rest.x + sign * extend],
        [seconds * 0.42, rest.x + sign * extend * 0.8],
        [seconds * 0.65, rest.x + sign * extend],
        [seconds * 0.84, rest.x + sign * extend * 0.3],
        [seconds, rest.x],
      ]),
    );
    a.tracks.push(
      track(arm, 'y', [
        [0, rest.y],
        [seconds * 0.2, rest.y - (cheerful ? 28 : 8)],
        [seconds * 0.65, rest.y - (cheerful ? 20 : 8)],
        [seconds, rest.y],
      ]),
    );
    if (cheerful) {
      a.tracks = a.tracks.filter((t) => !(t.target === arm && t.property === 'rotation'));
      a.tracks.push(
        track(arm, 'rotation', [
          [0, 0],
          [0.16, sign * 10],
          [0.34, -sign * 85],
          [0.52, -sign * 115],
          [0.7, -sign * 75],
          [0.9, -sign * 110],
          [1.12, -sign * 80],
          [1.38, -sign * 30],
          [1.7, 0],
          [seconds, 0],
        ]),
      );
    }
  }
  // The closed-eye expression is visible only during the broad happy smile.
  a.tracks.push(
    track(
      'v2p37',
      'opacity',
      cheerful
        ? [
            [0, 0],
            [0.28, 0],
            [0.3, 1],
            [1.32, 1],
            [1.34, 0],
            [seconds, 0],
          ]
        : [
            [0, 0],
            [seconds, 0],
          ],
    ),
  );
  for (const id of faceEyes)
    a.tracks.push(
      track(
        id,
        'opacity',
        cheerful
          ? [
              [0, 1],
              [0.28, 1],
              [0.3, 0],
              [1.32, 0],
              [1.34, 1],
              [seconds, 1],
            ]
          : [
              [0, 1],
              [seconds, 1],
            ],
      ),
    );
}
const names = motionAnimations.map((a) => a.name);
// V2 fur, belly and hands always retain the supplied paints. Old outfit values
// remain readable by clients, but no clothing or recolor tracks are compiled.
const accessoryNames = ['headphones', 'glasses', 'hat', 'none'];
const accessoryAnimations = accessoryNames.map((id, index) => ({
  name: `accessory-${id}`,
  duration: 1,
  fps: 60,
  loop: 'loop',
  tracks: wearableShapes.map((shape, i) => ({
    target: shape.id,
    property: 'opacity',
    keyframes: [
      {
        frame: 0,
        value:
          (i < 3 && index === 0) || (i >= 3 && i < 6 && index === 1) || (i >= 6 && index === 2)
            ? 1
            : 0,
      },
    ],
  })),
}));
const renderShapes = [...shapes, ...wearableShapes];
const styleLayer = (name, input, items, defaultIndex = 0) => ({
  name,
  states: items.map((id) => ({ name: `${input}-${id}`, animation: `${input}-${id}` })),
  transitions: [
    { from: 'entry', to: `${input}-${items[defaultIndex]}` },
    ...items.map((id, value) => ({
      from: 'any',
      to: `${input}-${id}`,
      condition: { input, op: '==', value },
      duration: 0,
    })),
  ],
});
const scene = {
  artboard: { name: 'Panda', width: 800, height: 960 },
  groups,
  shapes: [
    {
      id: 'ground',
      type: 'ellipse',
      x: 400,
      y: 864,
      width: 310,
      height: 28,
      opacity: 0.14,
      fill: { color: '#081F5C' },
    },
    ...renderShapes,
    ...confetti,
    ...sparkles,
  ],
  animations: [...motionAnimations, ...accessoryAnimations],
  stateMachine: {
    name: 'Panda',
    inputs: [
      ...names.map((name) => ({ name, type: 'trigger' })),
      { name: 'outfit', type: 'number', value: 3 },
      { name: 'accessory', type: 'number', value: 3 },
    ],
    layers: [
      {
        name: 'Motion',
        states: names.map((name) => ({ name, animation: name })),
        transitions: [
          { from: 'entry', to: 'idle' },
          ...names.map((name) => ({
            from: 'any',
            to: name,
            condition: { input: name },
            duration: 100,
          })),
        ],
      },
      styleLayer('Accessories', 'accessory', accessoryNames, 3),
    ],
  },
};
await mkdir('public/mascot', { recursive: true });
await writeFile('src/panda_rive_assets/panda.scene.json', JSON.stringify(scene, null, 2) + '\n');
await writeFile(
  '/tmp/haru-panda-create.json',
  JSON.stringify({
    outPath: new URL('../../public/mascot/panda.riv', import.meta.url).pathname,
    scene,
    previewTime: 0.6,
  }),
);
console.log(
  'Scene ready: one panda rig, seven motion states, unchanged original fur and four optional accessories.',
);
