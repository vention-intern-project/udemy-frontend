import { createServer, type InlineConfig } from 'vite';
import { chromium } from '@playwright/test';

const defaultCartWorkflowPort = 4177;
const readinessDeadlineMs = 60_000;
const readinessPollIntervalMs = 100;

type CartReadinessFetcher = (input: string, init: RequestInit) => Promise<Response>;
type CartReadinessWait = (milliseconds: number) => Promise<void>;

export interface CartApplicationReadinessOptions {
  readonly deadlineMs?: number;
  readonly pollIntervalMs?: number;
  readonly fetchReady?: CartReadinessFetcher;
  readonly wait?: CartReadinessWait;
}

function cartWorkflowPort(): number {
  const override = process.env.CART_WORKFLOW_TEST_PORT;
  if (override === undefined) return defaultCartWorkflowPort;
  const port = Number(override);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535)
    throw new Error('CART_WORKFLOW_TEST_PORT must be an integer from 1024 to 65535.');
  return port;
}

export const cartWorkflowOrigin = `http://127.0.0.1:${cartWorkflowPort()}`;
const cartWorkflowApiDefinition = JSON.stringify(cartWorkflowOrigin);

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function readinessFailure(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isCartApplicationHtml(html: string) {
  return (
    /<html[\s>]/i.test(html) &&
    /<div\s+id=["']root["']/i.test(html) &&
    /<script[^>]+type=["']module["'][^>]+src=["']\/src\/main\.tsx["']/i.test(html)
  );
}

export async function waitForCartApplicationReady(
  origin: string,
  options: CartApplicationReadinessOptions = {},
) {
  const deadlineMs = options.deadlineMs ?? readinessDeadlineMs;
  const pollIntervalMs = options.pollIntervalMs ?? readinessPollIntervalMs;
  const fetchReady: CartReadinessFetcher =
    options.fetchReady ?? ((input, init) => fetch(input, init));
  const pause = options.wait ?? wait;
  const deadline = Date.now() + deadlineMs;
  let lastFailure = 'no HTTP response received';

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(remainingMs, 5_000));

    try {
      const documentResponse = await fetchReady(`${origin}/cart`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const html = await documentResponse.text();
      if (!documentResponse.ok || !isCartApplicationHtml(html)) {
        lastFailure = `Cart document returned HTTP ${documentResponse.status} with ${html.length} bytes but no complete app shell`;
      } else {
        const entryResponse = await fetchReady(`${origin}/src/main.tsx`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const contentType = entryResponse.headers.get('content-type') ?? '';
        const entry = await entryResponse.text();
        if (entryResponse.ok && /javascript/i.test(contentType) && entry.trim() !== '') return;
        lastFailure = `Cart entry returned HTTP ${entryResponse.status}, content type ${contentType || 'unknown'}, and ${entry.length} bytes`;
      }
    } catch (error) {
      lastFailure = readinessFailure(error);
    } finally {
      clearTimeout(timeout);
    }

    const nextWaitMs = Math.min(pollIntervalMs, Math.max(0, deadline - Date.now()));
    if (nextWaitMs > 0) await pause(nextWaitMs);
  }

  throw new Error(
    `Cart-workflow Vite server at ${origin} did not serve the application before ${deadlineMs}ms: ${lastFailure}`,
  );
}

async function verifyCartApplicationInChromium(origin: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const response = await page.goto(`${origin}/cart`, { timeout: 10_000, waitUntil: 'load' });
    if (!response?.ok())
      throw new Error(
        `Cart-workflow Chromium readiness received ${response?.status() ?? 'no response'} for ${origin}/cart.`,
      );
    if ((await page.locator('#root').count()) !== 1)
      throw new Error('Cart-workflow Chromium readiness did not render the application root.');
  } finally {
    await browser.close();
  }
}

export function cartWorkflowViteConfig(root = process.cwd()): InlineConfig {
  return {
    root,
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    define: { 'import.meta.env.VITE_API_BASE_URL': cartWorkflowApiDefinition },
    server: { host: '127.0.0.1', port: cartWorkflowPort(), strictPort: true },
  };
}

export default async function startCartWorkflowServer() {
  const server = await createServer(cartWorkflowViteConfig());
  if (server.config.define?.['import.meta.env.VITE_API_BASE_URL'] !== cartWorkflowApiDefinition) {
    await server.close();
    throw new Error('Cart-workflow Vite API origin does not match the deterministic route harness');
  }
  try {
    await server.listen();
    const transformedEntry = await server.environments.client.transformRequest('/src/main.tsx');
    if (transformedEntry === null)
      throw new Error('Cart-workflow Vite entry transform returned no result.');
    await server.environments.client.waitForRequestsIdle();
    await waitForCartApplicationReady(cartWorkflowOrigin);
    await verifyCartApplicationInChromium(cartWorkflowOrigin);
    await server.environments.client.waitForRequestsIdle();
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}
