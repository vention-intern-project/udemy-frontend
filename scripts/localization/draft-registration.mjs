import { readFile } from 'node:fs/promises';

import {
  protectedSourceFingerprint,
  serializeGeneratedResources,
  validateCorpus,
} from './corpus-engine.mjs';
import { assertDistinctFileTargets, commitReviewTransaction } from './review-exchange.mjs';

const TASK_ID = /^FE-\d{3}$/;
const UNIT_ID = /^MLUX-C(\d{4})$/;
const OCCURRENCE_ID = /^MLUX-O(\d{4})$/;
const UNIT_KEYS = ['context', 'english', 'key', 'namespace', 'ru', 'uz'];
const NAMESPACES = new Set([
  'a11y',
  'ai',
  'auth',
  'cart',
  'catalog',
  'common',
  'course',
  'instructor',
  'learning',
  'navigation',
  'routes',
]);

function sameKeys(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys)
  );
}

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0)
    throw new Error(`${label} must be a non-empty trimmed string`);
  return value;
}

function validateInput(taskId, units) {
  if (typeof taskId !== 'string' || !TASK_ID.test(taskId))
    throw new Error('taskId must be an exact FE-NNN identifier');
  if (!Array.isArray(units) || units.length === 0)
    throw new Error('units must be a non-empty array');
  const keys = new Set();
  for (const [index, unit] of units.entries()) {
    if (!sameKeys(unit, UNIT_KEYS))
      throw new Error(`units[${index}] must contain exact properties: ${UNIT_KEYS.join(', ')}`);
    for (const field of UNIT_KEYS) requiredText(unit[field], `units[${index}].${field}`);
    if (!NAMESPACES.has(unit.namespace))
      throw new Error(`units[${index}].namespace is unsupported`);
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(unit.key)) throw new Error(`units[${index}].key is invalid`);
    if (!unit.context.startsWith('src/') || !unit.context.includes(' — '))
      throw new Error(`units[${index}].context must name an exact src consumer and context`);
    if (/[{}]/.test(unit.english) || /[{}]/.test(unit.ru) || /[{}]/.test(unit.uz))
      throw new Error(`units[${index}] has unsupported placeholders`);
    const semanticKey = `${unit.namespace}:${unit.key}`;
    if (keys.has(semanticKey)) throw new Error(`duplicate namespace/key input: ${semanticKey}`);
    keys.add(semanticKey);
  }
}

function nextNumericId(units, expression, label) {
  const values = units.map((unit) => {
    const match = expression.exec(unit.id);
    return match ? Number(match[1]) : 0;
  });
  const next = Math.max(0, ...values) + 1;
  if (next > 9999) throw new Error(`no ${label} IDs remain`);
  return next;
}

function localeCandidate(candidate, sourceRevision) {
  return {
    candidate,
    status: 'draft',
    reviewerId: null,
    verdict: null,
    requestedAt: null,
    reviewedAt: null,
    approvalRecordedAt: null,
    history: [],
    sourceRevision,
    approvalAuthority: null,
  };
}

function buildUnit(input, id, occurrenceId, taskId) {
  const unit = {
    id,
    namespace: input.namespace,
    key: input.key,
    english: input.english,
    sourceRevision: '',
    unitLifecycle: 'active',
    occurrences: [{ id: occurrenceId, context: input.context }],
    placeholdersByLocale: { en: [], ru: [], uz: [] },
    renderingContract: null,
    pluralForms: null,
    locales: {},
    migrationProvenance: {
      legacyResourceStatus: 'Draft',
      legacyReviewStatus: 'Pending',
      ownerTasks: [taskId],
    },
  };
  unit.sourceRevision = protectedSourceFingerprint(unit);
  unit.locales = {
    ru: localeCandidate(input.ru, unit.sourceRevision),
    uz: localeCandidate(input.uz, unit.sourceRevision),
  };
  return unit;
}

function exactReplay(existing, input, taskId) {
  const expected = buildUnit(input, existing.id, existing.occurrences?.[0]?.id, taskId);
  return JSON.stringify(existing) === JSON.stringify(expected);
}

function summaryWithDrafts(corpus, createdCount) {
  return {
    ...corpus.summary,
    translationUnits: corpus.summary.translationUnits + createdCount,
    sourceOccurrences: corpus.summary.sourceOccurrences + createdCount,
    russianDrafts: corpus.summary.russianDrafts + createdCount,
    uzbekDrafts: corpus.summary.uzbekDrafts + createdCount,
  };
}

function isScalar(value) {
  return value === null || ['boolean', 'number', 'string'].includes(typeof value);
}

function canonicalRegistryValue(value, indentation) {
  const padding = ' '.repeat(indentation);
  const childPadding = ' '.repeat(indentation + 2);
  if (isScalar(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    const inline = JSON.stringify(value);
    if (value.every(isScalar) && inline.length <= 100) return inline;
    return `[\n${value
      .map((item) => `${childPadding}${canonicalRegistryValue(item, indentation + 2)}`)
      .join(',\n')}\n${padding}]`;
  }
  return `{\n${Object.entries(value)
    .map(
      ([key, item]) =>
        `${childPadding}${JSON.stringify(key)}: ${canonicalRegistryValue(item, indentation + 2)}`,
    )
    .join(',\n')}\n${padding}}`;
}

function skipWhitespace(source, index) {
  let cursor = index;
  while (/\s/.test(source[cursor] ?? '')) cursor += 1;
  return cursor;
}

function malformedRegistrySource() {
  throw new Error('registry serializer received malformed JSON source');
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
        throw new Error(`registry serializer found duplicate direct property "${name}"`);
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
  const raw = source.slice(start, end);
  try {
    const value = JSON.parse(raw);
    if (value === null || typeof value === 'boolean' || typeof value === 'number')
      return { end, start, type: typeof value, value };
  } catch {
    malformedRegistrySource();
  }
  malformedRegistrySource();
}

function directProperty(object, name, scope) {
  const property = object.properties.find((candidate) => candidate.name === name);
  if (!property)
    throw new Error(`registry serializer is missing direct ${scope} property "${name}"`);
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

function replaceSourceValues(source, replacements) {
  return [...replacements]
    .sort((left, right) => right.start - left.start)
    .reduce(
      (result, replacement) =>
        `${result.slice(0, replacement.start)}${replacement.value}${result.slice(replacement.end)}`,
      source,
    );
}

function structuralRegistrySourcePreflight(source, corpus) {
  const { root, value } = parsedRegistrySource(source);
  const summary = directProperty(root, 'summary', 'top-level');
  const units = directProperty(root, 'units', 'top-level');
  if (summary.type !== 'object')
    throw new Error(
      'registry serializer requires direct top-level property "summary" to be an object',
    );
  if (units.type !== 'array')
    throw new Error(
      'registry serializer requires direct top-level property "units" to be an array',
    );
  if (!sameJsonValue(value, corpus))
    throw new Error('registry serializer source structurally drifted from the current corpus');
  const summaryAnchors = [
    'translationUnits',
    'sourceOccurrences',
    'russianDrafts',
    'uzbekDrafts',
  ].map((key) => {
    const current = directProperty(summary, key, 'summary');
    if (current.type !== 'number' || !Number.isSafeInteger(current.value))
      throw new Error(
        `registry serializer requires direct summary property "${key}" to be numeric`,
      );
    if (!Number.isSafeInteger(corpus.summary[key]) || corpus.summary[key] !== current.value)
      throw new Error(`registry serializer source drifted at summary property "${key}"`);
    return { current, key };
  });
  return { summary, summaryAnchors };
}

export function serializeDraftRegistry({ source, corpus, next }) {
  if (
    next.units.length <= corpus.units.length ||
    JSON.stringify(next.units.slice(0, corpus.units.length)) !== JSON.stringify(corpus.units)
  )
    throw new Error('registry serializer only supports appending validated draft units');
  const { summaryAnchors } = structuralRegistrySourcePreflight(source, corpus);
  const changed = ['translationUnits', 'sourceOccurrences', 'russianDrafts', 'uzbekDrafts'];
  const summaryReplacements = summaryAnchors.map(({ current, key }) => {
    if (!Number.isSafeInteger(next.summary[key]))
      throw new Error(`registry serializer received nonnumeric next summary property "${key}"`);
    return { end: current.end, start: current.start, value: String(next.summary[key]) };
  });
  const unrelated = Object.keys(corpus.summary).filter(
    (key) => !changed.includes(key) && !sameJsonValue(corpus.summary[key], next.summary[key]),
  );
  if (unrelated.length > 0)
    throw new Error(
      `registry serializer received unrelated summary changes: ${unrelated.join(', ')}`,
    );
  const summaryPatched = replaceSourceValues(source, summaryReplacements);
  const patchedUnits = directProperty(
    parsedRegistrySource(summaryPatched).root,
    'units',
    'top-level',
  );
  const additions = next.units.slice(corpus.units.length);
  const prefix = summaryPatched.slice(0, patchedUnits.end - 1).trimEnd();
  const appended = additions.map((unit) => `    ${canonicalRegistryValue(unit, 4)}`).join(',\n');
  return `${prefix},\n${appended}\n  ${summaryPatched.slice(patchedUnits.end - 1)}`;
}

export async function registerDraftUnits({ registryPath, outputPath, taskId, units, fileSystem }) {
  validateInput(taskId, units);
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const registrySource = await readFile(registryPath, 'utf8');
  const corpus = JSON.parse(registrySource);
  const currentViolations = validateCorpus(corpus);
  if (currentViolations.length)
    throw new Error(`current corpus validation failed:\n${currentViolations.join('\n')}`);
  structuralRegistrySourcePreflight(registrySource, corpus);

  const byKey = new Map(corpus.units.map((unit) => [`${unit.namespace}:${unit.key}`, unit]));
  const existing = units.map((input) => byKey.get(`${input.namespace}:${input.key}`) ?? null);
  if (existing.some(Boolean)) {
    if (
      existing.every(Boolean) &&
      existing.every((unit, index) => exactReplay(unit, units[index], taskId))
    )
      return { created: [], reused: existing.map((unit) => unit.id) };
    throw new Error(
      'draft registration collides with an existing namespace/key or non-exact replay',
    );
  }

  let nextUnit = nextNumericId(corpus.units, UNIT_ID, 'translation unit');
  let nextOccurrence = nextNumericId(
    corpus.units.flatMap((unit) => unit.occurrences ?? []),
    OCCURRENCE_ID,
    'occurrence',
  );
  const additions = units.map((input) =>
    buildUnit(
      input,
      `MLUX-C${String(nextUnit++).padStart(4, '0')}`,
      `MLUX-O${String(nextOccurrence++).padStart(4, '0')}`,
      taskId,
    ),
  );
  const next = {
    ...corpus,
    units: [...corpus.units, ...additions],
    summary: summaryWithDrafts(corpus, additions.length),
  };
  const violations = validateCorpus(next);
  if (violations.length)
    throw new Error(`draft registration preflight failed:\n${violations.join('\n')}`);
  const registryContent = serializeDraftRegistry({ source: registrySource, corpus, next });
  let serializedCorpus;
  try {
    serializedCorpus = JSON.parse(registryContent);
  } catch {
    throw new Error('registry serializer produced malformed JSON');
  }
  if (!sameJsonValue(serializedCorpus, next))
    throw new Error(
      'registry serializer output structurally drifted from the validated next corpus',
    );
  const serializedViolations = validateCorpus(serializedCorpus);
  if (serializedViolations.length)
    throw new Error(
      `registry serializer output validation failed:\n${serializedViolations.join('\n')}`,
    );
  const generatedContent = serializeGeneratedResources(serializedCorpus);
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent,
    generatedContent,
    fileSystem,
  });
  return { created: additions.map((unit) => unit.id), reused: [] };
}

export async function readDraftRegistrationUnits(unitsPath) {
  return JSON.parse(await readFile(unitsPath, 'utf8'));
}
