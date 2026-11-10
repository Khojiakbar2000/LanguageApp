import { memo, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import data from './assets/room-fallback.json';
import type { RoomRendererProps, RoomControls } from './types';
import sequence from './assets/coffee-sequence.json';

type Key = { frame: number; value: number; easing?: string };
type Track = { target: string; property: string; keyframes: Key[] };
type Joint = {
  id: string;
  parent?: string;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
};
type Paint = {
  color?: string;
  gradient?: {
    type: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    stops: { color: string; position?: number }[];
  };
};
type Vector = Joint & {
  type: string;
  d?: string;
  width?: number;
  height?: number;
  cornerRadius?: number;
  fill?: Paint;
  stroke?: Paint & { thickness?: number; cap?: string; join?: string };
  clipBy?: string;
};
type Batch = { key: string; parent?: string; shapes: Vector[] };
type Animation = { name: string; duration: number; tracks: Track[] };
const scene = data as unknown as { groups: Joint[]; animations: Animation[]; batches: Batch[] };
const joints = Object.fromEntries(scene.groups.map((g) => [g.id, g]));
const animations = Object.fromEntries(
  scene.animations.map((a) => [
    a.name,
    Object.fromEntries(a.tracks.map((t) => [t.target + ':' + t.property, t.keyframes])),
  ]),
);
const AnimatedG = Animated.createAnimatedComponent(G);
const isWeb = Platform.OS === 'web';
function color(value: string) {
  if (value.length !== 9) return value;
  return `rgba(${parseInt(value.slice(3, 5), 16)},${parseInt(value.slice(5, 7), 16)},${parseInt(value.slice(7, 9), 16)},${parseInt(value.slice(1, 3), 16) / 255})`;
}
function sample(keys: Key[] | undefined, frame: number, base: number) {
  'worklet';
  if (!keys?.length) return base;
  if (frame <= keys[0].frame) return keys[0].value;
  if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;
  let lo = 0,
    hi = keys.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid].frame <= frame) lo = mid;
    else hi = mid;
  }
  const a = keys[lo],
    b = keys[hi];
  let t = (frame - a.frame) / (b.frame - a.frame);
  if (b.easing !== 'linear') t = t * t * (3 - 2 * t);
  return a.value + (b.value - a.value) * t;
}
function multiply(a: number[], b: number[]) {
  'worklet';
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
function activeMotion(kind: number, time: number, elapsed: number) {
  'worklet';
  if (kind === 1) return { name: 'Wave', frame: Math.min(time * 60, 168) };
  if (kind === 2)
    for (const step of sequence) {
      const start = step[1] as number,
        end = step[2] as number;
      if (time <= end) return { name: step[0] as string, frame: Math.max(0, time - start) * 60 };
    }
  return { name: 'Idle', frame: (elapsed % 17.3) * 60 };
}
function value(
  id: string,
  prop: string,
  base: number,
  motion: { name: string; frame: number },
  elapsed: number,
  night: number,
) {
  'worklet';
  const key = id + ':' + prop;
  const d = animations.Day?.[key],
    n = animations.Night?.[key];
  if (d && n) return sample(d, 0, base) * (1 - night) + sample(n, 0, base) * night;
  if (animations.Atmosphere?.[key])
    return sample(animations.Atmosphere[key], (elapsed % 60) * 60, base);
  if (animations.Clock?.[key]) return sample(animations.Clock[key], (elapsed % 43200) * 60, base);
  return sample(animations[motion.name]?.[key], motion.frame, base);
}
function chain(parent: string | undefined): Joint[] {
  const result: Joint[] = [];
  let p = parent;
  while (p) {
    const joint = joints[p];
    result.unshift(joint);
    p = joint.parent;
  }
  return result;
}
const VectorItem = memo(function VectorItem({
  shape,
  dynamicOpacity = false,
}: {
  shape: Vector;
  dynamicOpacity?: boolean;
}) {
  const paint = (p: Paint | undefined, suffix: string) =>
    p?.gradient ? `url(#${shape.id}-${suffix})` : p?.color ? color(p.color) : 'none';
  const props = {
    fill: paint(shape.fill, 'fill'),
    stroke: paint(shape.stroke, 'stroke'),
    strokeWidth: shape.stroke?.thickness ?? 0,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <G
      transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotation ?? 0}) scale(${shape.scaleX ?? 1} ${shape.scaleY ?? 1})`}
      opacity={dynamicOpacity ? 1 : (shape.opacity ?? 1)}
    >
      {shape.type === 'ellipse' ? (
        <Ellipse rx={(shape.width ?? 0) / 2} ry={(shape.height ?? 0) / 2} {...props} />
      ) : shape.type === 'rect' ? (
        <Rect
          x={-(shape.width ?? 0) / 2}
          y={-(shape.height ?? 0) / 2}
          width={shape.width}
          height={shape.height}
          rx={shape.cornerRadius ?? 0}
          {...props}
        />
      ) : (
        <Path d={shape.d} {...props} />
      )}
    </G>
  );
});
const VectorBatch = memo(function VectorBatch({
  batch,
  controls,
  elapsed,
}: {
  batch: Batch;
  controls: RoomControls;
  elapsed: ReturnType<typeof useSharedValue<number>>;
}) {
  const ancestry = useMemo(() => chain(batch.parent), [batch.parent]);
  const own = batch.shapes.length === 1 ? batch.shapes[0] : null;
  const animatedProps = useAnimatedProps<{
    transform?: string;
    matrix?: number[];
    opacity: number;
  }>(() => {
    const clock = controls.reduced ? 0 : elapsed.value;
    const motion = activeMotion(controls.action.value, controls.actionTime.value, clock);
    const mode = controls.nightProgress.value;
    let m = [1, 0, 0, 1, 0, 0],
      opacity = 1;
    for (const g of ancestry) {
      const x = value(g.id, 'x', g.x, motion, clock, mode),
        y = value(g.id, 'y', g.y, motion, clock, mode);
      const r = (value(g.id, 'rotation', g.rotation ?? 0, motion, clock, mode) * Math.PI) / 180;
      const sx = value(g.id, 'scaleX', g.scaleX ?? 1, motion, clock, mode),
        sy = value(g.id, 'scaleY', g.scaleY ?? 1, motion, clock, mode);
      opacity *= value(g.id, 'opacity', g.opacity ?? 1, motion, clock, mode);
      m = multiply(m, [
        Math.cos(r) * sx,
        Math.sin(r) * sx,
        -Math.sin(r) * sy,
        Math.cos(r) * sy,
        x,
        y,
      ]);
    }
    if (own) opacity *= value(own.id, 'opacity', own.opacity ?? 1, motion, clock, mode);
    return isWeb ? { transform: `matrix(${m.join(' ')})`, opacity } : { matrix: m, opacity };
  });
  const content = (
    <AnimatedG animatedProps={animatedProps}>
      {batch.shapes.map((s) => (
        <VectorItem key={s.id} shape={s} dynamicOpacity={!!own} />
      ))}
    </AnimatedG>
  );
  return batch.shapes[0].clipBy ? <G clipPath="url(#room-window-clip)">{content}</G> : content;
});
export function RoomVectorFallback({ width, height, controls }: RoomRendererProps) {
  const elapsed = useSharedValue(0);
  const frameLoop = useFrameCallback((frame) => {
    elapsed.set(elapsed.get() + (frame.timeSincePreviousFrame ?? 0) / 1000);
  }, false);
  useEffect(() => {
    frameLoop.setActive(controls.active && !controls.reduced);
    return () => frameLoop.setActive(false);
  }, [frameLoop, controls.active, controls.reduced]);
  const gradients = useMemo(
    () =>
      scene.batches
        .flatMap((b) => b.shapes)
        .flatMap((s) =>
          ['fill', 'stroke'].flatMap((kind) => {
            const p = kind === 'fill' ? s.fill : s.stroke;
            const g = p?.gradient;
            if (!g) return [];
            const id = s.id + '-' + kind;
            const stops = g.stops.map((stop, i) => (
              <Stop
                key={i}
                offset={stop.position ?? i / (g.stops.length - 1)}
                stopColor={color(stop.color)}
              />
            ));
            return [
              g.type === 'radial' ? (
                <RadialGradient
                  key={id}
                  id={id}
                  gradientUnits="userSpaceOnUse"
                  cx={g.start.x}
                  cy={g.start.y}
                  rx={Math.abs(g.end.x - g.start.x) || 60}
                  ry={Math.abs(g.end.x - g.start.x) || 60}
                >
                  {stops}
                </RadialGradient>
              ) : (
                <LinearGradient
                  key={id}
                  id={id}
                  gradientUnits="userSpaceOnUse"
                  x1={g.start.x}
                  y1={g.start.y}
                  x2={g.end.x}
                  y2={g.end.y}
                >
                  {stops}
                </LinearGradient>
              ),
            ];
          }),
        ),
    [],
  );
  return (
    <Svg
      testID="room-native-vectors"
      width={width}
      height={height}
      viewBox="0 0 1080 1680"
      pointerEvents="none"
    >
      <Defs>
        {gradients}
        <ClipPath id="room-window-clip">
          <Rect x={165} y={135} width={750} height={620} />
        </ClipPath>
      </Defs>
      {scene.batches.map((batch) => (
        <VectorBatch key={batch.key} batch={batch} controls={controls} elapsed={elapsed} />
      ))}
    </Svg>
  );
}
