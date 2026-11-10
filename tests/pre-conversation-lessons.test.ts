import { describe, expect, it } from 'vitest';
import { preConversationLessons } from '../src/content/preConversationLessons';

describe('pre-conversation curriculum', () => {
  it('contains the five requested beginner lessons with valid conversation context', () => {
    expect(preConversationLessons.map((lesson) => lesson.title)).toEqual([
      'Meeting Someone',
      'Ordering Coffee',
      'Talking About Yourself',
      'Talking About Food',
      'Making Plans',
    ]);
    for (const lesson of preConversationLessons) {
      expect(lesson.vocabulary.length).toBeGreaterThanOrEqual(4);
      expect(lesson.vocabulary.length).toBeLessThanOrEqual(6);
      expect(lesson.expressions.length).toBeGreaterThanOrEqual(2);
      expect(lesson.exercises).toHaveLength(2);
      expect(lesson.completionRequirements).toContain('practice');
      expect(lesson.scenario).toBeTruthy();
      expect(lesson.objective).toBeTruthy();
    }
  });

  it('has a valid expected answer for every exercise', () => {
    for (const lesson of preConversationLessons) {
      for (const exercise of lesson.exercises) {
        expect(exercise.answer.length, `${lesson.title}: ${exercise.id}`).toBeGreaterThan(0);
        if (exercise.type === 'choice') expect(exercise.options).toContain(exercise.answer);
        if (exercise.type === 'arrange') {
          const normalize = (value: string) => value.replace(/[.?!。？！]$/u, '');
          expect(exercise.words.map(normalize).sort()).toEqual(
            exercise.answer
              .replace(/[.?!。？！]$/u, '')
              .split(' ')
              .sort(),
          );
        }
        expect(exercise.hint.length).toBeGreaterThan(0);
      }
    }
  });

  it('uses the existing database lesson IDs for conversation handoff', () => {
    expect(preConversationLessons.map((lesson) => lesson.id)).toEqual(
      Array.from(
        { length: 5 },
        (_, index) => `a1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      ),
    );
  });
});
