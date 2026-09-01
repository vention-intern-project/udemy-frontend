import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { delimiter, dirname, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analyseSourceText,
  collectImportCycleFindings,
  complexitySignals,
} from '../../scripts/quality/check-static.mjs';
import {
  createLocalPatchAttestation,
  commandFailureCode,
  classifyCommandDiagnostics,
  collectVitestTestIdentifiers,
  FAILED_COMMAND_OUTPUT_MAX_CHARS,
  FAILED_COMMAND_OUTPUT_MAX_LINES,
  formatCommandFailureExcerpt,
  reportDigest,
  REPORT_CLOCK_SKEW_TOLERANCE_MINUTES,
  REPORT_SCHEMA_VERSION,
  REQUIRED_QUALITY_COMMAND_IDS,
  targetForCommit,
  unexpectedDiagnosticCount,
  npmVersionFromUserAgent,
  runCapturedCommand,
  targetForPatch,
  validateReport,
  validateReportAdmission,
  validateSchemaDefinition,
  verifyReportTarget,
} from '../../scripts/quality/report-utils.mjs';
import { summaryFor } from '../../scripts/quality/report-summary.mjs';
import {
  evaluateCiAggregate,
  evaluateStagedGate,
  qualityTargetForEvent,
  stagedPredicatePlan,
} from '../../scripts/quality/quality-decisions.mjs';

interface QualityTarget {
  kind: 'local_patch';
  patchSha256: string;
  changedPaths: string[];
}

interface DiagnosticSummary {
  allowedRouterFutureWarnings: number;
  unexpectedReactActWarnings: number;
  unexpectedUnhandledRejections: number;
  unexpectedConsoleWarnings: number;
  unexpectedGenericWarnings: number;
}

interface QualityCommand {
  id: (typeof REQUIRED_QUALITY_COMMAND_IDS)[number];
  status: 'pass' | 'fail';
  durationMs: number;
  exitCode: number | null;
  errorCode: string | null;
  diagnostics: DiagnosticSummary;
}

interface QualityReportFixture {
  schemaVersion: number;
  scope: 'full';
  sha: string;
  target: QualityTarget;
  generatedAt: string;
  outcome: 'pass' | 'fail';
  toolVersions: Record<string, string>;
  configVersions: { reportSchema: number; staticRules: number };
  context: { execution: 'local'; scope: 'full'; targetKind: 'local_patch'; baseSha: string };
  commands: QualityCommand[];
  findings: [];
  suppressions: [];
  limitations: string[];
  advisory: { complexitySignals: [] };
  integrity: {
    algorithm: 'sha256';
    digest: string;
    attestation: { algorithm: 'hmac-sha256'; digest: string } | null;
  };
}

interface NativeEslintMessage {
  ruleId: string | null;
  message: string;
}

interface NativeEslintResult {
  messages: NativeEslintMessage[];
}

interface NativeEslintConfig {
  rules: Record<string, unknown>;
  parserOptions: { project?: string[] };
}

interface NativeEslint {
  lintText(source: string, options: { filePath: string }): Promise<NativeEslintResult[]>;
  calculateConfigForFile(filePath: string): Promise<NativeEslintConfig>;
}

interface NativeEslintConstructor {
  new (options: { cwd: string; useEslintrc: boolean }): NativeEslint;
}

const temporaryPaths: string[] = [];
const fixtureRoot = resolve('tests/quality/fixtures/static');
const testAttestationKey = randomBytes(32).toString('base64url');
const formatterFixtureTestIdentifiers = Object.freeze([
  'tests/quality/diagnostic-owner.test.ts',
  'tests/quality/failing-example.test.ts',
  'tests/quality/flag-owner.test.ts',
  'tests/quality/second-example.spec.tsx',
  'tests/quality/second-owner.spec.tsx',
]);
type CommandFailureExcerptInput = Parameters<typeof formatCommandFailureExcerpt>[0];
function formatFixtureCommandFailureExcerpt(
  command: Omit<CommandFailureExcerptInput, 'knownTestIdentifiers'>,
) {
  return formatCommandFailureExcerpt({
    ...command,
    knownTestIdentifiers: formatterFixtureTestIdentifiers,
  });
}
const { ESLint } = createRequire(import.meta.url)('eslint') as {
  ESLint: NativeEslintConstructor;
};

describe('quality execution provenance', () => {
  it('uses one isolated fork only for the embedded quality-report test command', async () => {
    const qualityRunner = await readFile(resolve('scripts/quality/run-quality.mjs'), 'utf8');
    const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as {
      scripts: { test: string };
    };

    expect(qualityRunner).toContain(
      "'--pool=forks',\n      '--poolOptions.forks.maxForks=1',\n      '--poolOptions.forks.minForks=1',\n      '--poolOptions.forks.isolate=true',",
    );
    expect(qualityRunner).not.toContain('--poolOptions.forks.singleFork=true');
    expect(packageJson.scripts.test).toBe('vitest run');
  });

  it('snapshots actual workspace Vitest identifiers before child commands run', async () => {
    const qualityRunner = await readFile(resolve('scripts/quality/run-quality.mjs'), 'utf8');
    const identifiers = collectVitestTestIdentifiers(process.cwd());

    expect(identifiers).toContain('tests/quality/run-quality.test.ts');
    expect(identifiers).toContain('tests/app/app-shell.test.tsx');
    expect(
      qualityRunner.indexOf('const knownTestIdentifiers = collectVitestTestIdentifiers(root);'),
    ).toBeLessThan(
      qualityRunner.indexOf(
        'const executions = qualityCommands.map(([id, args]) => run(id, args));',
      ),
    );
    expect(qualityRunner).toContain('knownTestIdentifiers,');
  });

  it("captures output above Node's default and fails closed at an explicit bounded cap", () => {
    const megabyte = 1024 * 1024;
    const verbose = runCapturedCommand(
      process.execPath,
      ['-e', `process.stdout.write('x'.repeat(${megabyte + 1}))`],
      { maxBuffer: 16 * megabyte },
    );
    expect(verbose.status).toBe(0);
    expect(verbose.stdout).toHaveLength(megabyte + 1);
    const overflow = runCapturedCommand(
      process.execPath,
      ['-e', `process.stdout.write('x'.repeat(${megabyte * 2}))`],
      { maxBuffer: megabyte },
    );
    expect(overflow.status).not.toBe(0);
    expect(overflow.error?.code).toBe('ENOBUFS');
    const missing = runCapturedCommand('mai002-missing-command', []);
    expect(missing.status).toBeNull();
    expect(missing.error?.code).toBe('ENOENT');
    expect(missing.stdout).toBe('');
    expect(missing.stderr).toBe('');
    expect(missing.signal).toBeNull();
    expect(commandFailureCode(missing, false)).toBe('ENOENT');
    const hostileOptions = { shell: true, encoding: 'buffer' } as unknown as {
      cwd?: string;
      maxBuffer?: number;
    };
    const protectedCapture = runCapturedCommand(
      process.execPath,
      ['-e', 'process.stdout.write("utf8-safe")'],
      hostileOptions,
    );
    expect(protectedCapture.status).toBe(0);
    expect(protectedCapture.stdout).toBe('utf8-safe');
    expect(typeof protectedCapture.stdout).toBe('string');
    const shellAttempt = runCapturedCommand(
      'mai002-shell-ignored; echo unsafe',
      [],
      hostileOptions,
    );
    expect(shellAttempt.error?.code).toBe('ENOENT');
  });

  it('emits only allowlisted Vitest file identifiers and never quoted JSON values', () => {
    const failure = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: null,
      stdout: [
        '\u001B[31m FAIL  tests/quality/failing-example.test.ts > identifies the failing test {"x-api-key":"json-sentinel","password":"json-password-sentinel"}',
        'AssertionError: expected "received-sentinel" to deeply equal "expected-sentinel"',
        'https://user:password@example.test/private-header',
        'contact quality@example.test',
      ].join('\n'),
      stderr: 'Error: arbitrary stderr must not be emitted',
    });

    expect(failure).toBe(
      'QUALITY_COMMAND_FAILURE id=tests exitCode=1 errorCode=none\n' +
        'failure-identifiers=tests/quality/failing-example.test.ts',
    );
    expect(failure).not.toContain('json-sentinel');
    expect(failure).not.toContain('json-password-sentinel');
  });

  it('normalizes supported POSIX and Windows Vitest paths, deduplicates them, and stays control-safe', () => {
    const failure = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: null,
      stdout: [
        ' FAIL  first [ tests/quality/failing-example.test.ts ]',
        ' FAIL  duplicate [ tests\\quality\\failing-example.test.ts ]',
        ' FAIL  second [ tests\\quality\\second-example.spec.tsx ]',
      ].join('\n'),
      stderr: '',
    });

    expect(failure).toBe(
      'QUALITY_COMMAND_FAILURE id=tests exitCode=1 errorCode=none\n' +
        'failure-identifiers=tests/quality/failing-example.test.ts,tests/quality/second-example.spec.tsx',
    );
    expect(
      Array.from(failure ?? '').some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return character !== '\n' && (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f));
      }),
    ).toBe(false);
  });

  it('emits only allowlisted unexpected-diagnostic owner identifiers', () => {
    const diagnostic = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 0,
      errorCode: 'QUALITY_UNEXPECTED_DIAGNOSTICS',
      stdout: 'ordinary stdout must not be emitted',
      stderr: [
        '\u001B[90m stderr | tests/quality/diagnostic-owner.test.ts > warning {"x-api-key":"diagnostic-secret"}\r',
        'stderr | tests\\quality\\diagnostic-owner.test.ts > duplicate',
        'stderr | tests/quality/second-owner.spec.tsx > https://user:password@example.test/path',
        'prefix stderr | tests/quality/fabricated-prefix.test.ts > fabricated',
        'stderr | ../outside.test.ts > traversal',
        'stderr | C:\\outside.test.ts > drive path',
        'stderr | /outside.test.ts > absolute path',
        'warning stderr | tests/quality/fabricated-mid-line.test.ts > fabricated',
      ].join('\n'),
    });

    expect(diagnostic).toBe(
      'QUALITY_COMMAND_FAILURE id=tests exitCode=0 errorCode=QUALITY_UNEXPECTED_DIAGNOSTICS\n' +
        'failure-identifiers=unavailable\n' +
        'diagnostic-identifiers=tests/quality/diagnostic-owner.test.ts,tests/quality/second-owner.spec.tsx',
    );
    expect(diagnostic).not.toContain('diagnostic-secret');
    expect(diagnostic).not.toContain('user:password');
    expect(diagnostic).not.toContain('fabricated');

    const diagnosticFlag = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 0,
      errorCode: null,
      hasUnexpectedDiagnostics: true,
      stdout: '',
      stderr: 'stderr | tests/quality/flag-owner.test.ts > title',
    });
    expect(diagnosticFlag).toContain('diagnostic-identifiers=tests/quality/flag-owner.test.ts');
  });

  it('reports unavailable test identifiers without emitting arbitrary output and keeps non-test failures metadata-only', () => {
    expect(
      formatFixtureCommandFailureExcerpt({
        id: 'tests',
        status: 'pass',
        exitCode: 0,
        errorCode: null,
        stdout: 'passing output',
        stderr: '',
      }),
    ).toBeNull();

    const unavailable = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: null,
      stdout: 'FAIL without a supported bracketed file path: {"password":"unavailable-secret"}',
      stderr: 'https://token@example.test/path',
    });
    expect(unavailable).toBe(
      'QUALITY_COMMAND_FAILURE id=tests exitCode=1 errorCode=none\n' +
        'failure-identifiers=unavailable',
    );
    expect(unavailable).not.toContain('unavailable-secret');
    expect(unavailable).not.toContain('token@example.test');

    const prefixed = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: null,
      stdout: [
        'arbitrary prefix FAIL tests/quality/fabricated-leading.test.ts > fabricated',
        'arbitrary prefix FAIL fabricated [ tests/quality/fabricated-bracketed.test.ts ]',
      ].join('\n'),
      stderr: '',
    });
    expect(prefixed).toBe(
      'QUALITY_COMMAND_FAILURE id=tests exitCode=1 errorCode=none\n' +
        'failure-identifiers=unavailable',
    );

    const nonTestFailure = formatFixtureCommandFailureExcerpt({
      id: 'lint',
      status: 'fail',
      exitCode: 2,
      errorCode: 'ESLINT_FAILURE',
      stdout: 'arbitrary stdout',
      stderr: 'arbitrary stderr',
    });
    expect(nonTestFailure).toBe(
      'QUALITY_COMMAND_FAILURE id=lint exitCode=2 errorCode=ESLINT_FAILURE',
    );
    const bounded = formatFixtureCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: null,
      stdout: Array.from(
        { length: 10 },
        (_, index) => ` FAIL  bounded [ tests/${'a'.repeat(295)}${index}.test.ts ]`,
      ).join('\n'),
      stderr: '',
    });
    expect(Array.from(bounded ?? '').length).toBeLessThanOrEqual(FAILED_COMMAND_OUTPUT_MAX_CHARS);
    expect((bounded ?? '').split('\n').length).toBeLessThanOrEqual(FAILED_COMMAND_OUTPUT_MAX_LINES);

    const combinedIdentifiers = Array.from(
      { length: 8 },
      (_, index) => `tests/${'a'.repeat(305)}${index}.test.ts`,
    );
    const combined = formatCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: 'QUALITY_UNEXPECTED_DIAGNOSTICS',
      stdout: combinedIdentifiers
        .map((identifier) => ` FAIL  bounded [ ${identifier} ]`)
        .join('\n'),
      stderr: combinedIdentifiers
        .map((identifier) => `stderr | ${identifier.replace(/a/g, 'b')} > warning`)
        .join('\n'),
      knownTestIdentifiers: [
        ...combinedIdentifiers,
        ...combinedIdentifiers.map((identifier) => identifier.replace(/a/g, 'b')),
      ],
    });
    expect(Array.from(combined ?? '').length).toBeLessThanOrEqual(FAILED_COMMAND_OUTPUT_MAX_CHARS);
    expect((combined ?? '').split('\n').length).toBeLessThanOrEqual(
      FAILED_COMMAND_OUTPUT_MAX_LINES,
    );
    expect(combined).toContain('failure-identifiers=tests/');
    expect(combined).toContain('diagnostic-identifiers=');
  });

  it('emits only pre-execution workspace test identifiers from failed-test output', () => {
    const actualIdentifier = 'tests/quality/run-quality.test.ts';
    const encodedSecretIdentifier = 'tests/quality/encoded-attestation-value.test.ts';
    const excerpt = formatCommandFailureExcerpt({
      id: 'tests',
      status: 'fail',
      exitCode: 1,
      errorCode: 'QUALITY_UNEXPECTED_DIAGNOSTICS',
      stdout: [
        ` FAIL  ${actualIdentifier} > real failure`,
        ` FAIL  ${encodedSecretIdentifier} > fake failure`,
      ].join('\n'),
      stderr: [
        `stderr | ${actualIdentifier} > real diagnostic`,
        `stderr | ${encodedSecretIdentifier} > fake diagnostic`,
      ].join('\n'),
      knownTestIdentifiers: [actualIdentifier],
    });

    expect(excerpt).toContain(`failure-identifiers=${actualIdentifier}`);
    expect(excerpt).toContain(`diagnostic-identifiers=${actualIdentifier}`);
    expect(excerpt).not.toContain('encoded-attestation-value');
  });

  it('parses npm semver only from the standard lifecycle user agent', () => {
    expect(npmVersionFromUserAgent('npm/10.8.2 node/v24.18.0 win32 x64')).toBe('10.8.2');
    expect(npmVersionFromUserAgent('node/v24.18.0 npm/11.0.0-rc.1+build.1 linux x64')).toBe(
      '11.0.0-rc.1+build.1',
    );
    for (const invalidVersion of [
      '10.8.2-..',
      '10.8.2-01',
      '10.8.2+build..meta',
      '01.8.2',
      '10.08.2',
      '10.8.02',
      '10.8.2-',
      '10.8.2+',
      '10.8.2-rc_1',
      '10.8.2extra',
    ])
      expect(npmVersionFromUserAgent(`npm/${invalidVersion} node/v24.18.0`)).toBe('unknown');
    expect(npmVersionFromUserAgent()).toBe('unknown');
  });

  it('uses an explicit verified Git Bash override on Windows and never selects WSL bash', () => {
    if (process.platform !== 'win32') {
      expect(resolveGitBash()).toBe('bash');
      return;
    }
    const detected = resolveGitBash();
    expect(resolveGitBash({ ...process.env, QUALITY_TEST_GIT_BASH: detected })).toBe(detected);
    expect(gitForWindowsRoot('C:\\Windows\\System32\\bash.exe')).toBeUndefined();
  });
});

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function patchTarget(name: string, changedPath = 'scripts/quality/example.mjs') {
  const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-'));
  temporaryPaths.push(directory);
  const patchPath = resolve(directory, `${name}.patch`);
  await writeFile(
    patchPath,
    `diff --git a/${changedPath} b/${changedPath}\n--- a/${changedPath}\n+++ b/${changedPath}\n@@ -0,0 +1 @@\n+export {};\n`,
  );
  return { patchPath, target: await targetForPatch(patchPath) };
}

function validReport(
  target: QualityTarget,
  outcome: 'pass' | 'fail' = 'pass',
): QualityReportFixture {
  const report: QualityReportFixture = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    scope: 'full',
    sha: 'd8e64dcdeb14288a7eb831e97879d50f4ed078db',
    target,
    generatedAt: new Date().toISOString(),
    outcome,
    toolVersions: {
      node: 'v22',
      npm: '10',
      typescript: '5',
      prettier: '3',
      stylelint: '16',
      eslint: '8',
    },
    configVersions: { reportSchema: REPORT_SCHEMA_VERSION, staticRules: 1 },
    context: {
      execution: 'local',
      scope: 'full',
      targetKind: 'local_patch',
      baseSha: 'd8e64dcdeb14288a7eb831e97879d50f4ed078db',
    },
    commands: REQUIRED_QUALITY_COMMAND_IDS.map((id) => ({
      id,
      status: outcome === 'pass' ? 'pass' : 'fail',
      durationMs: 1,
      exitCode: outcome === 'pass' ? 0 : 1,
      errorCode: null,
      diagnostics: {
        allowedRouterFutureWarnings: 0,
        unexpectedReactActWarnings: 0,
        unexpectedUnhandledRejections: 0,
        unexpectedConsoleWarnings: 0,
        unexpectedGenericWarnings: 0,
      },
    })),
    findings: [],
    suppressions: [],
    limitations: ['Report evidence remains an entry predicate, not a Review verdict.'],
    advisory: { complexitySignals: [] },
    integrity: { algorithm: 'sha256', digest: '', attestation: null },
  };
  sealReport(report);
  return report;
}

function sealReport(report: QualityReportFixture, key = testAttestationKey) {
  report.integrity.digest = reportDigest(report);
  report.integrity.attestation = createLocalPatchAttestation(report, key);
}

function validCiReport(sha: string) {
  const local = validReport({
    kind: 'local_patch',
    patchSha256: 'f'.repeat(64),
    changedPaths: ['scripts/quality/example.mjs'],
  });
  const report = {
    ...local,
    scope: 'ci',
    sha,
    target: { kind: 'commit', sha },
    context: { execution: 'ci', scope: 'ci', targetKind: 'commit', baseSha: sha },
    integrity: { algorithm: 'sha256', digest: '', attestation: null },
  };
  report.integrity.digest = reportDigest(report);
  return report;
}

function productionAggregateGuard(
  workflow: string,
  resolverResult: string,
  qualityTargetSha: string,
) {
  const match = workflow.match(
    /- name: Guard resolved quality target before artifact or checkout\r?\n\s+shell: bash\r?\n\s+run: \|\r?\n((?: {10}.*\r?\n)+)(?= {6}- )/,
  );
  if (!match) throw new Error('Unable to locate the production aggregate guard.');
  const script = match[1].replace(/^ {10}/gm, '');
  const environment = [
    `export TARGET_RESOLUTION_RESULT=${JSON.stringify(resolverResult)}`,
    `export QUALITY_TARGET_SHA=${JSON.stringify(qualityTargetSha)}`,
  ].join('\n');
  return spawnSync(resolveGitBash(), ['-c', `${environment}\n${script}`], {
    encoding: 'utf8',
  });
}

function gitForWindowsRoot(candidate: string) {
  if (/[/\\]windows[/\\]system32[/\\]bash\.exe$/i.test(candidate)) return undefined;
  let directory = dirname(candidate);
  for (let depth = 0; depth < 3; depth += 1) {
    const git = resolve(directory, 'cmd', 'git.exe');
    if (existsSync(git)) return git;
    directory = dirname(directory);
  }
  return undefined;
}

function resolveGitBash(environment: NodeJS.ProcessEnv = process.env) {
  if (process.platform !== 'win32') return 'bash';
  const pathCandidates = (environment.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .map((entry) => resolve(entry, 'bash.exe'));
  const candidates = [
    environment.QUALITY_TEST_GIT_BASH,
    environment.ProgramFiles && resolve(environment.ProgramFiles, 'Git', 'bin', 'bash.exe'),
    environment.ProgramW6432 && resolve(environment.ProgramW6432, 'Git', 'bin', 'bash.exe'),
    environment.LOCALAPPDATA &&
      resolve(environment.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'),
    ...pathCandidates,
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    const git = gitForWindowsRoot(candidate);
    if (!git || !existsSync(candidate)) continue;
    const verification = spawnSync(git, ['--version'], { encoding: 'utf8', shell: false });
    if (verification.status === 0 && /git version \d/.test(verification.stdout)) return candidate;
  }
  throw new Error('A verified Git-for-Windows bash.exe is required for this Windows regression.');
}

async function nativeLintMessages(filePath: string, source: string) {
  const eslint = new ESLint({ cwd: resolve('.'), useEslintrc: true });
  const [result] = await eslint.lintText(source, { filePath: resolve(filePath) });
  return result.messages;
}

describe('quality static predicates', () => {
  it('allows Node globals only in the public CJS configuration owners while retaining no-undef', async () => {
    await expect(
      nativeLintMessages('stylelint.config.cjs', 'module.exports = unknownFixture;'),
    ).resolves.toEqual([
      expect.objectContaining({
        ruleId: 'no-undef',
        message: "'unknownFixture' is not defined.",
      }),
    ]);
  });

  it('retains AST analysis only for indexed projections and the documented direct-cycle fallback', async () => {
    const allowedAdapter = await readFile(
      resolve(fixtureRoot, 'allowed-compatibility-adapter.ts'),
      'utf8',
    );
    const allowedComplex = await readFile(resolve(fixtureRoot, 'allowed-complex.ts'), 'utf8');
    const deniedProjection = await readFile(resolve(fixtureRoot, 'denied-projection.ts'), 'utf8');
    expect(
      analyseSourceText(
        'tests/quality/fixtures/static/allowed-compatibility-adapter.ts',
        allowedAdapter,
      ),
    ).toEqual([]);
    expect(
      analyseSourceText('tests/quality/fixtures/static/allowed-complex.ts', allowedComplex),
    ).toEqual([]);
    expect(
      analyseSourceText('src/features/course/types.ts', deniedProjection).map(
        (entry) => entry.ruleId,
      ),
    ).toEqual(['TS-TYPE-002']);
  });

  it('proves native ESLint owns import-layer and shortest private-entry restrictions for imports and re-exports', async () => {
    const deniedLayer = await readFile(resolve(fixtureRoot, 'denied-layer.ts'), 'utf8');
    const deniedDeep = await readFile(resolve(fixtureRoot, 'denied-deep-import.ts'), 'utf8');
    const deniedReExport = await readFile(resolve(fixtureRoot, 'denied-re-export.ts'), 'utf8');
    const deniedMultiline = await readFile(
      resolve(fixtureRoot, 'denied-multiline-import.ts'),
      'utf8',
    );
    await expect(nativeLintMessages('src/shared/api/index.ts', deniedLayer)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'no-restricted-imports' })]),
    );
    await expect(nativeLintMessages('src/pages/index.ts', deniedDeep)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'no-restricted-imports' })]),
    );
    await expect(nativeLintMessages('src/shared/api/index.ts', deniedReExport)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'no-restricted-imports' })]),
    );
    await expect(nativeLintMessages('src/shared/api/index.ts', deniedMultiline)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'no-restricted-imports' })]),
    );

    const shortestAliasCases = [
      ['@app/query', '@app/query/private'],
      ['@pages/catalog-page', '@pages/catalog-page/private'],
      ['@widgets/catalog-filter-bar', '@widgets/catalog-filter-bar/private'],
      ['@features/catalog-discovery', '@features/catalog-discovery/query'],
      ['@entities/course', '@entities/course/dto'],
      ['@shared/ui/primitives', '@shared/ui/primitives/internal/Button'],
    ];
    for (const [allowedEntry, deniedEntry] of shortestAliasCases) {
      await expect(
        nativeLintMessages(
          'src/app/index.ts',
          `import type { Fixture } from '${allowedEntry}'; export type AllowedFixture = Fixture;`,
        ),
      ).resolves.toEqual([]);
      await expect(
        nativeLintMessages('src/app/index.ts', `export type { Fixture } from '${deniedEntry}';`),
      ).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ ruleId: 'no-restricted-imports' })]),
      );
    }

    const eslint = new ESLint({ cwd: resolve('.'), useEslintrc: true });
    const config = await eslint.calculateConfigForFile(resolve('src/features/index.ts'));
    expect((config.rules['@typescript-eslint/consistent-type-imports'] as unknown[])[0]).toBe(
      'error',
    );
    expect((config.rules['import/no-cycle'] as unknown[])[0]).toBe('error');
    expect(config.parserOptions.project).toEqual(['./tsconfig.eslint.json']);
    expect((config.rules['@typescript-eslint/await-thenable'] as unknown[])[0]).toBe('error');
    expect((config.rules['@typescript-eslint/no-floating-promises'] as unknown[])[0]).toBe('error');
    expect((config.rules['@typescript-eslint/no-misused-promises'] as unknown[])[0]).toBe('error');
  });

  it('proves the scoped type-aware rules catch type-dependent defects and retain the reviewed callback exception', async () => {
    const awaitMessages = await nativeLintMessages(
      'src/app/index.ts',
      'async function fixture() { await 1; }\nvoid fixture();',
    );
    expect(awaitMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: '@typescript-eslint/await-thenable' }),
      ]),
    );
    const floatingMessages = await nativeLintMessages(
      'src/app/index.ts',
      'declare function pending(): Promise<void>;\npending();',
    );
    expect(floatingMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: '@typescript-eslint/no-floating-promises' }),
      ]),
    );
    const conditionalMessages = await nativeLintMessages(
      'src/app/index.ts',
      'declare const pending: Promise<boolean>;\nif (pending) { /* fixture */ }',
    );
    expect(conditionalMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: '@typescript-eslint/no-misused-promises' }),
      ]),
    );
    await expect(
      nativeLintMessages(
        'src/app/index.ts',
        'declare function callback(value: () => void): void;\ndeclare function pending(): Promise<void>;\ncallback(pending);',
      ),
    ).resolves.toEqual([]);
  });

  it('detects only direct source-resolved import cycles and keeps complexity advisory', () => {
    expect(
      collectImportCycleFindings([
        {
          file: 'src/features/a/index.ts',
          content: "import { b } from '@features/b'; export { b };",
        },
        { file: 'src/features/b/index.ts', content: "export { a } from '@features/a';" },
      ]),
    ).toHaveLength(1);
    expect(
      complexitySignals(
        'if (a) {} if (b) {} if (c) {} if (d) {} if (e) {} if (f) {} if (g) {} if (h) {}',
      ),
    ).toHaveLength(1);
    expect(complexitySignals('const short = true;')).toHaveLength(0);
  });
});

describe('quality report schema and exact-target admission', () => {
  it('consumes a supported schema and rejects unsupported schema keywords', () => {
    expect(
      validateSchemaDefinition({ type: 'object', properties: { value: { type: 'string' } } }),
    ).toEqual([]);
    expect(validateSchemaDefinition({ contains: { type: 'string' } })[0]).toContain(
      'Unsupported report schema keyword',
    );
  });

  it('canonicalizes Windows no-index patch paths to the frontend-relative review scope', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-windows-'));
    temporaryPaths.push(directory);
    const patchPath = resolve(directory, 'windows.patch');
    await writeFile(
      patchPath,
      '+++ "b/C:\\\\Users\\\\example-user\\\\Projects\\\\sample\\\\udemy-frontend\\\\scripts\\\\quality\\\\report-utils.mjs"\n',
    );
    await expect(targetForPatch(patchPath)).resolves.toMatchObject({
      changedPaths: ['scripts/quality/report-utils.mjs'],
    });
  });

  it('requires the captured after-tree root when a local patch has no repository marker', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-snapshot-'));
    temporaryPaths.push(directory);
    const afterRoot = resolve(directory, 'after-evidence');
    const patchPath = resolve(directory, 'snapshot.patch');
    await writeFile(
      patchPath,
      `+++ "b/${afterRoot.replace(/\\/g, '\\\\')}\\\\scripts\\\\quality\\\\report-utils.mjs"\n`,
    );
    await expect(targetForPatch(patchPath)).rejects.toThrow('supply --target-root');
    await expect(targetForPatch(patchPath, afterRoot)).resolves.toMatchObject({
      changedPaths: ['scripts/quality/report-utils.mjs'],
    });
  });

  it('requires explicit snapshot roots for side-prefixed absolute POSIX paths', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-posix-snapshot-'));
    temporaryPaths.push(directory);
    const afterRoot = '/tmp/mai002-after-evidence';
    const beforeRoot = '/tmp/mai002-before-evidence';
    const patchPath = resolve(directory, 'posix-snapshot.patch');
    await writeFile(
      patchPath,
      `--- a/${beforeRoot}/src/changed.ts\n+++ b/${afterRoot}/src/changed.ts\n`,
    );

    await expect(targetForPatch(patchPath)).rejects.toThrow('supply --target-root');
    await expect(targetForPatch(patchPath, afterRoot)).rejects.toThrow(
      'supply --target-root and --base-root',
    );
    await expect(targetForPatch(patchPath, afterRoot, beforeRoot)).resolves.toMatchObject({
      changedPaths: ['src/changed.ts'],
    });
  });

  it('requires explicit sibling snapshot roots for Windows absolute before-side paths', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-sibling-roots-'));
    temporaryPaths.push(directory);
    const beforeRoot = resolve(directory, 'before-e032');
    const afterRoot = resolve(directory, 'after-e056');
    const beforePath = beforeRoot.replace(/\\/g, '\\\\');
    const afterPath = afterRoot.replace(/\\/g, '\\\\');
    const modificationPatch = resolve(directory, 'modification.patch');
    const mixedPatch = resolve(directory, 'mixed.patch');
    const deletionPatch = resolve(directory, 'deletion.patch');
    const unsafeRootPatch = resolve(directory, 'unsafe-root.patch');
    const traversalPatch = resolve(directory, 'traversal.patch');
    const nestedTraversalPatch = resolve(directory, 'nested-traversal.patch');
    const windowsTraversalPatch = resolve(directory, 'windows-traversal.patch');
    const absoluteRootTraversalPatch = resolve(directory, 'absolute-root-traversal.patch');
    const normalizedSafePatch = resolve(directory, 'normalized-safe.patch');

    await writeFile(
      modificationPatch,
      `--- "a/${beforePath}\\src\\changed.ts"\n+++ "b/${afterPath}\\src\\changed.ts"\n`,
    );
    await expect(targetForPatch(modificationPatch, afterRoot)).rejects.toThrow(
      'supply --target-root and --base-root',
    );
    await expect(targetForPatch(modificationPatch, afterRoot, beforeRoot)).resolves.toMatchObject({
      changedPaths: ['src/changed.ts'],
    });

    await writeFile(
      mixedPatch,
      `--- "a/${beforePath}\\src\\deleted.ts"\n+++ /dev/null\n--- /dev/null\n+++ "b/${afterPath}\\src\\added.ts"\n--- "a/${beforePath}\\src\\old-name.ts"\n+++ "b/${afterPath}\\src\\new-name.ts"\n`,
    );
    await expect(targetForPatch(mixedPatch, afterRoot, beforeRoot)).resolves.toMatchObject({
      changedPaths: ['src/added.ts', 'src/deleted.ts', 'src/new-name.ts', 'src/old-name.ts'],
    });

    await writeFile(deletionPatch, `--- "a/${beforePath}\\src\\obsolete.ts"\n+++ /dev/null\n`);
    const deletionTarget = await targetForPatch(deletionPatch, afterRoot, beforeRoot);
    const deletionReport = validReport(deletionTarget);
    expect(
      validateReportAdmission(deletionReport, {
        target: deletionTarget,
        scope: 'full',
        localAttestationKey: testAttestationKey,
      }),
    ).toEqual([]);

    await writeFile(
      unsafeRootPatch,
      `--- "a/C:\\unsafe\\outside\\src\\outside.ts"\n+++ "b/${afterPath}\\src\\changed.ts"\n`,
    );
    await expect(targetForPatch(unsafeRootPatch, afterRoot, beforeRoot)).rejects.toThrow(
      'frontend-relative',
    );
    await writeFile(traversalPatch, '--- a/../escape.ts\n+++ b/src/changed.ts\n');
    await expect(targetForPatch(traversalPatch, afterRoot, beforeRoot)).rejects.toThrow(
      'escapes the logical frontend root',
    );

    await writeFile(nestedTraversalPatch, '--- a/src/../../escape.ts\n+++ b/src/changed.ts\n');
    await expect(targetForPatch(nestedTraversalPatch, afterRoot, beforeRoot)).rejects.toThrow(
      'escapes the logical frontend root',
    );
    await writeFile(
      windowsTraversalPatch,
      '--- a/src\\..\\..\\escape.ts\n+++ b/src\\nested\\file.ts\n',
    );
    await expect(targetForPatch(windowsTraversalPatch, afterRoot, beforeRoot)).rejects.toThrow(
      'escapes the logical frontend root',
    );
    await writeFile(
      absoluteRootTraversalPatch,
      `--- "a/${beforePath}\\src\\..\\..\\escape.ts"\n+++ /dev/null\n`,
    );
    await expect(targetForPatch(absoluteRootTraversalPatch, afterRoot, beforeRoot)).rejects.toThrow(
      'escapes the logical frontend root',
    );
    await writeFile(
      normalizedSafePatch,
      '--- a/src/../safe.ts\n+++ b/safe.ts\n--- a/src/nested/file.ts\n+++ b/src/nested/file.ts\n',
    );
    await expect(targetForPatch(normalizedSafePatch, afterRoot, beforeRoot)).resolves.toMatchObject(
      {
        changedPaths: ['safe.ts', 'src/nested/file.ts'],
      },
    );
  });

  it('includes normalized add, modify, delete, mixed, and rename-as-delete-add patch paths', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-patches-'));
    temporaryPaths.push(directory);
    const cases = [
      ['add', '--- /dev/null\n+++ b/src/added.ts\n', ['src/added.ts']],
      ['modify', '--- a/src/changed.ts\n+++ b/src/changed.ts\n', ['src/changed.ts']],
      ['delete', '--- a/src/deleted.ts\n+++ /dev/null\n', ['src/deleted.ts']],
      [
        'mixed',
        '--- a/src/deleted.ts\n+++ /dev/null\n--- /dev/null\n+++ b/src/added.ts\n',
        ['src/added.ts', 'src/deleted.ts'],
      ],
      [
        'rename',
        '--- a/src/old-name.ts\n+++ b/src/new-name.ts\n',
        ['src/new-name.ts', 'src/old-name.ts'],
      ],
    ] as const;
    for (const [name, content, changedPaths] of cases) {
      const patchPath = resolve(directory, `${name}.patch`);
      await writeFile(patchPath, content);
      await expect(targetForPatch(patchPath)).resolves.toMatchObject({ changedPaths });
    }
  });

  it('admits a deletion-only report and rejects its changed-path mismatch', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-quality-delete-'));
    temporaryPaths.push(directory);
    const deletionPatch = resolve(directory, 'delete.patch');
    const replacementPatch = resolve(directory, 'replace.patch');
    await writeFile(deletionPatch, '--- a/src/obsolete.ts\n+++ /dev/null\n');
    await writeFile(replacementPatch, '--- a/src/replacement.ts\n+++ /dev/null\n');
    const target = await targetForPatch(deletionPatch);
    const report = validReport(target);
    expect(
      validateReportAdmission(report, {
        target,
        scope: 'full',
        localAttestationKey: testAttestationKey,
      }),
    ).toEqual([]);
    expect(verifyReportTarget(report, await targetForPatch(replacementPatch))).toContain(
      'report patch target does not match the current target',
    );
  });

  it('accepts only the exact complete locally attested full report', async () => {
    const { target } = await patchTarget('complete');
    const report = validReport(target);
    expect(validateReport(report)).toEqual([]);
    expect(summaryFor(report)).toContain(`target=${target.kind}`);
    expect(
      validateReportAdmission(report, {
        target,
        scope: 'full',
        localAttestationKey: testAttestationKey,
      }),
    ).toEqual([]);

    const missing = { ...report } as Record<string, unknown>;
    delete missing.toolVersions;
    expect(validateReport(missing).join('\n')).toContain('missing toolVersions');
    expect(validateReport({ ...report, unexpected: true }).join('\n')).toContain(
      'unexpected property unexpected',
    );
    expect(validateReport({ ...report, outcome: 'fail' }).join('\n')).toContain(
      'integrity digest mismatch',
    );
    const failed = validReport(target, 'fail');
    expect(validateReport(failed)).toEqual([]);
    expect(failed.outcome).toBe('fail');
  });

  it('keeps local full-patch admission independent from ambient CI SHA while retaining fail-closed CI SHA rules', async () => {
    const { patchPath, target } = await patchTarget('ambient-sha');
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-verify-report-'));
    temporaryPaths.push(directory);
    const fullReportPath = resolve(directory, 'full.json');
    const zeroMaxAgeReportPath = resolve(directory, 'zero-max-age.json');
    const ciReportPath = resolve(directory, 'ci.json');
    const ciSha = 'a'.repeat(40);
    await writeFile(fullReportPath, `${JSON.stringify(validReport(target))}\n`);
    const zeroMaxAgeReport = validReport(target);
    zeroMaxAgeReport.generatedAt = new Date(Date.now() + 60_000).toISOString();
    sealReport(zeroMaxAgeReport);
    await writeFile(zeroMaxAgeReportPath, `${JSON.stringify(zeroMaxAgeReport)}\n`);
    await writeFile(ciReportPath, `${JSON.stringify(validCiReport(ciSha))}\n`);

    const verifier = resolve('scripts/quality/verify-report.mjs');
    const runVerifier = (args: string[], environment: NodeJS.ProcessEnv = {}) =>
      spawnSync(process.execPath, [verifier, ...args], {
        encoding: 'utf8',
        env: {
          ...process.env,
          QUALITY_REPORT_ATTESTATION_KEY: testAttestationKey,
          ...environment,
        },
      });

    const fullWithAmbientSha = runVerifier(
      ['--report', fullReportPath, '--scope', 'full', '--target-patch', patchPath],
      { GITHUB_SHA: ciSha },
    );
    expect(
      fullWithAmbientSha.status,
      `${fullWithAmbientSha.stdout}\n${fullWithAmbientSha.stderr}`,
    ).toBe(0);
    expect(fullWithAmbientSha.stdout).toContain('QUALITY_REPORT_ACCEPTED');

    const fullWithExplicitSha = runVerifier(
      ['--report', fullReportPath, '--scope', 'full', '--target-patch', patchPath, '--sha', ciSha],
      { GITHUB_SHA: ciSha },
    );
    expect(fullWithExplicitSha.status).not.toBe(0);
    expect(fullWithExplicitSha.stderr).toContain('must not accept a caller SHA');

    for (const invalidArgs of [
      ['--unknown', 'value'],
      ['--scope', 'full', '--scope', 'full'],
      ['--scope', 'full', '--scope', 'ci'],
      ['stray'],
      ['--scope', 'full', 'stray'],
      ['--scope', 'full', '--target-patch', patchPath, 'stray'],
    ]) {
      const invalid = runVerifier([
        '--report',
        fullReportPath,
        '--target-patch',
        patchPath,
        ...invalidArgs,
      ]);
      expect(invalid.status).not.toBe(0);
      expect(invalid.stderr).toMatch(/Unsupported or positional argument|Duplicate option/);
    }
    const reordered = runVerifier([
      '--target-patch',
      patchPath,
      '--scope',
      'full',
      '--report',
      fullReportPath,
    ]);
    expect(reordered.status, `${reordered.stdout}\n${reordered.stderr}`).toBe(0);

    for (const flag of [
      '--report',
      '--sha',
      '--scope',
      '--target-patch',
      '--target-root',
      '--base-root',
      '--max-age-minutes',
    ]) {
      const invalidValueMessage =
        flag === '--max-age-minutes'
          ? 'max-age-minutes must be a finite non-negative number'
          : `${flag} requires a non-empty value`;
      const validBaseArgs = [
        '--report',
        fullReportPath,
        '--scope',
        'full',
        '--target-patch',
        patchPath,
      ];
      const existingOptionIndex = validBaseArgs.indexOf(flag);
      if (existingOptionIndex !== -1) validBaseArgs.splice(existingOptionIndex, 2);
      const trailing = runVerifier([...validBaseArgs, flag], {
        GITHUB_SHA: ciSha,
      });
      expect(trailing.status).not.toBe(0);
      expect(trailing.stderr).toContain(invalidValueMessage);
      const whitespace = runVerifier([...validBaseArgs, flag, '  '], {
        GITHUB_SHA: ciSha,
      });
      expect(whitespace.status).not.toBe(0);
      expect(whitespace.stderr).toContain(invalidValueMessage);
      const nextFlag = runVerifier([...validBaseArgs, flag, '--sha', ciSha], {
        GITHUB_SHA: ciSha,
      });
      expect(nextFlag.status).not.toBe(0);
      expect(nextFlag.stderr).toContain(invalidValueMessage);
    }

    for (const malformedMaxAgeArgs of [
      ['--max-age-minutes', ''],
      ['--max-age-minutes', '   '],
      ['--max-age-minutes'],
      ['--max-age-minutes', '--target-patch', patchPath],
    ]) {
      const malformedMaxAgeResult = runVerifier([
        '--report',
        zeroMaxAgeReportPath,
        '--scope',
        'full',
        '--target-patch',
        patchPath,
        ...malformedMaxAgeArgs,
      ]);
      expect(malformedMaxAgeResult.status).not.toBe(0);
      expect(malformedMaxAgeResult.stderr).toContain(
        'max-age-minutes must be a finite non-negative number',
      );
    }

    for (const invalidMaxAge of ['NaN', 'Infinity', '-1']) {
      const invalidMaxAgeResult = runVerifier([
        '--report',
        fullReportPath,
        '--scope',
        'full',
        '--target-patch',
        patchPath,
        '--max-age-minutes',
        invalidMaxAge,
      ]);
      expect(invalidMaxAgeResult.status).not.toBe(0);
      expect(invalidMaxAgeResult.stderr).toContain(
        'max-age-minutes must be a finite non-negative number',
      );
    }

    const zeroMaxAge = runVerifier([
      '--report',
      zeroMaxAgeReportPath,
      '--scope',
      'full',
      '--target-patch',
      patchPath,
      '--max-age-minutes',
      '0',
    ]);
    expect(zeroMaxAge.status, `${zeroMaxAge.stdout}\n${zeroMaxAge.stderr}`).toBe(0);
    expect(zeroMaxAge.stdout).toContain('QUALITY_REPORT_ACCEPTED');

    const ciWithAmbientSha = runVerifier(['--report', ciReportPath, '--scope', 'ci'], {
      GITHUB_SHA: ciSha,
    });
    expect(ciWithAmbientSha.status, `${ciWithAmbientSha.stdout}\n${ciWithAmbientSha.stderr}`).toBe(
      0,
    );
    expect(ciWithAmbientSha.stdout).toContain('QUALITY_REPORT_ACCEPTED');

    const ciWithoutSha = runVerifier(['--report', ciReportPath, '--scope', 'ci'], {
      GITHUB_SHA: '',
    });
    expect(ciWithoutSha.status).not.toBe(0);
    expect(ciWithoutSha.stderr).toContain('requires the current --sha');

    const ciWithLocalPatch = runVerifier(
      ['--report', ciReportPath, '--scope', 'ci', '--target-patch', patchPath],
      { GITHUB_SHA: ciSha },
    );
    expect(ciWithLocalPatch.status).not.toBe(0);
    expect(ciWithLocalPatch.stderr).toContain('must not accept a local patch');
  });

  it('rejects re-digested empty, omitted, failed, duplicate, and unknown full command contracts', async () => {
    const { target } = await patchTarget('command-contract');
    const invalidReports = [
      (() => {
        const report = validReport(target);
        report.commands = [];
        sealReport(report);
        return report;
      })(),
      (() => {
        const report = validReport(target);
        delete (report as Partial<QualityReportFixture>).commands;
        return report;
      })(),
      (() => {
        const report = validReport(target);
        report.commands[0] = { ...report.commands[0], status: 'fail', exitCode: 1 };
        sealReport(report);
        return report;
      })(),
      (() => {
        const report = validReport(target);
        report.commands[1] = { ...report.commands[1], id: 'format' };
        sealReport(report);
        return report;
      })(),
      (() => {
        const report = validReport(target);
        report.commands[1] = { ...report.commands[1], id: 'unknown' };
        sealReport(report);
        return report;
      })(),
    ];
    for (const report of invalidReports) {
      expect(
        validateReportAdmission(report, {
          target,
          scope: 'full',
          localAttestationKey: testAttestationKey,
        }),
      ).not.toEqual([]);
    }
  });

  it('requires a machine-readable failure cause while preserving signal and exception reports', async () => {
    const { target } = await patchTarget('failed-command-evidence');
    const missingCause = validReport(target, 'fail');
    missingCause.commands[0] = {
      ...missingCause.commands[0],
      exitCode: null,
      errorCode: null,
    };
    sealReport(missingCause);
    expect(validateReport(missingCause)).toContain(
      'commands[0] fail outcome must record a non-zero exitCode or errorCode',
    );

    const nonZeroExitFailure = validReport(target, 'fail');
    nonZeroExitFailure.commands[0] = {
      ...nonZeroExitFailure.commands[0],
      exitCode: 1,
      errorCode: null,
    };
    sealReport(nonZeroExitFailure);
    expect(validateReport(nonZeroExitFailure)).toEqual([]);

    const signalFailure = validReport(target, 'fail');
    signalFailure.commands[0] = {
      ...signalFailure.commands[0],
      exitCode: null,
      errorCode: 'QUALITY_SIGNAL_SIGTERM',
    };
    sealReport(signalFailure);
    expect(validateReport(signalFailure)).toEqual([]);

    const exceptionFailure = validReport(target, 'fail');
    exceptionFailure.commands[0] = {
      ...exceptionFailure.commands[0],
      exitCode: null,
      errorCode: 'ENOENT',
    };
    sealReport(exceptionFailure);
    expect(validateReport(exceptionFailure)).toEqual([]);
  });

  it('maps actual process signal and exception evidence into machine-readable failure codes', () => {
    const signalResult = spawnSync(process.execPath, [
      '-e',
      'process.kill(process.pid, "SIGTERM")',
    ]);
    if (signalResult.signal) {
      expect(commandFailureCode(signalResult, false)).toBe(`QUALITY_SIGNAL_${signalResult.signal}`);
    } else {
      expect(signalResult.status).not.toBe(0);
      expect(commandFailureCode({ signal: 'SIGTERM' }, false)).toBe('QUALITY_SIGNAL_SIGTERM');
    }

    const exceptionResult = spawnSync('mai002-missing-executable');
    const exceptionCode = (exceptionResult.error as NodeJS.ErrnoException | undefined)?.code;
    expect(exceptionCode).toBeTruthy();
    expect(commandFailureCode(exceptionResult, false)).toBe(exceptionCode);
  });

  it('rejects base-only, changed-target, stale, scope-mismatched, malformed, and tampered admission evidence', async () => {
    const first = await patchTarget('first');
    const second = await patchTarget('second', 'scripts/quality/changed.mjs');
    const report = validReport(first.target);
    expect(verifyReportTarget(report, first.target)).toEqual([]);
    expect(verifyReportTarget(report, second.target)).toContain(
      'report patch target does not match the current target',
    );
    expect(verifyReportTarget(report, targetForCommit(report.sha))).toContain(
      'report target kind does not match the current target',
    );
    report.generatedAt = new Date(Date.now() - 31 * 60_000).toISOString();
    sealReport(report);
    expect(
      validateReportAdmission(report, {
        target: first.target,
        scope: 'full',
        localAttestationKey: testAttestationKey,
      }),
    ).toContain('report is stale');
    const wrongScope = { ...validReport(first.target), scope: 'ci' };
    wrongScope.integrity.digest = reportDigest(wrongScope);
    wrongScope.integrity.attestation = createLocalPatchAttestation(wrongScope, testAttestationKey);
    expect(
      validateReportAdmission(wrongScope, {
        target: first.target,
        scope: 'full',
        localAttestationKey: testAttestationKey,
      }),
    ).toContain('report scope does not match the required scope');
    const malformedPath = resolve(temporaryPaths[0], 'malformed.json');
    await writeFile(malformedPath, '{not-json');
    await expect(readFile(malformedPath, 'utf8')).resolves.toContain('{not-json');
    report.integrity.digest = '0'.repeat(64);
    expect(validateReport(report)).toContain('integrity digest mismatch');
  });

  it('rejects correctly attested future-dated evidence beyond the explicit clock-skew tolerance', async () => {
    const { target } = await patchTarget('future-generated-at');
    const now = new Date('2026-07-27T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      const current = validReport(target);
      expect(
        validateReportAdmission(current, {
          target,
          scope: 'full',
          localAttestationKey: testAttestationKey,
        }),
      ).toEqual([]);

      const boundary = validReport(target);
      boundary.generatedAt = new Date(
        now.getTime() + REPORT_CLOCK_SKEW_TOLERANCE_MINUTES * 60_000,
      ).toISOString();
      sealReport(boundary);
      expect(
        validateReportAdmission(boundary, {
          target,
          scope: 'full',
          localAttestationKey: testAttestationKey,
        }),
      ).toEqual([]);

      const future = validReport(target);
      future.generatedAt = '2099-01-01T00:00:00.000Z';
      sealReport(future);
      expect(
        validateReportAdmission(future, {
          target,
          scope: 'full',
          localAttestationKey: testAttestationKey,
        }),
      ).toContain('report generatedAt exceeds the allowed future clock skew');

      const invalidDate = validReport(target);
      invalidDate.generatedAt = 'not-a-date';
      sealReport(invalidDate);
      expect(
        validateReportAdmission(invalidDate, {
          target,
          scope: 'full',
          localAttestationKey: testAttestationKey,
        }),
      ).toContain('report generatedAt is invalid');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects re-digested reports without the correct attestation and malformed RFC3339 date-time', async () => {
    const { target } = await patchTarget('attestation');
    const report = validReport(target);
    report.limitations = ['Altered but only publicly re-digested.'];
    report.integrity.digest = reportDigest(report);
    expect(
      validateReportAdmission(report, {
        target,
        scope: 'full',
        localAttestationKey: testAttestationKey,
      }),
    ).toContain('local report attestation does not match the Manager-supplied key');

    const malformedDate = validReport(target);
    malformedDate.generatedAt = 'July 27 2026 02:30:00 GMT+0500';
    sealReport(malformedDate);
    expect(validateReport(malformedDate).join('\n')).toContain('strict RFC3339/ISO date-time');
  });

  it('classifies only reviewed Router notices, rejects unexpected diagnostics, and does not retain raw output', async () => {
    const clean = classifyCommandDiagnostics('all clear', '');
    expect(clean).toEqual({
      allowedRouterFutureWarnings: 0,
      unexpectedReactActWarnings: 0,
      unexpectedUnhandledRejections: 0,
      unexpectedConsoleWarnings: 0,
      unexpectedGenericWarnings: 0,
    });
    const allowedRouter = classifyCommandDiagnostics(
      '⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7.\n⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7.',
    );
    expect(allowedRouter.allowedRouterFutureWarnings).toBe(2);
    expect(unexpectedDiagnosticCount(allowedRouter)).toBe(0);
    expect(
      classifyCommandDiagnostics(
        '',
        'Warning: An update to Fixture inside a test was not wrapped in act(...)',
      ).unexpectedReactActWarnings,
    ).toBe(1);
    expect(
      classifyCommandDiagnostics('', 'Unhandled Promise Rejection: fixture')
        .unexpectedUnhandledRejections,
    ).toBe(1);
    expect(
      classifyCommandDiagnostics('', '[console.error] fixture').unexpectedConsoleWarnings,
    ).toBe(1);

    const { target } = await patchTarget('unexpected-diagnostic');
    const report = validReport(target);
    report.commands[0].diagnostics.unexpectedConsoleWarnings = 1;
    sealReport(report);
    expect(validateReport(report)).toContain(
      'commands[0] pass outcome cannot contain unexpected diagnostics',
    );
    expect(summaryFor(validReport(target))).toContain('diagnostics=allowed-router:0 unexpected:0');
    const countedReport = validReport(target);
    countedReport.commands[6].diagnostics.unexpectedGenericWarnings = 2;
    expect(summaryFor(countedReport)).toContain(
      'diagnostic-counts=format(allowed-router:0,act:0,unhandled:0,console:0,generic:0)',
    );
    expect(summaryFor(countedReport)).toContain(
      'tests(allowed-router:0,act:0,unhandled:0,console:0,generic:2)',
    );
    expect(
      JSON.stringify(classifyCommandDiagnostics('', 'Warning: private-token-value')),
    ).not.toContain('private-token-value');
  });
});

describe('staged and CI decision simulations', () => {
  it('preserves the exact authenticated localization fixture through staged Prettier selection', async () => {
    const fixturePath =
      'tests/shared/locale/fixtures/review-exchange/learnhub-multilingual-review-readable.md';
    const authorizedSha256 = 'ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C';
    const sourceBytes = await readFile(resolve(fixturePath));
    expect(createHash('sha256').update(sourceBytes).digest('hex').toUpperCase()).toBe(
      authorizedSha256,
    );
    expect(stagedPredicatePlan([fixturePath]).selected.prettier).toEqual([fixturePath]);

    const directory = await mkdtemp(resolve(tmpdir(), 'fe067-authenticated-fixture-'));
    temporaryPaths.push(directory);
    const repository = resolve(directory, 'repository');
    const isolatedFixturePath = resolve(repository, fixturePath);
    await mkdir(dirname(isolatedFixturePath), { recursive: true });
    await Promise.all([
      copyFile(resolve('.prettierignore'), resolve(repository, '.prettierignore')),
      copyFile(resolve('.prettierrc.json'), resolve(repository, '.prettierrc.json')),
      copyFile(resolve(fixturePath), isolatedFixturePath),
    ]);

    const prettier = resolve('node_modules/prettier/bin/prettier.cjs');
    const formatter = spawnSync(process.execPath, [prettier, '--write', isolatedFixturePath], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(formatter.status, `${formatter.stdout}\n${formatter.stderr}`).toBe(0);
    const formattedBytes = await readFile(isolatedFixturePath);
    expect(formattedBytes).toEqual(sourceBytes);
    expect(createHash('sha256').update(formattedBytes).digest('hex').toUpperCase()).toBe(
      authorizedSha256,
    );
  });

  it('keeps every public localization review command inside durable Node lint and format gates', async () => {
    const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const publicReviewTargets = Object.entries(packageJson.scripts)
      .filter(([name]) => name.startsWith('localization:review:'))
      .map(([name, command]) => [
        name,
        command.match(/^node (scripts\/localization\/[^ ]+\.mjs)$/)?.[1],
      ]);
    expect(publicReviewTargets).toEqual([
      ['localization:review:export', 'scripts/localization/review-export.mjs'],
      ['localization:review:request', 'scripts/localization/review-request.mjs'],
      ['localization:review:import', 'scripts/localization/review-import.mjs'],
      ['localization:review:report', 'scripts/localization/review-report.mjs'],
    ]);
    expect(packageJson.scripts['lint:quality']).toContain('scripts/localization');
    expect(packageJson.scripts['format:check']).toContain('scripts/localization');

    const eslintConfig = createRequire(import.meta.url)(resolve('.eslintrc.cjs')) as {
      overrides: Array<{ files?: string[]; env?: { node?: boolean } }>;
    };
    const localizationOverride = eslintConfig.overrides.find((override) =>
      override.files?.includes('scripts/localization/**/*.{mjs,ts}'),
    );
    expect(localizationOverride?.env?.node).toBe(true);

    const workflow = await readFile(resolve('.github/workflows/frontend-quality.yml'), 'utf8');
    expect(workflow).toContain('npm run format:check');
    expect(workflow).toContain('npm run lint:quality');
  });

  it('formats only the selected staged files through the real pre-commit hook without changing the live index', async () => {
    const liveIndexPath = spawnSync('git', ['rev-parse', '--git-path', 'index'], {
      encoding: 'utf8',
    });
    expect(liveIndexPath.status, liveIndexPath.stderr).toBe(0);
    const liveIndex = resolve(liveIndexPath.stdout.trim());
    const before = await readFile(liveIndex);
    const directory = await mkdtemp(resolve(tmpdir(), 'mai002-hook-index-'));
    temporaryPaths.push(directory);
    const repository = resolve(directory, 'repository');
    await mkdir(resolve(repository, '.husky'), { recursive: true });
    await mkdir(resolve(repository, 'scripts/quality'), { recursive: true });
    await Promise.all([
      copyFile(resolve('.eslintrc.cjs'), resolve(repository, '.eslintrc.cjs')),
      copyFile(resolve('package.json'), resolve(repository, 'package.json')),
      copyFile(resolve('.prettierrc.json'), resolve(repository, '.prettierrc.json')),
      copyFile(resolve('stylelint.config.cjs'), resolve(repository, 'stylelint.config.cjs')),
      copyFile(resolve('.husky/pre-commit'), resolve(repository, '.husky/pre-commit')),
      copyFile(
        resolve('scripts/quality/run-staged-quality.mjs'),
        resolve(repository, 'scripts/quality/run-staged-quality.mjs'),
      ),
      copyFile(
        resolve('scripts/quality/quality-decisions.mjs'),
        resolve(repository, 'scripts/quality/quality-decisions.mjs'),
      ),
    ]);
    const fixtureBinary = Uint8Array.from([0, 255, 13, 10, 26, 10]);
    await writeFile(resolve(repository, 'fixture.png'), fixtureBinary);
    const initialPackage = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
    initialPackage.scripts['precommit:staged'] = 'lint-staged --config lint-staged.config.mjs';
    await Promise.all([
      writeFile(
        resolve(repository, 'package.json'),
        `${JSON.stringify(initialPackage, null, 2)}\n`,
      ),
      writeFile(
        resolve(repository, 'lint-staged.config.mjs'),
        "export default { '*.json': 'prettier --write', '*.cjs': 'eslint' };\n",
      ),
    ]);
    await symlink(
      resolve('node_modules'),
      resolve(repository, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const initialize = spawnSync('git', ['init'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(initialize.status, initialize.stderr).toBe(0);
    const initialAdd = spawnSync(
      'git',
      [
        'add',
        '.eslintrc.cjs',
        'package.json',
        '.prettierrc.json',
        'lint-staged.config.mjs',
        'stylelint.config.cjs',
        'fixture.png',
        '.husky',
        'scripts',
      ],
      {
        cwd: repository,
        encoding: 'utf8',
      },
    );
    expect(initialAdd.status, initialAdd.stderr).toBe(0);
    const initialCommit = spawnSync(
      'git',
      [
        '-c',
        'user.email=quality@example.test',
        '-c',
        'user.name=Quality Test',
        'commit',
        '-m',
        'fixture',
      ],
      { cwd: repository, encoding: 'utf8' },
    );
    expect(initialCommit.status, initialCommit.stderr).toBe(0);

    const enableAutocrlf = spawnSync('git', ['config', 'core.autocrlf', 'true'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(enableAutocrlf.status, enableAutocrlf.stderr).toBe(0);
    await rm(resolve(repository, 'package.json'));
    const redCheckout = spawnSync('git', ['checkout', '--', 'package.json'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(redCheckout.status, redCheckout.stderr).toBe(0);
    expect(await readFile(resolve(repository, 'package.json'), 'utf8')).toContain('\r\n');
    const prettier = resolve('node_modules/prettier/bin/prettier.cjs');
    const redPrettier = spawnSync(process.execPath, [prettier, '--check', 'package.json'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(redPrettier.status).not.toBe(0);

    await copyFile(resolve('.gitattributes'), resolve(repository, '.gitattributes'));
    const addAttributes = spawnSync('git', ['add', '--', '.gitattributes'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(addAttributes.status, addAttributes.stderr).toBe(0);
    const commitAttributes = spawnSync(
      'git',
      [
        '-c',
        'user.email=quality@example.test',
        '-c',
        'user.name=Quality Test',
        'commit',
        '-m',
        'fixture attributes',
      ],
      { cwd: repository, encoding: 'utf8' },
    );
    expect(commitAttributes.status, commitAttributes.stderr).toBe(0);
    await rm(resolve(repository, 'package.json'));
    await rm(resolve(repository, 'fixture.png'));
    const greenCheckout = spawnSync('git', ['checkout', '--', 'package.json', 'fixture.png'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(greenCheckout.status, greenCheckout.stderr).toBe(0);
    expect(await readFile(resolve(repository, 'package.json'), 'utf8')).not.toContain('\r');
    expect([...(await readFile(resolve(repository, 'fixture.png')))]).toEqual([...fixtureBinary]);
    const greenPrettier = spawnSync(process.execPath, [prettier, '--check', 'package.json'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(greenPrettier.status, `${greenPrettier.stdout}\n${greenPrettier.stderr}`).toBe(0);
    const attributes = spawnSync(
      'git',
      [
        'check-attr',
        'text',
        'eol',
        '--',
        'package.json',
        'stylelint.config.cjs',
        'scripts/quality/run-staged-quality.mjs',
        'tests/quality/run-quality.test.ts',
        '.github/workflows/frontend-quality.yml',
        '.husky/pre-commit',
        'fixture.png',
      ],
      { cwd: repository, encoding: 'utf8' },
    );
    expect(attributes.status, attributes.stderr).toBe(0);
    expect(attributes.stdout).toContain('package.json: text: auto');
    expect(attributes.stdout).toContain('package.json: eol: lf');
    expect(attributes.stdout).toContain('stylelint.config.cjs: eol: lf');
    expect(attributes.stdout).toContain('scripts/quality/run-staged-quality.mjs: eol: lf');
    expect(attributes.stdout).toContain('tests/quality/run-quality.test.ts: eol: lf');
    expect(attributes.stdout).toContain('.github/workflows/frontend-quality.yml: eol: lf');
    expect(attributes.stdout).toContain('.husky/pre-commit: eol: lf');
    expect(attributes.stdout).toContain('fixture.png: text: auto');
    expect(attributes.stdout).not.toContain('fixture.png: text: set');

    const fixturePackage = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
    fixturePackage.hookFixture = true;
    const unrelatedPath = resolve(repository, 'unrelated.txt');
    const unrelatedContent = 'unstaged fixture content\r\n';
    await writeFile(unrelatedPath, unrelatedContent);
    const nonCanonicalPackage = `${JSON.stringify(fixturePackage)}\r\n`;
    await writeFile(resolve(repository, 'package.json'), nonCanonicalPackage);
    await writeFile(
      resolve(repository, 'stylelint.config.cjs'),
      `${await readFile(resolve(repository, 'stylelint.config.cjs'), 'utf8')}\n`,
    );
    const updateIndex = spawnSync('git', ['add', '--', 'package.json', 'stylelint.config.cjs'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(updateIndex.status, updateIndex.stderr).toBe(0);
    const stagedPaths = spawnSync('git', ['diff', '--cached', '--name-only'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(stagedPaths.status, stagedPaths.stderr).toBe(0);
    expect(stagedPaths.stdout.split(/\r?\n/)).toContain('package.json');
    expect(stagedPaths.stdout.split(/\r?\n/)).toContain('stylelint.config.cjs');

    const hook = spawnSync(resolveGitBash(), ['-x', '.husky/pre-commit'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(hook.status, `${hook.stdout}\n${hook.stderr}`).toBe(0);
    const stagedBlob = spawnSync('git', ['show', ':package.json'], {
      cwd: repository,
      encoding: 'utf8',
    });
    expect(stagedBlob.status, stagedBlob.stderr).toBe(0);
    expect(stagedBlob.stdout).not.toContain('\r');
    expect(stagedBlob.stdout).not.toBe(nonCanonicalPackage);
    expect(await readFile(resolve(repository, 'package.json'), 'utf8')).not.toContain('\r');
    expect(await readFile(unrelatedPath, 'utf8')).toBe(unrelatedContent);
    await writeFile(resolve(repository, 'invalid.cjs'), 'module.exports = unknownFixture;\n');
    const invalidCjs = spawnSync(
      process.execPath,
      [resolve('node_modules/eslint/bin/eslint.js'), 'invalid.cjs', '--max-warnings', '0'],
      { cwd: repository, encoding: 'utf8' },
    );
    expect(invalidCjs.status).not.toBe(0);
    expect(`${invalidCjs.stdout}\n${invalidCjs.stderr}`).toContain('no-undef');
    expect(await readFile(liveIndex)).toEqual(before);
  }, 30_000);

  it('models staged clean, fail, non-target, and bypass semantics without touching the index', () => {
    expect(
      evaluateStagedGate({
        paths: ['scripts/quality/a.mjs'],
        predicateResults: { prettier: 'pass', eslint: 'pass', stylelint: 'pass' },
      }).outcome,
    ).toBe('pass');
    expect(
      evaluateStagedGate({
        paths: ['src/app.css'],
        predicateResults: { prettier: 'pass', eslint: 'pass', stylelint: 'fail' },
      }).failures,
    ).toEqual(['stylelint']);
    expect(
      evaluateStagedGate({
        paths: ['docs/readme.txt'],
        predicateResults: { prettier: 'fail', eslint: 'fail', stylelint: 'fail' },
      }).outcome,
    ).toBe('pass');
    expect(
      evaluateStagedGate({
        paths: ['src/app.ts'],
        predicateResults: { prettier: 'fail', eslint: 'fail', stylelint: 'pass' },
        bypassed: true,
      }).outcome,
    ).toBe('bypassed');
  });

  it('selects the authoritative PR-head or push SHA and fails CI aggregation closed', () => {
    const pullRequestHeadSha = 'a'.repeat(40);
    const syntheticMergeSha = 'b'.repeat(40);
    const pushSha = 'c'.repeat(40);
    expect(
      qualityTargetForEvent({
        eventName: 'pull_request',
        githubSha: syntheticMergeSha,
        pullRequestHeadSha,
      }),
    ).toBe(pullRequestHeadSha);
    expect(
      qualityTargetForEvent({
        eventName: 'push',
        githubSha: pushSha,
        pullRequestHeadSha: pullRequestHeadSha,
      }),
    ).toBe(pushSha);
    expect(
      qualityTargetForEvent({
        eventName: 'pull_request',
        githubSha: syntheticMergeSha,
      }),
    ).toBe('');
    expect(qualityTargetForEvent({ eventName: 'push' })).toBe('');
    expect(
      qualityTargetForEvent({
        eventName: 'workflow_dispatch',
        githubSha: pushSha,
        pullRequestHeadSha,
      }),
    ).toBe('');

    const successfulNeeds = Object.fromEntries(
      ['lint-static', 'typecheck', 'tests', 'build', 'browser', 'quality-report'].map((job) => [
        job,
        { result: 'success' },
      ]),
    );
    expect(
      evaluateCiAggregate({
        needs: successfulNeeds,
        qualityTargetSha: pullRequestHeadSha,
        artifactPresent: true,
        reportErrors: [],
      }).outcome,
    ).toBe('pass');
    for (const result of ['failure', 'cancelled', 'skipped']) {
      expect(
        evaluateCiAggregate({
          needs: { ...successfulNeeds, browser: { result } },
          qualityTargetSha: pullRequestHeadSha,
          artifactPresent: true,
          reportErrors: [],
        }).outcome,
      ).toBe('fail');
    }
    expect(
      evaluateCiAggregate({
        needs: successfulNeeds,
        qualityTargetSha: pullRequestHeadSha,
        artifactPresent: false,
        reportErrors: [],
      }).outcome,
    ).toBe('fail');
    expect(
      evaluateCiAggregate({
        needs: successfulNeeds,
        qualityTargetSha: 'synthetic-merge-sha',
        artifactPresent: true,
        reportErrors: [],
      }).outcome,
    ).toBe('fail');
  });

  it('wires every CI code consumer, browser gate, report artifact, and aggregate to one target SHA', async () => {
    const workflow = (
      await readFile(resolve('.github/workflows/frontend-quality.yml'), 'utf8')
    ).replace(/\r\n/g, '\n');
    expect(workflow).toContain('  resolve-target:\n');
    expect(workflow).toContain('quality-target-sha: ${{ steps.target.outputs.sha }}');
    expect(workflow).toContain('pull_request) quality_target_sha="$PR_HEAD_SHA" ;;');
    expect(workflow).toContain('push) quality_target_sha="$PUSH_SHA" ;;');
    expect(workflow).toContain('*) echo "Unsupported quality event: $EVENT_NAME" >&2; exit 1 ;;');
    expect(workflow).not.toContain('github.event.pull_request.head.sha || github.sha');
    expect(workflow).not.toContain('browser-applicability');
    expect(workflow).toContain('  browser:\n');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    const browser = workflow.slice(
      workflow.indexOf('  browser:\n'),
      workflow.indexOf('  quality-report:\n'),
    );
    expect(browser).toContain('fail-fast: false');
    expect(browser).toContain('config:');
    expect(
      [...browser.matchAll(/- (tests\/browser\/[^\n]+config\.ts)/g)].map(([, config]) => config),
    ).toEqual([
      'tests/browser/playwright.config.ts',
      'tests/browser/mlux006-multilingual-closure.playwright.config.ts',
      'tests/browser/app-shell.playwright.config.ts',
      'tests/browser/auth-workflows.playwright.config.ts',
      'tests/browser/cart-workflow.playwright.config.ts',
      'tests/browser/catalog-discovery.playwright.config.ts',
      'tests/browser/checkout-cart.playwright.config.ts',
      'tests/browser/course-chat.playwright.config.ts',
      'tests/browser/course-detail.playwright.config.ts',
      'tests/browser/instructor-courses-fe029.playwright.config.ts',
      'tests/browser/instructor-course-editor-fe014.playwright.config.ts',
      'tests/browser/learning-progress.playwright.config.ts',
    ]);
    expect(browser).toContain(
      'npx playwright test --config "${{ matrix.config }}" --project=chromium --workers=1 --retries=0 --reporter=line',
    );
    expect(browser).not.toContain('npm run test:browser');
    expect(workflow).toContain(
      'needs: [resolve-target, lint-static, typecheck, tests, build, browser, quality-report]',
    );
    expect(workflow.match(/needs: resolve-target/g)).toHaveLength(6);
    expect(workflow.match(/ref: \$\{\{ env\.QUALITY_TARGET_SHA \}\}/g)).toHaveLength(7);
    expect(workflow.match(/needs\.resolve-target\.outputs\.quality-target-sha/g)).toHaveLength(7);
    expect(workflow).toContain('TARGET_RESOLUTION_RESULT: ${{ needs.resolve-target.result }}');
    expect(workflow).toContain('Guard resolved quality target before artifact or checkout');
    expect(
      workflow.indexOf('Guard resolved quality target before artifact or checkout'),
    ).toBeLessThan(workflow.indexOf('actions/download-artifact'));
    expect(
      workflow.indexOf('Guard resolved quality target before artifact or checkout'),
    ).toBeLessThan(workflow.lastIndexOf('actions/checkout'));
    expect(workflow).toContain('frontend-quality-report-${{ env.QUALITY_TARGET_SHA }}');
    expect(workflow).toContain('--sha "$QUALITY_TARGET_SHA"');
    expect(workflow).toContain('QUALITY_TARGET_SHA: ${{ env.QUALITY_TARGET_SHA }}');
    const qualityReport = workflow.slice(
      workflow.indexOf('  quality-report:\n'),
      workflow.indexOf('  frontend-quality-required:\n'),
    );
    expect(qualityReport).toContain('if: always()\n        uses: actions/upload-artifact@');
    expect(qualityReport).toContain('name: frontend-quality-report-${{ env.QUALITY_TARGET_SHA }}');
    expect(qualityReport).toContain('path: quality-reports/current.json');
    expect(qualityReport).toContain('retention-days: 7');
    expect(qualityReport).toContain('if-no-files-found: error');
  });

  it('gives the recorded-base unit fixture full history and deterministic fork isolation only in the tests job', async () => {
    const workflow = (
      await readFile(resolve('.github/workflows/frontend-quality.yml'), 'utf8')
    ).replace(/\r\n/g, '\n');
    const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as {
      scripts: { test: string };
    };
    const testsJob = workflow.slice(workflow.indexOf('  tests:\n'), workflow.indexOf('  build:\n'));

    expect(testsJob).toContain('fetch-depth: 0');
    expect(testsJob).toContain(
      'npm test -- --pool=forks --poolOptions.forks.maxForks=1 --poolOptions.forks.minForks=1 --poolOptions.forks.isolate=true',
    );
    expect(packageJson.scripts.test).toBe('vitest run');
  });

  it('orders aggregate guard, clean checkout, report download, and verification fail closed', async () => {
    const workflow = (
      await readFile(resolve('.github/workflows/frontend-quality.yml'), 'utf8')
    ).replace(/\r\n/g, '\n');
    const aggregate = workflow.slice(workflow.indexOf('  frontend-quality-required:\n'));
    const guard = aggregate.indexOf('Guard resolved quality target before artifact or checkout');
    const checkout = aggregate.indexOf('actions/checkout@');
    const download = aggregate.indexOf('actions/download-artifact@');
    const verify = aggregate.indexOf('Fail closed on job state and current-SHA report artifact');

    expect(aggregate).toContain('if: always()');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(checkout).toBeGreaterThan(guard);
    expect(download).toBeGreaterThan(checkout);
    expect(verify).toBeGreaterThan(download);
    expect(aggregate.match(/actions\/checkout@/g)).toHaveLength(1);
    expect(aggregate).toContain('ref: ${{ env.QUALITY_TARGET_SHA }}');
    expect(aggregate).toContain('name: frontend-quality-report-${{ env.QUALITY_TARGET_SHA }}');
    expect(aggregate).toContain('path: quality-reports');
    expect(aggregate).toContain('QUALITY_REPORT_PATH: quality-reports/current.json');
    expect(aggregate).toContain('QUALITY_TARGET_SHA: ${{ env.QUALITY_TARGET_SHA }}');
    expect(aggregate).toContain('node-version: 20');
    expect(aggregate).toContain('run: node scripts/quality/verify-ci-aggregate.mjs');
    expect(aggregate).not.toContain('cache: npm');
    expect(aggregate).not.toContain('npm ci');
  });

  it('executes the production aggregate guard and rejects resolver failures before an otherwise successful aggregate can pass', async () => {
    const workflow = await readFile(resolve('.github/workflows/frontend-quality.yml'), 'utf8');
    const resolvedSha = 'd'.repeat(40);
    const successfulNeeds = Object.fromEntries(
      ['lint-static', 'typecheck', 'tests', 'build', 'browser', 'quality-report'].map((job) => [
        job,
        { result: 'success' },
      ]),
    );

    const successGuard = productionAggregateGuard(workflow, 'success', resolvedSha);
    expect(successGuard.status, successGuard.stderr).toBe(0);
    for (const resolverResult of ['failure', 'cancelled', 'skipped']) {
      const guard = productionAggregateGuard(workflow, resolverResult, resolvedSha);
      expect(guard.status).not.toBe(0);
      expect(
        evaluateCiAggregate({
          needs: successfulNeeds,
          qualityTargetSha: resolvedSha,
          artifactPresent: true,
          reportErrors: [guard.stderr.trim()],
        }).outcome,
      ).toBe('fail');
    }
    for (const invalidOutput of ['', 'not-a-sha']) {
      const guard = productionAggregateGuard(workflow, 'success', invalidOutput);
      expect(guard.status).not.toBe(0);
      expect(
        evaluateCiAggregate({
          needs: successfulNeeds,
          qualityTargetSha: invalidOutput,
          artifactPresent: true,
          reportErrors: [guard.stderr.trim()],
        }).outcome,
      ).toBe('fail');
    }
  });

  it('feeds a real CI report-target mismatch into aggregate rejection', () => {
    const reportSha = 'e'.repeat(40);
    const resolvedSha = 'f'.repeat(40);
    const report = validCiReport(reportSha);
    expect(
      validateReportAdmission(report, {
        target: targetForCommit(reportSha),
        scope: 'ci',
      }),
    ).toEqual([]);
    const mismatchErrors = validateReportAdmission(report, {
      target: targetForCommit(resolvedSha),
      scope: 'ci',
    });
    expect(mismatchErrors).toContain('report commit target does not match the current target');
    const successfulNeeds = Object.fromEntries(
      ['lint-static', 'typecheck', 'tests', 'build', 'browser', 'quality-report'].map((job) => [
        job,
        { result: 'success' },
      ]),
    );
    expect(
      evaluateCiAggregate({
        needs: successfulNeeds,
        qualityTargetSha: resolvedSha,
        artifactPresent: true,
        reportErrors: mismatchErrors,
      }).outcome,
    ).toBe('fail');
  });
});
