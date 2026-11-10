import { test, expect } from '@playwright/test';

test('the original panda Rive asset guides onboarding', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/welcome');
  await expect(page.getByRole('button', { name: 'Say Hello' })).toBeVisible();
  await expect(page.getByTestId('panda-happy').locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Say Hello' }).click();
  await expect(page.getByTestId('panda-thinking').locator('canvas')).toBeVisible();
  await page.getByRole('radio', { name: 'Everyday Korean' }).click();
  await expect(page.getByTestId('panda-happy').last()).toBeVisible();
  expect(errors).toEqual([]);
});

test('reduced motion keeps a still panda', async ({ page }) => {
  await page.goto('/welcome');
  await expect(page.getByRole('img', { name: 'Dori the panda tutor, happy' })).toBeVisible();
  await page.getByRole('button', { name: 'Say Hello' }).click();
  await expect(page.getByRole('img', { name: 'Dori the panda tutor, thinking' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
