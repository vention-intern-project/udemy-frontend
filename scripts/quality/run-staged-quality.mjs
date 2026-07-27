import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagedPredicatePlan } from './quality-decisions.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const windowsNpmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');

function stagedPaths() {
  const result = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) throw new Error('Unable to read staged paths for the pre-commit gate.');
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

const plan = stagedPredicatePlan(stagedPaths());
if (!plan.hasTargets) {
  console.log('QUALITY_STAGED_NO_TARGETS');
} else {
  const result = spawnSync(
    process.platform === 'win32' ? process.execPath : npm,
    process.platform === 'win32'
      ? [windowsNpmCli, 'run', 'precommit:staged']
      : ['run', 'precommit:staged'],
    {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    },
  );
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
