import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { formatCatalogPrice } from '../../../src/pages/catalog-page/course-card-presentation';
import type { LocalePlaceholderContract } from '../../../src/shared/locale';
import {
  createLocaleRuntime,
  type LocaleRuntimeDiagnostics,
} from '../../../src/shared/locale/i18n';
import {
  MLUX_002_RUNTIME_MAPPING,
  MLUX_002_SHARED_OCCURRENCES,
  MLUX_003_RUNTIME_MAPPING,
  MLUX_004_RUNTIME_MAPPING,
  MLUX_004_SHARED_OCCURRENCES,
  type LocaleMappingRecord,
  type LocaleOccurrenceClassification,
  type LocaleOwnerTask,
} from '../../../src/shared/locale/mapping';
import {
  MLUX_005_RUNTIME_MAPPING,
  MLUX_005_SHARED_OCCURRENCES,
} from '../../../src/shared/locale/mlux005-ledger';
import {
  MLUX_006_FOLLOWUP_RUNTIME_MAPPING,
  MLUX_006_FOLLOWUP_SHARED_OCCURRENCES,
} from '../../../src/shared/locale/mlux006-followup-ledger';
import { SUPPORTED_LOCALES, type Locale } from '../../../src/shared/locale/types';
import { MLUX_003_SOURCE_EXCLUSIONS } from '../../app/mlux003-source-exclusions';

import {
  MLUX006_FINAL_CORPUS_PROJECTION,
  type Mlux006FinalCorpusOccurrence,
  type Mlux006FinalCorpusProjection,
  type Mlux006FinalCorpusUnit,
} from './mlux006-final-corpus-projection';

interface Mlux006RuntimeUnitCandidate {
  readonly unitId: string;
  readonly namespace: string;
  readonly key: string;
  readonly runtimeEnglish: string;
  readonly variables: readonly string[];
  readonly placeholdersByLocale?: LocalePlaceholderContract;
  readonly plural: boolean;
  readonly pluralForms?: Readonly<Record<Locale, Readonly<Record<string, string>>>>;
  readonly russianValue: string;
  readonly uzbekValue: string;
  readonly ownerTasks: readonly string[];
  readonly resourceStatus: string;
  readonly russianReviewStatus: string;
  readonly uzbekReviewStatus: string;
}

interface Mlux006RuntimeOccurrenceCandidate {
  readonly occurrenceId: string;
  readonly unitId: string;
  readonly runtimeContext: string;
  readonly classification?: LocaleOccurrenceClassification;
  readonly ownerTask: string;
}

interface Mlux006RuntimeOccurrenceSource {
  readonly occurrenceId: string;
  readonly unitId: string;
  readonly runtimeContext: string;
  readonly classification: LocaleOccurrenceClassification | undefined;
  readonly ownerTask: LocaleOwnerTask;
}

interface Mlux006LegacyClassificationInheritance {
  readonly ownerTask: 'MLUX-002' | 'MLUX-003';
  readonly classification: LocaleOccurrenceClassification;
}

interface Mlux006RuntimeCandidate {
  readonly units: readonly Mlux006RuntimeUnitCandidate[];
  readonly occurrences: readonly Mlux006RuntimeOccurrenceCandidate[];
}

type Mlux006ResidualOwner = 'MLUX-002' | 'MLUX-003' | 'MLUX-004' | 'MLUX-005';

interface Mlux006ResidualSourceHit {
  readonly fingerprint: string;
  readonly owner: Mlux006ResidualOwner;
  readonly sourcePath: string;
  readonly line: number;
  readonly seam: string;
  readonly value: string;
}

interface Mlux006ResidualSourceReconciliation {
  readonly occurrenceId: string;
  readonly projectedFingerprint: string;
  readonly currentFingerprint: string;
}

type Mlux006InstructorLessonType = 'video' | 'text' | 'pdf';

interface Mlux006InstructorLessonListSourceOracle {
  readonly sourcePath: string;
  readonly line: number;
  readonly translationKeys: Readonly<Record<Mlux006InstructorLessonType, string>>;
}

interface Mlux006InstructorLessonListOccurrenceAssociation {
  readonly occurrenceId: string;
  readonly unitId: string;
  readonly lessonType: Mlux006InstructorLessonType;
  readonly translationKey: string;
}

interface Mlux006CourseActionDescriptorSource {
  readonly kind: string;
  readonly labelKey: string;
  readonly line: number;
  readonly guard: string | null;
}

interface Mlux006CourseActionOccurrenceAssociation {
  readonly occurrenceId: string;
  readonly unitId: string;
  readonly kind: string;
  readonly labelKey: string;
  readonly guard: string;
  readonly routeState: string;
}

const MLUX006_INSTRUCTOR_LESSON_LIST_SOURCE_PATH =
  'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx';

const MLUX006_COURSE_ACTION_SOURCE_PATH = 'src/features/course-detail/action-state.ts';

const MLUX006_COURSE_ACTION_OCCURRENCE_ASSOCIATIONS: readonly Mlux006CourseActionOccurrenceAssociation[] =
  [
    {
      occurrenceId: 'MLUX-O0716',
      unitId: 'MLUX-C0502',
      kind: 'disabled',
      labelKey: 'course:alreadyEnrolled',
      guard: "preflight === 'already-enrolled'",
      routeState: 'Course Detail / already-enrolled disabled action',
    },
    {
      occurrenceId: 'MLUX-O0717',
      unitId: 'MLUX-C0503',
      kind: 'disabled',
      labelKey: 'course:alreadyInCart',
      guard: "preflight === 'already-in-cart'",
      routeState: 'Course Detail / already-in-cart disabled action',
    },
    {
      occurrenceId: 'MLUX-O0720',
      unitId: 'MLUX-C0163',
      kind: 'disabled',
      labelKey: 'course:actionUnavailable',
      guard: "preflight !== 'eligible'",
      routeState: 'Course Detail / unavailable-preflight disabled action',
    },
    {
      occurrenceId: 'MLUX-O0721',
      unitId: 'MLUX-C0443',
      kind: 'enroll',
      labelKey: 'catalog:enrollFree',
      guard: "price === 'free' === true",
      routeState: 'Course Detail / eligible free action',
    },
    {
      occurrenceId: 'MLUX-O0724',
      unitId: 'MLUX-C0442',
      kind: 'cart',
      labelKey: 'catalog:addToCart',
      guard: "price === 'free' === false",
      routeState: 'Course Detail / eligible paid action',
    },
  ];

const MLUX006_INSTRUCTOR_LESSON_LIST_OCCURRENCE_ASSOCIATIONS: readonly Mlux006InstructorLessonListOccurrenceAssociation[] =
  [
    {
      occurrenceId: 'MLUX-O0667',
      unitId: 'MLUX-C0203',
      lessonType: 'video',
      translationKey: 'instructor:courseEditorVideo',
    },
    {
      occurrenceId: 'MLUX-O0668',
      unitId: 'MLUX-C0204',
      lessonType: 'text',
      translationKey: 'instructor:courseEditorText',
    },
    {
      occurrenceId: 'MLUX-O0669',
      unitId: 'MLUX-C0205',
      lessonType: 'pdf',
      translationKey: 'instructor:courseEditorPdf',
    },
  ];

const MLUX006_RESIDUAL_SOURCE_RECONCILIATIONS: readonly Mlux006ResidualSourceReconciliation[] = [
  {
    occurrenceId: 'MLUX-O0264',
    projectedFingerprint:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:463:jsx:PDF',
    currentFingerprint:
      'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:521:jsx:PDF',
  },
];

const MLUX006_LEGACY_ACCESSIBILITY_OCCURRENCE_IDS = [
  'MLUX-O0001',
  'MLUX-O0002',
  'MLUX-O0009',
  'MLUX-O0018',
  'MLUX-O0019',
  'MLUX-O0020',
  'MLUX-O0021',
  'MLUX-O0023',
  'MLUX-O0025',
  'MLUX-O0026',
  'MLUX-O0027',
  'MLUX-O0029',
  'MLUX-O0030',
  'MLUX-O0031',
] as const;

const MLUX006_LEGACY_MLUX002_VISIBLE_OCCURRENCE_IDS = [
  'MLUX-O0010',
  'MLUX-O0011',
  'MLUX-O0012',
  'MLUX-O0013',
  'MLUX-O0014',
  'MLUX-O0015',
  'MLUX-O0016',
  'MLUX-O0017',
  'MLUX-O0022',
  'MLUX-O0024',
  'MLUX-O0028',
  'MLUX-O0032',
  'MLUX-O0033',
] as const;

const MLUX006_LEGACY_MLUX003_VISIBLE_OCCURRENCE_IDS = [
  ...Array.from({ length: 47 }, (_, index) => `MLUX-O${String(index + 34).padStart(4, '0')}`),
  'MLUX-003-SO001',
  'MLUX-003-SO002',
  'MLUX-003-SO003',
  'MLUX-003-SO004',
  'MLUX-003-SO005',
] as const;

const MLUX006_LEGACY_CLASSIFICATION_INHERITANCE = new Map<
  string,
  Mlux006LegacyClassificationInheritance
>([
  ...MLUX006_LEGACY_ACCESSIBILITY_OCCURRENCE_IDS.map(
    (occurrenceId) =>
      [occurrenceId, { ownerTask: 'MLUX-002', classification: 'Accessibility only' }] as const,
  ),
  ...MLUX006_LEGACY_MLUX002_VISIBLE_OCCURRENCE_IDS.map(
    (occurrenceId) =>
      [occurrenceId, { ownerTask: 'MLUX-002', classification: 'Visible UI copy' }] as const,
  ),
  ...MLUX006_LEGACY_MLUX003_VISIBLE_OCCURRENCE_IDS.map(
    (occurrenceId) =>
      [occurrenceId, { ownerTask: 'MLUX-003', classification: 'Visible UI copy' }] as const,
  ),
]);

const allRuntimeMappings: readonly LocaleMappingRecord[] = [
  ...MLUX_002_RUNTIME_MAPPING,
  ...MLUX_003_RUNTIME_MAPPING,
  ...MLUX_004_RUNTIME_MAPPING,
  ...MLUX_005_RUNTIME_MAPPING,
  ...MLUX_006_FOLLOWUP_RUNTIME_MAPPING,
];

function canonicalOccurrenceId(id: string): string {
  return id.startsWith('O') ? `MLUX-${id}` : id;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function normalizeTemplate(value: string): string {
  return value.replace(/\{\{([^{}]+)}}/g, '{$1}');
}

function placeholderNames(value: string): string[] {
  return sortedUnique(
    [...value.matchAll(/\{\{?([A-Za-z][A-Za-z0-9]*)}}?/g)].map((match) => match[1]!),
  );
}

function runtimeOccurrenceSources(): Mlux006RuntimeOccurrenceSource[] {
  const directOccurrences = allRuntimeMappings.flatMap((mapping) =>
    mapping.occurrences.map(
      (occurrence): Mlux006RuntimeOccurrenceSource => ({
        occurrenceId: canonicalOccurrenceId(occurrence.id),
        unitId: mapping.unitId,
        runtimeContext: occurrence.context,
        classification: occurrence.classification,
        ownerTask: occurrence.ownerTask,
      }),
    ),
  );
  const sharedOccurrences = [
    ...MLUX_002_SHARED_OCCURRENCES,
    ...MLUX_004_SHARED_OCCURRENCES,
    ...MLUX_005_SHARED_OCCURRENCES,
    ...MLUX_006_FOLLOWUP_SHARED_OCCURRENCES,
  ].map(
    (occurrence): Mlux006RuntimeOccurrenceSource => ({
      occurrenceId: canonicalOccurrenceId(occurrence.id),
      unitId: occurrence.unitId,
      runtimeContext: occurrence.context,
      classification: occurrence.classification,
      ownerTask: occurrence.ownerTask,
    }),
  );
  return [...directOccurrences, ...sharedOccurrences];
}

function effectiveRuntimeClassification(
  occurrence: Mlux006RuntimeOccurrenceSource,
): LocaleOccurrenceClassification | undefined {
  if (occurrence.classification) return occurrence.classification;
  const inherited = MLUX006_LEGACY_CLASSIFICATION_INHERITANCE.get(occurrence.occurrenceId);
  return inherited?.ownerTask === occurrence.ownerTask ? inherited.classification : undefined;
}

function legacyClassificationContractViolations(
  occurrences: readonly Mlux006RuntimeOccurrenceSource[],
  inheritance: ReadonlyMap<
    string,
    Mlux006LegacyClassificationInheritance
  > = MLUX006_LEGACY_CLASSIFICATION_INHERITANCE,
): string[] {
  const violations: string[] = [];
  const consumed = new Set<string>();
  for (const occurrence of occurrences) {
    const inherited = inheritance.get(occurrence.occurrenceId);
    if (occurrence.classification) {
      if (inherited)
        violations.push(`redundant classification inheritance ${occurrence.occurrenceId}`);
      continue;
    }
    if (!inherited) {
      violations.push(`missing classification inheritance ${occurrence.occurrenceId}`);
      continue;
    }
    if (inherited.ownerTask !== occurrence.ownerTask) {
      violations.push(`wrong classification inheritance owner ${occurrence.occurrenceId}`);
      continue;
    }
    consumed.add(occurrence.occurrenceId);
  }
  for (const occurrenceId of inheritance.keys()) {
    if (!consumed.has(occurrenceId))
      violations.push(`unused classification inheritance ${occurrenceId}`);
  }
  return violations;
}

function buildRuntimeCandidate(): Mlux006RuntimeCandidate {
  const runtime = createLocaleRuntime('en');
  const mappingsByUnit = new Map<string, LocaleMappingRecord[]>();
  for (const mapping of allRuntimeMappings) {
    const mappings = mappingsByUnit.get(mapping.unitId) ?? [];
    mappings.push(mapping);
    mappingsByUnit.set(mapping.unitId, mappings);
  }

  const pluralCategories = {
    en: ['one', 'other'],
    ru: ['one', 'few', 'many', 'other'],
    uz: ['one', 'other'],
  } as const;
  const units = [...mappingsByUnit.entries()].map(([unitId, mappings]) => {
    const binding = mappings[0]!;
    return {
      unitId,
      namespace: binding.namespace,
      key: binding.key,
      runtimeEnglish: binding.english,
      variables: [...binding.variables],
      ...(binding.placeholdersByLocale || binding.plural
        ? {
            placeholdersByLocale: {
              en: binding.placeholdersByLocale
                ? [...binding.placeholdersByLocale.en]
                : sortedUnique(
                    pluralCategories.en.flatMap((form) =>
                      placeholderNames(
                        String(
                          runtime.getResource('en', binding.namespace, `${binding.key}_${form}`) ??
                            '',
                        ),
                      ),
                    ),
                  ),
              ru: binding.placeholdersByLocale
                ? [...binding.placeholdersByLocale.ru]
                : sortedUnique(
                    pluralCategories.ru.flatMap((form) =>
                      placeholderNames(
                        String(
                          runtime.getResource('ru', binding.namespace, `${binding.key}_${form}`) ??
                            '',
                        ),
                      ),
                    ),
                  ),
              uz: binding.placeholdersByLocale
                ? [...binding.placeholdersByLocale.uz]
                : sortedUnique(
                    pluralCategories.uz.flatMap((form) =>
                      placeholderNames(
                        String(
                          runtime.getResource('uz', binding.namespace, `${binding.key}_${form}`) ??
                            '',
                        ),
                      ),
                    ),
                  ),
            },
          }
        : {}),
      plural: binding.plural,
      ...(binding.plural
        ? {
            pluralForms: Object.fromEntries(
              SUPPORTED_LOCALES.map((locale) => [
                locale,
                Object.fromEntries(
                  pluralCategories[locale].map((form) => [
                    form,
                    String(
                      runtime.getResource(locale, binding.namespace, `${binding.key}_${form}`) ??
                        '',
                    ),
                  ]),
                ),
              ]),
            ) as Record<Locale, Record<string, string>>,
          }
        : {}),
      russianValue: String(runtime.getResource('ru', binding.namespace, binding.key) ?? ''),
      uzbekValue: String(runtime.getResource('uz', binding.namespace, binding.key) ?? ''),
      ownerTasks: sortedUnique(mappings.map(({ ownerTask }) => ownerTask)),
      resourceStatus: binding.resourceStatus,
      russianReviewStatus: binding.russian.review,
      uzbekReviewStatus: binding.uzbek.review,
    } satisfies Mlux006RuntimeUnitCandidate;
  });

  const occurrences = runtimeOccurrenceSources().map(
    (occurrence): Mlux006RuntimeOccurrenceCandidate => ({
      occurrenceId: occurrence.occurrenceId,
      unitId: occurrence.unitId,
      runtimeContext: occurrence.runtimeContext,
      classification: effectiveRuntimeClassification(occurrence),
      ownerTask: occurrence.ownerTask,
    }),
  );

  return {
    units,
    occurrences,
  };
}

function placeholderContractViolations(
  unitId: string,
  expected: Mlux006FinalCorpusUnit['placeholdersByLocale'],
  actual: LocalePlaceholderContract | undefined,
): string[] {
  if (!expected && !actual) return [];
  if (!expected || !actual) return [`wrong locale placeholder metadata ${unitId}`];

  const violations: string[] = [];
  if (JSON.stringify(Object.keys(expected).sort()) !== JSON.stringify(Object.keys(actual).sort())) {
    violations.push(`wrong placeholder locale keys ${unitId}`);
  }
  for (const locale of SUPPORTED_LOCALES) {
    const expectedSet = sortedUnique(expected[locale]);
    const actualSet = sortedUnique(actual[locale]);
    if (
      expected[locale].length !== expectedSet.length ||
      actual[locale].length !== actualSet.length ||
      JSON.stringify(expectedSet) !== JSON.stringify(actualSet)
    ) {
      violations.push(`wrong ${locale} placeholder metadata ${unitId}`);
    }
  }
  return violations;
}

function expectedLocalePlaceholders(unit: Mlux006FinalCorpusUnit, locale: Locale): string[] {
  return sortedUnique(unit.placeholdersByLocale?.[locale] ?? unit.variables);
}

function pushSetDifference(
  violations: string[],
  label: string,
  expected: readonly string[],
  actual: readonly string[],
): void {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  for (const value of expectedSet) {
    if (!actualSet.has(value)) violations.push(`missing ${label} ${value}`);
  }
  for (const value of actualSet) {
    if (!expectedSet.has(value)) violations.push(`extra ${label} ${value}`);
  }
}

function unitFieldViolations(
  expected: Mlux006FinalCorpusUnit,
  actual: Mlux006RuntimeUnitCandidate,
): string[] {
  const violations: string[] = [];
  const scalarFields = [
    ['namespace', expected.namespace, actual.namespace],
    ['key', expected.key, actual.key],
    ['runtime English', expected.runtimeEnglish, actual.runtimeEnglish],
    ['plural', String(expected.plural), String(actual.plural)],
    ['resource status', expected.status, actual.resourceStatus],
    ['Russian review', expected.russian.reviewStatus, actual.russianReviewStatus],
    ['Uzbek review', expected.uzbek.reviewStatus, actual.uzbekReviewStatus],
    [
      'Russian value',
      expected.plural ? actual.russianValue : normalizeTemplate(expected.russian.value),
      normalizeTemplate(actual.russianValue),
    ],
    [
      'Uzbek value',
      expected.plural ? actual.uzbekValue : normalizeTemplate(expected.uzbek.value),
      normalizeTemplate(actual.uzbekValue),
    ],
  ] as const;
  for (const [label, expectedValue, actualValue] of scalarFields) {
    if (expectedValue !== actualValue) violations.push(`wrong ${label} ${expected.unitId}`);
  }
  if (
    JSON.stringify(sortedUnique(expected.variables)) !==
    JSON.stringify(sortedUnique(actual.variables))
  ) {
    violations.push(`wrong variables ${expected.unitId}`);
  }
  violations.push(
    ...placeholderContractViolations(
      expected.unitId,
      expected.placeholdersByLocale,
      actual.placeholdersByLocale,
    ),
  );
  if (JSON.stringify(expected.pluralForms ?? null) !== JSON.stringify(actual.pluralForms ?? null)) {
    violations.push(`wrong plural forms ${expected.unitId}`);
  }
  if (
    JSON.stringify(sortedUnique(expected.runtimeOwnerTasks)) !== JSON.stringify(actual.ownerTasks)
  ) {
    violations.push(`wrong owners ${expected.unitId}`);
  }
  return violations;
}

function occurrenceFieldViolations(
  expected: Mlux006FinalCorpusOccurrence,
  actual: Mlux006RuntimeOccurrenceCandidate,
): string[] {
  const violations: string[] = [];
  if (expected.unitId !== actual.unitId)
    violations.push(`wrong occurrence unit ${expected.occurrenceId}`);
  if (expected.runtimeContext !== actual.runtimeContext) {
    violations.push(`wrong occurrence context ${expected.occurrenceId}`);
  }
  if (expected.classification !== actual.classification) {
    violations.push(`wrong occurrence classification ${expected.occurrenceId}`);
  }
  if (expected.ownerTask !== actual.ownerTask) {
    violations.push(`wrong occurrence owner ${expected.occurrenceId}`);
  }
  return violations;
}

function collectParityViolations(
  projection: Mlux006FinalCorpusProjection,
  candidate: Mlux006RuntimeCandidate,
): string[] {
  const violations: string[] = [];
  const expectedUnits = new Map(projection.units.map((unit) => [unit.unitId, unit]));
  const actualUnits = new Map(candidate.units.map((unit) => [unit.unitId, unit]));
  pushSetDifference(violations, 'unit', [...expectedUnits.keys()], [...actualUnits.keys()]);
  for (const [unitId, expected] of expectedUnits) {
    const actual = actualUnits.get(unitId);
    if (actual) violations.push(...unitFieldViolations(expected, actual));
  }

  const expectedOccurrences = new Map(
    projection.occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]),
  );
  const actualOccurrences = new Map(
    candidate.occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]),
  );
  pushSetDifference(
    violations,
    'occurrence',
    [...expectedOccurrences.keys()],
    [...actualOccurrences.keys()],
  );
  for (const [occurrenceId, expected] of expectedOccurrences) {
    const actual = actualOccurrences.get(occurrenceId);
    if (actual) violations.push(...occurrenceFieldViolations(expected, actual));
  }
  return violations;
}

function projectionIntegrityViolations(projection: Mlux006FinalCorpusProjection): string[] {
  const violations: string[] = [];
  const units = new Map(projection.units.map((unit) => [unit.unitId, unit]));
  const occurrenceCounts = new Map<string, number>();
  for (const occurrence of projection.occurrences) {
    if (!units.has(occurrence.unitId))
      violations.push(`orphan occurrence ${occurrence.occurrenceId}`);
    if (!occurrence.sourceScreen || !occurrence.routeState || !occurrence.runtimeContext) {
      violations.push(`incomplete occurrence context ${occurrence.occurrenceId}`);
    }
    if (
      !units.get(occurrence.unitId)?.plural &&
      occurrence.english !== units.get(occurrence.unitId)?.english
    ) {
      violations.push(`wrong occurrence English ${occurrence.occurrenceId}`);
    }
    occurrenceCounts.set(occurrence.unitId, (occurrenceCounts.get(occurrence.unitId) ?? 0) + 1);
  }
  for (const unit of projection.units) {
    if (unit.occurrenceCount !== (occurrenceCounts.get(unit.unitId) ?? 0)) {
      violations.push(`wrong occurrence count ${unit.unitId}`);
    }
    if (unit.plural) {
      if (!unit.pluralForms) violations.push(`missing plural forms ${unit.unitId}`);
      if (
        normalizeTemplate(unit.russian.value) !== normalizeTemplate(unit.pluralForms?.ru.one ?? '')
      ) {
        violations.push(`wrong Russian primary plural form ${unit.unitId}`);
      }
      if (
        normalizeTemplate(unit.uzbek.value) !== normalizeTemplate(unit.pluralForms?.uz.one ?? '')
      ) {
        violations.push(`wrong Uzbek primary plural form ${unit.unitId}`);
      }
    }
    for (const [locale, label, value] of [
      ['en', 'English', unit.english],
      ['ru', 'Russian', unit.russian.value],
      ['uz', 'Uzbek', unit.uzbek.value],
    ] as const) {
      if (
        !unit.plural &&
        placeholderNames(value).join('|') !== expectedLocalePlaceholders(unit, locale).join('|')
      ) {
        violations.push(`wrong ${label} placeholders ${unit.unitId}`);
      }
    }
  }
  const derivedMergedDuplicateRows = projection.occurrences.length - projection.units.length;
  if (projection.summary.translationUnits !== projection.units.length) {
    violations.push('wrong summary translation unit count');
  }
  if (projection.summary.sourceOccurrences !== projection.occurrences.length) {
    violations.push('wrong summary source occurrence count');
  }
  if (projection.summary.mergedDuplicateRows !== derivedMergedDuplicateRows) {
    violations.push('wrong summary merged duplicate relation count');
  }
  return violations;
}

function occurrenceSubtitleViolations(projection: Mlux006FinalCorpusProjection): string[] {
  const match =
    /^All (\d+) source occurrences are deduplicated by semantic key and immutable English intent\.$/.exec(
      projection.workbookFrontMatter.occurrencesSubtitle,
    );
  if (!match) return ['invalid occurrences subtitle'];

  const subtitleCount = Number(match[1]);
  return subtitleCount === projection.summary.sourceOccurrences &&
    subtitleCount === projection.occurrences.length
    ? []
    : [`wrong occurrences subtitle count ${subtitleCount}`];
}

function interpolateTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{?([A-Za-z][A-Za-z0-9]*)}}?/g, (_match, variable: string) => {
    return values[variable] ?? '';
  });
}

const USER_FACING_LITERAL_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'label',
  'placeholder',
  'title',
]);

const MLUX006_HISTORICAL_X010_EXACT_RESIDUAL_FINGERPRINTS = new Set([
  'src/features/media-access/LessonMediaAccess.tsx:67:jsx:Media unavailable in this workspace',
  'src/features/media-access/LessonMediaAccess.tsx:74:jsx:Sign in required',
  'src/features/media-access/LessonMediaAccess.tsx:104:jsx:Preparing PDF preview…',
  'src/features/media-access/LessonPdfPreview.tsx:161:jsx:Previous page',
  'src/features/media-access/LessonPdfPreview.tsx:169:jsx:Next page',
  'src/pages/ai-chat-page/AiChatPage.tsx:77:jsx:Return to my learning',
  'src/pages/ai-chat-page/AiChatPage.tsx:97:jsx:Return to learning workspace',
  'src/pages/ai-chat-page/AiChatPage.tsx:128:jsx:Return to my learning',
  'src/pages/ai-chat-page/AiChatPage.tsx:227:jsx:Return to my learning',
  'src/pages/ai-chat-page/AiChatPage.tsx:256:jsx:Return to my learning',
  'src/pages/ai-chat-page/AiChatPage.tsx:328:jsx:BETA',
  'src/pages/ai-chat-page/AiChatPage.tsx:328:jsx:AI Learning Assistant',
  'src/pages/ai-chat-page/AiChatPage.tsx:331:jsx:Ask questions, summarize lessons, take interactive practice quizzes, and get course recommendations tailored directly to your path.',
  'src/pages/ai-chat-page/AiChatPage.tsx:347:aria-label:AI assistant chat',
  'src/pages/ai-chat-page/AiChatPage.tsx:423:jsx:This conversation stays available while you continue using the assistant.',
  'src/pages/cart-page/CartPage.tsx:152:jsx:Check checkout status',
  'src/pages/cart-page/CartPage.tsx:165:jsx:Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.',
  'src/pages/cart-page/CartPage.tsx:266:jsx:Refresh cart',
  'src/pages/cart-page/CartPage.tsx:412:jsx:Cart',
  'src/pages/cart-page/CartPage.tsx:427:label:Loading cart',
  'src/pages/cart-page/CartPage.tsx:442:jsx:Cart',
  'src/pages/cart-page/CartPage.tsx:509:aria-label:Breadcrumb',
  'src/pages/cart-page/CartPage.tsx:522:jsx:Cart',
  'src/pages/cart-page/CartPage.tsx:528:jsx:Cart',
  'src/pages/cart-page/CartPage.tsx:531:jsx:course',
  'src/pages/cart-page/CartPage.tsx:572:aria-label:Cart courses',
  'src/pages/cart-page/CartPage.tsx:588:jsx:Course',
  'src/pages/cart-page/CartPage.tsx:597:jsx:Price',
  'src/pages/cart-page/CartPage.tsx:630:jsx:Go to order summary',
  'src/pages/cart-page/CartPage.tsx:634:aria-label:Cart total',
  'src/pages/cart-page/CartPage.tsx:636:jsx:Order summary',
  'src/pages/cart-page/CartPage.tsx:639:jsx:Total',
  'src/pages/cart-page/CartPage.tsx:645:jsx:Total unavailable',
  'src/pages/cart-page/CartPage.tsx:654:jsx:Mock checkout',
  'src/pages/catalog-page/CatalogPage.tsx:385:jsx:Sort by:',
  'src/pages/catalog-page/CatalogPage.tsx:388:jsx:Sort:',
  'src/pages/catalog-page/CourseCard.tsx:365:jsx:lesson',
  'src/pages/catalog-page/CourseCard.tsx:365:jsx:available',
  'src/pages/catalog-page/CourseCard.tsx:385:jsx:Course description:',
  'src/pages/catalog-page/CourseCard.tsx:408:jsx:Details',
  'src/pages/course-detail-page/CourseDetailPage.tsx:114:label:Loading course details',
  'src/pages/course-detail-page/CourseOutline.tsx:39:jsx:Course outline',
  'src/pages/course-detail-page/CourseOutline.tsx:42:label:Loading course outline',
  'src/pages/course-detail-page/CourseOutline.tsx:59:jsx:No lessons have been added yet.',
  'src/pages/course-detail-page/CourseOutline.tsx:72:jsx:lesson ·',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:101:jsx:The mock payment completed. Enrollment status was refreshed; learning unlocks only after active status is observed.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:111:jsx:The mock payment was declined. This enrollment remains locked.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:120:jsx:The enrollment is still pending, so you can choose a new mock payment outcome.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:131:jsx:We could not confirm the mock payment status. Check enrollment status before taking another action.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:138:jsx:Sign in again before checking payment status.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:147:jsx:This payment action is not available for the current account.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:156:jsx:Mock payment is currently unavailable. Check enrollment status later.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:169:aria-label:Breadcrumb',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:302:jsx:Try again',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:437:jsx:Mock payment is awaiting completion. Learning remains locked until your enrollment is active.',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:451:jsx:Check payment status',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:465:jsx:Complete mock payment',
  'src/pages/learning-detail-page/LearningDetailPage.tsx:474:jsx:Simulate mock payment failure',
  'src/pages/learning-list-page/LearningListPage.tsx:180:aria-label:Breadcrumb',
  'src/shared/ui/primitives/Pagination.tsx:103:jsx:Page',
  'src/shared/ui/primitives/Pagination.tsx:103:jsx:of',
  'src/widgets/course-chat/CourseChatLauncher.tsx:127:aria-label:Course assistant',
  'src/widgets/course-chat/CourseChatLauncher.tsx:151:aria-label:Open AI assistant',
  'src/widgets/course-chat/CourseChatLauncher.tsx:166:jsx:Open AI assistant',
  'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:99:jsx:Expand chat',
  'src/widgets/course-chat/CourseChatLauncherInteraction.tsx:178:jsx:Close chat',
  'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:122:jsx:Updating lesson progress.',
  'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:166:label:Loading learning progress',
  'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:253:jsx:available now ·',
  'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:254:jsx:coming soon',
  'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx:292:jsx:lesson ·',
]);

const MLUX006_CURRENT_EXACT_EXCLUSION_FINGERPRINTS = new Set([
  'src/app/layouts/AppShell.tsx:611:jsx:LearnHub',
  'src/app/router/PlaceholderPage.tsx:16:jsx:Use the navigation to continue exploring LearnHub.',
]);

type Mlux003SourceExclusion = (typeof MLUX_003_SOURCE_EXCLUSIONS)[number];

type Mlux003SourceExclusionCandidate = {
  readonly [Field in keyof Mlux003SourceExclusion]: Mlux003SourceExclusion[Field] extends string
    ? string
    : Mlux003SourceExclusion[Field] extends number
      ? number
      : Mlux003SourceExclusion[Field];
};

function x012ExclusionViolations(
  projection: Mlux006FinalCorpusProjection,
  sourceExclusions: readonly Mlux003SourceExclusionCandidate[] = MLUX_003_SOURCE_EXCLUSIONS,
): string[] {
  const violations: string[] = [];
  const sourceExclusion = sourceExclusions.find(({ id }) => id === 'MLUX-X012');
  const projectionExclusions = projection.exclusions.filter(({ id }) => id === 'MLUX-X012');
  if (!sourceExclusion) return ['missing source exclusion MLUX-X012'];
  if (projectionExclusions.length !== 1) {
    violations.push('wrong projection exclusion count MLUX-X012');
    return violations;
  }

  const projectionExclusion = projectionExclusions[0]!;
  const expectedSourceCategory = `${sourceExclusion.sourcePath}:${sourceExclusion.line} — ${sourceExclusion.seam.toUpperCase()} “${sourceExclusion.value}”`;
  const scalarFields = [
    ['corpus version', sourceExclusion.corpusVersion, 'MLUX-001-DRAFT-26'],
    ['source category', projectionExclusion.sourceCategory, expectedSourceCategory],
    ['origin', projectionExclusion.origin, sourceExclusion.origin],
    ['status', projectionExclusion.status, sourceExclusion.status],
    ['boundary reason', projectionExclusion.boundaryReason, sourceExclusion.boundaryReason],
  ] as const;
  for (const [label, actual, expected] of scalarFields) {
    if (actual !== expected) violations.push(`wrong X012 ${label}`);
  }
  return violations;
}

function residualOwnerForPath(sourcePath: string): Mlux006ResidualOwner {
  if (sourcePath.startsWith('src/app/layouts/')) return 'MLUX-002';
  if (sourcePath.startsWith('src/app/router/')) return 'MLUX-003';
  if (sourcePath.includes('/instructor-') || sourcePath.includes('/instructor-course-')) {
    return 'MLUX-005';
  }
  return 'MLUX-004';
}

function instructorLessonListSourceOracle(
  source = readFileSync(
    pathToFileURL(
      join(
        fileURLToPath(new URL('../../../', import.meta.url)),
        MLUX006_INSTRUCTOR_LESSON_LIST_SOURCE_PATH,
      ),
    ),
    'utf8',
  ),
): Mlux006InstructorLessonListSourceOracle {
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const sourceFile = ts.createSourceFile(
    MLUX006_INSTRUCTOR_LESSON_LIST_SOURCE_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const translationKeys: Partial<Record<Mlux006InstructorLessonType, string>> = {};
  const translationCalls: ts.CallExpression[] = [];
  const visitNode = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'LESSON_TYPE_LABEL_KEY' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (
          ts.isPropertyAssignment(property) &&
          property.name &&
          ts.isIdentifier(property.name) &&
          ts.isStringLiteral(property.initializer) &&
          ['video', 'text', 'pdf'].includes(property.name.text)
        ) {
          translationKeys[property.name.text as Mlux006InstructorLessonType] =
            property.initializer.text;
        }
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't' &&
      node.arguments.length === 1 &&
      ts.isElementAccessExpression(node.arguments[0]) &&
      ts.isIdentifier(node.arguments[0].expression) &&
      node.arguments[0].expression.text === 'LESSON_TYPE_LABEL_KEY' &&
      ts.isPropertyAccessExpression(node.arguments[0].argumentExpression) &&
      ts.isIdentifier(node.arguments[0].argumentExpression.expression) &&
      node.arguments[0].argumentExpression.expression.text === 'lesson' &&
      node.arguments[0].argumentExpression.name.text === 'lessonType'
    ) {
      translationCalls.push(node);
    }
    ts.forEachChild(node, visitNode);
  };
  visitNode(sourceFile);

  if (translationCalls.length !== 1) {
    throw new Error(`Expected one lesson-list translation seam, found ${translationCalls.length}`);
  }
  for (const lessonType of ['video', 'text', 'pdf'] as const) {
    if (!translationKeys[lessonType]) {
      throw new Error(`Missing LESSON_TYPE_LABEL_KEY mapping for ${lessonType}`);
    }
  }
  const translationCall = translationCalls[0]!;
  return {
    sourcePath: relative(
      repositoryRoot,
      join(repositoryRoot, MLUX006_INSTRUCTOR_LESSON_LIST_SOURCE_PATH),
    )
      .split(sep)
      .join('/'),
    line: sourceFile.getLineAndCharacterOfPosition(translationCall.getStart(sourceFile)).line + 1,
    translationKeys: translationKeys as Readonly<Record<Mlux006InstructorLessonType, string>>,
  };
}

function instructorLessonListAssociationViolations(
  oracle: Mlux006InstructorLessonListSourceOracle,
  projection: Mlux006FinalCorpusProjection = MLUX006_FINAL_CORPUS_PROJECTION,
  sharedOccurrences: readonly (typeof MLUX_006_FOLLOWUP_SHARED_OCCURRENCES)[number][] = MLUX_006_FOLLOWUP_SHARED_OCCURRENCES,
): string[] {
  const violations: string[] = [];
  const sourceScreen = `${oracle.sourcePath}:${oracle.line}`;
  const runtimeContext = `${sourceScreen} — Page: instructor-course-editor-page / lesson list type`;
  const sourceAssociations = projection.occurrences.filter(
    (occurrence) =>
      occurrence.ownerTask === 'MLUX-006-FOLLOWUP' &&
      MLUX006_INSTRUCTOR_LESSON_LIST_OCCURRENCE_ASSOCIATIONS.some(
        ({ occurrenceId }) => occurrence.occurrenceId === occurrenceId,
      ),
  );
  if (sourceAssociations.length !== MLUX006_INSTRUCTOR_LESSON_LIST_OCCURRENCE_ASSOCIATIONS.length) {
    violations.push('wrong instructor lesson-list projection association count');
  }
  for (const association of MLUX006_INSTRUCTOR_LESSON_LIST_OCCURRENCE_ASSOCIATIONS) {
    const projectionOccurrences = projection.occurrences.filter(
      ({ occurrenceId }) => occurrenceId === association.occurrenceId,
    );
    const sharedOccurrencesForAssociation = sharedOccurrences.filter(
      ({ id }) => id === association.occurrenceId.replace('MLUX-', ''),
    );
    if (projectionOccurrences.length !== 1) {
      violations.push(`wrong projection association count ${association.occurrenceId}`);
      continue;
    }
    if (sharedOccurrencesForAssociation.length !== 1) {
      violations.push(`wrong ledger association count ${association.occurrenceId}`);
      continue;
    }
    const projectionOccurrence = projectionOccurrences[0]!;
    const sharedOccurrence = sharedOccurrencesForAssociation[0]!;
    if (projectionOccurrence.unitId !== association.unitId) {
      violations.push(`wrong projection unit ${association.occurrenceId}`);
    }
    if (sharedOccurrence.unitId !== association.unitId) {
      violations.push(`wrong ledger unit ${association.occurrenceId}`);
    }
    if (projectionOccurrence.sourceScreen !== sourceScreen) {
      violations.push(`wrong projection source seam ${association.occurrenceId}`);
    }
    if (projectionOccurrence.runtimeContext !== runtimeContext) {
      violations.push(`wrong projection context ${association.occurrenceId}`);
    }
    if (sharedOccurrence.context !== runtimeContext) {
      violations.push(`wrong ledger context ${association.occurrenceId}`);
    }
    if (oracle.translationKeys[association.lessonType] !== association.translationKey) {
      violations.push(`wrong source key ${association.lessonType}`);
    }
  }
  return violations;
}

function courseActionDescriptorSources(
  source = readFileSync(
    pathToFileURL(
      join(fileURLToPath(new URL('../../../', import.meta.url)), MLUX006_COURSE_ACTION_SOURCE_PATH),
    ),
    'utf8',
  ),
): readonly Mlux006CourseActionDescriptorSource[] {
  const sourceFile = ts.createSourceFile(
    MLUX006_COURSE_ACTION_SOURCE_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const primaryAction = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'coursePrimaryAction',
  );
  if (!primaryAction?.body) throw new Error('Missing coursePrimaryAction source owner');

  const descriptors: Mlux006CourseActionDescriptorSource[] = [];
  const stringProperty = (object: ts.ObjectLiteralExpression, name: string): string | null => {
    const property = object.properties.find(
      (candidate): candidate is ts.PropertyAssignment =>
        ts.isPropertyAssignment(candidate) && candidate.name.getText(sourceFile) === name,
    );
    return property && ts.isStringLiteral(property.initializer) ? property.initializer.text : null;
  };
  const visitNode = (node: ts.Node, guard: string | null): void => {
    if (ts.isIfStatement(node)) {
      const condition = node.expression.getText(sourceFile);
      visitNode(node.thenStatement, condition);
      if (node.elseStatement) visitNode(node.elseStatement, `!(${condition})`);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      const condition = node.condition.getText(sourceFile);
      visitNode(node.whenTrue, `${condition} === true`);
      visitNode(node.whenFalse, `${condition} === false`);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      const kind = stringProperty(node, 'kind');
      const labelKey = stringProperty(node, 'labelKey');
      if (kind && labelKey) {
        descriptors.push({
          kind,
          labelKey,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
          guard,
        });
      }
    }
    ts.forEachChild(node, (child) => visitNode(child, guard));
  };
  visitNode(primaryAction.body, null);
  return descriptors;
}

function courseActionOccurrenceAssociationViolations(
  descriptors: readonly Mlux006CourseActionDescriptorSource[],
  projection: Mlux006FinalCorpusProjection = MLUX006_FINAL_CORPUS_PROJECTION,
  runtimeMapping: readonly LocaleMappingRecord[] = MLUX_006_FOLLOWUP_RUNTIME_MAPPING,
  sharedOccurrences: readonly (typeof MLUX_006_FOLLOWUP_SHARED_OCCURRENCES)[number][] = MLUX_006_FOLLOWUP_SHARED_OCCURRENCES,
): string[] {
  const violations: string[] = [];
  for (const association of MLUX006_COURSE_ACTION_OCCURRENCE_ASSOCIATIONS) {
    const sourceDescriptors = descriptors.filter(
      (descriptor) =>
        descriptor.kind === association.kind &&
        descriptor.labelKey === association.labelKey &&
        descriptor.guard === association.guard,
    );
    if (sourceDescriptors.length !== 1) {
      violations.push(`wrong source descriptor count ${association.occurrenceId}`);
      continue;
    }
    const sourceDescriptor = sourceDescriptors[0]!;
    const sourceScreen = `${MLUX006_COURSE_ACTION_SOURCE_PATH}:${sourceDescriptor.line}`;
    const runtimeContext = `${sourceScreen} — ${association.routeState}`;
    const projectionOccurrences = projection.occurrences.filter(
      ({ occurrenceId }) => occurrenceId === association.occurrenceId,
    );
    const ledgerOccurrences = [
      ...runtimeMapping.flatMap((record) =>
        record.occurrences
          .filter(({ id }) => id === association.occurrenceId.replace('MLUX-', ''))
          .map((occurrence) => ({ ...occurrence, unitId: record.unitId })),
      ),
      ...sharedOccurrences.filter(({ id }) => id === association.occurrenceId.replace('MLUX-', '')),
    ];
    if (projectionOccurrences.length !== 1) {
      violations.push(`wrong projection association count ${association.occurrenceId}`);
      continue;
    }
    if (ledgerOccurrences.length !== 1) {
      violations.push(`wrong ledger association count ${association.occurrenceId}`);
      continue;
    }
    const projectionOccurrence = projectionOccurrences[0]!;
    const ledgerOccurrence = ledgerOccurrences[0]!;
    if (projectionOccurrence.unitId !== association.unitId) {
      violations.push(`wrong projection unit ${association.occurrenceId}`);
    }
    if (ledgerOccurrence.unitId !== association.unitId) {
      violations.push(`wrong ledger unit ${association.occurrenceId}`);
    }
    if (projectionOccurrence.sourceScreen !== sourceScreen) {
      violations.push(`wrong projection source seam ${association.occurrenceId}`);
    }
    if (projectionOccurrence.runtimeContext !== runtimeContext) {
      violations.push(`wrong projection context ${association.occurrenceId}`);
    }
    if (ledgerOccurrence.context !== runtimeContext) {
      violations.push(`wrong ledger context ${association.occurrenceId}`);
    }
  }
  return violations;
}

function collectResidualSourceHits(): Mlux006ResidualSourceHit[] {
  const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const sourceRoot = join(repositoryRoot, 'src');
  const sourceFiles: string[] = [];
  const visitDirectory = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) visitDirectory(entryPath);
      else if (entry.name.endsWith('.tsx')) sourceFiles.push(entryPath);
    }
  };
  visitDirectory(sourceRoot);

  const hits: Mlux006ResidualSourceHit[] = [];
  for (const filePath of sourceFiles.sort()) {
    const source = readFileSync(pathToFileURL(filePath), 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const sourcePath = relative(repositoryRoot, filePath).split(sep).join('/');
    const visitNode = (node: ts.Node): void => {
      let seam: string | null = null;
      let value = '';
      if (ts.isJsxText(node)) {
        seam = 'jsx';
        value = node.text.replace(/\s+/g, ' ').trim();
      } else if (
        ts.isJsxAttribute(node) &&
        USER_FACING_LITERAL_ATTRIBUTES.has(node.name.getText(sourceFile)) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        seam = node.name.getText(sourceFile);
        value = node.initializer.text.replace(/\s+/g, ' ').trim();
      }

      if (seam && /[A-Za-z]{2}/.test(value) && !/^&[a-z]+;$/.test(value)) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        hits.push({
          fingerprint: `${sourcePath}:${line}:${seam}:${value}`,
          owner: residualOwnerForPath(sourcePath),
          sourcePath,
          line,
          seam,
          value,
        });
      }
      ts.forEachChild(node, visitNode);
    };
    visitNode(sourceFile);
  }
  return hits;
}

function projectedOccurrenceFingerprint(occurrence: Mlux006FinalCorpusOccurrence): string | null {
  return occurrence.sourceScreen.startsWith('src/')
    ? `${occurrence.sourceScreen}:${occurrence.extractionKind}:${occurrence.english}`
    : null;
}

function residualSourceReconciliationViolations(
  hits: readonly Mlux006ResidualSourceHit[],
  projection: Mlux006FinalCorpusProjection = MLUX006_FINAL_CORPUS_PROJECTION,
  reconciliations: readonly Mlux006ResidualSourceReconciliation[] = MLUX006_RESIDUAL_SOURCE_RECONCILIATIONS,
): string[] {
  const violations: string[] = [];
  const occurrencesById = new Map(
    projection.occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence]),
  );
  const currentFingerprintCounts = new Map<string, number>();
  for (const hit of hits) {
    currentFingerprintCounts.set(
      hit.fingerprint,
      (currentFingerprintCounts.get(hit.fingerprint) ?? 0) + 1,
    );
  }
  const seenOccurrenceIds = new Set<string>();
  const seenCurrentFingerprints = new Set<string>();
  for (const reconciliation of reconciliations) {
    const occurrence = occurrencesById.get(reconciliation.occurrenceId);
    if (!occurrence) {
      violations.push(`unknown source reconciliation ${reconciliation.occurrenceId}`);
      continue;
    }
    if (projectedOccurrenceFingerprint(occurrence) !== reconciliation.projectedFingerprint) {
      violations.push(`wrong projected source reconciliation ${reconciliation.occurrenceId}`);
    }
    if (seenOccurrenceIds.has(reconciliation.occurrenceId)) {
      violations.push(`duplicate source reconciliation occurrence ${reconciliation.occurrenceId}`);
    }
    if (seenCurrentFingerprints.has(reconciliation.currentFingerprint)) {
      violations.push(
        `duplicate current source reconciliation ${reconciliation.currentFingerprint}`,
      );
    }
    const currentCount = currentFingerprintCounts.get(reconciliation.currentFingerprint) ?? 0;
    if (currentCount !== 1) {
      violations.push(
        `${currentCount === 0 ? 'missing' : 'duplicate'} current source reconciliation ${reconciliation.currentFingerprint}`,
      );
    }
    const projectedCount = currentFingerprintCounts.get(reconciliation.projectedFingerprint) ?? 0;
    if (
      reconciliation.projectedFingerprint !== reconciliation.currentFingerprint &&
      currentCount + projectedCount > 1
    ) {
      violations.push(`duplicate projected source association ${reconciliation.occurrenceId}`);
    }
    seenOccurrenceIds.add(reconciliation.occurrenceId);
    seenCurrentFingerprints.add(reconciliation.currentFingerprint);
  }
  return violations;
}

function matchingUnitsForResidualHit(
  hit: Mlux006ResidualSourceHit,
  allHits: readonly Mlux006ResidualSourceHit[],
  projection: Mlux006FinalCorpusProjection = MLUX006_FINAL_CORPUS_PROJECTION,
  reconciliations: readonly Mlux006ResidualSourceReconciliation[] = MLUX006_RESIDUAL_SOURCE_RECONCILIATIONS,
): Mlux006FinalCorpusUnit[] {
  if (allHits.filter(({ fingerprint }) => fingerprint === hit.fingerprint).length !== 1) return [];
  const unitsById = new Map(projection.units.map((unit) => [unit.unitId, unit]));
  const matchingOccurrencesForHit = (sourceHit: Mlux006ResidualSourceHit) => {
    const reconciliationOccurrenceIds = new Set(
      reconciliations
        .filter(({ currentFingerprint }) => currentFingerprint === sourceHit.fingerprint)
        .map(({ occurrenceId }) => occurrenceId),
    );
    return projection.occurrences.filter((occurrence) => {
      const fingerprint = projectedOccurrenceFingerprint(occurrence);
      if (fingerprint === sourceHit.fingerprint) return true;
      if (!reconciliationOccurrenceIds.has(occurrence.occurrenceId)) return false;
      return reconciliations.some(
        (reconciliation) =>
          reconciliation.occurrenceId === occurrence.occurrenceId &&
          reconciliation.currentFingerprint === sourceHit.fingerprint &&
          reconciliation.projectedFingerprint === fingerprint,
      );
    });
  };
  const matchingOccurrences = matchingOccurrencesForHit(hit);
  if (matchingOccurrences.length !== 1) return [];
  const matchedOccurrenceId = matchingOccurrences[0]!.occurrenceId;
  const associatedHitCount = allHits.filter((sourceHit) =>
    matchingOccurrencesForHit(sourceHit).some(
      ({ occurrenceId }) => occurrenceId === matchedOccurrenceId,
    ),
  ).length;
  if (associatedHitCount !== 1) return [];
  return matchingOccurrences.map(({ unitId }) => unitsById.get(unitId)!).filter(Boolean);
}

describe('MLUX-006 final corpus parity', () => {
  it('derives the unique instructor lesson-list seam and binds each reused Video/Text/PDF occurrence to it', () => {
    const oracle = instructorLessonListSourceOracle();

    expect(oracle).toMatchObject({
      sourcePath: MLUX006_INSTRUCTOR_LESSON_LIST_SOURCE_PATH,
      translationKeys: {
        video: 'instructor:courseEditorVideo',
        text: 'instructor:courseEditorText',
        pdf: 'instructor:courseEditorPdf',
      },
    });
    expect(instructorLessonListAssociationViolations(oracle)).toEqual([]);
  });

  it('rejects a source-line mismatch derived from the live lesson-list translation seam', () => {
    const oracle = instructorLessonListSourceOracle();
    const movedOracle = { ...oracle, line: oracle.line + 1 };

    expect(instructorLessonListAssociationViolations(movedOracle)).toEqual([
      'wrong projection source seam MLUX-O0667',
      'wrong projection context MLUX-O0667',
      'wrong ledger context MLUX-O0667',
      'wrong projection source seam MLUX-O0668',
      'wrong projection context MLUX-O0668',
      'wrong ledger context MLUX-O0668',
      'wrong projection source seam MLUX-O0669',
      'wrong projection context MLUX-O0669',
      'wrong ledger context MLUX-O0669',
    ]);
  });

  it('derives every R54 Course Action ownership line and binds its ledger and projection occurrence', () => {
    expect(courseActionOccurrenceAssociationViolations(courseActionDescriptorSources())).toEqual(
      [],
    );
  });

  it('rejects a moved Course Action descriptor even when copied projection metadata remains unchanged', () => {
    const descriptors = courseActionDescriptorSources();
    const movedDescriptors = descriptors.map((descriptor) =>
      descriptor.labelKey === 'course:alreadyEnrolled' &&
      descriptor.guard === "preflight === 'already-enrolled'"
        ? { ...descriptor, line: descriptor.line + 1 }
        : descriptor,
    );

    expect(courseActionOccurrenceAssociationViolations(movedDescriptors)).toContain(
      'wrong projection source seam MLUX-O0716',
    );
    expect(courseActionOccurrenceAssociationViolations(movedDescriptors)).toContain(
      'wrong ledger context MLUX-O0716',
    );
  });

  it('uses the deterministic in-app locale selector for FE014 browser locale matrices', () => {
    const browserSource = readFileSync(
      pathToFileURL(
        join(
          fileURLToPath(new URL('../../../', import.meta.url)),
          'tests',
          'browser',
          'instructor-course-editor-fe014.spec.ts',
        ),
      ),
      'utf8',
    );
    expect(browserSource).not.toContain('page.addInitScript((selectedLocale)');
    expect(browserSource).toContain('selectFixtureLocale(page, locale)');
  });

  it('matches the exact DRAFT-34 identity, allocation, statuses and deferred linguistic gate', () => {
    expect(MLUX006_FINAL_CORPUS_PROJECTION).toMatchObject({
      version: 'MLUX-001-DRAFT-34',
      sha256: '55FE729717A075BA58A3CE5556D9D806619E9F6F6B72BEAB010E1FF88BB77AE1',
      byteLength: 115726,
      summary: {
        translationUnits: 505,
        sourceOccurrences: 723,
        mergedDuplicateRows: 218,
        russianDrafts: 505,
        uzbekDrafts: 505,
        draftStatus: 'Draft',
      },
    });
    expect(MLUX006_FINAL_CORPUS_PROJECTION.units).toHaveLength(505);
    expect(MLUX006_FINAL_CORPUS_PROJECTION.occurrences).toHaveLength(723);
    expect(MLUX006_FINAL_CORPUS_PROJECTION.exclusions.map(({ id }) => id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `MLUX-X${String(index + 1).padStart(3, '0')}`),
    );
    expect(MLUX006_FINAL_CORPUS_PROJECTION.acceptance).toEqual([
      expect.objectContaining({
        corpusVersion: 'MLUX-001-DRAFT-34',
        authority: 'Product owner',
        language: 'Russian',
        verdict: 'Pending',
        date: null,
      }),
      expect.objectContaining({
        corpusVersion: 'MLUX-001-DRAFT-34',
        authority: 'Selected native reviewer',
        language: 'Uzbek',
        verdict: 'Pending',
        date: null,
      }),
    ]);
    expect(projectionIntegrityViolations(MLUX006_FINAL_CORPUS_PROJECTION)).toEqual([]);
    expect(occurrenceSubtitleViolations(MLUX006_FINAL_CORPUS_PROJECTION)).toEqual([]);
  });

  it('rejects unit and merged-relation summary mutations derived from the occurrence graph', () => {
    const firstUnit = MLUX006_FINAL_CORPUS_PROJECTION.units[0];
    expect(
      projectionIntegrityViolations({
        ...MLUX006_FINAL_CORPUS_PROJECTION,
        units: [
          { ...firstUnit, occurrenceCount: firstUnit.occurrenceCount + 1 },
          ...MLUX006_FINAL_CORPUS_PROJECTION.units.slice(1),
        ],
      }),
    ).toContain(`wrong occurrence count ${firstUnit.unitId}`);
    expect(
      projectionIntegrityViolations({
        ...MLUX006_FINAL_CORPUS_PROJECTION,
        summary: { ...MLUX006_FINAL_CORPUS_PROJECTION.summary, mergedDuplicateRows: 207 },
      }),
    ).toContain('wrong summary merged duplicate relation count');
  });

  it('rejects stale DRAFT-31 occurrence front matter even when the structural count is current', () => {
    expect(
      occurrenceSubtitleViolations({
        ...MLUX006_FINAL_CORPUS_PROJECTION,
        workbookFrontMatter: {
          occurrencesSubtitle:
            'All 693 source occurrences are deduplicated by semantic key and immutable English intent.',
        },
      }),
    ).toEqual(['wrong occurrences subtitle count 693']);
  });

  it('binds X012 to one exact DRAFT-26 source seam and rejects every boundary drift', () => {
    expect(x012ExclusionViolations(MLUX006_FINAL_CORPUS_PROJECTION)).toEqual([]);

    const x012 = MLUX_003_SOURCE_EXCLUSIONS[0];
    const replaceX012 = (replacement: Mlux003SourceExclusionCandidate) => [replacement];
    expect(x012ExclusionViolations(MLUX006_FINAL_CORPUS_PROJECTION, [])).toContain(
      'missing source exclusion MLUX-X012',
    );
    expect(
      x012ExclusionViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceX012({ ...x012, id: 'MLUX-X011' }),
      ),
    ).toContain('missing source exclusion MLUX-X012');
    expect(
      x012ExclusionViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceX012({ ...x012, corpusVersion: 'MLUX-001-DRAFT-24' }),
      ),
    ).toContain('wrong X012 corpus version');
    for (const replacement of [
      { ...x012, sourcePath: 'src/app/router/Other.tsx' },
      { ...x012, line: 17 },
      { ...x012, seam: 'aria-label' },
      { ...x012, value: 'Changed fallback note.' },
    ]) {
      expect(
        x012ExclusionViolations(MLUX006_FINAL_CORPUS_PROJECTION, replaceX012(replacement)),
      ).toContain('wrong X012 source category');
    }
    expect(
      x012ExclusionViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceX012({ ...x012, origin: 'Changed origin' }),
      ),
    ).toContain('wrong X012 origin');
    expect(
      x012ExclusionViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceX012({ ...x012, status: 'Changed' }),
      ),
    ).toContain('wrong X012 status');
    expect(
      x012ExclusionViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceX012({ ...x012, boundaryReason: 'Changed boundary' }),
      ),
    ).toContain('wrong X012 boundary reason');
  });

  it('matches every runtime unit, occurrence relation, owner, context and locale value', () => {
    const candidate = buildRuntimeCandidate();
    expect(MLUX006_LEGACY_CLASSIFICATION_INHERITANCE.size).toBe(79);
    expect(
      [...MLUX006_LEGACY_CLASSIFICATION_INHERITANCE.values()].filter(
        ({ classification }) => classification === 'Accessibility only',
      ),
    ).toHaveLength(14);
    expect(
      [...MLUX006_LEGACY_CLASSIFICATION_INHERITANCE.values()].filter(
        ({ classification }) => classification === 'Visible UI copy',
      ),
    ).toHaveLength(65);
    expect(
      [...MLUX006_LEGACY_CLASSIFICATION_INHERITANCE.values()].filter(
        ({ ownerTask }) => ownerTask === 'MLUX-002',
      ),
    ).toHaveLength(27);
    expect(
      [...MLUX006_LEGACY_CLASSIFICATION_INHERITANCE.values()].filter(
        ({ ownerTask }) => ownerTask === 'MLUX-003',
      ),
    ).toHaveLength(52);
    const occurrenceSources = runtimeOccurrenceSources();
    expect(legacyClassificationContractViolations(occurrenceSources)).toEqual([]);
    const missingInheritance = new Map(MLUX006_LEGACY_CLASSIFICATION_INHERITANCE);
    missingInheritance.delete('MLUX-O0001');
    expect(legacyClassificationContractViolations(occurrenceSources, missingInheritance)).toContain(
      'missing classification inheritance MLUX-O0001',
    );
    const unusedInheritance = new Map(MLUX006_LEGACY_CLASSIFICATION_INHERITANCE).set('MLUX-O9999', {
      ownerTask: 'MLUX-002',
      classification: 'Visible UI copy',
    });
    expect(legacyClassificationContractViolations(occurrenceSources, unusedInheritance)).toContain(
      'unused classification inheritance MLUX-O9999',
    );
    const wrongOwnerInheritance = new Map(MLUX006_LEGACY_CLASSIFICATION_INHERITANCE).set(
      'MLUX-O0001',
      { ownerTask: 'MLUX-003', classification: 'Accessibility only' },
    );
    expect(
      legacyClassificationContractViolations(occurrenceSources, wrongOwnerInheritance),
    ).toContain('wrong classification inheritance owner MLUX-O0001');
    expect(candidate.occurrences.every(({ classification }) => Boolean(classification))).toBe(true);
    expect(candidate.units).toHaveLength(505);
    expect(candidate.occurrences).toHaveLength(723);
    expect(new Set(candidate.occurrences.map(({ occurrenceId }) => occurrenceId))).toHaveLength(
      723,
    );
    expect(collectParityViolations(MLUX006_FINAL_CORPUS_PROJECTION, candidate)).toEqual([]);
  });

  it('projects the exact public locale-aware C0350 placeholder contract', () => {
    const c0350 = buildRuntimeCandidate().units.find(({ unitId }) => unitId === 'MLUX-C0350');
    expect(c0350?.variables).toEqual(['total', 'suffix', 'page', 'pages']);
    expect(c0350?.placeholdersByLocale).toEqual({
      en: ['page', 'pages', 'suffix', 'total'],
      ru: ['page', 'pages', 'total'],
      uz: ['page', 'pages', 'total'],
    });
    expect(c0350?.placeholdersByLocale?.ru).not.toContain('suffix');
    expect(c0350?.placeholdersByLocale?.uz).not.toContain('suffix');
  });

  it('rejects missing, extra, moved and metadata/value/placeholder/plural mutations', () => {
    const candidate = buildRuntimeCandidate();
    const firstUnit = candidate.units[0]!;
    const firstOccurrence = candidate.occurrences[0]!;
    const c0350 = candidate.units.find(({ unitId }) => unitId === 'MLUX-C0350')!;
    const pluralUnit = candidate.units.find(({ plural }) => plural)!;
    const replaceUnit = (replacement: Mlux006RuntimeUnitCandidate): Mlux006RuntimeCandidate => ({
      ...candidate,
      units: [replacement, ...candidate.units.slice(1)],
    });
    const replaceOccurrence = (
      replacement: Mlux006RuntimeOccurrenceCandidate,
    ): Mlux006RuntimeCandidate => ({
      ...candidate,
      occurrences: [replacement, ...candidate.occurrences.slice(1)],
    });
    const replaceUnitById = (
      replacement: Mlux006RuntimeUnitCandidate,
    ): Mlux006RuntimeCandidate => ({
      ...candidate,
      units: candidate.units.map((unit) =>
        unit.unitId === replacement.unitId ? replacement : unit,
      ),
    });

    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnit({ ...firstUnit, namespace: 'wrong' }),
      ),
    ).toContain(`wrong namespace ${firstUnit.unitId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnit({ ...firstUnit, russianValue: 'wrong' }),
      ),
    ).toContain(`wrong Russian value ${firstUnit.unitId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnit({ ...firstUnit, variables: ['wrongVariable'] }),
      ),
    ).toContain(`wrong variables ${firstUnit.unitId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnit({ ...firstUnit, plural: true }),
      ),
    ).toContain(`wrong plural ${firstUnit.unitId}`);
    expect(
      collectParityViolations(MLUX006_FINAL_CORPUS_PROJECTION, {
        ...candidate,
        units: candidate.units.slice(1),
      }),
    ).toContain(`missing unit ${firstUnit.unitId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceOccurrence({ ...firstOccurrence, unitId: 'MLUX-C9999' }),
      ),
    ).toContain(`wrong occurrence unit ${firstOccurrence.occurrenceId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceOccurrence({ ...firstOccurrence, runtimeContext: 'wrong context' }),
      ),
    ).toContain(`wrong occurrence context ${firstOccurrence.occurrenceId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceOccurrence({ ...firstOccurrence, classification: 'Visible UI copy' }),
      ),
    ).toContain(`wrong occurrence classification ${firstOccurrence.occurrenceId}`);
    const { classification: omittedClassification, ...occurrenceWithoutClassification } =
      firstOccurrence;
    expect(omittedClassification).toBeTruthy();
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceOccurrence(occurrenceWithoutClassification),
      ),
    ).toContain(`wrong occurrence classification ${firstOccurrence.occurrenceId}`);
    expect(
      collectParityViolations(MLUX006_FINAL_CORPUS_PROJECTION, {
        ...candidate,
        occurrences: candidate.occurrences.slice(1),
      }),
    ).toContain(`missing occurrence ${firstOccurrence.occurrenceId}`);
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnitById({ ...c0350, placeholdersByLocale: undefined }),
      ),
    ).toContain('wrong locale placeholder metadata MLUX-C0350');
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnitById({
          ...c0350,
          placeholdersByLocale: {
            ...c0350.placeholdersByLocale!,
            en: ['page', 'pages', 'total'],
          },
        }),
      ),
    ).toContain('wrong en placeholder metadata MLUX-C0350');
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnitById({
          ...c0350,
          placeholdersByLocale: {
            ...c0350.placeholdersByLocale!,
            ru: ['page', 'pages', 'suffix', 'total'],
          },
        }),
      ),
    ).toContain('wrong ru placeholder metadata MLUX-C0350');
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnitById({
          ...c0350,
          placeholdersByLocale: {
            ...c0350.placeholdersByLocale!,
            uz: ['page', 'pages', 'rogue', 'total'],
          },
        }),
      ),
    ).toContain('wrong uz placeholder metadata MLUX-C0350');
    expect(
      collectParityViolations(
        MLUX006_FINAL_CORPUS_PROJECTION,
        replaceUnitById({
          ...pluralUnit,
          pluralForms: {
            ...pluralUnit.pluralForms!,
            ru: { ...pluralUnit.pluralForms!.ru, many: 'wrong plural form' },
          },
        }),
      ),
    ).toContain(`wrong plural forms ${pluralUnit.unitId}`);
  });

  it('uses immutable English fallback and actionable diagnostics without raw keys or blanks', () => {
    const diagnostics: LocaleRuntimeDiagnostics = { missingKeys: [] };
    const runtime = createLocaleRuntime('ru', diagnostics);
    runtime.removeResourceBundle('ru', 'common');

    const immutableEnglishFallback = runtime.t('common:language');
    const unknownKeyFallback = runtime.t('common:mlux006-missing-key');
    expect(immutableEnglishFallback).toBe('Language');
    expect(unknownKeyFallback).toBe('Translation unavailable');
    expect(unknownKeyFallback).not.toBe('common:mlux006-missing-key');
    expect(unknownKeyFallback.trim()).not.toBe('');
    expect(diagnostics.missingKeys).toContainEqual({
      namespace: 'common',
      key: 'mlux006-missing-key',
    });
  });

  it('finds no unclassified raw English in visible or accessibility source seams', () => {
    const hits = collectResidualSourceHits();
    const currentPdf = hits.find(({ value }) => value === 'PDF')!;
    const movedPdf = {
      ...currentPdf,
      line: currentPdf.line + 1,
      fingerprint: `${currentPdf.sourcePath}:${currentPdf.line + 1}:${currentPdf.seam}:${currentPdf.value}`,
    };
    const movedHits = hits.map((hit) =>
      hit.fingerprint === currentPdf.fingerprint ? movedPdf : hit,
    );
    expect(matchingUnitsForResidualHit(movedPdf, movedHits)).toEqual([]);
    expect(residualSourceReconciliationViolations(movedHits)).toContain(
      `missing current source reconciliation ${currentPdf.fingerprint}`,
    );
    const duplicateHits = [...hits, { ...currentPdf }];
    expect(matchingUnitsForResidualHit(currentPdf, duplicateHits)).toEqual([]);
    expect(residualSourceReconciliationViolations(duplicateHits)).toContain(
      `duplicate current source reconciliation ${currentPdf.fingerprint}`,
    );
    const projectedDuplicatePdf = {
      ...currentPdf,
      line: 463,
      fingerprint:
        'src/pages/instructor-course-editor-page/InstructorCourseEditorPage.tsx:463:jsx:PDF',
    };
    const projectedDuplicateHits = [...hits, projectedDuplicatePdf];
    expect(matchingUnitsForResidualHit(currentPdf, projectedDuplicateHits)).toEqual([]);
    expect(matchingUnitsForResidualHit(projectedDuplicatePdf, projectedDuplicateHits)).toEqual([]);
    expect(residualSourceReconciliationViolations(projectedDuplicateHits)).toContain(
      'duplicate projected source association MLUX-O0264',
    );
    expect(residualSourceReconciliationViolations(hits)).toEqual([]);
    const immutableResources = hits.filter((hit) => {
      const matchingUnits = matchingUnitsForResidualHit(hit, hits);
      return (
        matchingUnits.length > 0 &&
        matchingUnits.every(
          (unit) => unit.english === unit.russian.value && unit.english === unit.uzbek.value,
        )
      );
    });
    const localizedRawSeams = hits.filter((hit) =>
      matchingUnitsForResidualHit(hit, hits).some(
        (unit) => unit.english !== unit.russian.value || unit.english !== unit.uzbek.value,
      ),
    );
    const accountedFingerprints = new Set([
      ...immutableResources.map(({ fingerprint }) => fingerprint),
      ...localizedRawSeams.map(({ fingerprint }) => fingerprint),
    ]);
    const unmappedHits = hits.filter(({ fingerprint }) => !accountedFingerprints.has(fingerprint));
    const exactExclusions = unmappedHits.filter(({ fingerprint }) =>
      MLUX006_CURRENT_EXACT_EXCLUSION_FINGERPRINTS.has(fingerprint),
    );
    const exactExclusionFingerprints = new Set(
      exactExclusions.map(({ fingerprint }) => fingerprint),
    );
    const ownerDefects = [
      ...localizedRawSeams,
      ...unmappedHits.filter(({ fingerprint }) => !exactExclusionFingerprints.has(fingerprint)),
    ];

    expect(hits.length).toBeGreaterThan(0);
    expect(immutableResources.map(({ value }) => value)).toContain('PDF');
    expect(
      [...exactExclusionFingerprints].sort(),
      'Every current exclusion must retain its exact source fingerprint',
    ).toEqual([...MLUX006_CURRENT_EXACT_EXCLUSION_FINGERPRINTS].sort());
    expect(
      hits.filter(({ fingerprint }) =>
        MLUX006_HISTORICAL_X010_EXACT_RESIDUAL_FINGERPRINTS.has(fingerprint),
      ),
      'All historical X010 seams must now be localized rather than excluded',
    ).toEqual([]);
    expect(
      ownerDefects,
      ownerDefects.map(({ fingerprint, owner }) => `${owner} ${fingerprint}`).join('\n'),
    ).toEqual([]);
  });

  it('preserves exact placeholder sets and substituted values across every locale', () => {
    const runtime = createLocaleRuntime('en');
    const variableUnits = MLUX006_FINAL_CORPUS_PROJECTION.units.filter(
      ({ variables }) => variables.length > 0,
    );
    expect(variableUnits.length).toBeGreaterThan(20);

    const placeholderViolations: string[] = [];
    for (const unit of variableUnits) {
      const values = Object.fromEntries(
        unit.variables.map((variable, index) => [variable, `MLUX006_${index}_${variable}`]),
      );
      for (const locale of SUPPORTED_LOCALES) {
        if (unit.plural) {
          for (const [form, expectedTemplate] of Object.entries(unit.pluralForms?.[locale] ?? {})) {
            const actualTemplate = String(
              runtime.getResource(locale, unit.namespace, `${unit.key}_${form}`) ?? '',
            );
            expect(actualTemplate).toBe(expectedTemplate);
            expect(placeholderNames(actualTemplate)).toEqual(
              expectedLocalePlaceholders(unit, locale),
            );
          }
          continue;
        }
        const template = String(runtime.getResource(locale, unit.namespace, unit.key));
        const expectedPlaceholders = expectedLocalePlaceholders(unit, locale);
        if (placeholderNames(template).join('|') !== expectedPlaceholders.join('|')) {
          placeholderViolations.push(`wrong ${locale} placeholders ${unit.unitId}`);
          continue;
        }
        const output = template.includes('{{')
          ? runtime.t(`${unit.namespace}:${unit.key}`, { lng: locale, ...values })
          : interpolateTemplate(template, values);
        for (const [variable, value] of Object.entries(values)) {
          if (expectedPlaceholders.includes(variable)) expect(output).toContain(value);
          else expect(output).not.toContain(value);
        }
        expect(output).not.toMatch(/\{\{?[A-Za-z][A-Za-z0-9]*}}?/);
      }
    }
    expect(placeholderViolations).toEqual([]);
    expect(MLUX006_FINAL_CORPUS_PROJECTION.units.filter(({ plural }) => plural)).toHaveLength(4);
    expect(buildRuntimeCandidate().units.filter(({ plural }) => plural)).toHaveLength(4);
  });

  it('preserves numeric and date identity with locale-native Intl output', () => {
    const numericPrice = '1234.56';
    const numericValue = 1234567.89;
    const fixedDate = new Date(Date.UTC(2026, 7, 20, 12, 34, 56));
    const currencyOutputs = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale): [Locale, string] => [
        locale,
        formatCatalogPrice(numericPrice, 'USD', locale),
      ]),
    ) as Record<Locale, string>;
    const numberOutputs = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale): [Locale, string] => [
        locale,
        new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(numericValue),
      ]),
    ) as Record<Locale, string>;
    const dateOutputs = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale): [Locale, string] => [
        locale,
        new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(fixedDate),
      ]),
    ) as Record<Locale, string>;

    for (const locale of SUPPORTED_LOCALES) {
      expect(currencyOutputs[locale]).toBe(
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'USD',
          currencyDisplay: 'narrowSymbol',
        }).format(Number(numericPrice)),
      );
    }
    expect(Number(numericPrice)).toBe(1234.56);
    expect(numericValue).toBe(1234567.89);
    expect(fixedDate.toISOString()).toBe('2026-08-20T12:34:56.000Z');
    expect(new Set(Object.values(currencyOutputs)).size).toBeGreaterThan(1);
    expect(new Set(Object.values(numberOutputs)).size).toBeGreaterThan(1);
    expect(new Set(Object.values(dateOutputs)).size).toBeGreaterThan(1);
  });
});
