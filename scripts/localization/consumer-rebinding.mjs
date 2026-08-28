import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import {
  rebindTranslatorWrapper,
  rebindConsumerSource as rebindConsumerSourceCorpus,
  retiredConsumerViolations,
  serializeGeneratedResources,
  validateCorpus,
} from './corpus-engine.mjs';
import { assertDistinctFileTargets, commitReviewTransaction } from './review-exchange.mjs';

const TASK_ID = /^FE-\d{3}$/;

function sameJsonValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return (
      left.length === right.length &&
      left.every((value, index) => sameJsonValue(value, right[index]))
    );
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && sameJsonValue(left[key], right[key]))
  );
}

function malformedRegistrySource() {
  throw new Error('consumer rebinding registry source is malformed JSON');
}

function skipWhitespace(source, index) {
  let cursor = index;
  while (/\s/.test(source[cursor] ?? '')) cursor += 1;
  return cursor;
}

function parseJsonString(source, index) {
  if (source[index] !== '"') malformedRegistrySource();
  let cursor = index + 1;
  let escaped = false;
  while (cursor < source.length) {
    const character = source[cursor];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === '"') return { end: cursor + 1, start: index, type: 'string' };
    cursor += 1;
  }
  malformedRegistrySource();
}

function parseJsonValue(source, index) {
  const start = skipWhitespace(source, index);
  const character = source[start];
  if (character === '{') {
    const properties = [];
    let cursor = skipWhitespace(source, start + 1);
    if (source[cursor] === '}') return { end: cursor + 1, properties, start, type: 'object' };
    while (cursor < source.length) {
      const key = parseJsonString(source, cursor);
      let valueStart = skipWhitespace(source, key.end);
      if (source[valueStart] !== ':') malformedRegistrySource();
      valueStart = skipWhitespace(source, valueStart + 1);
      let name;
      try {
        name = JSON.parse(source.slice(key.start, key.end));
      } catch {
        malformedRegistrySource();
      }
      if (properties.some((property) => property.name === name))
        throw new Error(
          `consumer rebinding registry source found duplicate direct property "${name}"`,
        );
      const value = parseJsonValue(source, valueStart);
      properties.push({ name, value });
      cursor = skipWhitespace(source, value.end);
      if (source[cursor] === '}') return { end: cursor + 1, properties, start, type: 'object' };
      if (source[cursor] !== ',') malformedRegistrySource();
      cursor = skipWhitespace(source, cursor + 1);
    }
    malformedRegistrySource();
  }
  if (character === '[') {
    const values = [];
    let cursor = skipWhitespace(source, start + 1);
    if (source[cursor] === ']') return { end: cursor + 1, start, type: 'array', values };
    while (cursor < source.length) {
      const value = parseJsonValue(source, cursor);
      values.push(value);
      cursor = skipWhitespace(source, value.end);
      if (source[cursor] === ']') return { end: cursor + 1, start, type: 'array', values };
      if (source[cursor] !== ',') malformedRegistrySource();
      cursor = skipWhitespace(source, cursor + 1);
    }
    malformedRegistrySource();
  }
  if (character === '"') return parseJsonString(source, start);
  let end = start;
  while (end < source.length && !/[\s,}\]]/.test(source[end])) end += 1;
  if (end === start) malformedRegistrySource();
  try {
    const value = JSON.parse(source.slice(start, end));
    if (value === null || typeof value === 'boolean' || typeof value === 'number')
      return { end, start, type: typeof value };
  } catch {
    malformedRegistrySource();
  }
  malformedRegistrySource();
}

function directProperty(object, name, scope) {
  const property = object.properties.find((candidate) => candidate.name === name);
  if (!property)
    throw new Error(
      `consumer rebinding registry source is missing direct ${scope} property "${name}"`,
    );
  return property.value;
}

function parsedRegistrySource(source) {
  const root = parseJsonValue(source, 0);
  if (root.type !== 'object' || skipWhitespace(source, root.end) !== source.length)
    malformedRegistrySource();
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    malformedRegistrySource();
  }
  return { root, value };
}

function sourceValue(source, node) {
  try {
    return JSON.parse(source.slice(node.start, node.end));
  } catch {
    throw new Error('consumer rebinding registry source has an invalid direct property');
  }
}

function consumerRebindingSourcePreflight({
  source,
  corpus,
  sourcePath,
  functionName,
  bindingName,
}) {
  const { root, value } = parsedRegistrySource(source);
  if (!sameJsonValue(value, corpus))
    throw new Error(
      'consumer rebinding registry source structurally drifted from the current corpus',
    );
  const consumerGrammar = directProperty(root, 'consumerGrammar', 'top-level');
  if (consumerGrammar.type !== 'object')
    throw new Error('consumer rebinding registry source requires consumerGrammar to be an object');
  const translatorWrappers = directProperty(
    consumerGrammar,
    'translatorWrappers',
    'consumerGrammar',
  );
  if (translatorWrappers.type !== 'array')
    throw new Error(
      'consumer rebinding registry source requires translatorWrappers to be an array',
    );
  const canonicalMatches = corpus.consumerGrammar.translatorWrappers.filter(
    (wrapper) =>
      wrapper.sourcePath === sourcePath &&
      wrapper.functionName === functionName &&
      wrapper.bindingName === bindingName,
  );
  if (canonicalMatches.length !== 1)
    throw new Error('consumer rebinding registry source must contain exactly one selected wrapper');
  const selectedMatches = translatorWrappers.values.filter((candidate) => {
    if (candidate.type !== 'object') return false;
    const wrapper = sourceValue(source, candidate);
    return (
      wrapper.sourcePath === sourcePath &&
      wrapper.functionName === functionName &&
      wrapper.bindingName === bindingName
    );
  });
  if (selectedMatches.length !== 1)
    throw new Error('consumer rebinding registry source must contain exactly one selected wrapper');
  const selectedWrapper = selectedMatches[0];
  if (!sameJsonValue(sourceValue(source, selectedWrapper), canonicalMatches[0]))
    throw new Error(
      'consumer rebinding registry source selected wrapper structurally drifted from the current corpus',
    );
  const sourceFingerprint = directProperty(
    selectedWrapper,
    'sourceFingerprint',
    'selected wrapper',
  );
  if (sourceFingerprint.type !== 'string')
    throw new Error(
      'consumer rebinding registry source has an invalid selected wrapper fingerprint',
    );
  return { sourceFingerprint };
}

function serializeConsumerRebindingRegistry({
  source,
  next,
  preflight,
  sourcePath,
  functionName,
  bindingName,
}) {
  const target = preflight.sourceFingerprint;
  const nextWrapper = next.consumerGrammar.translatorWrappers.find(
    (wrapper) =>
      wrapper.sourcePath === sourcePath &&
      wrapper.functionName === functionName &&
      wrapper.bindingName === bindingName,
  );
  if (!nextWrapper)
    throw new Error('consumer rebinding registry serializer has no selected next wrapper');
  const replacement = JSON.stringify(nextWrapper.sourceFingerprint);
  const serialized = `${source.slice(0, target.start)}${replacement}${source.slice(target.end)}`;
  let serializedCorpus;
  try {
    serializedCorpus = JSON.parse(serialized);
  } catch {
    throw new Error('consumer rebinding registry serializer produced malformed JSON');
  }
  if (!sameJsonValue(serializedCorpus, next))
    throw new Error(
      'consumer rebinding registry serializer structurally drifted from the validated next corpus',
    );
  return serialized;
}

function recoverableCurrentGraphViolations({ sourcePath, functionName, bindingName, violations }) {
  const identity = `${sourcePath}|${functionName}|${bindingName}`;
  const allowed = new Set([
    `localization consumer grammar violation: invalid translator boundary ${identity}`,
    `localization consumer grammar violation: ${sourcePath}: unsupported translator indirection`,
    `localization consumer grammar violation: stale translator boundary ${identity}`,
  ]);
  return violations.every((violation) => allowed.has(violation));
}

function validateTaskId(taskId) {
  if (typeof taskId !== 'string' || !TASK_ID.test(taskId))
    throw new Error('taskId must be an exact FE-NNN identifier');
}

function sourceFilePath(sourceRoot, sourcePath) {
  const root = resolve(sourceRoot);
  const path = resolve(root, sourcePath);
  const relativePath = relative(root, path).replaceAll('\\', '/');
  if (relativePath !== sourcePath || relativePath.startsWith('../'))
    throw new Error('sourcePath must stay within sourceRoot');
  return path;
}

function sourceFingerprintNodesForPath(source, sourcePath) {
  const { root, value } = parsedRegistrySource(source);
  const grammarNode = directProperty(root, 'consumerGrammar', 'top-level');
  const grammar = value.consumerGrammar;
  if (grammarNode.type !== 'object' || !grammar || typeof grammar !== 'object')
    throw new Error('consumer source rebinding registry source requires consumerGrammar');
  const candidates = [];
  const collect = (arrayNode, values) => {
    if (arrayNode.type !== 'array' || !Array.isArray(values))
      throw new Error('consumer source rebinding registry source has malformed grammar entries');
    arrayNode.values.forEach((node, index) => {
      if (node.type !== 'object')
        throw new Error('consumer source rebinding registry source has malformed grammar entry');
      if (values[index]?.sourcePath !== sourcePath) return;
      const fingerprint = directProperty(node, 'sourceFingerprint', 'selected grammar entry');
      if (fingerprint.type !== 'string')
        throw new Error('consumer source rebinding registry source has invalid fingerprint');
      candidates.push(fingerprint);
    });
  };
  for (const property of ['translatorWrappers', 'translatorForwarders', 'translatorDependencies'])
    collect(directProperty(grammarNode, property, 'consumerGrammar'), grammar[property]);
  const familiesNode = directProperty(grammarNode, 'dynamicKeyFamilies', 'consumerGrammar');
  if (familiesNode.type !== 'array' || !Array.isArray(grammar.dynamicKeyFamilies))
    throw new Error('consumer source rebinding registry source has malformed dynamic families');
  familiesNode.values.forEach((familyNode, index) => {
    if (familyNode.type !== 'object')
      throw new Error('consumer source rebinding registry source has malformed dynamic family');
    collect(
      directProperty(familyNode, 'consumers', 'dynamic family'),
      grammar.dynamicKeyFamilies[index]?.consumers,
    );
  });
  return candidates;
}

function serializeConsumerSourceRebindingRegistry({ source, next, sourcePath }) {
  const targets = sourceFingerprintNodesForPath(source, sourcePath);
  if (targets.length === 0)
    throw new Error('consumer source rebinding registry serializer has no selected entries');
  const replacement = JSON.stringify(
    next.consumerGrammar.dynamicKeyFamilies
      .flatMap((family) => family.consumers)
      .concat(
        next.consumerGrammar.translatorWrappers,
        next.consumerGrammar.translatorForwarders,
        next.consumerGrammar.translatorDependencies,
      )
      .find((entry) => entry.sourcePath === sourcePath)?.sourceFingerprint,
  );
  let serialized = source;
  for (const target of [...targets].sort((left, right) => right.start - left.start))
    serialized = `${serialized.slice(0, target.start)}${replacement}${serialized.slice(target.end)}`;
  if (!sameJsonValue(JSON.parse(serialized), next))
    throw new Error(
      'consumer source rebinding registry serializer structurally drifted from the validated next corpus',
    );
  return serialized;
}

function recoverableSourceGraphViolations(sourcePath, violations) {
  return violations.every((violation) => violation.includes(` ${sourcePath}`));
}

export async function rebindConsumerSource({
  registryPath,
  outputPath,
  taskId,
  sourcePath,
  sourceRoot = resolve('src'),
  fileSystem,
}) {
  validateTaskId(taskId);
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const registrySource = await readFile(registryPath, 'utf8');
  const corpus = JSON.parse(registrySource);
  const currentCorpusViolations = validateCorpus(corpus);
  if (currentCorpusViolations.length)
    throw new Error(`current corpus validation failed:\n${currentCorpusViolations.join('\n')}`);
  const source = await readFile(sourceFilePath(sourceRoot, sourcePath), 'utf8');
  const rebind = rebindConsumerSourceCorpus(corpus, { sourcePath, source });
  sourceFingerprintNodesForPath(registrySource, sourcePath);
  const currentGraphViolations = await retiredConsumerViolations(corpus, sourceRoot);
  if (
    currentGraphViolations.length &&
    (!rebind.rebound || !recoverableSourceGraphViolations(sourcePath, currentGraphViolations))
  )
    throw new Error(
      `current source graph validation failed:\n${currentGraphViolations.join('\n')}`,
    );
  if (!rebind.rebound) {
    if ((await readFile(outputPath, 'utf8')) !== serializeGeneratedResources(corpus))
      throw new Error('consumer rebinding generated output is out of date');
    return {
      rebound: false,
      sourceFingerprint: rebind.sourceFingerprint,
      updatedEntries: rebind.updatedEntries,
    };
  }
  const nextViolations = validateCorpus(rebind.corpus);
  if (nextViolations.length)
    throw new Error(`next corpus validation failed:\n${nextViolations.join('\n')}`);
  const nextGraphViolations = await retiredConsumerViolations(rebind.corpus, sourceRoot);
  if (nextGraphViolations.length)
    throw new Error(`next source graph validation failed:\n${nextGraphViolations.join('\n')}`);
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent: serializeConsumerSourceRebindingRegistry({
      source: registrySource,
      next: rebind.corpus,
      sourcePath,
    }),
    generatedContent: serializeGeneratedResources(rebind.corpus),
    fileSystem,
  });
  return {
    rebound: true,
    sourceFingerprint: rebind.sourceFingerprint,
    updatedEntries: rebind.updatedEntries,
  };
}

export async function rebindConsumerGrammar({
  registryPath,
  outputPath,
  taskId,
  sourcePath,
  functionName,
  bindingName,
  sourceRoot = resolve('src'),
  fileSystem,
}) {
  validateTaskId(taskId);
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const registrySource = await readFile(registryPath, 'utf8');
  const corpus = JSON.parse(registrySource);
  const currentCorpusViolations = validateCorpus(corpus);
  if (currentCorpusViolations.length)
    throw new Error(`current corpus validation failed:\n${currentCorpusViolations.join('\n')}`);
  const source = await readFile(sourceFilePath(sourceRoot, sourcePath), 'utf8');
  const rebind = rebindTranslatorWrapper(corpus, {
    sourcePath,
    functionName,
    bindingName,
    source,
  });
  const preflight = consumerRebindingSourcePreflight({
    source: registrySource,
    corpus,
    sourcePath,
    functionName,
    bindingName,
  });
  const currentGraphViolations = await retiredConsumerViolations(corpus, sourceRoot);
  if (
    currentGraphViolations.length > 0 &&
    (!rebind.rebound ||
      !recoverableCurrentGraphViolations({
        sourcePath,
        functionName,
        bindingName,
        violations: currentGraphViolations,
      }))
  )
    throw new Error(
      `current source graph validation failed:\n${currentGraphViolations.join('\n')}`,
    );
  if (!rebind.rebound) {
    const generatedContent = await readFile(outputPath, 'utf8');
    if (generatedContent !== serializeGeneratedResources(corpus))
      throw new Error('consumer rebinding generated output is out of date');
    return { rebound: false, sourceFingerprint: rebind.sourceFingerprint };
  }
  const nextViolations = validateCorpus(rebind.corpus);
  if (nextViolations.length)
    throw new Error(`next corpus validation failed:\n${nextViolations.join('\n')}`);
  const nextGraphViolations = await retiredConsumerViolations(rebind.corpus, sourceRoot);
  if (nextGraphViolations.length)
    throw new Error(`next source graph validation failed:\n${nextGraphViolations.join('\n')}`);
  const registryContent = serializeConsumerRebindingRegistry({
    source: registrySource,
    next: rebind.corpus,
    preflight,
    sourcePath,
    functionName,
    bindingName,
  });
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent,
    generatedContent: serializeGeneratedResources(rebind.corpus),
    fileSystem,
  });
  return { rebound: true, sourceFingerprint: rebind.sourceFingerprint };
}
