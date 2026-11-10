export type VocabularyLevel = 'beginner' | 'intermediate' | 'advanced' | 'unclassified';

/** Transparent review intervals. A correct answer advances one familiarity step; a miss
 * moves back one step and schedules a short retry. Five correct steps count as mastered. */
export function nextVocabularyReview(
  familiarity: number,
  correct: boolean,
  now = new Date(),
) {
  const level = Math.max(0, Math.min(5, Math.trunc(familiarity)));
  const next = correct ? Math.min(5, level + 1) : Math.max(0, level - 1);
  const minutes = correct ? [1440, 4320, 10080, 20160, 43200][next - 1] : 10;
  return {
    familiarity: next,
    nextReviewAt: new Date(now.getTime() + minutes * 60_000).toISOString(),
    mastered: correct && next === 5,
  };
}

export function dictionaryGradeToLevel(grade: string | null | undefined): VocabularyLevel {
  switch (grade?.trim().toLowerCase()) {
    case '초급': case 'beginner': case 'level1': return 'beginner';
    case '중급': case 'intermediate': case 'level2': return 'intermediate';
    case '고급': case 'advanced': case 'level3': return 'advanced';
    default: return 'unclassified';
  }
}

export function sentenceCloze(sentence: string, word: string): string | null {
  const at = sentence.indexOf(word);
  return at < 0 ? null : `${sentence.slice(0, at)}＿＿＿${sentence.slice(at + word.length)}`;
}

export function vocabularyLoadError(error: unknown): string {
  const detail = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : null;
  const code = typeof detail?.code === 'string' ? detail.code : '';
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01')
    return 'The vocabulary database migration has not been applied to this Supabase project. Apply supabase/migrations/202611070001_vocabulary.sql, then reload.';
  if (code === '42501') return 'Supabase denied access to vocabulary data. Check the vocabulary table grants and row-level security policies.';
  if (error instanceof Error) return error.message;
  if (typeof detail?.message === 'string') return detail.message;
  return 'Vocabulary could not be loaded. Check your connection and try again.';
}
