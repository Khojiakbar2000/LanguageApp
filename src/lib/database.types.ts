type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type LessonRow = {
  id: string;
  title: string;
  korean_title: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration_minutes: number;
  objectives: string[];
  expressions: { korean: string; english: string }[];
  scenario: string;
  sort_order: number;
  lesson_context: Record<string, unknown>;
};
type ProfileRow = {
  id: string;
  display_name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  goal: 'Daily Conversation' | 'Study in Korea' | 'Work in Korea' | 'TOPIK';
  created_at: string;
  learning_goal: 'everyday' | 'confident' | 'advanced' | null;
  starting_level:
    'complete_beginner' | 'some_expressions' | 'basic_conversations' | 'intermediate' | null;
  daily_goal_minutes: number | null;
  onboarding_completed_at: string | null;
  panda_outfit: 'purple' | 'blue' | 'pink' | 'original';
  panda_accessory: 'headphones' | 'glasses' | 'hat' | 'none';
  daily_reminders_enabled: boolean;
  daily_reminder_hour: number;
};
type ProgressRow = {
  user_id: string;
  lesson_id: string;
  status: 'in_progress' | 'completed';
  completed_count: number;
  stage_progress: string[];
  exercise_attempts: { attempts: Record<string, number>; correct: string[] };
  completed_at: string | null;
  updated_at: string;
};
type ExpressionRow = {
  id: string;
  user_id: string;
  korean: string;
  english: string;
  note: string;
  learned: boolean;
  created_at: string;
};
type CorrectionRow = {
  id: string;
  conversation_id: string;
  message_id: string;
  user_id: string;
  original: string;
  corrected: string;
  explanation: string;
  category: 'grammar' | 'vocabulary' | 'register';
  created_at: string;
};
type ConversationRow = {
  id: string;
  user_id: string;
  lesson_id: string | null;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  status: 'active' | 'completed';
  created_at: string;
  completed_at: string | null;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  translation: string | null;
  turn_request_id: string;
  audio_path: string | null;
  sequence: number;
  created_at: string;
};
type StatsRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_turns: number;
  daily_turns: number;
  completed_sessions: number;
  practice_seconds: number;
  last_practice_date: string | null;
  last_qualifying_date: string | null;
  streak_freezes_available: number;
  timezone: string;
  total_xp: number;
  streak_updated_at: string;
  streak_started_at: string;
  legacy_current_streak: number | null;
};
export type StreakSummary = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualifying_date: string | null;
  streak_freezes_available: number;
  timezone: string;
  total_xp: number;
  today: string;
  week: {
    date: string;
    status: 'practice' | 'protected' | 'missed';
    activity_count: number;
    xp: number;
  }[];
  total_practice_days: number;
  next_milestone: number | null;
};

export interface Database {
  public: {
    Tables: {
      lessons: Table<
        LessonRow,
        Omit<LessonRow, 'lesson_context'> & { lesson_context?: Record<string, unknown> }
      >;
      profiles: Table<ProfileRow>;
      lesson_progress: Table<ProgressRow>;
      saved_expressions: Table<ExpressionRow>;
      corrections: Table<CorrectionRow>;
      conversations: Table<ConversationRow>;
      messages: Table<MessageRow>;
      learning_stats: Table<StatsRow>;
      daily_learning_activity: Table<{
        user_id: string;
        learning_date: string;
        qualifying_activity_count: number;
        total_xp: number;
        total_practice_seconds: number;
        day_status: 'practice' | 'protected' | 'missed';
        created_at: string;
        updated_at: string;
      }>;
      learning_events: Table<{
        id: string;
        user_id: string;
        activity_type: 'lesson' | 'guided_mission' | 'conversation' | 'vocabulary_review';
        source_activity_id: string;
        learning_date: string;
        occurred_at: string;
        xp_awarded: number;
        qualifies_for_streak: boolean;
      }>;
      streak_freeze_transactions: Table<{
        id: string;
        user_id: string;
        transaction_type: 'grant' | 'consume';
        learning_date: string;
        amount: number;
        reason: string;
        created_at: string;
      }>;
      streak_milestones: Table<{
        user_id: string;
        milestone_days: number;
        achieved_at: string;
        reward_xp: number;
      }>;
      vocabulary_entries: Table<{
        id: string;
        source_entry_id: string;
        word: string;
        pronunciation: string | null;
        part_of_speech: string | null;
        dictionary_grade: string | null;
        difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'unclassified';
        origin: string | null;
        source_url: string | null;
        source: string;
        source_categories: unknown;
        attribution: string;
        created_at: string;
        updated_at: string;
      }>;
      vocabulary_meanings: Table<{
        id: string;
        vocabulary_id: string;
        language: string;
        definition: string;
        translation: string | null;
        translation_language: string;
        sense_order: number;
      }>;
      vocabulary_examples: Table<{
        id: string;
        vocabulary_id: string;
        meaning_id: string | null;
        korean_sentence: string;
        english_translation: string | null;
        source: string;
        source_example_order: number;
      }>;
      vocabulary_topics: Table<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
      }>;
      vocabulary_topic_entries: Table<{ vocabulary_id: string; topic_id: string }>;
      lesson_vocabulary: Table<{
        lesson_id: string;
        vocabulary_id: string;
        target_order: number;
        source: string;
      }>;
      user_vocabulary_progress: Table<{
        user_id: string;
        vocabulary_id: string;
        familiarity: number;
        saved_at: string | null;
        correct_count: number;
        incorrect_count: number;
        last_reviewed_at: string | null;
        next_review_at: string | null;
        mastered_at: string | null;
      }>;
      vocabulary_review_sessions: Table<{
        id: string;
        user_id: string;
        started_at: string;
        completed_at: string | null;
        answer_count: number;
      }>;
      vocabulary_review_answers: Table<{
        id: string;
        session_id: string;
        user_id: string;
        vocabulary_id: string;
        correct: boolean;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      complete_conversation: {
        Args: { p_conversation_id: string };
        Returns: Record<string, unknown>;
      };
      get_streak_summary: { Args: Record<string, never>; Returns: StreakSummary };
      set_streak_timezone: { Args: { p_timezone: string }; Returns: undefined };
      start_vocabulary_review_session: { Args: Record<string, never>; Returns: string };
      save_vocabulary: {
        Args: { p_vocabulary_id: string; p_saved: boolean };
        Returns: string | null;
      };
      get_vocabulary_progress_summary: {
        Args: Record<string, never>;
        Returns: Record<string, { learned: number; mastered: number }>;
      };
      search_vocabulary: {
        Args: {
          p_query?: string | null;
          p_level?: string | null;
          p_topic_id?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          word: string;
          pronunciation: string | null;
          part_of_speech: string | null;
          difficulty_level: string;
          definition: string | null;
          translation: string | null;
        }[];
      };
      get_vocabulary_context: {
        Args: { p_user_id: string; p_lesson_id: string | null; p_level: string; p_limit?: number };
        Returns: unknown;
      };
      record_vocabulary_review_answer: {
        Args: {
          p_answer_id: string;
          p_session_id: string;
          p_vocabulary_id: string;
          p_correct: boolean;
        };
        Returns: Database['public']['Tables']['user_vocabulary_progress']['Row'];
      };
      complete_vocabulary_review_session: { Args: { p_session_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
