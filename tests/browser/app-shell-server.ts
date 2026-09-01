import { createServer } from 'vite';
import { resolveAppShellTestPort } from './app-shell-harness';

export type AppShellServerCleanup = () => Promise<void>;

export interface AppShellServerStartupObserver {
  readonly onCleanupReady: (cleanup: AppShellServerCleanup) => void;
}

export async function startAppShellViteServer(
  observer?: AppShellServerStartupObserver,
): Promise<AppShellServerCleanup> {
  const port = resolveAppShellTestPort();
  const server = await createServer({
    clearScreen: false,
    logLevel: 'warn',
    envFile: false,
    appType: 'spa',
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'react',
        'react-dom/client',
        'react-i18next',
        'i18next',
        'react-router-dom',
        '@tanstack/react-query',
        'lucide-react',
      ],
    },
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
  });

  let resolveCleanupRequested: () => void = () => {};
  const cleanupRequested = new Promise<void>((resolve) => {
    resolveCleanupRequested = resolve;
  });
  let cleanupStarted = false;
  let cleanupPromise: Promise<void> | undefined;
  const cleanup: AppShellServerCleanup = () => {
    if (!cleanupPromise) {
      cleanupStarted = true;
      resolveCleanupRequested();
      cleanupPromise = Promise.resolve()
        .then(() => server.close())
        .catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') throw error;
        });
    }
    return cleanupPromise;
  };
  const waitWhileActive = <T>(operation: () => Promise<T>): Promise<T> => {
    if (cleanupStarted)
      return Promise.reject(new Error('AppShell Vite server startup was cancelled'));
    return Promise.race([
      operation(),
      cleanupRequested.then(() => {
        throw new Error('AppShell Vite server startup was cancelled');
      }),
    ]);
  };

  try {
    observer?.onCleanupReady(cleanup);
    await waitWhileActive(() => server.listen());
    await waitWhileActive(() => server.environments.client.warmupRequest('/src/main.tsx'));
    await waitWhileActive(() => server.environments.client.waitForRequestsIdle());
  } catch (error) {
    await cleanup();
    throw error;
  }

  return cleanup;
}

export default async function startAppShellServer() {
  return startAppShellViteServer();
}
