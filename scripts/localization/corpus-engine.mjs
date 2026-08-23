import { createHash, randomUUID } from 'node:crypto';
import { open, readFile, readdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

const LOCALES = ['en', 'ru', 'uz'];
const REVIEW_LOCALES = ['ru', 'uz'];
const STATUSES = new Set(['draft', 'review_requested', 'changes_requested', 'approved', 'stale']);
const TRANSITIONS = new Map([
  ['draft', new Set(['review_requested'])],
  ['review_requested', new Set(['approved', 'changes_requested', 'stale'])],
  ['changes_requested', new Set(['draft', 'stale'])],
  ['approved', new Set(['stale'])],
  ['stale', new Set(['draft'])],
]);
const SOURCE_HASH = /^[A-Fa-f0-9]{64}$/;
const REVISION = /^sha256:[a-f0-9]{64}$/;
const ID = /^(MLUX-C\d{4}|MLUX-003-S\d{3})$/;
const OCCURRENCE = /^(MLUX-O\d{4}|MLUX-003-SO\d{3})$/;
const DRAFT_37 = 'MLUX-001-DRAFT-37';
const DRAFT_37_SOURCE_SHA256 = 'C9E208FC5F1AEF55E709290C67270B79E1CBCE4831E7FBCB20555AB5CF8A73AE';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex')}`;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{?\s*([A-Za-z][A-Za-z0-9_]*)\s*}}?/g)]
    .map((match) => match[1])
    .sort();
}

function localePlaceholderContract(unit, locale) {
  const contract = unit.placeholdersByLocale?.[locale];
  return Array.isArray(contract) && contract.every(nonEmptyString) ? [...contract].sort() : null;
}

function same(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function protectedSourceFingerprint(unit) {
  return digest({
    english: unit.english,
    occurrences: (unit.occurrences ?? []).map(({ id, context }) => ({ id, context })),
    placeholdersByLocale: unit.placeholdersByLocale,
    pluralForms: unit.pluralForms ?? null,
  });
}

function validHumanApproval(candidate) {
  const authority = candidate.approvalAuthority;
  return (
    authority &&
    authority.kind === 'human_native_review' &&
    nonEmptyString(authority.reviewerId) &&
    nonEmptyString(authority.reviewerName) &&
    nonEmptyString(candidate.reviewerId) &&
    candidate.reviewerId === authority.reviewerId &&
    nonEmptyString(candidate.reviewedAt) &&
    nonEmptyString(candidate.approvalRecordedAt)
  );
}

function lifecycleViolation(candidate) {
  if (!Array.isArray(candidate.history)) return 'history must be an array';
  let status = 'draft';
  let heldCandidate = null;
  for (const event of candidate.history) {
    if (!event || typeof event !== 'object' || typeof event.type !== 'string')
      return 'invalid history event';
    if (event.type === 'source_revision') {
      if (!REVISION.test(event.sourceRevision)) return 'invalid source revision history';
      continue;
    }
    if (event.type !== 'transition' || !STATUSES.has(event.from) || !STATUSES.has(event.to))
      return 'invalid history event';
    if (event.from !== status || !TRANSITIONS.get(event.from)?.has(event.to))
      return 'illegal transition history';
    if (!nonEmptyString(event.previousCandidate) || !nonEmptyString(event.nextCandidate))
      return 'transition history lacks candidate binding';
    if (heldCandidate !== null && event.previousCandidate !== heldCandidate)
      return 'transition history candidate discontinuity';
    heldCandidate = event.nextCandidate;
    if (event.from === 'stale' && event.to === 'draft') {
      if (event.previousCandidate === event.nextCandidate)
        return 'stale -> draft requires a new candidate history';
    }
    if (event.to === 'approved' && !validHumanApproval(event.humanApproval ?? candidate))
      return 'approved history lacks human-native authority';
    status = event.to;
  }
  if (status !== candidate.status) return 'history does not end at current status';
  if (heldCandidate !== null && heldCandidate !== candidate.candidate)
    return 'transition history does not bind current candidate';
  if (candidate.status === 'approved' && !validHumanApproval(candidate))
    return 'approved candidate lacks human-native authority';
  return null;
}

function validateRestoration(unit, violations) {
  if (unit.unitLifecycle === 'retired') {
    if (
      !nonEmptyString(unit.retirement?.reason) ||
      unit.retirement.sourceRevision !== unit.sourceRevision
    )
      violations.push(`${unit.id}: invalid retirement provenance`);
    if ((unit.occurrences ?? []).length > 0)
      violations.push(`${unit.id}: retired unit still has registry consumers`);
    return;
  }
  if (unit.retirementHistory === undefined) return;
  if (
    !Array.isArray(unit.retirementHistory) ||
    unit.retirementHistory.length === 0 ||
    unit.retirement !== undefined
  ) {
    violations.push(`${unit.id}: invalid restoration history`);
    return;
  }
  for (const retirement of unit.retirementHistory) {
    if (!nonEmptyString(retirement?.reason) || !REVISION.test(retirement?.sourceRevision ?? '')) {
      violations.push(`${unit.id}: invalid restoration history`);
      return;
    }
    if (retirement.sourceRevision === unit.sourceRevision) {
      violations.push(`${unit.id}: restored unit must use a new source revision`);
    }
  }
  for (const locale of REVIEW_LOCALES) {
    const candidate = unit.locales?.[locale];
    if (
      candidate?.status !== 'draft' ||
      candidate.sourceRevision !== unit.sourceRevision ||
      !candidate.history.some(
        (event) =>
          event?.type === 'source_revision' && event.sourceRevision === unit.sourceRevision,
      )
    )
      violations.push(`${unit.id}: restored ${locale} candidate must be a new non-approved draft`);
  }
}

function validateCandidate(unit, locale, violations) {
  const candidate = unit.locales?.[locale];
  if (!candidate || typeof candidate !== 'object' || !STATUSES.has(candidate.status)) {
    violations.push(`${unit.id}: invalid ${locale} candidate`);
    return;
  }
  if (!nonEmptyString(candidate.candidate))
    violations.push(`${unit.id}: invalid ${locale} candidate text`);
  if (candidate.sourceRevision !== unit.sourceRevision)
    violations.push(`${unit.id}: ${locale} candidate source revision mismatch`);
  const history = lifecycleViolation(candidate);
  if (history) violations.push(`${unit.id}: ${locale} ${history}`);
  if (candidate.status === 'approved' && !validHumanApproval(candidate)) {
    violations.push(`${unit.id}: ${locale} approved candidate lacks human-native authority`);
  }
  const expectedPlaceholders = localePlaceholderContract(unit, locale);
  if (!expectedPlaceholders || !same(placeholders(candidate.candidate), expectedPlaceholders))
    violations.push(`${unit.id}: ${locale} placeholder mismatch`);
}

function validatePluralForms(unit, violations) {
  if (unit.pluralForms === null) return;
  if (!unit.pluralForms || typeof unit.pluralForms !== 'object') {
    violations.push(`${unit.id}: invalid plural forms`);
    return;
  }
  for (const locale of LOCALES) {
    const forms = unit.pluralForms[locale];
    if (
      !forms ||
      typeof forms !== 'object' ||
      Array.isArray(forms) ||
      Object.keys(forms).length === 0
    ) {
      violations.push(`${unit.id}: invalid ${locale} plural forms`);
      continue;
    }
    const expectedPlaceholders = localePlaceholderContract(unit, locale);
    for (const value of Object.values(forms)) {
      if (
        !nonEmptyString(value) ||
        !expectedPlaceholders ||
        !same(placeholders(value), expectedPlaceholders)
      ) {
        violations.push(`${unit.id}: ${locale} plural placeholder mismatch`);
        break;
      }
    }
  }
}

function validateTopLevel(corpus, violations) {
  if (!corpus || typeof corpus !== 'object' || Array.isArray(corpus))
    return violations.push('invalid corpus object');
  if (corpus.formatVersion !== 1) violations.push('invalid format version');
  if (!nonEmptyString(corpus.corpusVersion)) violations.push('invalid corpus version');
  if (!SOURCE_HASH.test(corpus.source?.sha256 ?? ''))
    violations.push('invalid corpus source sha256');
  if (!corpus.baselineResources || typeof corpus.baselineResources !== 'object')
    violations.push('missing baseline resources');
  for (const locale of LOCALES)
    if (!corpus.baselineResources?.[locale] || typeof corpus.baselineResources[locale] !== 'object')
      violations.push(`missing baseline ${locale} resources`);
  if (!Array.isArray(corpus.exclusions)) violations.push('missing exclusions');
  if (!Array.isArray(corpus.units) || corpus.units.length === 0) violations.push('missing units');
  if (
    !corpus.summary ||
    !Number.isInteger(corpus.summary.translationUnits) ||
    !Number.isInteger(corpus.summary.sourceOccurrences) ||
    !Number.isInteger(corpus.summary.mergedDuplicateRows)
  )
    violations.push('invalid summary');
  if (
    !corpus.migration ||
    corpus.migration.sourceVersion !== corpus.corpusVersion ||
    corpus.migration.sourceSha256 !== corpus.source?.sha256 ||
    !Number.isInteger(corpus.migration.sourceOccurrences) ||
    corpus.migration.importedAt !== null
  )
    violations.push('invalid migration provenance');
  if (
    corpus.corpusVersion === DRAFT_37 &&
    (corpus.source?.sha256 !== DRAFT_37_SOURCE_SHA256 ||
      corpus.migration?.sourceSha256 !== DRAFT_37_SOURCE_SHA256 ||
      corpus.units?.length !== 523 ||
      corpus.summary?.translationUnits !== 523 ||
      corpus.summary?.sourceOccurrences !== 746 ||
      corpus.summary?.mergedDuplicateRows !== 223 ||
      corpus.exclusions?.length !== 12 ||
      corpus.migration?.sourceOccurrences !== 746)
  )
    violations.push('DRAFT-37 identity/count mismatch');
}

export function validateCorpus(corpus) {
  const violations = [];
  validateTopLevel(corpus, violations);
  if (!Array.isArray(corpus?.units)) return violations.sort();
  const ids = new Set();
  const keys = new Set();
  const occurrences = new Set();
  let occurrenceCount = 0;
  for (const unit of corpus.units) {
    if (!unit || typeof unit !== 'object' || !nonEmptyString(unit.id) || !ID.test(unit.id)) {
      violations.push('invalid unit id');
      continue;
    }
    if (ids.has(unit.id)) violations.push(`${unit.id}: duplicate unit id`);
    ids.add(unit.id);
    if (!nonEmptyString(unit.namespace) || !nonEmptyString(unit.key))
      violations.push(`${unit.id}: invalid semantic key`);
    const key = `${unit.namespace}:${unit.key}`;
    if (keys.has(key)) violations.push(`${unit.id}: duplicate namespace/key`);
    keys.add(key);
    if (!nonEmptyString(unit.english)) violations.push(`${unit.id}: invalid english source`);
    if (
      !unit.migrationProvenance ||
      !nonEmptyString(unit.migrationProvenance.legacyResourceStatus) ||
      !nonEmptyString(unit.migrationProvenance.legacyReviewStatus) ||
      !Array.isArray(unit.migrationProvenance.ownerTasks) ||
      unit.migrationProvenance.ownerTasks.length === 0 ||
      !unit.migrationProvenance.ownerTasks.every(nonEmptyString)
    )
      violations.push(`${unit.id}: invalid migration provenance`);
    if (!['active', 'retired'].includes(unit.unitLifecycle))
      violations.push(`${unit.id}: invalid unit lifecycle`);
    if (!Array.isArray(unit.occurrences)) violations.push(`${unit.id}: invalid occurrences`);
    for (const occurrence of unit.occurrences ?? []) {
      occurrenceCount += 1;
      if (!occurrence || !OCCURRENCE.test(occurrence.id) || !nonEmptyString(occurrence.context))
        violations.push(`${unit.id}: invalid occurrence`);
      if (occurrences.has(occurrence?.id)) violations.push(`${unit.id}: duplicate occurrence id`);
      occurrences.add(occurrence?.id);
    }
    if (
      !unit.placeholdersByLocale ||
      Object.keys(unit.placeholdersByLocale).sort().join(',') !== 'en,ru,uz'
    )
      violations.push(`${unit.id}: invalid locale placeholder contract`);
    else
      for (const locale of LOCALES)
        if (
          !Array.isArray(unit.placeholdersByLocale[locale]) ||
          !unit.placeholdersByLocale[locale].every(nonEmptyString)
        )
          violations.push(`${unit.id}: invalid ${locale} placeholder contract`);
    if (
      !REVISION.test(unit.sourceRevision ?? '') ||
      unit.sourceRevision !== protectedSourceFingerprint(unit)
    )
      violations.push(`${unit.id}: source revision fingerprint mismatch`);
    if (!unit.locales || Object.keys(unit.locales).sort().join(',') !== 'ru,uz')
      violations.push(`${unit.id}: invalid review locales`);
    else REVIEW_LOCALES.forEach((locale) => validateCandidate(unit, locale, violations));
    if (!same(placeholders(unit.english), [...(unit.placeholdersByLocale?.en ?? [])].sort()))
      violations.push(`${unit.id}: en placeholder mismatch`);
    validatePluralForms(unit, violations);
    validateRestoration(unit, violations);
  }
  if (corpus.summary?.translationUnits !== corpus.units.length)
    violations.push('summary translation unit count mismatch');
  if (
    corpus.summary?.sourceOccurrences !== occurrenceCount ||
    corpus.migration?.sourceOccurrences !== occurrenceCount
  )
    violations.push('summary source occurrence count mismatch');
  return violations.sort();
}

export function reviseProtectedSource(unit, changes) {
  const next = {
    ...unit,
    ...changes,
    occurrences: changes.occurrences ?? unit.occurrences,
    placeholdersByLocale: changes.placeholdersByLocale ?? unit.placeholdersByLocale,
    pluralForms: changes.pluralForms ?? unit.pluralForms,
  };
  const sourceRevision = protectedSourceFingerprint(next);
  if (sourceRevision === unit.sourceRevision) return unit;
  return {
    ...next,
    sourceRevision,
    locales: Object.fromEntries(
      REVIEW_LOCALES.map((locale) => [
        locale,
        applyProtectedSourceRevision(unit.locales[locale], sourceRevision),
      ]),
    ),
  };
}

export function applyProtectedDrift(unit, _ignoredChangedFields, sourceRevision) {
  if (sourceRevision !== protectedSourceFingerprint(unit))
    throw new Error('caller-claimed source revision is not authoritative');
  return unit;
}

export function transitionLocaleCandidate(candidate, nextStatus, options = {}) {
  if (!STATUSES.has(nextStatus) || !TRANSITIONS.get(candidate.status)?.has(nextStatus))
    throw new Error(`${candidate.status} -> ${nextStatus} is forbidden`);
  if (
    options.newCandidate !== undefined &&
    !(candidate.status === 'stale' && nextStatus === 'draft')
  )
    throw new Error('candidate replacement is only allowed for stale -> draft');
  if (
    candidate.status === 'stale' &&
    nextStatus === 'draft' &&
    (!nonEmptyString(options.newCandidate) || options.newCandidate === candidate.candidate)
  )
    throw new Error('stale -> draft requires a new candidate');
  const next = {
    ...candidate,
    candidate: options.newCandidate ?? candidate.candidate,
    status: nextStatus,
  };
  if (nextStatus === 'approved') {
    Object.assign(next, options.humanApproval);
    if (!validHumanApproval(next))
      throw new Error('approved requires named human-native authority');
  }
  return {
    ...next,
    history: [
      ...candidate.history,
      {
        type: 'transition',
        from: candidate.status,
        to: nextStatus,
        previousCandidate: candidate.candidate,
        nextCandidate: next.candidate,
        ...(nextStatus === 'approved' ? { humanApproval: options.humanApproval } : {}),
      },
    ],
  };
}

export function migrateLegacyDraft(
  candidate,
  sourceRevision = 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
) {
  return {
    candidate,
    sourceRevision,
    status: 'draft',
    reviewerId: null,
    verdict: null,
    requestedAt: null,
    reviewedAt: null,
    approvalRecordedAt: null,
    approvalAuthority: null,
    history: [],
  };
}

export function applyProtectedSourceRevision(candidate, sourceRevision) {
  const shouldStale = ['approved', 'review_requested', 'changes_requested'].includes(
    candidate.status,
  );
  return {
    ...candidate,
    sourceRevision,
    status: shouldStale ? 'stale' : candidate.status,
    history: [
      ...candidate.history,
      { type: 'source_revision', sourceRevision },
      ...(shouldStale
        ? [
            {
              type: 'transition',
              from: candidate.status,
              to: 'stale',
              previousCandidate: candidate.candidate,
              nextCandidate: candidate.candidate,
            },
          ]
        : []),
    ],
  };
}

export function generateResources(corpus) {
  const resources = JSON.parse(JSON.stringify(corpus.baselineResources));
  for (const unit of [...corpus.units].sort((a, b) => a.id.localeCompare(b.id))) {
    if (unit.unitLifecycle !== 'active') continue;
    for (const [locale, value] of [
      ['en', unit.english],
      ['ru', unit.locales.ru.candidate],
      ['uz', unit.locales.uz.candidate],
    ]) {
      const namespace = (resources[locale][unit.namespace] ??= {});
      const forms = unit.pluralForms?.[locale];
      if (forms)
        for (const [suffix, plural] of Object.entries(forms))
          namespace[`${unit.key}_${suffix}`] = plural;
      else namespace[unit.key] = value;
    }
  }
  return resources;
}

export function serializeGeneratedResources(corpus) {
  return `// Generated by localization:sync. Do not edit.\nimport type { Resource } from 'i18next';\n\nexport const GENERATED_LOCALE_RESOURCES = ${JSON.stringify(generateResources(corpus), null, 2)} satisfies Resource & Readonly<Record<'en' | 'ru' | 'uz', Resource[string]>>;\n`;
}
export async function readCorpus(registryPath) {
  return JSON.parse(await readFile(registryPath, 'utf8'));
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory()
        ? sourceFiles(join(directory, entry.name))
        : ['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))
          ? [join(directory, entry.name)]
          : [],
    ),
  );
  return nested.flat();
}

export async function retiredConsumerViolations(corpus, sourceRoot = resolve('src')) {
  const retired = corpus.units.filter((unit) => unit.unitLifecycle === 'retired');
  if (retired.length === 0) return [];
  const files = await sourceFiles(sourceRoot);
  const contents = await Promise.all(
    files.map(async (file) => [file, await readFile(file, 'utf8')]),
  );
  const violations = [];
  for (const unit of retired) {
    const escapedNamespace = unit.namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedKey = unit.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sourceConsumer = new RegExp(
      `(?:^|[^A-Za-z0-9_$])${escapedNamespace}:${escapedKey}(?![A-Za-z0-9_$])|['"]${escapedKey}['"]`,
    );
    for (const [file, text] of contents)
      if (sourceConsumer.test(text))
        violations.push(`${unit.id}: retired unit has source consumer ${basename(file)}`);
  }
  return violations.sort();
}

async function atomicWrite(outputPath, output) {
  const temporary = join(dirname(outputPath), `.${basename(outputPath)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'w');
    await handle.writeFile(output, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, outputPath);
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

async function validatedCorpus({ registryPath, sourceRoot }) {
  const corpus = await readCorpus(registryPath);
  return {
    corpus,
    violations: [
      ...validateCorpus(corpus),
      ...(await retiredConsumerViolations(corpus, sourceRoot)),
    ].sort(),
  };
}

export async function syncCorpus({ registryPath, outputPath, sourceRoot }) {
  const { corpus, violations } = await validatedCorpus({ registryPath, sourceRoot });
  if (violations.length) throw new Error(violations.join('\n'));
  const output = serializeGeneratedResources(corpus);
  await atomicWrite(outputPath, output);
  return output;
}
export async function checkCorpus({ registryPath, outputPath, sourceRoot }) {
  const { corpus, violations } = await validatedCorpus({ registryPath, sourceRoot });
  if (violations.length) return violations;
  try {
    return (await readFile(outputPath, 'utf8')) === serializeGeneratedResources(corpus)
      ? []
      : ['generated resources are out of date'];
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [`generated resources cannot be read: ${reason}`];
  }
}
export const DEFAULT_REGISTRY_PATH = resolve('localization/corpus/registry.json');
export const DEFAULT_OUTPUT_PATH = resolve('src/shared/locale/generated-resources.ts');
