import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'catalog-discovery.spec.ts', fullyParallel: false, forbidOnly: true,
  retries: 0, workers: 1, globalSetup: './catalog-discovery-server.ts', timeout: 30_000,
  expect: { timeout: 5_000 }, outputDir: '../../test-results/playwright-fe007', reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:4175', browserName: 'chromium', actionTimeout: 5_000, navigationTimeout: 10_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
