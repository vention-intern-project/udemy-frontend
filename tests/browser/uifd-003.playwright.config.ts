import { defineConfig } from '@playwright/test';
import { cartWorkflowOrigin } from './cart-workflow-server';

export default defineConfig({
  testDir: '.',
  testMatch: 'uifd-003.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  globalSetup: './cart-workflow-server.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: '../../test-results/playwright-uifd-003',
  reporter: 'line',
  use: {
    baseURL: cartWorkflowOrigin,
    browserName: 'chromium',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
