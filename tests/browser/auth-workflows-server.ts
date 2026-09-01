import { createServer } from 'vite';

export type AuthWorkflowsServerCleanup = () => Promise<void>;

export interface AuthWorkflowsServerStartupObserver {
  readonly onCleanupReady: (cleanup: AuthWorkflowsServerCleanup) => void;
}

export async function startAuthWorkflowsViteServer(
  observer?: AuthWorkflowsServerStartupObserver,
): Promise<AuthWorkflowsServerCleanup> {
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
  let resolveCleanupRequested: () => void = () => {};
  const cleanupRequested = new Promise<void>((resolve) => {
    resolveCleanupRequested = resolve;
  });
  let cleanupStarted = false;
  let cleanupPromise: Promise<void> | undefined;
  const cleanup: AuthWorkflowsServerCleanup = () => {
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
    if (cleanupStarted) return Promise.reject(new Error('Auth Vite server startup was cancelled'));
    return Promise.race([
      operation(),
      cleanupRequested.then(() => {
        throw new Error('Auth Vite server startup was cancelled');
      }),
    ]);
  };
  try {
    observer?.onCleanupReady(cleanup);
    await waitWhileActive(() => server.listen());
    await waitWhileActive(() => server.warmupRequest('/src/main.tsx'));
    await waitWhileActive(() => server.environments.client.waitForRequestsIdle('/src/main.tsx'));
  } catch (error) {
    await cleanup();
    throw error;
  }
  return cleanup;
}

export default async function startAuthWorkflowsServer() {
  return startAuthWorkflowsViteServer();
}
