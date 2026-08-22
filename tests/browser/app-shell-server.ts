import { createServer } from 'vite';
import { resolveAppShellTestPort } from './app-shell-harness';

export default async function startAppShellServer() {
  const port = resolveAppShellTestPort();
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom/client', 'react-i18next', 'i18next'],
    },
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
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
