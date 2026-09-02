export type ViteServerCleanup = () => Promise<void>;

export interface ViteServerLifecycle {
  readonly cleanup: ViteServerCleanup;
  readonly waitWhileActive: <T>(operation: () => Promise<T>) => Promise<T>;
}

interface CreateViteServerLifecycleOptions {
  readonly close: () => Promise<void>;
  readonly cancellationMessage: string;
}

function ignoreNotRunningServer(error: unknown): void {
  if ((error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') throw error;
}

/**
 * Keeps Vite server startup and cleanup ordered: a cancellation waits for an
 * in-flight startup operation before closing the listener it may bind.
 */
export function createViteServerLifecycle({
  close,
  cancellationMessage,
}: CreateViteServerLifecycleOptions): ViteServerLifecycle {
  let resolveCleanupRequested: () => void = () => {};
  const cleanupRequested = new Promise<void>((resolve) => {
    resolveCleanupRequested = resolve;
  });
  let cleanupStarted = false;
  let cleanupPromise: Promise<void> | undefined;
  let inFlightOperation: Promise<unknown> | undefined;

  const cleanup: ViteServerCleanup = () => {
    if (!cleanupPromise) {
      cleanupStarted = true;
      resolveCleanupRequested();
      const operationAtCancellation = inFlightOperation;
      cleanupPromise = Promise.resolve().then(async () => {
        await operationAtCancellation?.catch(() => undefined);
        await close().catch(ignoreNotRunningServer);
      });
    }
    return cleanupPromise;
  };

  const waitWhileActive = <T>(operation: () => Promise<T>): Promise<T> => {
    if (cleanupStarted) return Promise.reject(new Error(cancellationMessage));
    const activeOperation = operation();
    const trackedOperation = activeOperation.then(
      (value) => {
        if (inFlightOperation === trackedOperation) inFlightOperation = undefined;
        return value;
      },
      (error: unknown) => {
        if (inFlightOperation === trackedOperation) inFlightOperation = undefined;
        throw error;
      },
    );
    inFlightOperation = trackedOperation;
    return Promise.race([
      trackedOperation,
      cleanupRequested.then(() => {
        throw new Error(cancellationMessage);
      }),
    ]);
  };

  return { cleanup, waitWhileActive };
}
