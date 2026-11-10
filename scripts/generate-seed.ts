import { writeFileSync } from 'node:fs';
import { lessons } from '../src/content/lessons';
const quote = (v: unknown) =>
  `'${String(typeof v === 'object' ? JSON.stringify(v) : v).replaceAll("'", "''")}'`;
const rows = lessons.map(
  (l) =>
    `(${[l.id, l.title, l.korean_title, l.category, l.level, l.duration_minutes, l.objectives, l.expressions, l.scenario, l.sort_order].map(quote).join(',')})`,
);
writeFileSync(
  'supabase/seed.sql',
  `-- Generated from src/content/lessons.ts. Original Haru curriculum.\ninsert into public.lessons (id,title,korean_title,category,level,duration_minutes,objectives,expressions,scenario,sort_order) values\n${rows.join(',\n')}\non conflict(id) do update set title=excluded.title,korean_title=excluded.korean_title,category=excluded.category,level=excluded.level,duration_minutes=excluded.duration_minutes,objectives=excluded.objectives,expressions=excluded.expressions,scenario=excluded.scenario,sort_order=excluded.sort_order;\n`,
);
console.log(`Generated ${lessons.length} original lessons.`);
