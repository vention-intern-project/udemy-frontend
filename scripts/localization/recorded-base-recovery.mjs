import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { reconcileConsumerGrammar } from './consumer-reconcile.mjs';
import { serializeGeneratedResources, validateCorpus } from './corpus-engine.mjs';
import { reviseDraftUnits } from './draft-revision.mjs';
import { assertDistinctFileTargets, commitReviewTransaction } from './review-exchange.mjs';

export const RECORDED_BASE = Object.freeze({
  commit: '3aa975e4bdb8571942e736acb78e2acadec74ed7',
  registryBlob: '2fd9c3750d345f106d2dd55abf02647f3e6ef863',
  generatedBlob: '617d55ac2de0f31a96a839036d9b3f61c1829c7b',
  registryPath: 'localization/corpus/registry.json',
  generatedPath: 'src/shared/locale/generated-resources.ts',
});

const APPROVED_CRF_001 = Object.freeze({
  revisionRequestDigest: '87a2434dc7ff46c2030a4eeea30b2e381656c5f72845f8f2ddc8c9a29a7b8546',
  reconcileRequestDigest: 'a6244b0122795c0068008d523d95e37d07b58b3048fc33447e637a0eb2021652',
  revisedUnitIds: Object.freeze(['MLUX-C0109', 'MLUX-C0119', 'MLUX-C0386', 'MLUX-C0416']),
  targetConsumerGrammarDigest: 'd9970b3b5b52c13d8571b0d826cd00eebea52f6202e120d3ebf7013ab4a6a49e',
});

function gitBlobSha1(bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}
function exact(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    keys.length === Object.keys(value).length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function same(left, right) {
  return canonical(left) === canonical(right);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function canonicalDigest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
function assertRequest(request) {
  if (
    !exact(request, [
      'base',
      'registryBaselinePath',
      'generatedBaselinePath',
      'revisionRequest',
      'reconcileRequest',
    ])
  )
    throw new Error(
      'recovery request must exactly contain base, registryBaselinePath, generatedBaselinePath, revisionRequest, and reconcileRequest',
    );
  if (
    !exact(request.base, [
      'commit',
      'registryBlob',
      'generatedBlob',
      'registryPath',
      'generatedPath',
    ]) ||
    !same(request.base, RECORDED_BASE)
  )
    throw new Error('recovery request base provenance does not match the recorded immutable base');
  for (const key of ['registryBaselinePath', 'generatedBaselinePath'])
    if (
      typeof request[key] !== 'string' ||
      request[key].trim() !== request[key] ||
      request[key].length === 0
    )
      throw new Error(`${key} must be an explicit non-empty path`);
  if (canonicalDigest(request.revisionRequest) !== APPROVED_CRF_001.revisionRequestDigest)
    throw new Error('recovery request revision contract does not match the approved CRF-001 delta');
  if (canonicalDigest(request.reconcileRequest) !== APPROVED_CRF_001.reconcileRequestDigest)
    throw new Error(
      'recovery request reconcile contract does not match the approved CRF-001 delta',
    );
}
function validateBaseline(registryBytes, generatedBytes, request) {
  if (
    gitBlobSha1(registryBytes) !== request.base.registryBlob ||
    gitBlobSha1(generatedBytes) !== request.base.generatedBlob
  )
    throw new Error('baseline content hash does not match recorded blob provenance');
  const registrySource = registryBytes.toString('utf8');
  const generatedSource = generatedBytes.toString('utf8');
  const corpus = JSON.parse(registrySource);
  const violations = validateCorpus(corpus);
  if (violations.length)
    throw new Error(`recorded baseline corpus validation failed:\n${violations.join('\n')}`);
  if (generatedSource !== serializeGeneratedResources(corpus))
    throw new Error('recorded baseline generated output does not match its corpus');
  return { corpus, generatedSource, registrySource };
}
function allowedSemanticDelta(base, next) {
  const revised = new Set(APPROVED_CRF_001.revisedUnitIds);
  if (
    !Array.isArray(base.units) ||
    !Array.isArray(next.units) ||
    base.units.length !== next.units.length
  )
    return false;
  return base.units.every((unit, index) =>
    revised.has(unit.id) ? true : same(unit, next.units[index]),
  );
}

export async function recoverRecordedBase({
  registryPath,
  outputPath,
  request,
  sourceRoot,
  fileSystem,
}) {
  assertRequest(request);
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const [baselineRegistry, baselineGenerated, currentRegistry, currentGenerated] =
    await Promise.all([
      readFile(request.registryBaselinePath, 'utf8'),
      readFile(request.generatedBaselinePath, 'utf8'),
      readFile(registryPath, 'utf8'),
      readFile(outputPath, 'utf8'),
    ]);
  const baseline = validateBaseline(baselineRegistry, baselineGenerated, request);
  const working = await mkdtemp(join(tmpdir(), `learnhub-recorded-base-${randomUUID()}-`));
  try {
    const stagedRegistry = join(working, 'registry.json');
    const stagedOutput = join(working, 'generated-resources.ts');
    await Promise.all([
      writeFile(stagedRegistry, baseline.registrySource, 'utf8'),
      writeFile(stagedOutput, baseline.generatedSource, 'utf8'),
    ]);
    await reviseDraftUnits({
      registryPath: stagedRegistry,
      outputPath: stagedOutput,
      request: request.revisionRequest,
    });
    await reconcileConsumerGrammar({
      registryPath: stagedRegistry,
      outputPath: stagedOutput,
      request: request.reconcileRequest,
      sourceRoot,
    });
    const [targetRegistry, targetGenerated] = await Promise.all([
      readFile(stagedRegistry, 'utf8'),
      readFile(stagedOutput, 'utf8'),
    ]);
    const target = JSON.parse(targetRegistry);
    const violations = validateCorpus(target);
    if (violations.length || targetGenerated !== serializeGeneratedResources(target))
      throw new Error('reconstructed target validation failed');
    if (!allowedSemanticDelta(baseline.corpus, target))
      throw new Error(
        'reconstruction contains a semantic delta outside the approved protected units',
      );
    if (canonicalDigest(target.consumerGrammar) !== APPROVED_CRF_001.targetConsumerGrammarDigest)
      throw new Error('reconstructed consumer grammar does not match the approved CRF-001 delta');
    const current = JSON.parse(currentRegistry);
    if (validateCorpus(current).length || currentGenerated !== serializeGeneratedResources(current))
      throw new Error('current workspace pair is invalid or generated output drifted');
    if (!same(current, target))
      throw new Error(
        'current workspace contains semantic drift beyond the intended recorded-base target',
      );
    if (currentRegistry === targetRegistry && currentGenerated === targetGenerated)
      return { recovered: false, wrote: false };
    await commitReviewTransaction({
      registryPath,
      outputPath,
      registryContent: targetRegistry,
      generatedContent: targetGenerated,
      fileSystem,
    });
    return { recovered: true, wrote: true };
  } finally {
    await rm(working, { recursive: true, force: true });
  }
}
