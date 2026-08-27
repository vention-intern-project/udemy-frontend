import { createServer, type InlineConfig } from 'vite';

const defaultCartWorkflowPort = 4177;

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
    await server.environments.client.warmupRequest('/src/main.tsx');
    await server.environments.client.waitForRequestsIdle('/src/main.tsx');
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}
