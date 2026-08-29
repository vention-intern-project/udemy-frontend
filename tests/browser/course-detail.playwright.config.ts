import { defineConfig } from '@playwright/test';
import { courseDetailOrigin } from './course-detail-server';

export default defineConfig({
  testDir: '.',
  testMatch: 'course-detail.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  globalSetup: './course-detail-server.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: '../../test-results/playwright-fe008',
  reporter: 'line',
  use: {
    baseURL: courseDetailOrigin,
    browserName: 'chromium',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
