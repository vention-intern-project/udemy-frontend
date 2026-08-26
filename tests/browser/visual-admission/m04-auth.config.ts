import { defineConfig } from '@playwright/test';
const runId = process.env.FE058_RUN_ID ?? 'unidentified';
export default defineConfig({ testDir: '.', testMatch: 'm04-auth.spec.ts', workers: 1, fullyParallel: false, globalSetup: '../auth-workflows-server.ts', timeout: 300_000, outputDir: `../../../test-results/visual-admission/${runId}/m04-${runId}`, reporter: 'line', use: { baseURL: 'http://127.0.0.1:4175', browserName: 'chromium', navigationTimeout: 60_000 } });
