import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicCommandManifestPath = 'package.json';
const publicCommandName = 'test:visual-admission';
const publicCommandValue = 'node scripts/quality/visual-admission.mjs';
function assertPublicCommandBinding(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    throw new Error('Malformed public command manifest.');
  const scripts = manifest.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts))
    throw new Error('Malformed public command manifest scripts.');
  if (scripts[publicCommandName] !== publicCommandValue)
    throw new Error(`Public command mapping must be ${publicCommandName}=${publicCommandValue}.`);
}
assertPublicCommandBinding(JSON.parse(readFileSync(join(root, publicCommandManifestPath), 'utf8')));
const widths = [320, 390, 617, 767, 768, 895, 1100, 1280, 1440];
const locales = ['en', 'ru', 'uz'];
const zoomWidths = [320, 768, 1280];
const cartShards = [
  'root',
  'course',
  'signup',
  'login',
  'forgot',
  'reset',
  'learning',
  'enrollment',
  'enrollment-ai',
  'ai',
  'instructor',
  'instructor-edit',
  'instructor-enrollments',
  'lesson-edit',
  'malformed-empty',
  'malformed-relative',
  'external',
  'self',
  'clear',
];
const contexts = [
  ['M01', 'completion-ready', locales],
  ['M02', 'anonymous-catalog', locales],
  ['M02', 'course-detail-success', locales],
  ['M03', 'hero-price-sort', locales],
  ['M04', 'forgot-back-link', locales],
  ['M05', 'empty-email-safe-error', locales],
  ['M06', 'full-page-actions', locales],
  ['M06', 'full-page-menu', locales],
  ['M06', 'mini-chat', ['en']],
  ...cartShards.slice(0, -1).map((key) => ['M07', `return-${key}`, locales]),
  ['M08', 'clear-confirmation', locales],
  ['M08', 'clear-pending', ['en']],
  ['M09', 'public-catalog-visibility', locales],
];
const cells = contexts.flatMap(([matrix, scenario, supportedLocales]) =>
  supportedLocales.flatMap((locale) =>
    [
      ...widths.map((width) => [matrix, scenario, locale, width, 100]),
      ...zoomWidths.map((width) => [matrix, scenario, locale, width, 200]),
    ].map((parts) => parts.join('--')),
  ),
);
const cellSet = new Set(cells);
if (cellSet.size !== cells.length)
  throw new Error(
    `canonical screenshot inventory contains duplicates: total=${cells.length} unique=${cellSet.size}`,
  );
const configs = {
  M01: 'm01-learning.config.ts',
  M02: 'm02-catalog.config.ts',
  M03: 'm02-catalog.config.ts',
  M04: 'm04-auth.config.ts',
  M05: 'm04-auth.config.ts',
  M06: 'm06-ai.config.ts',
  M07: 'm07-cart.config.ts',
  M08: 'm07-cart.config.ts',
  M09: 'm02-catalog.config.ts',
};
const declaredShards = [
  { config: 'm01-learning.config.ts' },
  { config: 'm02-catalog.config.ts' },
  { config: 'm04-auth.config.ts' },
  { config: 'm06-ai.config.ts' },
  ...cartShards.map((cartShard) => ({ config: 'm07-cart.config.ts', cartShard })),
];

function fail(message) {
  process.stderr.write(`visual-admission: ${message}\n`);
  process.exitCode = 1;
}

function parseArguments(argv) {
  const parsed = {
    list: false,
    screenshot: undefined,
    runId: undefined,
    screenshotMode: 'canonical',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--list') {
      if (parsed.list) throw new Error('duplicate --list');
      parsed.list = true;
    } else if (argument === '--full-screenshots') {
      if (parsed.screenshotMode === 'full') throw new Error('duplicate --full-screenshots');
      parsed.screenshotMode = 'full';
    } else if (argument === '--screenshot' || argument === '--run-id') {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires one value`);
      const key = argument === '--screenshot' ? 'screenshot' : 'runId';
      if (parsed[key]) throw new Error(`duplicate ${argument}`);
      parsed[key] = value;
    } else throw new Error(`unknown argument ${argument}`);
  }
  if (parsed.list && (parsed.screenshot || parsed.runId || parsed.screenshotMode === 'full'))
    throw new Error('--list cannot be combined with run options');
  if (parsed.screenshot && parsed.screenshotMode === 'full')
    throw new Error('--screenshot cannot be combined with --full-screenshots');
  if (parsed.screenshot && !cellSet.has(parsed.screenshot))
    throw new Error(`unknown or malformed canonical screenshot name: ${parsed.screenshot}`);
  if (parsed.runId && !/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(parsed.runId))
    throw new Error(
      '--run-id must be 3-80 ASCII letters, digits, dots, underscores, or hyphens and begin with an alphanumeric character',
    );
  return parsed;
}

function createRunId(value) {
  return value ?? `visual-${Date.now().toString(36)}-${randomBytes(8).toString('hex')}`;
}

function shardFor(cell) {
  const [matrix, scenario] = cell.split('--');
  const config = configs[matrix];
  if (!config) throw new Error(`no owning shard for ${cell}`);
  return {
    config,
    cartShard:
      matrix === 'M07' ? scenario.replace(/^return-/, '') : matrix === 'M08' ? 'clear' : undefined,
  };
}

function run(command, args, environment) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: root,
      env: environment,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    });
    const stop = () => {
      // Only the exact child PID created by this command is signalled. We do
      // not adopt or terminate a process tree whose provenance is ambiguous.
      if (!child.killed) child.kill('SIGTERM');
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      if (code === 0 && !signal) resolveRun();
      else
        rejectRun(new Error(`${command} exited code=${code ?? 'null'} signal=${signal ?? 'none'}`));
    });
  });
}

function findNamedFiles(directory, filename, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) findNamedFiles(path, filename, result);
    else if (entry.name === filename) result.push(path);
  }
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.list) {
    process.stdout.write(`${cells.join('\n')}\n`);
    return;
  }
  if (process.env.FE058_RUNNER_PROBE === 'collect-all') {
    const failures = [];
    for (let index = 0; index < declaredShards.length; index += 1) {
      const shard = declaredShards[index];
      try {
        await run(
          process.execPath,
          ['-e', `process.exit(${index === 1 || index === declaredShards.length - 1 ? 1 : 0})`],
          process.env,
        );
      } catch (error) {
        failures.push(
          `${shard.config}${shard.cartShard ? `:${shard.cartShard}` : ''}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (failures.length !== 2)
      throw new Error(`collect-all probe expected two failures, observed ${failures.length}`);
    throw new Error(
      `shard failures (${failures.length}/${declaredShards.length}):\n${failures.join('\n')}`,
    );
  }
  const runId = createRunId(options.runId);
  const runRoot = resolve(root, 'test-results', 'visual-admission', runId);
  if (existsSync(runRoot))
    throw new Error(`run id ${runId} already exists; refusing to reuse or delete output`);
  mkdirSync(runRoot, { recursive: true });
  const environment = {
    ...process.env,
    FE058_RUN_ID: runId,
    VISUAL_ADMISSION_SCREENSHOT_MODE: options.screenshotMode,
    ...(options.screenshot ? { VISUAL_ADMISSION_SCREENSHOT: options.screenshot } : {}),
  };
  if (options.screenshot) {
    const shard = shardFor(options.screenshot);
    if (shard.cartShard) environment.FE058_CART_SHARD = shard.cartShard;
    await run(
      process.execPath,
      [
        join('node_modules', '@playwright', 'test', 'cli.js'),
        'test',
        '--config',
        join('tests', 'browser', 'visual-admission', shard.config),
        '--workers=1',
        '--retries=0',
        '--reporter=line',
      ],
      environment,
    );
    const records = findNamedFiles(runRoot, `${options.screenshot}.json`);
    if (records.length !== 1)
      throw new Error(
        `selected run must emit exactly one record for ${options.screenshot}; observed ${records.length}`,
      );
    const record = JSON.parse(readFileSync(records[0], 'utf8'));
    if (
      record.cellId !== options.screenshot ||
      record.screenshot?.kind !== 'captured' ||
      !record.screenshot.path ||
      !record.screenshot.sha256
    )
      throw new Error(`selected record is malformed: ${options.screenshot}`);
    return;
  }
  const failures = [];
  for (const shard of declaredShards) {
    const shardEnvironment = {
      ...environment,
      ...(shard.cartShard ? { FE058_CART_SHARD: shard.cartShard } : {}),
    };
    try {
      await run(
        process.execPath,
        [
          join('node_modules', '@playwright', 'test', 'cli.js'),
          'test',
          '--config',
          join('tests', 'browser', 'visual-admission', shard.config),
          '--workers=1',
          '--retries=0',
          '--reporter=line',
        ],
        shardEnvironment,
      );
    } catch (error) {
      failures.push(
        `${shard.config}${shard.cartShard ? `:${shard.cartShard}` : ''}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (failures.length)
    throw new Error(
      `shard failures (${failures.length}/${declaredShards.length}):\n${failures.join('\n')}`,
    );
  const directories = ['m01', 'm02', 'm04', 'm06']
    .map((name) => join(runRoot, `${name}-${runId}`))
    .concat(cartShards.map((key) => join(runRoot, `m07-${key}-${runId}`)));
  await run(
    process.execPath,
    [join('scripts', 'quality', 'visual-admission-aggregate.mjs'), ...directories],
    {
      ...environment,
      FE058_AGGREGATE_RUN_ID: runId,
      FE058_AGGREGATE_TERMINAL_PATH: join(runRoot, `runner-${runId}`, 'aggregate-terminal.json'),
      VISUAL_ADMISSION_SCREENSHOT_MODE: options.screenshotMode,
    },
  );
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
