import { defineConfig } from '@playwright/test';
import { learningProgressOrigin } from '../learning-progress-server';
const runId = process.env.FE058_RUN_ID ?? 'unidentified';
export default defineConfig({ testDir: '.', testMatch: 'm01-learning.spec.ts', workers: 1, fullyParallel: false, globalSetup: '../learning-progress-server.ts', timeout: 90_000, outputDir: `../../../test-results/visual-admission/${runId}/m01-${runId}`, reporter: 'line', use: { baseURL: learningProgressOrigin, browserName: 'chromium' } });
