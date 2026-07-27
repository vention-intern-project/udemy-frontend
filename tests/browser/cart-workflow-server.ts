import { createServer } from 'vite';

export const cartWorkflowOrigin = 'http://127.0.0.1:4177';
const cartWorkflowApiDefinition = JSON.stringify(cartWorkflowOrigin);

export default async function startCartWorkflowServer() {
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    appType: 'spa',
    define: { 'import.meta.env.VITE_API_BASE_URL': cartWorkflowApiDefinition },
    server: { host: '127.0.0.1', port: 4177, strictPort: true },
  });
  if (server.config.define?.['import.meta.env.VITE_API_BASE_URL'] !== cartWorkflowApiDefinition) {
    await server.close();
    throw new Error('Cart-workflow Vite API origin does not match the deterministic route harness');
  }
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}
