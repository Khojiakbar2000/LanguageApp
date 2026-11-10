import type { LearningDream, StartingPoint, DailyMinutes } from './koreanFuture';
import type { PandaAppearance } from './panda';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type Goal = 'Daily Conversation' | 'Study in Korea' | 'Work in Korea' | 'TOPIK';
export type TutorState =
  'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'encouraging' | 'celebrating';
export interface Expression {
  korean: string;
  english: string;
}
export interface Lesson {
  id: string;
  title: string;
  korean_title: string;
  category: string;
  level: Level;
  duration_minutes: number;
  objectives: string[];
  expressions: Expression[];
  scenario: string;
  sort_order: number;
}
export interface Profile {
  panda_outfit?: PandaAppearance['outfit'] | null;
  panda_accessory?: PandaAppearance['accessory'] | null;
  daily_reminders_enabled?: boolean;
  daily_reminder_hour?: number;
  learning_goal?: LearningDream | null;
  starting_level?: StartingPoint | null;
  daily_goal_minutes?: DailyMinutes | null;
  onboarding_completed_at?: string | null;
  id: string;
  display_name: string;
  level: Level;
  goal: Goal;
  created_at: string;
}
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  translation: string | null;
  created_at: string;
}
export interface Correction {
  id: string;
  conversation_id: string;
  message_id: string;
  original: string;
  corrected: string;
  explanation: string;
  category: string;
  created_at: string;
}
export interface SavedExpression extends Expression {
  id: string;
  user_id: string;
  note: string;
  learned: boolean;
  created_at: string;
}
export interface Progress {
  lesson_id: string;
  status: 'in_progress' | 'completed';
  completed_count: number;
  updated_at: string;
}
export interface LearningStats {
  current_streak: number;
  longest_streak: number;
  total_turns: number;
  completed_sessions: number;
  practice_seconds: number;
  last_practice_date: string | null;
  daily_turns: number;
  timezone?: string;
  streak_started_at?: string;
}
export interface Conversation {
  id: string;
  lesson_id: string | null;
  title: string;
  status: 'active' | 'completed';
  created_at: string;
}
export interface TurnResult {
  message: Message;
  learnerMessage: Message | null;
  corrections: Correction[];
  encouragement: string;
}
export const levels: Level[] = ['Beginner', 'Intermediate', 'Advanced'];
export const goals: Goal[] = ['Daily Conversation', 'Study in Korea', 'Work in Korea', 'TOPIK'];
