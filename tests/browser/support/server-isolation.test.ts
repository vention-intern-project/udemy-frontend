import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

import startAppShellServer from '../app-shell-server';
import startAuthWorkflowsServer from '../auth-workflows-server';
import { cartWorkflowOrigin, cartWorkflowViteConfig } from '../cart-workflow-server';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('browser server isolation probes', () => {
  it('attributes an occupied strict port and then starts representative configs concurrently', async () => {
    const blocker = createNetServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once('error', reject);
      blocker.listen(4174, '127.0.0.1', resolve);
    });
    try {
      await expect(startAppShellServer()).rejects.toThrow(/4174|address already in use/i);
    } finally {
      await new Promise<void>((resolve, reject) =>
        blocker.close((error) => (error ? reject(error) : resolve())),
      );
    }

    const [closeShell, closeAuth] = await Promise.all([
      startAppShellServer(),
      startAuthWorkflowsServer(),
    ]);
    try {
      const [shell, auth] = await Promise.all([
        fetch('http://127.0.0.1:4174/'),
        fetch('http://127.0.0.1:4175/'),
      ]);
      expect({ shell: shell.status, auth: auth.status }).toEqual({ shell: 200, auth: 200 });
    } finally {
      await Promise.all([closeShell(), closeAuth()]);
    }
  }, 20_000);

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
});
