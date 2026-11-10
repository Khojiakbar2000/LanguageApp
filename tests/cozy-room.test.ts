import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const scene = JSON.parse(readFileSync('src/features/cozy-room/assets/room.scene.json', 'utf8'));
const source = JSON.parse(readFileSync('src/panda_rive_assets/panda.import.json', 'utf8'));
type Joint = {
  id: string;
  parent?: string;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
};
type Key = { frame: number; value: number };
type Track = { target: string; property: string; keyframes: Key[] };
type Animation = { name: string; duration: number; tracks: Track[] };
const joints: Joint[] = scene.groups;
const animations: Animation[] = scene.animations;
function numberAt(a: Animation, id: string, property: string, frame: number, base: number) {
  const keys = a.tracks.find((t) => t.target === id && t.property === property)?.keyframes;
  if (!keys?.length) return base;
  const b = keys.findIndex((k) => k.frame >= frame);
  if (b <= 0) return keys[b < 0 ? keys.length - 1 : 0].value;
  const l = keys[b - 1],
    r = keys[b];
  return l.value + ((r.value - l.value) * (frame - l.frame)) / (r.frame - l.frame);
}
function world(a: Animation, id: string, frame: number): number[] {
  const g = joints.find((g) => g.id === id)!;
  const x = numberAt(a, id, 'x', frame, g.x),
    y = numberAt(a, id, 'y', frame, g.y),
    r = (numberAt(a, id, 'rotation', frame, g.rotation ?? 0) * Math.PI) / 180,
    sx = numberAt(a, id, 'scaleX', frame, g.scaleX ?? 1),
    sy = numberAt(a, id, 'scaleY', frame, g.scaleY ?? 1);
  const m = [Math.cos(r) * sx, Math.sin(r) * sx, -Math.sin(r) * sy, Math.cos(r) * sy, x, y];
  if (!g.parent) return m;
  const p = world(a, g.parent, frame);
  return [
    p[0] * m[0] + p[2] * m[1],
    p[1] * m[0] + p[3] * m[1],
    p[0] * m[2] + p[2] * m[3],
    p[1] * m[2] + p[3] * m[3],
    p[0] * m[4] + p[2] * m[5] + p[4],
    p[1] * m[4] + p[3] * m[5] + p[5],
  ];
}
describe('cozy-room animation invariants', () => {
  it('uses one real cup attached to the hand, with a separate stationary saucer', () => {
    expect(joints.find((g) => g.id === 'cup_carrier')?.parent).toBe('armRight');
    const cup = scene.shapes.filter((s: Joint) => s.parent === 'cup_carrier');
    expect(cup.length).toBeGreaterThan(3);
    expect(new Set(cup.map((s: Joint) => s.id)).size).toBe(cup.length);
    expect(scene.shapes.some((s: Joint) => s.id.includes('held_cup'))).toBe(false);
    for (const a of animations.filter((a) =>
      ['PickUpCoffee', 'DrinkCoffee', 'PutDownCoffee'].includes(a.name),
    ))
      for (const prop of ['x', 'y', 'rotation']) {
        const values = a.tracks
          .find((t) => t.target === 'cup_carrier' && t.property === prop)!
          .keyframes.map((k) => k.value);
        expect(Math.max(...values) - Math.min(...values)).toBeLessThan(0.000001);
      }
  });
  it('keeps the cup stationary through the reach and release, then returns to its exact table position', () => {
    for (const name of ['Idle', 'Wave', 'ReachCoffee', 'Happy', 'ReturnToIdle']) {
      const a = animations.find((a) => a.name === name)!;
      for (let f = 0; f <= a.duration; f++) {
        const m = world(a, 'cup_carrier', f);
        expect(m[4]).toBeCloseTo(560, 4);
        expect(m[5]).toBeCloseTo(1175, 4);
      }
    }
    const drink = animations.find((a) => a.name === 'DrinkCoffee')!;
    const m = world(drink, 'cup_carrier', 60);
    expect(m[4]).toBeCloseTo(425, 4);
    expect(m[5]).toBeCloseTo(1120, 4);
  });
  it('joins every coffee timeline without position or rotation discontinuities', () => {
    const names = [
      'ReachCoffee',
      'PickUpCoffee',
      'DrinkCoffee',
      'PutDownCoffee',
      'Happy',
      'ReturnToIdle',
    ];
    for (let i = 0; i < names.length - 1; i++) {
      const a = animations.find((a) => a.name === names[i])!,
        b = animations.find((a) => a.name === names[i + 1])!;
      for (const id of ['torso', 'head', 'armRight', 'cup_carrier'])
        for (const prop of ['x', 'y', 'rotation'])
          expect(numberAt(a, id, prop, a.duration, 0)).toBeCloseTo(numberAt(b, id, prop, 0, 0), 5);
    }
  });
  it('preserves original panda paints and separates lighting from character motion', () => {
    for (const s of source.shapes) {
      const rendered = scene.shapes.find((p: Joint) => p.id === s.id);
      expect(rendered.fill).toEqual(s.fill);
    }
    expect(
      scene.animations
        .flatMap((a: Animation) => a.tracks)
        .some((t: Track) => t.target.startsWith('v2p') && t.property === 'fillColor'),
    ).toBe(false);
    expect(scene.stateMachine.layers.map((l: { name: string }) => l.name)).toEqual([
      'Panda',
      'Atmosphere',
      'Clock',
      'Lighting',
    ]);
    expect(
      scene.shapes
        .filter((s: Joint) => s.id.startsWith('rain_'))
        .every((s: { clipBy?: string }) => s.clipBy === 'window_clip'),
    ).toBe(true);
  });
});
