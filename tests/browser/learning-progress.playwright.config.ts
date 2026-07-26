import { defineConfig } from '@playwright/test';
import { learningProgressOrigin } from './learning-progress-server';

export default defineConfig({
  testDir: '.', testMatch: 'learning-progress.spec.ts', fullyParallel: false, forbidOnly: true,
  retries: 0, workers: 1, globalSetup: './learning-progress-server.ts', timeout: 30_000,
  expect: { timeout: 5_000 }, outputDir: '../../test-results/playwright-fe011', reporter: 'line',
  use: { baseURL: learningProgressOrigin, browserName: 'chromium', actionTimeout: 5_000, navigationTimeout: 10_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
