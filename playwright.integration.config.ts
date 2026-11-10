import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  outputDir: 'test-results/integration',
  use: {
    baseURL: 'http://127.0.0.1:8082',
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run web -- --port 8082',
    url: 'http://127.0.0.1:8082',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'unpaid-test-fixture-only',
      EXPO_NO_TELEMETRY: '1',
    },
  },
});
