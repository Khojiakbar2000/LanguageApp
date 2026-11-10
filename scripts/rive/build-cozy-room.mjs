// Original supplied room artwork + the existing V2 panda transform rig.
import { readFile, writeFile } from 'node:fs/promises';
const read = async (p) => JSON.parse(await readFile(p, 'utf8'));
const env = await read('src/features/cozy-room/assets/room.import.json');
const manifest = await read('src/features/cozy-room/assets/room-manifest.json');
for (const s of env.shapes)
  if (s.stroke && s.fill?.color === '#000000' && s.subpaths?.every((p) => !p.closed)) delete s.fill;
const panda = await read('src/panda_rive_assets/panda.scene.json');
if (env.shapes.length !== manifest.length)
  throw new Error('Room import no longer matches the supplied layer manifest.');
const groups = [];
const shapes = [];
const addGroup = (id, x = 0, y = -100, parent) => {
  if (!groups.some((g) => g.id === id)) groups.push({ id, x, y, ...(parent ? { parent } : {}) });
  return id;
};
const track = (target, property, points) => ({
  target,
  property,
  keyframes: points.map(([t, value, easing = 'ease-in-out']) => ({
    frame: Math.round(t * 60),
    value,
    easing,
  })),
});
const ambient = [];
const clock = [];
const day = [];
const night = [];
const groupOrigins = new Map();
function attach(shape, id, x = 0, y = -100) {
  addGroup(id, x, y);
  groupOrigins.set(id, [x, y]);
  return { ...shape, parent: id, x: shape.x - x, y: shape.y - (y + 100) };
}
// All source-space positions are retained except table/book/cup, brought closer to
// the chair to make the supplied arm poses reach naturally. Artboard crops 100px.
for (const [i, s] of env.shapes.entries()) {
  const m = manifest[i];
  const n = m.group;
  if (m.layer === 'layer_coffee_cup' && !/cup_shadow|cup_saucer/.test(n)) continue;
  if (m.layer === 'layer_coffee_steam') continue;
  if (n === 'asset_rain_clouds_rain') continue; // individually looped, clipped copies below
  let id = m.layer,
    x = 0,
    y = -100;
  if (m.layer === 'layer_coffee_table') x = -40;
  if (m.layer === 'layer_korean_study_book') x = -35;
  if (m.layer === 'layer_coffee_cup') x = -167;
  if (/leaf_left|leaf_right|leaf_top/.test(n)) {
    id = n;
    x = 945;
    y = 908;
  }
  if (/hour_hand|minute_hand/.test(n)) {
    id = n;
    x = 905;
    y = 375;
  }
  const item = attach(s, id, x, y);
  if (['layer_coffee_table', 'layer_korean_study_book', 'layer_coffee_cup'].includes(m.layer))
    item.x += x;
  if (['layer_walls', 'layer_wood_floor', 'layer_seoul_skyline'].includes(m.layer)) {
    const clone = structuredClone(item);
    clone.id += 'Night';
    clone.opacity = 0;
    const palette = {
      '#EAF4F6': '#344C56',
      '#DCEBE8': '#2E444C',
      '#B6D0CB': '#536465',
      '#F6F5EA': '#938C77',
      '#D0E1DD': '#496069',
      '#D5E5E1': '#3D555D',
      '#C68F67': '#AD805F',
      '#9D6A4D': '#815D48',
      '#9BC5D6': '#172A46',
      '#F5D5BA': '#53637B',
      '#9EB8C1': '#445873',
      '#6B91A4': '#334B66',
      '#587E90': '#B2C7CE',
      '#FFF2D1': '#F9EDD0',
      '#F6E7C9': '#FFE4AB',
    };
    for (const paint of [clone.fill, clone.stroke]) {
      if (paint?.color) paint.color = palette[paint.color.toUpperCase()] ?? paint.color;
      if (paint?.gradient)
        for (const stop of paint.gradient.stops)
          stop.color = palette[stop.color.toUpperCase()] ?? stop.color;
    }
    if (m.layer === 'layer_seoul_skyline' && s.fill?.color?.toUpperCase() === '#F6E7C9')
      clone.opacity = 0;
    day.push(
      track(item.id, 'opacity', [
        [0, item.opacity ?? 1],
        [1, item.opacity ?? 1],
      ]),
      track(clone.id, 'opacity', [
        [0, 0],
        [1, 0],
      ]),
    );
    night.push(
      track(item.id, 'opacity', [
        [0, 0],
        [1, 0],
      ]),
      track(clone.id, 'opacity', [
        [0, 1],
        [1, 1],
      ]),
    );
    shapes.push(item, clone);
  } else shapes.push(item);
}
// Soft radial light, rather than a filter or an overlay over the whole room.
addGroup('lamp_glow', 100, 900);
const glow = {
  id: 'warm_lamp_light',
  parent: 'lamp_glow',
  type: 'ellipse',
  x: 0,
  y: 0,
  width: 660,
  height: 720,
  opacity: 0.16,
  fill: {
    gradient: {
      type: 'radial',
      start: { x: 0, y: 0 },
      end: { x: 330, y: 0 },
      stops: [
        { position: 0, color: '#66FFE1A0' },
        { position: 1, color: '#00FFE1A0' },
      ],
    },
  },
};
shapes.splice(
  shapes.findIndex((s) => s.parent === 'layer_floor_lamp'),
  0,
  glow,
);
day.push(
  track(glow.id, 'opacity', [
    [0, 0.17],
    [1, 0.17],
  ]),
);
night.push(
  track(glow.id, 'opacity', [
    [0, 0.65],
    [1, 0.65],
  ]),
);
ambient.push(
  track('lamp_glow', 'scaleX', [
    [0, 1],
    [3.7, 1.025],
    [7.9, 0.99],
    [11.1, 1.015],
    [14.3, 1],
    [60, 1],
  ]),
);
for (const [id, phase, amount] of [
  ['asset_potted_plant_leaf_left', 0, 1.5],
  ['asset_potted_plant_leaf_right', 1, -1.8],
  ['asset_potted_plant_leaf_top', 2, 1.1],
]) {
  const pts = [[0, 0]];
  for (let t = 1 + phase; t < 60; t += 3.7 + phase * 0.27)
    pts.push([t, Math.sin(t * 0.91 + phase) * amount]);
  pts.push([60, 0]);
  ambient.push(track(id, 'rotation', pts));
}
for (const [id, seconds] of [
  ['asset_wall_clock_hour_hand', 43200],
  ['asset_wall_clock_minute_hand', 3600],
])
  clock.push(
    track(id, 'rotation', [
      [0, 0, 'linear'],
      [43200, (360 * 43200) / seconds, 'linear'],
    ]),
  );
const clip = {
  id: 'window_clip',
  type: 'rect',
  x: 540,
  y: 445,
  width: 750,
  height: 620,
  opacity: 0,
  fill: { color: '#F9FCFF' },
};
shapes.push(clip);
const rainSource = env.shapes[manifest.findIndex((m) => m.group === 'asset_rain_clouds_rain')];
for (let i = 0; i < 16; i++) {
  const id = `rain_${i}`;
  const x = 192 + ((i * 113) % 700);
  const period = 60 / (13 + (i % 5) * 2);
  const phase = (i * 0.347) % period;
  addGroup(id, x, 135);
  shapes.push({
    ...structuredClone(rainSource),
    id: `${id}_line`,
    parent: id,
    x: 0,
    y: 0,
    clipBy: 'window_clip',
    opacity: 0.22 + (i % 3) * 0.13,
  });
  const points = [[0, (phase / period) * 710 - 45, 'linear']];
  const baseOpacity = 0.22 + (i % 3) * 0.13;
  const visibility = [[0, baseOpacity]];
  for (let t = period - phase; t < 60; t += period) {
    points.push([t - 0.02, 665, 'linear'], [t, -45, 'linear']);
    // Hide the wrap while outside the clipping rectangle, never flash upwards.
    for (const [time, opacity] of [
      [t - 0.06, baseOpacity],
      [t - 0.04, 0],
      [t + 0.04, 0],
      [t + 0.06, baseOpacity],
    ])
      if (time >= 0 && time <= 60) visibility.push([time, opacity]);
  }
  visibility.push([60, baseOpacity]);
  ambient.push(track(`${id}_line`, 'opacity', visibility));
  points.push([60, (((60 + phase) % period) / period) * 710 - 45, 'linear']);
  ambient.push(
    track(
      id,
      'y',
      points.map(([t, v, e]) => [t, 135 + v, e]),
    ),
  );
}
// Reuse the supplied V2 vector hierarchy. The room has its own gentle motion
// controller; learning/onboarding retain their energetic Tutor state machine.
addGroup('panda_placement', 120, 765);
groups.find((g) => g.id === 'panda_placement').scaleX = 0.65;
groups.find((g) => g.id === 'panda_placement').scaleY = 0.65;
for (const g of panda.groups)
  groups.push({ ...structuredClone(g), ...(g.id === 'rig' ? { parent: 'panda_placement' } : {}) });
const baseShapes = panda.shapes.filter((s) => s.id.startsWith('v2p'));
shapes.push(
  ...structuredClone(baseShapes.filter((s) => s.id !== 'v2p16')),
  structuredClone(baseShapes.find((s) => s.id === 'v2p16')),
);
// One single cup, always a child of the right paw. Until grip/release its local
// transform compensates for the hand reaching, keeping it stationary on the table.
const carrier = addGroup('cup_carrier', 0, 0, 'armRight');
Object.assign(
  groups.find((g) => g.id === carrier),
  { scaleX: -1 / 0.65, scaleY: 1 / 0.65 },
);
const cupShapes = [];
for (const [i, s] of env.shapes.entries())
  if (
    manifest[i].layer === 'layer_coffee_cup' &&
    !/cup_shadow|cup_saucer/.test(manifest[i].group)
  ) {
    const item = { ...structuredClone(s), parent: 'cup_carrier', x: s.x - 727, y: s.y - 1275 };
    cupShapes.push(item);
    shapes.push(item);
  }
for (const [i, s] of env.shapes.entries())
  if (manifest[i].layer === 'layer_coffee_steam') {
    const j = ['steam_left', 'steam_center', 'steam_right'].findIndex((id) =>
      manifest[i].group.endsWith(id),
    );
    const id = `steam_${j}`;
    addGroup(id, 0, 0, 'cup_carrier');
    shapes.push({ ...structuredClone(s), parent: id, x: s.x - 727, y: s.y - 1275 });
    const pts = [[0, 0]],
      op = [[0, 0]];
    const period = 60 / [17, 14, 13][j];
    for (let t = 0; t < 60; t += period) {
      pts.push([t + 0.02, 0], [Math.min(t + period - 0.02, 60), -45 - j * 8]);
      op.push([t + 0.02, 0], [t + 0.45, 0.5], [Math.min(t + period - 0.04, 60), 0]);
    }
    ambient.push(track(id, 'y', pts), track(id, 'opacity', op));
  }
// Leave each original paw in front of the carried cup's handle, while the single
// cup body remains above the mouth. No clothing shapes or recolor tracks exist.
const rest = Object.fromEntries(
  groups.map((g) => [
    g.id,
    { x: g.x, y: g.y, rotation: g.rotation ?? 0, scaleX: g.scaleX ?? 1, scaleY: g.scaleY ?? 1 },
  ]),
);
const mult = (a, b) => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];
function matrix(id, pose) {
  const g = groups.find((g) => g.id === id);
  const p = { ...rest[id], ...pose[id] };
  const a = (p.rotation * Math.PI) / 180;
  const m = [
    Math.cos(a) * p.scaleX,
    Math.sin(a) * p.scaleX,
    -Math.sin(a) * p.scaleY,
    Math.cos(a) * p.scaleY,
    p.x,
    p.y,
  ];
  return g.parent ? mult(matrix(g.parent, pose), m) : m;
}
function inversePoint(m, x, y) {
  const det = m[0] * m[3] - m[1] * m[2];
  return [
    (m[3] * (x - m[4]) - m[2] * (y - m[5])) / det,
    (-m[1] * (x - m[4]) + m[0] * (y - m[5])) / det,
  ];
}
const smooth = (t) => {
  const v = Math.max(0, Math.min(t, 1));
  return v * v * (3 - 2 * v);
};
const lerp = (a, b, t) => a + (b - a) * smooth(t);
function initialPose(t) {
  const lean = t < 1.6 ? lerp(0, 3, t / 1.6) : t < 6.6 ? 3 : lerp(3, 0, (t - 6.6) / 1.6);
  return {
    torso: { rotation: lean },
    head: {
      rotation:
        t < 2.8
          ? lerp(0, 5, t / 1.6)
          : t < 4.8
            ? lerp(5, -5, (t - 2.8) / 0.6)
            : lerp(-5, 0, (t - 4.8) / 2),
    },
    armRight: {
      x: lerp(79, 137, t / 1.6),
      y: lerp(-98, -73, t / 1.6),
      rotation: lerp(0, -39, t / 1.6),
    },
  };
}
const contact = initialPose(1.6);
const grip = inversePoint(matrix('armRight', contact), 560, 1175);
const gripRotation =
  (-Math.atan2(matrix('armRight', contact)[1], matrix('armRight', contact)[0]) * 180) / Math.PI;
function poseAt(t) {
  const p = initialPose(t);
  if (t >= 1.6 && t <= 6.6) {
    const r =
      t < 2.8 ? lerp(-39, -58, (t - 1.6) / 1.2) : t < 4.8 ? -58 : lerp(-58, -39, (t - 4.8) / 1.8);
    const x =
      t < 2.8 ? lerp(560, 425, (t - 1.6) / 1.2) : t < 4.8 ? 425 : lerp(425, 560, (t - 4.8) / 1.8);
    const y =
      t < 2.8
        ? lerp(1175, 1120, (t - 1.6) / 1.2)
        : t < 4.8
          ? 1120
          : lerp(1120, 1175, (t - 4.8) / 1.8);
    const point = inversePoint(matrix('torso', p), x, y);
    const a = (r * Math.PI) / 180;
    p.armRight = {
      x: point[0] - (Math.cos(a) * grip[0] - Math.sin(a) * grip[1]),
      y: point[1] - (Math.sin(a) * grip[0] + Math.cos(a) * grip[1]),
      rotation: r,
    };
    p.cup_carrier = { x: grip[0], y: grip[1], rotation: gripRotation };
  } else {
    if (t > 6.6) {
      p.armRight = {
        x: lerp(137, 79, (t - 6.6) / 1.4),
        y: lerp(-73, -98, (t - 6.6) / 1.4),
        rotation: lerp(-39, 0, (t - 6.6) / 1.4),
      };
    }
    const m = matrix('armRight', p);
    const c = inversePoint(m, 560, 1175);
    p.cup_carrier = { x: c[0], y: c[1], rotation: (-Math.atan2(m[1], m[0]) * 180) / Math.PI };
  }
  return p;
}
Object.assign(
  groups.find((g) => g.id === 'cup_carrier'),
  poseAt(0).cup_carrier,
);
rest.cup_carrier = { ...rest.cup_carrier, ...poseAt(0).cup_carrier };
// Reset every animated character property at each state boundary.
const pandaIds = new Set(panda.groups.map((g) => g.id));
pandaIds.add('cup_carrier');
const neutralTracks = [];
for (const id of pandaIds)
  for (const property of ['x', 'y', 'rotation', 'scaleX', 'scaleY'])
    neutralTracks.push(track(id, property, [[0, rest[id][property]]]));
for (const s of baseShapes) neutralTracks.push(track(s.id, 'opacity', [[0, s.opacity ?? 1]]));
function motion(name, duration, authored = []) {
  const tracks = new Map(
    neutralTracks.map((t) => [t.target + ':' + t.property, structuredClone(t)]),
  );
  for (const t of authored) tracks.set(t.target + ':' + t.property, t);
  return {
    name,
    fps: 60,
    duration: Math.round(duration * 60),
    loop: name === 'Idle' ? 'loop' : 'oneShot',
    tracks: [...tracks.values()],
  };
}
const idleTracks = [
  track('rig', 'scaleY', [
    [0, 1],
    [2.3, 1.006],
    [4.4, 1],
    [6.4, 1.005],
    [8.5, 1],
    [10.4, 1.006],
    [12.6, 1],
    [14.7, 1.004],
    [17.3, 1],
  ]),
  track('head', 'rotation', [
    [0, 0],
    [4, 0],
    [5.2, -2],
    [7.1, -2],
    [8.4, 0],
    [12, 0],
    [13.3, 2],
    [15.1, 1],
    [17.3, 0],
  ]),
];
for (const id of ['eyesLeft', 'eyesRight'])
  idleTracks.push(
    track(id, 'scaleY', [
      [0, 1],
      [1.8, 1],
      [1.88, 0.06],
      [1.98, 1],
      [6.4, 1],
      [6.48, 0.06],
      [6.6, 1],
      [12.3, 1],
      [12.38, 0.06],
      [12.5, 1],
      [15.6, 1],
      [15.68, 0.06],
      [15.78, 1],
      [17.3, 1],
    ]),
    track(id, 'x', [
      [0, rest[id].x],
      [4.6, rest[id].x],
      [5, rest[id].x - 5],
      [6.8, rest[id].x - 5],
      [7.5, rest[id].x],
      [12.8, rest[id].x],
      [13.3, rest[id].x + 4],
      [14.5, rest[id].x + 4],
      [15.1, rest[id].x],
      [17.3, rest[id].x],
    ]),
  );
for (const [id, sign] of [
  ['ear_left', 1],
  ['ear_right', -1],
])
  idleTracks.push(
    track(id, 'rotation', [
      [0, 0],
      [3.3, 0],
      [3.5, sign * 2.5],
      [3.8, 0],
      [9.1, 0],
      [9.3, -sign * 2],
      [9.7, 0],
      [17.3, 0],
    ]),
  );
// A brief, occasional smile on a different beat from blinking and breathing.
for (const [id, inverted] of [
  ['v2p32', true],
  ['v2p35', false],
  ['v2p36', false],
])
  idleTracks.push(
    track(id, 'opacity', [
      [0, inverted ? 1 : 0],
      [10.7, inverted ? 1 : 0],
      [11.05, inverted ? 0 : 1],
      [11.8, inverted ? 0 : 1],
      [12.15, inverted ? 1 : 0],
      [17.3, inverted ? 1 : 0],
    ]),
  );
const animations = [
  motion('Idle', 17.3, idleTracks),
  motion('Wave', 2.8, [
    track('head', 'rotation', [
      [0, 0],
      [0.4, -3],
      [1.6, -3],
      [2.8, 0],
    ]),
    track('armRight', 'x', [
      [0, 79],
      [0.45, 145],
      [1.9, 145],
      [2.8, 79],
    ]),
    track('armRight', 'rotation', [
      [0, 0],
      [0.45, -85],
      [0.75, -110],
      [1, -75],
      [1.25, -105],
      [1.5, -78],
      [1.85, -90],
      [2.8, 0],
    ]),
    track('v2p32', 'opacity', [
      [0, 1],
      [0.4, 0],
      [2.2, 0],
      [2.8, 1],
    ]),
    track('v2p35', 'opacity', [
      [0, 0],
      [0.4, 1],
      [2.2, 1],
      [2.8, 0],
    ]),
    track('v2p36', 'opacity', [
      [0, 0],
      [0.4, 1],
      [2.2, 1],
      [2.8, 0],
    ]),
  ]),
];
// A wave must leave the table cup still while the paw moves away.
// Bake compensation against the same sampled joint motion, so breathing and
// waving cannot make the cup drift from its saucer before it is picked up.
const sampleTrack = (tr, frame) => {
  const keys = tr.keyframes;
  let i = 1;
  while (i < keys.length && keys[i].frame < frame) i++;
  const a = keys[Math.max(0, i - 1)],
    b = keys[Math.min(i, keys.length - 1)];
  return lerp(a.value, b.value, b.frame === a.frame ? 0 : (frame - a.frame) / (b.frame - a.frame));
};
for (const a of animations) {
  const controlled = a.tracks.filter(
    (t) =>
      (a.name === 'Idle' && t.target === 'rig' && t.property === 'scaleY') ||
      (a.name === 'Wave' && t.target === 'armRight' && ['x', 'rotation'].includes(t.property)),
  );
  const baked = new Map(controlled.map((t) => [t.target + ':' + t.property, []]));
  const carriers = Object.fromEntries(['x', 'y', 'rotation', 'scaleY'].map((p) => [p, []]));
  for (let f = 0; f <= a.duration; f++) {
    const pose = {};
    for (const t of controlled) {
      const v = sampleTrack(t, f);
      pose[t.target] ??= {};
      pose[t.target][t.property] = v;
      baked.get(t.target + ':' + t.property).push([f / 60, v, 'linear']);
    }
    const m = matrix('armRight', pose),
      c = inversePoint(m, 560, 1175);
    carriers.x.push([f / 60, c[0], 'linear']);
    carriers.y.push([f / 60, c[1], 'linear']);
    carriers.rotation.push([f / 60, (-Math.atan2(m[1], m[0]) * 180) / Math.PI, 'linear']);
    carriers.scaleY.push([
      f / 60,
      a.name === 'Idle' ? 1 / (0.65 * (pose.rig?.scaleY ?? 1)) : 1 / 0.65,
      'linear',
    ]);
  }
  for (const t of controlled) {
    a.tracks = a.tracks.filter((k) => k.target !== t.target || k.property !== t.property);
    a.tracks.push(track(t.target, t.property, baked.get(t.target + ':' + t.property)));
  }
  for (const [property, keys] of Object.entries(carriers)) {
    a.tracks = a.tracks.filter((k) => k.target !== 'cup_carrier' || k.property !== property);
    a.tracks.push(track('cup_carrier', property, keys));
  }
}
const sequence = [
  ['ReachCoffee', 0, 1.6],
  ['PickUpCoffee', 1.6, 2.8],
  ['DrinkCoffee', 2.8, 4.8],
  ['PutDownCoffee', 4.8, 6.6],
  ['Happy', 6.6, 7.7],
  ['ReturnToIdle', 7.7, 9.2],
];
for (const [name, start, end] of sequence) {
  const tracks = [];
  for (const id of ['torso', 'head', 'armRight', 'cup_carrier'])
    for (const prop of ['x', 'y', 'rotation']) {
      const keys = [];
      for (let f = 0; f <= Math.round((end - start) * 60); f++) {
        const t = start + f / 60;
        const p = poseAt(t);
        keys.push([f / 60, p[id]?.[prop] ?? rest[id][prop], 'linear']);
      }
      tracks.push(track(id, prop, keys));
    }
  const closed = name === 'DrinkCoffee';
  for (const id of ['v2p27', 'v2p28', 'v2p29', 'v2p30'])
    tracks.push(track(id, 'opacity', [[0, closed ? 0 : 1]]));
  tracks.push(track('v2p37', 'opacity', [[0, closed ? 1 : 0]]));
  if (name === 'Happy') {
    tracks.push(
      track('v2p32', 'opacity', [[0, 0]]),
      track('v2p35', 'opacity', [[0, 1]]),
      track('v2p36', 'opacity', [[0, 1]]),
    );
  }
  animations.push(motion(name, end - start, tracks));
}
animations.push(
  motion(
    'Blink',
    0.25,
    ['eyesLeft', 'eyesRight'].map((id) =>
      track(id, 'scaleY', [
        [0, 1],
        [0.1, 0.05],
        [0.25, 1],
      ]),
    ),
  ),
  motion('LookAround', 3, [
    ...idleTracks
      .filter((t) => t.target.startsWith('eyes'))
      .map((t) => ({
        ...t,
        keyframes: t.keyframes.map((k) => ({ ...k, frame: Math.round((k.frame * 3) / 17.3) })),
      })),
  ]),
);
animations.push(
  { name: 'Atmosphere', fps: 60, duration: 3600, loop: 'loop', tracks: ambient },
  { name: 'Clock', fps: 60, duration: 2592000, loop: 'loop', tracks: clock },
  { name: 'Day', fps: 60, duration: 60, loop: 'loop', tracks: day },
  { name: 'Night', fps: 60, duration: 60, loop: 'loop', tracks: night },
);
const motionNames = animations
  .filter((a) => !['Atmosphere', 'Clock', 'Day', 'Night'].includes(a.name))
  .map((a) => a.name);
const transitions = [
  { from: 'entry', to: 'Idle' },
  { from: 'any', to: 'Wave', condition: { input: 'wave' }, duration: 180 },
  { from: 'any', to: 'ReachCoffee', condition: { input: 'coffee' }, duration: 0 },
  { from: 'any', to: 'Blink', condition: { input: 'blink' }, duration: 0 },
  { from: 'any', to: 'LookAround', condition: { input: 'look' }, duration: 150 },
  ...['Wave', 'Blink', 'LookAround'].map((n) => ({
    from: n,
    to: 'Idle',
    exitTimeMs: Math.round((animations.find((a) => a.name === n).duration / 60) * 1000),
    duration: 200,
  })),
  ...sequence.map(([n, a, b], i) => ({
    from: n,
    to: sequence[i + 1]?.[0] ?? 'Idle',
    exitTimeMs: Math.round((b - a) * 1000),
    duration: i === sequence.length - 1 ? 200 : 0,
  })),
];
const scene = {
  artboard: { name: 'CozyRoom', width: 1080, height: 1680 },
  groups,
  shapes,
  animations,
  stateMachine: {
    name: 'PandaStateMachine',
    inputs: [
      { name: 'coffee', type: 'trigger' },
      { name: 'wave', type: 'trigger' },
      { name: 'blink', type: 'trigger' },
      { name: 'look', type: 'trigger' },
      { name: 'night', type: 'number', value: 0 },
    ],
    layers: [
      {
        name: 'Panda',
        states: motionNames.map((name) => ({ name, animation: name })),
        transitions,
      },
      {
        name: 'Atmosphere',
        states: [{ name: 'Ambient', animation: 'Atmosphere' }],
        transitions: [{ from: 'entry', to: 'Ambient' }],
      },
      {
        name: 'Clock',
        states: [{ name: 'Ticking', animation: 'Clock' }],
        transitions: [{ from: 'entry', to: 'Ticking' }],
      },
      {
        name: 'Lighting',
        states: [
          { name: 'Day', animation: 'Day' },
          { name: 'Night', animation: 'Night' },
        ],
        transitions: [
          { from: 'entry', to: 'Day' },
          {
            from: 'any',
            to: 'Day',
            condition: { input: 'night', op: '==', value: 0 },
            duration: 900,
          },
          {
            from: 'any',
            to: 'Night',
            condition: { input: 'night', op: '==', value: 1 },
            duration: 900,
          },
        ],
      },
    ],
  },
};
await writeFile('src/features/cozy-room/assets/room.scene.json', JSON.stringify(scene));
await writeFile('src/features/cozy-room/assets/coffee-sequence.json', JSON.stringify(sequence));
await writeFile(
  '/tmp/haru-cozy-create.json',
  JSON.stringify({
    outPath: process.cwd() + '/public/mascot/cozy-room.riv',
    scene,
    previewTime: 0,
  }),
);
console.log(
  `Room ready: ${shapes.length} independent vectors, ${groups.length} joints/layers, one hand-parented cup, ${motionNames.length} character states.`,
);
