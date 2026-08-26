import { defineConfig } from '@playwright/test';
import { cartWorkflowOrigin } from '../cart-workflow-server';
const shard = process.env.FE058_CART_SHARD ?? 'unselected';
const runId = process.env.FE058_RUN_ID ?? 'unidentified';
export default defineConfig({ testDir: '.', testMatch: 'm07-cart.spec.ts', workers: 1, fullyParallel: false, globalSetup: '../cart-workflow-server.ts', timeout: 120_000, outputDir: `../../../test-results/visual-admission/${runId}/m07-${shard}-${runId}`, reporter: 'line', use: { baseURL: cartWorkflowOrigin, browserName: 'chromium', navigationTimeout: 60_000 } });
