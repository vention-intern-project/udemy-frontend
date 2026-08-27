import { createServer } from 'vite';

export const catalogDiscoveryOrigin = 'http://127.0.0.1:4178';

export default async function startCatalogServer() {
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    server: {
      host: '127.0.0.1',
      port: 4178,
      strictPort: true,
      watch: { ignored: ['**/plans/**', '**/test-results/**'] },
    },
  });
  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  return async () => server.close();
}
