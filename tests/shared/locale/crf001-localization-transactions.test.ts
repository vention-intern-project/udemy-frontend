import { cp, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const {
  reviseDraftUnits,
  // @ts-expect-error The dependency-free Node localization module has no TypeScript declaration.
} = await import('../../../scripts/localization/draft-revision.mjs');
const {
  reconcileConsumerGrammar,
  // @ts-expect-error The dependency-free Node localization module has no TypeScript declaration.
} = await import('../../../scripts/localization/consumer-reconcile.mjs');
const {
  RECORDED_BASE,
  recoverRecordedBase,
  // @ts-expect-error The dependency-free Node localization module has no TypeScript declaration.
} = await import('../../../scripts/localization/recorded-base-recovery.mjs');
const {
  serializeGeneratedResources,
  // @ts-expect-error The dependency-free Node localization module has no TypeScript declaration.
} = await import('../../../scripts/localization/corpus-engine.mjs');
const {
  RECORDED_BASE_REQUEST,
  writeRecordedBaseArtifacts,
  // @ts-expect-error The dependency-free Node localization fixture has no TypeScript declaration.
} = await import('./fixtures/crf001-recorded-base-fixture.mjs');

interface TransactionTargets {
  readonly generatedBaselinePath: string;
  readonly directory: string;
  readonly outputPath: string;
  readonly registryBaselinePath: string;
  readonly registryPath: string;
}

interface SourceFixture {
  readonly sourceRoot: string;
}

interface ConsumerGrammarEntry {
  readonly sourceFingerprint: string;
  readonly sourcePath: string;
}

interface ConsumerGrammarFamily {
  readonly consumers: readonly ConsumerGrammarEntry[];
}

interface ConsumerGrammarFixture {
  readonly dynamicKeyFamilies: readonly ConsumerGrammarFamily[];
  readonly translatorDependencies: readonly ConsumerGrammarEntry[];
  readonly translatorForwarders: readonly ConsumerGrammarEntry[];
  readonly translatorWrappers: readonly ConsumerGrammarEntry[];
}

const temporaryDirectories: string[] = [];
const taskRequest = structuredClone(RECORDED_BASE_REQUEST);

async function createTargets(): Promise<TransactionTargets> {
  const directory = await mkdtemp(join(tmpdir(), 'learnhub-crf001-transaction-'));
  temporaryDirectories.push(directory);
  const registryPath = join(directory, 'registry.json');
  const outputPath = join(directory, 'generated-resources.ts');
  const registryBaselinePath = join(directory, 'recorded-registry.json');
  const generatedBaselinePath = join(directory, 'recorded-generated-resources.ts');
  await writeRecordedBaseArtifacts({ registryBaselinePath, generatedBaselinePath });
  await Promise.all([
    cp(registryBaselinePath, registryPath),
    cp(generatedBaselinePath, outputPath),
  ]);
  return {
    directory,
    registryPath,
    outputPath,
    registryBaselinePath,
    generatedBaselinePath,
  };
}

function recoveryRequestForTargets(targets: TransactionTargets, request = taskRequest) {
  return {
    ...request,
    registryBaselinePath: targets.registryBaselinePath,
    generatedBaselinePath: targets.generatedBaselinePath,
  };
}

async function createSourceFixture(): Promise<SourceFixture> {
  const sourceRoot = join(await mkdtemp(join(tmpdir(), 'learnhub-crf001-source-')), 'src');
  temporaryDirectories.push(dirname(sourceRoot));
  await cp(resolve('src'), sourceRoot, { recursive: true });
  return { sourceRoot };
}

async function readPair(targets: TransactionTargets): Promise<readonly [string, string]> {
  return Promise.all([
    readFile(targets.registryPath, 'utf8'),
    readFile(targets.outputPath, 'utf8'),
  ]);
}

async function reviseFromRecordedBase(targets: TransactionTargets): Promise<void> {
  await reviseDraftUnits({
    registryPath: targets.registryPath,
    outputPath: targets.outputPath,
    request: taskRequest.revisionRequest,
  });
}

async function reconcileFromRecordedBase(
  targets: TransactionTargets,
  sourceFixture: SourceFixture,
  request = taskRequest.reconcileRequest,
): Promise<unknown> {
  return reconcileConsumerGrammar({
    registryPath: targets.registryPath,
    outputPath: targets.outputPath,
    request,
    sourceRoot: sourceFixture.sourceRoot,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('CRF-001 localization transactions', () => {
  it('revises protected CRF sources transactionally, preserves identity/history and exactly replays', async () => {
    const targets = await createTargets();
    const [beforeRegistry] = await readPair(targets);
    const unrelatedUnit = beforeRegistry.match(/\{\n\s+"id": "MLUX-C0001"[\s\S]*?\n\s+\}/)?.[0];
    expect(unrelatedUnit).toBeDefined();

    await expect(reviseFromRecordedBase(targets)).resolves.toEqual(undefined);
    const [revisedRegistry, revisedOutput] = await readPair(targets);
    const revised = JSON.parse(revisedRegistry);
    expect(revised.units.filter((unit: { id: string }) => unit.id === 'MLUX-C0416')).toHaveLength(
      1,
    );
    const guidance = revised.units.find((unit: { id: string }) => unit.id === 'MLUX-C0416');
    expect(guidance).toMatchObject({
      id: 'MLUX-C0416',
      namespace: 'learning',
      key: 'mockPaymentAwaitingCompletion',
      migrationProvenance: { ownerTasks: expect.arrayContaining(['CRF-001']) },
    });
    expect(guidance.locales.ru.history.at(-1).type).toBe('draft_reset');
    expect(guidance.locales.uz.history.at(-1).type).toBe('draft_reset');
    expect(revisedOutput).toBe(serializeGeneratedResources(revised));
    expect(revisedRegistry).toContain(unrelatedUnit!);

    await expect(
      reviseDraftUnits({
        registryPath: targets.registryPath,
        outputPath: targets.outputPath,
        request: taskRequest.revisionRequest,
      }),
    ).resolves.toEqual({ revisedCount: 0, replayedCount: 4, wrote: false });
    expect(await readPair(targets)).toEqual([revisedRegistry, revisedOutput]);

    const rollbackTargets = await createTargets();
    const beforeRollback = await readPair(rollbackTargets);
    let renameCount = 0;
    await expect(
      reviseDraftUnits({
        registryPath: rollbackTargets.registryPath,
        outputPath: rollbackTargets.outputPath,
        request: taskRequest.revisionRequest,
        fileSystem: {
          rename: async (from: string, to: string) => {
            renameCount += 1;
            if (renameCount === 2) throw new Error('injected protected revision output failure');
            await rename(from, to);
          },
        },
      }),
    ).rejects.toThrow('injected protected revision output failure');
    expect(await readPair(rollbackTargets)).toEqual(beforeRollback);
  });

  it('reconciles only the exact CRF consumer graph, rejects stale inputs, and preserves unrelated bytes', async () => {
    const targets = await createTargets();
    const sourceFixture = await createSourceFixture();
    await reviseFromRecordedBase(targets);
    const beforeRegistry = await readFile(targets.registryPath, 'utf8');
    const unrelatedUnit = beforeRegistry.match(/\{\n\s+"id": "MLUX-C0001"[\s\S]*?\n\s+\}/)?.[0];
    expect(unrelatedUnit).toBeDefined();

    await expect(reconcileFromRecordedBase(targets, sourceFixture)).resolves.toMatchObject({
      reconciled: true,
      removedCount: 1,
      updatedEntries: expect.any(Number),
    });
    const reconciled = await readPair(targets);
    expect(reconciled[0]).toContain(unrelatedUnit!);
    const reconciledCorpus = JSON.parse(reconciled[0]);
    expect(
      reconciledCorpus.consumerGrammar.dynamicKeyFamilies
        .flatMap((family: ConsumerGrammarFamily) => family.consumers)
        .filter(
          (consumer: ConsumerGrammarEntry) =>
            consumer.sourcePath === 'pages/learning-list-page/LearningListPage.tsx',
        ),
    ).toEqual([
      {
        sourcePath: 'pages/learning-list-page/LearningListPage.tsx',
        functionName: 'LearningListPage',
        argument: 'failure.messageKey',
        occurrence: 1,
        sourceFingerprint:
          'sha256:8ebde6f65eb583569e1d0db37651996aa6ba1d80fcf305bde618c820b27a9b1a',
      },
      {
        sourcePath: 'pages/learning-list-page/LearningListPage.tsx',
        functionName: 'LearningListPage',
        argument: 'failure.titleKey',
        occurrence: 1,
        sourceFingerprint:
          'sha256:8ebde6f65eb583569e1d0db37651996aa6ba1d80fcf305bde618c820b27a9b1a',
      },
    ]);
    expect(reconciledCorpus.consumerGrammar.reconciliations).toEqual([
      expect.objectContaining({
        request: taskRequest.reconcileRequest,
        requestDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        sources: expect.arrayContaining([
          expect.objectContaining({
            sourcePath: 'pages/cart-page/CartPage.tsx',
            sourceFingerprint: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          }),
        ]),
      }),
    ]);
    await expect(reconcileFromRecordedBase(targets, sourceFixture)).resolves.toEqual({
      reconciled: false,
      removedCount: 0,
      updatedEntries: 0,
    });
    expect(await readPair(targets)).toEqual(reconciled);
    const staleReplayRequest = structuredClone(taskRequest.reconcileRequest);
    staleReplayRequest.sources[0].expectedSourceFingerprint = `sha256:${'0'.repeat(64)}`;
    await expect(
      reconcileFromRecordedBase(targets, sourceFixture, staleReplayRequest),
    ).rejects.toThrow(/stale expected source fingerprint/);
    expect(await readPair(targets)).toEqual(reconciled);

    const unprovenReplayTargets = await createTargets();
    const unprovenReplaySourceFixture = await createSourceFixture();
    await reviseFromRecordedBase(unprovenReplayTargets);
    await reconcileFromRecordedBase(unprovenReplayTargets, unprovenReplaySourceFixture);
    const unprovenReplayCorpus = JSON.parse(
      await readFile(unprovenReplayTargets.registryPath, 'utf8'),
    );
    Reflect.deleteProperty(unprovenReplayCorpus.consumerGrammar, 'reconciliations');
    await writeFile(
      unprovenReplayTargets.registryPath,
      `${JSON.stringify(unprovenReplayCorpus, null, 2)}\n`,
      'utf8',
    );
    const unprovenReplayPair = await readPair(unprovenReplayTargets);
    await expect(
      reconcileFromRecordedBase(unprovenReplayTargets, unprovenReplaySourceFixture),
    ).rejects.toThrow(/stale expected source fingerprint/);
    expect(await readPair(unprovenReplayTargets)).toEqual(unprovenReplayPair);
    const forgedCurrentFingerprintReplay = structuredClone(taskRequest.reconcileRequest);
    const unprovenGrammar = unprovenReplayCorpus.consumerGrammar as ConsumerGrammarFixture;
    for (const source of forgedCurrentFingerprintReplay.sources) {
      const entry = [
        ...unprovenGrammar.translatorWrappers,
        ...unprovenGrammar.translatorForwarders,
        ...unprovenGrammar.translatorDependencies,
        ...unprovenGrammar.dynamicKeyFamilies.flatMap((family) => family.consumers),
      ].find((candidate) => candidate.sourcePath === source.sourcePath);
      if (!entry) throw new Error(`replayed source fixture entry is missing: ${source.sourcePath}`);
      source.expectedSourceFingerprint = entry.sourceFingerprint;
    }
    await expect(
      reconcileFromRecordedBase(
        unprovenReplayTargets,
        unprovenReplaySourceFixture,
        forgedCurrentFingerprintReplay,
      ),
    ).rejects.toThrow(/obsolete identity is not exact/);
    expect(await readPair(unprovenReplayTargets)).toEqual(unprovenReplayPair);

    const forgedReplayTargets = await createTargets();
    const forgedReplaySourceFixture = await createSourceFixture();
    await reviseFromRecordedBase(forgedReplayTargets);
    await reconcileFromRecordedBase(forgedReplayTargets, forgedReplaySourceFixture);
    const forgedReplayCorpus = JSON.parse(await readFile(forgedReplayTargets.registryPath, 'utf8'));
    forgedReplayCorpus.consumerGrammar.reconciliations[0].request.sources[0].expectedSourceFingerprint = `sha256:${'0'.repeat(64)}`;
    await writeFile(
      forgedReplayTargets.registryPath,
      `${JSON.stringify(forgedReplayCorpus, null, 2)}\n`,
      'utf8',
    );
    const forgedReplayPair = await readPair(forgedReplayTargets);
    await expect(
      reconcileFromRecordedBase(forgedReplayTargets, forgedReplaySourceFixture),
    ).rejects.toThrow(/invalid consumer reconciliation provenance/);
    expect(await readPair(forgedReplayTargets)).toEqual(forgedReplayPair);

    const rejectedTargets = await createTargets();
    const rejectedSourceFixture = await createSourceFixture();
    await reviseFromRecordedBase(rejectedTargets);
    const rejectedBefore = await readPair(rejectedTargets);
    const staleRequest = structuredClone(taskRequest.reconcileRequest);
    staleRequest.sources[0].expectedSourceFingerprint = `sha256:${'0'.repeat(64)}`;
    await expect(
      reconcileFromRecordedBase(rejectedTargets, rejectedSourceFixture, staleRequest),
    ).rejects.toThrow(/stale expected source fingerprint/);
    const invalidObsoleteRequest = structuredClone(taskRequest.reconcileRequest);
    invalidObsoleteRequest.obsolete[0].bindingName = 'not-the-recorded-binding';
    await expect(
      reconcileFromRecordedBase(rejectedTargets, rejectedSourceFixture, invalidObsoleteRequest),
    ).rejects.toThrow(/obsolete identity is not exact/);
    expect(await readPair(rejectedTargets)).toEqual(rejectedBefore);

    let renameCount = 0;
    await expect(
      reconcileConsumerGrammar({
        registryPath: rejectedTargets.registryPath,
        outputPath: rejectedTargets.outputPath,
        request: taskRequest.reconcileRequest,
        sourceRoot: rejectedSourceFixture.sourceRoot,
        fileSystem: {
          rename: async (from: string, to: string) => {
            renameCount += 1;
            if (renameCount === 2) throw new Error('injected reconcile output failure');
            await rename(from, to);
          },
        },
      }),
    ).rejects.toThrow('injected reconcile output failure');
    expect(await readPair(rejectedTargets)).toEqual(rejectedBefore);
  }, 120_000);

  it('reconstructs the recorded base exactly, rejects semantic drift, and rolls back paired recovery writes', async () => {
    const rejectedRequests = [
      (() => {
        const request = structuredClone(taskRequest);
        request.revisionRequest.taskId = 'CRF-002';
        return request;
      })(),
      (() => {
        const request = structuredClone(taskRequest);
        const addedRevision = structuredClone(request.revisionRequest.revisions[0]);
        addedRevision.id = 'MLUX-C0001';
        request.revisionRequest.revisions.push(addedRevision);
        return request;
      })(),
      (() => {
        const request = structuredClone(taskRequest);
        request.revisionRequest.revisions.pop();
        return request;
      })(),
      (() => {
        const request = structuredClone(taskRequest);
        request.revisionRequest.revisions[0].english = 'Altered protected revision content';
        return request;
      })(),
      (() => {
        const request = structuredClone(taskRequest);
        request.reconcileRequest.sources[0].sourcePath = 'pages/unapproved-source.tsx';
        return request;
      })(),
      (() => {
        const request = structuredClone(taskRequest);
        request.reconcileRequest.sources[0].expectedSourceFingerprint = `sha256:${'0'.repeat(64)}`;
        return request;
      })(),
      (() => {
        const request = structuredClone(taskRequest);
        request.reconcileRequest.obsolete[0].bindingName = 'unapprovedBinding';
        return request;
      })(),
    ];
    for (const rejectedRequest of rejectedRequests) {
      const rejectedTargets = await createTargets();
      const beforeRejectedRequest = await readPair(rejectedTargets);
      await expect(
        recoverRecordedBase({
          registryPath: rejectedTargets.registryPath,
          outputPath: rejectedTargets.outputPath,
          request: recoveryRequestForTargets(rejectedTargets, rejectedRequest),
          sourceRoot: join(rejectedTargets.directory, 'unused-source-root'),
        }),
      ).rejects.toThrow(/approved CRF-001 delta/);
      expect(await readPair(rejectedTargets)).toEqual(beforeRejectedRequest);
    }

    const targets = await createTargets();
    const sourceFixture = await createSourceFixture();
    await reviseFromRecordedBase(targets);
    await reconcileFromRecordedBase(targets, sourceFixture);
    const [targetRegistry, targetOutput] = await readPair(targets);
    await writeFile(
      targets.registryPath,
      `${JSON.stringify(JSON.parse(targetRegistry), null, 2)}\n`,
      'utf8',
    );

    await expect(
      recoverRecordedBase({
        registryPath: targets.registryPath,
        outputPath: targets.outputPath,
        request: recoveryRequestForTargets(targets),
        sourceRoot: sourceFixture.sourceRoot,
      }),
    ).resolves.toEqual({ recovered: true, wrote: true });
    expect(await readPair(targets)).toEqual([targetRegistry, targetOutput]);
    await expect(
      recoverRecordedBase({
        registryPath: targets.registryPath,
        outputPath: targets.outputPath,
        request: recoveryRequestForTargets(targets),
        sourceRoot: sourceFixture.sourceRoot,
      }),
    ).resolves.toEqual({ recovered: false, wrote: false });

    const drifted = JSON.parse(targetRegistry);
    drifted.units
      .find((unit: { id: string }) => unit.id === 'MLUX-C0001')
      .migrationProvenance.ownerTasks.push('CRF-999');
    await writeFile(targets.registryPath, `${JSON.stringify(drifted, null, 2)}\n`, 'utf8');
    await writeFile(targets.outputPath, serializeGeneratedResources(drifted), 'utf8');
    const driftedPair = await readPair(targets);
    await expect(
      recoverRecordedBase({
        registryPath: targets.registryPath,
        outputPath: targets.outputPath,
        request: recoveryRequestForTargets(targets),
        sourceRoot: sourceFixture.sourceRoot,
      }),
    ).rejects.toThrow(/semantic drift/);
    expect(await readPair(targets)).toEqual(driftedPair);

    await writeFile(
      targets.registryPath,
      `${JSON.stringify(JSON.parse(targetRegistry), null, 2)}\n`,
      'utf8',
    );
    const grammarDriftSource = join(sourceFixture.sourceRoot, 'pages/cart-page/CartPage.tsx');
    await writeFile(grammarDriftSource, `${await readFile(grammarDriftSource, 'utf8')}\n`, 'utf8');
    const grammarDriftPair = await readPair(targets);
    await expect(
      recoverRecordedBase({
        registryPath: targets.registryPath,
        outputPath: targets.outputPath,
        request: recoveryRequestForTargets(targets),
        sourceRoot: sourceFixture.sourceRoot,
      }),
    ).rejects.toThrow(/consumer grammar does not match the approved CRF-001 delta/);
    expect(await readPair(targets)).toEqual(grammarDriftPair);

    await writeFile(
      targets.registryPath,
      `${JSON.stringify(JSON.parse(targetRegistry), null, 2)}\n`,
      'utf8',
    );
    const beforeRollback = await readPair(targets);
    const rollbackSourceFixture = await createSourceFixture();
    let renameCount = 0;
    await expect(
      recoverRecordedBase({
        registryPath: targets.registryPath,
        outputPath: targets.outputPath,
        request: recoveryRequestForTargets(targets),
        sourceRoot: rollbackSourceFixture.sourceRoot,
        fileSystem: {
          rename: async (from: string, to: string) => {
            renameCount += 1;
            if (renameCount === 2) throw new Error('injected recovery output failure');
            await rename(from, to);
          },
        },
      }),
    ).rejects.toThrow('injected recovery output failure');
    expect(await readPair(targets)).toEqual(beforeRollback);
    expect(RECORDED_BASE).toEqual(taskRequest.base);
  }, 45_000);
});
