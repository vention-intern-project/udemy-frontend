import { describe, expect, it, vi } from 'vitest';

import {
  createLocaleRuntime,
  MLUX_002_RUNTIME_MAPPING,
  MLUX_003_RUNTIME_MAPPING,
  MLUX_004_RUNTIME_MAPPING,
  MLUX_004_SHARED_OCCURRENCES,
  MLUX_004_TRANSLATIONS,
  MLUX_005_RUNTIME_MAPPING,
} from '@shared/locale';

import {
  MLUX004_DRAFT22_CORPUS_PROJECTION as MLUX004_DRAFT20_CORPUS_PROJECTION,
  type Mlux004Draft22Projection as Mlux004Draft20Projection,
} from './mlux004-draft20-projection';
import { MLUX006_FINAL_CORPUS_PROJECTION } from './mlux006-final-corpus-projection';

interface Draft20RuntimeUnitCandidate {
  readonly unitId: string;
  readonly namespace: string;
  readonly key: string;
  readonly english: string;
  readonly russian: string;
  readonly uzbek: string;
  readonly variables: readonly string[];
  readonly plural: boolean;
  readonly resourceStatus: string;
  readonly russianReview: string;
  readonly uzbekReview: string;
  readonly ownerTask: string;
}

interface Draft20RuntimeOccurrenceCandidate {
  readonly occurrenceId: string;
  readonly unitId: string;
  readonly context: string;
  readonly classification: string | undefined;
  readonly ownerTask: string;
}

interface Draft20RuntimeCandidate {
  readonly units: readonly Draft20RuntimeUnitCandidate[];
  readonly occurrences: readonly Draft20RuntimeOccurrenceCandidate[];
}

interface LessonCountPluralCandidate {
  readonly variables: readonly string[];
  readonly plural: boolean;
  readonly occurrenceIds: readonly string[];
  readonly forms: Readonly<Record<'en' | 'ru' | 'uz', Readonly<Record<string, string>>>>;
}

const D07_UNIT_IDS = new Set([
  'MLUX-C0004',
  'MLUX-C0008',
  'MLUX-C0010',
  'MLUX-C0059',
  'MLUX-C0114',
  'MLUX-C0143',
  'MLUX-C0170',
  'MLUX-C0194',
  'MLUX-C0261',
  'MLUX-C0319',
  ...Array.from({ length: 73 }, (_, index) => `MLUX-C${String(index + 374).padStart(4, '0')}`),
]);

const D07_OCCURRENCE_IDS = new Set([
  'MLUX-O0185',
  'MLUX-O0214',
  'MLUX-O0361',
  ...Array.from({ length: 95 }, (_, index) => `MLUX-O${String(index + 534).padStart(4, '0')}`),
]);

function normalizeTemplate(value: string): string {
  return value.replace(/\{\{([^{}]+)}}/g, '{$1}');
}

function interpolateTemplate(value: string, count: number): string {
  return value.replace(/\{\{?count}\}?/g, String(count));
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => (seen.has(value) ? true : (seen.add(value), false)));
}

function conflictingResourceKeys(units: readonly Draft20RuntimeUnitCandidate[]): string[] {
  const firstUnitByResourceKey = new Map<string, Draft20RuntimeUnitCandidate>();
  const violations: string[] = [];
  for (const unit of units) {
    const resourceKey = `${unit.namespace}:${unit.key}`;
    const firstUnit = firstUnitByResourceKey.get(resourceKey);
    if (!firstUnit) {
      firstUnitByResourceKey.set(resourceKey, unit);
      continue;
    }
    if (
      firstUnit.english !== unit.english ||
      firstUnit.russian !== unit.russian ||
      firstUnit.uzbek !== unit.uzbek
    ) {
      violations.push(`conflicting resource key ${resourceKey} ${firstUnit.unitId}/${unit.unitId}`);
    }
  }
  return violations;
}

function collectLessonCountPluralViolations(candidate: LessonCountPluralCandidate): string[] {
  const violations: string[] = [];
  if (JSON.stringify(sortedUnique(candidate.variables)) !== JSON.stringify(['count'])) {
    violations.push('wrong lessonCount count selector');
  }
  if (!candidate.plural) violations.push('wrong lessonCount plural flag');
  const expectedOccurrences = ['MLUX-O0626', 'MLUX-O0627', 'MLUX-O0628'];
  violations.push(
    ...difference(expectedOccurrences, candidate.occurrenceIds, 'lessonCount occurrence'),
  );
  const expectedForms = {
    en: { one: 'lesson', other: 'lessons' },
    ru: { one: 'урок', few: 'урока', many: 'уроков', other: 'урока' },
    uz: { one: 'dars', other: 'dars' },
  } as const;
  for (const locale of ['en', 'ru', 'uz'] as const) {
    for (const [pluralForm, expected] of Object.entries(expectedForms[locale])) {
      if (candidate.forms[locale][pluralForm] !== expected) {
        violations.push(`wrong lessonCount ${locale} ${pluralForm} form`);
      }
    }
  }
  return violations;
}

function difference(
  expected: readonly string[],
  actual: readonly string[],
  label: string,
): string[] {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return [
    ...expected
      .filter((value) => !actualSet.has(value))
      .map((value) => `missing ${label} ${value}`),
    ...actual.filter((value) => !expectedSet.has(value)).map((value) => `extra ${label} ${value}`),
  ];
}

export function collectMlux004Draft20ParityViolations(
  projection: Mlux004Draft20Projection,
  candidate: Draft20RuntimeCandidate,
): string[] {
  const violations: string[] = [];
  const expectedUnits = projection.units.filter(({ unitId }) => D07_UNIT_IDS.has(unitId));
  const expectedOccurrences = projection.occurrences.filter(({ occurrenceId }) =>
    D07_OCCURRENCE_IDS.has(occurrenceId),
  );

  violations.push(
    ...duplicateIds(candidate.units.map(({ unitId }) => unitId)).map(
      (unitId) => `duplicate unit ${unitId}`,
    ),
    ...duplicateIds(candidate.occurrences.map(({ occurrenceId }) => occurrenceId)).map(
      (occurrenceId) => `duplicate occurrence ${occurrenceId}`,
    ),
    ...conflictingResourceKeys(candidate.units),
    ...difference(
      expectedUnits.map(({ unitId }) => unitId),
      candidate.units.map(({ unitId }) => unitId),
      'unit',
    ),
    ...difference(
      expectedOccurrences.map(({ occurrenceId }) => occurrenceId),
      candidate.occurrences.map(({ occurrenceId }) => occurrenceId),
      'occurrence',
    ),
  );

  const candidateUnits = new Map(candidate.units.map((unit) => [unit.unitId, unit]));
  for (const expected of expectedUnits) {
    const actual = candidateUnits.get(expected.unitId);
    if (!actual) continue;
    for (const [label, expectedValue, actualValue] of [
      ['namespace', expected.namespace, actual.namespace],
      ['key', expected.key, actual.key],
      ['English', expected.runtimeEnglish, actual.english],
      ['Russian', normalizeTemplate(expected.russian.value), normalizeTemplate(actual.russian)],
      ['Uzbek', normalizeTemplate(expected.uzbek.value), normalizeTemplate(actual.uzbek)],
      ['plural', String(expected.plural), String(actual.plural)],
      ['resource status', expected.status, actual.resourceStatus],
      ['Russian review', expected.russian.reviewStatus, actual.russianReview],
      ['Uzbek review', expected.uzbek.reviewStatus, actual.uzbekReview],
      ['owner', expected.runtimeOwnerTasks[0] ?? '', actual.ownerTask],
    ] as const) {
      if (expectedValue !== actualValue) violations.push(`wrong ${label} ${expected.unitId}`);
    }
    if (
      JSON.stringify(sortedUnique(expected.variables)) !==
      JSON.stringify(sortedUnique(actual.variables))
    ) {
      violations.push(`wrong variables ${expected.unitId}`);
    }
  }

  const candidateOccurrences = new Map(
    candidate.occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]),
  );
  for (const expected of expectedOccurrences) {
    const actual = candidateOccurrences.get(expected.occurrenceId);
    if (!actual) continue;
    if (expected.unitId !== actual.unitId) {
      violations.push(`wrong occurrence unit ${expected.occurrenceId}`);
    }
    if (expected.runtimeContext !== actual.context) {
      violations.push(`wrong occurrence context ${expected.occurrenceId}`);
    }
    if (expected.classification !== actual.classification) {
      violations.push(`wrong occurrence classification ${expected.occurrenceId}`);
    }
    if (expected.ownerTask !== actual.ownerTask) {
      violations.push(`wrong occurrence owner ${expected.occurrenceId}`);
    }
  }
  return violations;
}

function mappingCandidate(): Draft20RuntimeCandidate {
  const translationsByUnit = new Map(
    MLUX_004_TRANSLATIONS.map((translation) => [translation.unitId, translation]),
  );
  const allMappings = [
    ...MLUX_002_RUNTIME_MAPPING,
    ...MLUX_003_RUNTIME_MAPPING,
    ...MLUX_004_RUNTIME_MAPPING,
    ...MLUX_005_RUNTIME_MAPPING,
  ];
  const mappingsByUnit = new Map<string, (typeof allMappings)[number][]>();
  for (const mapping of allMappings) {
    if (!D07_UNIT_IDS.has(mapping.unitId)) continue;
    const matches = mappingsByUnit.get(mapping.unitId) ?? [];
    matches.push(mapping);
    mappingsByUnit.set(mapping.unitId, matches);
  }
  const runtime = createLocaleRuntime('en');
  const mappings = [...mappingsByUnit.values()].map(([mapping]) => mapping!);
  return {
    units: mappings.map((mapping) => {
      const translation = translationsByUnit.get(mapping.unitId);
      return {
        unitId: mapping.unitId,
        namespace: mapping.namespace,
        key: mapping.key,
        english: mapping.english,
        russian:
          translation?.ru ??
          String(runtime.getResource('ru', mapping.namespace, mapping.key) ?? ''),
        uzbek:
          translation?.uz ??
          String(runtime.getResource('uz', mapping.namespace, mapping.key) ?? ''),
        variables: mapping.variables,
        plural: mapping.plural,
        resourceStatus: mapping.resourceStatus,
        russianReview: mapping.russian.review,
        uzbekReview: mapping.uzbek.review,
        ownerTask: mapping.ownerTask,
      };
    }),
    occurrences: [
      ...allMappings.flatMap((mapping) =>
        mapping.occurrences
          .filter(({ id }) => D07_OCCURRENCE_IDS.has(`MLUX-${id}`))
          .map((occurrence) => ({
            occurrenceId: `MLUX-${occurrence.id}`,
            unitId: mapping.unitId,
            context: occurrence.context,
            classification: occurrence.classification,
            ownerTask: occurrence.ownerTask,
          })),
      ),
      ...MLUX_004_SHARED_OCCURRENCES.filter(({ id }) => D07_OCCURRENCE_IDS.has(`MLUX-${id}`)).map(
        (occurrence) => ({
          occurrenceId: `MLUX-${occurrence.id}`,
          unitId: occurrence.unitId,
          context: occurrence.context,
          classification: occurrence.classification,
          ownerTask: occurrence.ownerTask,
        }),
      ),
    ],
  };
}

function lessonCountPluralCandidate(): LessonCountPluralCandidate {
  const runtime = createLocaleRuntime('en');
  const mapping = MLUX_004_RUNTIME_MAPPING.find(({ unitId }) => unitId === 'MLUX-C0446');
  if (!mapping) throw new Error('MLUX-C0446 mapping is absent');
  const requiredForms = {
    en: ['one', 'other'],
    ru: ['one', 'few', 'many', 'other'],
    uz: ['one', 'other'],
  } as const;
  return {
    variables: mapping.variables,
    plural: mapping.plural,
    occurrenceIds: mapping.occurrences.map(({ id }) => `MLUX-${id}`),
    forms: Object.fromEntries(
      (['en', 'ru', 'uz'] as const).map((locale) => [
        locale,
        Object.fromEntries(
          requiredForms[locale].map((pluralForm) => [
            pluralForm,
            String(runtime.getResource(locale, 'learning', `lessonCount_${pluralForm}`) ?? ''),
          ]),
        ),
      ]),
    ) as LessonCountPluralCandidate['forms'],
  };
}

function projectionIntegrityViolations(projection: Mlux004Draft20Projection): string[] {
  const violations: string[] = [];
  if (projection.units.length !== 449) violations.push('wrong translation unit count');
  if (projection.occurrences.length !== 628) violations.push('wrong source occurrence count');
  if (projection.units.reduce((sum, unit) => sum + unit.occurrenceCount, 0) !== 628) {
    violations.push('wrong occurrence-count sum');
  }
  const units = new Map(projection.units.map((unit) => [unit.unitId, unit]));
  for (const occurrence of projection.occurrences) {
    const unit = units.get(occurrence.unitId);
    if (!unit) violations.push(`orphan occurrence ${occurrence.occurrenceId}`);
    else if (!unit.plural && unit.english !== occurrence.english) {
      violations.push(`wrong occurrence English ${occurrence.occurrenceId}`);
    }
  }
  return violations;
}

describe('MLUX-004 DRAFT-22 independent parity', () => {
  it('preserves the artifact-derived 449-unit / 628-occurrence corpus and reconciled C0143/C0170/C0446 provenance', () => {
    expect(MLUX004_DRAFT20_CORPUS_PROJECTION.version).toBe('MLUX-001-DRAFT-22');
    expect(MLUX004_DRAFT20_CORPUS_PROJECTION.sha256).toBe(
      '9FA934FB5959B1A3D005CDE5311F471B65F80B828D69FDD84A7E33E6650DA7BA',
    );
    expect(MLUX004_DRAFT20_CORPUS_PROJECTION.byteLength).toBe(101012);
    expect(projectionIntegrityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION)).toEqual([]);
    expect(MLUX004_DRAFT20_CORPUS_PROJECTION.units).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: 'MLUX-C0143',
          sourceScreen: 'src/pages/catalog-page/CourseCard.tsx:220',
        }),
        expect.objectContaining({
          unitId: 'MLUX-C0170',
          key: 'thisCourseDoesNotExistOr',
          sourceScreen: 'src/pages/course-detail-page/CourseDetailPage.tsx:41',
        }),
        expect.objectContaining({
          unitId: 'MLUX-C0446',
          namespace: 'learning',
          key: 'lessonCount',
          variables: ['count'],
          plural: true,
        }),
      ]),
    );
  });

  it('binds C0031 and C0033 owner and source-summary metadata to their frozen DRAFT-20 occurrences', () => {
    const frozenMetadata = ['MLUX-C0031', 'MLUX-C0033'].map((unitId) => {
      const unit = MLUX004_DRAFT20_CORPUS_PROJECTION.units.find(
        (candidate) => candidate.unitId === unitId,
      );
      return {
        unitId,
        sourceScreen: unit?.sourceScreen,
        ownerTasks: unit?.ownerTasks,
        occurrenceCount: unit?.occurrenceCount,
        occurrenceIds: MLUX004_DRAFT20_CORPUS_PROJECTION.occurrences
          .filter((occurrence) => occurrence.unitId === unitId)
          .map((occurrence) => occurrence.occurrenceId),
      };
    });

    expect(frozenMetadata).toEqual([
      {
        unitId: 'MLUX-C0031',
        sourceScreen: 'See Occurrences (3 verified sources)',
        ownerTasks: ['MLUX-004'],
        occurrenceCount: 3,
        occurrenceIds: ['MLUX-O0042', 'MLUX-O0171', 'MLUX-O0229'],
      },
      {
        unitId: 'MLUX-C0033',
        sourceScreen: 'See Occurrences (3 verified sources)',
        ownerTasks: ['MLUX-004'],
        occurrenceCount: 3,
        occurrenceIds: ['MLUX-O0044', 'MLUX-O0172', 'MLUX-O0297'],
      },
    ]);
  });

  it('remains frozen when the current DRAFT-25 projection grows before the historical module loads', async () => {
    const firstCurrentUnit = MLUX006_FINAL_CORPUS_PROJECTION.units[0]!;
    const firstCurrentOccurrence = MLUX006_FINAL_CORPUS_PROJECTION.occurrences[0]!;
    const grownCurrentProjection = {
      ...MLUX006_FINAL_CORPUS_PROJECTION,
      units: [
        ...MLUX006_FINAL_CORPUS_PROJECTION.units,
        { ...firstCurrentUnit, unitId: 'MLUX-C9999', occurrenceCount: 1 },
      ],
      occurrences: [
        ...MLUX006_FINAL_CORPUS_PROJECTION.occurrences,
        {
          ...firstCurrentOccurrence,
          occurrenceId: 'MLUX-O9999',
          unitId: 'MLUX-C9999',
          english: firstCurrentUnit.english,
        },
      ],
    };

    vi.resetModules();
    vi.doMock('./mlux006-final-corpus-projection', () => ({
      MLUX006_FINAL_CORPUS_PROJECTION: grownCurrentProjection,
    }));
    try {
      const { MLUX004_DRAFT22_CORPUS_PROJECTION } = await import('./mlux004-draft20-projection');
      expect(MLUX004_DRAFT22_CORPUS_PROJECTION.units).toHaveLength(449);
      expect(MLUX004_DRAFT22_CORPUS_PROJECTION.occurrences).toHaveLength(628);
      expect(
        MLUX004_DRAFT22_CORPUS_PROJECTION.units.reduce(
          (sum, unit) => sum + unit.occurrenceCount,
          0,
        ),
      ).toBe(628);
    } finally {
      vi.doUnmock('./mlux006-final-corpus-projection');
      vi.resetModules();
    }
  });

  it('rejects missing, extra, duplicate, identity, association and every mapped metadata mutation before runtime GREEN', () => {
    const candidate = mappingCandidate();
    const firstUnit = candidate.units[0]!;
    const firstOccurrence = candidate.occurrences[0]!;
    const mutateUnit = (unit: Draft20RuntimeUnitCandidate): Draft20RuntimeCandidate => ({
      ...candidate,
      units: [unit, ...candidate.units.slice(1)],
    });
    const mutateOccurrence = (
      occurrence: Draft20RuntimeOccurrenceCandidate,
    ): Draft20RuntimeCandidate => ({
      ...candidate,
      occurrences: [occurrence, ...candidate.occurrences.slice(1)],
    });

    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        units: candidate.units.slice(1),
      }),
    ).toContain(`missing unit ${firstUnit.unitId}`);
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        units: [...candidate.units, { ...firstUnit, unitId: 'MLUX-C9999' }],
      }),
    ).toContain('extra unit MLUX-C9999');
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        units: [...candidate.units, firstUnit],
      }),
    ).toContain(`duplicate unit ${firstUnit.unitId}`);
    expect(
      collectMlux004Draft20ParityViolations(
        MLUX004_DRAFT20_CORPUS_PROJECTION,
        mutateUnit({
          ...firstUnit,
          namespace: 'common',
          key: 'wrong',
          english: 'wrong',
          russian: 'wrong',
          uzbek: 'wrong',
          variables: ['wrong'],
          plural: !firstUnit.plural,
          resourceStatus: 'Missing',
          russianReview: 'Approved',
          uzbekReview: 'Approved',
          ownerTask: 'MLUX-005',
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        `wrong namespace ${firstUnit.unitId}`,
        `wrong key ${firstUnit.unitId}`,
        `wrong English ${firstUnit.unitId}`,
        `wrong Russian ${firstUnit.unitId}`,
        `wrong Uzbek ${firstUnit.unitId}`,
        `wrong variables ${firstUnit.unitId}`,
        `wrong plural ${firstUnit.unitId}`,
        `wrong resource status ${firstUnit.unitId}`,
        `wrong Russian review ${firstUnit.unitId}`,
        `wrong Uzbek review ${firstUnit.unitId}`,
        `wrong owner ${firstUnit.unitId}`,
      ]),
    );
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        occurrences: candidate.occurrences.slice(1),
      }),
    ).toContain(`missing occurrence ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        occurrences: [...candidate.occurrences, { ...firstOccurrence, occurrenceId: 'MLUX-O9999' }],
      }),
    ).toContain('extra occurrence MLUX-O9999');
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        occurrences: [...candidate.occurrences, firstOccurrence],
      }),
    ).toContain(`duplicate occurrence ${firstOccurrence.occurrenceId}`);

    const conflictingUnit = candidate.units[1]!;
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, {
        ...candidate,
        units: candidate.units.map((unit) =>
          unit.unitId === conflictingUnit.unitId
            ? { ...unit, namespace: firstUnit.namespace, key: firstUnit.key }
            : unit,
        ),
      }),
    ).toContain(
      `conflicting resource key ${firstUnit.namespace}:${firstUnit.key} ${firstUnit.unitId}/${conflictingUnit.unitId}`,
    );
    expect(
      collectMlux004Draft20ParityViolations(
        MLUX004_DRAFT20_CORPUS_PROJECTION,
        mutateOccurrence({
          ...firstOccurrence,
          unitId: 'MLUX-C9999',
          context: 'wrong',
          classification: 'Accessibility only',
          ownerTask: 'MLUX-002',
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        `wrong occurrence unit ${firstOccurrence.occurrenceId}`,
        `wrong occurrence context ${firstOccurrence.occurrenceId}`,
        `wrong occurrence classification ${firstOccurrence.occurrenceId}`,
        `wrong occurrence owner ${firstOccurrence.occurrenceId}`,
      ]),
    );
  });

  it('matches every admitted D07 mapping/resource relation after the RED contract is materialized', () => {
    expect(
      collectMlux004Draft20ParityViolations(MLUX004_DRAFT20_CORPUS_PROJECTION, mappingCandidate()),
    ).toEqual([]);
  });

  it('keeps the DRAFT-22 declined-payment title and body separately addressable in EN, RU, and UZ', () => {
    const runtime = createLocaleRuntime('en');
    const title = MLUX004_DRAFT20_CORPUS_PROJECTION.units.find(
      ({ unitId }) => unitId === 'MLUX-C0261',
    );
    const body = MLUX004_DRAFT20_CORPUS_PROJECTION.units.find(
      ({ unitId }) => unitId === 'MLUX-C0410',
    );
    if (!title || !body) throw new Error('DRAFT-22 declined-payment units are absent');
    expect(`${title.namespace}:${title.key}`).toBe('learning:mockPaymentDeclined');
    expect(`${body.namespace}:${body.key}`).toBe('learning:mockPaymentDeclinedBody');
    for (const locale of ['en', 'ru', 'uz'] as const) {
      const localizedField = locale === 'ru' ? 'russian' : 'uzbek';
      const expectedTitle = locale === 'en' ? title.english : title[localizedField].value;
      const expectedBody = locale === 'en' ? body.english : body[localizedField].value;
      expect(runtime.t(`${title.namespace}:${title.key}`, { lng: locale })).toBe(expectedTitle);
      expect(runtime.t(`${body.namespace}:${body.key}`, { lng: locale })).toBe(expectedBody);
      expect(expectedTitle).not.toBe(expectedBody);
    }
  });

  it('rejects adversarial lesson-count plural forms, selector variables, and occurrence associations', () => {
    const candidate = lessonCountPluralCandidate();
    expect(collectLessonCountPluralViolations(candidate)).toEqual([]);
    expect(collectLessonCountPluralViolations({ ...candidate, variables: [] })).toContain(
      'wrong lessonCount count selector',
    );
    expect(
      collectLessonCountPluralViolations({
        ...candidate,
        forms: { ...candidate.forms, ru: { ...candidate.forms.ru, many: 'урока' } },
      }),
    ).toContain('wrong lessonCount ru many form');
    expect(
      collectLessonCountPluralViolations({
        ...candidate,
        occurrenceIds: candidate.occurrenceIds.filter((id) => id !== 'MLUX-O0628'),
      }),
    ).toContain('missing lessonCount occurrence MLUX-O0628');
  });

  it('resolves each currently materialized Catalog unit from resources without an English fallback', () => {
    const runtime = createLocaleRuntime('en');
    const expectedUnits = MLUX004_DRAFT20_CORPUS_PROJECTION.units.filter(({ unitId }) =>
      [
        'MLUX-C0399',
        'MLUX-C0400',
        'MLUX-C0401',
        'MLUX-C0402',
        'MLUX-C0403',
        'MLUX-C0437',
        'MLUX-C0438',
        'MLUX-C0439',
        'MLUX-C0441',
        'MLUX-C0442',
        'MLUX-C0443',
        'MLUX-C0444',
        'MLUX-C0445',
      ].includes(unitId),
    );
    for (const expected of expectedUnits) {
      for (const locale of ['en', 'ru', 'uz'] as const) {
        const value = runtime.t(`${expected.namespace}:${expected.key}`, { lng: locale, count: 1 });
        const expectedTemplate =
          locale === 'en'
            ? expected.english
            : expected[locale === 'ru' ? 'russian' : 'uzbek'].value;
        const expectedValue = expected.plural
          ? locale === 'en' && expected.unitId === 'MLUX-C0401'
            ? '1 lesson available'
            : locale === 'en' && expected.unitId === 'MLUX-C0441'
              ? '1 course'
              : interpolateTemplate(expectedTemplate, 1)
          : expectedTemplate;
        expect(normalizeTemplate(value), `${locale} ${expected.unitId}`).toBe(expectedValue);
      }
    }
  });
});
