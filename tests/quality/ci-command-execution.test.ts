import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { CI_GROUP_IDS } from '../../scripts/quality/report-utils.mjs';
import type * as ReportUtilsModule from '../../scripts/quality/report-utils.mjs';

const { runCapturedCommand } = vi.hoisted(() => ({ runCapturedCommand: vi.fn() }));

vi.mock('../../scripts/quality/report-utils.mjs', async () => {
  const actual = await vi.importActual<typeof ReportUtilsModule>(
    '../../scripts/quality/report-utils.mjs',
  );
  return { ...actual, runCapturedCommand };
});

const { executeQualityGroup } = await import('../../scripts/quality/quality-commands.mjs');

afterEach(() => {
  vi.resetAllMocks();
});

function successfulResult() {
  return { status: 0, stdout: '', stderr: '', signal: null };
}

describe('real CI quality command executor', () => {
  it('executes each owned command once, retaining direct installed-Vite build routing', () => {
    runCapturedCommand.mockImplementation(successfulResult);
    const root = 'C:/private/fixture';
    const executions = CI_GROUP_IDS.flatMap((group) => executeQualityGroup(group, root));

    expect(executions.map(({ command }) => command.id).sort()).toEqual([
      'build',
      'format',
      'lint',
      'quality-lint',
      'static-rules',
      'stylelint',
      'tests',
      'typecheck',
    ]);
    expect(runCapturedCommand).toHaveBeenCalledTimes(8);
    expect(runCapturedCommand.mock.calls[runCapturedCommand.mock.calls.length - 1]).toEqual([
      process.execPath,
      [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'],
      expect.objectContaining({ cwd: root }),
    ]);
  });

  it('persists diagnostic failure data in the real command receipt shape', () => {
    runCapturedCommand.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: 'Warning: unexpected controlled diagnostic',
      signal: null,
    });

    const [execution] = executeQualityGroup('build', 'C:/private/fixture');

    expect(execution.command).toMatchObject({
      id: 'build',
      status: 'fail',
      exitCode: 0,
      errorCode: 'QUALITY_UNEXPECTED_DIAGNOSTICS',
    });
    expect(execution.hasUnexpectedDiagnostics).toBe(true);
  });
});
