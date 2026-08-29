import { readFile } from 'node:fs/promises';

import {
  applyProtectedSourceRevision,
  reviseProtectedSource,
  serializeGeneratedResources,
  transitionLocaleCandidate,
  validateCorpus,
} from './corpus-engine.mjs';
import { assertDistinctFileTargets, commitReviewTransaction } from './review-exchange.mjs';
import { serializeRevisedRegistry } from './registry-source-transaction.mjs';

const TASK_ID = /^(FE|CRF)-\d{3}$/;
const REVISION_KEYS = [
  'english',
  'expectedSourceRevision',
  'id',
  'key',
  'namespace',
  'occurrences',
  'placeholdersByLocale',
  'pluralForms',
  'renderingContract',
  'ru',
  'uz',
];

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

function exactKeys(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}
function text(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0)
    throw new Error(`${label} must be a non-empty trimmed string`);
  return value;
}
function validateRequest(request) {
  if (!exactKeys(request, ['taskId', 'revisions']))
    throw new Error('request must contain exactly taskId and revisions');
  if (!TASK_ID.test(request.taskId))
    throw new Error('taskId must be an exact FE-NNN or CRF-NNN identifier');
  if (!Array.isArray(request.revisions) || request.revisions.length === 0)
    throw new Error('revisions must be a non-empty array');
  const ids = new Set();
  for (const [index, revision] of request.revisions.entries()) {
    if (!exactKeys(revision, REVISION_KEYS))
      throw new Error(`revisions[${index}] has an invalid shape`);
    for (const key of ['id', 'expectedSourceRevision', 'namespace', 'key', 'english', 'ru', 'uz'])
      text(revision[key], `revisions[${index}].${key}`);
    if (!Array.isArray(revision.occurrences) || revision.occurrences.length === 0)
      throw new Error(`revisions[${index}].occurrences must be non-empty`);
    if (!exactKeys(revision.placeholdersByLocale, ['en', 'ru', 'uz']))
      throw new Error(`revisions[${index}].placeholdersByLocale is invalid`);
    if (revision.renderingContract !== null && typeof revision.renderingContract !== 'object')
      throw new Error(`revisions[${index}].renderingContract is invalid`);
    if (revision.pluralForms !== null && typeof revision.pluralForms !== 'object')
      throw new Error(`revisions[${index}].pluralForms is invalid`);
    if (ids.has(revision.id)) throw new Error(`duplicate revision id: ${revision.id}`);
    ids.add(revision.id);
  }
}

function expectedRevisedUnit(unit, revision, taskId) {
  if (!unit || unit.unitLifecycle !== 'active')
    throw new Error(`unknown or retired unit: ${revision.id}`);
  if (unit.sourceRevision !== revision.expectedSourceRevision)
    throw new Error(`stale source revision: ${revision.id}`);
  if (unit.namespace !== revision.namespace || unit.key !== revision.key)
    throw new Error(`immutable identity mismatch: ${revision.id}`);
  const source = reviseProtectedSource(unit, {
    english: revision.english,
    occurrences: revision.occurrences,
    placeholdersByLocale: revision.placeholdersByLocale,
    renderingContract: revision.renderingContract,
    pluralForms: revision.pluralForms,
  });
  if (source === unit) throw new Error(`source revision is a no-op: ${revision.id}`);
  const candidateFor = (locale) => (locale === 'ru' ? revision.ru : revision.uz);
  const next = {
    ...source,
    migrationProvenance: {
      ...source.migrationProvenance,
      ownerTasks: source.migrationProvenance.ownerTasks.includes(taskId)
        ? source.migrationProvenance.ownerTasks
        : [...source.migrationProvenance.ownerTasks, taskId],
    },
    locales: Object.fromEntries(
      ['ru', 'uz'].map((locale) => {
        const previous = unit.locales[locale];
        const candidate = candidateFor(locale);
        const next =
          previous.status === 'draft'
            ? applyProtectedSourceRevision(
                previous,
                source.sourceRevision,
                candidate === previous.candidate ? undefined : candidate,
              )
            : transitionLocaleCandidate(
                applyProtectedSourceRevision(previous, source.sourceRevision),
                'draft',
                { newCandidate: candidate },
              );
        return [locale, next];
      }),
    ),
  };
  return next;
}

function isExactReplay(unit, revision, taskId) {
  if (
    unit.namespace !== revision.namespace ||
    unit.key !== revision.key ||
    unit.english !== revision.english ||
    !sameJsonValue(unit.occurrences, revision.occurrences) ||
    !sameJsonValue(unit.placeholdersByLocale, revision.placeholdersByLocale) ||
    !sameJsonValue(unit.renderingContract, revision.renderingContract) ||
    !sameJsonValue(unit.pluralForms, revision.pluralForms) ||
    !unit.migrationProvenance.ownerTasks.includes(taskId)
  )
    return false;
  return ['ru', 'uz'].every((locale) => {
    const candidate = unit.locales[locale];
    const expectedCandidate = locale === 'ru' ? revision.ru : revision.uz;
    const sourceIndex = candidate.history.map((event) => event.type).lastIndexOf('source_revision');
    const tail = candidate.history.slice(sourceIndex + 1);
    const sourceEvent = candidate.history[sourceIndex];
    const transition = tail.at(-1);
    return (
      candidate.status === 'draft' &&
      candidate.candidate === expectedCandidate &&
      candidate.sourceRevision === unit.sourceRevision &&
      candidate.reviewerId === null &&
      candidate.verdict === null &&
      candidate.requestedAt === null &&
      candidate.reviewedAt === null &&
      candidate.approvalRecordedAt === null &&
      candidate.approvalAuthority === null &&
      sourceEvent?.previousSourceRevision === revision.expectedSourceRevision &&
      sourceEvent.sourceRevision === unit.sourceRevision &&
      (tail.length === 0 ||
        transition?.type === 'draft_reset' ||
        (transition?.type === 'transition' && transition.to === 'draft'))
    );
  });
}

function isUnattributedCompletedRevision(unit, revision) {
  return (
    unit.namespace === revision.namespace &&
    unit.key === revision.key &&
    unit.english === revision.english &&
    sameJsonValue(unit.occurrences, revision.occurrences) &&
    sameJsonValue(unit.placeholdersByLocale, revision.placeholdersByLocale) &&
    sameJsonValue(unit.renderingContract, revision.renderingContract) &&
    sameJsonValue(unit.pluralForms, revision.pluralForms) &&
    ['ru', 'uz'].every((locale) => {
      const candidate = unit.locales[locale];
      return (
        candidate.status === 'draft' &&
        candidate.candidate === (locale === 'ru' ? revision.ru : revision.uz) &&
        candidate.reviewerId === null &&
        candidate.verdict === null &&
        candidate.requestedAt === null &&
        candidate.reviewedAt === null &&
        candidate.approvalRecordedAt === null &&
        candidate.approvalAuthority === null
      );
    })
  );
}

export async function reviseDraftUnits({ registryPath, outputPath, request, fileSystem }) {
  validateRequest(request);
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const registrySource = await readFile(registryPath, 'utf8');
  const corpus = JSON.parse(registrySource);
  const currentViolations = validateCorpus(corpus);
  if (currentViolations.length)
    throw new Error(`current corpus validation failed:\n${currentViolations.join('\n')}`);
  const byId = new Map(corpus.units.map((unit) => [unit.id, unit]));
  const replayed = new Set();
  const unattributed = new Set();
  for (const revision of request.revisions) {
    const unit = byId.get(revision.id);
    if (!unit || unit.unitLifecycle !== 'active')
      throw new Error(`unknown or retired unit: ${revision.id}`);
    if (isExactReplay(unit, revision, request.taskId)) replayed.add(revision.id);
    else if (isUnattributedCompletedRevision(unit, revision)) unattributed.add(revision.id);
  }
  const units = corpus.units.map((unit) => {
    const revision = request.revisions.find((item) => item.id === unit.id);
    if (!revision || replayed.has(unit.id)) return unit;
    if (unattributed.has(unit.id))
      return {
        ...unit,
        migrationProvenance: {
          ...unit.migrationProvenance,
          ownerTasks: unit.migrationProvenance.ownerTasks.includes(request.taskId)
            ? unit.migrationProvenance.ownerTasks
            : [...unit.migrationProvenance.ownerTasks, request.taskId],
        },
      };
    return expectedRevisedUnit(unit, revision, request.taskId);
  });
  const next = {
    ...corpus,
    units,
  };
  const violations = validateCorpus(next);
  if (violations.length)
    throw new Error(`draft revision preflight failed:\n${violations.join('\n')}`);
  if (replayed.size === request.revisions.length)
    return { revisedCount: 0, replayedCount: replayed.size, wrote: false };
  const registryContent = serializeRevisedRegistry({ source: registrySource, corpus, next });
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent,
    generatedContent: serializeGeneratedResources(next),
    fileSystem,
  });
  return {
    revisedCount: request.revisions.length - replayed.size,
    replayedCount: replayed.size,
    wrote: true,
  };
}

export async function readDraftRevisionRequest(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
