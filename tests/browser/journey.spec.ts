import { test, expect } from '@playwright/test';

test('damaged local preferences do not block startup', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('haru-preferences', '{broken'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Say Hello' })).toBeVisible();
});

test('Korean future, lesson discovery and project configuration unlock account sign-in', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Say Hello' }).click();
  await page.getByRole('radio', { name: 'Confident Speaker' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Can have basic conversations' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Continue without microphone' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: '60 minutes', exact: true }).click();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByLabel('365 hours', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/korean-future-reveal.png' });
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  await page.goto('/lessons');
  await page.getByRole('textbox', { name: 'Find a lesson' }).fill('coffee');
  await page.getByRole('button', { name: /Ordering Coffee, Beginner/ }).click();
  await expect(page.getByText('Order a hot or iced drink with confidence.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Skip prep and start talking' }).click();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('dream and starting level stay independent; back, reload and completion retain the plan', async ({
  page,
}) => {
  await page.goto('/onboarding');
  await expect(page.getByTestId('onboarding-continue')).toBeDisabled();
  await page.getByRole('radio', { name: 'Advanced Korean' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Complete beginner' }).click();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByRole('radio', { name: 'Advanced Korean' })).toBeChecked();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByRole('radio', { name: 'Complete beginner' })).toBeChecked();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Continue without microphone' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: '90 minutes', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: '90 minutes', exact: true })).toBeChecked();
  await expect(page.getByText(/About 10.5 hours of Korean each week/)).toBeVisible();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByLabel('548 hours', { exact: true })).toBeVisible();
  await expect(page.getByText('Projected study time, not a proficiency estimate.')).toBeVisible();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  const preferences = await page.evaluate(
    () => JSON.parse(localStorage.getItem('haru-preferences')!).state,
  );
  expect(preferences).toMatchObject({
    onboarded: true,
    level: 'Beginner',
    goal: 'TOPIK',
    learningDream: 'advanced',
    startingPoint: 'complete_beginner',
    dailyMinutes: 90,
    futurePendingProfile: {
      learning_goal: 'advanced',
      starting_level: 'complete_beginner',
      daily_goal_minutes: 90,
    },
  });
});

test('small phones retain visible actions and accurate minimum/maximum projections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/welcome');
  await expect(page.getByRole('button', { name: 'Say Hello' })).toBeInViewport();
  await page.getByRole('button', { name: 'Say Hello' }).click();
  await page.getByRole('radio', { name: 'Everyday Korean' }).click();
  await expect(page.getByTestId('onboarding-continue')).toBeInViewport();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Know a few Korean expressions' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Continue without microphone' }).click();
  await page.getByTestId('onboarding-continue').click();
  for (const [minutes, hours] of [
    [10, '61'],
    [120, '730'],
  ] as const) {
    await page.getByRole('radio', { name: `${minutes} minutes`, exact: true }).click();
    await page.getByTestId('onboarding-continue').click();
    await expect(page.getByLabel(`${hours} hours`, { exact: true })).toBeVisible();
    await expect(page.getByTestId('onboarding-continue')).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Go back' }).click();
  }
});

test('the welcome catalog option still lets guests explore without a plan', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Explore the lesson catalog', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Find a lesson' })).toBeVisible();
});

test('guest preferences persist and review remains account-bound', async ({ page }) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.getByRole('button', { name: 'Work in Korea', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.getByText('Your preferences are saved.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Advanced', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Work in Korea', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/review');
  await expect(page.getByText('A home for your words', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
});

test('a direct conversation link cannot start paid practice without authentication', async ({
  page,
}) => {
  const providerRequests: string[] = [];
  page.on('request', (request) => {
    if (/generativelanguage|elevenlabs/.test(request.url())) providerRequests.push(request.url());
  });
  await page.goto('/conversation/c1000000-0000-4000-8000-000000000001');
  await expect(page.getByText('Your practice is waiting.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  expect(providerRequests).toEqual([]);
});
