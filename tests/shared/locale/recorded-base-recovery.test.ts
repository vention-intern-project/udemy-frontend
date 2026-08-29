import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const {
  RECORDED_BASE,
  recoverRecordedBase,
  // @ts-expect-error The dependency-free Node recovery module has no TypeScript declaration.
} = await import('../../../scripts/localization/recorded-base-recovery.mjs');

describe('recorded-base recovery', () => {
  it('rejects a baseline whose recorded Git blob identity does not match before workspace mutation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'learnhub-recorded-base-test-'));
    try {
      const registryPath = join(directory, 'registry.json');
      const outputPath = join(directory, 'generated.ts');
      await Promise.all([writeFile(registryPath, '{}'), writeFile(outputPath, '// unchanged')]);
      const beforeRegistry = await readFile(registryPath, 'utf8');
      const beforeOutput = await readFile(outputPath, 'utf8');
      await expect(
        recoverRecordedBase({
          registryPath,
          outputPath,
          request: {
            base: RECORDED_BASE,
            registryBaselinePath: registryPath,
            generatedBaselinePath: outputPath,
            revisionRequest: { taskId: 'CRF-001', revisions: [] },
            reconcileRequest: { taskId: 'CRF-001', sources: [], obsolete: [] },
          },
        }),
      ).rejects.toThrow(/baseline content hash/);
      expect(await readFile(registryPath, 'utf8')).toBe(beforeRegistry);
      expect(await readFile(outputPath, 'utf8')).toBe(beforeOutput);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
