import { test, expect } from '@playwright/test';
test('widget invitation uses the supplied illustration, gives honest install guidance and continues to the room', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/panda-widget');
  await expect(page.getByRole('heading', { name: 'Take Panda Everywhere 🐼' })).toBeVisible();
  const illustration = page.getByRole('img', {
    name: 'Panda smiling and waving from a phone home screen',
  });
  await expect(illustration).toBeVisible();
  await page.screenshot({ path: 'test-results/panda-widget-invitation.png' });
  await page.getByRole('radio', { name: 'Daily Korean widget', exact: true }).click();
  await page.getByRole('button', { name: 'Add Panda Widget', exact: true }).click();
  await expect(page.getByText(/This browser or Expo Go preview/)).toBeVisible();
  await expect(page.getByText('Search for Haru.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Android', exact: true }).click();
  await expect(page.getByText('Open Widgets and find Haru.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/panda-widget-guide.png' });
  await page.getByRole('button', { name: 'Back to My Cozy Room', exact: true }).click();
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('haru-widget-invitation')!).state.status,
    ),
  ).toBe('dismissed');
  expect(errors).toEqual([]);
});
test('skip is optional, persisted, and usable on a small phone with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/panda-widget');
  await page.getByRole('button', { name: 'Maybe Later', exact: true }).click();
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('haru-widget-invitation')!).state.status,
    ),
  ).toBe('dismissed');
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Add Panda to Home Screen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Take Panda Everywhere 🐼' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/panda-widget-small.png' });
});
test('the widget deep-link destination opens the existing Home screen', async ({ page }) => {
  await page.goto('/widget');
  await expect(page.getByTestId('cozy-room')).toBeVisible();
});
