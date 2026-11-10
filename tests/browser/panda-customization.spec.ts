import { test, expect } from '@playwright/test';

test('original panda face appears on the sky-blue launch screen, then releases navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Keep the real launch visible long enough to inspect its image-loading state.
  await page.route('**/mascot/panda-face.riv*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.goto('/');
  const launch = page.getByTestId('launch-screen');
  await expect(launch).toBeVisible();
  await expect(launch).toHaveCSS('background-color', 'rgb(208, 227, 255)');
  await page.screenshot({ path: 'test-results/haru-launch.png' });
  await expect(launch).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Say Hello', exact: true })).toBeVisible();
});

test('V2 keeps original fur while accessories change on the same live Rive canvas and persist globally', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/profile');
  await expect(page.getByRole('radio', { name: 'No accessory', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: /hoodie/i })).toHaveCount(0);
  const canvas = page.getByTestId('panda-look-original-none').locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((node: HTMLCanvasElement) => {
    node.dataset.wardrobeProbe = 'same-canvas';
  });
  await page.getByRole('radio', { name: 'Round glasses', exact: true }).click();
  const glassesCanvas = page.getByTestId('panda-look-original-glasses').locator('canvas');
  await expect(glassesCanvas).toHaveAttribute('data-wardrobe-probe', 'same-canvas');
  await expect
    .poll(() =>
      glassesCanvas.evaluate((node: HTMLCanvasElement) => {
        const pixels = node.getContext('2d')?.getImageData(0, 0, node.width, node.height).data;
        let count = 0;
        if (pixels)
          for (let i = 0; i < pixels.length; i += 4)
            if (
              pixels[i] === 52 &&
              pixels[i + 1] === 127 &&
              pixels[i + 2] === 169 &&
              pixels[i + 3] > 200
            )
              count++;
        return count;
      }),
    )
    .toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Save Dori’s look', exact: true }).click();
  await expect(
    page.getByText(
      'Saved on this device. Sign in whenever you’d like to keep it with your account.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Round glasses', exact: true })).toBeChecked();
  await expect(page.getByTestId('launch-screen')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/panda-customizer.png' });
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Say Hello' }).click();
  await expect(page.getByTestId('panda-look-original-glasses')).toBeVisible();
  expect(errors).toEqual([]);
});

test('all four original-fur accessory looks work with reduced motion on a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/profile');
  for (const [accessory, label] of [
    ['headphones', 'Headphones'],
    ['glasses', 'Round glasses'],
    ['hat', 'Cute hat'],
    ['none', 'No accessory'],
  ]) {
    await page.getByRole('radio', { name: label, exact: true }).click();
    const preview = page.getByTestId(`panda-look-original-${accessory}`);
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toBeVisible();
    await expect(preview.locator('canvas')).toHaveCount(0);
    await expect
      .poll(() =>
        preview
          .locator('img')
          .evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/panda-customizer-small.png' });
});
