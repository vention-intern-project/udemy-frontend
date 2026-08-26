import { defineConfig } from '@playwright/test';
import { catalogDiscoveryOrigin } from '../catalog-discovery-server';
const runId = process.env.FE058_RUN_ID ?? 'unidentified';
export default defineConfig({ testDir: '.', testMatch: 'm02-catalog.spec.ts', workers: 1, fullyParallel: false, globalSetup: '../catalog-discovery-server.ts', timeout: 240_000, outputDir: `../../../test-results/visual-admission/${runId}/m02-${runId}`, reporter: 'line', use: { baseURL: catalogDiscoveryOrigin, browserName: 'chromium' } });
