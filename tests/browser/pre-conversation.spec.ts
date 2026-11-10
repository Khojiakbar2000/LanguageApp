import { expect, test } from '@playwright/test';

const meetingLesson = '/lesson/a1000000-0000-4000-8000-000000000001';

test('a learner can prepare, practice, and reach the existing sign-in conversation gate', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(meetingLesson);
  await expect(page.getByRole('button', { name: 'Start learning' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByText('Useful words', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'I know these words' }).click();
  await expect(page.getByText('Say it this way', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to the pattern' }).click();
  await expect(page.getByText('저는 + [Name] + 이에요/예요')).toBeVisible();
  await page.getByRole('button', { name: 'Try a quick practice' }).click();
  await page.getByRole('button', { name: '안녕하세요', exact: true }).click();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('That’s it. Nice work.')).toBeVisible();
  await page.getByRole('button', { name: 'Next practice' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('예');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('That’s it. Nice work.')).toBeVisible();
  await page.getByRole('button', { name: 'Ready to talk' }).click();
  await expect(page.getByText('You’re ready! Let’s meet someone new.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('panda.lesson-progress.v1.guest')!),
  );
  expect(saved['a1000000-0000-4000-8000-000000000001']).toMatchObject({
    currentStage: 'ready',
    completedStages: expect.arrayContaining([
      'introduction',
      'vocabulary',
      'expressions',
      'grammar',
      'practice',
    ]),
    correctExercises: ['meet-greet', 'meet-name'],
  });
  await page.getByRole('button', { name: 'Start conversation' }).click();
  await expect(page).toHaveURL(/\/auth/);
});

test('lesson resume restores the last stage after leaving and reopening', async ({ page }) => {
  await page.goto(meetingLesson);
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByText('Useful words', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Useful words', { exact: true })).toBeVisible();
  await expect(page.getByText('Words · 4 min · A1 beginner')).toBeVisible();
});

test('a missing Supabase lessons table shows a setup note and keeps the bundled lessons usable', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'haru-preferences',
      JSON.stringify({ version: 0, state: { onboarded: true } }),
    ),
  );
  await page.route('**/rest/v1/lessons**', (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'PGRST205',
        message: "Could not find the table 'public.lessons' in the schema cache",
      }),
    }),
  );
  await page.goto('/');
  await expect(
    page.getByText(/Supabase is reachable, but its lesson tables are missing/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue learning' }).click();
  await expect(page.getByRole('button', { name: 'Start learning' })).toBeVisible();
});
