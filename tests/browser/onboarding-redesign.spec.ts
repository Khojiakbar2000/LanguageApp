import { test, expect } from '@playwright/test';

test('scene journey keeps answers, offers a no-mic route, and reaches the existing room', async ({
  page,
}) => {
  await page.goto('/welcome');
  await expect(page.getByRole('button', { name: 'Say Hello' })).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-welcome.png' });
  await page.getByRole('button', { name: 'Say Hello' }).click();
  await expect(page.getByText('What brings you to Korean?')).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-dream.png' });
  await expect(page.getByTestId('onboarding-continue')).toBeDisabled();
  await page.getByRole('radio', { name: 'Confident Speaker' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Complete beginner' }).click();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByText('안녕하세요!')).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-phrase.png' });
  await expect(page.getByTestId('onboarding-continue')).toBeDisabled();
  await page.getByRole('button', { name: 'Continue without microphone' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: '60 minutes', exact: true }).click();
  await page.screenshot({ path: 'test-results/onboarding-routine.png' });
  await page.reload();
  await expect(page.getByText('How much time can you give your Korean every day?')).toBeVisible();
  await expect(page.getByRole('radio', { name: '60 minutes', exact: true })).toBeChecked();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByLabel('365 hours', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-future.png' });
  await expect(page.getByText('Projected study time, not a proficiency estimate.')).toBeVisible();
  await page.getByTestId('onboarding-continue').click();
  await expect(page.getByTestId('cozy-room')).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-home.png' });
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('haru-preferences')!).state,
  );
  expect(saved).toMatchObject({
    onboarded: true,
    learningDream: 'confident',
    startingPoint: 'complete_beginner',
    dailyMinutes: 60,
    firstPhraseDone: true,
    firstPhraseAttempted: false,
  });
});

test('small phone and reduced motion keep the primary action available', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/onboarding');
  await expect(page.getByTestId('onboarding-continue')).toBeInViewport();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Everyday Korean' }).click();
  await expect(page.getByTestId('onboarding-continue')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 430, height: 932 });
  await expect(page.getByTestId('onboarding-continue')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('microphone denial is gentle and does not block the first phrase', async ({ page }) => {
  await page.addInitScript(() => {
    class DeniedRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onstart: (() => void) | null = null;
      onresult = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        queueMicrotask(() => this.onerror?.({ error: 'not-allowed' }));
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: DeniedRecognition,
    });
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: DeniedRecognition,
    });
  });
  await page.goto('/onboarding');
  await page.getByRole('radio', { name: 'Everyday Korean' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Complete beginner' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Repeat the phrase' }).click();
  await expect(
    page.getByText('Microphone access is unavailable. You can continue without it.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue without microphone' }).click();
  await expect(page.getByTestId('onboarding-continue')).toBeEnabled();
});

test('a recognized attempt is acknowledged without a pronunciation score', async ({ page }) => {
  await page.addInitScript(() => {
    class RecognizedSpeech {
      lang = '';
      continuous = false;
      interimResults = false;
      onstart: (() => void) | null = null;
      onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
      onerror = null;
      onend: (() => void) | null = null;
      start() {
        queueMicrotask(() => this.onstart?.());
      }
      stop() {
        this.onresult?.({ results: [[{ transcript: '안녕하세요' }]] });
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: RecognizedSpeech,
    });
  });
  await page.goto('/onboarding');
  await page.getByRole('radio', { name: 'Everyday Korean' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Complete beginner' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('button', { name: 'Listen to Dori say the phrase' }).click();
  await page.getByRole('button', { name: 'Repeat the phrase' }).click();
  await page.getByRole('button', { name: 'Finish speaking' }).click();
  await expect(page.getByText(/I heard “안녕하세요”/)).toBeVisible();
  await expect(page.getByTestId('onboarding-continue')).toBeEnabled();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('haru-preferences')!).state,
  );
  expect(saved).toMatchObject({ firstPhraseDone: true, firstPhraseAttempted: true });
});

test('two recognition errors leave an easy way forward', async ({ page }) => {
  await page.addInitScript(() => {
    class FailingSpeech {
      lang = '';
      continuous = false;
      interimResults = false;
      onstart: (() => void) | null = null;
      onresult = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        queueMicrotask(() => this.onstart?.());
      }
      stop() {
        this.onerror?.({ error: 'network' });
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: FailingSpeech,
    });
  });
  await page.goto('/onboarding');
  await page.getByRole('radio', { name: 'Everyday Korean' }).click();
  await page.getByTestId('onboarding-continue').click();
  await page.getByRole('radio', { name: 'Complete beginner' }).click();
  await page.getByTestId('onboarding-continue').click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Repeat the phrase' }).click();
    await page.getByRole('button', { name: 'Finish speaking' }).click();
  }
  await expect(
    page.getByText('The microphone is having trouble. We can keep going together.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue without microphone' }).click();
  await expect(page.getByTestId('onboarding-continue')).toBeEnabled();
});
