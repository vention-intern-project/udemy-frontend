import { defineConfig } from '@playwright/test';
import { courseChatOrigin } from './course-chat-server';

export default defineConfig({
  testDir: '.',
  testMatch: 'course-chat.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  globalSetup: './course-chat-server.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: '../../test-results/playwright-course-chat',
  reporter: 'line',
  use: {
    baseURL: courseChatOrigin,
    browserName: 'chromium',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
