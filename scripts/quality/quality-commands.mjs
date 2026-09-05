import { dirname, resolve } from 'node:path';
import {
  runCapturedCommand,
  commandFailureCode,
  classifyCommandDiagnostics,
  unexpectedDiagnosticCount,
  CI_GROUP_IDS,
  QUALITY_COMMAND_GROUPS,
  REQUIRED_QUALITY_COMMAND_IDS,
} from './report-utils.mjs';

const commandArguments = Object.freeze({
  format: ['run', 'format:check'],
  stylelint: ['run', 'stylelint'],
  lint: ['run', 'lint'],
  'quality-lint': ['run', 'lint:quality'],
  typecheck: ['run', 'typecheck'],
  'static-rules': ['run', 'quality:rules'],
  tests: [
    'test',
    '--',
    '--pool=forks',
    '--poolOptions.forks.maxForks=1',
    '--poolOptions.forks.minForks=1',
    '--poolOptions.forks.isolate=true',
    '--testTimeout=60000',
    '--hookTimeout=60000',
  ],
  build: ['run', 'build'],
});
const commandOutputMaxBuffer = 16 * 1024 * 1024;

function planEntry(id, mode) {
  if (id === 'build' && mode === 'ci-group') return { id, runner: 'vite', args: ['build'] };
  return { id, runner: 'npm', args: commandArguments[id] };
}

export function qualityCommandPlan({ mode, group }) {
  if (mode === 'full') return REQUIRED_QUALITY_COMMAND_IDS.map((id) => planEntry(id, mode));
  if (mode !== 'ci-group' || !CI_GROUP_IDS.includes(group))
    throw new Error('A known CI command group is required.');
  return QUALITY_COMMAND_GROUPS[group].map((id) => planEntry(id, mode));
}

export function executeQualityCommand(entry, root) {
  const started = Date.now();
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const windowsNpmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const command =
    entry.runner === 'vite'
      ? process.execPath
      : process.platform === 'win32'
        ? process.execPath
        : npm;
  const args =
    entry.runner === 'vite'
      ? [resolve(root, 'node_modules/vite/bin/vite.js'), ...entry.args]
      : process.platform === 'win32'
        ? [windowsNpmCli, ...entry.args]
        : entry.args;
  const result = runCapturedCommand(command, args, {
    cwd: root,
    maxBuffer: commandOutputMaxBuffer,
  });
  const diagnostics = classifyCommandDiagnostics(result.stdout, result.stderr);
  const hasUnexpectedDiagnostics = unexpectedDiagnosticCount(diagnostics) > 0;
  return {
    command: {
      id: entry.id,
      status: result.status === 0 && !result.error && !hasUnexpectedDiagnostics ? 'pass' : 'fail',
      durationMs: Date.now() - started,
      exitCode: result.status ?? null,
      errorCode: commandFailureCode(result, hasUnexpectedDiagnostics),
      diagnostics,
    },
    stdout: result.stdout,
    stderr: result.stderr,
    hasUnexpectedDiagnostics,
  };
}

export function executeQualityGroup(group, root) {
  return qualityCommandPlan({ mode: 'ci-group', group }).map((entry) =>
    executeQualityCommand(entry, root),
  );
}
