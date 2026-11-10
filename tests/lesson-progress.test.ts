import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptyLessonProgress,
  loadLessonProgress,
  saveLessonProgress,
  type LessonProgressRecord,
} from '../src/lib/lessonProgress';

const store = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
  },
}));
vi.mock('../src/lib/supabase', () => ({
  db: () => {
    throw new Error('Supabase not configured');
  },
}));

describe('lesson progress resume', () => {
  beforeEach(() => store.clear());

  it('restores stage, attempts, correct answers, and completion time on this device', async () => {
    const initial = emptyLessonProgress('lesson-1');
    const saved = {
      ...initial,
      currentStage: 'practice' as const,
      completedStages: [
        'introduction',
        'vocabulary',
        'expressions',
        'grammar',
      ] as LessonProgressRecord['completedStages'],
      attempts: { 'exercise-a': 2 },
      correctExercises: ['exercise-a'],
      updatedAt: '2026-11-05T10:00:00.000Z',
    };
    await saveLessonProgress(saved, null);
    await expect(loadLessonProgress('lesson-1', null)).resolves.toEqual(saved);
    await expect(loadLessonProgress('lesson-2', null)).resolves.toMatchObject({
      currentStage: 'introduction',
      completedStages: [],
      completedAt: null,
    });
  });

  it('keeps a lesson incomplete until the learner finishes quick practice', async () => {
    const progress = { ...emptyLessonProgress('lesson-1'), currentStage: 'practice' as const };
    await saveLessonProgress(progress, null);
    expect((await loadLessonProgress('lesson-1', null)).completedAt).toBeNull();
  });
});
