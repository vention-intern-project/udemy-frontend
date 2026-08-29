import { link, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import registry from '../../../localization/corpus/registry.json';

const {
  registerDraftUnits,
  serializeDraftRegistry,
  // @ts-expect-error The dependency-free Node registration module has no TypeScript declaration.
} = await import('../../../scripts/localization/draft-registration.mjs');
const {
  protectedSourceFingerprint,
  validateCorpus,
  // @ts-expect-error The dependency-free Node engine intentionally has no TypeScript declaration.
} = await import('../../../scripts/localization/corpus-engine.mjs');

const temporaryDirectories: string[] = [];
const TASK_ID = 'FE-015';
const ADMITTED_UNIT_IDS = new Set([
  'MLUX-C0527',
  'MLUX-C0528',
  'MLUX-C0529',
  'MLUX-C0530',
  'MLUX-C0531',
  'MLUX-C0532',
]);
const INPUT_UNITS = [
  {
    namespace: 'instructor',
    key: 'lessonEditorUploadStatusQueued',
    english: 'Queued',
    ru: 'В очереди',
    uz: 'Navbatda',
    context:
      'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx — upload status queued label',
  },
  {
    namespace: 'instructor',
    key: 'lessonEditorUploadStatusProcessing',
    english: 'Processing',
    ru: 'Обрабатывается',
    uz: 'Qayta ishlanmoqda',
    context:
      'src/pages/instructor-lesson-editor-page/InstructorLessonEditorPage.tsx — upload status processing label',
  },
];

function preRegistrationFixture() {
  const corpus = structuredClone(registry);
  corpus.units = corpus.units.filter((unit) => !ADMITTED_UNIT_IDS.has(unit.id));
  corpus.summary = {
    ...corpus.summary,
    translationUnits: corpus.units.length,
    sourceOccurrences: corpus.units.flatMap((unit) => unit.occurrences).length,
    russianDrafts: corpus.units.filter((unit) => unit.locales.ru.status === 'draft').length,
    uzbekDrafts: corpus.units.filter((unit) => unit.locales.uz.status === 'draft').length,
  };
  return corpus;
}

function expectedIds(corpus: ReturnType<typeof preRegistrationFixture>) {
  const unit =
    Math.max(
      ...corpus.units
        .filter((candidate) => /^MLUX-C\d{4}$/.test(candidate.id))
        .map((candidate) => Number(candidate.id.slice(-4))),
    ) + 1;
  const occurrence =
    Math.max(
      ...corpus.units
        .flatMap((candidate) => candidate.occurrences)
        .filter((candidate) => /^MLUX-O\d{4}$/.test(candidate.id))
        .map((candidate) => Number(candidate.id.slice(-4))),
    ) + 1;
  return INPUT_UNITS.map((_, index) => ({
    unit: `MLUX-C${String(unit + index).padStart(4, '0')}`,
    occurrence: `MLUX-O${String(occurrence + index).padStart(4, '0')}`,
  }));
}

async function temporaryTargets(corpus = preRegistrationFixture()) {
  const directory = await mkdtemp(join(tmpdir(), 'learnhub-draft-register-'));
  temporaryDirectories.push(directory);
  const registryPath = join(directory, 'registry.json');
  const outputPath = join(directory, 'generated-resources.ts');
  await writeFile(registryPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
  await writeFile(outputPath, '// prior generated output\n', 'utf8');
  return { directory, registryPath, outputPath, corpus };
}

function exhaustedFixture() {
  const corpus = preRegistrationFixture();
  const source = corpus.units.find((unit) => unit.id === 'MLUX-C0001');
  if (!source) throw new Error('draft registration fixture requires MLUX-C0001');
  const terminal = structuredClone(source);
  terminal.id = 'MLUX-C9999';
  terminal.key = 'draftRegistrationExhaustedId';
  terminal.english = 'Exhausted ID fixture';
  terminal.occurrences = [
    {
      id: 'MLUX-O9999',
      context: 'src/shared/locale/i18n.ts — draft registration ID exhaustion fixture',
    },
  ];
  terminal.renderingContract = null;
  terminal.placeholdersByLocale = { en: [], ru: [], uz: [] };
  terminal.locales.ru.candidate = 'Черновик исчерпания идентификатора';
  terminal.locales.uz.candidate = 'Identifikator tugash qoralamasi';
  terminal.migrationProvenance.ownerTasks = [TASK_ID];
  terminal.sourceRevision = '';
  terminal.sourceRevision = protectedSourceFingerprint(terminal);
  terminal.locales.ru.sourceRevision = terminal.sourceRevision;
  terminal.locales.uz.sourceRevision = terminal.sourceRevision;
  corpus.units.push(terminal);
  corpus.summary = {
    ...corpus.summary,
    translationUnits: corpus.units.length,
    sourceOccurrences: corpus.units.flatMap((unit) => unit.occurrences).length,
    russianDrafts: corpus.units.filter((unit) => unit.locales.ru.status === 'draft').length,
    uzbekDrafts: corpus.units.filter((unit) => unit.locales.uz.status === 'draft').length,
  };
  return corpus;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('draft registration', () => {
  it('registers multi-unit drafts from a frozen pre-registration fixture and exactly replays bytes', async () => {
    const { registryPath, outputPath, corpus } = await temporaryTargets();
    const ids = expectedIds(corpus);

    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).resolves.toEqual({ created: ids.map(({ unit }) => unit), reused: [] });

    const registeredSource = await readFile(registryPath, 'utf8');
    const next = JSON.parse(registeredSource);
    expect(next.units.slice(-2).map((unit: { id: string }) => unit.id)).toEqual(
      ids.map(({ unit }) => unit),
    );
    expect(
      next.units
        .slice(-2)
        .map((unit: { occurrences: Array<{ id: string }> }) => unit.occurrences[0]?.id),
    ).toEqual(ids.map(({ occurrence }) => occurrence));
    expect(next.summary).toMatchObject({
      translationUnits: corpus.summary.translationUnits + INPUT_UNITS.length,
      sourceOccurrences: corpus.summary.sourceOccurrences + INPUT_UNITS.length,
      russianDrafts: corpus.summary.russianDrafts + INPUT_UNITS.length,
      uzbekDrafts: corpus.summary.uzbekDrafts + INPUT_UNITS.length,
    });
    expect(
      next.units
        .slice(-2)
        .every(
          (unit: { locales: Record<string, { status: string; verdict: null }> }) =>
            unit.locales.ru.status === 'draft' &&
            unit.locales.uz.status === 'draft' &&
            unit.locales.ru.verdict === null &&
            unit.locales.uz.verdict === null,
        ),
    ).toBe(true);
    expect(await readFile(outputPath, 'utf8')).toContain('lessonEditorUploadStatusQueued');

    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).resolves.toEqual({ created: [], reused: ids.map(({ unit }) => unit) });
    expect(await readFile(registryPath, 'utf8')).toBe(registeredSource);
  });

  it('preserves existing registry bytes while changing only summary counts and appended units', () => {
    const corpus = {
      summary: {
        translationUnits: 1,
        sourceOccurrences: 1,
        russianDrafts: 1,
        uzbekDrafts: 1,
        fixed: 'unchanged',
      },
      units: [{ id: 'MLUX-C0001', ownerTasks: ['MLUX-002'], placeholders: ['identity'] }],
    };
    const source = `{\n  "summary": {\n    "translationUnits": 1,\n    "sourceOccurrences": 1,\n    "russianDrafts": 1,\n    "uzbekDrafts": 1,\n    "fixed": "unchanged"\n  },\n  "units": [\n    {\n      "id": "MLUX-C0001",\n      "ownerTasks": ["MLUX-002"],\n      "placeholders": ["identity"]\n    }\n  ]\n}\n`;
    const next = {
      ...structuredClone(corpus),
      summary: {
        ...corpus.summary,
        translationUnits: 2,
        sourceOccurrences: 2,
        russianDrafts: 2,
        uzbekDrafts: 2,
      },
      units: [...corpus.units, { id: 'MLUX-C0002', ownerTasks: ['FE-015'], placeholders: [] }],
    };

    const serialized = serializeDraftRegistry({ source, corpus, next });
    expect(serialized).toContain('"ownerTasks": ["MLUX-002"]');
    expect(serialized).toContain('"placeholders": ["identity"]');
    expect(serialized).toContain('"ownerTasks": ["FE-015"]');
    expect(serialized).toContain('"fixed": "unchanged"');
  });

  it('updates only direct top-level summary counts when nested lookalikes precede them', async () => {
    const baseline = preRegistrationFixture();
    const shadow = {
      translationUnits: baseline.summary.translationUnits,
      sourceOccurrences: baseline.summary.sourceOccurrences,
      russianDrafts: baseline.summary.russianDrafts,
      uzbekDrafts: baseline.summary.uzbekDrafts,
    };
    const corpus = { shadow: { summary: shadow }, ...baseline };
    const { registryPath, outputPath } = await temporaryTargets(corpus);

    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).resolves.toEqual({
      created: expectedIds(corpus).map(({ unit }) => unit),
      reused: [],
    });

    const next = JSON.parse(await readFile(registryPath, 'utf8'));
    expect(next.shadow.summary).toEqual(shadow);
    expect(next.summary).toMatchObject({
      translationUnits: corpus.summary.translationUnits + INPUT_UNITS.length,
      sourceOccurrences: corpus.summary.sourceOccurrences + INPUT_UNITS.length,
      russianDrafts: corpus.summary.russianDrafts + INPUT_UNITS.length,
      uzbekDrafts: corpus.summary.uzbekDrafts + INPUT_UNITS.length,
    });
    expect(validateCorpus(next)).toEqual([]);
  });

  it('fails closed without writes for duplicate or structurally drifted serializer anchors', async () => {
    const { registryPath, outputPath, corpus } = await temporaryTargets();
    const baseline = await readFile(registryPath, 'utf8');
    const beforeOutput = await readFile(outputPath);
    const duplicateSummary = baseline.replace(
      '  "summary": {',
      `  "summary": {"translationUnits": ${corpus.summary.translationUnits}, "sourceOccurrences": ${corpus.summary.sourceOccurrences}, "russianDrafts": ${corpus.summary.russianDrafts}, "uzbekDrafts": ${corpus.summary.uzbekDrafts}},\n  "summary": {`,
    );
    await writeFile(registryPath, duplicateSummary, 'utf8');
    const beforeDuplicateSummary = await readFile(registryPath);
    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).rejects.toThrow(/duplicate direct property "summary"/);
    expect(await readFile(registryPath)).toEqual(beforeDuplicateSummary);
    expect(await readFile(outputPath)).toEqual(beforeOutput);

    const duplicateCount = baseline.replace(
      `"translationUnits": ${corpus.summary.translationUnits}`,
      `"translationUnits": ${corpus.summary.translationUnits},\n    "translationUnits": ${corpus.summary.translationUnits}`,
    );
    await writeFile(registryPath, duplicateCount, 'utf8');
    const beforeDuplicateCount = await readFile(registryPath);
    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).rejects.toThrow(/duplicate direct property "translationUnits"/);
    expect(await readFile(registryPath)).toEqual(beforeDuplicateCount);
    expect(await readFile(outputPath)).toEqual(beforeOutput);

    expect(() =>
      serializeDraftRegistry({
        source: '{"nested":{"summary":{}},"units":[]}',
        corpus,
        next: { ...corpus, units: [...corpus.units, corpus.units[0]] },
      }),
    ).toThrow(/missing direct top-level property "summary"/);
  }, 20_000);

  it('rejects duplicate direct anchors before an exact replay can report success', async () => {
    const { registryPath, outputPath } = await temporaryTargets();
    await registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS });
    const registeredSource = await readFile(registryPath, 'utf8');
    const registeredCorpus = JSON.parse(registeredSource);
    const registeredOutput = await readFile(outputPath);
    const duplicateSummary = registeredSource.replace(
      '  "summary": {',
      `  "summary": {"translationUnits": ${registeredCorpus.summary.translationUnits}, "sourceOccurrences": ${registeredCorpus.summary.sourceOccurrences}, "russianDrafts": ${registeredCorpus.summary.russianDrafts}, "uzbekDrafts": ${registeredCorpus.summary.uzbekDrafts}},\n  "summary": {`,
    );
    await writeFile(registryPath, duplicateSummary, 'utf8');
    const beforeDuplicateSummary = await readFile(registryPath);
    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).rejects.toThrow(/duplicate direct property "summary"/);
    expect(await readFile(registryPath)).toEqual(beforeDuplicateSummary);
    expect(await readFile(outputPath)).toEqual(registeredOutput);

    const duplicateUnits = registeredSource.replace('  "units": [', '  "units": [],\n  "units": [');
    await writeFile(registryPath, duplicateUnits, 'utf8');
    const beforeDuplicateUnits = await readFile(registryPath);
    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).rejects.toThrow(/duplicate direct property "units"/);
    expect(await readFile(registryPath)).toEqual(beforeDuplicateUnits);
    expect(await readFile(outputPath)).toEqual(registeredOutput);
  }, 30_000);

  it('fails closed for extra fields, duplicate keys, and generated-shape collisions', async () => {
    const { registryPath, outputPath, corpus } = await temporaryTargets();
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath,
        taskId: TASK_ID,
        units: [{ ...INPUT_UNITS[0], extra: true }],
      }),
    ).rejects.toThrow(/exact properties/);
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath,
        taskId: TASK_ID,
        units: [INPUT_UNITS[0], INPUT_UNITS[0]],
      }),
    ).rejects.toThrow(/duplicate namespace\/key/);
    const collision = corpus.units.find((unit) => unit.id === 'MLUX-C0003');
    if (!collision) throw new Error('draft registration fixture requires MLUX-C0003');
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath,
        taskId: TASK_ID,
        units: [
          {
            namespace: collision.namespace,
            key: collision.key,
            english: `${collision.english} changed`,
            ru: collision.locales.ru.candidate,
            uz: collision.locales.uz.candidate,
            context: collision.occurrences[0].context,
          },
        ],
      }),
    ).rejects.toThrow(/collides/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
  });

  it('rejects lexical, hard-link, and supported symbolic-link target aliases before mutation', async () => {
    const { directory, registryPath } = await temporaryTargets();
    const before = await readFile(registryPath);
    const hardLinkPath = join(directory, 'registry-hard-link.json');
    await link(registryPath, hardLinkPath);
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath: registryPath,
        taskId: TASK_ID,
        units: INPUT_UNITS,
      }),
    ).rejects.toThrow(/distinct file targets/);
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath: join(directory, 'missing', '..', 'registry.json'),
        taskId: TASK_ID,
        units: INPUT_UNITS,
      }),
    ).rejects.toThrow(/distinct file targets/);
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath: hardLinkPath,
        taskId: TASK_ID,
        units: INPUT_UNITS,
      }),
    ).rejects.toThrow(/distinct file targets/);
    const symbolicLinkPath = join(directory, 'registry-symbolic-link.json');
    try {
      await symlink(registryPath, symbolicLinkPath, 'file');
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe('EPERM');
      expect(await readFile(registryPath)).toEqual(before);
      return;
    }
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath: symbolicLinkPath,
        taskId: TASK_ID,
        units: INPUT_UNITS,
      }),
    ).rejects.toThrow(/distinct file targets/);
    expect(await readFile(registryPath)).toEqual(before);
  });

  it('rejects translation-unit ID exhaustion before either target is written', async () => {
    const { registryPath, outputPath } = await temporaryTargets(exhaustedFixture());
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    await expect(
      registerDraftUnits({ registryPath, outputPath, taskId: TASK_ID, units: INPUT_UNITS }),
    ).rejects.toThrow(/no translation unit IDs remain/);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
  });

  it('rolls the registry back through the actual create transaction when generated-output replacement fails', async () => {
    const { directory, registryPath, outputPath } = await temporaryTargets();
    const beforeRegistry = await readFile(registryPath);
    const beforeOutput = await readFile(outputPath);
    let renameCount = 0;
    await expect(
      registerDraftUnits({
        registryPath,
        outputPath,
        taskId: TASK_ID,
        units: INPUT_UNITS,
        fileSystem: {
          rename: async (from: string, to: string) => {
            renameCount += 1;
            if (renameCount === 2) throw new Error('simulated generated-output rename failure');
            await rename(from, to);
          },
        },
      }),
    ).rejects.toThrow(/simulated generated-output rename failure/);
    expect(renameCount).toBe(3);
    expect(await readFile(registryPath)).toEqual(beforeRegistry);
    expect(await readFile(outputPath)).toEqual(beforeOutput);
    expect(await readdir(directory)).not.toContainEqual(expect.stringContaining('.tmp'));
  }, 20_000);
});
