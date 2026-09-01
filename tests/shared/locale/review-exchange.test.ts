import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { link, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import draft37Registry from '../../../localization/corpus/registry.json';
const {
  createCorpusReviewReport,
  createReviewCsv,
  commitReviewTransaction,
  exportReviewPack,
  importReviewPack,
  importSuppliedReviewArtifact,
  inspectSuppliedReviewArtifact,
  parseReviewCsv,
  parseSuppliedReviewArtifact,
  preflightReviewPack,
  reportReviewStatus,
  serializeReviewCsv,
  // @ts-expect-error The dependency-free Node exchange module has no TypeScript declaration.
} = await import('../../../scripts/localization/review-exchange.mjs');
const {
  RECORDED_BASE_REQUEST,
  reverseUnifiedPatch,
  writeRecordedBaseArtifacts,
  // @ts-expect-error The dependency-free Node localization fixture has no TypeScript declaration.
} = await import('./fixtures/crf001-recorded-base-fixture.mjs');
// @ts-expect-error The dependency-free Node engine has no TypeScript declaration.
const corpusEngineModule = await import('../../../scripts/localization/corpus-engine.mjs');
const {
  reviseProtectedSource,
  requestLocaleCandidateReview,
  serializeGeneratedResources,
  transitionLocaleCandidate,
  withdrawLocaleCandidateReview,
} = corpusEngineModule;

const REQUESTED_AT = '2026-08-25T00:00:00.000Z';
const REVIEWED_AT = '2026-08-25T00:01:00.000Z';
const IMPORTED_AT = '2026-08-25T00:02:00.000Z';
const TASK_ID = 'FE-067';
// Current-corpus assertions use the accepted current registry size. DRAFT-37 and
// legacy-artifact assertions remain pinned to their recorded historical counts below.
const HISTORICAL_CORPUS_UNIT_COUNT = 545;
const CURRENT_CORPUS_UNIT_COUNT = 585;
const CURRENT_UNREVIEWED_UNIT_COUNT = 571;
const CURRENT_REVIEW_STATUS_COUNTS = {
  'approved-effective': 12,
  'unchanged-approved': 2,
  'stale-source': 0,
  unreviewed: CURRENT_UNREVIEWED_UNIT_COUNT,
  malformed: 0,
  rejected: 0,
} as const;
const SUPPLIED_LEGACY_ARTIFACT_ROW_COUNT = 346;
const CURRENT_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT =
  CURRENT_CORPUS_UNIT_COUNT - SUPPLIED_LEGACY_ARTIFACT_ROW_COUNT;
const HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT =
  HISTORICAL_CORPUS_UNIT_COUNT - SUPPLIED_LEGACY_ARTIFACT_ROW_COUNT;
const ARTIFACT_FIXTURE = join(
  process.cwd(),
  'tests/shared/locale/fixtures/review-exchange/learnhub-multilingual-review-readable.md',
);
const temporaryDirectories: string[] = [];
const TEMPORARY_DIRECTORY_CLEANUP_TIMEOUT_MS = 30_000;
const execFileAsync = promisify(execFile);
type ReviewLocale = 'ru' | 'uz';
type ReviewVerdict = 'approve' | 'request_changes' | 'withdraw';
type MutableReviewCandidate = Record<string, unknown>;
type MutableReviewCandidates = Record<ReviewLocale, MutableReviewCandidate>;
type ReviewDecision = {
  verdict: ReviewVerdict;
  replacement?: string;
};
type ReviewDecisionByLocale = Record<ReviewLocale, ReviewDecision>;
type ReviewUnit = (typeof draft37Registry.units)[number];
type MalformedUnitMutation = (unit: ReviewUnit) => void;
type MalformedCorpusMutation = (corpus: typeof draft37Registry) => void;
type MutableReviewHistoryEvent = Record<string, unknown> & { sourceRevision: string };
interface MutableChangeRequestHistoryEvent {
  readonly type?: unknown;
  readonly from?: unknown;
  readonly to?: unknown;
  readonly changeRequest?: { replacement: string };
}
type ReviewReport = {
  counts: Record<string, number>;
  currentTaskRequiredReview: { total: number };
  inheritedPendingDebt: { total: number };
  globalViolations: string[];
};

interface CandidateEvidenceAdversary {
  readonly name: string;
  readonly forgedKey: string;
  readonly forgedValue: unknown;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
}, TEMPORARY_DIRECTORY_CLEANUP_TIMEOUT_MS);

function requestCandidateReview(
  candidate: Record<string, unknown>,
  unitId: string,
  locales: readonly ReviewLocale[],
) {
  return requestLocaleCandidateReview(candidate, {
    taskId: TASK_ID,
    locales: [...locales].sort(),
    unitIds: [unitId],
    requestedAt: REQUESTED_AT,
  });
}

function corpusInReviewFor(locales: readonly ReviewLocale[]) {
  const corpus = structuredClone(draft37Registry);
  const unit = corpus.units.find(
    (candidate) =>
      candidate.unitLifecycle === 'active' &&
      locales.every((locale) => candidate.locales[locale].status === 'draft'),
  );
  if (!unit) throw new Error('fixture unit is missing');
  for (const locale of locales)
    unit.locales[locale] = requestCandidateReview(unit.locales[locale], unit.id, locales);
  return corpus;
}

function corpusInReview(locale: ReviewLocale = 'ru') {
  return corpusInReviewFor([locale]);
}

function requestChanges(candidate: Record<string, unknown>) {
  return transitionLocaleCandidate(candidate, 'changes_requested', {
    changeRequest: {
      replacement: String(candidate.candidate),
      reviewerId: 'native-7',
      reviewerName: 'Native Reviewer',
      reviewerAttestation: 'native-review',
      requestedAt: REQUESTED_AT,
      reviewedAt: REVIEWED_AT,
      changeRequestedAt: IMPORTED_AT,
    },
  });
}

function retainedChangeRequest(candidate: Record<string, unknown>) {
  const history = candidate.history as MutableChangeRequestHistoryEvent[];
  const event = history.find(
    (entry) =>
      entry.type === 'transition' &&
      entry.from === 'review_requested' &&
      entry.to === 'changes_requested',
  );
  if (!event?.changeRequest) throw new Error('fixture retained change request is missing');
  return event.changeRequest;
}

function corpusWithTamperedRetainedChangeRequest() {
  const corpus = corpusInReview();
  const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
  if (!unit) throw new Error('fixture unit is missing');
  const changed = requestChanges(unit.locales.ru);
  const corrected = transitionLocaleCandidate(changed, 'draft', {
    newCandidate: 'Исправленная локализация {{identity}}',
  });
  unit.locales.ru = requestCandidateReview(corrected, unit.id, ['ru']);
  retainedChangeRequest(unit.locales.ru).replacement = 'Исправление без placeholder';
  return corpus;
}

function corpusWithForgedRetainedHistory() {
  const corpus = corpusInReview();
  const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
  if (!unit) throw new Error('fixture unit is missing');
  const changed = requestChanges(unit.locales.ru);
  const corrected = transitionLocaleCandidate(changed, 'draft', {
    newCandidate: 'Исправленная локализация {{identity}}',
  });
  unit.locales.ru = requestCandidateReview(corrected, unit.id, ['ru']);
  const history = unit.locales.ru.history as MutableReviewHistoryEvent[];
  const forgedEvent = history.find(
    (event) =>
      event.type === 'transition' &&
      event.from === 'review_requested' &&
      event.to === 'changes_requested',
  );
  if (!forgedEvent) throw new Error('fixture retained change-request event is missing');
  forgedEvent.humanApproval = {
    reviewerId: 'forged-reviewer',
    reviewerName: 'Forged Reviewer',
    reviewedAt: REVIEWED_AT,
    approvalRecordedAt: IMPORTED_AT,
    approvalAuthority: {
      kind: 'human_native_review',
      reviewerId: 'forged-reviewer',
      reviewerName: 'Forged Reviewer',
    },
  };
  return corpus;
}

function corpusWithStaleToDraftRevision(revision: unknown) {
  const corpus = corpusInReview();
  const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
  if (!unit) throw new Error('fixture unit is missing');
  const revised = reviseProtectedSource(unit, {
    occurrences: [{ ...unit.occurrences[0], context: 'protected revision before re-request' }],
  });
  const reactivated = transitionLocaleCandidate(revised.locales.ru, 'draft', {
    newCandidate: 'Исправленная локализация {{identity}}',
  });
  revised.locales.ru = requestCandidateReview(reactivated, revised.id, ['ru']);
  const staleToDraft = (revised.locales.ru.history as MutableReviewHistoryEvent[]).find(
    (event) => event.from === 'stale' && event.to === 'draft',
  );
  if (!staleToDraft) throw new Error('fixture stale-to-draft event is missing');
  Reflect.set(staleToDraft, 'sourceRevision', revision);
  const unitIndex = corpus.units.findIndex(({ id }) => id === unit.id);
  corpus.units[unitIndex] = revised;
  return corpus;
}

function corpusWithFabricatedApprovalMetadata() {
  const corpus = corpusInReview();
  const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
  if (!unit) throw new Error('fixture unit is missing');
  const locales = unit.locales as unknown as MutableReviewCandidates;
  locales.ru = {
    ...locales.ru,
    reviewerId: 'fabricated-reviewer',
    reviewerName: 'Fabricated Reviewer',
    verdict: 'approved',
    reviewedAt: REVIEWED_AT,
    approvalRecordedAt: IMPORTED_AT,
    approvalAuthority: {
      kind: 'human_native_review',
      reviewerId: 'fabricated-reviewer',
      reviewerName: 'Fabricated Reviewer',
    },
  };
  return corpus;
}

const candidateEvidenceAdversaries: readonly CandidateEvidenceAdversary[] = [
  {
    name: 'human approval history evidence',
    forgedKey: 'humanApproval',
    forgedValue: {
      reviewerId: 'forged-reviewer',
      reviewerName: 'Forged Reviewer',
      reviewedAt: REVIEWED_AT,
      approvalRecordedAt: IMPORTED_AT,
      approvalAuthority: {
        kind: 'human_native_review',
        reviewerId: 'forged-reviewer',
        reviewerName: 'Forged Reviewer',
      },
    },
  },
  {
    name: 'supplied-artifact approval history evidence',
    forgedKey: 'suppliedArtifactApproval',
    forgedValue: {
      reviewerId: null,
      reviewedAt: null,
      approvalRecordedAt: IMPORTED_AT,
      approvalAuthority: {
        kind: 'user-authorized supplied review artifact',
        artifactName: 'learnhub-multilingual-review-readable.md',
        artifactSha256: 'ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C',
      },
    },
  },
  {
    name: 'change-request history evidence',
    forgedKey: 'changeRequest',
    forgedValue: {
      replacement: 'Исправьте {{identity}}',
      reviewerId: 'native-7',
      reviewerName: 'Native Reviewer',
      reviewerAttestation: 'native-review',
      requestedAt: REQUESTED_AT,
      reviewedAt: REVIEWED_AT,
      changeRequestedAt: IMPORTED_AT,
    },
  },
  { name: 'withdrawal history evidence', forgedKey: 'withdrawal', forgedValue: true },
  {
    name: 'reviewer alias object',
    forgedKey: 'reviewer',
    forgedValue: { id: 'native-7', name: 'Native Reviewer' },
  },
  {
    name: 'review-authority alias object',
    forgedKey: 'reviewAuthority',
    forgedValue: {
      kind: 'human_native_review',
      reviewerId: 'native-7',
      reviewerName: 'Native Reviewer',
    },
  },
  {
    name: 'review-evidence alias object',
    forgedKey: 'reviewEvidence',
    forgedValue: { reviewerAttestation: 'native-review', reviewedAt: REVIEWED_AT },
  },
  {
    name: 'approval-evidence alias object',
    forgedKey: 'approvalEvidence',
    forgedValue: { reviewerId: 'native-7', reviewedAt: REVIEWED_AT },
  },
  {
    name: 'reviewer-attestation wrong-owner field',
    forgedKey: 'reviewerAttestation',
    forgedValue: 'native-review',
  },
];

function corpusWithCandidateEvidence(
  adversary: CandidateEvidenceAdversary,
  inReview = true,
): ReturnType<typeof corpusInReview> {
  const corpus = inReview
    ? corpusInReview()
    : (structuredClone(draft37Registry) as ReturnType<typeof corpusInReview>);
  const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
  if (!unit) throw new Error('fixture unit is missing');
  Reflect.set(unit.locales.ru, adversary.forgedKey, structuredClone(adversary.forgedValue));
  return corpus;
}

function verdictDecisionOverrides(verdict: ReviewVerdict): Record<string, string> {
  if (verdict === 'request_changes') return { verdict, replacement: 'Исправьте {{identity}}' };
  if (verdict === 'withdraw')
    return {
      verdict,
      replacement: '',
      reviewerId: '',
      reviewerName: '',
      reviewerAttestation: '',
      reviewedAt: '',
    };
  return { verdict, replacement: '' };
}

function decisionCsv(
  corpus: ReturnType<typeof corpusInReview>,
  overrides: Record<string, string> = {},
  locale: ReviewLocale = 'ru',
) {
  const parsed = parseReviewCsv(
    createReviewCsv(corpus, { locales: [locale], taskId: TASK_ID, unitIds: ['MLUX-C0001'] }),
  );
  Object.assign(parsed.rows[0], {
    verdict: 'approve',
    replacement: '  Проверено {{identity}}  ',
    reviewerId: 'native-7',
    reviewerName: 'Native Reviewer',
    reviewerAttestation: 'native-review',
    reviewedAt: REVIEWED_AT,
    ...overrides,
  });
  return serializeReviewCsv(parsed.rows);
}

function preflight(corpus: ReturnType<typeof corpusInReview>, content = decisionCsv(corpus)) {
  return preflightReviewPack({ content, corpus, importedAt: IMPORTED_AT, taskId: TASK_ID });
}

function dualLocaleDecisionCsv(
  corpus: ReturnType<typeof corpusInReview>,
  decisions: ReviewDecisionByLocale,
  localeOrder: readonly ReviewLocale[],
) {
  const unit = corpus.units.find(({ locales }) =>
    (['ru', 'uz'] as const).every((locale) => locales[locale].status === 'review_requested'),
  );
  if (!unit) throw new Error('dual-locale fixture unit is missing');
  const rows = parseReviewCsv(
    createReviewCsv(corpus, {
      locales: ['ru', 'uz'],
      taskId: TASK_ID,
      unitIds: [unit.id],
    }),
  ).rows.map((row: Record<string, string>) => {
    const locale = row.locale as ReviewLocale;
    const decision = decisions[locale];
    const requiresReviewer = decision.verdict !== 'withdraw';
    return {
      ...row,
      verdict: decision.verdict,
      replacement:
        decision.replacement === undefined
          ? ''
          : `${row.candidate} ${decision.replacement.replace(/\{\{identity\}\}/g, '').trim()}`.trim(),
      reviewerId: requiresReviewer ? `native-${locale}` : '',
      reviewerName: requiresReviewer ? `Native ${locale.toUpperCase()} Reviewer` : '',
      reviewerAttestation: requiresReviewer ? 'native-review' : '',
      reviewedAt: requiresReviewer ? REVIEWED_AT : '',
    };
  });
  const rowsByLocale = new Map(rows.map((row: Record<string, string>) => [row.locale, row]));
  return serializeReviewCsv(localeOrder.map((locale) => rowsByLocale.get(locale)));
}

function expectOneAffectedUnitInState(result: ReturnType<typeof preflight>, expectedState: string) {
  const classifiedTotal = Object.values(result.report.counts).reduce(
    (sum: number, count: unknown) => sum + Number(count),
    0,
  );
  expect(classifiedTotal).toBe(1);
  expect(result.report.counts[expectedState]).toBe(1);
  for (const state of result.report.states)
    if (state !== expectedState) expect(result.report.counts[state]).toBe(0);

  const corpusReport = createCorpusReviewReport(result.corpus);
  expect(corpusReport.counts[expectedState]).toBe(
    CURRENT_REVIEW_STATUS_COUNTS[expectedState as keyof typeof CURRENT_REVIEW_STATUS_COUNTS] +
      (expectedState === 'unreviewed' ? 0 : 1),
  );
}

function expectArtifactMalformedReport(report: ReviewReport) {
  expect(report.counts).toEqual({
    'approved-effective': 25,
    'unchanged-approved': 221,
    'stale-source': 99,
    unreviewed: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
    malformed: 1,
    rejected: 0,
  });
  expect(Object.values(report.counts).reduce((sum, count) => sum + count, 0)).toBe(
    HISTORICAL_CORPUS_UNIT_COUNT,
  );
  expect(report.currentTaskRequiredReview.total).toBe(100);
  expect(report.inheritedPendingDebt.total).toBe(HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT);
  expect(report.globalViolations).toEqual([...report.globalViolations].sort());
}

async function temporaryTargets(corpus: unknown = draft37Registry) {
  const directory = await mkdtemp(join(tmpdir(), 'fe067-review-exchange-'));
  temporaryDirectories.push(directory);
  const registryPath = join(directory, 'registry.json');
  const outputPath = join(directory, 'generated-resources.ts');
  await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
  await writeFile(outputPath, serializeGeneratedResources(corpus), 'utf8');
  return { directory, registryPath, outputPath };
}

async function immutableHistoricalTargets() {
  const directory = await mkdtemp(join(tmpdir(), 'fe067-historical-import-'));
  temporaryDirectories.push(directory);
  const registryPath = join(directory, 'registry.json');
  const outputPath = join(directory, 'generated-resources.ts');
  await writeRecordedBaseArtifacts({
    registryBaselinePath: registryPath,
    generatedBaselinePath: outputPath,
  });
  const [registry, output] = await Promise.all([readFile(registryPath), readFile(outputPath)]);
  const blobIdentity = (source: Buffer) =>
    createHash('sha1').update(`blob ${source.length}\0`).update(source).digest('hex');
  if (blobIdentity(registry) !== RECORDED_BASE_REQUEST.base.registryBlob)
    throw new Error('immutable historical registry fixture identity drifted');
  if (blobIdentity(output) !== RECORDED_BASE_REQUEST.base.generatedBlob)
    throw new Error('immutable historical generated fixture identity drifted');
  return { directory, registryPath, outputPath };
}

async function immutableHistoricalCorpus(): Promise<typeof draft37Registry> {
  const { registryPath } = await immutableHistoricalTargets();
  return JSON.parse(await readFile(registryPath, 'utf8')) as typeof draft37Registry;
}

describe('localization review exchange', () => {
  it('rejects a reverse-patch exact-text match that begins mid-line', () => {
    const patch = [
      'diff --git a/example.txt b/example.txt',
      'index 0000000..1111111 100644',
      '--- a/example.txt',
      '+++ b/example.txt',
      '@@ -1,2 +1,2 @@',
      '-target',
      '-next',
      '+target',
      '+next',
      '',
    ].join('\n');

    expect(() => reverseUnifiedPatch('prefix target\nnext\n', patch)).toThrow(
      'test fixture cannot reconstruct the recorded base',
    );
  });

  it('round-trips a deterministic fixed-schema CSV with exact review identity fields', () => {
    const corpus = corpusInReview();
    const options = { locales: ['uz', 'ru'], taskId: TASK_ID, unitIds: ['MLUX-C0001'] };
    const first = createReviewCsv(corpus, options);
    expect(createReviewCsv(corpus, { ...options, locales: ['ru', 'uz'] })).toBe(first);
    const parsed = parseReviewCsv(first);
    expect(parsed.header).toEqual([
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
    expect(parsed.rows[0]).toMatchObject({ id: 'MLUX-C0001', locale: 'ru', taskId: TASK_ID });
    expect(serializeReviewCsv(parsed.rows)).toBe(first);
  });

  it.each([
    [
      'approve',
      { replacement: '  Проверено {{identity}}  ' },
      'approved',
      'Проверено {{identity}}',
    ],
    ['approve', { replacement: '' }, 'approved', undefined],
    [
      'request_changes',
      { replacement: '  Исправьте {{identity}}  ' },
      'changes_requested',
      undefined,
    ],
    [
      'withdraw',
      {
        replacement: '',
        reviewerId: '',
        reviewerName: '',
        reviewerAttestation: '',
        reviewedAt: '',
      },
      'draft',
      undefined,
    ],
  ])('maps %s through engine transitions', (verdict, overrides, status, expectedCandidate) => {
    const corpus = corpusInReview();
    const result = preflight(corpus, decisionCsv(corpus, { verdict, ...overrides }));
    const candidate = result.corpus.units.find(({ id }: { id: string }) => id === 'MLUX-C0001')
      .locales.ru;
    expect(candidate.status).toBe(status);
    if (expectedCandidate) expect(candidate.candidate).toBe(expectedCandidate);
    if (status !== 'approved') expect(candidate.approvalAuthority).toBeNull();
  });

  it('records trimmed native-review change-request evidence without replacing the candidate', () => {
    const corpus = corpusInReview();
    const original = corpus.units.find(({ id }) => id === 'MLUX-C0001')?.locales.ru.candidate;

    const result = preflight(
      corpus,
      decisionCsv(corpus, {
        verdict: 'request_changes',
        replacement: '  Исправьте {{identity}}  ',
      }),
    );

    const candidate = result.corpus.units.find(({ id }: { id: string }) => id === 'MLUX-C0001')
      .locales.ru;
    expect(candidate.candidate).toBe(original);
    expect(candidate.history.at(-1)).toEqual({
      type: 'transition',
      from: 'review_requested',
      to: 'changes_requested',
      previousCandidate: original,
      nextCandidate: original,
      sourceRevision: candidate.sourceRevision,
      changeRequest: {
        replacement: 'Исправьте {{identity}}',
        reviewerId: 'native-7',
        reviewerName: 'Native Reviewer',
        reviewerAttestation: 'native-review',
        requestedAt: REQUESTED_AT,
        reviewedAt: REVIEWED_AT,
        changeRequestedAt: IMPORTED_AT,
      },
    });
    expect(corpus.units.find(({ id }) => id === 'MLUX-C0001')?.locales.ru.status).toBe(
      'review_requested',
    );
  });

  it('records withdrawal directly without fabricating a change request', () => {
    const corpus = corpusInReview();

    const result = preflight(
      corpus,
      decisionCsv(corpus, {
        verdict: 'withdraw',
        replacement: '',
        reviewerId: '',
        reviewerName: '',
        reviewerAttestation: '',
        reviewedAt: '',
      }),
    );

    const candidate = result.corpus.units.find(({ id }: { id: string }) => id === 'MLUX-C0001')
      .locales.ru;
    expect(candidate.requestedAt).toBeNull();
    expect(candidate.history.slice(-1)).toEqual([
      {
        type: 'transition',
        from: 'review_requested',
        to: 'draft',
        previousCandidate: candidate.candidate,
        nextCandidate: candidate.candidate,
        sourceRevision: candidate.sourceRevision,
        withdrawal: true,
      },
    ]);
    expect(candidate.history).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ to: 'changes_requested' })]),
    );
  });

  it('rejects malformed incoming review history without mutating the source corpus', () => {
    const corpus = corpusInReview();
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
    if (!unit) throw new Error('fixture unit is missing');
    const history = unit.locales.ru.history as MutableReviewHistoryEvent[];
    history[history.length - 1].sourceRevision = `sha256:${'0'.repeat(64)}`;
    const before = structuredClone(corpus);
    const content = decisionCsv(corpus, {
      verdict: 'withdraw',
      replacement: '',
      reviewerId: '',
      reviewerName: '',
      reviewerAttestation: '',
      reviewedAt: '',
    });

    expect(() => preflight(corpus, content)).toThrow(
      /invalid review history|protected source revision/,
    );
    expect(corpus).toEqual(before);
  });

  it('rejects retained change-request placeholder drift through preflight and import atomically', async () => {
    const corpus = corpusWithTamperedRetainedChangeRequest();
    const content = decisionCsv(corpus, verdictDecisionOverrides('approve'));
    const beforeSource = structuredClone(corpus);

    expect(() => preflight(corpus, content)).toThrow(/change-request replacement placeholder/);
    expect(corpus).toEqual(beforeSource);

    const { registryPath, outputPath } = await temporaryTargets();
    await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    await expect(
      importReviewPack({
        content,
        registryPath,
        outputPath,
        importedAt: IMPORTED_AT,
        taskId: TASK_ID,
      }),
    ).rejects.toThrow(/change-request replacement placeholder/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
  }, 30_000);

  it.each(['approve', 'request_changes', 'withdraw'] as const)(
    'rejects fabricated non-approved authority on %s without source or output mutation',
    async (verdict) => {
      const corpus = corpusWithFabricatedApprovalMetadata();
      const content = decisionCsv(corpus, verdictDecisionOverrides(verdict));
      const beforeSource = structuredClone(corpus);

      expect(() => preflight(corpus, content)).toThrow(
        /non-approved candidate retains approval metadata/,
      );
      expect(corpus).toEqual(beforeSource);

      const { registryPath, outputPath } = await temporaryTargets();
      await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
      const beforeRegistry = await readFile(registryPath);
      const beforeOutput = await readFile(outputPath);
      await expect(
        importReviewPack({
          content,
          registryPath,
          outputPath,
          importedAt: IMPORTED_AT,
          taskId: TASK_ID,
        }),
      ).rejects.toThrow(/non-approved candidate retains approval metadata/);
      expect(await readFile(registryPath)).toEqual(beforeRegistry);
      expect(await readFile(outputPath)).toEqual(beforeOutput);
    },
    30_000,
  );

  it.each(candidateEvidenceAdversaries)(
    'rejects candidate-level $name through real preflight and ordinary import without mutation',
    async (adversary) => {
      const corpus = corpusWithCandidateEvidence(adversary);
      const content = decisionCsv(corpus);
      const beforeSource = structuredClone(corpus);
      const expected = new RegExp(
        `candidate contains property outside LocaleCandidate schema: ${adversary.forgedKey}`,
      );

      expect(() => preflight(corpus, content)).toThrow(expected);
      expect(corpus).toEqual(beforeSource);

      const { directory, registryPath, outputPath } = await temporaryTargets();
      await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
      const beforeRegistry = await readFile(registryPath);
      const beforeOutput = await readFile(outputPath);
      await expect(
        importReviewPack({
          content,
          registryPath,
          outputPath,
          importedAt: IMPORTED_AT,
          taskId: TASK_ID,
        }),
      ).rejects.toThrow(expected);
      expect(await readFile(registryPath)).toEqual(beforeRegistry);
      expect(await readFile(outputPath)).toEqual(beforeOutput);
      expect(await readdir(directory)).not.toContainEqual(expect.stringContaining('.tmp'));
    },
    30_000,
  );

  it.each(candidateEvidenceAdversaries.slice(0, 4))(
    'rejects candidate-level $name through real supplied-artifact import without mutation',
    async (adversary) => {
      const corpus = corpusWithCandidateEvidence(adversary, false);
      const { directory, registryPath, outputPath } = await temporaryTargets();
      await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
      const beforeRegistry = await readFile(registryPath);
      const beforeOutput = await readFile(outputPath);

      await expect(
        importSuppliedReviewArtifact({
          artifactPath: ARTIFACT_FIXTURE,
          registryPath,
          outputPath,
          approvalRecordedAt: IMPORTED_AT,
        }),
      ).rejects.toThrow(
        new RegExp(
          `candidate contains property outside LocaleCandidate schema: ${adversary.forgedKey}`,
        ),
      );
      expect(await readFile(registryPath)).toEqual(beforeRegistry);
      expect(await readFile(outputPath)).toEqual(beforeOutput);
      expect(await readdir(directory)).not.toContainEqual(expect.stringContaining('.tmp'));
    },
    30_000,
  );

  it('rejects forged retained history after re-request without caller or target mutation', async () => {
    const corpus = corpusWithForgedRetainedHistory();
    const content = decisionCsv(corpus);
    const beforeSource = structuredClone(corpus);

    expect(() => preflight(corpus, content)).toThrow(/invalid history event shape/);
    expect(corpus).toEqual(beforeSource);

    const { registryPath, outputPath } = await temporaryTargets();
    await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    await expect(
      importReviewPack({
        content,
        registryPath,
        outputPath,
        importedAt: IMPORTED_AT,
        taskId: TASK_ID,
      }),
    ).rejects.toThrow(/invalid history event shape/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
  });

  it.each([
    ['null', null],
    ['malformed', 'forged'],
    ['valid-looking but unbound', `sha256:${'0'.repeat(64)}`],
  ])(
    'rejects a re-request with a %s stale-to-draft revision without caller, target, or temporary mutation',
    async (_name, forgedRevision) => {
      const corpus = corpusWithStaleToDraftRevision(forgedRevision);
      const content = decisionCsv(corpus);
      const beforeSource = structuredClone(corpus);

      expect(() => preflight(corpus, content)).toThrow(
        /stale -> draft history does not match active protected source revision/,
      );
      expect(corpus).toEqual(beforeSource);

      const { directory, registryPath, outputPath } = await temporaryTargets(corpus);
      const beforeRegistry = await readFile(registryPath);
      const beforeOutput = await readFile(outputPath);
      await expect(
        importReviewPack({
          content,
          registryPath,
          outputPath,
          importedAt: IMPORTED_AT,
          taskId: TASK_ID,
        }),
      ).rejects.toThrow(/stale -> draft history does not match active protected source revision/);
      expect(await readFile(registryPath)).toEqual(beforeRegistry);
      expect(await readFile(outputPath)).toEqual(beforeOutput);
      expect(await readdir(directory)).not.toContainEqual(expect.stringContaining('.tmp'));
    },
    30_000,
  );

  it.each([
    ['invalid verdict', { verdict: 'accept' }, /verdict/],
    [
      'empty request_changes replacement',
      { verdict: 'request_changes', replacement: '  ' },
      /replacement/,
    ],
    ['withdraw replacement', { verdict: 'withdraw', replacement: 'not allowed' }, /replacement/],
    ['missing reviewer', { reviewerId: '' }, /reviewerId/],
    ['missing reviewer name', { reviewerName: '' }, /reviewerName/],
    ['missing attestation', { reviewerAttestation: '' }, /reviewerAttestation/],
    ['wrong attestation', { reviewerAttestation: 'machine-review' }, /reviewerAttestation/],
    ['non-millisecond time', { reviewedAt: '2026-08-25T00:01:00Z' }, /reviewedAt/],
    ['review at request time', { reviewedAt: REQUESTED_AT }, /after requestedAt/],
    ['future review', { reviewedAt: '2026-08-25T00:03:00.000Z' }, /after import/],
  ])('rejects %s without mutating the source corpus', (_name, overrides, message) => {
    const corpus = corpusInReview();
    expect(() => preflight(corpus, decisionCsv(corpus, overrides))).toThrow(message);
    expect(corpus.units.find(({ id }) => id === 'MLUX-C0001')?.locales.ru.status).toBe(
      'review_requested',
    );
  });

  it('rejects wrong status and all protected row identity drift', () => {
    const reviewed = corpusInReview();
    const draft = structuredClone(draft37Registry) as ReturnType<typeof corpusInReview>;
    expect(() => preflight(draft, decisionCsv(draft))).toThrow(/status/);
    for (const [field, value] of [
      ['sourceRevision', `sha256:${'0'.repeat(64)}`],
      ['contexts', '[]'],
      ['placeholders', '["missing"]'],
      ['plurals', '{"one":"wrong"}'],
      ['candidate', 'drifted candidate'],
      ['status', 'draft'],
    ]) {
      const pack = parseReviewCsv(decisionCsv(reviewed));
      pack.rows[0][field] = value;
      expect(() => preflight(reviewed, serializeReviewCsv(pack.rows)), field).toThrow();
    }
  });

  it.each([
    ['object', { ids: ['MLUX-C0001'] }],
    ['empty array', []],
    ['number member', ['MLUX-C0001', 7]],
    ['empty string member', ['']],
    ['blank string member', ['   ']],
  ])(
    'rejects public export CLI unit IDs with %s using the stable contract error',
    async (_name, value) => {
      const { directory, registryPath } = await temporaryTargets();
      const outputPath = join(directory, 'review.csv');
      const unitIdsPath = join(directory, 'unit-ids.json');
      await writeFile(unitIdsPath, JSON.stringify(value), 'utf8');

      await expect(
        execFileAsync(
          process.execPath,
          [
            join(process.cwd(), 'scripts/localization/review-export.mjs'),
            registryPath,
            outputPath,
            TASK_ID,
            'ru',
            unitIdsPath,
          ],
          { cwd: process.cwd() },
        ),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('unitIds must be a non-empty list of stable IDs'),
      });
      await expect(readFile(outputPath)).rejects.toThrow();
    },
  );

  it('preserves public export CLI behavior for a valid unit ID list', async () => {
    const { directory, registryPath } = await temporaryTargets();
    const outputPath = join(directory, 'review.csv');
    const unitIdsPath = join(directory, 'unit-ids.json');
    await writeFile(unitIdsPath, JSON.stringify(['MLUX-C0001']), 'utf8');

    await execFileAsync(
      process.execPath,
      [
        join(process.cwd(), 'scripts/localization/review-export.mjs'),
        registryPath,
        outputPath,
        TASK_ID,
        'ru',
        unitIdsPath,
      ],
      { cwd: process.cwd() },
    );

    const rows = parseReviewCsv(await readFile(outputPath, 'utf8')).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'MLUX-C0001', locale: 'ru', taskId: TASK_ID });
  });

  it('rejects unknown/retired IDs, malformed schema, and conflicting duplicates', () => {
    const corpus = corpusInReview();
    const pack = parseReviewCsv(decisionCsv(corpus));
    pack.rows[0].id = 'MLUX-C9999';
    expect(() => preflight(corpus, serializeReviewCsv(pack.rows))).toThrow(/unknown/);
    const retired = structuredClone(corpus);
    const unit = retired.units.find(({ id }) => id === 'MLUX-C0001');
    if (!unit) throw new Error('fixture unit is missing');
    unit.unitLifecycle = 'retired';
    expect(() => preflight(retired, decisionCsv(corpus))).toThrow(/retired/);
    const valid = decisionCsv(corpus);
    expect(() => parseReviewCsv(valid.replace('id,locale,', 'identifier,locale,'))).toThrow(
      /header/,
    );
    expect(() => parseReviewCsv(valid.replace(`,${REVIEWED_AT}`, ''))).toThrow(/column count/);
    expect(() => parseReviewCsv(`${valid},extra`)).toThrow(/column count/);
    const original = parseReviewCsv(valid).rows[0];
    expectOneAffectedUnitInState(
      preflight(corpus, serializeReviewCsv([original, structuredClone(original)])),
      'approved-effective',
    );
    expect(() =>
      preflight(
        corpus,
        serializeReviewCsv([original, { ...original, replacement: 'Другое {{identity}}' }]),
      ),
    ).toThrow(/conflicting duplicate/);
  });

  it('rejects replacement placeholder drift before approval', () => {
    const corpus = corpusInReview();
    expect(() =>
      preflight(corpus, decisionCsv(corpus, { replacement: 'Без placeholder' })),
    ).toThrow(/replacement placeholder/);
  });

  it('rejects a non-millisecond importer approval time before applying rows', () => {
    const corpus = corpusInReview();
    expect(() =>
      preflightReviewPack({
        content: decisionCsv(corpus),
        corpus,
        importedAt: '2026-08-25T00:02:00Z',
        taskId: TASK_ID,
      }),
    ).toThrow(/approvalRecordedAt\/importedAt/);
    expect(corpus.units.find(({ id }) => id === 'MLUX-C0001')?.locales.ru.status).toBe(
      'review_requested',
    );
  });

  it.each([
    [
      'unchanged approvals',
      { ru: { verdict: 'approve' }, uz: { verdict: 'approve' } },
      'unchanged-approved',
    ],
    [
      'effective approvals',
      {
        ru: { verdict: 'approve', replacement: 'Проверено {{identity}}' },
        uz: { verdict: 'approve', replacement: '{{identity}} tekshirildi' },
      },
      'approved-effective',
    ],
    [
      'mixed effective and unchanged approvals',
      {
        ru: { verdict: 'approve', replacement: 'Проверено {{identity}}' },
        uz: { verdict: 'approve' },
      },
      'approved-effective',
    ],
    [
      'request changes and approval',
      {
        ru: { verdict: 'request_changes', replacement: 'Исправьте {{identity}}' },
        uz: { verdict: 'approve' },
      },
      'rejected',
    ],
    [
      'withdrawal and approval',
      { ru: { verdict: 'withdraw' }, uz: { verdict: 'approve' } },
      'unreviewed',
    ],
    [
      'request changes and withdrawal',
      {
        ru: { verdict: 'request_changes', replacement: 'Исправьте {{identity}}' },
        uz: { verdict: 'withdraw' },
      },
      'rejected',
    ],
  ] satisfies [string, ReviewDecisionByLocale, string][])(
    'classifies one affected unit for dual-locale %s regardless of row order',
    (_name, decisions, expectedState) => {
      for (const localeOrder of [
        ['ru', 'uz'],
        ['uz', 'ru'],
      ] as const) {
        const corpus = corpusInReviewFor(['ru', 'uz']);
        const result = preflight(corpus, dualLocaleDecisionCsv(corpus, decisions, localeOrder));
        expectOneAffectedUnitInState(result, expectedState);
      }
    },
  );

  it('rejects a partially invalid dual-locale pack without applying either decision', () => {
    const corpus = corpusInReviewFor(['ru', 'uz']);
    const content = dualLocaleDecisionCsv(
      corpus,
      {
        ru: { verdict: 'approve', replacement: 'Проверено {{identity}}' },
        uz: { verdict: 'request_changes', replacement: '{{identity}} tuzatilsin' },
      },
      ['ru', 'uz'],
    );
    const parsed = parseReviewCsv(content);
    parsed.rows.find((row: Record<string, string>) => row.locale === 'uz').reviewedAt =
      '2026-08-25T00:03:00.000Z';

    expect(() => preflight(corpus, serializeReviewCsv(parsed.rows))).toThrow(/after import/);
    const unit = corpus.units.find(({ locales }) =>
      (['ru', 'uz'] as const).every((locale) => locales[locale].status === 'review_requested'),
    );
    expect(unit?.locales.ru.status).toBe('review_requested');
    expect(unit?.locales.uz.status).toBe('review_requested');
  });

  it('hashes and classifies the exact corrected supplied artifact before mutation', async () => {
    const corpus = await immutableHistoricalCorpus();
    const inspection = inspectSuppliedReviewArtifact({
      bytes: await readFile(ARTIFACT_FIXTURE),
      corpus,
    });
    expect(inspection.summary).toMatchObject({
      artifactRows: 346,
      exactRows: 247,
      staleRows: 99,
      absentUnits: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
      ruReplacements: 33,
      uzReplacements: 8,
      replacementRows: 40,
      eligibleRuReplacements: 20,
      eligibleUzReplacements: 6,
      eligibleReplacementRows: 25,
    });
    expect(inspection.eligibleBothLocaleIds).toEqual(['MLUX-C0340']);
    for (const id of ['MLUX-C0050', 'MLUX-C0051', 'MLUX-C0052', 'MLUX-C0053', 'MLUX-C0054'])
      expect(inspection.artifactIds).toContain(id);
    expect(corpus.units.every((unit) => unit.locales.ru.status === 'draft')).toBe(true);
  });

  it('lets an exact historical changes-requested unit override predicted artifact approval', async () => {
    const corpus = structuredClone(await immutableHistoricalCorpus());
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0017');
    if (!unit) throw new Error('fixture unit is missing');
    const requested = requestCandidateReview(unit.locales.ru, unit.id, ['ru']);
    unit.locales.ru = requestChanges(requested);
    const before = structuredClone(corpus);

    const report = inspectSuppliedReviewArtifact({
      bytes: await readFile(ARTIFACT_FIXTURE),
      corpus,
    }).report;

    expect(report.counts).toEqual({
      'approved-effective': 25,
      'unchanged-approved': 221,
      'stale-source': 99,
      unreviewed: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
      malformed: 0,
      rejected: 1,
    });
    expect(report.currentTaskRequiredReview).toEqual({
      total: 100,
      byState: { 'stale-source': 99, malformed: 0, rejected: 1 },
    });
    expect(report.inheritedPendingDebt).toEqual({
      total: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
      byState: { unreviewed: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT },
    });
    expect(corpus).toEqual(before);
  });

  it('lets an exact malformed current unit override artifact admission and retain diagnostics', async () => {
    const corpus = structuredClone(await immutableHistoricalCorpus());
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0017');
    if (!unit) throw new Error('fixture unit is missing');
    unit.locales.ru.candidate = '';
    corpus.summary.translationUnits = 999;
    const before = structuredClone(corpus);

    const report = inspectSuppliedReviewArtifact({
      bytes: await readFile(ARTIFACT_FIXTURE),
      corpus,
    }).report;

    expect(report.counts).toEqual({
      'approved-effective': 25,
      'unchanged-approved': 221,
      'stale-source': 99,
      unreviewed: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
      malformed: 1,
      rejected: 0,
    });
    expect(report.currentTaskRequiredReview).toEqual({
      total: 100,
      byState: { 'stale-source': 99, malformed: 1, rejected: 0 },
    });
    expect(report.inheritedPendingDebt).toEqual({
      total: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
      byState: { unreviewed: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT },
    });
    expect(report.globalViolations).toContain('summary translation unit count mismatch');
    expect(report.globalViolations).toEqual([...report.globalViolations].sort());
    expect(report.globalViolations).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^MLUX-C0017:/)]),
    );
    expect(corpus).toEqual(before);
  });

  it('reports a missing exact locale candidate through the artifact API and public wrapper', async () => {
    const bytes = await readFile(ARTIFACT_FIXTURE);
    const corpus = structuredClone(await immutableHistoricalCorpus());
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0017');
    if (!unit) throw new Error('fixture unit is missing');
    Reflect.deleteProperty(unit.locales, 'ru');
    const before = structuredClone(corpus);

    const directReport = inspectSuppliedReviewArtifact({ bytes, corpus }).report;
    expectArtifactMalformedReport(directReport);
    expect(corpus).toEqual(before);

    const directory = await mkdtemp(join(tmpdir(), 'fe067-review-report-'));
    temporaryDirectories.push(directory);
    const registryPath = join(directory, 'registry.json');
    await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
    const registryBefore = await readFile(registryPath);
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        join(process.cwd(), 'scripts/localization/review-report.mjs'),
        registryPath,
        ARTIFACT_FIXTURE,
      ],
      { cwd: process.cwd() },
    );

    expectArtifactMalformedReport(JSON.parse(stdout) as ReviewReport);
    expect(await readFile(registryPath)).toEqual(registryBefore);
  });

  it.each([
    ['missing units', (corpus) => Reflect.deleteProperty(corpus, 'units')],
    ['null units', (corpus) => Reflect.set(corpus, 'units', null)],
    ['object units', (corpus) => Reflect.set(corpus, 'units', {})],
    ['string units', (corpus) => Reflect.set(corpus, 'units', 'bad')],
  ] satisfies ReadonlyArray<readonly [string, MalformedCorpusMutation]>)(
    'preserves canonical report parity and fail-closed import for %s',
    async (_shape, mutateCorpus) => {
      const bytes = await readFile(ARTIFACT_FIXTURE);
      const corpus = structuredClone(await immutableHistoricalCorpus());
      mutateCorpus(corpus);
      const before = structuredClone(corpus);
      const canonical = createCorpusReviewReport(corpus);

      const directReport = inspectSuppliedReviewArtifact({ bytes, corpus }).report;
      expect(directReport).toEqual(canonical);
      expect(Object.values(directReport.counts).every((count) => count === 0)).toBe(true);
      expect(directReport.globalViolations).toContain('missing units');
      expect(directReport.globalViolations).toEqual([...directReport.globalViolations].sort());
      expect(corpus).toEqual(before);

      const { registryPath, outputPath } = await temporaryTargets();
      await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
      const beforeRegistry = await readFile(registryPath);
      const beforeOutput = await readFile(outputPath);
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          join(process.cwd(), 'scripts/localization/review-report.mjs'),
          registryPath,
          ARTIFACT_FIXTURE,
        ],
        { cwd: process.cwd() },
      );

      expect(JSON.parse(stdout) as ReviewReport).toEqual(canonical);
      expect(await readFile(registryPath)).toEqual(beforeRegistry);
      await expect(
        importSuppliedReviewArtifact({
          artifactPath: ARTIFACT_FIXTURE,
          registryPath,
          outputPath,
          approvalRecordedAt: IMPORTED_AT,
        }),
      ).rejects.toThrow(/corpus units must be an array/);
      expect(await readFile(registryPath)).toEqual(beforeRegistry);
      expect(await readFile(outputPath)).toEqual(beforeOutput);
    },
  );

  it.each([
    ['missing locale map', (unit) => Reflect.deleteProperty(unit, 'locales')],
    ['malformed candidate', (unit) => Reflect.set(unit.locales, 'ru', null)],
    ['missing placeholder map', (unit) => Reflect.deleteProperty(unit, 'placeholdersByLocale')],
    ['invalid plural shape', (unit) => Reflect.set(unit, 'pluralForms', [])],
    [
      'missing occurrence context',
      (unit) => Reflect.deleteProperty(unit.occurrences[0], 'context'),
    ],
  ] satisfies ReadonlyArray<readonly [string, MalformedUnitMutation]>)(
    'fails closed for an exact unit with %s',
    async (_shape, mutateUnit) => {
      const corpus = structuredClone(await immutableHistoricalCorpus());
      const unit = corpus.units.find(({ id }) => id === 'MLUX-C0017');
      if (!unit) throw new Error('fixture unit is missing');
      mutateUnit(unit);
      const before = structuredClone(corpus);

      const report = inspectSuppliedReviewArtifact({
        bytes: await readFile(ARTIFACT_FIXTURE),
        corpus,
      }).report;

      expectArtifactMalformedReport(report);
      expect(corpus).toEqual(before);
    },
  );

  it.each(['stale', 'absent'] as const)(
    'lets a historical rejected unit override %s artifact admission without double counting',
    async (admission) => {
      const bytes = await readFile(ARTIFACT_FIXTURE);
      const historicalCorpus = await immutableHistoricalCorpus();
      const baseline = inspectSuppliedReviewArtifact({ bytes, corpus: historicalCorpus });
      const id = admission === 'stale' ? baseline.staleIds[0] : baseline.absentIds[0];
      const corpus = structuredClone(historicalCorpus);
      const unit = corpus.units.find((entry) => entry.id === id);
      if (!unit) throw new Error('fixture unit is missing');
      const requested = requestCandidateReview(unit.locales.ru, unit.id, ['ru']);
      unit.locales.ru = requestChanges(requested);

      const report = inspectSuppliedReviewArtifact({ bytes, corpus }).report;

      expect(report.counts.rejected).toBe(1);
      expect(report.counts[admission === 'stale' ? 'stale-source' : 'unreviewed']).toBe(
        admission === 'stale' ? 98 : HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT - 1,
      );
      expect(
        Object.values(report.counts).reduce(
          (sum: number, count: unknown) => sum + Number(count),
          0,
        ),
      ).toBe(HISTORICAL_CORPUS_UNIT_COUNT);
      expect(report.currentTaskRequiredReview.total).toBe(admission === 'stale' ? 99 : 100);
      expect(report.inheritedPendingDebt.total).toBe(
        admission === 'stale'
          ? HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT
          : HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT - 1,
      );
    },
  );

  it('classifies protected historical plural revision drift as stale when primary display strings are unchanged', async () => {
    const corpus = structuredClone(await immutableHistoricalCorpus());
    const unitIndex = corpus.units.findIndex(({ id }) => id === 'MLUX-C0017');
    if (unitIndex < 0) throw new Error('fixture unit is missing');
    const original = corpus.units[unitIndex];
    corpus.units[unitIndex] = reviseProtectedSource(original, {
      pluralForms: {
        en: { one: original.english, other: original.english },
        ru: {
          few: original.locales.ru.candidate,
          many: original.locales.ru.candidate,
          one: original.locales.ru.candidate,
          other: original.locales.ru.candidate,
        },
        uz: { one: original.locales.uz.candidate, other: original.locales.uz.candidate },
      },
    });

    const inspection = inspectSuppliedReviewArtifact({
      bytes: await readFile(ARTIFACT_FIXTURE),
      corpus,
    });

    expect(corpus.units[unitIndex].english).toBe(original.english);
    expect(corpus.units[unitIndex].locales.ru.candidate).toBe(original.locales.ru.candidate);
    expect(corpus.units[unitIndex].locales.uz.candidate).toBe(original.locales.uz.candidate);
    expect(corpus.units[unitIndex].sourceRevision).not.toBe(original.sourceRevision);
    expect(inspection.protectedSourceIdentityMatches).toBe(false);
    expect(inspection.exactIds).not.toContain(original.id);
    expect(inspection.staleIds).toContain(original.id);
    expect(inspection.summary).toMatchObject({ exactRows: 0, staleRows: 346 });
  });

  it('returns the current CRF-revised registry as a stale no-write historical boundary', async () => {
    const { registryPath, outputPath } = await temporaryTargets();
    const before = await Promise.all([readFile(registryPath), readFile(outputPath)]);

    const report = await importSuppliedReviewArtifact({
      artifactPath: ARTIFACT_FIXTURE,
      registryPath,
      outputPath,
      approvalRecordedAt: IMPORTED_AT,
    });

    expect(report.counts).toMatchObject({
      'approved-effective': 0,
      'unchanged-approved': 0,
      'stale-source': SUPPLIED_LEGACY_ARTIFACT_ROW_COUNT,
      unreviewed: CURRENT_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
    });
    expect(await Promise.all([readFile(registryPath), readFile(outputPath)])).toEqual(before);
  });

  it('imports only exact supplied rows with the named null-reviewer authority', async () => {
    const { registryPath, outputPath } = await immutableHistoricalTargets();
    const report = await importSuppliedReviewArtifact({
      artifactPath: ARTIFACT_FIXTURE,
      registryPath,
      outputPath,
      approvalRecordedAt: IMPORTED_AT,
    });
    const imported = JSON.parse(await readFile(registryPath, 'utf8'));
    expect(
      imported.units.filter(
        (unit: { locales: { ru: { status: string }; uz: { status: string } } }) =>
          unit.locales.ru.status === 'approved' && unit.locales.uz.status === 'approved',
      ),
    ).toHaveLength(247);
    expect(report.counts).toMatchObject({
      'approved-effective': 25,
      'unchanged-approved': 222,
      'stale-source': 99,
      unreviewed: HISTORICAL_LEGACY_ARTIFACT_UNREVIEWED_UNIT_COUNT,
      malformed: 0,
      rejected: 0,
    });
    const c0340 = imported.units.find(({ id }: { id: string }) => id === 'MLUX-C0340');
    for (const locale of ['ru', 'uz'])
      expect(c0340.locales[locale]).toMatchObject({
        status: 'approved',
        reviewerId: null,
        reviewedAt: null,
        approvalRecordedAt: IMPORTED_AT,
        approvalAuthority: {
          kind: 'user-authorized supplied review artifact',
          artifactName: 'learnhub-multilingual-review-readable.md',
          artifactSha256: 'ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C',
        },
      });
    for (const locale of ['ru', 'uz']) {
      const request = c0340.locales[locale].history[0];
      expect(request).toMatchObject({
        type: 'transition',
        from: 'draft',
        to: 'review_requested',
        suppliedArtifactImport: {
          artifactSha256: 'ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C',
          protectedSourceIdentitySha256:
            '24EA5BC9AFC65594F2A886005E646E16708BAD74FB395D5A02BF1EB975700CCA',
          unitId: 'MLUX-C0340',
          unitSourceRevision: c0340.sourceRevision,
        },
      });
      expect(request).not.toHaveProperty('reviewRequest');
    }
  }, 30_000);

  it('keeps the historical import transition out of the generic engine capability surface', () => {
    expect(corpusEngineModule).not.toHaveProperty('authorizeSuppliedReviewArtifactImport');
    expect(corpusEngineModule).not.toHaveProperty('requestSuppliedReviewArtifactCandidate');
    expect(corpusEngineModule).not.toHaveProperty('approveSuppliedReviewArtifactCandidate');
    expect(corpusEngineModule).not.toHaveProperty('applySuppliedReviewArtifactImport');
  });

  it('prevents a cloned immutable-base corpus from invoking historical approval construction', () => {
    const corpus = structuredClone(draft37Registry);
    const before = structuredClone(corpus);
    expect(() =>
      (
        corpusEngineModule as typeof corpusEngineModule & {
          applySuppliedReviewArtifactImport: (corpus: unknown, options: unknown) => unknown;
        }
      ).applySuppliedReviewArtifactImport(corpus, {
        artifactSha256: 'ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C',
        artifactIds: Array.from(
          { length: SUPPLIED_LEGACY_ARTIFACT_ROW_COUNT },
          (_, index) => `MLUX-C${String(index + 1).padStart(4, '0')}`,
        ),
        approvalRecordedAt: IMPORTED_AT,
        entries: [{ id: 'MLUX-C0001', locale: 'ru', replacement: '' }],
      }),
    ).toThrow(/is not a function/);
    expect(corpus).toEqual(before);
  });

  it('keeps ordinary CRF review requests outside the historical supplied-artifact approval API', () => {
    const corpus = structuredClone(draft37Registry);
    const before = structuredClone(corpus);
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0109');
    if (!unit) throw new Error('CRF C0109 fixture unit is missing');
    const request = {
      taskId: 'CRF-001',
      locales: ['ru'],
      unitIds: ['MLUX-C0109'],
      requestedAt: REQUESTED_AT,
    };
    const draft = withdrawLocaleCandidateReview(unit.locales.ru);
    expect(draft).toMatchObject({ status: 'draft', requestedAt: null });
    const candidate = requestLocaleCandidateReview(draft, request);
    expect(candidate.status).toBe('review_requested');
    expect(() => requestLocaleCandidateReview(candidate, request)).toThrow(
      /review_requested -> review_requested request is forbidden/,
    );
    expect(() =>
      (
        corpusEngineModule as typeof corpusEngineModule & {
          approveSuppliedReviewArtifactCandidate: (candidate: unknown, options: unknown) => unknown;
        }
      ).approveSuppliedReviewArtifactCandidate(candidate, {
        artifactSha256: 'ED5D3D613F21DE188DB0512B3701EA9C0C0A6D254FD1C77829FB3E61ECD3310C',
        approvalRecordedAt: IMPORTED_AT,
      }),
    ).toThrow(/is not a function/);
    expect(corpus).toEqual(before);
    expect(unit.locales.ru).toEqual(before.units.find(({ id }) => id === 'MLUX-C0109')?.locales.ru);
  });

  it('rejects a C0109 historical-artifact substitution without writing either target', async () => {
    const { registryPath, outputPath } = await immutableHistoricalTargets();
    const before = await Promise.all([readFile(registryPath), readFile(outputPath)]);
    const altered = JSON.parse(await readFile(registryPath, 'utf8'));
    const c0109 = altered.units.find((unit: { id: string }) => unit.id === 'MLUX-C0109');
    if (!c0109) throw new Error('CRF C0109 fixture unit is missing');
    c0109.sourceRevision =
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    for (const locale of ['ru', 'uz']) c0109.locales[locale].sourceRevision = c0109.sourceRevision;
    await writeFile(registryPath, `${JSON.stringify(altered, null, 2)}\n`);

    const afterMutation = await Promise.all([readFile(registryPath), readFile(outputPath)]);
    await expect(
      importSuppliedReviewArtifact({
        artifactPath: ARTIFACT_FIXTURE,
        registryPath,
        outputPath,
        approvalRecordedAt: IMPORTED_AT,
      }),
    ).rejects.toThrow(
      /current corpus validation: MLUX-C0109: source revision fingerprint mismatch/,
    );
    expect(await Promise.all([readFile(registryPath), readFile(outputPath)])).toEqual(
      afterMutation,
    );
    expect(afterMutation[1]).toEqual(before[1]);
  });

  it('rejects supplied-artifact replay after the exact historical import without partial writes', async () => {
    const { registryPath, outputPath } = await immutableHistoricalTargets();
    await importSuppliedReviewArtifact({
      artifactPath: ARTIFACT_FIXTURE,
      registryPath,
      outputPath,
      approvalRecordedAt: IMPORTED_AT,
    });
    const beforeReplay = await Promise.all([readFile(registryPath), readFile(outputPath)]);

    await expect(
      importSuppliedReviewArtifact({
        artifactPath: ARTIFACT_FIXTURE,
        registryPath,
        outputPath,
        approvalRecordedAt: '2026-08-25T00:03:00.000Z',
      }),
    ).rejects.toThrow(/current draft|pristine historical draft/);
    expect(await Promise.all([readFile(registryPath), readFile(outputPath)])).toEqual(beforeReplay);
  }, 30_000);

  it('rejects altered supplied-artifact task provenance before writing either target', async () => {
    const { registryPath, outputPath } = await immutableHistoricalTargets();
    const corpus = JSON.parse(await readFile(registryPath, 'utf8')) as typeof draft37Registry;
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
    if (!unit) throw new Error('fixture unit is missing');
    unit.migrationProvenance.ownerTasks = ['MLUX-003'];
    await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
    const before = await Promise.all([readFile(registryPath), readFile(outputPath)]);

    await expect(
      importSuppliedReviewArtifact({
        artifactPath: ARTIFACT_FIXTURE,
        registryPath,
        outputPath,
        approvalRecordedAt: IMPORTED_AT,
      }),
    ).rejects.toThrow(/provenance/);
    expect(await Promise.all([readFile(registryPath), readFile(outputPath)])).toEqual(before);
  });

  it('rejects altered supplied bytes and bad authority time without writes', async () => {
    const bytes = await readFile(ARTIFACT_FIXTURE);
    expect(() =>
      inspectSuppliedReviewArtifact({
        bytes: Buffer.concat([bytes, Buffer.from(' ')]),
        corpus: draft37Registry,
      }),
    ).toThrow(/hash is not authorized/);
    const { registryPath, outputPath } = await temporaryTargets();
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    await expect(
      importSuppliedReviewArtifact({
        artifactPath: ARTIFACT_FIXTURE,
        registryPath,
        outputPath,
        approvalRecordedAt: 'bad',
      }),
    ).rejects.toThrow(/approvalRecordedAt/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
  });

  it('rolls registry back and cleans staged files when the second rename fails', async () => {
    const corpus = corpusInReview();
    const { directory, registryPath, outputPath } = await temporaryTargets(corpus);
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    let renameCount = 0;
    await expect(
      importReviewPack({
        content: decisionCsv(corpus),
        registryPath,
        outputPath,
        importedAt: IMPORTED_AT,
        taskId: TASK_ID,
        fileSystem: {
          rename: async (from: string, to: string) => {
            renameCount += 1;
            if (renameCount === 2) throw new Error('simulated generated-output rename failure');
            await rename(from, to);
          },
        },
      }),
    ).rejects.toThrow(/simulated generated-output rename failure/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
    expect(await readdir(directory)).not.toContainEqual(expect.stringContaining('.tmp'));
  }, 30_000);

  it('rejects lexical and normalized export target aliases without mutation', async () => {
    const { directory, registryPath } = await temporaryTargets();
    const before = await readFile(registryPath);

    await expect(
      exportReviewPack({
        registryPath,
        outputPath: registryPath,
        taskId: TASK_ID,
        locales: ['ru'],
      }),
    ).rejects.toThrow(/distinct file targets/);
    await expect(
      exportReviewPack({
        registryPath,
        outputPath: join(directory, 'missing', '..', 'registry.json'),
        taskId: TASK_ID,
        locales: ['ru'],
      }),
    ).rejects.toThrow(/distinct file targets/);
    expect(await readFile(registryPath)).toEqual(before);
  });

  it('rejects existing hard-link aliases in both import paths without mutation', async () => {
    const { directory, registryPath, outputPath } = await temporaryTargets();
    await rm(outputPath);
    await link(registryPath, outputPath);
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);

    await expect(
      importReviewPack({
        content: decisionCsv(corpusInReview()),
        registryPath,
        outputPath,
        importedAt: IMPORTED_AT,
        taskId: TASK_ID,
      }),
    ).rejects.toThrow(/distinct file targets/);
    await expect(
      importSuppliedReviewArtifact({
        artifactPath: ARTIFACT_FIXTURE,
        registryPath,
        outputPath,
        approvalRecordedAt: IMPORTED_AT,
      }),
    ).rejects.toThrow(/distinct file targets/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
    expect(await readdir(directory)).not.toContainEqual(expect.stringContaining('.tmp'));
  }, 30_000);

  it('rejects aliased targets at the transaction boundary before mutation', async () => {
    const { registryPath } = await temporaryTargets();
    const before = await readFile(registryPath);

    await expect(
      commitReviewTransaction({
        registryPath,
        outputPath: registryPath,
        registryContent: 'REGISTRY',
        generatedContent: 'GENERATED',
      }),
    ).rejects.toThrow(/distinct file targets/);
    expect(await readFile(registryPath)).toEqual(before);
  });

  it('reports exactly six states and separates current work from inherited debt', () => {
    const report = createCorpusReviewReport(draft37Registry);
    expect(report.states).toEqual([
      'approved-effective',
      'unchanged-approved',
      'stale-source',
      'unreviewed',
      'malformed',
      'rejected',
    ]);
    expect(Object.keys(report.counts)).toEqual(report.states);
    expect(report.currentTaskRequiredReview).toEqual({
      total: 0,
      byState: { 'stale-source': 0, malformed: 0, rejected: 0 },
    });
    expect(report.inheritedPendingDebt).toEqual({
      total: CURRENT_UNREVIEWED_UNIT_COUNT,
      byState: { unreviewed: CURRENT_UNREVIEWED_UNIT_COUNT },
    });
    expect(reportReviewStatus({ unreviewed: 1 }).counts.unreviewed).toBe(1);
  });

  it('classifies a multiply malformed unit once and keeps global violations out of unit totals', () => {
    const corpus = structuredClone(draft37Registry);
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
    if (!unit) throw new Error('fixture unit is missing');
    unit.locales.ru.candidate = '';
    corpus.summary.translationUnits = 999;

    const report = createCorpusReviewReport(corpus);
    const classifiedTotal = Object.values(report.counts).reduce(
      (sum: number, count: unknown) => sum + Number(count),
      0,
    );

    expect(report.counts.malformed).toBe(1);
    expect(classifiedTotal).toBe(
      corpus.units.filter((entry) => entry.unitLifecycle === 'active').length,
    );
    expect(report.globalViolations).toContain('summary translation unit count mismatch');
    expect(report.globalViolations).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^MLUX-C0001:/)]),
    );
  });

  it('excludes invalid-lifecycle units from state totals and retains their diagnostics globally', () => {
    const corpus = structuredClone(draft37Registry);
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
    if (!unit) throw new Error('fixture unit is missing');
    Reflect.set(unit, 'unitLifecycle', 'corrupt');

    const report = createCorpusReviewReport(corpus);
    const classifiedTotal = Object.values(report.counts).reduce(
      (sum: number, count: unknown) => sum + Number(count),
      0,
    );

    expect(classifiedTotal).toBe(
      corpus.units.filter((entry) => entry.unitLifecycle === 'active').length,
    );
    expect(report.counts.malformed).toBe(0);
    expect(report.globalViolations).toContain('MLUX-C0001: invalid unit lifecycle');
  });

  it('keeps invalid-lifecycle same-ID collisions global regardless of object ordering', () => {
    const expectedSameIdDiagnostics = [
      'MLUX-C0001: duplicate namespace/key',
      'MLUX-C0001: duplicate occurrence id',
      'MLUX-C0001: duplicate unit id',
      'MLUX-C0001: invalid unit lifecycle',
    ];
    const reports = ['before', 'after'].map((ordering) => {
      const corpus = structuredClone(draft37Registry);
      const activeUnit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
      if (!activeUnit) throw new Error('fixture unit is missing');
      const excludedUnit = structuredClone(activeUnit);
      Reflect.set(excludedUnit, 'unitLifecycle', 'corrupt');
      corpus.units[ordering === 'before' ? 'unshift' : 'push'](excludedUnit);

      return createCorpusReviewReport(corpus);
    });

    for (const report of reports) {
      const classifiedTotal = Object.values(report.counts).reduce(
        (sum: number, count: unknown) => sum + Number(count),
        0,
      );
      expect(classifiedTotal).toBe(CURRENT_CORPUS_UNIT_COUNT);
      expect(report.counts).toMatchObject({
        unreviewed: CURRENT_UNREVIEWED_UNIT_COUNT,
        malformed: 0,
      });
      expect(report.globalViolations).toEqual([...report.globalViolations].sort());
      expect(
        report.globalViolations.filter((violation: string) => violation.startsWith('MLUX-C0001:')),
      ).toEqual(expectedSameIdDiagnostics);
    }
    expect(reports[0].globalViolations).toEqual(reports[1].globalViolations);
  });

  it('keeps retired same-ID collisions global regardless of object ordering', () => {
    const expectedSameIdDiagnostics = [
      'MLUX-C0001: duplicate namespace/key',
      'MLUX-C0001: duplicate occurrence id',
      'MLUX-C0001: duplicate unit id',
      'MLUX-C0001: invalid retirement provenance',
      'MLUX-C0001: retired unit still has registry consumers',
    ];
    const reports = ['before', 'after'].map((ordering) => {
      const corpus = structuredClone(draft37Registry);
      const activeUnit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
      if (!activeUnit) throw new Error('fixture unit is missing');
      const excludedUnit = structuredClone(activeUnit);
      excludedUnit.unitLifecycle = 'retired';
      corpus.units[ordering === 'before' ? 'unshift' : 'push'](excludedUnit);

      return createCorpusReviewReport(corpus);
    });

    for (const report of reports) {
      const classifiedTotal = Object.values(report.counts).reduce(
        (sum: number, count: unknown) => sum + Number(count),
        0,
      );
      expect(classifiedTotal).toBe(CURRENT_CORPUS_UNIT_COUNT);
      expect(report.counts).toMatchObject({
        unreviewed: CURRENT_UNREVIEWED_UNIT_COUNT,
        malformed: 0,
      });
      expect(report.globalViolations).toEqual([...report.globalViolations].sort());
      expect(
        report.globalViolations.filter((violation: string) => violation.startsWith('MLUX-C0001:')),
      ).toEqual(expectedSameIdDiagnostics);
    }
    expect(reports[0].globalViolations).toEqual(reports[1].globalViolations);
  });

  it('keeps intrinsic active-unit malformation local during a same-ID collision', () => {
    const corpus = structuredClone(draft37Registry);
    const activeUnit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
    if (!activeUnit) throw new Error('fixture unit is missing');
    const excludedUnit = structuredClone(activeUnit);
    excludedUnit.unitLifecycle = 'retired';
    Reflect.deleteProperty(activeUnit.locales, 'ru');
    corpus.units.push(excludedUnit);

    const report = createCorpusReviewReport(corpus);
    const classifiedTotal = Object.values(report.counts).reduce(
      (sum: number, count: unknown) => sum + Number(count),
      0,
    );

    expect(classifiedTotal).toBe(CURRENT_CORPUS_UNIT_COUNT);
    expect(report.counts).toMatchObject({
      unreviewed: CURRENT_UNREVIEWED_UNIT_COUNT - 1,
      malformed: 1,
    });
    expect(report.globalViolations).toEqual([...report.globalViolations].sort());
    expect(report.globalViolations).toEqual(
      expect.arrayContaining([
        'MLUX-C0001: duplicate namespace/key',
        'MLUX-C0001: duplicate occurrence id',
        'MLUX-C0001: duplicate unit id',
        'MLUX-C0001: invalid review locales',
      ]),
    );
  });

  it('returns a deterministic zero-unit report when units are missing', () => {
    const corpus = structuredClone(draft37Registry);
    Reflect.deleteProperty(corpus, 'units');

    const report = createCorpusReviewReport(corpus);

    expect(Object.values(report.counts).every((count) => count === 0)).toBe(true);
    expect(report.globalViolations).toContain('missing units');
  });

  it('returns a deterministic zero-unit report when units are null', () => {
    const corpus = structuredClone(draft37Registry);
    Reflect.set(corpus, 'units', null);

    const report = createCorpusReviewReport(corpus);

    expect(Object.values(report.counts).every((count) => count === 0)).toBe(true);
    expect(report.globalViolations).toContain('missing units');
  });

  it('returns a deterministic zero-unit report when units are not an array', () => {
    const corpus = structuredClone(draft37Registry);
    Reflect.set(corpus, 'units', {});

    const report = createCorpusReviewReport(corpus);

    expect(Object.values(report.counts).every((count) => count === 0)).toBe(true);
    expect(report.globalViolations).toContain('missing units');
  });

  it('parses escaped pipes structurally', () => {
    const text = [
      '# Review',
      '|ID|Source|Context|English|Русский draft|Русский replacement|O‘zbek draft|O‘zbek replacement|Task|Type|',
      '|-|-|-|-|-|-|-|-|-|-|',
      '|MLUX-C0050|src/a.ts:1|Test|A \\| B|Р \\| B||U \\| B||MLUX-004|Visible UI copy|',
    ].join('\n');
    expect(parseSuppliedReviewArtifact(text).rows[0]).toMatchObject({
      id: 'MLUX-C0050',
      english: 'A | B',
      ruDraft: 'Р | B',
      uzDraft: 'U | B',
    });
  });
});
