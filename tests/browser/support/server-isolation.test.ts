import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveConfig } from 'vite';

import startAppShellServer, {
  startAppShellViteServer,
  type AppShellServerCleanup,
} from '../app-shell-server';
import {
  startAuthWorkflowsViteServer,
  type AuthWorkflowsServerCleanup,
} from '../auth-workflows-server';
import {
  cartWorkflowOrigin,
  cartWorkflowViteConfig,
  waitForCartApplicationReady,
} from '../cart-workflow-server';

const temporaryRoots: string[] = [];
interface ServerScope {
  closed: boolean;
  readonly closers: Set<() => Promise<void>>;
}

type ServerCleanup = AppShellServerCleanup | AuthWorkflowsServerCleanup;
interface ServerStartupObserver {
  readonly onCleanupReady: (cleanup: ServerCleanup) => void;
}

type StartRealServer = (observer: ServerStartupObserver) => Promise<ServerCleanup>;

let serverScope: ServerScope;

function registerCloser(close: ServerCleanup): Promise<void> | undefined {
  if (serverScope.closed) return close();
  serverScope.closers.add(close);
  return undefined;
}

function startTracked(start: StartRealServer): Promise<Error | null> {
  return start({
    onCleanupReady: (close) => {
      void registerCloser(close);
    },
  }).then(
    async (close) => {
      if (serverScope.closed) {
        await close();
      } else {
        serverScope.closers.add(close);
      }
      return null;
    },
    (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
  );
}

function listenOnStrictPort(server: Server, port: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function expectHttp200(url: string): Promise<void> {
  await vi.waitFor(
    async () => {
      let status: number | undefined;
      try {
        status = (await fetch(url)).status;
      } catch {
        status = undefined;
      }
      expect(status).toBe(200);
    },
    { interval: 50, timeout: 10_000 },
  );
}

afterEach(async () => {
  serverScope.closed = true;
  await Promise.all([...serverScope.closers].map((close) => close()));
  serverScope.closers.clear();
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('browser server isolation probes', () => {
  beforeEach(() => {
    serverScope = { closed: false, closers: new Set() };
  });

  it('attributes an occupied AppShell port', async () => {
    const blocker = createNetServer();
    await listenOnStrictPort(blocker, 4174);
    try {
      await expect(startAppShellServer()).rejects.toThrow(/4174|address already in use/i);
    } finally {
      await closeServer(blocker);
    }
  }, 15_000);

  it('releases real AppShell and Auth Vite global-setup servers', async () => {
    const startups = [
      startTracked((observer) =>
        startAppShellViteServer({ onCleanupReady: observer.onCleanupReady }),
      ),
      startTracked((observer) =>
        startAuthWorkflowsViteServer({ onCleanupReady: observer.onCleanupReady }),
      ),
    ];
    await Promise.all([
      expectHttp200('http://127.0.0.1:4174/'),
      expectHttp200('http://127.0.0.1:4175/'),
    ]);
    serverScope.closed = true;
    const closers = [...serverScope.closers];
    await Promise.all(closers.flatMap((close) => [close(), close()]));
    serverScope.closers.clear();
    const startupResults = await Promise.all(startups);
    for (const result of startupResults) {
      if (result) expect(result.message).toMatch(/Vite server startup was cancelled/);
    }
    const shellProbe = createNetServer();
    const authProbe = createNetServer();
    try {
      await Promise.all([
        listenOnStrictPort(shellProbe, 4174),
        listenOnStrictPort(authProbe, 4175),
      ]);
    } finally {
      await Promise.all([closeServer(shellProbe), closeServer(authProbe)]);
    }
  }, 30_000);

  it('cancels both real helpers before startup can outlive caller ownership', async () => {
    let appShellCancellation: Promise<void> | undefined;
    let authCancellation: Promise<void> | undefined;
    const appShellStartup = startAppShellViteServer({
      onCleanupReady: (close) => {
        const firstCleanup = close();
        expect(close()).toBe(firstCleanup);
        appShellCancellation = firstCleanup;
      },
    });
    const appShellRejected = expect(appShellStartup).rejects.toThrow(
      'AppShell Vite server startup was cancelled',
    );
    const authStartup = startAuthWorkflowsViteServer({
      onCleanupReady: (close) => {
        const firstCleanup = close();
        expect(close()).toBe(firstCleanup);
        authCancellation = firstCleanup;
      },
    });
    const authRejected = expect(authStartup).rejects.toThrow(
      'Auth Vite server startup was cancelled',
    );

    await Promise.all([appShellRejected, authRejected]);
    await Promise.all([appShellCancellation, authCancellation]);

    const shellProbe = createNetServer();
    const authProbe = createNetServer();
    try {
      await Promise.all([
        listenOnStrictPort(shellProbe, 4174),
        listenOnStrictPort(authProbe, 4175),
      ]);
    } finally {
      await Promise.all([closeServer(shellProbe), closeServer(authProbe)]);
    }
  }, 15_000);

  it('ignores a hostile env file while retaining the declared API definition', async () => {
    const root = await mkdtemp(join(tmpdir(), 'learnhub-hostile-env-'));
    temporaryRoots.push(root);
    await writeFile(
      join(root, '.env'),
      [
        'VITE_API_BASE_URL=https://hostile.example/private',
        'VITE_UNDECLARED_SECRET=must-not-load',
        'MALFORMED LINE',
      ].join('\n'),
      'utf8',
    );

    const config = await resolveConfig(cartWorkflowViteConfig(root), 'serve');
    expect(config.env.VITE_API_BASE_URL).not.toBe('https://hostile.example/private');
    expect(config.env.VITE_UNDECLARED_SECRET).toBeUndefined();
    expect(config.define?.['import.meta.env.VITE_API_BASE_URL']).toBe(
      JSON.stringify(cartWorkflowOrigin),
    );
    expect(config.server.port).toBe(4177);
    expect(config.server.strictPort).toBe(true);
  });

  it('waits for the Cart document and transformed entry instead of accepting a listener alone', async () => {
    const appHtml =
      '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>';
    const fetchReady = vi
      .fn<[input: string, init: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(new Response(appHtml, { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(appHtml, { status: 200 }))
      .mockResolvedValueOnce(
        new Response('import "/src/app/App.tsx";', {
          status: 200,
          headers: { 'content-type': 'application/javascript' },
        }),
      );
    const pause = vi.fn<[milliseconds: number], Promise<void>>().mockResolvedValue(undefined);

    await waitForCartApplicationReady('http://127.0.0.1:4177', {
      deadlineMs: 1_000,
      pollIntervalMs: 1,
      fetchReady,
      wait: pause,
    });

    expect(fetchReady.mock.calls.map(([input]) => input)).toEqual([
      'http://127.0.0.1:4177/cart',
      'http://127.0.0.1:4177/src/main.tsx',
      'http://127.0.0.1:4177/cart',
      'http://127.0.0.1:4177/src/main.tsx',
    ]);
    expect(pause).toHaveBeenCalledWith(1);
  });
});
