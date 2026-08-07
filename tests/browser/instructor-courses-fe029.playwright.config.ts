import { defineConfig } from '@playwright/test';

import { resolveAppShellTestPort } from './app-shell-harness';

const host = '127.0.0.1';
const port = resolveAppShellTestPort();

export default defineConfig({
  testDir: '.',
  testMatch: 'instructor-courses-fe029.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  globalSetup: './app-shell-server.ts',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  outputDir: '../../test-results/playwright-fe029',
  reporter: 'line',
  use: {
    baseURL: `http://${host}:${port}`,
    browserName: 'chromium',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
