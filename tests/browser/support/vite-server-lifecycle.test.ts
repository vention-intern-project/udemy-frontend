import { describe, expect, it, vi } from 'vitest';

import { createViteServerLifecycle } from './vite-server-lifecycle';

describe('createViteServerLifecycle', () => {
  it('waits for a deferred startup before closing its listener on cancellation', async () => {
    let resolveStartup: (() => void) | undefined;
    const startup = new Promise<void>((resolve) => {
      resolveStartup = resolve;
    });
    const close = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
    const lifecycle = createViteServerLifecycle({
      close,
      cancellationMessage: 'Vite server startup was cancelled',
    });

    const rejectedStartup = expect(lifecycle.waitWhileActive(() => startup)).rejects.toThrow(
      'Vite server startup was cancelled',
    );
    const cleanup = lifecycle.cleanup();
    expect(close).not.toHaveBeenCalled();
    resolveStartup?.();
    await Promise.all([rejectedStartup, cleanup]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects startup immediately after cleanup has begun', async () => {
    const close = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
    const lifecycle = createViteServerLifecycle({
      close,
      cancellationMessage: 'Vite server startup was cancelled',
    });

    await lifecycle.cleanup();
    await expect(lifecycle.waitWhileActive(async () => undefined)).rejects.toThrow(
      'Vite server startup was cancelled',
    );
    expect(close).toHaveBeenCalledTimes(1);
  });
});
