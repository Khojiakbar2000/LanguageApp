import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import {
  Body,
  Button,
  Card,
  CatalogNotice,
  colors,
  ErrorNotice,
  Eyebrow,
  Heading,
  Row,
  Screen,
} from '../../components/ui';
import { CozyRoomScene } from './CozyRoomScene';
import { LessonRow } from '../../components/LessonRow';
import { useApp, usePreferences } from '../../state/store';
import { activeStreak, todayTurns } from '../../lib/learning';
import { configured } from '../../lib/supabase';
import { StreakIndicator } from '../../components/StreakIndicator';
export function CozyRoomScreen() {
  const app = useApp();
  const prefs = usePreferences();
  const level = app.profile?.level ?? prefs.level;
  const active = app.history.find((c) => c.status === 'active' && c.lesson_id);
  const next =
    app.lessons.find((l) => l.id === active?.lesson_id) ??
    app.lessons.find(
      (l) =>
        l.level === level &&
        !app.progress.some((p) => p.lesson_id === l.id && p.status === 'completed'),
    ) ??
    app.lessons[0];
  const turns = todayTurns(app.stats);
  const streak = app.streak?.current_streak ?? activeStreak(app.stats);
  return (
    <Screen
      bottom={false}
      refreshing={app.loading}
      onRefresh={() => {
        void app.refresh();
        void app.loadCatalog();
      }}
    >
      <Row>
        <View style={{ gap: 3 }}>
          <Text
            style={{ fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: -1 }}
          >
            haru <Text style={{ fontSize: 14, fontWeight: '400', color: colors.muted }}>하루</Text>
          </Text>
          {app.profile && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              안녕하세요, {app.profile.display_name}.
            </Text>
          )}
        </View>
        <StreakIndicator streak={streak} onPress={() => router.push('/streaks')} />
      </Row>
      <CozyRoomScene
        onOpenBook={() => (next ? router.push(`/lesson/${next.id}`) : router.push('/lessons'))}
      />
      <CatalogNotice
        message={app.catalogError}
        onRetry={() => {
          void app.refresh();
          void app.loadCatalog();
        }}
      />
      <ErrorNotice
        message={app.error}
        onRetry={() => {
          void app.refresh();
          void app.loadCatalog();
        }}
      />
      <Card style={{ backgroundColor: colors.ice, borderWidth: 0 }}>
        <Row>
          <View style={{ flex: 1, gap: 8 }}>
            <Eyebrow>Your next conversation</Eyebrow>
            <Heading small>{next.title}</Heading>
            <Body muted>{next.duration_minutes} gentle minutes with Dori</Body>
          </View>
        </Row>
        <Button
          title={active ? 'Resume conversation' : 'Continue learning'}
          icon="arrow-forward"
          onPress={() =>
            active
              ? router.push({
                  pathname: '/conversation/[id]',
                  params: { id: active.id, lessonId: active.lesson_id ?? undefined },
                })
              : router.push(`/lesson/${next.id}`)
          }
        />
      </Card>
      {!configured && (
        <Card style={{ backgroundColor: colors.sage }}>
          <Body>Explore the lessons. Connect Supabase when you’re ready for live practice.</Body>
          <Button title="Setup instructions" secondary onPress={() => router.push('/setup')} />
        </Card>
      )}
      <View style={{ gap: 12 }}>
        <Row>
          <Heading small>Your daily moment</Heading>
          <Text style={{ color: colors.muted }}>{Math.min(turns, 3)} / 3 replies</Text>
        </Row>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 3, now: Math.min(turns, 3) }}
          style={{ height: 8, borderRadius: 8, backgroundColor: colors.border }}
        >
          <View
            style={{
              width: `${Math.min(turns / 3, 1) * 100}%`,
              height: 8,
              borderRadius: 8,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Body muted>
          {turns >= 3
            ? 'You made space for Korean today. Nicely done.'
            : 'Try three replies today. Small steps count.'}
        </Body>
      </View>
      <View>
        <Heading small>Picked for your level</Heading>
        {app.lessons
          .filter((l) => l.level === level)
          .slice(0, 3)
          .map((l) => (
            <LessonRow
              key={l.id}
              lesson={l}
              progress={app.progress.find((p) => p.lesson_id === l.id)}
            />
          ))}
      </View>
      <Card style={{ backgroundColor: colors.sage }}>
        <Row>
          <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.green} />
          <View style={{ flex: 1 }}>
            <Heading small>Follow your curiosity.</Heading>
            <Body muted>No lesson script. Just a conversation.</Body>
          </View>
        </Row>
        <Button
          title="Start Free Talk"
          secondary
          icon="mic-outline"
          onPress={() =>
            app.session ? router.push(`/conversation/${Crypto.randomUUID()}`) : router.push('/auth')
          }
        />
      </Card>
    </Screen>
  );
}
