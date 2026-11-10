import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Lesson, Progress } from '../lib/types';
import { colors, Chip } from './ui';

export function LessonRow({ lesson, progress }: { lesson: Lesson; progress?: Progress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${lesson.level}${progress ? `, ${progress.status.replace('_', ' ')}` : ''}`}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 19,
        borderBottomWidth: 1,
        borderColor: colors.border,
        gap: 16,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          backgroundColor: progress?.status === 'completed' ? colors.sage : colors.ice,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {progress?.status === 'completed' ? (
          <Ionicons name="checkmark" size={22} color={colors.green} />
        ) : (
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.primary }}>
            {String(lesson.sort_order).padStart(2, '0')}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{lesson.title}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {lesson.korean_title} · {lesson.duration_minutes} min
        </Text>
      </View>
      <Chip label={lesson.level} />
    </Pressable>
  );
}
