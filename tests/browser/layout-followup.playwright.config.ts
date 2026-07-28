import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'layout-followup.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  globalSetup: './layout-followup-server.ts',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  outputDir: '../../test-results/playwright-fe006-followup',
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4180',
    browserName: 'chromium',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
