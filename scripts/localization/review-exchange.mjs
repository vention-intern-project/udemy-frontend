import { createHash, randomUUID } from 'node:crypto';
import {
  open as nodeOpen,
  readFile as nodeReadFile,
  rename as nodeRename,
  rm as nodeRm,
  stat as nodeStat,
  writeFile as nodeWriteFile,
} from 'node:fs/promises';
import { basename, dirname, join, normalize, resolve } from 'node:path';

import {
  SUPPLIED_REVIEW_ARTIFACT,
  SUPPLIED_REVIEW_PROTECTED_SOURCE_IDENTITY_SHA256,
  readCorpus,
  serializeGeneratedResources,
  transitionLocaleCandidate,
  validateCorpus,
  withdrawLocaleCandidateReview,
} from './corpus-engine.mjs';

export { readCorpus } from './corpus-engine.mjs';

export const REVIEW_CSV_HEADER = Object.freeze([
  'id',
  'locale',
  'taskId',
  'sourceRevision',
  'contexts',
  'placeholders',
  'plurals',
  'candidate',
  'status',
  'requestedAt',
  'verdict',
  'replacement',
  'reviewerId',
  'reviewerName',
  'reviewerAttestation',
  'reviewedAt',
]);

export const REVIEW_REPORT_STATES = Object.freeze([
  'approved-effective',
  'unchanged-approved',
  'stale-source',
  'unreviewed',
  'malformed',
  'rejected',
]);

const REVIEW_LOCALES = new Set(['ru', 'uz']);
const SUPPLIED_REVIEW_ARTIFACT_UNIT_IDS = Object.freeze(
  Array.from({ length: 346 }, (_, index) => `MLUX-C${String(index + 1).padStart(4, '0')}`),
);
const SUPPLIED_REVIEW_ARTIFACT_UNIT_ID_SET = new Set(SUPPLIED_REVIEW_ARTIFACT_UNIT_IDS);
const SUPPLIED_REVIEW_PROTECTED_PROVENANCE_IDENTITY_SHA256 =
  'EE4C751748D1A7CD96D3E05F4A98A37F871474B8ECC0638CB789A5BFEB244024';
const REVIEW_VERDICTS = new Set(['approve', 'request_changes', 'withdraw']);
const UTC_MILLISECOND_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const REPORTABLE_UNIT_ID = /^(?:MLUX-C\d{4}|MLUX-003-S\d{3})$/;
const SUPPLIED_HEADER =
  '|ID|Source|Context|English|Русский draft|Русский replacement|O‘zbek draft|O‘zbek replacement|Task|Type|';
const SUPPLIED_DIVIDER = '|-|-|-|-|-|-|-|-|-|-|';
const DEFAULT_FILE_SYSTEM = Object.freeze({
  open: nodeOpen,
  readFile: nodeReadFile,
  rename: nodeRename,
  rm: nodeRm,
  stat: nodeStat,
  writeFile: nodeWriteFile,
});

/** @typedef {Record<(typeof REVIEW_CSV_HEADER)[number], string>} ReviewExchangeRow */
/** @typedef {{header: readonly string[], rows: ReviewExchangeRow[]}} ReviewPack */
/** @typedef {{corpus: object, generatedOutput: string, report: ReviewImportReport}} ReviewPreflight */
/**
 * @typedef {object} ReviewImportReport
 * @property {readonly string[]} states
 * @property {Record<string, number>} counts
 * @property {object} currentTaskRequiredReview
 * @property {object} inheritedPendingDebt
 * @property {readonly string[]} globalViolations
 */

export class ReviewPackError extends Error {
  constructor(issues) {
    super(`review pack preflight failed:\n${[...issues].sort().join('\n')}`);
    this.name = 'ReviewPackError';
    this.issues = [...issues].sort();
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsvRecords(content) {
  const text = String(content).replace(/\r\n?/g, '\n');
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field.length > 0 || quoteClosed) throw new Error('CSV contains a malformed quote');
      quoted = true;
      continue;
    }
    if (character === ',') {
      record.push(field);
      field = '';
      quoteClosed = false;
      continue;
    }
    if (character === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      quoteClosed = false;
      continue;
    }
    if (quoteClosed) throw new Error('CSV contains characters after a closing quote');
    field += character;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  if (field.length > 0 || record.length > 0 || quoteClosed) {
    record.push(field);
    records.push(record);
  }
  return records;
}

function rowFromCells(cells) {
  return Object.fromEntries(REVIEW_CSV_HEADER.map((key, index) => [key, cells[index]]));
}

export function parseReviewCsv(content) {
  const records = parseCsvRecords(content);
  if (records.length === 0 || stableJson(records[0]) !== stableJson(REVIEW_CSV_HEADER))
    throw new Error('review CSV header is invalid');
  const rows = records.slice(1).map((cells, index) => {
    if (cells.length !== REVIEW_CSV_HEADER.length)
      throw new Error(`review CSV row ${index + 2} has invalid column count`);
    return rowFromCells(cells);
  });
  if (rows.length === 0) throw new Error('review CSV has no rows');
  return { header: [...REVIEW_CSV_HEADER], rows };
}

export function serializeReviewCsv(rows) {
  const body = rows.map((row) => REVIEW_CSV_HEADER.map((key) => csvCell(row[key])).join(','));
  return [REVIEW_CSV_HEADER.join(','), ...body].join('\n');
}

function reviewRows(corpus, locales, taskId, unitIds) {
  if (typeof taskId !== 'string' || taskId.trim() !== taskId || taskId.length === 0)
    throw new Error('taskId must be a non-empty trimmed value');
  const normalizedLocales = [...new Set(locales)].sort();
  if (
    normalizedLocales.length === 0 ||
    normalizedLocales.some((locale) => !REVIEW_LOCALES.has(locale))
  )
    throw new Error('review locales must contain only ru and uz');
  const selectedIds = unitIds === undefined ? null : new Set(unitIds);
  if (
    selectedIds &&
    (selectedIds.size === 0 || [...selectedIds].some((id) => typeof id !== 'string'))
  )
    throw new Error('unitIds must be a non-empty list of stable IDs');
  const rows = [...corpus.units]
    .filter((unit) => unit.unitLifecycle !== 'retired')
    .filter((unit) => selectedIds === null || selectedIds.has(unit.id))
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((unit) =>
      normalizedLocales.map((locale) => ({
        id: unit.id,
        locale,
        taskId,
        sourceRevision: unit.sourceRevision,
        contexts: stableJson(unit.occurrences),
        placeholders: stableJson([...(unit.placeholdersByLocale[locale] ?? [])].sort()),
        plurals: stableJson(unit.pluralForms?.[locale] ?? null),
        candidate: unit.locales[locale].candidate,
        status: unit.locales[locale].status,
        requestedAt: unit.locales[locale].requestedAt ?? '',
        verdict: '',
        replacement: '',
        reviewerId: '',
        reviewerName: '',
        reviewerAttestation: '',
        reviewedAt: '',
      })),
    );
  if (selectedIds && rows.length !== selectedIds.size * normalizedLocales.length)
    throw new Error('unitIds contains an unknown or retired unit');
  return rows;
}

export function createReviewCsv(corpus, { locales = ['ru', 'uz'], taskId, unitIds }) {
  return serializeReviewCsv(reviewRows(corpus, locales, taskId, unitIds));
}

function validUtcMillisecondInstant(value) {
  return (
    typeof value === 'string' &&
    UTC_MILLISECOND_INSTANT.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function suppliedArtifactDigest(value) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex')}`;
}

function suppliedArtifactSourceIdentity(corpus, field) {
  const units = new Map(corpus.units.map((unit) => [unit?.id, unit]));
  if (!SUPPLIED_REVIEW_ARTIFACT_UNIT_IDS.every((id) => units.has(id))) return null;
  return createHash('sha256')
    .update(
      JSON.stringify(SUPPLIED_REVIEW_ARTIFACT_UNIT_IDS.map((id) => [id, units.get(id)[field]])),
    )
    .digest('hex')
    .toUpperCase();
}

function assertHistoricalImporterBoundary(corpus, inspection, approvalRecordedAt, entries) {
  if (!validUtcMillisecondInstant(approvalRecordedAt))
    throw new Error('supplied review artifact approval time is invalid');
  if (inspection.artifactSha256 !== SUPPLIED_REVIEW_ARTIFACT.artifactSha256)
    throw new Error('supplied review artifact hash is not authorized');
  if (stableJson(inspection.artifactIds) !== stableJson(SUPPLIED_REVIEW_ARTIFACT_UNIT_IDS))
    throw new Error('supplied review artifact IDs are not the authorized ordered boundary');
  if (
    suppliedArtifactSourceIdentity(corpus, 'sourceRevision') !==
      SUPPLIED_REVIEW_PROTECTED_SOURCE_IDENTITY_SHA256 ||
    suppliedArtifactSourceIdentity(corpus, 'migrationProvenance') !==
      SUPPLIED_REVIEW_PROTECTED_PROVENANCE_IDENTITY_SHA256
  )
    throw new Error(
      'supplied review artifact protected source or provenance identity is not authorized',
    );
  const keys = new Set();
  for (const entry of entries) {
    if (
      !entry ||
      !SUPPLIED_REVIEW_ARTIFACT_UNIT_ID_SET.has(entry.id) ||
      !REVIEW_LOCALES.has(entry.locale) ||
      typeof entry.replacement !== 'string' ||
      entry.replacement.trim() !== entry.replacement
    )
      throw new Error('supplied review artifact import entries are invalid');
    const key = `${entry.id}/${entry.locale}`;
    if (keys.has(key)) throw new Error('supplied review artifact import entries are duplicated');
    keys.add(key);
  }
}

function approveHistoricalImporterEntries(corpus, inspection, approvalRecordedAt, entries) {
  assertHistoricalImporterBoundary(corpus, inspection, approvalRecordedAt, entries);
  const next = structuredClone(corpus);
  const units = new Map(next.units.map((unit) => [unit.id, unit]));
  for (const entry of entries) {
    const unit = units.get(entry.id);
    const candidate = unit?.locales?.[entry.locale];
    if (
      !candidate ||
      candidate.status !== 'draft' ||
      candidate.requestedAt !== null ||
      candidate.sourceRevision !== unit.sourceRevision ||
      candidate.history.length !== 0
    )
      throw new Error(
        `${entry.id}/${entry.locale}: supplied artifact authority requires a pristine historical draft`,
      );
    if (entry.replacement && !exactReplacementPlaceholders(entry.replacement, unit, entry.locale))
      throw new Error(
        `${entry.id}/${entry.locale}: supplied replacement placeholder contract drift`,
      );
    const nextCandidate = entry.replacement || candidate.candidate;
    const request = {
      type: 'transition',
      from: 'draft',
      to: 'review_requested',
      previousCandidate: candidate.candidate,
      nextCandidate: candidate.candidate,
      sourceRevision: candidate.sourceRevision,
      suppliedArtifactImport: {
        artifactSha256: SUPPLIED_REVIEW_ARTIFACT.artifactSha256,
        candidateSha256: suppliedArtifactDigest(candidate.candidate),
        protectedSourceIdentitySha256: SUPPLIED_REVIEW_PROTECTED_SOURCE_IDENTITY_SHA256,
        unitId: unit.id,
        unitProvenanceSha256: suppliedArtifactDigest(unit.migrationProvenance),
        unitSourceRevision: unit.sourceRevision,
      },
    };
    const suppliedArtifactApproval = {
      reviewerId: null,
      reviewedAt: null,
      approvalRecordedAt,
      approvalAuthority: { ...SUPPLIED_REVIEW_ARTIFACT },
    };
    unit.locales[entry.locale] = {
      ...candidate,
      candidate: nextCandidate,
      status: 'approved',
      reviewerId: null,
      verdict: 'approved',
      requestedAt: null,
      reviewedAt: null,
      approvalRecordedAt,
      approvalAuthority: { ...SUPPLIED_REVIEW_ARTIFACT },
      history: [
        request,
        {
          type: 'transition',
          from: 'review_requested',
          to: 'approved',
          previousCandidate: candidate.candidate,
          nextCandidate,
          sourceRevision: candidate.sourceRevision,
          suppliedArtifactApproval,
        },
      ],
    };
  }
  return next;
}

function placeholderNames(value, renderingContract) {
  const mode = renderingContract?.mode;
  const matcher =
    mode === 'i18next'
      ? /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g
      : mode === 'manual_template'
        ? /\{([A-Za-z][A-Za-z0-9_]*)\}/g
        : null;
  if (!matcher) return /[{}]/.test(value) ? null : [];
  const names = [];
  let cursor = 0;
  for (const match of value.matchAll(matcher)) {
    if (/[{}]/.test(value.slice(cursor, match.index))) return null;
    names.push(match[1]);
    cursor = match.index + match[0].length;
  }
  if (/[{}]/.test(value.slice(cursor))) return null;
  return names.sort();
}

function exactReplacementPlaceholders(replacement, unit, locale) {
  return (
    stableJson(placeholderNames(replacement, unit.renderingContract)) ===
    stableJson([...(unit.placeholdersByLocale[locale] ?? [])].sort())
  );
}

function humanReviewIssues(row, candidate, importedAt) {
  const issues = [];
  for (const field of ['reviewerId', 'reviewerName'])
    if (!row[field] || row[field].trim() !== row[field])
      issues.push(`${field} must be non-empty and trimmed`);
  if (row.reviewerAttestation !== 'native-review')
    issues.push('reviewerAttestation must be native-review');
  if (!validUtcMillisecondInstant(candidate.requestedAt))
    issues.push('candidate requestedAt must be a UTC RFC3339 millisecond instant');
  if (row.requestedAt !== candidate.requestedAt)
    issues.push('requestedAt does not match the current candidate');
  if (!validUtcMillisecondInstant(row.reviewedAt))
    issues.push('reviewedAt must be a UTC RFC3339 millisecond instant');
  if (
    validUtcMillisecondInstant(row.reviewedAt) &&
    validUtcMillisecondInstant(candidate.requestedAt)
  ) {
    if (Date.parse(row.reviewedAt) <= Date.parse(candidate.requestedAt))
      issues.push('reviewedAt must be after requestedAt');
    if (Date.parse(row.reviewedAt) > Date.parse(importedAt))
      issues.push('reviewedAt must not be after import');
  }
  return issues;
}

function protectedRowIssues(row, unit, candidate, taskId) {
  const expected = {
    taskId,
    sourceRevision: unit.sourceRevision,
    contexts: stableJson(unit.occurrences),
    placeholders: stableJson([...(unit.placeholdersByLocale[row.locale] ?? [])].sort()),
    plurals: stableJson(unit.pluralForms?.[row.locale] ?? null),
    candidate: candidate.candidate,
    status: candidate.status,
    requestedAt: candidate.requestedAt ?? '',
  };
  return Object.entries(expected)
    .filter(([field, value]) => row[field] !== value)
    .map(([field]) => `${field} drift`);
}

function collapseDuplicateRows(rows, issues) {
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.id}\u0000${row.locale}`;
    const prior = unique.get(key);
    if (!prior) unique.set(key, row);
    else if (stableJson(prior) !== stableJson(row))
      issues.push(`${row.id}/${row.locale}: conflicting duplicate cells`);
  }
  return [...unique.values()].sort(
    (left, right) => left.id.localeCompare(right.id) || left.locale.localeCompare(right.locale),
  );
}

function reportCountInput() {
  return {
    approvedEffective: 0,
    unchangedApproved: 0,
    staleSource: 0,
    unreviewed: 0,
    malformed: 0,
    rejected: 0,
  };
}

const REPORT_COUNT_KEY_BY_STATE = Object.freeze({
  'approved-effective': 'approvedEffective',
  'unchanged-approved': 'unchangedApproved',
  'stale-source': 'staleSource',
  unreviewed: 'unreviewed',
  malformed: 'malformed',
  rejected: 'rejected',
});

function classifyReviewUnitState(unit, isMalformed = false) {
  const candidates = ['ru', 'uz'].map((locale) => unit.locales?.[locale]);
  if (isMalformed || candidates.some((candidate) => !candidate)) return 'malformed';
  if (candidates.some((candidate) => candidate.status === 'stale')) return 'stale-source';
  if (candidates.some((candidate) => candidate.status === 'changes_requested')) return 'rejected';
  if (candidates.every((candidate) => candidate.status === 'approved')) {
    const hasEffectiveApproval = candidates.some((candidate) => {
      const approval = [...candidate.history]
        .reverse()
        .find((event) => event?.type === 'transition' && event.to === 'approved');
      return approval?.previousCandidate !== approval?.nextCandidate;
    });
    return hasEffectiveApproval ? 'approved-effective' : 'unchanged-approved';
  }
  return 'unreviewed';
}

function classifyCorpusReviewUnits(corpus) {
  const units = Array.isArray(corpus?.units) ? corpus.units : [];
  const validationCorpus = Array.isArray(corpus?.units) ? corpus : { ...corpus, units };
  const violations = validateCorpus(validationCorpus);
  const activeUnits = units.filter(
    (unit) =>
      unit &&
      typeof unit === 'object' &&
      unit.unitLifecycle === 'active' &&
      typeof unit.id === 'string' &&
      REPORTABLE_UNIT_ID.test(unit.id),
  );
  const unitsByReportableId = new Map();
  for (const unit of units) {
    if (
      !unit ||
      typeof unit !== 'object' ||
      typeof unit.id !== 'string' ||
      !REPORTABLE_UNIT_ID.test(unit.id)
    )
      continue;
    const owners = unitsByReportableId.get(unit.id) ?? [];
    owners.push(unit);
    unitsByReportableId.set(unit.id, owners);
  }
  const unambiguouslyOwnedActiveIds = new Set(
    activeUnits
      .filter((unit) => {
        const owners = unitsByReportableId.get(unit.id);
        return owners?.length === 1 && owners[0] === unit;
      })
      .map((unit) => unit.id),
  );
  const malformedUnitIds = new Set();
  const globalViolations = [];
  for (const violation of violations) {
    const unitId = violation.match(/^(MLUX-C\d{4}|MLUX-003-S\d{3}):/)?.[1];
    if (unitId && unambiguouslyOwnedActiveIds.has(unitId)) malformedUnitIds.add(unitId);
    else globalViolations.push(violation);
  }
  return {
    units: activeUnits.map((unit) => ({
      id: unit.id,
      state: classifyReviewUnitState(unit, malformedUnitIds.has(unit.id)),
    })),
    globalViolations,
  };
}

function incrementReviewUnitState(counts, state) {
  counts[REPORT_COUNT_KEY_BY_STATE[state]] += 1;
}

function reportCanonicalReviewUnits(canonical) {
  const counts = reportCountInput();
  for (const unit of canonical.units) incrementReviewUnitState(counts, unit.state);
  return reportReviewStatus(
    counts,
    {
      currentStale: counts.staleSource,
      currentMalformed: counts.malformed,
      currentRejected: counts.rejected,
      inheritedUnreviewed: counts.unreviewed,
    },
    { globalViolations: canonical.globalViolations },
  );
}

function countFromInput(counts, state) {
  const camel = state.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return Number(counts[state] ?? counts[camel] ?? 0);
}

export function reportReviewStatus(counts, debt = {}, diagnostics = {}) {
  const normalized = Object.fromEntries(
    REVIEW_REPORT_STATES.map((state) => [state, countFromInput(counts, state)]),
  );
  const currentByState = {
    'stale-source': Number(debt.currentStale ?? normalized['stale-source']),
    malformed: Number(debt.currentMalformed ?? normalized.malformed),
    rejected: Number(debt.currentRejected ?? normalized.rejected),
  };
  const inheritedByState = {
    unreviewed: Number(debt.inheritedUnreviewed ?? normalized.unreviewed),
  };
  return {
    states: [...REVIEW_REPORT_STATES],
    counts: normalized,
    currentTaskRequiredReview: {
      total: Object.values(currentByState).reduce((sum, value) => sum + value, 0),
      byState: currentByState,
    },
    inheritedPendingDebt: {
      total: Object.values(inheritedByState).reduce((sum, value) => sum + value, 0),
      byState: inheritedByState,
    },
    globalViolations: [...(diagnostics.globalViolations ?? [])].sort(),
  };
}

export function preflightReviewPack({ content, corpus, importedAt, taskId }) {
  const issues = [];
  const importedAtIsValid = validUtcMillisecondInstant(importedAt);
  if (!importedAtIsValid)
    issues.push('approvalRecordedAt/importedAt must be a UTC RFC3339 millisecond instant');
  if (typeof taskId !== 'string' || taskId.trim() !== taskId || taskId.length === 0)
    issues.push('taskId must be non-empty and trimmed');
  const parsed = parseReviewCsv(content);
  const rows = collapseDuplicateRows(parsed.rows, issues);
  const next = structuredClone(corpus);
  const units = new Map(next.units.map((unit) => [unit.id, unit]));
  const affectedUnitIds = new Set();

  for (const row of rows) {
    const prefix = `${row.id || '<missing-id>'}/${row.locale || '<missing-locale>'}`;
    const rowIssues = [];
    if (!REVIEW_LOCALES.has(row.locale)) rowIssues.push('locale must be ru or uz');
    const unit = units.get(row.id);
    if (!unit) rowIssues.push('unknown unit ID');
    else if (unit.unitLifecycle === 'retired') rowIssues.push('retired unit ID');
    if (!unit || !REVIEW_LOCALES.has(row.locale)) {
      issues.push(...rowIssues.map((issue) => `${prefix}: ${issue}`));
      continue;
    }
    const candidate = unit.locales[row.locale];
    rowIssues.push(...protectedRowIssues(row, unit, candidate, taskId));
    const decisionFields = [
      'replacement',
      'reviewerId',
      'reviewerName',
      'reviewerAttestation',
      'reviewedAt',
    ];
    if (row.verdict === '') {
      if (decisionFields.some((field) => row[field] !== ''))
        rowIssues.push('blank verdict cannot include review decision fields');
      if (rowIssues.length > 0) issues.push(...rowIssues.map((issue) => `${prefix}: ${issue}`));
      continue;
    }
    if (!REVIEW_VERDICTS.has(row.verdict)) rowIssues.push('verdict is invalid');
    if (candidate.status !== 'review_requested')
      rowIssues.push('status must be review_requested for a review verdict');

    const replacement = row.replacement.trim();
    if (row.verdict === 'request_changes' && replacement.length === 0)
      rowIssues.push('request_changes replacement must be non-empty after trimming');
    if (row.verdict === 'withdraw' && replacement.length > 0)
      rowIssues.push('withdraw replacement must be empty');
    if (
      ['approve', 'request_changes'].includes(row.verdict) &&
      replacement.length > 0 &&
      !exactReplacementPlaceholders(replacement, unit, row.locale)
    )
      rowIssues.push('replacement placeholder contract drift');
    if (['approve', 'request_changes'].includes(row.verdict))
      rowIssues.push(...humanReviewIssues(row, candidate, importedAt));
    if (row.verdict === 'withdraw') {
      for (const field of ['reviewerId', 'reviewerName', 'reviewerAttestation', 'reviewedAt'])
        if (row[field] !== '') rowIssues.push(`withdraw ${field} must be empty`);
    }

    if (rowIssues.length > 0) {
      issues.push(...rowIssues.map((issue) => `${prefix}: ${issue}`));
      continue;
    }
    if (!importedAtIsValid) continue;

    if (row.verdict === 'approve') {
      unit.locales[row.locale] = transitionLocaleCandidate(candidate, 'approved', {
        ...(replacement ? { newCandidate: replacement } : {}),
        humanApproval: {
          reviewerId: row.reviewerId,
          reviewerName: row.reviewerName,
          reviewedAt: row.reviewedAt,
          approvalRecordedAt: importedAt,
          approvalAuthority: {
            kind: 'human_native_review',
            reviewerId: row.reviewerId,
            reviewerName: row.reviewerName,
          },
        },
      });
    } else if (row.verdict === 'request_changes') {
      unit.locales[row.locale] = transitionLocaleCandidate(candidate, 'changes_requested', {
        changeRequest: {
          replacement,
          reviewerId: row.reviewerId,
          reviewerName: row.reviewerName,
          reviewerAttestation: row.reviewerAttestation,
          requestedAt: row.requestedAt,
          reviewedAt: row.reviewedAt,
          changeRequestedAt: importedAt,
        },
      });
    } else if (row.verdict === 'withdraw') {
      unit.locales[row.locale] = withdrawLocaleCandidateReview(candidate);
    }
    affectedUnitIds.add(unit.id);
  }

  if (issues.length > 0) throw new ReviewPackError(issues);
  const violations = validateCorpus(next);
  if (violations.length > 0)
    throw new ReviewPackError(violations.map((violation) => `corpus validation: ${violation}`));
  const generatedOutput = serializeGeneratedResources(next);
  const counts = reportCountInput();
  for (const unitId of [...affectedUnitIds].sort())
    incrementReviewUnitState(counts, classifyReviewUnitState(units.get(unitId)));
  return {
    corpus: next,
    generatedOutput,
    report: reportReviewStatus(counts, {
      currentRejected: counts.rejected,
      inheritedUnreviewed: 0,
    }),
  };
}

function splitMarkdownRow(line) {
  if (!line.startsWith('|') || !line.endsWith('|'))
    throw new Error('supplied review artifact row is malformed');
  return line
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'));
}

export function parseSuppliedReviewArtifact(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line) => line === SUPPLIED_HEADER);
  if (headerIndex < 0 || lines[headerIndex + 1] !== SUPPLIED_DIVIDER)
    throw new Error('supplied review artifact header is invalid');
  const rows = lines
    .slice(headerIndex + 2)
    .filter((line) => line.startsWith('|MLUX-'))
    .map((line, index) => {
      const cells = splitMarkdownRow(line);
      if (cells.length !== 10)
        throw new Error(`supplied review artifact row ${index + 1} has invalid column count`);
      return {
        id: cells[0],
        source: cells[1],
        context: cells[2],
        english: cells[3],
        ruDraft: cells[4],
        ruReplacement: cells[5],
        uzDraft: cells[6],
        uzReplacement: cells[7],
        task: cells[8],
        type: cells[9],
      };
    });
  return { rows };
}

function normalizeDisplayPlaceholder(value, unit, locale) {
  if (typeof value !== 'string' || !unit || typeof unit !== 'object') return null;
  const localePlaceholders = unit.placeholdersByLocale?.[locale];
  if (!Array.isArray(localePlaceholders)) return null;
  const allowed = new Set(localePlaceholders);
  return value.replace(/(?<!\{)\{([A-Za-z][A-Za-z0-9_]*)\}(?!\})/g, (token, name) =>
    allowed.has(name) ? `{{${name}}}` : token,
  );
}

function suppliedRowMatchesUnit(row, unit) {
  if (
    !row ||
    typeof row !== 'object' ||
    typeof row.source !== 'string' ||
    typeof row.context !== 'string' ||
    typeof row.english !== 'string' ||
    typeof row.ruDraft !== 'string' ||
    typeof row.uzDraft !== 'string' ||
    !unit ||
    typeof unit !== 'object' ||
    !Array.isArray(unit.occurrences) ||
    typeof unit.english !== 'string' ||
    !unit.locales ||
    typeof unit.locales !== 'object' ||
    typeof unit.locales.ru?.candidate !== 'string' ||
    typeof unit.locales.uz?.candidate !== 'string'
  )
    return false;
  const sourceMatches = row.source.startsWith('See Occurrences (')
    ? Number(row.source.match(/\((\d+) verified sources\)/)?.[1]) === unit.occurrences.length
    : unit.occurrences.some(
        (occurrence) =>
          occurrence &&
          typeof occurrence === 'object' &&
          occurrence.context === `${row.source} — ${row.context}`,
      );
  return (
    sourceMatches &&
    normalizeDisplayPlaceholder(row.english, unit, 'en') === unit.english &&
    normalizeDisplayPlaceholder(row.ruDraft, unit, 'ru') === unit.locales.ru.candidate &&
    normalizeDisplayPlaceholder(row.uzDraft, unit, 'uz') === unit.locales.uz.candidate
  );
}

export function inspectSuppliedReviewArtifact({ bytes, corpus }) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const artifactSha256 = createHash('sha256').update(buffer).digest('hex').toUpperCase();
  if (artifactSha256 !== SUPPLIED_REVIEW_ARTIFACT.artifactSha256)
    throw new Error('supplied review artifact hash is not authorized');
  const parsed = parseSuppliedReviewArtifact(buffer.toString('utf8'));
  const expectedIds = Array.from(
    { length: 346 },
    (_, index) => `MLUX-C${String(index + 1).padStart(4, '0')}`,
  );
  const artifactIds = parsed.rows.map((row) => row.id);
  if (stableJson(artifactIds) !== stableJson(expectedIds))
    throw new Error(
      'supplied review artifact must contain exact sequential IDs MLUX-C0001--MLUX-C0346',
    );
  const canonical = classifyCorpusReviewUnits(corpus);
  const replacements = (row, locale) => row[`${locale}Replacement`].trim().length > 0;
  if (!Array.isArray(corpus?.units)) {
    const replacementRows = parsed.rows.filter(
      (row) => replacements(row, 'ru') || replacements(row, 'uz'),
    );
    return {
      artifactSha256,
      protectedSourceIdentitySha256: null,
      protectedSourceIdentityMatches: false,
      rows: parsed.rows,
      exactRows: [],
      staleRows: [],
      absentUnits: [],
      artifactIds,
      exactIds: [],
      staleIds: [],
      absentIds: [],
      eligibleBothLocaleIds: [],
      summary: {
        artifactRows: parsed.rows.length,
        exactRows: 0,
        staleRows: 0,
        absentUnits: 0,
        ruReplacements: parsed.rows.filter((row) => replacements(row, 'ru')).length,
        uzReplacements: parsed.rows.filter((row) => replacements(row, 'uz')).length,
        replacementRows: replacementRows.length,
        eligibleRuReplacements: 0,
        eligibleUzReplacements: 0,
        eligibleReplacementRows: 0,
      },
      report: reportCanonicalReviewUnits(canonical),
    };
  }
  const units = new Map(
    corpus.units
      .filter((unit) => unit && typeof unit === 'object' && typeof unit.id === 'string')
      .map((unit) => [unit.id, unit]),
  );
  for (const id of artifactIds) {
    const unit = units.get(id);
    if (!unit) throw new Error(`supplied review artifact contains unknown unit ID: ${id}`);
    if (unit.unitLifecycle === 'retired')
      throw new Error(`supplied review artifact contains retired unit ID: ${id}`);
  }
  const protectedSourceIdentitySha256 = createHash('sha256')
    .update(JSON.stringify(artifactIds.map((id) => [id, units.get(id).sourceRevision])))
    .digest('hex')
    .toUpperCase();
  const protectedSourceIdentityMatches =
    protectedSourceIdentitySha256 === SUPPLIED_REVIEW_PROTECTED_SOURCE_IDENTITY_SHA256;
  const canonicalStateById = new Map(canonical.units.map((unit) => [unit.id, unit.state]));
  const exactRows = [];
  const staleRows = [];
  for (const row of parsed.rows) {
    const unit = units.get(row.id);
    const canonicalState = canonicalStateById.get(row.id);
    (protectedSourceIdentityMatches &&
    !['malformed', 'rejected'].includes(canonicalState) &&
    suppliedRowMatchesUnit(row, unit)
      ? exactRows
      : staleRows
    ).push(row);
  }
  const artifactIdSet = new Set(artifactIds);
  const absentUnits = canonical.units
    .filter((unit) => !artifactIdSet.has(unit.id))
    .map((unit) => units.get(unit.id));
  const replacementRows = parsed.rows.filter(
    (row) => replacements(row, 'ru') || replacements(row, 'uz'),
  );
  const eligibleReplacementRows = exactRows.filter(
    (row) => replacements(row, 'ru') || replacements(row, 'uz'),
  );
  const summary = {
    artifactRows: parsed.rows.length,
    exactRows: exactRows.length,
    staleRows: staleRows.length,
    absentUnits: absentUnits.length,
    ruReplacements: parsed.rows.filter((row) => replacements(row, 'ru')).length,
    uzReplacements: parsed.rows.filter((row) => replacements(row, 'uz')).length,
    replacementRows: replacementRows.length,
    eligibleRuReplacements: exactRows.filter((row) => replacements(row, 'ru')).length,
    eligibleUzReplacements: exactRows.filter((row) => replacements(row, 'uz')).length,
    eligibleReplacementRows: eligibleReplacementRows.length,
  };
  const counts = reportCountInput();
  const artifactStateById = new Map([
    ...exactRows.map((row) => [
      row.id,
      replacements(row, 'ru') || replacements(row, 'uz')
        ? 'approved-effective'
        : 'unchanged-approved',
    ]),
    ...staleRows.map((row) => [row.id, 'stale-source']),
    ...absentUnits.map((unit) => [unit.id, 'unreviewed']),
  ]);
  for (const unit of canonical.units) {
    const artifactState = artifactStateById.get(unit.id);
    const mergedState = ['malformed', 'rejected'].includes(unit.state)
      ? unit.state
      : (artifactState ?? unit.state);
    incrementReviewUnitState(counts, mergedState);
  }
  return {
    artifactSha256,
    protectedSourceIdentitySha256,
    protectedSourceIdentityMatches,
    rows: parsed.rows,
    exactRows,
    staleRows,
    absentUnits,
    artifactIds,
    exactIds: exactRows.map((row) => row.id),
    staleIds: staleRows.map((row) => row.id),
    absentIds: absentUnits.map((unit) => unit.id),
    eligibleBothLocaleIds: exactRows
      .filter((row) => replacements(row, 'ru') && replacements(row, 'uz'))
      .map((row) => row.id),
    summary,
    report: reportReviewStatus(
      counts,
      {
        currentStale: counts.staleSource,
        currentMalformed: counts.malformed,
        currentRejected: counts.rejected,
        inheritedUnreviewed: counts.unreviewed,
      },
      { globalViolations: canonical.globalViolations },
    ),
  };
}

async function stageFile(path, content, fileSystem) {
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fileSystem.open(temporary, 'w');
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    return temporary;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await fileSystem.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

function normalizedTargetPath(path) {
  const normalized = normalize(resolve(path));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

async function existingTargetIdentity(path, fileSystem) {
  try {
    const stats = await fileSystem.stat(path, { bigint: true });
    return `${stats.dev}:${stats.ino}`;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function assertDistinctFileTargets({ registryPath, outputPath, fileSystem = {} }) {
  const targetFileSystem = { ...DEFAULT_FILE_SYSTEM, ...fileSystem };
  if (normalizedTargetPath(registryPath) === normalizedTargetPath(outputPath))
    throw new Error('registry and output must be distinct file targets');
  const [registryIdentity, outputIdentity] = await Promise.all([
    existingTargetIdentity(registryPath, targetFileSystem),
    existingTargetIdentity(outputPath, targetFileSystem),
  ]);
  if (registryIdentity !== null && registryIdentity === outputIdentity)
    throw new Error('registry and output must be distinct file targets');
}

export async function exportReviewPack({
  registryPath,
  outputPath,
  taskId,
  locales = ['ru', 'uz'],
  unitIds,
  fileSystem,
}) {
  const targetFileSystem = { ...DEFAULT_FILE_SYSTEM, ...fileSystem };
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem: targetFileSystem });
  const content = createReviewCsv(await readCorpus(registryPath), { locales, taskId, unitIds });
  await targetFileSystem.writeFile(outputPath, content, 'utf8');
  return content;
}

export async function commitReviewTransaction({
  registryPath,
  outputPath,
  registryContent,
  generatedContent,
  fileSystem: fileSystemOverrides = {},
}) {
  const fileSystem = { ...DEFAULT_FILE_SYSTEM, ...fileSystemOverrides };
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const previousRegistry = await fileSystem.readFile(registryPath);
  await fileSystem.readFile(outputPath);
  let registryTemporary;
  let outputTemporary;
  let rollbackTemporary;
  let registryCommitted = false;
  try {
    registryTemporary = await stageFile(registryPath, registryContent, fileSystem);
    outputTemporary = await stageFile(outputPath, generatedContent, fileSystem);
    await fileSystem.rename(registryTemporary, registryPath);
    registryCommitted = true;
    registryTemporary = undefined;
    await fileSystem.rename(outputTemporary, outputPath);
    outputTemporary = undefined;
  } catch (error) {
    if (registryCommitted) {
      try {
        rollbackTemporary = await stageFile(registryPath, previousRegistry, fileSystem);
        await fileSystem.rename(rollbackTemporary, registryPath);
        rollbackTemporary = undefined;
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'review transaction failed and registry rollback was not completed',
        );
      }
    }
    throw error;
  } finally {
    await Promise.all(
      [registryTemporary, outputTemporary, rollbackTemporary]
        .filter(Boolean)
        .map((path) => fileSystem.rm(path, { force: true }).catch(() => undefined)),
    );
  }
}

export async function importReviewPack({
  packPath,
  content,
  registryPath,
  outputPath,
  importedAt,
  taskId,
  fileSystem,
}) {
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const source = content ?? (await nodeReadFile(packPath, 'utf8'));
  const corpus = await readCorpus(registryPath);
  const preflight = preflightReviewPack({ content: source, corpus, importedAt, taskId });
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent: `${JSON.stringify(preflight.corpus, null, 2)}\n`,
    generatedContent: preflight.generatedOutput,
    fileSystem,
  });
  return preflight.report;
}

export async function importSuppliedReviewArtifact({
  artifactPath,
  registryPath,
  outputPath,
  approvalRecordedAt,
  fileSystem,
}) {
  await assertDistinctFileTargets({ registryPath, outputPath, fileSystem });
  const bytes = await nodeReadFile(artifactPath);
  if (!validUtcMillisecondInstant(approvalRecordedAt))
    throw new Error('approvalRecordedAt must be a UTC RFC3339 millisecond instant');
  const corpus = await readCorpus(registryPath);
  if (!Array.isArray(corpus?.units))
    throw new Error('supplied review artifact corpus units must be an array');
  const inspection = inspectSuppliedReviewArtifact({ bytes, corpus });
  if (!inspection.protectedSourceIdentityMatches) return inspection.report;
  const units = new Map(corpus.units.map((unit) => [unit.id, unit]));
  const entries = [];
  for (const row of inspection.exactRows) {
    const unit = units.get(row.id);
    for (const locale of ['ru', 'uz']) {
      const candidate = unit.locales[locale];
      if (candidate.status !== 'draft')
        throw new Error(
          `${row.id}/${locale}: supplied artifact authority requires a current draft`,
        );
      const replacement = row[`${locale}Replacement`].trim();
      if (replacement && !exactReplacementPlaceholders(replacement, unit, locale))
        throw new Error(`${row.id}/${locale}: supplied replacement placeholder contract drift`);
      entries.push({ id: row.id, locale, replacement });
    }
  }
  const next = approveHistoricalImporterEntries(corpus, inspection, approvalRecordedAt, entries);
  const violations = validateCorpus(next);
  if (violations.length > 0)
    throw new ReviewPackError(violations.map((violation) => `corpus validation: ${violation}`));
  const generatedOutput = serializeGeneratedResources(next);
  await commitReviewTransaction({
    registryPath,
    outputPath,
    registryContent: `${JSON.stringify(next, null, 2)}\n`,
    generatedContent: generatedOutput,
    fileSystem,
  });
  return inspection.report;
}

export function createCorpusReviewReport(corpus) {
  return reportCanonicalReviewUnits(classifyCorpusReviewUnits(corpus));
}
