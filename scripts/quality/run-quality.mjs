import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectComplexitySignals,
  collectStaticFindings,
  staticSuppressions,
} from './check-static.mjs';
import {
  createLocalPatchAttestation,
  commandFailureCode,
  classifyCommandDiagnostics,
  formatCommandFailureExcerpt,
  npmVersionFromUserAgent,
  runCapturedCommand,
  reportDigest,
  REQUIRED_QUALITY_COMMAND_IDS,
  targetForCommit,
  targetForPatch,
  unexpectedDiagnosticCount,
  validateReport,
  REPORT_SCHEMA_VERSION,
} from './report-utils.mjs';
import { summaryFor } from './report-summary.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const windowsNpmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const COMMAND_OUTPUT_MAX_BUFFER = 16 * 1024 * 1024;
const qualityCommands = [
  ['format', ['run', 'format:check']],
  ['stylelint', ['run', 'stylelint']],
  ['lint', ['run', 'lint']],
  ['quality-lint', ['run', 'lint:quality']],
  ['typecheck', ['run', 'typecheck']],
  ['static-rules', ['run', 'quality:rules']],
  [
    'tests',
    [
      'test',
      '--',
      '--pool=forks',
      '--poolOptions.forks.maxForks=1',
      '--poolOptions.forks.minForks=1',
      '--poolOptions.forks.isolate=true',
    ],
  ],
  ['build', ['run', 'build']],
];
if (stableCommandIds(qualityCommands) !== stableCommandIds(REQUIRED_QUALITY_COMMAND_IDS))
  throw new Error(
    'The full report command plan must match the authoritative required command IDs.',
  );

function stableCommandIds(commands) {
  return commands.map((command) => (Array.isArray(command) ? command[0] : command)).join(',');
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function run(id, args) {
  const started = Date.now();
  const windows = process.platform === 'win32';
  const result = runCapturedCommand(
    windows ? process.execPath : npm,
    windows ? [windowsNpmCli, ...args] : args,
    {
      cwd: root,
      maxBuffer: COMMAND_OUTPUT_MAX_BUFFER,
    },
  );
  const diagnostics = classifyCommandDiagnostics(result.stdout, result.stderr);
  const hasUnexpectedDiagnostics = unexpectedDiagnosticCount(diagnostics) > 0;
  return {
    command: {
      id,
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

function currentSha(required) {
  const requested = argument('--sha', process.env.GITHUB_SHA);
  if (requested && /^[0-9a-f]{7,64}$/i.test(requested)) return requested;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  if (required || result.status !== 0)
    throw new Error('Unable to determine the current commit identity. Pass --sha explicitly.');
  return result.stdout.trim();
}

async function toolVersions() {
  const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const devDependencies = packageJson.devDependencies;
  return {
    node: process.version,
    npm: npmVersionFromUserAgent(process.env.npm_config_user_agent),
    typescript: devDependencies.typescript,
    prettier: devDependencies.prettier,
    stylelint: devDependencies.stylelint,
    eslint: devDependencies.eslint,
  };
}

const scope = argument('--scope', process.env.CI ? 'ci' : 'full');
if (!['full', 'ci'].includes(scope))
  throw new Error('Only full and ci report scopes are authoritative.');
const output = resolve(
  argument('--output', resolve(tmpdir(), 'udemy-frontend-quality-report.json')),
);
const targetPatch = argument('--target-patch');
const targetRoot = argument('--target-root');
const baseRoot = argument('--base-root');
const target =
  scope === 'ci'
    ? targetForCommit(currentSha(true))
    : targetPatch
      ? await targetForPatch(
          resolve(targetPatch),
          targetRoot && resolve(targetRoot),
          baseRoot && resolve(baseRoot),
        )
      : (() => {
          throw new Error(
            'Local full reports require --target-patch <exact no-index Review patch>.',
          );
        })();
if (scope === 'ci' && targetPatch)
  throw new Error('CI reports must use the current commit target, not a local patch.');
if (scope === 'ci' && targetRoot)
  throw new Error('CI reports must not accept a local target root.');
if (scope === 'ci' && baseRoot) throw new Error('CI reports must not accept a local base root.');
const localAttestationKey =
  scope === 'full' ? process.env.QUALITY_REPORT_ATTESTATION_KEY : undefined;
if (scope === 'full' && !localAttestationKey)
  throw new Error(
    'Local full reports require the ephemeral Manager-supplied QUALITY_REPORT_ATTESTATION_KEY after target capture.',
  );
const sha = scope === 'ci' ? target.sha : currentSha(false);
const executions = qualityCommands.map(([id, args]) => run(id, args));
const commands = executions.map(({ command }) => command);
const findings = await collectStaticFindings();
const complexity = await collectComplexitySignals();
const report = {
  schemaVersion: REPORT_SCHEMA_VERSION,
  scope,
  sha,
  target,
  generatedAt: new Date().toISOString(),
  outcome:
    commands.every((command) => command.status === 'pass') && findings.length === 0
      ? 'pass'
      : 'fail',
  commands,
  findings,
  toolVersions: await toolVersions(),
  configVersions: { reportSchema: REPORT_SCHEMA_VERSION, staticRules: 1 },
  context: {
    execution: scope === 'ci' ? 'ci' : 'local',
    scope,
    targetKind: target.kind,
    baseSha: sha,
  },
  suppressions: staticSuppressions(),
  limitations: [
    'Report pass is deterministic evidence only; it is not a semantic Review or QA verdict.',
    'Complexity signals are advisory and do not affect the outcome.',
  ],
  advisory: {
    complexitySignals: complexity,
  },
  integrity: { algorithm: 'sha256', digest: '', attestation: null },
};
report.integrity.digest = reportDigest(report);
if (scope === 'full')
  report.integrity.attestation = createLocalPatchAttestation(report, localAttestationKey);
const errors = validateReport(report);
if (errors.length)
  throw new Error(`Report generation failed schema validation: ${errors.join('; ')}`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(summaryFor(report));
for (const { command, stdout, stderr, hasUnexpectedDiagnostics } of executions) {
  const excerpt = formatCommandFailureExcerpt({
    ...command,
    stdout,
    stderr,
    hasUnexpectedDiagnostics,
  });
  if (excerpt) console.error(excerpt);
}
if (report.outcome !== 'pass') process.exitCode = 1;
