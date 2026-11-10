import type { Lesson } from '../lib/types';
import { preConversationLessons } from './preConversationLessons';

export function withGuidedLessonContent(lessons: Lesson[]): Lesson[] {
  return lessons.map((lesson) => {
    const guided = preConversationLessons.find((candidate) => candidate.id === lesson.id);
    if (!guided) return lesson;
    return {
      ...lesson,
      title: guided.title,
      korean_title: guided.koreanTitle,
      category: guided.category,
      level: guided.level,
      duration_minutes: guided.durationMinutes,
      objectives: guided.objectives,
      expressions: guided.expressions.map(({ korean, english }) => ({ korean, english })),
      scenario: guided.scenario,
    };
  });
}
