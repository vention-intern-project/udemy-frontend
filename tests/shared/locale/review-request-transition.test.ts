import {
  copyFile,
  link,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import draft37Registry from '../../../localization/corpus/registry.json';

const {
  exportReviewPack,
  parseReviewCsv,
  // @ts-expect-error The dependency-free Node localization module has no TypeScript declaration.
} = await import('../../../scripts/localization/review-exchange.mjs');
const {
  requestLocaleReviews,
  // @ts-expect-error The dependency-free Node localization module has no TypeScript declaration.
} = await import('../../../scripts/localization/review-request-transition.mjs');
const {
  SUPPLIED_REVIEW_ARTIFACT,
  requestLocaleCandidateReview,
  transitionLocaleCandidate,
  validateCorpus,
  // @ts-expect-error The dependency-free Node engine has no TypeScript declaration.
} = await import('../../../scripts/localization/corpus-engine.mjs');

const LIVE_OUTPUT = resolve('src/shared/locale/generated-resources.ts');
const REQUESTED_AT = '2026-08-29T12:34:56.789Z';
const TASK_ID = 'CRF-001';
const UNIT_IDS = ['MLUX-C0109', 'MLUX-C0119', 'MLUX-C0386', 'MLUX-C0416'];
const runProcess = promisify(execFile);

interface Targets {
  readonly directory: string;
  readonly outputPath: string;
  readonly registryPath: string;
}

type ReviewRequestFixtureState = 'draft' | 'requested';

const temporaryDirectories: string[] = [];

function exactReviewRequestBoundary() {
  return {
    taskId: TASK_ID,
    locales: ['ru', 'uz'],
    unitIds: UNIT_IDS,
    requestedAt: REQUESTED_AT,
  };
}

function prepareReviewRequestFixture(
  corpus: typeof draft37Registry,
  state: ReviewRequestFixtureState,
) {
  for (const id of UNIT_IDS) {
    const unit = corpus.units.find((entry) => entry.id === id);
    if (!unit) throw new Error(`review-request fixture unit is missing: ${id}`);
    for (const locale of ['ru', 'uz'] as const) {
      const candidate = unit.locales[locale];
      const terminal = candidate.history[candidate.history.length - 1];
      if (
        terminal?.type !== 'transition' ||
        terminal.from !== 'draft' ||
        terminal.to !== 'review_requested'
      )
        throw new Error(`review-request fixture boundary is not requested: ${id}/${locale}`);
      if (state === 'draft') {
        candidate.status = 'draft';
        candidate.requestedAt = null;
        candidate.history = candidate.history.slice(0, -1);
      } else {
        candidate.requestedAt = REQUESTED_AT;
        terminal.reviewRequest = exactReviewRequestBoundary();
      }
    }
  }
}

async function createTargets(state: ReviewRequestFixtureState = 'draft'): Promise<Targets> {
  const directory = await mkdtemp(join(tmpdir(), 'learnhub-review-request-'));
  temporaryDirectories.push(directory);
  const registryPath = join(directory, 'registry.json');
  const outputPath = join(directory, 'generated-resources.ts');
  const corpus = structuredClone(draft37Registry);
  prepareReviewRequestFixture(corpus, state);
  await Promise.all([
    writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8'),
    copyFile(LIVE_OUTPUT, outputPath),
  ]);
  return { directory, registryPath, outputPath };
}

async function readPair(targets: Targets): Promise<readonly [string, string]> {
  return Promise.all([
    readFile(targets.registryPath, 'utf8'),
    readFile(targets.outputPath, 'utf8'),
  ]);
}

function request(overrides: Partial<Parameters<typeof requestLocaleReviews>[0]> = {}) {
  return {
    taskId: TASK_ID,
    locales: ['ru', 'uz'],
    unitIds: UNIT_IDS,
    requestedAt: REQUESTED_AT,
    ...overrides,
  };
}

function engineReviewRequest() {
  return {
    taskId: 'FE-067',
    locales: ['ru'],
    unitIds: ['MLUX-C0001'],
    requestedAt: REQUESTED_AT,
  };
}

function historicalSuppliedArtifactLegacy() {
  const corpus = structuredClone(draft37Registry);
  const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
  if (!unit) throw new Error('canonical historical legacy fixture unit is missing');
  const requested = requestLocaleCandidateReview(unit.locales.ru, engineReviewRequest());
  const approvalRecordedAt = '2026-08-29T12:35:56.789Z';
  const legacy = {
    ...requested,
    status: 'approved',
    verdict: 'approved',
    reviewerId: null,
    reviewedAt: null,
    approvalRecordedAt,
    approvalAuthority: { ...SUPPLIED_REVIEW_ARTIFACT },
    history: [
      ...requested.history,
      {
        type: 'transition',
        from: 'review_requested',
        to: 'approved',
        previousCandidate: requested.candidate,
        nextCandidate: requested.candidate,
        sourceRevision: requested.sourceRevision,
        suppliedArtifactApproval: {
          reviewerId: null,
          reviewedAt: null,
          approvalRecordedAt,
          approvalAuthority: { ...SUPPLIED_REVIEW_ARTIFACT },
        },
      },
    ],
  };
  delete (legacy.history[0] as { reviewRequest?: unknown }).reviewRequest;
  legacy.requestedAt = null;
  unit.locales.ru = legacy;
  return { corpus, legacy, unit };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('public review-request transition', () => {
  it('requires request evidence for writable engine transitions while reading bounded legacy supplied-artifact history', () => {
    const corpus = structuredClone(draft37Registry);
    const unit = corpus.units.find(({ id }) => id === 'MLUX-C0001');
    if (!unit) throw new Error('fixture unit is missing');
    const candidate = unit.locales.ru;

    expect(() => transitionLocaleCandidate(candidate, 'review_requested')).toThrow(
      'review_requested requires an exact request boundary',
    );
    expect(() => requestLocaleCandidateReview(candidate, undefined)).toThrow(
      'review_requested requires an exact request boundary',
    );
    expect(() =>
      transitionLocaleCandidate(candidate, 'review_requested', {
        reviewRequest: { ...engineReviewRequest(), requestedAt: 'not-an-instant' },
      }),
    ).toThrow('review_requested requires an exact request boundary');

    const requested = requestLocaleCandidateReview(candidate, engineReviewRequest());
    expect(requested).toMatchObject({ status: 'review_requested', requestedAt: REQUESTED_AT });
    expect(requested.history.at(-1)).toMatchObject({ reviewRequest: engineReviewRequest() });

    const wrongUnitRequest = structuredClone(requested);
    (
      wrongUnitRequest.history.at(-1) as { reviewRequest: { unitIds: string[] } }
    ).reviewRequest.unitIds = ['MLUX-C0002'];
    unit.locales.ru = wrongUnitRequest;
    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const wrongLocaleRequest = structuredClone(requested);
    (
      wrongLocaleRequest.history.at(-1) as { reviewRequest: { locales: string[] } }
    ).reviewRequest.locales = ['uz'];
    unit.locales.ru = wrongLocaleRequest;
    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const missingRequest = structuredClone(requested);
    delete (missingRequest.history.at(-1) as { reviewRequest?: unknown }).reviewRequest;
    unit.locales.ru = missingRequest;
    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const contradictoryRequest = structuredClone(requested);
    (
      contradictoryRequest.history.at(-1) as { reviewRequest: { requestedAt: string } }
    ).reviewRequest.requestedAt = '2026-08-29T12:34:56.790Z';
    unit.locales.ru = contradictoryRequest;
    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru review-requested candidate does not match terminal request evidence',
    );

    const historicalLegacy = historicalSuppliedArtifactLegacy();
    expect(validateCorpus(historicalLegacy.corpus)).toEqual([]);

    const alteredProvenance = historicalSuppliedArtifactLegacy();
    alteredProvenance.unit.migrationProvenance.ownerTasks = ['MLUX-003'];
    expect(validateCorpus(alteredProvenance.corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const alteredIdentity = historicalSuppliedArtifactLegacy();
    alteredIdentity.unit.id = 'MLUX-C0002';
    expect(validateCorpus(alteredIdentity.corpus)).toContain(
      'MLUX-C0002: ru review-request history lacks an exact request boundary',
    );

    const alteredSourceRevision = historicalSuppliedArtifactLegacy();
    alteredSourceRevision.unit.sourceRevision =
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    alteredSourceRevision.legacy.sourceRevision = alteredSourceRevision.unit.sourceRevision;
    for (const event of alteredSourceRevision.legacy.history)
      event.sourceRevision = alteredSourceRevision.unit.sourceRevision;
    expect(validateCorpus(alteredSourceRevision.corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const alteredRequestedAt = historicalSuppliedArtifactLegacy();
    alteredRequestedAt.legacy.requestedAt = '2026-08-29T12:34:56.789Z';
    expect(validateCorpus(alteredRequestedAt.corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const alteredApprovalAuthority = historicalSuppliedArtifactLegacy();
    alteredApprovalAuthority.legacy.approvalAuthority = {
      ...alteredApprovalAuthority.legacy.approvalAuthority,
      artifactName: 'forged.md',
    };
    expect(validateCorpus(alteredApprovalAuthority.corpus)).toEqual([
      'MLUX-C0001: ru approved candidate lacks internally consistent supplied-artifact authority',
      'MLUX-C0001: ru approved candidate lacks supplied-artifact authority',
    ]);

    const alteredApprovalAdjacency = historicalSuppliedArtifactLegacy();
    alteredApprovalAdjacency.legacy.history.splice(1, 0, {
      type: 'transition',
      from: 'review_requested',
      to: 'draft',
      previousCandidate: alteredApprovalAdjacency.legacy.candidate,
      nextCandidate: alteredApprovalAdjacency.legacy.candidate,
      sourceRevision: alteredApprovalAdjacency.legacy.sourceRevision,
      withdrawal: true,
    });
    expect(validateCorpus(alteredApprovalAdjacency.corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const alteredHistoryKeys = historicalSuppliedArtifactLegacy();
    (alteredHistoryKeys.legacy.history[0] as { forged?: boolean }).forged = true;
    expect(validateCorpus(alteredHistoryKeys.corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );

    const alteredSuppliedArtifactRecord = historicalSuppliedArtifactLegacy();
    (
      alteredSuppliedArtifactRecord.legacy.history[1] as {
        suppliedArtifactApproval: { approvalAuthority: { artifactSha256: string } };
      }
    ).suppliedArtifactApproval.approvalAuthority.artifactSha256 = '0'.repeat(64).toUpperCase();
    expect(validateCorpus(alteredSuppliedArtifactRecord.corpus)).toContain(
      'MLUX-C0001: ru review-request history lacks an exact request boundary',
    );
  });

  it('requests only the explicit CRF-001 draft boundary, preserves unrelated source bytes, and exports reviewable rows', async () => {
    const targets = await createTargets();
    const [beforeRegistry, beforeOutput] = await readPair(targets);
    const unrelatedUnit = beforeRegistry.match(/\{\n\s+"id": "MLUX-C0001"[\s\S]*?\n\s+\}/)?.[0];
    expect(unrelatedUnit).toBeDefined();

    await expect(requestLocaleReviews({ ...request(), ...targets })).resolves.toEqual({
      requestedCount: 8,
      replayedCount: 0,
      wrote: true,
    });

    const [afterRegistry, afterOutput] = await readPair(targets);
    const after = JSON.parse(afterRegistry);
    for (const id of UNIT_IDS) {
      const unit = after.units.find((entry: { id: string }) => entry.id === id);
      for (const locale of ['ru', 'uz']) {
        expect(unit.locales[locale]).toMatchObject({
          status: 'review_requested',
          requestedAt: REQUESTED_AT,
          reviewerId: null,
          verdict: null,
          reviewedAt: null,
          approvalRecordedAt: null,
        });
        expect(unit.locales[locale].history.at(-1)).toMatchObject({
          type: 'transition',
          from: 'draft',
          to: 'review_requested',
          sourceRevision: unit.sourceRevision,
          reviewRequest: {
            taskId: TASK_ID,
            locales: ['ru', 'uz'],
            unitIds: UNIT_IDS,
            requestedAt: REQUESTED_AT,
          },
        });
      }
    }
    expect(afterRegistry).toContain(unrelatedUnit!);
    expect(afterOutput).toBe(beforeOutput);

    const packPath = join(targets.directory, 'ru.csv');
    await exportReviewPack({
      registryPath: targets.registryPath,
      outputPath: packPath,
      taskId: TASK_ID,
      locales: ['ru'],
      unitIds: UNIT_IDS,
    });
    for (const row of parseReviewCsv(await readFile(packPath, 'utf8')).rows) {
      expect(row).toMatchObject({ status: 'review_requested', requestedAt: REQUESTED_AT });
    }
  });

  it('is no-write only for an exact task, sorted boundary, locales, and requestedAt replay', async () => {
    const targets = await createTargets('requested');
    const requestedPair = await readPair(targets);

    await expect(requestLocaleReviews({ ...request(), ...targets })).resolves.toEqual({
      requestedCount: 0,
      replayedCount: 8,
      wrote: false,
    });
    expect(await readPair(targets)).toEqual(requestedPair);

    for (const conflicting of [
      request({ requestedAt: '2026-08-29T12:34:56.790Z' }),
      request({ locales: ['ru'] }),
      request({ unitIds: UNIT_IDS.slice(0, 3) }),
      request({ unitIds: [...UNIT_IDS].reverse() }),
    ])
      await expect(requestLocaleReviews({ ...conflicting, ...targets })).rejects.toThrow();
    expect(await readPair(targets)).toEqual(requestedPair);
  });

  it('fails closed for malformed inputs, aliases, generated drift, and unowned/non-draft candidates', async () => {
    const targets = await createTargets();
    const before = await readPair(targets);
    const invalidRequests = [
      request({ taskId: 'CRF-01' }),
      request({ locales: [] }),
      request({ locales: ['ru', 'ru'] }),
      request({ unitIds: [] }),
      request({ unitIds: [...UNIT_IDS, UNIT_IDS[0]] }),
      request({ unitIds: ['MLUX-C0001'] }),
      request({ requestedAt: '2026-08-29T12:34:56Z' }),
      request({ requestedAt: 'not-a-time' }),
    ];
    for (const invalid of invalidRequests)
      await expect(requestLocaleReviews({ ...invalid, ...targets })).rejects.toThrow();
    await expect(
      requestLocaleReviews({
        ...request(),
        registryPath: targets.registryPath,
        outputPath: targets.registryPath,
      }),
    ).rejects.toThrow(/distinct file targets/);
    const hardLinkPath = join(targets.directory, 'registry-hard-link.json');
    await link(targets.registryPath, hardLinkPath);
    await expect(
      requestLocaleReviews({
        ...request(),
        registryPath: targets.registryPath,
        outputPath: hardLinkPath,
      }),
    ).rejects.toThrow(/distinct file targets/);
    expect(await readPair(targets)).toEqual(before);

    await writeFile(targets.outputPath, 'drifted output', 'utf8');
    const drifted = await readPair(targets);
    await expect(requestLocaleReviews({ ...request(), ...targets })).rejects.toThrow(
      /generated output/,
    );
    expect(await readPair(targets)).toEqual(drifted);

    await writeFile(targets.outputPath, before[1], 'utf8');
    await requestLocaleReviews({ ...request(), ...targets });
    const requestedPair = await readPair(targets);
    await expect(requestLocaleReviews({ ...request(), ...targets })).resolves.toMatchObject({
      wrote: false,
    });
    expect(await readPair(targets)).toEqual(requestedPair);
  });

  it('rolls back both targets and removes temporary files when the generated rename fails', async () => {
    const targets = await createTargets();
    const before = await readPair(targets);
    let renameCount = 0;

    await expect(
      requestLocaleReviews({
        ...request(),
        ...targets,
        fileSystem: {
          rename: async (from: string, to: string) => {
            renameCount += 1;
            if (renameCount === 2) throw new Error('injected review-request output failure');
            await rename(from, to);
          },
        },
      }),
    ).rejects.toThrow('injected review-request output failure');
    expect(await readPair(targets)).toEqual(before);
    expect(await readdir(targets.directory)).not.toContainEqual(expect.stringContaining('.tmp'));
  });

  it('rejects malformed unit-ID files and incomplete public CLI arguments without mutation', async () => {
    const targets = await createTargets();
    const idsPath = join(targets.directory, 'unit-ids.json');
    const before = await readPair(targets);
    await writeFile(idsPath, '{not-json', 'utf8');

    await expect(
      runProcess(process.execPath, [
        resolve('scripts/localization/review-request.mjs'),
        targets.registryPath,
        targets.outputPath,
        TASK_ID,
        'ru,uz',
        idsPath,
        REQUESTED_AT,
      ]),
    ).rejects.toThrow();
    await expect(
      runProcess(process.execPath, [resolve('scripts/localization/review-request.mjs')]),
    ).rejects.toThrow(/usage: review-request/);
    expect(await readPair(targets)).toEqual(before);
  });
});
