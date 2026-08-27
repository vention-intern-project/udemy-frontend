import { createServer } from 'vite';

export default async function startAuthWorkflowsServer() {
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom/client', 'use-sync-external-store/shim'],
    },
    server: { host: '127.0.0.1', port: 4175, strictPort: true },
  });
  try {
    await server.listen();
    await server.warmupRequest('/src/main.tsx');
    await server.environments.client.waitForRequestsIdle('/src/main.tsx');
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}
