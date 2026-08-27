import { defineConfig } from '@playwright/test';
import { courseChatOrigin } from '../course-chat-server';
const runId = process.env.FE058_RUN_ID ?? 'unidentified';
export default defineConfig({ testDir: '.', testMatch: 'm06-ai.spec.ts', workers: 1, fullyParallel: false, globalSetup: '../course-chat-server.ts', timeout: 240_000, outputDir: `../../../test-results/visual-admission/${runId}/m06-${runId}`, reporter: 'line', use: { baseURL: courseChatOrigin, browserName: 'chromium' } });
