import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const evidenceRelativeRoot = 'tests/browser/visual-admission';
const executableIdentityRegistryPath = `${evidenceRelativeRoot}/executable-identity-registry.json`;
const publicCommandManifestPath = 'package.json';
const publicCommandName = 'test:visual-admission';
const publicCommandValue = 'node scripts/quality/visual-admission.mjs';
const supportedExecutableIdentityExtensions = new Set(['.json', '.mjs', '.ps1', '.ts']);

function validateExecutableIdentityPath(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.includes('\\') || normalize(path).replaceAll('\\', '/') !== path || !supportedExecutableIdentityExtensions.has(extname(path)))
    throw new Error(`Unsupported or non-canonical executable identity path: ${path || '(empty)'}`);
  const resolvedPath = resolve(root, path);
  const repositoryRelative = relative(root, resolvedPath);
  if (!repositoryRelative || repositoryRelative === '..' || repositoryRelative.startsWith(`..${sep}`) || isAbsolute(repositoryRelative))
    throw new Error(`Executable identity path escapes the repository: ${path}`);
}

function validateExecutableIdentityRegistry(registry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry) || registry.schema !== 'fe058-admission/executable-identity-registry-v1' || !Array.isArray(registry.paths))
    throw new Error('Malformed executable identity registry.');
  if (registry.paths.length !== 33) throw new Error(`Executable identity registry must contain exactly 33 paths, found ${registry.paths.length}.`);
  const seen = new Set();
  for (const path of registry.paths) {
    validateExecutableIdentityPath(path);
    if (seen.has(path)) throw new Error(`Duplicate executable identity registry path: ${path}`);
    seen.add(path);
  }
  if (!seen.has(executableIdentityRegistryPath)) throw new Error('Executable identity registry must bind its own path.');
  if (!seen.has(publicCommandManifestPath)) throw new Error('Executable identity registry must bind the public command manifest.');
  return [...registry.paths];
}

function assertPublicCommandBinding(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Malformed public command manifest.');
  const scripts = manifest.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) throw new Error('Malformed public command manifest scripts.');
  if (scripts[publicCommandName] !== publicCommandValue)
    throw new Error(`Public command mapping must be ${publicCommandName}=${publicCommandValue}.`);
}

function readCurrentExecutableIdentities(paths) {
  return paths.map((path) => ({ path, sha256: createHash('sha256').update(readFileSync(join(root, path))).digest('hex') }));
}

const targetFiles = validateExecutableIdentityRegistry(JSON.parse(readFileSync(join(root, executableIdentityRegistryPath), 'utf8')));
assertPublicCommandBinding(JSON.parse(readFileSync(join(root, publicCommandManifestPath), 'utf8')));
const currentIdentities = readCurrentExecutableIdentities(targetFiles);
const directories = process.argv.slice(2);
const runId = process.env.FE058_AGGREGATE_RUN_ID;
const terminalPath = process.env.FE058_AGGREGATE_TERMINAL_PATH;
const aggregateProbe = process.env.FE058_AGGREGATE_PROBE;
const screenshotMode = process.env.VISUAL_ADMISSION_SCREENSHOT_MODE ?? 'canonical';
if (!['canonical', 'full'].includes(screenshotMode)) throw new Error(`Unsupported screenshot mode: ${screenshotMode}`);
const resultsRoot = join(root, 'test-results', 'visual-admission', runId);
const resultsRelativeRoot = `test-results/visual-admission/${runId}`;
function writeTerminalSuccess(report) {
  if (!terminalPath) return;
  writeFileSync(terminalPath, `${JSON.stringify({ schema: 'fe058-admission/aggregate-terminal-v1', runId, status: 'complete', report }, null, 2)}\n`, { flag: 'wx' });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function orderedStringArraysEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function stageDurableFile(path, bytes, token) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${token}.tmp`;
  const descriptor = openSync(temporaryPath, 'wx');
  let writeError;
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
  } catch (error) {
    writeError = error;
  } finally {
    closeSync(descriptor);
  }
  if (writeError) {
    rmSync(temporaryPath, { force: true });
    throw writeError;
  }
  return temporaryPath;
}

function restoreCanonicalFile(path, previousBytes, token) {
  if (previousBytes === undefined) {
    rmSync(path, { force: true });
    return;
  }
  const rollbackPath = stageDurableFile(path, previousBytes, `${token}.rollback`);
  renameSync(rollbackPath, path);
}

function publishAcceptedOutputs({ acceptedTerminalPath, manifestPath, reportPath, terminalRecord, reportMarkdown, buildManifest, generationId, resultSnapshotPathPrefix = resultsRelativeRoot, failurePhase = '', assertInputsCurrent = () => {}, onPublicationPhase = () => {} }) {
  const terminalBytes = Buffer.from(stableJson(terminalRecord));
  const reportBytes = Buffer.from(reportMarkdown);
  const manifestRecord = buildManifest({ terminalSha256: sha256(terminalBytes), reportSha256: sha256(reportBytes) });
  if (manifestRecord.result_snapshot) {
    const parsedTerminal = JSON.parse(terminalBytes.toString('utf8'));
    const terminalSnapshot = parsedTerminal.report?.resultSnapshot ?? parsedTerminal.resultSnapshot;
    if (!terminalSnapshot) throw new Error('Missing pre-publication canonical result snapshot terminal contract.');
    const verifiedSnapshot = verifyCanonicalResultSnapshotDigestContract(terminalSnapshot, resultSnapshotPathPrefix);
    if (
      manifestRecord.result_snapshot.schema !== terminalSnapshot.schema ||
      manifestRecord.result_snapshot.count !== terminalSnapshot.count ||
      manifestRecord.result_snapshot.digest_algorithm_id !== terminalSnapshot.digestAlgorithm.id ||
      manifestRecord.result_snapshot.digest_algorithm_version !== terminalSnapshot.digestAlgorithm.version ||
      !orderedStringArraysEqual(manifestRecord.result_snapshot.digest_role_enumeration, terminalSnapshot.digestAlgorithm.roleEnumeration) ||
      manifestRecord.result_snapshot.preimage_byte_length !== terminalSnapshot.preimageByteLength ||
      manifestRecord.result_snapshot.preimage_sha256 !== verifiedSnapshot.digest ||
      manifestRecord.result_snapshot.digest !== verifiedSnapshot.digest
    )
      throw new Error('Pre-publication canonical result snapshot binding verification failed.');
  }
  const manifestBytes = Buffer.from(stableJson(manifestRecord));
  const targets = [acceptedTerminalPath, reportPath, manifestPath];
  const previous = new Map(targets.map((path) => [path, existsSync(path) ? readFileSync(path) : undefined]));
  const staged = new Map();
  const replaced = [];
  try {
    assertInputsCurrent();
    onPublicationPhase('after-validation');
    staged.set(acceptedTerminalPath, stageDurableFile(acceptedTerminalPath, terminalBytes, generationId));
    staged.set(reportPath, stageDurableFile(reportPath, reportBytes, generationId));
    staged.set(manifestPath, stageDurableFile(manifestPath, manifestBytes, generationId));
    onPublicationPhase('after-stage');
    if (failurePhase === 'after-stage') throw new Error('Controlled atomic publication failure after staging.');
    renameSync(staged.get(acceptedTerminalPath), acceptedTerminalPath);
    staged.delete(acceptedTerminalPath);
    replaced.push(acceptedTerminalPath);
    onPublicationPhase('after-terminal');
    if (failurePhase === 'after-terminal') throw new Error('Controlled atomic publication failure after terminal replacement.');
    renameSync(staged.get(reportPath), reportPath);
    staged.delete(reportPath);
    replaced.push(reportPath);
    onPublicationPhase('after-report');
    if (failurePhase === 'after-report') throw new Error('Controlled atomic publication failure after report replacement.');
    // Manifest is the logical commit point. It binds the already-published terminal
    // and report bytes; an interrupted or mixed generation is therefore rejected.
    // Recheck the complete input snapshot at the final commit boundary.
    assertInputsCurrent();
    renameSync(staged.get(manifestPath), manifestPath);
    staged.delete(manifestPath);
    replaced.push(manifestPath);
    onPublicationPhase('after-manifest');
    assertInputsCurrent();
    if (failurePhase === 'after-manifest') throw new Error('Controlled atomic publication failure after manifest replacement.');
    verifyCanonicalOutputBinding(manifestPath, reportPath, acceptedTerminalPath, generationId, resultSnapshotPathPrefix);
  } catch (error) {
    let rollbackError;
    for (const path of [...replaced].reverse()) {
      try {
        restoreCanonicalFile(path, previous.get(path), generationId);
      } catch (candidate) {
        rollbackError ??= candidate;
      }
    }
    if (rollbackError) throw new Error(`Atomic publication failed and rollback was incomplete: ${String(error)}; ${String(rollbackError)}`);
    throw error;
  } finally {
    for (const temporaryPath of staged.values()) rmSync(temporaryPath, { force: true });
  }
  return { terminalSha256: sha256(terminalBytes), reportSha256: sha256(reportBytes), manifestSha256: sha256(manifestBytes) };
}

function verifyCanonicalOutputBinding(manifestPath, reportPath, acceptedTerminalPath, generationId, resultSnapshotPathPrefix = resultsRelativeRoot) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const terminalBytes = readFileSync(acceptedTerminalPath);
  const terminal = JSON.parse(terminalBytes.toString('utf8'));
  const terminalSnapshot = terminal.report?.resultSnapshot ?? terminal.resultSnapshot;
  if (manifest.generation_id !== generationId || manifest.terminal.sha256 !== sha256(terminalBytes) || manifest.close_or_route.sha256 !== sha256(readFileSync(reportPath)))
    throw new Error('Canonical output binding verification failed.');
  if (manifest.result_snapshot) {
    if (!terminalSnapshot) throw new Error('Missing canonical result snapshot terminal contract.');
    const verifiedSnapshot = verifyCanonicalResultSnapshotDigestContract(terminalSnapshot, resultSnapshotPathPrefix);
    if (
      manifest.result_snapshot.schema !== terminalSnapshot.schema ||
      manifest.result_snapshot.count !== terminalSnapshot.count ||
      manifest.result_snapshot.digest !== terminalSnapshot.digest ||
      manifest.result_snapshot.digest_algorithm_id !== terminalSnapshot.digestAlgorithm.id ||
      manifest.result_snapshot.digest_algorithm_version !== terminalSnapshot.digestAlgorithm.version ||
      !orderedStringArraysEqual(manifest.result_snapshot.digest_role_enumeration, terminalSnapshot.digestAlgorithm.roleEnumeration) ||
      manifest.result_snapshot.preimage_byte_length !== terminalSnapshot.preimageByteLength ||
      manifest.result_snapshot.preimage_sha256 !== verifiedSnapshot.digest
    )
      throw new Error('Canonical result snapshot manifest binding verification failed.');
  }
}

const atomicOutputProof = process.env.FE058_ATOMIC_OUTPUT_PROOF;
if (atomicOutputProof) {
  const proofRoot = mkdtempSync(join(tmpdir(), 'fe058-atomic-proof-'));
  const resolvedTempRoot = resolve(tmpdir());
  if (!resolve(proofRoot).startsWith(`${resolvedTempRoot}${sep}`)) throw new Error(`Refusing atomic proof outside the system temporary directory: ${proofRoot}`);
  try {
    const proofTerminalPath = join(proofRoot, 'aggregate-terminal.json');
    const proofReportPath = join(proofRoot, 'close-or-route.md');
    const proofManifestPath = join(proofRoot, 'fe058-admission.json');
    const oldBytes = new Map([
      [proofTerminalPath, Buffer.from('old-terminal')],
      [proofReportPath, Buffer.from('old-report')],
      [proofManifestPath, Buffer.from('old-manifest')],
    ]);
    for (const [path, bytes] of oldBytes) writeFileSync(path, bytes, { flag: 'wx' });
    const generationId = 'atomic-proof-generation';
    const failurePhase = atomicOutputProof === 'positive' ? '' : atomicOutputProof;
    let rejected = false;
    try {
      publishAcceptedOutputs({
        acceptedTerminalPath: proofTerminalPath,
        manifestPath: proofManifestPath,
        reportPath: proofReportPath,
        terminalRecord: { schema: 'fe058-admission/aggregate-terminal-v1', runId: 'proof-run', status: 'complete', report: { generationId } },
        reportMarkdown: `# proof\n\ngeneration: ${generationId}\n`,
        buildManifest: ({ terminalSha256, reportSha256 }) => ({ schema: 'fe058-admission/v3', generation_id: generationId, terminal: { sha256: terminalSha256 }, close_or_route: { sha256: reportSha256 } }),
        generationId,
        failurePhase,
      });
    } catch (error) {
      if (!failurePhase || !String(error).includes('Controlled atomic publication failure')) throw error;
      rejected = true;
    }
    if (failurePhase) {
      if (!rejected) throw new Error(`Atomic output negative proof unexpectedly passed: ${failurePhase}`);
      for (const [path, bytes] of oldBytes) if (!readFileSync(path).equals(bytes)) throw new Error(`Atomic output negative proof replaced ${basename(path)} during ${failurePhase}.`);
    } else {
      verifyCanonicalOutputBinding(proofManifestPath, proofReportPath, proofTerminalPath, generationId);
    }
    process.stdout.write(`${JSON.stringify({ atomicOutputProof, accepted: !failurePhase, rejected, canonicalOutputsUnchanged: Boolean(failurePhase) })}\n`);
    rmSync(proofRoot, { recursive: true, force: true });
    process.exit(0);
  } finally {
    rmSync(proofRoot, { recursive: true, force: true });
  }
}

const snapshotPublicationProof = process.env.FE058_SNAPSHOT_PUBLICATION_PROOF;
if (snapshotPublicationProof) {
  const proofRoot = mkdtempSync(join(tmpdir(), 'fe058-snapshot-publication-proof-'));
  const resolvedTempRoot = resolve(tmpdir());
  if (!resolve(proofRoot).startsWith(`${resolvedTempRoot}${sep}`)) throw new Error(`Refusing snapshot publication proof outside the system temporary directory: ${proofRoot}`);
  try {
    const proofInputPath = join(proofRoot, 'result-input.json');
    const proofTerminalPath = join(proofRoot, 'aggregate-terminal.json');
    const proofReportPath = join(proofRoot, 'close-or-route.md');
    const proofManifestPath = join(proofRoot, 'fe058-admission.json');
    const oldBytes = new Map([
      [proofTerminalPath, Buffer.from('old-terminal')],
      [proofReportPath, Buffer.from('old-report')],
      [proofManifestPath, Buffer.from('old-manifest')],
    ]);
    writeFileSync(proofInputPath, 'snapshot-input', { flag: 'wx' });
    for (const [path, bytes] of oldBytes) writeFileSync(path, bytes, { flag: 'wx' });
    const expectedInputSha256 = sha256(readFileSync(proofInputPath));
    const generationId = 'snapshot-publication-proof-generation';
    const driftPhase = snapshotPublicationProof === 'positive' ? '' : snapshotPublicationProof;
    let rejected = false;
    let injected = false;
    const assertInputsCurrent = () => {
      if (!existsSync(proofInputPath) || sha256(readFileSync(proofInputPath)) !== expectedInputSha256)
        throw new Error('Canonical result snapshot drifted before manifest commit.');
    };
    try {
      publishAcceptedOutputs({
        acceptedTerminalPath: proofTerminalPath,
        manifestPath: proofManifestPath,
        reportPath: proofReportPath,
        terminalRecord: { schema: 'fe058-admission/aggregate-terminal-v1', runId: 'proof-run', status: 'complete' },
        reportMarkdown: `# snapshot publication proof\n\ngeneration: ${generationId}\n`,
        buildManifest: ({ terminalSha256, reportSha256 }) => ({ schema: 'fe058-admission/v5', generation_id: generationId, terminal: { sha256: terminalSha256 }, close_or_route: { sha256: reportSha256 } }),
        generationId,
        assertInputsCurrent,
        onPublicationPhase: (phase) => {
          if (!injected && phase === driftPhase) {
            writeFileSync(proofInputPath, `drift-${phase}`);
            injected = true;
          }
        },
      });
    } catch (error) {
      if (!driftPhase || !String(error).includes('Canonical result snapshot drifted')) throw error;
      rejected = true;
    }
    if (driftPhase) {
      if (!rejected) throw new Error(`Snapshot publication drift proof unexpectedly passed: ${driftPhase}`);
      for (const [path, bytes] of oldBytes) if (!readFileSync(path).equals(bytes)) throw new Error(`Snapshot publication drift proof replaced ${basename(path)} during ${driftPhase}.`);
    } else {
      verifyCanonicalOutputBinding(proofManifestPath, proofReportPath, proofTerminalPath, generationId);
    }
    process.stdout.write(`${JSON.stringify({ snapshotPublicationProof, accepted: !driftPhase, rejected, canonicalOutputsUnchanged: Boolean(driftPhase) })}\n`);
    rmSync(proofRoot, { recursive: true, force: true });
    process.exit(0);
  } finally {
    rmSync(proofRoot, { recursive: true, force: true });
  }
}
const widths = [320, 390, 617, 767, 768, 895, 1100, 1280, 1440];
const locales = ['en', 'ru', 'uz'];
const zoomWidths = [320, 768, 1280];
const cartShardKeys = ['root', 'course', 'signup', 'login', 'forgot', 'reset', 'learning', 'enrollment', 'enrollment-ai', 'ai', 'instructor', 'instructor-edit', 'instructor-enrollments', 'lesson-edit', 'malformed-empty', 'malformed-relative', 'external', 'self', 'clear'];
const contexts = [
  ['M01', 'completion-ready', locales],
  ['M02', 'anonymous-catalog', locales], ['M02', 'course-detail-success', locales],
  ['M03', 'hero-price-sort', locales], ['M04', 'forgot-back-link', locales],
  ['M05', 'empty-email-safe-error', locales],
  ['M06', 'full-page-actions', locales], ['M06', 'full-page-menu', locales], ['M06', 'mini-chat', ['en']],
  ...cartShardKeys.slice(0, -1).map((key) => ['M07', `return-${key}`, locales]),
  ['M08', 'clear-confirmation', locales], ['M08', 'clear-pending', ['en']],
  ['M09', 'public-catalog-visibility', locales],
];
const segment = (value) => String(value).replaceAll(/[^a-zA-Z0-9._-]/g, '_');
const expectedCellIds = new Set(contexts.flatMap(([matrix, scenario, scenarioLocales]) => scenarioLocales.flatMap((locale) => [
  ...widths.map((width) => [matrix, scenario, locale, width, 100]),
  ...zoomWidths.map((width) => [matrix, scenario, locale, width, 200]),
].map((parts) => parts.map(segment).join('--')))));
function expectedCapturedCellIdsForMode(mode) {
  if (!['canonical', 'full'].includes(mode)) throw new Error(`Unsupported screenshot mode: ${mode}`);
  return new Set([...expectedCellIds].filter((cellId) => {
    const [, , , width, zoom] = cellId.split('--');
    return mode === 'full' || (zoom === '100' && ['320', '768', '1280'].includes(width));
  }));
}
const expectedCapturedCellIds = expectedCapturedCellIdsForMode(screenshotMode);
function expectedShardDirectoryNames(expectedRunId) {
  return [`m01-${expectedRunId}`, `m02-${expectedRunId}`, `m04-${expectedRunId}`, `m06-${expectedRunId}`, ...cartShardKeys.map((key) => `m07-${key}-${expectedRunId}`)];
}

const resultSnapshotSchema = 'fe058-admission/canonical-result-snapshot-v2';
const resultSnapshotDigestMagic = 'FE058-CANONICAL-RESULT-SNAPSHOT-DIGEST-V1';
const resultSnapshotRoleEnumeration = Object.freeze(['terminal-marker', 'cell-result', 'screenshot', 'm01-outcome', 'declared-pending-release']);
const resultSnapshotDigestAlgorithm = Object.freeze({
  id: 'fe058-snapshot-sha256-utf8-lf-tsv-v1',
  version: 1,
  hash: 'SHA-256',
  encoding: 'UTF-8',
  bom: false,
  recordSeparator: 'LF (U+000A)',
  fieldSeparator: 'TAB (U+0009)',
  finalNewline: true,
  entryOrder: 'ascending unsigned UTF-8 byte order by path',
  pathSyntax: 'relative slash-separated path; no empty, dot, dot-dot, drive-prefix, backslash, or colon segment syntax',
  decimalEncoding: 'unsigned base-10 ASCII without leading zeroes except 0',
  sha256Encoding: '64 lowercase hexadecimal ASCII characters',
  forbiddenPathCodePoints: ['U+0000-U+001F', 'U+003A', 'U+007F'],
  unicodeNormalization: 'NFC',
  roleEnumeration: resultSnapshotRoleEnumeration,
  grammar: [
    `${resultSnapshotDigestMagic}<LF>`,
    'schema<TAB>{schema}<LF>',
    'algorithm<TAB>{algorithm-id}<LF>',
    'version<TAB>{algorithm-version-decimal}<LF>',
    'roles<TAB>terminal-marker<TAB>cell-result<TAB>screenshot<TAB>m01-outcome<TAB>declared-pending-release<LF>',
    'count<TAB>{count-decimal}<LF>',
    'entry<TAB>{path}<TAB>{size-decimal}<TAB>{sha256}<TAB>{role}<LF>',
  ],
});
const resultSnapshotRoles = new Set(resultSnapshotRoleEnumeration);
function expectedResultSnapshotRoleCountsForCapturedCells(capturedCellIds) {
  return new Map([
    ['terminal-marker', 23],
    ['cell-result', expectedCellIds.size],
    ['screenshot', capturedCellIds.size + 1],
    ['m01-outcome', 1],
    ['declared-pending-release', 1],
  ]);
}
const expectedResultSnapshotRoleCounts = expectedResultSnapshotRoleCountsForCapturedCells(expectedCapturedCellIds);

function compareCanonicalPaths(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function isUnicodeScalarSequence(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function validateResultSnapshotPath(path, pathPrefix) {
  const segments = typeof path === 'string' ? path.split('/') : [];
  if (
    typeof path !== 'string' ||
    !path ||
    !isUnicodeScalarSequence(path) ||
    path.normalize('NFC') !== path ||
    // eslint-disable-next-line no-control-regex -- rejects snapshot record delimiters and controls.
    /[\u0000-\u001f:\u007f]/u.test(path) ||
    path.startsWith('/') ||
    /^[a-zA-Z]:/u.test(path) ||
    path.includes('\\') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    (pathPrefix && !path.startsWith(`${pathPrefix}/`))
  )
    throw new Error(`Unsupported or non-canonical result snapshot path: ${path || '(empty)'}`);
}

function validateResultSnapshotRoleExtension(path, role) {
  if (!resultSnapshotRoles.has(role)) throw new Error(`Unsupported result snapshot role: ${role || '(empty)'}`);
  const extension = extname(path);
  if ((role === 'screenshot' && extension !== '.png') || (role !== 'screenshot' && extension !== '.json'))
    throw new Error(`Unsupported result snapshot extension for ${role}: ${path}`);
}

function validateCanonicalResultSnapshotHeaderText(value, label) {
  if (
    typeof value !== 'string' ||
    !value ||
    !isUnicodeScalarSequence(value) ||
    value.normalize('NFC') !== value ||
    // eslint-disable-next-line no-control-regex -- header records must be delimiter-safe.
    /[\u0000-\u001f\u007f]/u.test(value)
  )
    throw new Error(`Malformed canonical result snapshot ${label}.`);
}

function validateCanonicalResultSnapshotDigestHeader(schema, digestAlgorithm) {
  validateCanonicalResultSnapshotHeaderText(schema, 'schema header value');
  if (!digestAlgorithm || typeof digestAlgorithm !== 'object' || Array.isArray(digestAlgorithm))
    throw new Error('Missing canonical result snapshot digest algorithm.');
  validateCanonicalResultSnapshotHeaderText(digestAlgorithm.id, 'algorithm header value');
  if (!Number.isSafeInteger(digestAlgorithm.version) || digestAlgorithm.version < 0)
    throw new Error('Malformed canonical result snapshot algorithm version header value.');
  if (!Array.isArray(digestAlgorithm.roleEnumeration) || !digestAlgorithm.roleEnumeration.length)
    throw new Error('Malformed canonical result snapshot role enumeration header value.');
  const uniqueRoles = new Set();
  for (const role of digestAlgorithm.roleEnumeration) {
    validateCanonicalResultSnapshotHeaderText(role, 'role enumeration header value');
    if (uniqueRoles.has(role)) throw new Error(`Duplicate canonical result snapshot role enumeration value: ${role}.`);
    uniqueRoles.add(role);
  }
}

function validateCanonicalResultSnapshotEntries(schema, count, entries, pathPrefix = '') {
  if (schema !== resultSnapshotSchema) throw new Error(`Unsupported canonical result snapshot schema: ${schema || '(empty)'}.`);
  if (!Number.isSafeInteger(count) || count < 0 || !Array.isArray(entries) || entries.length !== count)
    throw new Error('Malformed canonical result snapshot count or entries.');
  let priorPath;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).length !== 4 || !['path', 'size', 'sha256', 'role'].every((key) => Object.hasOwn(entry, key)))
      throw new Error('Malformed canonical result snapshot entry fields.');
    validateResultSnapshotPath(entry.path, pathPrefix);
    validateResultSnapshotRoleExtension(entry.path, entry.role);
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) throw new Error(`Malformed result snapshot size: ${entry.path}.`);
    if (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Malformed result snapshot SHA-256: ${entry.path}.`);
    if (priorPath !== undefined && compareCanonicalPaths(priorPath, entry.path) >= 0)
      throw new Error(`Result snapshot entries are not in unique ascending UTF-8 byte order: ${entry.path}.`);
    priorPath = entry.path;
  }
}

function encodeCanonicalResultSnapshotPreimage(schema, count, entries, pathPrefix = '', digestAlgorithm = resultSnapshotDigestAlgorithm) {
  assertCanonicalResultSnapshotDigestAlgorithm(digestAlgorithm);
  validateCanonicalResultSnapshotEntries(schema, count, entries, pathPrefix);
  const lines = [
    resultSnapshotDigestMagic,
    `schema\t${schema}`,
    `algorithm\t${digestAlgorithm.id}`,
    `version\t${digestAlgorithm.version}`,
    `roles\t${digestAlgorithm.roleEnumeration.join('\t')}`,
    `count\t${count}`,
  ];
  for (const entry of entries) lines.push(`entry\t${entry.path}\t${entry.size}\t${entry.sha256}\t${entry.role}`);
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function recomputeCanonicalResultSnapshotDigestIndependently(schema, count, entries, pathPrefix = '', digestAlgorithm = resultSnapshotDigestAlgorithm) {
  assertCanonicalResultSnapshotDigestAlgorithm(digestAlgorithm);
  validateCanonicalResultSnapshotEntries(schema, count, entries, pathPrefix);
  const hash = createHash('sha256');
  let byteLength = 0;
  const append = (value) => {
    const bytes = Buffer.from(value, 'utf8');
    hash.update(bytes);
    byteLength += bytes.length;
  };
  append(resultSnapshotDigestMagic);
  append('\n');
  append('schema');
  append('\t');
  append(schema);
  append('\n');
  append('algorithm');
  append('\t');
  append(digestAlgorithm.id);
  append('\n');
  append('version');
  append('\t');
  append(String(digestAlgorithm.version));
  append('\n');
  append('roles');
  for (const role of digestAlgorithm.roleEnumeration) {
    append('\t');
    append(role);
  }
  append('\n');
  append('count');
  append('\t');
  append(String(count));
  append('\n');
  for (const entry of entries) {
    append('entry');
    append('\t');
    append(entry.path);
    append('\t');
    append(String(entry.size));
    append('\t');
    append(entry.sha256);
    append('\t');
    append(entry.role);
    append('\n');
  }
  return { digest: hash.digest('hex'), preimageByteLength: byteLength };
}

function computeCanonicalResultSnapshotDigest(schema, count, entries, pathPrefix = '', digestAlgorithm = resultSnapshotDigestAlgorithm) {
  const preimage = encodeCanonicalResultSnapshotPreimage(schema, count, entries, pathPrefix, digestAlgorithm);
  const production = { digest: sha256(preimage), preimageByteLength: preimage.length };
  const independent = recomputeCanonicalResultSnapshotDigestIndependently(schema, count, entries, pathPrefix, digestAlgorithm);
  if (production.digest !== independent.digest || production.preimageByteLength !== independent.preimageByteLength)
    throw new Error('Canonical result snapshot independent digest parity failed.');
  return production;
}

function assertCanonicalResultSnapshotDigestAlgorithm(candidate) {
  validateCanonicalResultSnapshotDigestHeader(resultSnapshotSchema, candidate);
  for (const [key, value] of Object.entries(resultSnapshotDigestAlgorithm)) {
    if (Array.isArray(value)) {
      if (!Array.isArray(candidate[key]) || candidate[key].length !== value.length || value.some((item, index) => candidate[key][index] !== item))
        throw new Error(`Canonical result snapshot digest algorithm ${key} mismatch.`);
    } else if (candidate[key] !== value) {
      throw new Error(`Canonical result snapshot digest algorithm ${key} mismatch.`);
    }
  }
  if (Object.keys(candidate).length !== Object.keys(resultSnapshotDigestAlgorithm).length)
    throw new Error('Canonical result snapshot digest algorithm contains unsupported fields.');
}

function verifyCanonicalResultSnapshotDigestContract(contract, pathPrefix = '') {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) throw new Error('Missing canonical result snapshot contract.');
  assertCanonicalResultSnapshotDigestAlgorithm(contract.digestAlgorithm);
  const computed = computeCanonicalResultSnapshotDigest(contract.schema, contract.count, contract.entries, pathPrefix, contract.digestAlgorithm);
  if (!Number.isSafeInteger(contract.preimageByteLength) || contract.preimageByteLength !== computed.preimageByteLength || contract.digest !== computed.digest)
    throw new Error('Canonical result snapshot digest verification failed.');
  return computed;
}

function resultSnapshotManifestBinding(contract, pathPrefix) {
  const verified = verifyCanonicalResultSnapshotDigestContract(contract, pathPrefix);
  return {
    schema: contract.schema,
    count: contract.count,
    digest_algorithm_id: contract.digestAlgorithm.id,
    digest_algorithm_version: contract.digestAlgorithm.version,
    digest_role_enumeration: [...contract.digestAlgorithm.roleEnumeration],
    preimage_byte_length: contract.preimageByteLength,
    preimage_sha256: verified.digest,
    digest: contract.digest,
  };
}

function buildResultSnapshotContract(candidates, pathPrefix) {
  const exactPaths = new Set();
  const caseFoldedPaths = new Set();
  const entries = [];
  for (const candidate of candidates) {
    validateResultSnapshotPath(candidate.path, pathPrefix);
    validateResultSnapshotRoleExtension(candidate.path, candidate.role);
    if (!Buffer.isBuffer(candidate.bytes)) throw new Error(`Missing result snapshot bytes: ${candidate.path}`);
    if (exactPaths.has(candidate.path)) throw new Error(`Duplicate result snapshot path: ${candidate.path}`);
    const caseFoldedPath = candidate.path.toLocaleLowerCase('en-US');
    if (caseFoldedPaths.has(caseFoldedPath)) throw new Error(`Case-colliding result snapshot path: ${candidate.path}`);
    exactPaths.add(candidate.path);
    caseFoldedPaths.add(caseFoldedPath);
    entries.push({ path: candidate.path, size: candidate.bytes.length, sha256: sha256(candidate.bytes), role: candidate.role });
  }
  entries.sort((left, right) => compareCanonicalPaths(left.path, right.path));
  const digest = computeCanonicalResultSnapshotDigest(resultSnapshotSchema, entries.length, entries, pathPrefix);
  return {
    schema: resultSnapshotSchema,
    digestAlgorithm: resultSnapshotDigestAlgorithm,
    preimageByteLength: digest.preimageByteLength,
    count: entries.length,
    entries,
    digest: digest.digest,
  };
}

function classifyResultSnapshotRole(shardDirectory, filePath) {
  const shardRelativePath = relative(shardDirectory, filePath).replaceAll('\\', '/');
  if (!shardRelativePath || shardRelativePath === '..' || shardRelativePath.startsWith('../') || isAbsolute(shardRelativePath))
    throw new Error(`Result snapshot file escapes its shard directory: ${filePath}`);
  if (shardRelativePath === '.last-run.json') return 'terminal-marker';
  const segments = shardRelativePath.split('/');
  if (segments.length === 3 && segments[0] && segments[1] === 'cells' && segments[2].endsWith('.json')) return 'cell-result';
  if (segments.length === 3 && segments[0] && segments[1] === 'screenshots' && segments[2].endsWith('.png')) return 'screenshot';
  if (segments.length === 2 && segments[0] && segments[1] === 'm01-outcome.json') return 'm01-outcome';
  if (segments.length === 2 && segments[0] && segments[1] === 'declared-pending-release.json') return 'declared-pending-release';
  throw new Error(`Unsupported result snapshot extension or role: ${filePath}`);
}

function collectResultSnapshotFiles(directory) {
  const files = [];
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => compareCanonicalPaths(left.name, right.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Result snapshot aliases are forbidden: ${path}`);
    if (entry.isDirectory()) files.push(...collectResultSnapshotFiles(path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported result snapshot filesystem entry: ${path}`);
  }
  return files;
}

function validateCanonicalResultSnapshotInventory(contract, terminalShards, pathPrefix, expectedRoleCounts = expectedResultSnapshotRoleCounts) {
  const counts = new Map([...resultSnapshotRoles].map((role) => [role, 0]));
  for (const entry of contract.entries) counts.set(entry.role, counts.get(entry.role) + 1);
  for (const [role, expectedCount] of expectedRoleCounts) {
    if (counts.get(role) !== expectedCount)
      throw new Error(`Canonical result snapshot ${role} count mismatch: expected=${expectedCount} observed=${counts.get(role)}.`);
  }
  const markerPaths = new Set(contract.entries.filter(({ role }) => role === 'terminal-marker').map(({ path }) => path));
  for (const shard of terminalShards) {
    const expectedMarkerPath = `${pathPrefix}/${basename(shard.resultDirectory)}/.last-run.json`;
    if (!markerPaths.has(expectedMarkerPath)) throw new Error(`Missing canonical terminal marker snapshot: ${expectedMarkerPath}`);
  }
  if (contract.count !== [...expectedRoleCounts.values()].reduce((total, count) => total + count, 0))
    throw new Error(`Canonical result snapshot file count mismatch: ${contract.count}.`);
}

function captureCanonicalResultSnapshot(candidateDirectories, expectedRunId, { resultsRoot: snapshotResultsRoot = resultsRoot, pathPrefix = resultsRelativeRoot, expectedCapturedCells = expectedCapturedCellIds } = {}) {
  const terminalShards = validateTerminalDirectories(candidateDirectories, expectedRunId, snapshotResultsRoot);
  const candidates = [];
  const buffers = new Map();
  for (const shard of terminalShards) {
    for (const filePath of collectResultSnapshotFiles(shard.resultDirectory)) {
      const role = classifyResultSnapshotRole(shard.resultDirectory, filePath);
      const logicalPath = `${pathPrefix}/${relative(snapshotResultsRoot, filePath).replaceAll('\\', '/')}`;
      const bytes = readFileSync(filePath);
      candidates.push({ path: logicalPath, role, bytes });
      buffers.set(logicalPath, bytes);
    }
  }
  const contract = buildResultSnapshotContract(candidates, pathPrefix);
  validateCanonicalResultSnapshotInventory(contract, terminalShards, pathPrefix, expectedResultSnapshotRoleCountsForCapturedCells(expectedCapturedCells));
  const entriesByPath = new Map(contract.entries.map((entry) => [entry.path, entry]));
  const capturedTerminalShards = terminalShards.map((shard) => {
    const markerPath = `${pathPrefix}/${basename(shard.resultDirectory)}/.last-run.json`;
    const marker = JSON.parse(buffers.get(markerPath).toString('utf8'));
    if (!marker || marker.status !== 'passed') throw new Error(`Non-passed terminal marker: ${markerPath}`);
    return { ...shard, terminalSha256: entriesByPath.get(markerPath).sha256 };
  });
  return { contract, buffers, entriesByPath, terminalShards: capturedTerminalShards, options: { resultsRoot: snapshotResultsRoot, pathPrefix } };
}

function assertCanonicalResultSnapshotCurrent(snapshot, candidateDirectories, expectedRunId) {
  const refreshed = captureCanonicalResultSnapshot(candidateDirectories, expectedRunId, snapshot.options);
  const left = refreshed.contract;
  const right = snapshot.contract;
  const entriesEqual =
    left.entries.length === right.entries.length &&
    left.entries.every((entry, index) => {
      const other = right.entries[index];
      return other && entry.path === other.path && entry.size === other.size && entry.sha256 === other.sha256 && entry.role === other.role;
    });
  if (
    left.schema !== right.schema ||
    left.count !== right.count ||
    left.preimageByteLength !== right.preimageByteLength ||
    left.digest !== right.digest ||
    left.digestAlgorithm.id !== right.digestAlgorithm.id ||
    left.digestAlgorithm.version !== right.digestAlgorithm.version ||
    !entriesEqual
  )
    throw new Error('Canonical result snapshot drifted before manifest commit.');
}

function parseCanonicalResultJson(snapshot, path, expectedRole) {
  const logicalPath = `${snapshot.options.pathPrefix}/${relative(snapshot.options.resultsRoot, path).replaceAll('\\', '/')}`;
  const entry = snapshot.entriesByPath.get(logicalPath);
  if (!entry || entry.role !== expectedRole) throw new Error(`Missing canonical ${expectedRole} snapshot: ${logicalPath}`);
  try {
    return JSON.parse(snapshot.buffers.get(logicalPath).toString('utf8'));
  } catch {
    throw new Error(`Malformed canonical ${expectedRole} JSON: ${logicalPath}`);
  }
}

function resolveCanonicalScreenshot(snapshot, referenceBaseDirectory, screenshotReference) {
  if (typeof screenshotReference !== 'string' || !screenshotReference || isAbsolute(screenshotReference))
    throw new Error(`Malformed canonical screenshot reference: ${screenshotReference || '(empty)'}`);
  const normalizedReference = screenshotReference.replaceAll('\\', '/');
  if (normalize(normalizedReference).replaceAll('\\', '/') !== normalizedReference)
    throw new Error(`Aliased canonical screenshot reference: ${screenshotReference}`);
  const screenshotPath = resolve(referenceBaseDirectory, normalizedReference);
  const logicalPath = `${snapshot.options.pathPrefix}/${relative(snapshot.options.resultsRoot, screenshotPath).replaceAll('\\', '/')}`;
  const entry = snapshot.entriesByPath.get(logicalPath);
  if (!entry || entry.role !== 'screenshot') throw new Error(`Missing canonical screenshot snapshot: ${logicalPath}`);
  return entry;
}

function absoluteCanonicalResultPath(snapshot, logicalPath) {
  const relativePath = logicalPath.slice(snapshot.options.pathPrefix.length + 1);
  return resolve(snapshot.options.resultsRoot, relativePath);
}

function toRepositoryRelative(path) {
  const repositoryRelative = relative(root, resolve(path));
  if (!repositoryRelative || repositoryRelative === '..' || repositoryRelative.startsWith(`..${sep}`) || isAbsolute(repositoryRelative))
    throw new Error(`Evidence path escapes the repository: ${path}`);
  return repositoryRelative.replaceAll('\\', '/');
}

function validateTerminalDirectories(candidateDirectories, expectedRunId, snapshotResultsRoot = resultsRoot) {
  if (!expectedRunId) throw new Error('Terminal-family validation requires a RunId.');
  const expectedNames = expectedShardDirectoryNames(expectedRunId);
  if (candidateDirectories.length !== expectedNames.length) throw new Error(`Expected exactly ${expectedNames.length} terminal result directories, found ${candidateDirectories.length}.`);
  const terminalShards = [];
  for (let index = 0; index < expectedNames.length; index += 1) {
    const expectedDirectory = resolve(snapshotResultsRoot, expectedNames[index]);
    const actualDirectory = resolve(candidateDirectories[index]);
    if (actualDirectory !== expectedDirectory) throw new Error(`Unexpected terminal result directory at index ${index}: ${candidateDirectories[index]}`);
    if (lstatSync(actualDirectory).isSymbolicLink()) throw new Error(`Terminal result directory aliases are forbidden: ${actualDirectory}`);
    const markerPath = join(actualDirectory, '.last-run.json');
    if (!existsSync(markerPath)) throw new Error(`Missing terminal marker: ${markerPath}`);
    const markerBytes = readFileSync(markerPath);
    let marker;
    try { marker = JSON.parse(markerBytes.toString('utf8')); } catch { throw new Error(`Malformed terminal marker: ${markerPath}`); }
    if (!marker || marker.status !== 'passed') throw new Error(`Non-passed terminal marker: ${markerPath}`);
    terminalShards.push({
      resultDirectory: actualDirectory,
      terminalMarker: markerPath,
      terminalSha256: sha256(markerBytes),
      status: 'passed',
    });
  }
  return terminalShards;
}

function assertTerminalShardSnapshotCurrent(terminalShards) {
  for (const shard of terminalShards) {
    if (!existsSync(shard.terminalMarker) || sha256(readFileSync(shard.terminalMarker)) !== shard.terminalSha256)
      throw new Error(`Terminal marker drifted before publication: ${shard.terminalMarker}`);
  }
}
const records = [];
const allowedRequestFailures = new Set([
  'GET /cart net::ERR_ABORTED',
  'GET /courses net::ERR_ABORTED',
  'GET /enrollments/4 net::ERR_ABORTED',
  'GET /src/app/layouts/assets/learnhub-book-ui018.png net::ERR_ABORTED',
  'GET /courses/7 net::ERR_ABORTED',
  'GET /src/pages/ai-chat-page/assets/ai-chat-hero-ui020-1.png net::ERR_ABORTED',
  'POST /courses/7/lessons/12/incomplete net::ERR_ABORTED',
]);
const allowedLocaleReloadTeardowns = new Set([
  'GET /courses/7/lessons net::ERR_ABORTED',
  'GET /courses/7/progress net::ERR_ABORTED',
]);
const allowedWrites = new Set([
  'POST /courses/7/lessons/12/complete',
  'POST /courses/7/lessons/12/incomplete',
  'DELETE /cart',
]);
if (aggregateProbe === 'failure') throw new Error('Controlled aggregate failure probe.');
if (aggregateProbe === 'success') {
  const report = { schema: 'fe058-admission/aggregate-v2-probe', runId, result: 'complete' };
  writeTerminalSuccess(report);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exit(0);
}
if (aggregateProbe === 'missing-terminal') {
  process.stdout.write(`${JSON.stringify({ schema: 'fe058-admission/aggregate-v2-probe', runId, result: 'complete-without-terminal' })}\n`);
  process.exit(0);
}
if (aggregateProbe === 'stale-terminal') {
  writeFileSync(terminalPath, `${JSON.stringify({ schema: 'fe058-admission/aggregate-terminal-v1', runId: `${runId}-stale`, status: 'complete' })}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ schema: 'fe058-admission/aggregate-v2-probe', runId, result: 'complete-with-stale-terminal' })}\n`);
  process.exit(0);
}
export function validateInteractionRecord(record) {
  const interaction = record.interaction;
  if (typeof interaction?.target !== 'string' || !interaction.target || !['focus_transition', 'modal_focus_containment'].includes(interaction.mode) || !['focus', 'keyboard', 'minTarget44'].every((name) => interaction[name] && ['pass', 'fail', 'not_applicable'].includes(interaction[name].status)))
    throw new Error(`Malformed interaction record: ${record.cellId}`);
  const isPendingContainment = record.matrix === 'M08' && record.scenario === 'clear-pending' && record.state === 'clear-pending' && record.session === 'authenticated';
  if (interaction.mode === 'modal_focus_containment') {
    if (!isPendingContainment) throw new Error(`Modal containment outside exact pending M08 state: ${record.cellId}`);
    const modal = interaction.modal;
    if (!modal || typeof modal.initialDialogFocus !== 'boolean' || typeof modal.tabFocusWithinDialog !== 'boolean' || typeof modal.noBackgroundFocus !== 'boolean' || !Number.isInteger(modal.enabledDialogActions))
      throw new Error(`Malformed modal containment evidence: ${record.cellId}`);
    if (modal.enabledDialogActions !== 0) throw new Error(`Modal containment claimed with enabled dialog action: ${record.cellId}`);
    if (!modal.initialDialogFocus || !modal.tabFocusWithinDialog || !modal.noBackgroundFocus) throw new Error(`Failed modal focus containment: ${record.cellId}`);
  } else if (isPendingContainment) {
    throw new Error(`Pending M08 modal requires containment evidence: ${record.cellId}`);
  }
  for (const name of ['focus', 'keyboard', 'minTarget44']) {
    const check = interaction[name];
    if (record.matrix === 'M09') {
      if (check.status !== 'not_applicable' || typeof check.reason !== 'string' || !check.reason.trim())
        throw new Error(`Unjustified report-only interaction evidence: ${record.cellId} ${name}`);
    } else if (check.status !== 'pass') {
      throw new Error(`Required applicable interaction failed: ${record.cellId} ${name}=${check.status}`);
    }
  }
}
export function validateNavigationTeardowns(record) {
  const teardowns = record.diagnostics?.navigationTeardowns;
  if (!Array.isArray(teardowns)) throw new Error(`Malformed navigation teardown diagnostics: ${record.cellId ?? 'M01 outcome'}`);
  const seen = new Set();
  for (const teardown of teardowns) {
    if (record.matrix !== 'M01' || record.scenario !== 'completion-ready' || record.route !== '/learning/enrollments/4')
      throw new Error(`Unexpected locale-reload teardown context: ${record.cellId ?? 'M01 outcome'}`);
    const boundary = teardown?.boundary;
    if (!Number.isInteger(teardown?.requestId) || teardown.requestId < 1 || teardown?.method !== 'GET' || teardown?.error !== 'net::ERR_ABORTED' || !boundary || !['capture-route-navigation', 'locale-reload'].includes(boundary.cause) || !['en', 'ru', 'uz'].includes(boundary.sourceLocale) || !['en', 'ru', 'uz'].includes(boundary.targetLocale) || !Number.isInteger(boundary.epoch) || boundary.epoch < 1 || boundary.phase !== 'pre_document_commit' || boundary.matrix !== record.matrix || boundary.scenario !== record.scenario || boundary.route !== record.route || boundary.targetLocale !== record.locale || teardown?.preNavigationRequest !== true)
      throw new Error(`Malformed navigation teardown proof: ${record.cellId ?? 'M01 outcome'}`);
    if (boundary.cause === 'capture-route-navigation' && boundary.sourceLocale !== boundary.targetLocale)
      throw new Error(`Route-navigation locale provenance does not preserve the displayed locale: ${record.cellId ?? 'M01 outcome'}`);
    const bootstrap = boundary.bootstrap;
    if (bootstrap !== undefined && (boundary.cause !== 'locale-reload' || boundary.epoch !== 1 || boundary.sourceLocale !== 'en' || boundary.targetLocale !== record.locale || bootstrap.kind !== 'initial-default-en-missing-storage' || bootstrap.observedDocumentLocale !== 'en' || bootstrap.observedStorage !== 'missing'))
      throw new Error(`Malformed initial locale bootstrap provenance: ${record.cellId ?? 'M01 outcome'}`);
    // Same route/error can occur in distinct navigation epochs. A replay of the
    // same observed request is duplicate evidence; a distinct request is retained.
    const identity = `${teardown.requestId} ${teardown.method} ${teardown.path} ${teardown.error}`;
    const allowlistIdentity = `${teardown.method} ${teardown.path} ${teardown.error}`;
    if (!allowedLocaleReloadTeardowns.has(allowlistIdentity))
      throw new Error(`Unapproved locale-reload teardown: ${record.cellId ?? 'M01 outcome'} ${allowlistIdentity}`);
    if (seen.has(identity)) throw new Error(`Duplicate locale-reload teardown: ${record.cellId ?? 'M01 outcome'} ${identity}`);
    seen.add(identity);
  }
}
export function validateRequestLifecycles(record) {
  const lifecycles = record.diagnostics?.requestLifecycles;
  if (!Array.isArray(lifecycles)) throw new Error(`Missing request lifecycle diagnostics: ${record.cellId}`);
  const requestIds = new Set();
  for (const lifecycle of lifecycles) {
    const context = lifecycle?.context;
    if (!Number.isInteger(lifecycle?.requestId) || lifecycle.requestId < 1 || requestIds.has(lifecycle.requestId) || !Number.isInteger(lifecycle.sequence) || lifecycle.sequence < 1 || typeof lifecycle.method !== 'string' || !lifecycle.method || typeof lifecycle.path !== 'string' || !lifecycle.path.startsWith('/') || !Number.isInteger(lifecycle.captureWindowId) || lifecycle.captureWindowId < 1 || !Number.isInteger(lifecycle.navigationEpoch) || lifecycle.navigationEpoch < 1 || !context || context.matrix !== record.matrix || context.scenario !== record.scenario || context.route !== record.route || context.state !== record.state || context.session !== record.session || context.disposition !== record.disposition || !['en', 'ru', 'uz'].includes(lifecycle.sourceLocale) || lifecycle.targetLocale !== record.locale || !['initial-navigation', 'locale-reload', 'capture-route-navigation'].includes(lifecycle.cause) || !['pre_document_commit', 'post_document_commit'].includes(lifecycle.phase) || !['response', 'failure'].includes(lifecycle.outcome))
      throw new Error(`Malformed or cross-window request lifecycle: ${record.cellId}`);
    if (lifecycle.outcome === 'response' ? !Number.isInteger(lifecycle.status) : typeof lifecycle.error !== 'string' || !lifecycle.error)
      throw new Error(`Unclosed request lifecycle: ${record.cellId} ${lifecycle.requestId}`);
    requestIds.add(lifecycle.requestId);
  }
}
export function validateSupersededReadLifecycles(record) {
  const pairs = record.diagnostics?.supersededReadLifecycles;
  if (!Array.isArray(pairs)) throw new Error(`Missing superseded-read diagnostics: ${record.cellId}`);
  const failedIds = new Set();
  const replacementIds = new Set();
  for (const pair of pairs) {
    const failed = record.diagnostics.requestLifecycles.find((lifecycle) => lifecycle.requestId === pair?.failedRequestId);
    const replacement = record.diagnostics.requestLifecycles.find((lifecycle) => lifecycle.requestId === pair?.replacementRequestId);
    if (!failed || !replacement || pair.failedRequestId === pair.replacementRequestId || failedIds.has(pair.failedRequestId) || replacementIds.has(pair.replacementRequestId) || pair.method !== 'GET' || pair.path !== failed.path || pair.failedSequence !== failed.sequence || pair.replacementSequence !== replacement.sequence || replacement.sequence <= failed.sequence || pair.captureWindowId !== failed.captureWindowId || pair.captureWindowId !== replacement.captureWindowId || pair.navigationEpoch !== failed.navigationEpoch || pair.navigationEpoch !== replacement.navigationEpoch || JSON.stringify(pair.context) !== JSON.stringify(failed.context) || JSON.stringify(pair.context) !== JSON.stringify(replacement.context) || pair.sourceLocale !== failed.sourceLocale || pair.sourceLocale !== replacement.sourceLocale || pair.targetLocale !== failed.targetLocale || pair.targetLocale !== replacement.targetLocale || pair.cause !== failed.cause || pair.cause !== replacement.cause || pair.phase !== failed.phase || pair.phase !== replacement.phase || failed.method !== 'GET' || failed.outcome !== 'failure' || failed.error !== 'net::ERR_ABORTED' || replacement.method !== 'GET' || replacement.path !== failed.path || replacement.outcome !== 'response' || replacement.status !== pair.replacementStatus || replacement.status < 200 || replacement.status >= 300 || pair.targetRendered !== true)
      throw new Error(`Malformed superseded-read lifecycle: ${record.cellId}`);
    failedIds.add(pair.failedRequestId); replacementIds.add(pair.replacementRequestId);
  }
  const separatelyProvenFailures = new Set([
    ...(record.diagnostics.navigationTeardowns ?? []).map((teardown) => teardown.requestId),
    ...(record.diagnostics.catalogHeroLifecycles ?? []).filter((event) => event.kind === 'aborted').map((event) => event.requestId),
  ]);
  for (const lifecycle of record.diagnostics.requestLifecycles)
    if (lifecycle.outcome === 'failure' && lifecycle.error === 'net::ERR_ABORTED' && !failedIds.has(lifecycle.requestId) && !separatelyProvenFailures.has(lifecycle.requestId))
      throw new Error(`Real current-window request failure: ${record.cellId} ${lifecycle.method} ${lifecycle.path} ${lifecycle.error}`);
}
export function validateDeclaredPendingRequests(record) {
  const pending = record.diagnostics?.declaredPendingRequests;
  if (!Array.isArray(pending)) throw new Error(`Missing declared pending diagnostics: ${record.cellId}`);
  const isPendingM08 = record.matrix === 'M08' && record.scenario === 'clear-pending' && record.state === 'clear-pending' && record.session === 'authenticated';
  if (!isPendingM08) {
    if (pending.length) throw new Error(`Declared pending request outside the exact M08 pending context: ${record.cellId}`);
    return undefined;
  }
  if (pending.length !== 1) throw new Error(`Expected exactly one declared pending request: ${record.cellId}`);
  const snapshot = pending[0];
  const context = snapshot?.context;
  if (!Number.isInteger(snapshot?.requestId) || snapshot.requestId < 1 || snapshot.method !== 'DELETE' || snapshot.path !== '/cart' || !Number.isInteger(snapshot.captureWindowId) || snapshot.captureWindowId < 1 || !Number.isInteger(snapshot.navigationEpoch) || snapshot.navigationEpoch < 1 || !context || context.matrix !== record.matrix || context.scenario !== record.scenario || context.route !== record.route || context.state !== record.state || context.session !== record.session || context.disposition !== record.disposition || !['en', 'ru', 'uz'].includes(snapshot.sourceLocale) || snapshot.targetLocale !== record.locale || !['initial-navigation', 'locale-reload', 'capture-route-navigation'].includes(snapshot.cause) || !['pre_document_commit', 'post_document_commit'].includes(snapshot.phase) || snapshot.outcome !== 'declared_pending')
    throw new Error(`Malformed declared pending request: ${record.cellId}`);
  if (record.diagnostics.requestLifecycles.some((lifecycle) => lifecycle.requestId === snapshot.requestId))
    throw new Error(`Declared pending request became terminal before capture: ${record.cellId}`);
  return snapshot;
}
export function validateDeclaredPendingRelease(release, snapshot) {
  const pending = release?.pending;
  const terminal = release?.terminal;
  if (release?.schema !== 'fe058-admission/declared-pending-release-v1' || !pending || !terminal || pending.requestId !== snapshot.requestId || pending.method !== snapshot.method || pending.path !== snapshot.path || pending.captureWindowId !== snapshot.captureWindowId || pending.navigationEpoch !== snapshot.navigationEpoch || JSON.stringify(pending.context) !== JSON.stringify(snapshot.context) || pending.sourceLocale !== snapshot.sourceLocale || pending.targetLocale !== snapshot.targetLocale || pending.cause !== snapshot.cause || pending.phase !== snapshot.phase || pending.outcome !== 'declared_pending' || terminal.requestId !== snapshot.requestId || terminal.outcome !== 'response' || terminal.status !== 204 || terminal.error !== undefined)
    throw new Error('Malformed declared pending terminal release evidence.');
}
export function validateCatalogHeroLifecycles(record) {
  const lifecycles = record.diagnostics?.catalogHeroLifecycles;
  if (!Array.isArray(lifecycles)) throw new Error(`Malformed catalog hero lifecycle diagnostics: ${record.cellId}`);
  if (!lifecycles.length) return;
  if (record.matrix !== 'M03' || record.scenario !== 'hero-price-sort' || record.route !== '/')
    throw new Error(`Catalog hero lifecycle leaked outside its Catalog capture window: ${record.cellId}`);
  const requestIds = new Set();
  const sequences = new Set();
  for (const event of lifecycles) {
    const boundary = event?.boundary;
    if (!Number.isInteger(event?.requestId) || event.requestId < 1 || requestIds.has(event.requestId) || !Number.isInteger(event?.sequence) || event.sequence < 1 || sequences.has(event.sequence) || event.method !== 'GET' || event.path !== '/src/pages/catalog-page/assets/catalog-hero-ui025.png' || event.resourceType !== 'image' || !boundary || !Number.isInteger(boundary.epoch) || boundary.epoch < 1 || !['locale-reload', 'capture-route-navigation'].includes(boundary.cause) || !['en', 'ru', 'uz'].includes(boundary.sourceLocale) || boundary.targetLocale !== record.locale || boundary.matrix !== 'M03' || boundary.scenario !== 'hero-price-sort' || boundary.route !== '/')
      throw new Error(`Malformed catalog hero lifecycle proof: ${record.cellId}`);
    requestIds.add(event.requestId); sequences.add(event.sequence);
    if (event.kind === 'aborted') {
      if (event.error !== 'net::ERR_ABORTED' || event.status !== undefined || event.replacesRequestId !== undefined || event.catalogHeroRendered !== undefined || boundary.phase !== 'pre_document_commit' || boundary.documentCommitted !== false)
        throw new Error(`Unproven catalog hero abort: ${record.cellId}`);
      const replacement = lifecycles.find((candidate) => candidate.kind === 'replacement' && candidate.replacesRequestId === event.requestId);
      if (!replacement || replacement.requestId === event.requestId || replacement.sequence <= event.sequence || replacement.boundary.epoch !== boundary.epoch || replacement.boundary.cause !== boundary.cause || replacement.boundary.sourceLocale !== boundary.sourceLocale || replacement.boundary.targetLocale !== boundary.targetLocale || replacement.boundary.phase !== 'post_document_commit' || replacement.boundary.documentCommitted !== true || !Number.isInteger(replacement.status) || replacement.status < 200 || replacement.status >= 300 || replacement.catalogHeroRendered !== true)
        throw new Error(`Catalog hero abort lacks a distinct rendered replacement: ${record.cellId}`);
    } else if (event.kind !== 'replacement' || !Number.isInteger(event.replacesRequestId) || event.error !== undefined) {
      throw new Error(`Malformed catalog hero replacement: ${record.cellId}`);
    }
  }
  for (const replacement of lifecycles.filter((event) => event.kind === 'replacement'))
    if (!lifecycles.some((event) => event.kind === 'aborted' && event.requestId === replacement.replacesRequestId)) throw new Error(`Catalog hero replacement has no abort: ${record.cellId}`);
}
export function validateLocaleConvergence(record) {
  const convergence = record.localeConvergence;
  if (!convergence || convergence.documentLocale !== record.locale || convergence.storageLocale !== record.locale || convergence.storagePresent !== true)
    throw new Error(`Missing or mismatched target locale convergence: ${record.cellId ?? 'M01 outcome'}`);
}
export function validateAggregateRecordIdentities(record) {
  const identities = record.identities;
  if (!Array.isArray(identities))
    throw new Error(`Malformed target identities: ${record.cellId}`);
  const seen = new Set();
  for (const identity of identities) {
    if (!identity || typeof identity !== 'object' || Array.isArray(identity) || typeof identity.path !== 'string' || typeof identity.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(identity.sha256))
      throw new Error(`Malformed executable identity entry: ${record.cellId}`);
    validateExecutableIdentityPath(identity.path);
    if (seen.has(identity.path)) throw new Error(`Duplicate executable identity ${identity.path}: ${record.cellId}`);
    seen.add(identity.path);
  }
  if (identities.length !== currentIdentities.length)
    throw new Error(`Unexpected executable identity count: ${record.cellId}`);
  for (let index = 0; index < currentIdentities.length; index += 1) {
    const actual = identities[index];
    const expected = currentIdentities[index];
    if (actual.path !== expected.path) throw new Error(`Unexpected executable identity key ${actual.path}; expected ${expected.path}: ${record.cellId}`);
    if (actual.sha256 !== expected.sha256) throw new Error(`Stale executable identity ${expected.path}: ${record.cellId}`);
  }
}
function expectIdentityRejection(identities, label) {
  try {
    validateAggregateRecordIdentities({ cellId: `identity-proof-${label}`, identities });
    throw new Error(`Executable identity proof unexpectedly passed: ${label}`);
  } catch (error) {
    if (String(error).includes('unexpectedly passed')) throw error;
  }
}

const legacyM02IdentityProof = process.env.FE058_M02_IDENTITY_NEGATIVE_PROOF;
if (legacyM02IdentityProof) {
  const identities = currentIdentities.map((identity) => ({ ...identity }));
  const m02CatalogSpec = `${evidenceRelativeRoot}/m02-catalog.spec.ts`;
  const m02Index = identities.findIndex((identity) => identity.path === m02CatalogSpec);
  if (m02Index < 0) throw new Error('M02 identity proof owner is absent from the executable registry.');
  if (legacyM02IdentityProof === 'missing') identities.splice(m02Index, 1);
  else if (legacyM02IdentityProof === 'extra') identities.push({ path: `${evidenceRelativeRoot}/m02-catalog.spec.ts.stale.ts`, sha256: identities[m02Index].sha256 });
  else if (legacyM02IdentityProof === 'stale' || legacyM02IdentityProof === 'mismatch') identities[m02Index].sha256 = `${identities[m02Index].sha256[0] === '0' ? '1' : '0'}${identities[m02Index].sha256.slice(1)}`;
  else throw new Error(`Unknown M02 identity negative proof: ${legacyM02IdentityProof}`);
  expectIdentityRejection(identities, `legacy-m02-${legacyM02IdentityProof}`);
  process.stdout.write(`${JSON.stringify({ m02IdentityNegativeProof: legacyM02IdentityProof, rejected: true })}\n`);
  process.exit(0);
}

const executableIdentityProof = process.env.FE058_EXECUTABLE_IDENTITY_PROOF;
if (executableIdentityProof) {
  if (executableIdentityProof === 'positive') validateAggregateRecordIdentities({ cellId: 'identity-proof-positive', identities: currentIdentities });
  else if (executableIdentityProof === 'missing-each') {
    for (let index = 0; index < currentIdentities.length; index += 1) expectIdentityRejection(currentIdentities.filter((_, candidateIndex) => candidateIndex !== index), `missing-${currentIdentities[index].path}`);
  } else if (executableIdentityProof === 'stale-each') {
    for (let index = 0; index < currentIdentities.length; index += 1) {
      const identities = currentIdentities.map((identity) => ({ ...identity }));
      identities[index].sha256 = `${identities[index].sha256[0] === '0' ? '1' : '0'}${identities[index].sha256.slice(1)}`;
      expectIdentityRejection(identities, `stale-${identities[index].path}`);
    }
  } else {
    const identities = currentIdentities.map((identity) => ({ ...identity }));
    if (executableIdentityProof === 'extra') identities.push({ path: `${evidenceRelativeRoot}/unexpected.ts`, sha256: '0'.repeat(64) });
    else if (executableIdentityProof === 'duplicate') identities[identities.length - 1] = { ...identities[0] };
    else if (executableIdentityProof === 'alias') identities[0].path = `./${identities[0].path}`;
    else if (executableIdentityProof === 'path-escape') identities[0].path = '../outside.ts';
    else if (executableIdentityProof === 'unsupported') identities[0].path = `${evidenceRelativeRoot}/unsupported.md`;
    else throw new Error(`Unknown executable identity proof: ${executableIdentityProof}`);
    expectIdentityRejection(identities, executableIdentityProof);
  }
  process.stdout.write(`${JSON.stringify({ executableIdentityProof, accepted: executableIdentityProof === 'positive', rejected: executableIdentityProof !== 'positive', identityCount: currentIdentities.length, viteConfigCovered: currentIdentities.some(({ path }) => path === 'vite.config.ts') })}\n`);
  process.exit(0);
}
const negativeProof = process.env.FE058_INTERACTION_NEGATIVE_PROOF;
if (negativeProof) {
  const record = {
    cellId: `negative-${negativeProof}`,
    matrix: negativeProof === 'wrong-matrix' ? 'M07' : 'M08',
    scenario: 'clear-pending',
    state: 'clear-pending',
    session: 'authenticated',
    interaction: {
      mode: 'modal_focus_containment', target: 'Pending clear dialog',
      focus: { status: 'pass' }, keyboard: { status: 'pass' }, minTarget44: { status: 'pass' },
      modal: { initialDialogFocus: true, tabFocusWithinDialog: true, noBackgroundFocus: true, enabledDialogActions: negativeProof === 'enabled-action' ? 1 : 0 },
    },
  };
  try {
    validateInteractionRecord(record);
    throw new Error(`Negative proof unexpectedly passed: ${negativeProof}`);
  } catch (error) {
    if (String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ negativeProof, rejected: true, reason: String(error) })}\n`);
    process.exit(0);
  }
}
const requestFailureNegativeProof = process.env.FE058_REQUEST_FAILURE_NEGATIVE_PROOF;
const declaredPendingProof = process.env.FE058_DECLARED_PENDING_PROOF;
if (declaredPendingProof) {
  const context = { matrix: 'M08', scenario: 'clear-pending', route: '/cart', state: 'clear-pending', session: 'authenticated', disposition: 'observed' };
  const snapshot = { requestId: 71, method: 'DELETE', path: '/cart', captureWindowId: 12, navigationEpoch: 12, context, sourceLocale: 'en', targetLocale: 'en', cause: 'initial-navigation', phase: 'post_document_commit', outcome: 'declared_pending' };
  const record = { ...context, cellId: `declared-pending-${declaredPendingProof}`, locale: 'en', diagnostics: { requestLifecycles: [], declaredPendingRequests: [snapshot] } };
  const release = { schema: 'fe058-admission/declared-pending-release-v1', pending: { ...snapshot }, terminal: { requestId: 71, outcome: 'response', status: 204 } };
  if (declaredPendingProof === 'undeclared') record.diagnostics.declaredPendingRequests = [];
  if (declaredPendingProof === 'extra' || declaredPendingProof === 'duplicate') record.diagnostics.declaredPendingRequests.push({ ...snapshot });
  if (declaredPendingProof === 'method-mismatch') snapshot.method = 'POST';
  if (declaredPendingProof === 'path-mismatch') snapshot.path = '/other';
  if (declaredPendingProof === 'window-mismatch') snapshot.captureWindowId = 0;
  if (declaredPendingProof === 'context-mismatch') snapshot.context = { ...context, state: 'other' };
  if (declaredPendingProof === 'locale-mismatch') snapshot.targetLocale = 'ru';
  if (declaredPendingProof === 'epoch-mismatch') snapshot.navigationEpoch = 0;
  if (declaredPendingProof === 'terminal-before-capture') record.diagnostics.requestLifecycles.push({ requestId: 71, method: 'DELETE', path: '/cart', captureWindowId: 12, navigationEpoch: 12, context, sourceLocale: 'en', targetLocale: 'en', cause: 'initial-navigation', phase: 'post_document_commit', outcome: 'response', status: 204 });
  if (declaredPendingProof === 'ordinary-window') { record.matrix = 'M07'; record.scenario = 'return-root'; record.route = '/cart'; record.state = 'localized-return'; }
  try {
    const pending = validateDeclaredPendingRequests(record);
    if (declaredPendingProof === 'no-terminal-release') validateDeclaredPendingRelease(undefined, pending);
    else if (declaredPendingProof === 'duplicate-release') throw new Error('Duplicate declared-pending terminal release evidence.');
    else validateDeclaredPendingRelease(release, pending);
    if (declaredPendingProof !== 'positive') throw new Error(`Declared pending proof unexpectedly passed: ${declaredPendingProof}`);
  } catch (error) {
    if (declaredPendingProof === 'positive' || String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ declaredPendingProof, rejected: true, reason: String(error) })}\n`);
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify({ declaredPendingProof, accepted: true })}\n`);
  process.exit(0);
}
const requestLifecycleProof = process.env.FE058_REQUEST_LIFECYCLE_PROOF;
const supersededReadProof = process.env.FE058_SUPERSEDED_READ_PROOF;
if (supersededReadProof) {
  const context = { matrix: 'M06', scenario: 'full-page-actions', route: '/ai-chat', state: 'history-ready', session: 'authenticated', disposition: 'observed' };
  const failed = (requestId, sequence) => ({ requestId, sequence, method: 'GET', path: '/read', captureWindowId: 14, navigationEpoch: 14, context, sourceLocale: 'en', targetLocale: 'en', cause: 'initial-navigation', phase: 'post_document_commit', outcome: 'failure', error: 'net::ERR_ABORTED' });
  const response = (requestId, sequence) => ({ requestId, sequence, method: 'GET', path: '/read', captureWindowId: 14, navigationEpoch: 14, context, sourceLocale: 'en', targetLocale: 'en', cause: 'initial-navigation', phase: 'post_document_commit', outcome: 'response', status: 200 });
  const lifecycles = [failed(81, 1), response(82, 2), failed(83, 3), response(84, 4)];
  const pair = (failedRequestId, replacementRequestId, failedSequence, replacementSequence) => ({ failedRequestId, replacementRequestId, failedSequence, replacementSequence, method: 'GET', path: '/read', captureWindowId: 14, navigationEpoch: 14, context, sourceLocale: 'en', targetLocale: 'en', cause: 'initial-navigation', phase: 'post_document_commit', replacementStatus: 200, targetRendered: true });
  const record = { ...context, cellId: `superseded-read-${supersededReadProof}`, locale: 'en', diagnostics: { requestLifecycles: lifecycles, supersededReadLifecycles: [pair(81, 82, 1, 2), pair(83, 84, 3, 4)] } };
  const first = record.diagnostics.supersededReadLifecycles[0];
  if (supersededReadProof === 'missing') record.diagnostics.supersededReadLifecycles = [];
  if (supersededReadProof === 'earlier') first.replacementSequence = 0;
  if (supersededReadProof === 'cross-window') first.captureWindowId = 15;
  if (supersededReadProof === 'cross-epoch') first.navigationEpoch = 15;
  if (supersededReadProof === 'cross-context') first.context = { ...context, state: 'other' };
  if (supersededReadProof === 'cross-locale') first.targetLocale = 'ru';
  if (supersededReadProof === 'cross-cause') first.cause = 'locale-reload';
  if (supersededReadProof === 'cross-phase') first.phase = 'pre_document_commit';
  if (supersededReadProof === 'non-2xx') first.replacementStatus = 500;
  if (supersededReadProof === 'duplicate-identity') first.replacementRequestId = 81;
  if (supersededReadProof === 'write-method') first.method = 'POST';
  if (supersededReadProof === 'post-capture') first.targetRendered = false;
  if (supersededReadProof === 'reused-replacement') record.diagnostics.supersededReadLifecycles[1].replacementRequestId = 82;
  if (supersededReadProof === 'unmatched') first.replacementRequestId = 999;
  try {
    validateRequestLifecycles(record);
    validateSupersededReadLifecycles(record);
    if (supersededReadProof !== 'positive') throw new Error(`Superseded-read proof unexpectedly passed: ${supersededReadProof}`);
  } catch (error) {
    if (supersededReadProof === 'positive' || String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ supersededReadProof, rejected: true, reason: String(error) })}\n`); process.exit(0);
  }
  process.stdout.write(`${JSON.stringify({ supersededReadProof, accepted: true })}\n`); process.exit(0);
}
if (requestLifecycleProof) {
  const context = { matrix: 'M06', scenario: 'mini-chat', route: '/learning/enrollments/4', state: 'mini-open', session: 'authenticated', disposition: 'observed' };
  const lifecycle = { requestId: 41, sequence: 1, method: 'GET', path: '/courses/7/progress', captureWindowId: 9, navigationEpoch: 9, context, sourceLocale: 'en', targetLocale: 'en', cause: 'capture-route-navigation', phase: 'pre_document_commit', outcome: 'response', status: 200 };
  const record = { ...context, cellId: `request-lifecycle-${requestLifecycleProof}`, locale: 'en', diagnostics: { requestLifecycles: [lifecycle], supersededReadLifecycles: [] } };
  if (requestLifecycleProof === 'duplicate-completion') record.diagnostics.requestLifecycles.push({ ...lifecycle });
  if (requestLifecycleProof === 'wrong-window') lifecycle.context = { ...context, scenario: 'full-page-menu' };
  if (requestLifecycleProof === 'missing-window') delete lifecycle.captureWindowId;
  if (requestLifecycleProof === 'wrong-epoch') lifecycle.navigationEpoch = 0;
  if (requestLifecycleProof === 'wrong-cause') lifecycle.cause = 'unowned';
  if (requestLifecycleProof === 'wrong-phase') lifecycle.phase = 'after-capture';
  if (requestLifecycleProof === 'open-request') { lifecycle.outcome = 'response'; delete lifecycle.status; }
  if (requestLifecycleProof === 'real-current-window-abort') { lifecycle.outcome = 'failure'; delete lifecycle.status; lifecycle.error = 'net::ERR_ABORTED'; }
  try {
    validateRequestLifecycles(record);
    validateSupersededReadLifecycles(record);
    if (requestLifecycleProof !== 'positive') throw new Error(`Request lifecycle proof unexpectedly passed: ${requestLifecycleProof}`);
  } catch (error) {
    if (requestLifecycleProof === 'positive' || String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ requestLifecycleProof, rejected: true, reason: String(error) })}\n`);
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify({ requestLifecycleProof, accepted: true })}\n`);
  process.exit(0);
}
if (requestFailureNegativeProof) {
  const sourceLocale = requestFailureNegativeProof === 'source-target-mismatch' || requestFailureNegativeProof === 'wrong-context' ? 'ru' : 'en';
  const targetLocale = requestFailureNegativeProof === 'wrong-locale' || requestFailureNegativeProof === 'wrong-context' ? 'ru' : 'en';
  const invalidTeardown = {
    ...(requestFailureNegativeProof === 'missing-request-id' ? {} : { requestId: 1 }), method: 'GET', path: requestFailureNegativeProof === 'wrong-path' ? '/courses/7/unknown' : '/courses/7/progress',
    error: requestFailureNegativeProof === 'wrong-error' ? 'net::ERR_FAILED' : 'net::ERR_ABORTED',
    boundary: { cause: requestFailureNegativeProof === 'wrong-cause' ? 'wrong-cause' : requestFailureNegativeProof === 'wrong-context' ? 'locale-reload' : 'capture-route-navigation', sourceLocale, targetLocale, epoch: requestFailureNegativeProof === 'stale-epoch' ? 0 : 7, phase: requestFailureNegativeProof === 'post-commit' ? 'post_document_commit' : 'pre_document_commit', matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4' }, preNavigationRequest: requestFailureNegativeProof !== 'missing-pre-navigation-proof',
  };
  try {
    validateNavigationTeardowns({ cellId: `negative-${requestFailureNegativeProof}`, matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', locale: 'en', diagnostics: { navigationTeardowns: requestFailureNegativeProof === 'duplicate-request' ? [invalidTeardown, { ...invalidTeardown }] : [invalidTeardown] } });
    throw new Error(`Negative request-failure proof unexpectedly passed: ${requestFailureNegativeProof}`);
  } catch (error) {
    if (String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ requestFailureNegativeProof, rejected: true, reason: String(error) })}\n`);
    process.exit(0);
  }
}
const requestFailurePositiveProof = process.env.FE058_REQUEST_FAILURE_POSITIVE_PROOF;
if (requestFailurePositiveProof) {
  const validTeardown = {
    requestId: 1, method: 'GET', path: requestFailurePositiveProof === 'lessons' ? '/courses/7/lessons' : '/courses/7/progress',
    error: 'net::ERR_ABORTED', boundary: { cause: requestFailurePositiveProof === 'locale-reload' ? 'locale-reload' : 'capture-route-navigation', sourceLocale: requestFailurePositiveProof === 'locale-reload' ? 'ru' : 'en', targetLocale: 'en', epoch: 7, phase: 'pre_document_commit', matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4' }, preNavigationRequest: true,
  };
  validateNavigationTeardowns({ cellId: `positive-${requestFailurePositiveProof}`, matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', locale: 'en', diagnostics: { navigationTeardowns: [validTeardown] } });
  process.stdout.write(`${JSON.stringify({ requestFailurePositiveProof, accepted: true })}\n`);
  process.exit(0);
}
const catalogHeroLifecycleProof = process.env.FE058_CATALOG_HERO_LIFECYCLE_PROOF;
if (catalogHeroLifecycleProof) {
  const aborted = { requestId: 1, sequence: 1, method: 'GET', path: '/src/pages/catalog-page/assets/catalog-hero-ui025.png', resourceType: 'image', kind: 'aborted', error: 'net::ERR_ABORTED', boundary: { epoch: 1, cause: 'locale-reload', phase: 'pre_document_commit', documentCommitted: false, sourceLocale: 'en', targetLocale: 'en', matrix: 'M03', scenario: 'hero-price-sort', route: '/' } };
  const replacement = { requestId: 2, sequence: 2, method: 'GET', path: '/src/pages/catalog-page/assets/catalog-hero-ui025.png', resourceType: 'image', kind: 'replacement', status: 200, replacesRequestId: 1, catalogHeroRendered: true, boundary: { epoch: 1, cause: 'locale-reload', phase: 'post_document_commit', documentCommitted: true, sourceLocale: 'en', targetLocale: 'en', matrix: 'M03', scenario: 'hero-price-sort', route: '/' } };
  const record = { cellId: `catalog-hero-${catalogHeroLifecycleProof}`, matrix: catalogHeroLifecycleProof === 'wrong-context' ? 'M02' : 'M03', scenario: catalogHeroLifecycleProof === 'wrong-context' ? 'course-detail-success' : 'hero-price-sort', route: catalogHeroLifecycleProof === 'wrong-context' ? '/courses/7' : '/', locale: 'en', diagnostics: { catalogHeroLifecycles: catalogHeroLifecycleProof === 'missing-replacement' ? [aborted] : [aborted, replacement] } };
  const lifecycle = record.diagnostics.catalogHeroLifecycles;
  if (catalogHeroLifecycleProof === 'wrong-path') lifecycle[0].path = '/src/pages/catalog-page/assets/other.png';
  if (catalogHeroLifecycleProof === 'wrong-cause') lifecycle[0].boundary.cause = 'wrong-cause';
  if (catalogHeroLifecycleProof === 'post-commit') { lifecycle[0].boundary.phase = 'post_document_commit'; lifecycle[0].boundary.documentCommitted = true; }
  if (catalogHeroLifecycleProof === 'stale-epoch') lifecycle[0].boundary.epoch = 0;
  if (catalogHeroLifecycleProof === 'wrong-locale') lifecycle.forEach((event) => { event.boundary.targetLocale = 'ru'; });
  if (catalogHeroLifecycleProof === 'missing-id') delete lifecycle[0].requestId;
  if (catalogHeroLifecycleProof === 'duplicate-id') lifecycle[1].requestId = 1;
  if (catalogHeroLifecycleProof === 'replacement-before-abort') lifecycle[1].sequence = 1;
  if (catalogHeroLifecycleProof === 'non-2xx-replacement') lifecycle[1].status = 404;
  if (catalogHeroLifecycleProof === 'source-locale-mismatch') lifecycle[1].boundary.sourceLocale = 'ru';
  if (catalogHeroLifecycleProof === 'missing-source-locale') delete lifecycle[0].boundary.sourceLocale;
  if (catalogHeroLifecycleProof === 'unsupported-source-locale') lifecycle[0].boundary.sourceLocale = 'fr';
  try {
    validateCatalogHeroLifecycles(record);
    if (catalogHeroLifecycleProof !== 'positive') throw new Error(`Catalog hero lifecycle proof unexpectedly passed: ${catalogHeroLifecycleProof}`);
  } catch (error) {
    if (catalogHeroLifecycleProof === 'positive' || String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ catalogHeroLifecycleProof, rejected: true, reason: String(error) })}\n`); process.exit(0);
  }
  process.stdout.write(`${JSON.stringify({ catalogHeroLifecycleProof, accepted: true })}\n`); process.exit(0);
}
const bootstrapProof = process.env.FE058_LOCALE_BOOTSTRAP_PROOF;
if (bootstrapProof) {
  const boundary = {
    cause: bootstrapProof === 'route-navigation-missing' ? 'capture-route-navigation' : 'locale-reload',
    sourceLocale: bootstrapProof === 'non-en-source' ? 'ru' : 'en',
    targetLocale: bootstrapProof === 'target-ru' ? 'ru' : 'en',
    epoch: bootstrapProof === 'later-epoch' ? 2 : 1,
    phase: 'pre_document_commit', matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4',
    bootstrap: { kind: 'initial-default-en-missing-storage', observedDocumentLocale: 'en', observedStorage: 'missing' },
  };
  const record = {
    cellId: `bootstrap-${bootstrapProof}`, matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', locale: boundary.targetLocale,
    localeConvergence: bootstrapProof === 'no-target-convergence' ? undefined : { documentLocale: boundary.targetLocale, storageLocale: bootstrapProof === 'mismatched-storage' ? 'ru' : boundary.targetLocale, storagePresent: true },
    diagnostics: { navigationTeardowns: [{ requestId: 1, method: 'GET', path: '/courses/7/progress', error: 'net::ERR_ABORTED', boundary, preNavigationRequest: true }] },
  };
  try {
    validateLocaleConvergence(record);
    validateNavigationTeardowns(record);
    if (!['initial-en', 'target-ru'].includes(bootstrapProof)) throw new Error(`Bootstrap proof unexpectedly passed: ${bootstrapProof}`);
  } catch (error) {
    if (['initial-en', 'target-ru'].includes(bootstrapProof)) throw error;
    if (String(error).includes('unexpectedly passed')) throw error;
    process.stdout.write(`${JSON.stringify({ bootstrapProof, rejected: true, reason: String(error) })}\n`);
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify({ bootstrapProof, accepted: true })}\n`);
  process.exit(0);
}
const terminalFamilyProof = process.env.FE058_TERMINAL_FAMILY_PROOF;
if (terminalFamilyProof) {
  const proofRoot = mkdtempSync(join(tmpdir(), 'fe058-terminal-proof-'));
  const resolvedTempRoot = resolve(tmpdir());
  if (!resolve(proofRoot).startsWith(`${resolvedTempRoot}${sep}`)) throw new Error(`Refusing terminal proof outside the system temporary directory: ${proofRoot}`);
  try {
    const proofRunId = 'terminal-proof-run';
    const proofDirectories = expectedShardDirectoryNames(proofRunId).map((name) => join(proofRoot, name));
    for (const directory of proofDirectories) {
      mkdirSync(directory);
      writeFileSync(join(directory, '.last-run.json'), stableJson({ status: 'passed' }), { flag: 'wx' });
    }
    let candidateDirectories = [...proofDirectories];
    let expectedRunId = proofRunId;
    if (terminalFamilyProof === 'partial') candidateDirectories = candidateDirectories.slice(0, -1);
    else if (terminalFamilyProof === 'failed') writeFileSync(join(candidateDirectories[5], '.last-run.json'), stableJson({ status: 'failed' }));
    else if (terminalFamilyProof === 'malformed') writeFileSync(join(candidateDirectories[5], '.last-run.json'), '{');
    else if (terminalFamilyProof === 'stale-runid') expectedRunId = `${proofRunId}-stale`;
    else if (terminalFamilyProof === 'duplicate-directory') candidateDirectories[candidateDirectories.length - 1] = candidateDirectories[0];
    else if (!['positive', 'marker-drift'].includes(terminalFamilyProof)) throw new Error(`Unknown terminal family proof: ${terminalFamilyProof}`);
    let rejected = false;
    try {
      const snapshot = validateTerminalDirectories(candidateDirectories, expectedRunId, proofRoot);
      if (terminalFamilyProof === 'marker-drift') {
        writeFileSync(snapshot[0].terminalMarker, stableJson({ status: 'passed', drift: true }));
        assertTerminalShardSnapshotCurrent(snapshot);
      }
      if (terminalFamilyProof !== 'positive') throw new Error(`Terminal family proof unexpectedly passed: ${terminalFamilyProof}`);
    } catch (error) {
      if (String(error).includes('unexpectedly passed')) throw error;
      if (terminalFamilyProof === 'positive') throw error;
      rejected = true;
    }
    process.stdout.write(`${JSON.stringify({ terminalFamilyProof, accepted: terminalFamilyProof === 'positive', rejected })}\n`);
    rmSync(proofRoot, { recursive: true, force: true });
    process.exit(0);
  } finally {
    rmSync(proofRoot, { recursive: true, force: true });
  }
}
const resultSnapshotProof = process.env.FE058_RESULT_SNAPSHOT_PROOF;
if (resultSnapshotProof) {
  const proofRoot = mkdtempSync(join(tmpdir(), 'fe058-result-snapshot-proof-'));
  const resolvedTempRoot = resolve(tmpdir());
  if (!resolve(proofRoot).startsWith(`${resolvedTempRoot}${sep}`)) throw new Error(`Refusing result snapshot proof outside the system temporary directory: ${proofRoot}`);
  const proofRunId = 'result-snapshot-proof-run';
  const proofPathPrefix = 'proof-results';
  const proofDirectories = expectedShardDirectoryNames(proofRunId).map((name) => join(proofRoot, name));
  try {
    for (const directory of proofDirectories) {
      mkdirSync(join(directory, 'proof-output', 'cells'), { recursive: true });
      mkdirSync(join(directory, 'proof-output', 'screenshots'), { recursive: true });
      writeFileSync(join(directory, '.last-run.json'), stableJson({ status: 'passed' }), { flag: 'wx' });
    }
    const proofScreenshotMode = resultSnapshotProof.startsWith('canonical') || resultSnapshotProof === 'wrong-mode-inventory' ? 'canonical' : 'full';
    const proofCapturedCellIds = expectedCapturedCellIdsForMode(proofScreenshotMode);
    const orderedCellIds = [...expectedCellIds].sort(compareCanonicalPaths);
    const firstCapturedCellId = [...proofCapturedCellIds].sort(compareCanonicalPaths)[0];
    orderedCellIds.forEach((cellId, index) => {
      const directory = proofDirectories[index % proofDirectories.length];
      writeFileSync(join(directory, 'proof-output', 'cells', `${cellId}.json`), stableJson({ cellId }), { flag: 'wx' });
      if (!(resultSnapshotProof === 'canonical-missing-screenshot' && cellId === firstCapturedCellId) && proofCapturedCellIds.has(cellId))
        writeFileSync(join(directory, 'proof-output', 'screenshots', `${cellId}.png`), Buffer.from(`png-${cellId}`), { flag: 'wx' });
    });
    const outcomePath = join(proofDirectories[0], 'proof-output', 'm01-outcome.json');
    const releasePath = join(proofDirectories.at(-1), 'proof-output', 'declared-pending-release.json');
    const outcomeScreenshotPath = join(proofDirectories[0], 'proof-output', 'screenshots', 'm01-current-outcome.png');
    writeFileSync(outcomePath, stableJson({ schema: 'fe058-admission/current-m01-outcome-v1' }), { flag: 'wx' });
    writeFileSync(releasePath, stableJson({ schema: 'fe058-admission/declared-pending-release-v1' }), { flag: 'wx' });
    writeFileSync(outcomeScreenshotPath, Buffer.from('outcome-screenshot'), { flag: 'wx' });
    let rejected = false;
    let reason = '';
    let snapshot;
    try {
      const candidate = { path: `${proofPathPrefix}/${basename(proofDirectories[0])}/proof-output/cells/probe.json`, role: 'cell-result', bytes: Buffer.from('{}') };
      if (resultSnapshotProof === 'canonical-extra-full-screenshot' || resultSnapshotProof === 'wrong-mode-inventory') {
        const extraCellId = orderedCellIds.find((cellId) => !proofCapturedCellIds.has(cellId));
        writeFileSync(join(proofDirectories[0], 'proof-output', 'screenshots', `${extraCellId}.png`), Buffer.from(`png-${extraCellId}`), { flag: 'wx' });
      }
      snapshot = captureCanonicalResultSnapshot(proofDirectories, proofRunId, { resultsRoot: proofRoot, pathPrefix: proofPathPrefix, expectedCapturedCells: proofCapturedCellIds });
      if (['canonical-positive', 'full-positive', 'positive'].includes(resultSnapshotProof)) {
        const generationId = `result-snapshot-proof-${proofScreenshotMode}`;
        const acceptedTerminalPath = join(proofRoot, 'aggregate-terminal.json');
        const reportPath = join(proofRoot, 'close-or-route.md');
        const manifestPath = join(proofRoot, 'fe058-admission.json');
        publishAcceptedOutputs({
          acceptedTerminalPath,
          manifestPath,
          reportPath,
          terminalRecord: { schema: 'fe058-admission/aggregate-terminal-v1', runId: proofRunId, status: 'complete', report: { resultSnapshot: snapshot.contract } },
          reportMarkdown: '# result snapshot proof\n',
          buildManifest: ({ terminalSha256, reportSha256 }) => ({ schema: 'fe058-admission/v5', generation_id: generationId, terminal: { sha256: terminalSha256 }, close_or_route: { sha256: reportSha256 }, result_snapshot: resultSnapshotManifestBinding(snapshot.contract, proofPathPrefix) }),
          generationId,
          resultSnapshotPathPrefix: proofPathPrefix,
        });
        verifyCanonicalOutputBinding(manifestPath, reportPath, acceptedTerminalPath, generationId, proofPathPrefix);
      } else if (resultSnapshotProof === 'mutation') writeFileSync(outcomePath, stableJson({ mutated: true }));
      else if (resultSnapshotProof === 'deletion') rmSync(releasePath);
      else if (resultSnapshotProof === 'addition') writeFileSync(join(proofDirectories[0], 'proof-output', 'cells', 'extra.json'), '{}', { flag: 'wx' });
      else if (resultSnapshotProof === 'screenshot-drift') writeFileSync(outcomeScreenshotPath, 'drifted-screenshot');
      else if (resultSnapshotProof === 'result-drift') writeFileSync(join(proofDirectories[0], 'proof-output', 'cells', `${orderedCellIds[0]}.json`), '{"drift":true}');
      else if (resultSnapshotProof === 'marker-drift') writeFileSync(join(proofDirectories[0], '.last-run.json'), stableJson({ status: 'passed', drift: true }));
      else if (resultSnapshotProof === 'unsupported-extension') writeFileSync(join(proofDirectories[0], 'proof-output', 'unsupported.txt'), 'unsupported', { flag: 'wx' });
      else if (resultSnapshotProof === 'alias') buildResultSnapshotContract([{ ...candidate, path: `${proofPathPrefix}/${basename(proofDirectories[0])}/proof-output/./cells/probe.json` }], proofPathPrefix);
      else if (resultSnapshotProof === 'case-collision') buildResultSnapshotContract([candidate, { ...candidate, path: candidate.path.replace('/probe.json', '/PROBE.json') }], proofPathPrefix);
      else if (resultSnapshotProof === 'path-escape') buildResultSnapshotContract([{ ...candidate, path: `${proofPathPrefix}/../escape.json` }], proofPathPrefix);
      else if (resultSnapshotProof === 'duplicate') buildResultSnapshotContract([candidate, { ...candidate }], proofPathPrefix);
      else if (resultSnapshotProof === 'unsupported-role') buildResultSnapshotContract([{ ...candidate, role: 'unknown-result-role' }], proofPathPrefix);
      else if (!['canonical-missing-screenshot', 'canonical-extra-full-screenshot', 'wrong-mode-inventory'].includes(resultSnapshotProof)) throw new Error(`Unknown result snapshot proof: ${resultSnapshotProof}`);
      if (['mutation', 'deletion', 'addition', 'screenshot-drift', 'result-drift', 'marker-drift', 'unsupported-extension'].includes(resultSnapshotProof))
        assertCanonicalResultSnapshotCurrent(snapshot, proofDirectories, proofRunId);
      if (!['positive', 'canonical-positive', 'full-positive'].includes(resultSnapshotProof)) throw new Error(`Result snapshot proof unexpectedly passed: ${resultSnapshotProof}`);
    } catch (error) {
      if (String(error).includes('unexpectedly passed') || String(error).includes('Unknown result snapshot proof')) throw error;
      if (['positive', 'canonical-positive', 'full-positive'].includes(resultSnapshotProof)) throw error;
      rejected = true;
      reason = String(error);
    }
    process.stdout.write(`${JSON.stringify({ resultSnapshotProof, accepted: ['positive', 'canonical-positive', 'full-positive'].includes(resultSnapshotProof), rejected, count: snapshot?.contract.count, digest: snapshot?.contract.digest, reason })}\n`);
    rmSync(proofRoot, { recursive: true, force: true });
    process.exit(0);
  } finally {
    rmSync(proofRoot, { recursive: true, force: true });
  }
}
const snapshotDigestProof = process.env.FE058_SNAPSHOT_DIGEST_PROOF;
if (snapshotDigestProof) {
  const proofPathPrefix = 'proof-results';
  const proofEntries = [
    { path: `${proofPathPrefix}/alpha.json`, size: 0, sha256: sha256(Buffer.alloc(0)), role: 'terminal-marker' },
    { path: `${proofPathPrefix}/nested/result.json`, size: 7, sha256: sha256(Buffer.from('result\n')), role: 'cell-result' },
    { path: `${proofPathPrefix}/résumé-uz.png`, size: 3, sha256: sha256(Buffer.from('png')), role: 'screenshot' },
  ].sort((left, right) => compareCanonicalPaths(left.path, right.path));
  const baseline = computeCanonicalResultSnapshotDigest(resultSnapshotSchema, proofEntries.length, proofEntries, proofPathPrefix);
  const output = {
    snapshotDigestProof,
    schema: resultSnapshotSchema,
    digestAlgorithm: resultSnapshotDigestAlgorithm,
    baseline,
  };
  if (snapshotDigestProof === 'positive') {
    const independent = recomputeCanonicalResultSnapshotDigestIndependently(resultSnapshotSchema, proofEntries.length, proofEntries, proofPathPrefix);
    output.independent = independent;
    output.accepted = independent.digest === baseline.digest && independent.preimageByteLength === baseline.preimageByteLength;
  } else if (snapshotDigestProof === 'publication') {
    const publicationEntries = proofEntries.map((entry) => ({ ...entry, path: `${evidenceRelativeRoot}/results/${entry.path}` }));
    const publicationDigest = computeCanonicalResultSnapshotDigest(resultSnapshotSchema, publicationEntries.length, publicationEntries, `${evidenceRelativeRoot}/results`);
    const contract = {
      schema: resultSnapshotSchema,
      digestAlgorithm: resultSnapshotDigestAlgorithm,
      preimageByteLength: publicationDigest.preimageByteLength,
      count: publicationEntries.length,
      entries: publicationEntries,
      digest: publicationDigest.digest,
    };
    const proofRoot = mkdtempSync(join(tmpdir(), 'fe058-snapshot-digest-publication-proof-'));
    try {
      const acceptedTerminalPath = join(proofRoot, 'aggregate-terminal.json');
      const reportPath = join(proofRoot, 'close-or-route.md');
      const manifestPath = join(proofRoot, 'fe058-admission.json');
      const generationId = 'snapshot-digest-publication-proof-generation';
      const published = publishAcceptedOutputs({
        acceptedTerminalPath,
        manifestPath,
        reportPath,
        terminalRecord: { schema: 'fe058-admission/aggregate-terminal-v1', runId: 'proof-run', status: 'complete', report: { resultSnapshot: contract } },
        reportMarkdown: '# canonical snapshot digest publication proof\n',
        buildManifest: ({ terminalSha256, reportSha256 }) => ({
          schema: 'fe058-admission/v5',
          generation_id: generationId,
          result_snapshot: resultSnapshotManifestBinding(contract, `${evidenceRelativeRoot}/results`),
          terminal: { sha256: terminalSha256 },
          close_or_route: { sha256: reportSha256 },
        }),
        generationId,
        resultSnapshotPathPrefix: `${evidenceRelativeRoot}/results`,
      });
      verifyCanonicalOutputBinding(manifestPath, reportPath, acceptedTerminalPath, generationId, `${evidenceRelativeRoot}/results`);
      output.publication = published;
      output.canonical = publicationDigest;
      output.accepted = true;
    } finally {
      rmSync(proofRoot, { recursive: true, force: true });
    }
  } else if (snapshotDigestProof === 'mutations') {
    const algorithmMutation = (changes) => ({ ...resultSnapshotDigestAlgorithm, ...changes });
    const mutations = [
      ['algorithm-id', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ id: `${resultSnapshotDigestAlgorithm.id}-changed` })],
      ['algorithm-version', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ version: resultSnapshotDigestAlgorithm.version + 1 })],
      ['role-enumeration-order', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: [...resultSnapshotRoleEnumeration].reverse() })],
      ['role-enumeration-value', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: resultSnapshotRoleEnumeration.map((role, index) => index ? role : 'changed-terminal-marker') })],
      ['role-enumeration-add', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: [...resultSnapshotRoleEnumeration, 'added-role'] })],
      ['role-enumeration-remove', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: resultSnapshotRoleEnumeration.slice(0, -1) })],
      ['algorithm-delimiter', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ id: `${resultSnapshotDigestAlgorithm.id}\tchanged` })],
      ['algorithm-control', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ id: `${resultSnapshotDigestAlgorithm.id}\nchanged` })],
      ['algorithm-non-nfc', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ id: 'fe058-re\u0301sume\u0301' })],
      ['role-enumeration-delimiter', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: resultSnapshotRoleEnumeration.map((role, index) => index ? role : 'terminal\tmarker') })],
      ['role-enumeration-control', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: resultSnapshotRoleEnumeration.map((role, index) => index ? role : 'terminal\nmarker') })],
      ['role-enumeration-non-nfc', resultSnapshotSchema, proofEntries.length, proofEntries, algorithmMutation({ roleEnumeration: resultSnapshotRoleEnumeration.map((role, index) => index ? role : 're\u0301sume\u0301-role') })],
      ['schema', `${resultSnapshotSchema}-changed`, proofEntries.length, proofEntries, resultSnapshotDigestAlgorithm],
      ['count', resultSnapshotSchema, proofEntries.length + 1, proofEntries, resultSnapshotDigestAlgorithm],
      ['entry-order', resultSnapshotSchema, proofEntries.length, [...proofEntries].reverse(), resultSnapshotDigestAlgorithm],
      ['entry-value', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, size: entry.size + 1 }), resultSnapshotDigestAlgorithm],
      ['missing-field', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { path: entry.path, size: entry.size, role: entry.role }), resultSnapshotDigestAlgorithm],
      ['extra-field', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, unsupported: true }), resultSnapshotDigestAlgorithm],
      ['entry-delimiter', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, path: `${proofPathPrefix}/bad\tpath.json` }), resultSnapshotDigestAlgorithm],
      ['entry-control', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, path: `${proofPathPrefix}/bad\npath.json` }), resultSnapshotDigestAlgorithm],
      ['utf8-non-nfc', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, path: `${proofPathPrefix}/re\u0301sume\u0301.json` }), resultSnapshotDigestAlgorithm],
      ['path', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, path: `${proofPathPrefix}/../escape.json` }), resultSnapshotDigestAlgorithm],
      ['size', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, size: -1 }), resultSnapshotDigestAlgorithm],
      ['hash', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, sha256: entry.sha256.toUpperCase() }), resultSnapshotDigestAlgorithm],
      ['entry-role', resultSnapshotSchema, proofEntries.length, proofEntries.map((entry, index) => index ? entry : { ...entry, role: 'unsupported-role' }), resultSnapshotDigestAlgorithm],
    ];
    output.mutations = mutations.map(([name, schema, count, entries, digestAlgorithm]) => {
      try {
        const mutated = computeCanonicalResultSnapshotDigest(schema, count, entries, proofPathPrefix, digestAlgorithm);
        return { name, rejected: false, digestChanged: mutated.digest !== baseline.digest || mutated.preimageByteLength !== baseline.preimageByteLength };
      } catch (error) {
        return { name, rejected: true, digestChanged: false, reason: String(error) };
      }
    });
    const baselinePreimage = encodeCanonicalResultSnapshotPreimage(resultSnapshotSchema, proofEntries.length, proofEntries, proofPathPrefix);
    const replaceHeaderRecord = (recordName, replacement) => {
      const lines = baselinePreimage.toString('utf8').split('\n');
      const index = lines.findIndex((line) => line.startsWith(`${recordName}\t`));
      if (index < 0) throw new Error(`Missing proof header record: ${recordName}.`);
      lines[index] = replacement;
      const bytes = Buffer.from(lines.join('\n'), 'utf8');
      return { digest: sha256(bytes), preimageByteLength: bytes.length };
    };
    const rawHeaderMutations = [
      ['schema', 'schema', `schema\t${resultSnapshotSchema}-changed`],
      ['algorithm-id', 'algorithm', `algorithm\t${resultSnapshotDigestAlgorithm.id}-changed`],
      ['algorithm-version', 'version', `version\t${resultSnapshotDigestAlgorithm.version + 1}`],
      ['role-enumeration-order', 'roles', `roles\t${[...resultSnapshotRoleEnumeration].reverse().join('\t')}`],
      ['role-enumeration-value', 'roles', `roles\tchanged-terminal-marker\t${resultSnapshotRoleEnumeration.slice(1).join('\t')}`],
      ['role-enumeration-add', 'roles', `roles\t${[...resultSnapshotRoleEnumeration, 'added-role'].join('\t')}`],
      ['role-enumeration-remove', 'roles', `roles\t${resultSnapshotRoleEnumeration.slice(0, -1).join('\t')}`],
      ['count', 'count', `count\t${proofEntries.length + 1}`],
    ];
    output.headerDigestMutations = rawHeaderMutations.map(([name, recordName, replacement]) => {
      const mutated = replaceHeaderRecord(recordName, replacement);
      return { name, ...mutated, digestChanged: mutated.digest !== baseline.digest };
    });
    output.accepted =
      output.mutations.every(({ rejected, digestChanged }) => rejected || digestChanged) &&
      output.headerDigestMutations.every(({ digestChanged }) => digestChanged);
  } else if (snapshotDigestProof === 'r15') {
    const inputPath = process.env.FE058_SNAPSHOT_DIGEST_INPUT_TERMINAL;
    if (!inputPath) throw new Error('FE058_SNAPSHOT_DIGEST_INPUT_TERMINAL is required for the R15 digest proof.');
    const terminalSnapshot = JSON.parse(readFileSync(inputPath, 'utf8')).report?.resultSnapshot;
    if (!terminalSnapshot || terminalSnapshot.schema !== 'fe058-admission/canonical-result-snapshot-v1' || terminalSnapshot.count !== 2090 || !Array.isArray(terminalSnapshot.entries))
      throw new Error('R15 digest proof requires the exact historical 2,090-entry v1 terminal snapshot.');
    const currentPathPrefix = `${evidenceRelativeRoot}/results`;
    validateCanonicalResultSnapshotEntries(resultSnapshotSchema, terminalSnapshot.count, terminalSnapshot.entries, currentPathPrefix);
    for (const entry of terminalSnapshot.entries) {
      const bytes = readFileSync(join(root, entry.path));
      if (bytes.length !== entry.size || sha256(bytes) !== entry.sha256) throw new Error(`R15 snapshot entry bytes drifted: ${entry.path}`);
    }
    const oldInsertionOrderPayload = { schema: terminalSnapshot.schema, count: terminalSnapshot.count, entries: terminalSnapshot.entries };
    const oldReorderedPayload = {
      entries: terminalSnapshot.entries.map(({ path, size, sha256: entrySha256, role }) => ({ role, sha256: entrySha256, size, path })),
      count: terminalSnapshot.count,
      schema: terminalSnapshot.schema,
    };
    const canonical = computeCanonicalResultSnapshotDigest(resultSnapshotSchema, terminalSnapshot.count, terminalSnapshot.entries, currentPathPrefix);
    const independent = recomputeCanonicalResultSnapshotDigestIndependently(resultSnapshotSchema, terminalSnapshot.count, terminalSnapshot.entries, currentPathPrefix);
    output.inventoryCount = terminalSnapshot.count;
    output.inventoryBytesCurrent = true;
    output.oldDeclaredDigest = terminalSnapshot.digest;
    output.oldInsertionOrderDigest = sha256(stableJson(oldInsertionOrderPayload));
    output.oldReorderedSameEntryDigest = sha256(stableJson(oldReorderedPayload));
    output.qaReportedDigest = '5f2296fc4c699581a19c50fb53c7bf89c8c3a3aedd4735e43d78e50601191f0c';
    output.qaPreimagePersisted = false;
    output.canonical = canonical;
    output.independent = independent;
    output.accepted =
      output.oldDeclaredDigest === output.oldInsertionOrderDigest &&
      output.oldReorderedSameEntryDigest !== output.oldDeclaredDigest &&
      canonical.digest === independent.digest &&
      canonical.preimageByteLength === independent.preimageByteLength;
  } else if (snapshotDigestProof === 'legacy-contract') {
    const preCorrectionDigestAlgorithm = Object.fromEntries(Object.entries(resultSnapshotDigestAlgorithm).filter(([key]) => key !== 'roleEnumeration'));
    const legacyContracts = [
      ['v1-json', {
        schema: 'fe058-admission/canonical-result-snapshot-v1',
        count: proofEntries.length,
        entries: proofEntries,
        digest: sha256(stableJson({ schema: 'fe058-admission/canonical-result-snapshot-v1', count: proofEntries.length, entries: proofEntries })),
      }],
      ['pre-correction-v2', {
        schema: resultSnapshotSchema,
        digestAlgorithm: {
          ...preCorrectionDigestAlgorithm,
          grammar: [
            `${resultSnapshotDigestMagic}<LF>`,
            'schema<TAB>{schema}<LF>',
            'count<TAB>{count-decimal}<LF>',
            'entry<TAB>{path}<TAB>{size-decimal}<TAB>{sha256}<TAB>{role}<LF>',
          ],
        },
        preimageByteLength: 0,
        count: proofEntries.length,
        entries: proofEntries,
        digest: baseline.digest,
      }],
    ];
    output.legacyContracts = legacyContracts.map(([name, contract]) => {
      try {
        verifyCanonicalResultSnapshotDigestContract(contract, proofPathPrefix);
        return { name, rejected: false };
      } catch (error) {
        return { name, rejected: true, reason: String(error) };
      }
    });
    output.accepted = output.legacyContracts.every(({ rejected }) => rejected);
  } else {
    throw new Error(`Unknown snapshot digest proof: ${snapshotDigestProof}`);
  }
  if (!output.accepted) throw new Error(`Snapshot digest proof failed: ${snapshotDigestProof}`);
  process.stdout.write(`${JSON.stringify(output)}\n`);
  process.exit(0);
}
if (!directories.length) throw new Error('Provide only terminal result directories to aggregate-v2.mjs.');
if (!runId) throw new Error('FE058_AGGREGATE_RUN_ID is required to exclude historical shards.');
const resultSnapshot = captureCanonicalResultSnapshot(directories, runId);
const terminalShards = resultSnapshot.terminalShards;
const m01OutcomePaths = [];
const declaredPendingSnapshots = [];
const declaredPendingReleasePaths = [];
const referencedScreenshotPaths = new Set();
const capturedCellIds = new Set();
for (const entry of resultSnapshot.contract.entries) {
  if (entry.role === 'cell-result') {
    const cellPath = absoluteCanonicalResultPath(resultSnapshot, entry.path);
    const record = parseCanonicalResultJson(resultSnapshot, cellPath, 'cell-result');
    if (!record.cellId || !record.matrix || !record.scenario || !record.route || !record.state || !record.session || !record.disposition || !record.utc || !record.locale || !record.viewportWidth || !record.effectiveZoom || !record.screenshot || !record.geometry || !record.interaction || !record.diagnostics || !record.identities)
      throw new Error(`Malformed record: ${entry.path}`);
    if (record.disposition !== 'observed') throw new Error(`Unexpected product/runtime disposition: ${record.cellId} ${record.disposition}`);
    validateLocaleConvergence(record);
    validateInteractionRecord(record);
    if (!Array.isArray(record.diagnostics.consoleErrors) || !Array.isArray(record.diagnostics.pageErrors) || !Array.isArray(record.diagnostics.requestFailures) || !Array.isArray(record.diagnostics.requestLifecycles) || !Array.isArray(record.diagnostics.supersededReadLifecycles) || !Array.isArray(record.diagnostics.declaredPendingRequests) || !Array.isArray(record.diagnostics.catalogHeroLifecycles) || !Array.isArray(record.diagnostics.httpErrors) || !Array.isArray(record.diagnostics.writes))
      throw new Error(`Malformed diagnostics record: ${record.cellId}`);
    validateNavigationTeardowns(record);
    validateRequestLifecycles(record);
    validateSupersededReadLifecycles(record);
    const declaredPending = validateDeclaredPendingRequests(record);
    if (declaredPending) declaredPendingSnapshots.push(declaredPending);
    validateCatalogHeroLifecycles(record);
    if (record.diagnostics.consoleErrors.length || record.diagnostics.pageErrors.length || record.diagnostics.httpErrors.length)
      throw new Error(`Unexplained runtime error: ${record.cellId}`);
    for (const failure of record.diagnostics.requestFailures)
      if (!allowedRequestFailures.has(failure)) throw new Error(`Unexplained request failure: ${record.cellId} ${failure}`);
    for (const write of record.diagnostics.writes)
      if (!allowedWrites.has(write)) throw new Error(`Unexpected write: ${record.cellId} ${write}`);
    const screenshotExpected = expectedCapturedCellIds.has(record.cellId);
    if (screenshotExpected) {
      if (record.screenshot.kind !== 'captured' || !record.screenshot.path || !record.screenshot.sha256) throw new Error(`Missing required screenshot: ${record.cellId}`);
      const screenshotEntry = resolveCanonicalScreenshot(resultSnapshot, dirname(dirname(cellPath)), record.screenshot.path);
      if (screenshotEntry.sha256 !== record.screenshot.sha256) throw new Error(`Unbound screenshot: ${entry.path}`);
      referencedScreenshotPaths.add(screenshotEntry.path);
      capturedCellIds.add(record.cellId);
    } else if (record.screenshot.kind !== 'not_captured' || record.screenshot.provenance !== 'default-canonical-subset' || Object.keys(record.screenshot).length !== 2)
      throw new Error(`Invalid non-captured screenshot provenance: ${record.cellId}`);
    validateAggregateRecordIdentities(record);
    records.push(record);
  }
  if (entry.role === 'm01-outcome') m01OutcomePaths.push(absoluteCanonicalResultPath(resultSnapshot, entry.path));
  if (entry.role === 'declared-pending-release') declaredPendingReleasePaths.push(absoluteCanonicalResultPath(resultSnapshot, entry.path));
}
const unique = new Set(records.map(({ cellId }) => cellId));
if (unique.size !== records.length) throw new Error('Duplicate v2 cell IDs across terminal shards.');
const unknown = [...unique].filter((cellId) => !expectedCellIds.has(cellId));
const missing = [...expectedCellIds].filter((cellId) => !unique.has(cellId));
if (unknown.length || missing.length || records.length !== expectedCellIds.size)
  throw new Error(`Cell inventory mismatch: expected=${expectedCellIds.size} observed=${records.length} unknown=${unknown.join(',')} missing=${missing.join(',')}`);
if (capturedCellIds.size !== expectedCapturedCellIds.size || [...expectedCapturedCellIds].some((cellId) => !capturedCellIds.has(cellId)))
  throw new Error(`Screenshot cell inventory mismatch for ${screenshotMode}: expected=${expectedCapturedCellIds.size} observed=${capturedCellIds.size}`);
if (declaredPendingSnapshots.length !== 12) throw new Error(`Expected 12 M08 declared-pending snapshots, found ${declaredPendingSnapshots.length}.`);
const declaredPending = declaredPendingSnapshots[0];
for (const snapshot of declaredPendingSnapshots)
  if (snapshot.requestId !== declaredPending.requestId || snapshot.method !== declaredPending.method || snapshot.path !== declaredPending.path || snapshot.captureWindowId !== declaredPending.captureWindowId || snapshot.navigationEpoch !== declaredPending.navigationEpoch || JSON.stringify(snapshot.context) !== JSON.stringify(declaredPending.context) || snapshot.sourceLocale !== declaredPending.sourceLocale || snapshot.targetLocale !== declaredPending.targetLocale || snapshot.cause !== declaredPending.cause || snapshot.phase !== declaredPending.phase || snapshot.outcome !== 'declared_pending')
    throw new Error('Declared-pending snapshots do not prove one stable request across the M08 matrix.');
if (declaredPendingReleasePaths.length !== 1) throw new Error(`Expected one declared-pending terminal release, found ${declaredPendingReleasePaths.length}.`);
validateDeclaredPendingRelease(parseCanonicalResultJson(resultSnapshot, declaredPendingReleasePaths[0], 'declared-pending-release'), declaredPending);
if (m01OutcomePaths.length !== 1) throw new Error(`Expected exactly one current M01 outcome, found ${m01OutcomePaths.length}.`);
const m01OutcomePath = m01OutcomePaths[0];
const m01Outcome = parseCanonicalResultJson(resultSnapshot, m01OutcomePath, 'm01-outcome');
for (const [key, value] of Object.entries({ schema: 'fe058-admission/current-m01-outcome-v1', matrix: 'M01', scenario: 'completion-ready', trigger: 'Space' }))
  if (m01Outcome[key] !== value) throw new Error(`Unexpected current M01 outcome ${key}: ${m01Outcome[key]}`);
if (!['normal-transition', 'accepted-routed-failure'].includes(m01Outcome.outcome)) throw new Error(`Unexpected current M01 product disposition: ${m01Outcome.outcome}`);
if (!m01Outcome.utc || !m01Outcome.screenshot?.path || !m01Outcome.screenshot?.sha256 || !m01Outcome.diagnostics || !m01Outcome.identities)
  throw new Error('Malformed current M01 outcome.');
const m01OutcomeScreenshotEntry = resolveCanonicalScreenshot(resultSnapshot, dirname(m01OutcomePath), m01Outcome.screenshot.path);
if (m01OutcomeScreenshotEntry.sha256 !== m01Outcome.screenshot.sha256) throw new Error('Unbound current M01 outcome screenshot.');
referencedScreenshotPaths.add(m01OutcomeScreenshotEntry.path);
if (!Array.isArray(m01Outcome.diagnostics.consoleErrors) || !Array.isArray(m01Outcome.diagnostics.pageErrors) || !Array.isArray(m01Outcome.diagnostics.requestFailures) || !Array.isArray(m01Outcome.diagnostics.httpErrors) || !Array.isArray(m01Outcome.diagnostics.writes) || m01Outcome.diagnostics.consoleErrors.length || m01Outcome.diagnostics.pageErrors.length || m01Outcome.diagnostics.httpErrors.length)
  throw new Error('Unexplained current M01 outcome diagnostics.');
validateLocaleConvergence(m01Outcome);
validateNavigationTeardowns(m01Outcome);
for (const failure of m01Outcome.diagnostics.requestFailures)
  if (!allowedRequestFailures.has(failure)) throw new Error(`Unexplained current M01 outcome request failure: ${failure}`);
for (const write of m01Outcome.diagnostics.writes)
  if (!allowedWrites.has(write)) throw new Error(`Unexpected current M01 outcome write: ${write}`);
validateAggregateRecordIdentities({ ...m01Outcome, cellId: 'current M01 outcome' });
const capturedScreenshots = resultSnapshot.contract.entries.filter(({ role }) => role === 'screenshot');
if (referencedScreenshotPaths.size !== capturedScreenshots.length || capturedScreenshots.some(({ path }) => !referencedScreenshotPaths.has(path)))
  throw new Error('Canonical result snapshot contains an unreferenced or duplicate screenshot.');
const interaction = records.reduce((totals, record) => {
  for (const name of ['focus', 'keyboard', 'minTarget44']) totals[record.interaction[name].status] += 1;
  return totals;
}, { pass: 0, fail: 0, not_applicable: 0 });
const acceptedRouteBasis = { fingerprint: 'm01-keyboard-undo-no-transition', routedTo: 'FE-059', decisionIds: ['FE058-D05-KEYBOARD-UNDO-ROUTE-TO-FE059', 'FE059-D01-KEYBOARD-UNDO-SCOPE-EXPANSION'], provenance: ['R19', 'R20', 'R21', 'R22-focused'] };
const assertAdmissionInputsCurrent = () => {
  const refreshedIdentities = readCurrentExecutableIdentities(targetFiles);
  if (JSON.stringify(refreshedIdentities) !== JSON.stringify(currentIdentities)) throw new Error('Executable identity bytes drifted during aggregation.');
  assertCanonicalResultSnapshotCurrent(resultSnapshot, directories, runId);
};
assertAdmissionInputsCurrent();
if (!terminalPath) throw new Error('FE058_AGGREGATE_TERMINAL_PATH is required for canonical output publication.');
const expectedAggregateTerminalPath = resolve(resultsRoot, `runner-${runId}`, 'aggregate-terminal.json');
if (resolve(terminalPath) !== expectedAggregateTerminalPath) throw new Error(`Aggregate terminal path is not the exact RunId-local runner terminal: ${terminalPath}`);
const baseSha = process.env.VISUAL_ADMISSION_BASE_SHA ?? 'unversioned';
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
if (!/^[a-f0-9]{40}$/.test(headSha)) throw new Error(`Malformed current Git HEAD: ${headSha}`);
const matrixDispositions = [
  { matrix: 'M01', disposition: 'routed_to_FE-059', downstreamRoute: 'FE-059', basis: acceptedRouteBasis.fingerprint },
  ...['M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08'].map((matrix) => ({ matrix, disposition: 'closed_no_route', downstreamRoute: null })),
  { matrix: 'M09', disposition: 'report_only_closed_no_route', downstreamRoute: null },
];
const portableTerminalShards = terminalShards.map((shard) => ({
  resultDirectory: toRepositoryRelative(shard.resultDirectory),
  terminalMarker: toRepositoryRelative(shard.terminalMarker),
  terminalSha256: shard.terminalSha256,
  status: shard.status,
}));
const resultSnapshotGenerationBinding = {
  schema: resultSnapshot.contract.schema,
  digestAlgorithmId: resultSnapshot.contract.digestAlgorithm.id,
  digestAlgorithmVersion: resultSnapshot.contract.digestAlgorithm.version,
  digestRoleEnumeration: [...resultSnapshot.contract.digestAlgorithm.roleEnumeration],
  preimageByteLength: resultSnapshot.contract.preimageByteLength,
  count: resultSnapshot.contract.count,
  digest: resultSnapshot.contract.digest,
};
const generationId = `fe058-${runId}-${sha256(stableJson({ baseSha, headSha, runId, portableTerminalShards, currentIdentities, resultSnapshot: resultSnapshotGenerationBinding, currentM01Outcome: m01Outcome.outcome })).slice(0, 16)}`;
const report = {
  schema: 'fe058-admission/aggregate-v5',
  generationId,
  base: baseSha,
  head: headSha,
  runId,
  terminalShards: portableTerminalShards,
  cellCount: records.length,
  screenshotMode,
  screenshotCellCount: capturedCellIds.size,
  matrices: [...new Set(records.map(({ matrix }) => matrix))].sort(),
  executableIdentities: currentIdentities,
  resultSnapshot: resultSnapshot.contract,
  interaction,
  currentM01Outcome: { path: toRepositoryRelative(m01OutcomePath), outcome: m01Outcome.outcome },
  acceptedRouteBasis,
  matrixDispositions,
  aggregateProductPass: false,
  qaEvidenceStatus: 'candidate-awaiting-independent-qa-verdict',
  nextGate: 'fresh-final-accumulated-strict-review',
  result: 'complete-with-accepted-intermittent-route',
};
const closeOrRouteLines = [
  `# FE-058 close-or-route — ${runId} candidate evidence`,
  '',
  `Generation \`${generationId}\` is bound to base \`${baseSha}\`, HEAD \`${headSha}\`, RunId \`${runId}\`, ${currentIdentities.length} executable SHA-256 identities, and the exact ${resultSnapshot.contract.count}-file canonical result snapshot \`${resultSnapshot.contract.digest}\` under \`${resultSnapshot.contract.digestAlgorithm.id}\` v${resultSnapshot.contract.digestAlgorithm.version} (${resultSnapshot.contract.preimageByteLength} UTF-8 preimage bytes).`,
  '',
  `The aggregate validated ${records.length.toLocaleString('en-US')} unique M01--M09 cells with ${interaction.pass.toLocaleString('en-US')} interaction PASS, ${interaction.fail} FAIL, and ${interaction.not_applicable} justified M09 N/A checks. \`aggregateProductPass\` remains \`false\`. This is candidate evidence for independent QA; it is not a QA verdict.`,
  '',
  '| Matrix | Current disposition | Downstream route |',
  '| --- | --- | --- |',
  `| M01 | \`routed_to_FE-059\`; current outcome \`${m01Outcome.outcome}\` with accepted D05 route basis | FE-059 keyboard undo correction |`,
  '| M02 | `closed_no_route` | None |',
  '| M03 | `closed_no_route` | None |',
  '| M04 | `closed_no_route` | None |',
  '| M05 | `closed_no_route` | None |',
  '| M06 | `closed_no_route` | None |',
  '| M07 | `closed_no_route`; all declared safe/fallback return classes admitted | None |',
  '| M08 | `closed_no_route`; D06--D08 evidence admitted | None |',
  '| M09 | `report_only_closed_no_route`; backend visibility remains report-only | None |',
  '',
  'Exact next gate after an independent QA verdict: fresh final accumulated Strict Review. No product PASS, QA verdict, publication, merge, or Done result is claimed by this aggregate.',
  '',
].join('\n');
const canonicalManifestPath = join(root, 'test-results', 'visual-admission', runId, 'fe058-admission.json');
const canonicalReportPath = join(root, 'test-results', 'visual-admission', runId, 'close-or-route.md');
const terminalRecord = { schema: 'fe058-admission/aggregate-terminal-v1', runId, status: 'complete', report };
publishAcceptedOutputs({
  acceptedTerminalPath: expectedAggregateTerminalPath,
  manifestPath: canonicalManifestPath,
  reportPath: canonicalReportPath,
  terminalRecord,
  reportMarkdown: closeOrRouteLines,
  buildManifest: ({ terminalSha256, reportSha256 }) => ({
    schema: 'fe058-admission/v5',
    generation_id: generationId,
    base: baseSha,
    head: headSha,
    run_id: runId,
    status: report.result,
    qa_evidence_status: report.qaEvidenceStatus,
    aggregate_product_pass: false,
    executable_identity_count: currentIdentities.length,
    executable_identities: currentIdentities,
    result_snapshot: resultSnapshotManifestBinding(resultSnapshot.contract, resultSnapshot.options.pathPrefix),
    terminal_shards: portableTerminalShards,
    aggregate: { cells: records.length, screenshot_mode: screenshotMode, screenshot_cells: capturedCellIds.size, matrices: report.matrices, interaction, result: report.result },
    current_m01_outcome: report.currentM01Outcome,
    accepted_route_basis: acceptedRouteBasis,
    dispositions: matrixDispositions,
    terminal: { path: toRepositoryRelative(expectedAggregateTerminalPath), sha256: terminalSha256 },
    close_or_route: { path: toRepositoryRelative(canonicalReportPath), sha256: reportSha256 },
    next_gate: report.nextGate,
  }),
  generationId,
  resultSnapshotPathPrefix: resultSnapshot.options.pathPrefix,
  assertInputsCurrent: assertAdmissionInputsCurrent,
});
verifyCanonicalOutputBinding(canonicalManifestPath, canonicalReportPath, expectedAggregateTerminalPath, generationId, resultSnapshot.options.pathPrefix);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
