import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import {
  rebindConsumerSource,
  retiredConsumerViolations,
  serializeGeneratedResources,
  validateCorpus,
} from './corpus-engine.mjs';
import { serializeConsumerGrammarRegistry } from './registry-source-transaction.mjs';
import { assertDistinctFileTargets, commitReviewTransaction } from './review-exchange.mjs';

const TASK_ID = /^(FE|CRF)-\d{3}$/;
const KINDS = new Set([
  'translatorWrapper',
  'translatorForwarder',
  'translatorDependency',
  'dynamicConsumer',
]);
const sourcePathIsValid = (value) =>
  typeof value === 'string' && /^(?!src\/)(?!.*\.\.)(?:[^/]+\/)*[^/]+\.(?:ts|tsx)$/.test(value);
const fingerprintIsValid = (value) =>
  typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
const signature = (item) =>
  `${item.kind}|${item.sourcePath}|${item.functionName}|${item.bindingName}|${item.familyId ?? ''}`;
function exact(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function validateRequest(request) {
  if (
    !exact(request, ['taskId', 'sources', 'obsolete']) ||
    !TASK_ID.test(request.taskId) ||
    !Array.isArray(request.sources) ||
    request.sources.length === 0 ||
    !Array.isArray(request.obsolete)
  )
    throw new Error('request must exactly contain taskId, sources, and obsolete');
  const paths = new Set();
  for (const source of request.sources) {
    if (
      !exact(source, ['sourcePath', 'expectedSourceFingerprint']) ||
      !sourcePathIsValid(source.sourcePath) ||
      !fingerprintIsValid(source.expectedSourceFingerprint) ||
      paths.has(source.sourcePath)
    )
      throw new Error(
        'sources must be duplicate-free canonical source-root paths with fingerprints',
      );
    paths.add(source.sourcePath);
  }
  const obsolete = new Set();
  for (const item of request.obsolete) {
    const keys =
      item?.kind === 'dynamicConsumer'
        ? ['kind', 'sourcePath', 'functionName', 'bindingName', 'familyId']
        : ['kind', 'sourcePath', 'functionName', 'bindingName'];
    if (
      !exact(item, keys) ||
      !KINDS.has(item.kind) ||
      !sourcePathIsValid(item.sourcePath) ||
      typeof item.functionName !== 'string' ||
      typeof item.bindingName !== 'string' ||
      (item.kind === 'dynamicConsumer' && typeof item.familyId !== 'string') ||
      obsolete.has(signature(item))
    )
      throw new Error('obsolete entries must be duplicate-free exact consumer identities');
    obsolete.add(signature(item));
  }
}
function allEntries(corpus) {
  const grammar = corpus.consumerGrammar;
  return [
    ...grammar.translatorWrappers.map((entry) => ({ ...entry, kind: 'translatorWrapper' })),
    ...grammar.translatorForwarders.map((entry) => ({ ...entry, kind: 'translatorForwarder' })),
    ...grammar.translatorDependencies.map((entry) => ({ ...entry, kind: 'translatorDependency' })),
    ...grammar.dynamicKeyFamilies.flatMap((family) =>
      family.consumers.map((entry) => ({ ...entry, kind: 'dynamicConsumer', familyId: family.id })),
    ),
  ];
}
function removeExact(corpus, obsolete) {
  const wanted = new Set(obsolete.map(signature));
  const next = structuredClone(corpus);
  const filter = (kind, entries, familyId) =>
    entries.filter((entry) => !wanted.has(signature({ ...entry, kind, familyId })));
  next.consumerGrammar.translatorWrappers = filter(
    'translatorWrapper',
    next.consumerGrammar.translatorWrappers,
  );
  next.consumerGrammar.translatorForwarders = filter(
    'translatorForwarder',
    next.consumerGrammar.translatorForwarders,
  );
  next.consumerGrammar.translatorDependencies = filter(
    'translatorDependency',
    next.consumerGrammar.translatorDependencies,
  );
  next.consumerGrammar.dynamicKeyFamilies = next.consumerGrammar.dynamicKeyFamilies.map(
    (family) => ({ ...family, consumers: filter('dynamicConsumer', family.consumers, family.id) }),
  );
  return next;
}
function sourceFile(sourceRoot, sourcePath) {
  const path = resolve(sourceRoot, sourcePath);
  if (relative(sourceRoot, path).replaceAll('\\', '/') !== sourcePath)
    throw new Error('sourcePath must stay under sourceRoot');
  return path;
}
export async function reconcileConsumerGrammar({
  registryPath,
  outputPath,
  request,
  sourceRoot = resolve('src'),
  fileSystem,
}) {
  validateRequest(request);
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const source = await readFile(registryPath, 'utf8');
  const corpus = JSON.parse(source);
  const violations = validateCorpus(corpus);
  if (violations.length)
    throw new Error(`current corpus validation failed:\n${violations.join('\n')}`);
  const currentGraph = await retiredConsumerViolations(corpus, sourceRoot);
  const currentOutput = await readFile(outputPath, 'utf8');
  const existing = new Set(allEntries(corpus).map(signature));
  if (
    currentGraph.length === 0 &&
    request.obsolete.every((item) => !existing.has(signature(item)))
  ) {
    if (currentOutput !== serializeGeneratedResources(corpus))
      throw new Error('consumer reconciliation generated output is out of date');
    return { reconciled: false, removedCount: 0, updatedEntries: 0 };
  }
  const before = allEntries(corpus);
  for (const requestSource of request.sources) {
    const entries = before.filter((entry) => entry.sourcePath === requestSource.sourcePath);
    if (
      !entries.length ||
      entries.some((entry) => entry.sourceFingerprint !== requestSource.expectedSourceFingerprint)
    )
      throw new Error(`stale expected source fingerprint: ${requestSource.sourcePath}`);
  }
  for (const obsolete of request.obsolete)
    if (before.filter((entry) => signature(entry) === signature(obsolete)).length !== 1)
      throw new Error(`obsolete identity is not exact: ${signature(obsolete)}`);
  const acceptedSources = new Set(request.sources.map((item) => item.sourcePath));
  if (
    currentGraph.some(
      (violation) => ![...acceptedSources].some((path) => violation.includes(` ${path}`)),
    )
  )
    throw new Error(`current source graph validation failed:\n${currentGraph.join('\n')}`);
  let next = corpus;
  let updatedEntries = 0;
  for (const requestSource of request.sources) {
    const rebind = rebindConsumerSource(next, {
      sourcePath: requestSource.sourcePath,
      source: await readFile(sourceFile(sourceRoot, requestSource.sourcePath), 'utf8'),
    });
    next = rebind.corpus;
    if (rebind.rebound) updatedEntries += rebind.updatedEntries;
  }
  next = removeExact(next, request.obsolete);
  const nextViolations = validateCorpus(next);
  if (nextViolations.length)
    throw new Error(`next corpus validation failed:\n${nextViolations.join('\n')}`);
  const nextGraph = await retiredConsumerViolations(next, sourceRoot);
  if (nextGraph.length)
    throw new Error(`next source graph validation failed:\n${nextGraph.join('\n')}`);
  if (JSON.stringify(allEntries(corpus)) === JSON.stringify(allEntries(next))) {
    if ((await readFile(outputPath, 'utf8')) !== serializeGeneratedResources(corpus))
      throw new Error('consumer reconciliation generated output is out of date');
    return { reconciled: false, removedCount: 0, updatedEntries: 0 };
  }
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent: serializeConsumerGrammarRegistry({ source, corpus, next }),
    generatedContent: serializeGeneratedResources(next),
    fileSystem,
  });
  return { reconciled: true, removedCount: request.obsolete.length, updatedEntries };
}
