import { test, expect } from '@playwright/test';
async function home(page: import('@playwright/test').Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      'haru-preferences',
      JSON.stringify({ version: 0, state: { onboarded: true } }),
    ),
  );
  await page.goto('/');
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  await expect(page.getByTestId('launch-screen')).toHaveCount(0);
}
test('live room completes coffee, safely ignores repeated taps, changes lighting and opens learning', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await home(page);
  const canvas = page.getByTestId('cozy-rive').locator('canvas');
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate((c: HTMLCanvasElement) =>
        c
          .getContext('2d')
          ?.getImageData(0, 0, c.width, c.height)
          .data.some((v, i) => i % 4 === 3 && v > 0),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/cozy-room-day.png' });
  const before = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement, s) => c.toDataURL() !== s, before))
    .toBe(true);
  await page.getByTestId('room-coffee').click();
  await expect(page.getByTestId('room-status')).toHaveText('Dori is taking a little coffee break.');
  await page.getByTestId('room-panda').click();
  await page.getByTestId('room-coffee').click();
  await expect(page.getByTestId('room-status')).toHaveText('Dori is taking a little coffee break.');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/cozy-room-drinking.png' });
  await expect(page.getByTestId('room-status')).toHaveText(
    'Tap Dori, the coffee, the book, or the window.',
    { timeout: 12000 },
  );
  await page.getByTestId('room-window').click();
  await expect(page.getByRole('button', { name: 'Switch room to day', exact: true })).toBeVisible();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: 'test-results/cozy-room-night.png' });
  await page.getByTestId('room-panda').click();
  await expect(page.getByTestId('room-status')).toHaveText('안녕! Dori is waving hello.');
  await page.getByTestId('room-book').click();
  await expect(page.getByRole('button', { name: 'Start learning', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('reduced-motion room remains interactive and fits a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await home(page);
  await expect(page.getByTestId('room-native-vectors')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByTestId('room-window').click();
  await page.getByTestId('room-coffee').click();
  await expect(page.getByTestId('room-status')).toContainText('Dori enjoyed a warm coffee');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/cozy-room-small-reduced.png' });
  await page.getByTestId('room-book').click();
  await expect(page.getByRole('button', { name: 'Start learning', exact: true })).toBeVisible();
});
test('Rive failure retains independently animated vectors and the coffee interaction', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/mascot/cozy-room.riv*', (route) => route.abort());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await home(page);
  const svg = page.getByTestId('room-native-vectors');
  await expect(svg).toBeVisible();
  const before = await svg.innerHTML();
  await expect.poll(() => svg.innerHTML()).not.toBe(before);
  await page.getByTestId('room-coffee').click();
  await expect(page.getByTestId('room-status')).toContainText('coffee break');
  await page.waitForTimeout(3100);
  await page.screenshot({ path: 'test-results/cozy-room-vector-drink.png' });
  await page.goto('/lessons');
  await expect(page.getByRole('textbox', { name: 'Find a lesson' })).toBeVisible();
  expect(errors).toEqual([]);
});
