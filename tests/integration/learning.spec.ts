import { test, expect } from '@playwright/test';
import type { Profile } from '../../src/lib/types';
import { lessons } from '../../src/content/lessons';

// Contract test only: every backend request is intercepted in this isolated browser.
// No app module contains these fixtures; this does not claim live AI or Auth verification.
test('signed-in text practice, feedback, saving, completion, review and sign-out', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const userId = 'b1000000-0000-4000-8000-000000000001';
  const user = {
    id: userId,
    email: 'learner@example.invalid',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };
  const profile: Profile = {
    id: userId,
    display_name: 'Test Learner',
    level: 'Beginner',
    goal: 'Daily Conversation',
    created_at: user.created_at,
  };
  const stats = {
    user_id: userId,
    total_turns: 0,
    daily_turns: 0,
    current_streak: 0,
    longest_streak: 0,
    completed_sessions: 0,
    practice_seconds: 0,
    last_practice_date: null as string | null,
  };
  const conversations: Record<string, unknown>[] = [];
  const messages: Record<string, unknown>[] = [];
  const corrections: Record<string, unknown>[] = [];
  const saved: Record<string, unknown>[] = [];
  const progress: Record<string, unknown>[] = [];
  const jwt = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.unpaid_test_signature`;
  let sequence = 0;
  await page.route('http://127.0.0.1:54329/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    };
    const reply = (data: unknown, status = 200) =>
      route.fulfill({ status, headers, body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = request.postData() ? request.postDataJSON() : {};
    if (url.pathname === '/auth/v1/token')
      return reply({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'unpaid-test-refresh-token',
        user,
      });
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/functions/v1/speak')
      return reply({ error: 'Speech is intentionally disabled in this unpaid browser test.' }, 503);
    if (url.pathname === '/functions/v1/conversation') {
      const conversationId = body.conversationId;
      if (!conversations.some((c) => c.id === conversationId))
        conversations.push({
          id: conversationId,
          lesson_id: body.lessonId,
          title: 'Your usual coffee',
          level: 'Beginner',
          status: 'active',
          created_at: new Date().toISOString(),
        });
      const makeMessage = (role: string, content: string, translation: string | null) => ({
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        translation,
        sequence: ++sequence,
        created_at: new Date().toISOString(),
      });
      const learnerMessage = body.text ? makeMessage('user', body.text, null) : null;
      const tutor = makeMessage(
        'assistant',
        body.text ? '저도 커피를 좋아해요. 자주 마셔요?' : '안녕하세요! 어떤 커피를 드릴까요?',
        body.text
          ? 'I like coffee too. Do you drink it often?'
          : 'Hello! What coffee would you like?',
      );
      const feedback = learnerMessage
        ? [
            {
              id: crypto.randomUUID(),
              conversation_id: conversationId,
              message_id: learnerMessage.id,
              user_id: userId,
              original: '커피을',
              corrected: '커피를 좋아해요.',
              explanation: 'Use 를 after a vowel. This example is a test fixture.',
              category: 'grammar',
              created_at: new Date().toISOString(),
            },
          ]
        : [];
      if (learnerMessage) {
        messages.push(learnerMessage);
        stats.total_turns++;
        stats.daily_turns++;
        stats.current_streak = 1;
        stats.last_practice_date = new Date().toISOString().slice(0, 10);
      }
      messages.push(tutor);
      corrections.push(...feedback);
      return reply({ message: tutor, learnerMessage, corrections: feedback, encouragement: '' });
    }
    if (url.pathname === '/rest/v1/rpc/complete_conversation') {
      const c = conversations.find((c) => c.id === body.p_conversation_id)!;
      c.status = 'completed';
      stats.completed_sessions = 1;
      progress.push({
        lesson_id: c.lesson_id,
        status: 'completed',
        completed_count: 1,
        updated_at: new Date().toISOString(),
      });
      return reply(null);
    }
    if (url.pathname === '/rest/v1/lessons') return reply(lessons);
    if (url.pathname === '/rest/v1/profiles') {
      if (request.method() === 'PATCH') {
        expect(url.searchParams.get('id')).toBe(`eq.${userId}`);
        Object.assign(profile, body);
      }
      return reply(profile);
    }
    if (url.pathname === '/rest/v1/learning_stats') return reply(stats);
    if (url.pathname === '/rest/v1/lesson_progress') return reply(progress);
    if (url.pathname === '/rest/v1/messages') return reply(messages);
    if (url.pathname === '/rest/v1/corrections') return reply(corrections);
    if (url.pathname === '/rest/v1/conversations') {
      const id = url.searchParams.get('id')?.replace('eq.', '');
      return reply(id ? conversations.filter((c) => c.id === id) : conversations);
    }
    if (url.pathname === '/rest/v1/saved_expressions') {
      if (request.method() === 'POST') {
        saved.push({
          id: crypto.randomUUID(),
          ...body,
          learned: false,
          created_at: new Date().toISOString(),
        });
        return reply(null, 201);
      }
      if (request.method() === 'PATCH') {
        Object.assign(
          saved.find((e) => `eq.${e.id}` === url.searchParams.get('id'))!,
          body,
        );
        return reply(null);
      }
      return reply(saved);
    }
    throw new Error(`Unmocked backend request: ${request.method()} ${request.url()}`);
  });

  await page.addInitScript(() =>
    localStorage.setItem(
      'haru-preferences',
      JSON.stringify({
        version: 0,
        state: {
          onboarded: true,
          level: 'Beginner',
          goal: 'Daily Conversation',
          dailyMinutes: 60,
          learningDream: 'confident',
          startingPoint: 'complete_beginner',
          onboardingCompletedAt: '2026-11-03T00:00:00Z',
          futureSyncOwner: null,
          futurePendingProfile: {
            learning_goal: 'confident',
            starting_level: 'complete_beginner',
            daily_goal_minutes: 60,
            onboarding_completed_at: '2026-11-03T00:00:00Z',
          },
        },
      }),
    ),
  );
  await page.addInitScript(() => {
    if (!localStorage.getItem('haru-panda'))
      localStorage.setItem(
        'haru-panda',
        JSON.stringify({
          version: 1,
          state: {
            guest: { outfit: 'pink', accessory: 'glasses' },
            guestPending: true,
            accounts: {},
          },
        }),
      );
  });
  await page.goto('/auth');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('learner@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('test-password-not-a-real-account');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('안녕하세요, Test Learner.', { exact: true })).toBeVisible();
  await expect.poll(() => profile.daily_goal_minutes).toBe(60);
  expect(profile.learning_goal).toBe('confident');
  expect(profile.starting_level).toBe('complete_beginner');
  await expect.poll(() => profile.panda_outfit).toBe('pink');
  expect(profile.panda_accessory).toBe('glasses');
  await expect
    .poll(() =>
      page.evaluate(
        (id) => JSON.parse(localStorage.getItem('haru-panda')!).state.accounts[id]?.pending,
        userId,
      ),
    )
    .toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('haru-preferences')!).state.futurePendingProfile,
      ),
    )
    .toBeNull();
  await page.goto(`/lesson/${lessons[1].id}`);
  await page.getByRole('button', { name: 'Let’s talk', exact: true }).click();
  await expect(page.getByText('안녕하세요! 어떤 커피를 드릴까요?', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Speech is intentionally disabled in this unpaid browser test.', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your Korean reply', exact: true })
    .fill('커피을 좋아해요.');
  await page.getByRole('button', { name: 'Send reply', exact: true }).click();
  await expect(page.getByText('커피를 좋아해요.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved to Review', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click();
  await expect(page.getByText('Take Panda Everywhere 🐼', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Maybe Later', exact: true }).click();
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  await page.goto('/review');
  await expect(page.getByText('커피를 좋아해요.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as learned', exact: true }).click();
  await expect(page.getByText('Your collection starts small.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Showing expressions to review', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Move back to review', exact: true }),
  ).toBeVisible();
  await page.goto('/profile');
  await expect(
    page
      .getByText('Sessions finished', { exact: true })
      .locator('..')
      .getByText('1', { exact: true }),
  ).toBeVisible();
  page.on('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Let’s begin', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
