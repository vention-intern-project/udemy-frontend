import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import draft37Registry from '../../../localization/corpus/registry.json';

const {
  protectedSourceFingerprint,
  generateResources,
  retiredConsumerViolations,
  reviseProtectedSource,
  checkCorpus,
  syncCorpus,
  transitionLocaleCandidate,
  validateCorpus,
  // @ts-expect-error The dependency-free Node engine intentionally has no TypeScript declaration.
} = await import('../../../scripts/localization/corpus-engine.mjs');

type FixtureCandidate = Record<string, unknown> & {
  candidate: string;
  status: string;
  sourceRevision: string;
  history: unknown[];
};

type FixturePluralUnit = {
  pluralForms: Record<string, Record<string, string>> | null;
  sourceRevision: string;
  locales: Record<'ru' | 'uz', { sourceRevision: string }>;
};

function fixture() {
  const unit = {
    id: 'MLUX-C0001',
    namespace: 'common',
    key: 'welcome',
    english: 'Welcome {{name}}',
    sourceRevision: '',
    unitLifecycle: 'active',
    occurrences: [{ id: 'MLUX-O0001', context: 'fixture owner' }],
    placeholdersByLocale: { en: ['name'], ru: ['name'], uz: ['name'] },
    pluralForms: null,
    locales: {
      ru: {
        candidate: 'Добро пожаловать, {{name}}',
        status: 'draft',
        sourceRevision: '',
        reviewerId: null,
        verdict: null,
        requestedAt: null,
        reviewedAt: null,
        approvalRecordedAt: null,
        approvalAuthority: null,
        history: [],
      },
      uz: {
        candidate: 'Xush kelibsiz, {{name}}',
        status: 'draft',
        sourceRevision: '',
        reviewerId: null,
        verdict: null,
        requestedAt: null,
        reviewedAt: null,
        approvalRecordedAt: null,
        approvalAuthority: null,
        history: [],
      },
    },
    migrationProvenance: {
      legacyResourceStatus: 'Draft',
      legacyReviewStatus: 'Pending',
      ownerTasks: ['MLUX-TEST'],
    },
  };
  const revision = protectedSourceFingerprint(unit);
  unit.sourceRevision = revision;
  unit.locales.ru.sourceRevision = revision;
  unit.locales.uz.sourceRevision = revision;
  return {
    formatVersion: 1,
    corpusVersion: 'MLUX-TEST-1',
    source: { sha256: 'C9E208FC5F1AEF55E709290C67270B79E1CBCE4831E7FBCB20555AB5CF8A73AE' },
    baselineResources: { en: {}, ru: {}, uz: {} },
    exclusions: [],
    summary: { translationUnits: 1, sourceOccurrences: 1, mergedDuplicateRows: 0 },
    migration: {
      sourceVersion: 'MLUX-TEST-1',
      sourceSha256: 'C9E208FC5F1AEF55E709290C67270B79E1CBCE4831E7FBCB20555AB5CF8A73AE',
      sourceOccurrences: 1,
      importedAt: null,
    },
    units: [unit],
  };
}

describe('canonical localization corpus engine', () => {
  it('rejects an under-specified corpus before generation', () => {
    expect(
      validateCorpus({ formatVersion: 1, corpusVersion: 'x', source: { sha256: 'x' } }),
    ).toEqual(
      expect.arrayContaining([
        'invalid corpus source sha256',
        'missing baseline resources',
        'missing exclusions',
        'missing units',
        'invalid summary',
        'invalid migration provenance',
      ]),
    );
  });

  it('binds every locale candidate to the content-derived protected-source fingerprint', () => {
    const corpus = fixture();
    expect(validateCorpus(corpus)).toEqual([]);
    corpus.units[0].english = 'Welcome back {{name}}';
    expect(validateCorpus(corpus)).toContain('MLUX-C0001: source revision fingerprint mismatch');
    const revised = reviseProtectedSource(fixture().units[0], { english: 'Welcome back {{name}}' });
    expect(revised.locales.ru).toMatchObject({
      status: 'draft',
      sourceRevision: revised.sourceRevision,
    });
  });

  it.each(['occurrences', 'placeholdersByLocale', 'pluralForms'] as const)(
    'derives a new source revision and stales reviewed candidates for %s changes',
    (field) => {
      const unit = fixture().units[0];
      const approved = transitionLocaleCandidate(
        {
          ...unit.locales.ru,
          status: 'review_requested',
          history: [{ type: 'transition', from: 'draft', to: 'review_requested' }],
        } as FixtureCandidate,
        'approved',
        {
          humanApproval: {
            reviewerId: 'native-7',
            reviewerName: 'Native Reviewer',
            reviewedAt: '2026-08-23T00:00:00.000Z',
            approvalRecordedAt: '2026-08-23T00:01:00.000Z',
            approvalAuthority: {
              kind: 'human_native_review',
              reviewerId: 'native-7',
              reviewerName: 'Native Reviewer',
            },
          },
        },
      );
      unit.locales.ru = approved;
      const changes =
        field === 'occurrences'
          ? { occurrences: [{ id: 'MLUX-O0002', context: 'changed context' }] }
          : field === 'placeholdersByLocale'
            ? {
                placeholdersByLocale: {
                  en: ['name', 'extra'],
                  ru: ['name', 'extra'],
                  uz: ['name', 'extra'],
                },
              }
            : {
                pluralForms: {
                  en: { one: 'One {{name}}' },
                  ru: { one: 'Один {{name}}' },
                  uz: { one: 'Bitta {{name}}' },
                },
              };
      const revised = reviseProtectedSource(unit, changes);
      expect(revised.locales.ru.status).toBe('stale');
      expect(revised.locales.ru.history.at(-2)).toMatchObject({
        type: 'source_revision',
        sourceRevision: revised.sourceRevision,
      });
      expect(revised.locales.ru.history.at(-1)).toMatchObject({
        type: 'transition',
        from: 'approved',
        to: 'stale',
      });
    },
  );

  it('rejects direct approved records that omit legal history or named human-native provenance', () => {
    const corpus = fixture();
    const candidate = corpus.units[0].locales.ru as FixtureCandidate;
    candidate.status = 'approved';
    candidate.reviewerId = 'claimed';
    candidate.reviewedAt = '2026-08-23';
    candidate.approvalRecordedAt = '2026-08-23';
    expect(validateCorpus(corpus)).toEqual(
      expect.arrayContaining([
        'MLUX-C0001: ru history does not end at current status',
        'MLUX-C0001: ru approved candidate lacks human-native authority',
      ]),
    );
  });

  it('allows approval only through a legal history with explicit named human-native provenance', () => {
    const candidate = fixture().units[0].locales.ru;
    const requested = transitionLocaleCandidate(candidate, 'review_requested');
    const approved = transitionLocaleCandidate(requested, 'approved', {
      humanApproval: {
        reviewerId: 'native-7',
        reviewerName: 'Native Reviewer',
        reviewedAt: '2026-08-23T00:00:00.000Z',
        approvalRecordedAt: '2026-08-23T00:01:00.000Z',
        approvalAuthority: {
          kind: 'human_native_review',
          reviewerId: 'native-7',
          reviewerName: 'Native Reviewer',
        },
      },
    });
    expect(approved.status).toBe('approved');
    expect(() => transitionLocaleCandidate(candidate, 'approved')).toThrow(
      'draft -> approved is forbidden',
    );
  });

  it('rejects replacing a candidate on every transition except stale to draft', () => {
    const candidate = fixture().units[0].locales.ru;
    expect(() =>
      transitionLocaleCandidate(candidate, 'review_requested', {
        newCandidate: 'Replacement {{name}}',
      }),
    ).toThrow(
      'candidate replacement is only allowed while returning stale or changes_requested to draft',
    );
    const requested = transitionLocaleCandidate(candidate, 'review_requested');
    expect(() =>
      transitionLocaleCandidate(requested, 'approved', {
        newCandidate: 'Replacement {{name}}',
        humanApproval: {
          reviewerId: 'native-7',
          reviewerName: 'Native Reviewer',
          reviewedAt: '2026-08-23T00:00:00.000Z',
          approvalRecordedAt: '2026-08-23T00:01:00.000Z',
          approvalAuthority: {
            kind: 'human_native_review',
            reviewerId: 'native-7',
            reviewerName: 'Native Reviewer',
          },
        },
      }),
    ).toThrow(
      'candidate replacement is only allowed while returning stale or changes_requested to draft',
    );
  });

  it('allows a corrected candidate when changes requested returns to draft without allowing approval-time edits', () => {
    const candidate = fixture().units[0].locales.ru as FixtureCandidate;
    const changesRequested = transitionLocaleCandidate(
      transitionLocaleCandidate(candidate, 'review_requested'),
      'changes_requested',
    );
    const corrected = transitionLocaleCandidate(changesRequested, 'draft', {
      newCandidate: 'Исправленный перевод, {{name}}',
    });
    expect(corrected).toMatchObject({
      status: 'draft',
      candidate: 'Исправленный перевод, {{name}}',
    });
    expect(corrected.history.at(-1)).toMatchObject({
      from: 'changes_requested',
      to: 'draft',
      previousCandidate: candidate.candidate,
      nextCandidate: 'Исправленный перевод, {{name}}',
    });
    expect(() =>
      transitionLocaleCandidate(changesRequested, 'approved', {
        newCandidate: 'Несанкционированная замена, {{name}}',
      }),
    ).toThrow('changes_requested -> approved is forbidden');

    const corpus = fixture();
    corpus.units[0].locales.ru = corrected;
    expect(validateCorpus(corpus)).toEqual([]);
  });

  it('returns violations instead of throwing for malformed placeholder contracts', () => {
    const corpus = fixture();
    (corpus.units[0] as { placeholdersByLocale?: unknown }).placeholdersByLocale = undefined;
    expect(() => validateCorpus(corpus)).not.toThrow();
    expect(validateCorpus(corpus)).toEqual(
      expect.arrayContaining([
        'MLUX-C0001: invalid locale placeholder contract',
        'MLUX-C0001: ru placeholder mismatch',
        'MLUX-C0001: uz placeholder mismatch',
      ]),
    );
    (corpus.units[0] as { pluralForms?: unknown }).pluralForms = {
      en: { one: 'One {{name}}' },
      ru: { one: 'Один {{name}}' },
      uz: { one: 'Bitta {{name}}' },
    };
    expect(() => validateCorpus(corpus)).not.toThrow();
    expect(validateCorpus(corpus)).toContain('MLUX-C0001: en plural placeholder mismatch');
  });

  it('rejects direct stale-to-draft history that does not contain a genuinely new current candidate', () => {
    const corpus = fixture();
    const candidate = corpus.units[0].locales.ru as FixtureCandidate;
    candidate.status = 'draft';
    candidate.history = [
      {
        type: 'transition',
        from: 'draft',
        to: 'review_requested',
        previousCandidate: candidate.candidate,
        nextCandidate: candidate.candidate,
      },
      {
        type: 'transition',
        from: 'review_requested',
        to: 'stale',
        previousCandidate: candidate.candidate,
        nextCandidate: candidate.candidate,
      },
      {
        type: 'transition',
        from: 'stale',
        to: 'draft',
        previousCandidate: candidate.candidate,
        nextCandidate: candidate.candidate,
      },
    ];
    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru stale -> draft requires a new candidate history',
    );
  });

  it('records and validates a genuinely new stale-to-draft candidate', () => {
    const candidate = fixture().units[0].locales.ru as FixtureCandidate;
    const stale = transitionLocaleCandidate(
      transitionLocaleCandidate(candidate, 'review_requested'),
      'stale',
    );
    const reactivated = transitionLocaleCandidate(stale, 'draft', {
      newCandidate: 'Yangi tarjima, {{name}}',
    });
    const corpus = fixture();
    corpus.units[0].locales.ru = reactivated;
    expect(validateCorpus(corpus)).toEqual([]);
  });

  it.each(['ru', 'uz'] as const)(
    'rejects a forged stale candidate binding for %s before generation',
    (locale) => {
      const corpus = fixture();
      const original = corpus.units[0].locales[locale] as FixtureCandidate;
      const stale = transitionLocaleCandidate(
        transitionLocaleCandidate(original, 'review_requested'),
        'stale',
      );
      corpus.units[0].locales[locale] = {
        ...transitionLocaleCandidate(stale, 'draft', {
          newCandidate: 'Genuinely new candidate {{name}}',
        }),
        candidate: original.candidate,
        history: [
          ...stale.history,
          {
            type: 'transition',
            from: 'stale',
            to: 'draft',
            previousCandidate: 'forged prior candidate {{name}}',
            nextCandidate: original.candidate,
          },
        ],
      };
      expect(validateCorpus(corpus)).toContain(
        `MLUX-C0001: ${locale} transition history candidate discontinuity`,
      );
    },
  );

  it('rejects a direct approval-history candidate replacement before generation', () => {
    const corpus = fixture();
    const requested = transitionLocaleCandidate(corpus.units[0].locales.ru, 'review_requested');
    const approved = transitionLocaleCandidate(requested, 'approved', {
      humanApproval: {
        reviewerId: 'native-7',
        reviewerName: 'Native Reviewer',
        reviewedAt: '2026-08-23T00:00:00.000Z',
        approvalRecordedAt: '2026-08-23T00:01:00.000Z',
        approvalAuthority: {
          kind: 'human_native_review',
          reviewerId: 'native-7',
          reviewerName: 'Native Reviewer',
        },
      },
    });
    const forgedCandidate = 'Подмененный перевод, {{name}}';
    const forged = structuredClone(approved);
    forged.candidate = forgedCandidate;
    (forged.history[forged.history.length - 1] as { nextCandidate: string }).nextCandidate =
      forgedCandidate;
    corpus.units[0].locales.ru = forged;

    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru transition history changes candidate outside a legal draft return',
    );
  });

  it('records a legal approved-to-stale transition when protected source content changes', () => {
    const corpus = fixture();
    const requested = transitionLocaleCandidate(corpus.units[0].locales.ru, 'review_requested');
    corpus.units[0].locales.ru = transitionLocaleCandidate(requested, 'approved', {
      humanApproval: {
        reviewerId: 'native-7',
        reviewerName: 'Native Reviewer',
        reviewedAt: '2026-08-23T00:00:00.000Z',
        approvalRecordedAt: '2026-08-23T00:01:00.000Z',
        approvalAuthority: {
          kind: 'human_native_review',
          reviewerId: 'native-7',
          reviewerName: 'Native Reviewer',
        },
      },
    });

    corpus.units[0] = reviseProtectedSource(corpus.units[0], {
      english: 'Welcome back {{name}}',
    });

    expect(corpus.units[0].locales.ru).toMatchObject({ status: 'stale' });
    expect(
      corpus.units[0].locales.ru.history[corpus.units[0].locales.ru.history.length - 1],
    ).toEqual({
      type: 'transition',
      from: 'approved',
      to: 'stale',
      previousCandidate: 'Добро пожаловать, {{name}}',
      nextCandidate: 'Добро пожаловать, {{name}}',
    });
    expect(validateCorpus(corpus)).toEqual([]);
  });

  it('rejects DRAFT-37 source-hash and per-unit migration-provenance mutations before generation', () => {
    const mutated = structuredClone(draft37Registry);
    mutated.source.sha256 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    mutated.migration.sourceSha256 = mutated.source.sha256;
    delete (mutated.units[0] as { migrationProvenance?: unknown }).migrationProvenance;

    expect(validateCorpus(mutated)).toEqual(
      expect.arrayContaining([
        'DRAFT-37 identity/count mismatch',
        `${mutated.units[0].id}: invalid migration provenance`,
      ]),
    );
  });

  it('blocks retired removal when a source consumer remains outside registry occurrences', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fe066-source-'));
    await writeFile(join(directory, 'consumer.ts'), "runtime.t('common:welcome')", 'utf8');
    const corpus = fixture();
    corpus.units[0].unitLifecycle = 'retired';
    corpus.units[0].occurrences = [];
    (
      corpus.units[0] as (typeof corpus.units)[number] & {
        retirement?: { reason: string; sourceRevision: string };
      }
    ).retirement = { reason: 'removed', sourceRevision: corpus.units[0].sourceRevision };
    expect(await retiredConsumerViolations(corpus, directory)).toEqual([
      'MLUX-C0001: retired unit has source consumer consumer.ts',
    ]);
  });

  it('detects only quoted or namespaced retired keys and escapes metacharacters', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fe066-retired-'));
    const corpus = fixture();
    corpus.units[0].unitLifecycle = 'retired';
    corpus.units[0].key = 'page.name';
    corpus.units[0].occurrences = [];
    (
      corpus.units[0] as (typeof corpus.units)[number] & {
        retirement?: { reason: string; sourceRevision: string };
      }
    ).retirement = { reason: 'removed', sourceRevision: corpus.units[0].sourceRevision };
    await writeFile(join(directory, 'identifier.ts'), 'const pageName = 1;', 'utf8');
    await writeFile(join(directory, 'consumer.ts'), "runtime.t('common:page.name')", 'utf8');
    await writeFile(join(directory, 'quoted.ts'), "const retired = 'page.name';", 'utf8');
    expect(await retiredConsumerViolations(corpus, directory)).toEqual([
      'MLUX-C0001: retired unit has source consumer consumer.ts',
      'MLUX-C0001: retired unit has source consumer quoted.ts',
    ]);
  });

  it('excludes deterministic generated output but keeps hand-authored retired consumers', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fe066-generated-'));
    const corpus = fixture();
    corpus.units[0].unitLifecycle = 'retired';
    corpus.units[0].occurrences = [];
    (
      corpus.units[0] as (typeof corpus.units)[number] & {
        retirement?: { reason: string; sourceRevision: string };
      }
    ).retirement = { reason: 'removed', sourceRevision: corpus.units[0].sourceRevision };
    await writeFile(
      join(directory, 'generated-resources.ts'),
      "// Generated by localization:sync. Do not edit.\nexport const stale = 'common:welcome';\n",
      'utf8',
    );

    expect(await retiredConsumerViolations(corpus, directory)).toEqual([]);

    await writeFile(join(directory, 'consumer.ts'), "runtime.t('common:welcome')", 'utf8');
    expect(await retiredConsumerViolations(corpus, directory)).toEqual([
      'MLUX-C0001: retired unit has source consumer consumer.ts',
    ]);
  });

  it('replaces a baseline singular key with the current plural shape', () => {
    const corpus = fixture();
    const unit = corpus.units[0] as unknown as {
      pluralForms: Record<string, Record<string, string>> | null;
      sourceRevision: string;
      locales: Record<'ru' | 'uz', { sourceRevision: string }>;
    };
    unit.pluralForms = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        Object.fromEntries(
          [
            ...new globalThis.Intl.PluralRules(locale).resolvedOptions().pluralCategories,
            'zero',
          ].map((category) => [category, `${locale} ${category} {{name}}`]),
        ),
      ]),
    );
    unit.sourceRevision = protectedSourceFingerprint(corpus.units[0]);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;
    (
      corpus as unknown as {
        baselineResources: Record<string, Record<string, Record<string, string>>>;
      }
    ).baselineResources = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        { common: { welcome: `${locale} obsolete singular`, preserved: `${locale} preserved` } },
      ]),
    );

    expect(validateCorpus(corpus)).toEqual([]);
    for (const locale of ['en', 'ru', 'uz']) {
      const generated = generateResources(corpus)[locale].common;
      expect(generated).not.toHaveProperty('welcome');
      expect(generated).toMatchObject({
        preserved: `${locale} preserved`,
        welcome_zero: `${locale} zero {{name}}`,
      });
    }
  });

  it('replaces baseline plural keys with the current singular shape', () => {
    const corpus = fixture();
    (
      corpus as unknown as {
        baselineResources: Record<string, Record<string, Record<string, string>>>;
      }
    ).baselineResources = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        {
          common: {
            preserved: `${locale} preserved`,
            welcome_one: `${locale} stale one`,
            welcome_other: `${locale} stale other`,
            welcome_few: `${locale} stale few`,
            welcome_many: `${locale} stale many`,
            welcome_zero: `${locale} stale zero`,
          },
        },
      ]),
    );

    expect(validateCorpus(corpus)).toEqual([]);
    expect(generateResources(corpus)).toMatchObject({
      en: { common: { welcome: 'Welcome {{name}}', preserved: 'en preserved' } },
      ru: { common: { welcome: 'Добро пожаловать, {{name}}', preserved: 'ru preserved' } },
      uz: { common: { welcome: 'Xush kelibsiz, {{name}}', preserved: 'uz preserved' } },
    });
    for (const locale of ['en', 'ru', 'uz'])
      expect(generateResources(corpus)[locale].common).not.toEqual(
        expect.objectContaining({
          welcome_one: expect.any(String),
          welcome_other: expect.any(String),
          welcome_zero: expect.any(String),
        }),
      );
  });

  it('removes stale plural keys for retired units without a current plural declaration', () => {
    const corpus = fixture();
    const unit = corpus.units[0] as (typeof corpus.units)[number] & {
      retirement?: { reason: string; sourceRevision: string };
    };
    unit.unitLifecycle = 'retired';
    unit.occurrences = [];
    unit.sourceRevision = protectedSourceFingerprint(unit);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;
    unit.retirement = { reason: 'obsolete', sourceRevision: unit.sourceRevision };
    corpus.summary.sourceOccurrences = 0;
    corpus.migration.sourceOccurrences = 0;
    (
      corpus as unknown as {
        baselineResources: Record<string, Record<string, Record<string, string>>>;
      }
    ).baselineResources = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        {
          common: {
            preserved: `${locale} preserved`,
            welcome: `${locale} stale base`,
            welcome_one: `${locale} stale one`,
            welcome_other: `${locale} stale other`,
            welcome_few: `${locale} stale few`,
            welcome_many: `${locale} stale many`,
            welcome_zero: `${locale} stale zero`,
          },
        },
      ]),
    );

    expect(validateCorpus(corpus)).toEqual([]);
    for (const locale of ['en', 'ru', 'uz'])
      expect(generateResources(corpus)[locale].common).toEqual({
        preserved: `${locale} preserved`,
      });
  });

  it('removes an exact historically owned plural suffix without deleting an unrelated lookalike', () => {
    const corpus = structuredClone(draft37Registry);
    const baselineResources = corpus.baselineResources as Record<
      'en' | 'ru' | 'uz',
      Record<string, Record<string, string>>
    >;
    const unit = corpus.units.find(
      (candidate) => candidate.namespace === 'catalog' && candidate.key === 'lessonAvailability',
    );

    expect(unit).toBeDefined();
    for (const locale of ['en', 'ru', 'uz'] as const) {
      const namespace = (baselineResources[locale].catalog ??= {});
      namespace.lessonAvailability_custom = `${locale} historic generated plural`;
      namespace.lessonAvailability_customLookalike = `${locale} unrelated preserved value`;
    }

    expect(validateCorpus(corpus)).toEqual([]);
    const generated = generateResources(corpus);
    for (const locale of ['en', 'ru', 'uz'] as const) {
      expect(generated[locale].catalog).not.toHaveProperty('lessonAvailability_custom');
      expect(generated[locale].catalog).toMatchObject({
        lessonAvailability_customLookalike: `${locale} unrelated preserved value`,
      });
    }
  });

  it('removes retired canonical base and plural keys inherited from baseline resources', () => {
    const corpus = fixture();
    const unit = corpus.units[0] as unknown as {
      key: string;
      pluralForms: Record<string, Record<string, string>> | null;
      unitLifecycle: string;
      occurrences: unknown[];
      retirement?: { reason: string; sourceRevision: string };
      sourceRevision: string;
      locales: Record<'ru' | 'uz', { sourceRevision: string }>;
    };
    unit.pluralForms = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        Object.fromEntries(
          [...new Intl.PluralRules(locale).resolvedOptions().pluralCategories, 'zero'].map(
            (category) => [category, `${locale} ${category} {{name}}`],
          ),
        ),
      ]),
    );
    unit.unitLifecycle = 'retired';
    unit.occurrences = [];
    unit.sourceRevision = protectedSourceFingerprint(corpus.units[0]);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;
    unit.retirement = { reason: 'obsolete', sourceRevision: unit.sourceRevision };
    corpus.summary.sourceOccurrences = 0;
    corpus.migration.sourceOccurrences = 0;
    (
      corpus as unknown as {
        baselineResources: Record<string, Record<string, Record<string, string>>>;
      }
    ).baselineResources = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        {
          common: {
            welcome: `${locale} base`,
            preserved: `${locale} preserved`,
            ...Object.fromEntries(
              Object.keys(unit.pluralForms?.[locale] ?? {}).map((category) => [
                `welcome_${category}`,
                `${locale} ${category}`,
              ]),
            ),
          },
        },
      ]),
    );

    expect(validateCorpus(corpus)).toEqual([]);
    for (const locale of ['en', 'ru', 'uz']) {
      const generated = generateResources(corpus)[locale].common;
      expect(generated).toEqual({ preserved: `${locale} preserved` });
    }
  });

  it('requires every Intl.PluralRules category for each supported locale', () => {
    const corpus = fixture();
    const unit = corpus.units[0] as unknown as {
      pluralForms: Record<string, Record<string, string>> | null;
      sourceRevision: string;
      locales: Record<'ru' | 'uz', { sourceRevision: string }>;
    };
    unit.pluralForms = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        Object.fromEntries(
          [...new Intl.PluralRules(locale).resolvedOptions().pluralCategories, 'zero'].map(
            (category) => [category, `${locale} ${category} {{name}}`],
          ),
        ),
      ]),
    );
    unit.sourceRevision = protectedSourceFingerprint(corpus.units[0]);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;
    expect(validateCorpus(corpus)).toEqual([]);

    const missingCategory = new Intl.PluralRules('ru').resolvedOptions().pluralCategories[0];
    delete unit.pluralForms.ru[missingCategory];
    unit.sourceRevision = protectedSourceFingerprint(corpus.units[0]);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;
    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: ru plural forms missing required categories',
    );
  });

  it('accepts explicit zero but rejects an arbitrary plural suffix before it can be admitted', () => {
    const corpus = fixture();
    const unit = corpus.units[0] as unknown as FixturePluralUnit;
    unit.pluralForms = Object.fromEntries(
      ['en', 'ru', 'uz'].map((locale) => [
        locale,
        Object.fromEntries(
          [
            ...new globalThis.Intl.PluralRules(locale).resolvedOptions().pluralCategories,
            'zero',
          ].map((category) => [category, `${locale} ${category} {{name}}`]),
        ),
      ]),
    );
    unit.sourceRevision = protectedSourceFingerprint(corpus.units[0]);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;

    expect(validateCorpus(corpus)).toEqual([]);

    unit.pluralForms.en.custom = 'en stale custom {{name}}';
    unit.sourceRevision = protectedSourceFingerprint(corpus.units[0]);
    unit.locales.ru.sourceRevision = unit.sourceRevision;
    unit.locales.uz.sourceRevision = unit.sourceRevision;

    expect(validateCorpus(corpus)).toContain(
      'MLUX-C0001: en plural forms contain unsupported categories: custom',
    );
  });

  it('returns a missing generated-output violation without throwing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fe066-check-'));
    const registryPath = join(directory, 'registry.json');
    await writeFile(registryPath, JSON.stringify(fixture()), 'utf8');
    await expect(
      checkCorpus({
        registryPath,
        outputPath: join(directory, 'missing.ts'),
        sourceRoot: directory,
      }),
    ).resolves.toEqual([expect.stringContaining('generated resources cannot be read')]);
  });

  it('rejects restoration that reuses the retired source revision or an approved candidate', () => {
    const corpus = fixture();
    const unit = corpus.units[0] as (typeof corpus.units)[number] & {
      retirementHistory?: { reason: string; sourceRevision: string }[];
    };
    unit.retirementHistory = [{ reason: 'retired', sourceRevision: unit.sourceRevision }];
    unit.locales.ru = transitionLocaleCandidate(
      transitionLocaleCandidate(unit.locales.ru, 'review_requested'),
      'approved',
      {
        humanApproval: {
          reviewerId: 'native-7',
          reviewerName: 'Native Reviewer',
          reviewedAt: '2026-08-23T00:00:00.000Z',
          approvalRecordedAt: '2026-08-23T00:01:00.000Z',
          approvalAuthority: {
            kind: 'human_native_review',
            reviewerId: 'native-7',
            reviewerName: 'Native Reviewer',
          },
        },
      },
    );
    expect(validateCorpus(corpus)).toEqual(
      expect.arrayContaining([
        'MLUX-C0001: restored unit must use a new source revision',
        'MLUX-C0001: restored ru candidate must be a new non-approved draft',
        'MLUX-C0001: restored uz candidate must be a new non-approved draft',
      ]),
    );
  });

  it('allows restoration only with a new revision and new non-approved locale candidates', () => {
    const corpus = fixture();
    const prior = corpus.units[0];
    const approved = transitionLocaleCandidate(
      transitionLocaleCandidate(prior.locales.ru, 'review_requested'),
      'approved',
      {
        humanApproval: {
          reviewerId: 'native-7',
          reviewerName: 'Native Reviewer',
          reviewedAt: '2026-08-23T00:00:00.000Z',
          approvalRecordedAt: '2026-08-23T00:01:00.000Z',
          approvalAuthority: {
            kind: 'human_native_review',
            reviewerId: 'native-7',
            reviewerName: 'Native Reviewer',
          },
        },
      },
    );
    const revised = reviseProtectedSource(
      { ...prior, locales: { ...prior.locales, ru: approved } },
      { english: 'Welcome back {{name}}' },
    );
    const restored = {
      ...revised,
      retirementHistory: [{ reason: 'retired', sourceRevision: prior.sourceRevision }],
      locales: {
        ru: transitionLocaleCandidate(revised.locales.ru, 'draft', {
          newCandidate: 'Добро пожаловать снова, {{name}}',
        }),
        uz: transitionLocaleCandidate(
          {
            ...revised.locales.uz,
            status: 'stale',
            history: [
              { type: 'source_revision', sourceRevision: revised.sourceRevision },
              {
                type: 'transition',
                from: 'draft',
                to: 'review_requested',
                previousCandidate: revised.locales.uz.candidate,
                nextCandidate: revised.locales.uz.candidate,
              },
              {
                type: 'transition',
                from: 'review_requested',
                to: 'stale',
                previousCandidate: revised.locales.uz.candidate,
                nextCandidate: revised.locales.uz.candidate,
              },
            ],
          },
          'draft',
          { newCandidate: 'Yana xush kelibsiz, {{name}}' },
        ),
      },
    };
    corpus.units[0] = restored;
    expect(validateCorpus(corpus)).toEqual([]);
  });

  it('keeps prior output untouched when schema validation or generation fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fe066-atomic-'));
    const registryPath = join(directory, 'registry.json');
    const outputPath = join(directory, 'generated.ts');
    const corpus = fixture();
    corpus.units[0].locales.ru.candidate = 'missing placeholder';
    await writeFile(registryPath, JSON.stringify(corpus), 'utf8');
    await writeFile(outputPath, 'prior output\n', 'utf8');
    await expect(syncCorpus({ registryPath, outputPath, sourceRoot: directory })).rejects.toThrow(
      'placeholder mismatch',
    );
    await expect(readFile(outputPath, 'utf8')).resolves.toBe('prior output\n');
  });
});
