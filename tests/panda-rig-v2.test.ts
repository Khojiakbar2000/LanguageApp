import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const scene = json('src/panda_rive_assets/panda.scene.json');
const source = json('src/panda_rive_assets/panda.import.json');
const manifest = json('src/panda_rive_assets/panda-v2.manifest.json');
type Group = { id: string; parent?: string; x: number; y: number };
type Shape = Group & { subpaths?: unknown; fill?: unknown; stroke?: unknown; opacity?: number };
type Track = { target: string; property: string; keyframes: { value?: number }[] };
type Animation = { name: string; tracks: Track[] };
const groups: Group[] = scene.groups;
const shapes: Shape[] = scene.shapes;
const animations: Animation[] = scene.animations;
function world(id: string): [number, number] {
  const group = groups.find((g) => g.id === id)!;
  const origin = group.parent ? world(group.parent) : [0, 0];
  return [origin[0] + group.x, origin[1] + group.y];
}

describe('supplied V2 vector rig', () => {
  it('preserves all 38 source shapes and neutral world geometry with only 100px framing clearance', () => {
    expect(manifest.groups).toHaveLength(22);
    expect(source.shapes).toHaveLength(38);
    for (const original of source.shapes as Shape[]) {
      const shape = shapes.find((s) => s.id === original.id)!;
      const origin = world(shape.parent!);
      expect(shape.x + origin[0]).toBeCloseTo(original.x);
      expect(shape.y + origin[1]).toBeCloseTo(original.y + 100);
      expect(shape.subpaths).toEqual(original.subpaths);
      expect(shape.stroke).toEqual(original.stroke);
      if (
        original.fill?.constructor === Object &&
        ![2, 25, 26, 32, 36, 37].includes(Number(original.id.slice(3)))
      )
        expect(shape.fill).toEqual(original.fill);
    }
  });
  it('keeps expression variants hidden at rest and uses supplied expressions while speaking and celebrating', () => {
    for (const id of ['v2p33', 'v2p34', 'v2p35', 'v2p36', 'v2p37'])
      expect(shapes.find((s) => s.id === id)?.opacity).toBe(0);
    for (const [name, mouth] of [
      ['speaking', 'v2p33'],
      ['happy', 'v2p35'],
      ['celebrating', 'v2p35'],
    ])
      expect(
        animations
          .find((a) => a.name === name)
          ?.tracks.find((t) => t.target === mouth && t.property === 'opacity')?.keyframes[0].value,
      ).toBe(1);
  });
  it('never recolors either original paw and moves both hands outward during celebration', () => {
    for (const a of animations)
      expect(
        a.tracks.some((t) => ['v2p15', 'v2p16'].includes(t.target) && t.property === 'fillColor'),
      ).toBe(false);
    const party = animations.find((a) => a.name === 'celebrating')!;
    for (const [arm, direction] of [
      ['armLeft', -1],
      ['armRight', 1],
    ] as const) {
      const track = party.tracks.find((t) => t.target === arm && t.property === 'x')!;
      expect(
        track.keyframes.some((k) => (k.value! - track.keyframes[0].value!) * direction > 70),
      ).toBe(true);
    }
    // No animation, legacy appearance input or accessory can recolor the fur.
    expect(animations.flatMap((a) => a.tracks).some((t) => t.property === 'fillColor')).toBe(false);
    expect(
      shapes
        .filter((s) => s.id.startsWith('wear'))
        .every((s) => ['neck_accessory_slot', 'head_accessory_slot'].includes(s.parent!)),
    ).toBe(true);
  });
  it('exposes all requested states and retains separate head and body attachment slots', () => {
    for (const name of ['idle', 'listening', 'speaking', 'thinking', 'happy', 'celebrating']) {
      expect(scene.stateMachine.inputs).toContainEqual({ name, type: 'trigger' });
      const a = animations.find((a) => a.name === name)!;
      for (const ear of ['ear_left', 'ear_right'])
        expect(
          a.tracks.some(
            (t) =>
              t.target === ear &&
              t.property === 'rotation' &&
              t.keyframes.some((k) => k.value !== 0),
          ),
        ).toBe(true);
    }
    expect(groups.find((g) => g.id === 'head_accessory_slot')?.parent).toBe('head');
    expect(groups.find((g) => g.id === 'outfit_slot')?.parent).toBe('torso');
    expect(scene.stateMachine.inputs).toContainEqual({ name: 'outfit', type: 'number', value: 3 });
    expect(scene.stateMachine.inputs).toContainEqual({
      name: 'accessory',
      type: 'number',
      value: 3,
    });
  });
});
