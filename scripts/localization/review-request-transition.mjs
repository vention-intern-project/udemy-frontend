import { readFile } from 'node:fs/promises';

import {
  requestLocaleCandidateReview,
  serializeGeneratedResources,
  validateCorpus,
} from './corpus-engine.mjs';
import { assertDistinctFileTargets, commitReviewTransaction } from './review-exchange.mjs';
import { serializeRevisedRegistry } from './registry-source-transaction.mjs';

const REVIEW_LOCALES = new Set(['ru', 'uz']);
const TASK_ID = /^(FE|CRF)-\d{3}$/;
const UNIT_ID = /^(MLUX-C\d{4}|MLUX-003-S\d{3})$/;
const UTC_MILLISECOND_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function exactSortedStrings(value, label, matcher) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !matcher(item)))
    throw new Error(`${label} must be a non-empty list of valid values`);
  if (new Set(value).size !== value.length) throw new Error(`${label} must be duplicate-free`);
  if (value.some((item, index) => item !== [...value].sort()[index]))
    throw new Error(`${label} must be sorted`);
}

function validRequestedAt(value) {
  return (
    typeof value === 'string' &&
    UTC_MILLISECOND_INSTANT.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function validateRequest({ taskId, locales, unitIds, requestedAt, adoptLegacyOwners }) {
  if (typeof taskId !== 'string' || !TASK_ID.test(taskId))
    throw new Error('taskId must be an exact FE-NNN or CRF-NNN value');
  exactSortedStrings(locales, 'locales', (locale) => REVIEW_LOCALES.has(locale));
  exactSortedStrings(unitIds, 'unitIds', (unitId) => UNIT_ID.test(unitId));
  if (!validRequestedAt(requestedAt))
    throw new Error('requestedAt must be a UTC RFC3339 millisecond instant');
  if (typeof adoptLegacyOwners !== 'boolean')
    throw new Error('adoptLegacyOwners must be a boolean');
}

function reviewRequestBoundary({ taskId, locales, unitIds, requestedAt }) {
  return { taskId, locales: [...locales], unitIds: [...unitIds], requestedAt };
}

function same(value, other) {
  return JSON.stringify(value) === JSON.stringify(other);
}

function assertCurrentCandidate(unit, locale) {
  if (!unit || unit.unitLifecycle !== 'active')
    throw new Error(`unknown or retired unit: ${unit?.id}`);
  const candidate = unit.locales?.[locale];
  if (!candidate || candidate.status !== 'draft')
    throw new Error(`candidate is not a clean draft: ${unit.id}/${locale}`);
  if (
    candidate.requestedAt !== null ||
    candidate.reviewerId !== null ||
    candidate.verdict !== null ||
    candidate.reviewedAt !== null ||
    candidate.approvalRecordedAt !== null ||
    candidate.approvalAuthority !== null
  )
    throw new Error(`draft candidate retains review metadata: ${unit.id}/${locale}`);
  return candidate;
}

function isExactReplayCandidate(candidate, boundary) {
  if (candidate?.status !== 'review_requested' || candidate.requestedAt !== boundary.requestedAt)
    return false;
  const terminal = candidate.history?.at(-1);
  return (
    terminal?.type === 'transition' &&
    terminal.from === 'draft' &&
    terminal.to === 'review_requested' &&
    same(terminal.reviewRequest, boundary)
  );
}

function classifyBoundary(corpus, { taskId, locales, unitIds, requestedAt, adoptLegacyOwners }) {
  const boundary = reviewRequestBoundary({ taskId, locales, unitIds, requestedAt });
  const units = new Map(corpus.units.map((unit) => [unit.id, unit]));
  const selected = unitIds.map((unitId) => {
    const unit = units.get(unitId);
    if (!unit || unit.unitLifecycle !== 'active')
      throw new Error(`unknown or retired unit: ${unitId}`);
    const ownerTasks = unit.migrationProvenance?.ownerTasks;
    const owned = ownerTasks?.includes(taskId) === true;
    if (!owned && !adoptLegacyOwners) throw new Error(`unit is not owned by task: ${unitId}`);
    if (!owned && ownerTasks?.some((ownerTask) => TASK_ID.test(ownerTask)))
      throw new Error(`unit is owned by another post-migration task: ${unitId}`);
    return { unit, unitId, adoptOwner: !owned };
  });
  const candidates = selected.flatMap(({ unit, unitId, adoptOwner }) =>
    locales.map((locale) => ({
      unit,
      unitId,
      locale,
      candidate: unit.locales?.[locale],
      adoptOwner,
    })),
  );
  const replayed = candidates.filter(({ candidate }) =>
    isExactReplayCandidate(candidate, boundary),
  );
  if (replayed.length === candidates.length) return { boundary, candidates, replayed: true };
  if (replayed.length > 0) throw new Error('review-request boundary has partial replay state');
  for (const { unit, locale } of candidates) assertCurrentCandidate(unit, locale);
  return { boundary, candidates, replayed: false };
}

export async function requestLocaleReviews({
  registryPath,
  outputPath,
  taskId,
  locales,
  unitIds,
  requestedAt,
  adoptLegacyOwners = false,
  fileSystem,
}) {
  validateRequest({ taskId, locales, unitIds, requestedAt, adoptLegacyOwners });
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const [registrySource, currentOutput] = await Promise.all([
    readFile(registryPath, 'utf8'),
    readFile(outputPath, 'utf8'),
  ]);
  const corpus = JSON.parse(registrySource);
  const currentViolations = validateCorpus(corpus);
  if (currentViolations.length)
    throw new Error(`current corpus validation failed:\n${currentViolations.join('\n')}`);
  const currentGenerated = serializeGeneratedResources(corpus);
  if (currentOutput !== currentGenerated) throw new Error('generated output is out of date');
  const classified = classifyBoundary(corpus, {
    taskId,
    locales,
    unitIds,
    requestedAt,
    adoptLegacyOwners,
  });
  if (classified.replayed)
    return { requestedCount: 0, replayedCount: classified.candidates.length, wrote: false };

  const next = structuredClone(corpus);
  const nextById = new Map(next.units.map((unit) => [unit.id, unit]));
  for (const unitId of unitIds) {
    const unit = nextById.get(unitId);
    if (!unit.migrationProvenance.ownerTasks.includes(taskId))
      unit.migrationProvenance.ownerTasks.push(taskId);
    for (const locale of locales)
      unit.locales[locale] = requestLocaleCandidateReview(
        unit.locales[locale],
        classified.boundary,
      );
  }
  const nextViolations = validateCorpus(next);
  if (nextViolations.length)
    throw new Error(`review-request preflight failed:\n${nextViolations.join('\n')}`);
  const generatedContent = serializeGeneratedResources(next);
  if (generatedContent !== currentGenerated)
    throw new Error('review-request metadata must not change generated resources');
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent: serializeRevisedRegistry({ source: registrySource, corpus, next }),
    generatedContent,
    fileSystem,
  });
  return { requestedCount: classified.candidates.length, replayedCount: 0, wrote: true };
}
