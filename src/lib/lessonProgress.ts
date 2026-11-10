import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LessonStage } from '../content/preConversationLessons';
import { db } from './supabase';

export type LessonProgressRecord = {
  lessonId: string;
  currentStage: LessonStage;
  completedStages: LessonStage[];
  attempts: Record<string, number>;
  correctExercises: string[];
  completedAt: string | null;
  updatedAt: string;
};
const key = (userId: string | null) => `panda.lesson-progress.v1.${userId ?? 'guest'}`;
const stages: LessonStage[] = [
  'introduction',
  'vocabulary',
  'expressions',
  'grammar',
  'practice',
  'ready',
];
export const emptyLessonProgress = (lessonId: string): LessonProgressRecord => ({
  lessonId,
  currentStage: 'introduction',
  completedStages: [],
  attempts: {},
  correctExercises: [],
  completedAt: null,
  updatedAt: new Date().toISOString(),
});

export async function loadLessonProgress(lessonId: string, userId: string | null) {
  let records: Record<string, LessonProgressRecord> = {};
  try {
    records = JSON.parse((await AsyncStorage.getItem(key(userId))) ?? '{}');
  } catch {
    records = {};
  }
  let record = records[lessonId] ?? emptyLessonProgress(lessonId);
  let guestRecord: LessonProgressRecord | undefined;
  if (userId && !records[lessonId]) {
    try {
      const guests = JSON.parse((await AsyncStorage.getItem(key(null))) ?? '{}') as Record<
        string,
        LessonProgressRecord
      >;
      guestRecord = guests[lessonId];
      if (guestRecord) record = guestRecord;
    } catch {
      /* no guest draft to migrate */
    }
  }
  if (userId) {
    try {
      const { data } = await db()
        .from('lesson_progress')
        .select('stage_progress,exercise_attempts,completed_at,updated_at')
        .eq('lesson_id', lessonId)
        .maybeSingle();
      if (data) {
        const remote: LessonProgressRecord = {
          ...record,
          updatedAt: data.updated_at ?? record.updatedAt,
          completedStages: Array.isArray(data.stage_progress)
            ? (data.stage_progress.filter((s: string) =>
                stages.includes(s as LessonStage),
              ) as LessonStage[])
            : record.completedStages,
          attempts: data.exercise_attempts?.attempts ?? record.attempts,
          correctExercises: data.exercise_attempts?.correct ?? record.correctExercises,
          completedAt: data.completed_at ?? record.completedAt,
        };
        if (Date.parse(remote.updatedAt) >= Date.parse(record.updatedAt) || remote.completedAt)
          record = remote;
      }
    } catch {
      /* local resume remains available when offline */
    }
    if (guestRecord && records[lessonId] === undefined) {
      try {
        await saveLessonProgress(record, userId);
      } catch {
        /* the guest draft is still retained locally */
      }
    }
  }
  return record;
}

export async function saveLessonProgress(record: LessonProgressRecord, userId: string | null) {
  const storageKey = key(userId);
  let records: Record<string, LessonProgressRecord> = {};
  try {
    records = JSON.parse((await AsyncStorage.getItem(storageKey)) ?? '{}');
  } catch {
    records = {};
  }
  records[record.lessonId] = record;
  await AsyncStorage.setItem(storageKey, JSON.stringify(records));
  if (userId) {
    const { error } = await db()
      .from('lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: record.lessonId,
          status: record.completedAt ? 'completed' : 'in_progress',
          stage_progress: record.completedStages,
          exercise_attempts: { attempts: record.attempts, correct: record.correctExercises },
          completed_at: record.completedAt,
          updated_at: record.updatedAt,
        },
        { onConflict: 'user_id,lesson_id' },
      );
    if (error)
      throw new Error('Saved on this device. Could not sync lesson progress to your account.');
  }
}
