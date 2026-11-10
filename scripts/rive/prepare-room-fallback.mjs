import { readFile, writeFile } from 'node:fs/promises';
const scene = JSON.parse(await readFile('src/features/cozy-room/assets/room.scene.json', 'utf8'));
const pt = (v, which) => {
  const c = v.cubic;
  if (!c) return [v.x, v.y];
  const distance = c[`${which}Distance`] ?? c.distance ?? 0;
  const angle =
    ((c[`${which}Rotation`] ?? (c.rotation ?? 0) + (which === 'in' ? 180 : 0)) * Math.PI) / 180;
  return [v.x + Math.cos(angle) * distance, v.y + Math.sin(angle) * distance];
};
const pathFor = (s) => {
  const paths = s.subpaths ?? [{ points: s.points, closed: s.closed !== false }];
  return paths
    .map((p) => {
      const v = p.points;
      if (!v?.length) return '';
      let d = `M${v[0].x} ${v[0].y}`;
      const count = p.closed ? v.length : v.length - 1;
      for (let i = 0; i < count; i++) {
        const a = v[i],
          b = v[(i + 1) % v.length];
        const x = pt(a, 'out'),
          y = pt(b, 'in');
        d += ` C${x[0]} ${x[1]} ${y[0]} ${y[1]} ${b.x} ${b.y}`;
      }
      return d + (p.closed ? ' Z' : '');
    })
    .join(' ');
};
const shapes = scene.shapes.map((s) => ({
  ...s,
  ...(s.type === 'polygon' ? { d: pathFor(s) } : {}),
}));
const batches = [];
for (const shape of shapes) {
  const prev = batches.at(-1);
  const animatedOpacity = scene.animations.some((a) => a.tracks.some((t) => t.target === shape.id));
  const key = shape.parent + (animatedOpacity ? shape.id : '');
  if (prev?.key === key) prev.shapes.push(shape);
  else batches.push({ key, parent: shape.parent, shapes: [shape] });
}
for (const [index, batch] of batches.entries()) batch.key += `-${index}`;
await writeFile(
  'src/features/cozy-room/assets/room-fallback.json',
  JSON.stringify({ ...scene, shapes: undefined, batches }),
);
console.log(
  `Prepared ${batches.length} independently animated vector batches for native SVG fallback.`,
);
