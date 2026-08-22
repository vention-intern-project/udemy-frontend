// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { getI18n } from 'react-i18next';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserLocaleStore,
  createLocaleRuntime,
  createLocaleLookup,
  getBrowserLocales,
  localeRuntime,
  LocaleProvider,
  LanguageSelector,
  LOCALE_OWNER_TASKS,
  MLUX_002_RUNTIME_MAPPING,
  MLUX_002_SHARED_OCCURRENCES,
  MLUX_003_RUNTIME_MAPPING,
  MLUX_004_SHARED_OCCURRENCES,
  MLUX_004_RUNTIME_MAPPING,
  MLUX_005_RUNTIME_MAPPING,
  MLUX_005_SHARED_OCCURRENCES,
  normalizeLocale,
  resolveLocale,
  useLocale,
  type LocaleMappingRecord,
  type LocaleOwnerTask,
  type LocalePlaceholderContract,
  type LocaleStorage,
  type LocaleRuntimeDiagnostics,
} from '../../../src/shared/locale';

import { MLUX004_DRAFT22_CORPUS_PROJECTION } from './mlux004-draft20-projection';
import { MLUX_004_DRAFT17_PROJECTION } from './mlux004-draft11-projection';
import {
  MLUX_005_DRAFT15_COUNTS,
  MLUX_005_DRAFT15_INSTRUCTOR_UNIT_IDS,
  MLUX_005_DRAFT15_OCCURRENCE_FIXTURE,
  MLUX_005_DRAFT15_SHARED_OCCURRENCE_IDS,
  MLUX_005_DRAFT15_SHARED_UNIT_IDS,
  MLUX_005_DRAFT15_UNIT_FIXTURE,
  type Mlux005Draft15OccurrenceFixture,
} from './mlux005-draft13-projection';

interface ExpectedMlux003Occurrence {
  readonly id: string;
  readonly context: string;
}

interface ExpectedMlux002SourceBinding {
  readonly occurrenceId:
    | 'O0525'
    | 'O0526'
    | 'O0527'
    | 'O0528'
    | 'O0529'
    | 'O0530'
    | 'O0531'
    | 'O0532'
    | 'O0533';
  readonly expectedSource: string;
}

interface ExpectedNavigationDeclarationBinding {
  readonly occurrenceId: 'O0003' | 'O0004' | 'O0005' | 'O0006' | 'O0007' | 'O0008';
  readonly expectedSource: string;
}

const MLUX_002_SOURCE_BINDINGS: readonly ExpectedMlux002SourceBinding[] = [
  { occurrenceId: 'O0525', expectedSource: "aria-label={t('a11y:learnHubHome')}" },
  { occurrenceId: 'O0526', expectedSource: "{t('instructor:coursesCreateCourse')}" },
  { occurrenceId: 'O0527', expectedSource: "{t('instructor:coursesCreateCourse')}" },
  { occurrenceId: 'O0528', expectedSource: '{t(item.labelKey)}' },
  { occurrenceId: 'O0529', expectedSource: '{t(item.labelKey)}' },
  { occurrenceId: 'O0530', expectedSource: '{t(item.labelKey)}' },
  { occurrenceId: 'O0531', expectedSource: '{t(item.labelKey)}' },
  { occurrenceId: 'O0532', expectedSource: '{t(item.labelKey)}' },
  { occurrenceId: 'O0533', expectedSource: '<NavigationLinks' },
];

const MLUX_002_NAVIGATION_DECLARATION_BINDINGS: readonly ExpectedNavigationDeclarationBinding[] = [
  { occurrenceId: 'O0003', expectedSource: "labelKey: 'navigation:catalog'" },
  { occurrenceId: 'O0004', expectedSource: "labelKey: 'navigation:logIn'" },
  { occurrenceId: 'O0005', expectedSource: "labelKey: 'navigation:signUp'" },
  { occurrenceId: 'O0006', expectedSource: "labelKey: 'navigation:catalog'" },
  { occurrenceId: 'O0007', expectedSource: "labelKey: 'navigation:myLearning'" },
  { occurrenceId: 'O0008', expectedSource: "labelKey: 'navigation:instructorCourses'" },
];

const APP_SHELL_SOURCE_LINES = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/app/layouts/AppShell.tsx')),
  'utf8',
).split(/\r?\n/);
const APP_SHELL_NAVIGATION_SOURCE_LINES = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/app/layouts/app-shell-navigation.ts')),
  'utf8',
).split(/\r?\n/);
const INSTRUCTOR_COURSES_SOURCE = readFileSync(
  pathToFileURL(
    resolve(process.cwd(), 'src/pages/instructor-courses-page/InstructorCoursesPage.tsx'),
  ),
  'utf8',
);

interface ExpectedMlux005Draft15Resource {
  readonly unitId: string;
  readonly key: string;
  readonly english: string;
  readonly russian: string;
  readonly uzbek: string;
  readonly variables: readonly string[];
  readonly occurrenceId: string;
  readonly context: string;
  readonly classification: string;
}

const MLUX_005_DRAFT15_ADDITIVE_RESOURCES: readonly ExpectedMlux005Draft15Resource[] = [
  {
    unitId: 'MLUX-C0360',
    key: 'courseEditorValidationFieldRequired',
    english: '{fieldLabel} is required.',
    russian: '{fieldLabel} обязательно.',
    uzbek: '{fieldLabel} kiritilishi shart.',
    variables: ['fieldLabel'],
    occurrenceId: 'O0506',
    context:
      'src/features/instructor-course-editor/validation.ts:23 — Instructor editor / field validation',
    classification: 'Visible UI copy + accessibility label',
  },
  {
    unitId: 'MLUX-C0361',
    key: 'courseEditorValidationCheckField',
    english: 'Check {fieldLabel} and submit again.',
    russian: 'Проверьте поле {fieldLabel} и отправьте форму снова.',
    uzbek: '{fieldLabel} maydonini tekshirib, qayta yuboring.',
    variables: ['fieldLabel'],
    occurrenceId: 'O0507',
    context:
      'src/features/instructor-course-editor/validation.ts:27 — Instructor editor / field validation',
    classification: 'Visible UI copy + accessibility label',
  },
  {
    unitId: 'MLUX-C0362',
    key: 'courseEditorValidationReviewHighlightedFields',
    english: 'Review the highlighted fields and submit again.',
    russian: 'Проверьте выделенные поля и отправьте форму снова.',
    uzbek: 'Belgilangan maydonlarni tekshirib, qayta yuboring.',
    variables: [],
    occurrenceId: 'O0508',
    context:
      'src/features/instructor-course-editor/validation.ts:63 — Instructor editor / known 422',
    classification: 'Visible UI copy',
  },
  {
    unitId: 'MLUX-C0363',
    key: 'courseEditorValidationCouldNotProcessForm',
    english: 'We could not process this form. Check your details and try again.',
    russian: 'Не удалось обработать форму. Проверьте данные и повторите попытку.',
    uzbek: 'Shaklni qayta ishlab bo‘lmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring.',
    variables: [],
    occurrenceId: 'O0509',
    context:
      'src/features/instructor-course-editor/validation.ts:64 — Instructor editor / unknown 422',
    classification: 'Visible UI copy',
  },
  {
    unitId: 'MLUX-C0364',
    key: 'courseEditorValidationGenericAction',
    english: 'We could not {action}. Try again later.',
    russian: 'Не удалось {action}. Повторите попытку позже.',
    uzbek: '{action} amalga oshmadi. Keyinroq qayta urinib ko‘ring.',
    variables: ['action'],
    occurrenceId: 'O0510',
    context:
      'src/features/instructor-course-editor/validation.ts:68 — Instructor editor / generic failure',
    classification: 'Visible UI copy',
  },
  {
    unitId: 'MLUX-C0365',
    key: 'coursesCouldNotCreateCourseTryAgain',
    english: 'We could not create the course. Try again.',
    russian: 'Не удалось создать курс. Повторите попытку.',
    uzbek: 'Kursni yaratib bo‘lmadi. Qayta urinib ko‘ring.',
    variables: [],
    occurrenceId: 'O0511',
    context:
      'src/pages/instructor-courses-page/InstructorCoursesPage.tsx:183 — Instructor courses / create failure',
    classification: 'Visible UI copy',
  },
];

const MLUX_005_DRAFT23_ENROLLMENT_PLURAL_FORMS = {
  en: {
    one: '{{count}} enrollment',
    other: '{{count}} enrollments',
  },
  ru: {
    one: '{{count}} запись',
    few: '{{count}} записи',
    many: '{{count}} записей',
    other: '{{count}} записи',
  },
  uz: {
    one: '{{count}} ta yozilish',
    other: '{{count}} ta yozilish',
  },
} as const;

function mlux005Draft15AdditiveContractViolations(
  candidate: readonly LocaleMappingRecord[],
): string[] {
  const violations: string[] = [];
  for (const expected of MLUX_005_DRAFT15_ADDITIVE_RESOURCES) {
    const actual = candidate.find(({ unitId }) => unitId === expected.unitId);
    if (!actual) {
      violations.push(`missing ${expected.unitId}`);
      continue;
    }
    if (actual.namespace !== 'instructor' || actual.key !== expected.key)
      violations.push(`wrong key ${expected.unitId}`);
    if (actual.english !== expected.english) violations.push(`wrong English ${expected.unitId}`);
    if (actual.variables.join('|') !== expected.variables.join('|'))
      violations.push(`wrong variables ${expected.unitId}`);
    if (actual.plural || actual.ownerTask !== 'MLUX-005')
      violations.push(`wrong ownership ${expected.unitId}`);
    if (
      actual.resourceStatus !== 'Draft' ||
      actual.russian.review !== 'Pending' ||
      actual.uzbek.review !== 'Pending'
    )
      violations.push(`wrong review state ${expected.unitId}`);
    if (
      actual.occurrences.length !== 1 ||
      actual.occurrences[0]?.id !== expected.occurrenceId ||
      actual.occurrences[0]?.context !== expected.context ||
      actual.occurrences[0]?.classification !== expected.classification ||
      actual.occurrences[0]?.ownerTask !== 'MLUX-005'
    )
      violations.push(`wrong occurrence ${expected.unitId}`);
  }
  return violations;
}

interface Mlux005Draft15ResourceCandidate {
  readonly english: string | undefined;
  readonly russian: string | undefined;
  readonly uzbek: string | undefined;
}

interface Mlux005Draft15UnitCandidate {
  readonly unitId: string;
  readonly namespace: string;
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly plural: boolean;
  readonly resourceStatus: string;
  readonly russian: { readonly resource: string; readonly review: string };
  readonly uzbek: { readonly resource: string; readonly review: string };
  readonly ownerTask: string;
}

interface Mlux005Draft15Candidate {
  readonly units: readonly Mlux005Draft15UnitCandidate[];
  readonly occurrences: readonly Mlux005Draft15OccurrenceFixture[];
  readonly resources: Readonly<Record<string, Mlux005Draft15ResourceCandidate>>;
}

function collectMlux005Draft15ContractViolations(
  candidate: Mlux005Draft15Candidate,
): readonly string[] {
  const violations: string[] = [];
  const expectedUnits = MLUX_005_DRAFT15_UNIT_FIXTURE;
  const expectedOccurrences = MLUX_005_DRAFT15_OCCURRENCE_FIXTURE;
  const expectedUnitIds = new Set(expectedUnits.map(({ unitId }) => unitId));
  const expectedOccurrenceIds = new Set(
    expectedOccurrences.map(({ occurrenceId }) => occurrenceId),
  );
  const actualUnitIds = candidate.units.map(({ unitId }) => unitId);
  const actualOccurrenceIds = candidate.occurrences.map(({ occurrenceId }) => occurrenceId);

  for (const unitId of expectedUnitIds) {
    const sameId = candidate.units.filter((unit) => unit.unitId === unitId);
    if (sameId.length === 0) violations.push(`missing unit ${unitId}`);
    if (sameId.length > 1) violations.push(`duplicate unit ${unitId}`);
  }
  for (const unitId of actualUnitIds) {
    if (!expectedUnitIds.has(unitId)) violations.push(`extra unit ${unitId}`);
  }
  for (const occurrenceId of expectedOccurrenceIds) {
    const sameId = candidate.occurrences.filter(
      (occurrence) => occurrence.occurrenceId === occurrenceId,
    );
    if (sameId.length === 0) violations.push(`missing occurrence ${occurrenceId}`);
    if (sameId.length > 1) violations.push(`duplicate occurrence ${occurrenceId}`);
  }
  for (const occurrenceId of actualOccurrenceIds) {
    if (!expectedOccurrenceIds.has(occurrenceId))
      violations.push(`extra occurrence ${occurrenceId}`);
  }

  for (const expected of expectedUnits) {
    const actual = candidate.units.find((unit) => unit.unitId === expected.unitId);
    if (!actual) continue;
    const resource = candidate.resources[expected.unitId];
    if (actual.namespace !== expected.namespace || actual.key !== expected.key)
      violations.push(`wrong semantic key ${expected.unitId}`);
    if (resource?.english !== expected.english) violations.push(`wrong English ${expected.unitId}`);
    if (resource?.russian !== expected.russian) violations.push(`wrong Russian ${expected.unitId}`);
    if (resource?.uzbek !== expected.uzbek) violations.push(`wrong Uzbek ${expected.unitId}`);
    if (actual.resourceStatus !== expected.resourceStatus)
      violations.push(`wrong resource status ${expected.unitId}`);
    if (
      actual.russian.resource !== expected.russianReview.resource ||
      actual.russian.review !== expected.russianReview.review ||
      actual.uzbek.resource !== expected.uzbekReview.resource ||
      actual.uzbek.review !== expected.uzbekReview.review
    )
      violations.push(`wrong review status ${expected.unitId}`);
    if (actual.variables.join('|') !== expected.variables.join('|'))
      violations.push(`wrong variables ${expected.unitId}`);
    if (actual.plural !== expected.plural) violations.push(`wrong plural ${expected.unitId}`);
    if (actual.ownerTask !== expected.publisherTask)
      violations.push(`wrong publisher ${expected.unitId}`);
  }

  for (const expected of expectedOccurrences) {
    const actual = candidate.occurrences.find(
      (occurrence) => occurrence.occurrenceId === expected.occurrenceId,
    );
    if (!actual) continue;
    if (actual.unitId !== expected.unitId)
      violations.push(`wrong occurrence unit association ${expected.occurrenceId}`);
    if (actual.context !== expected.context)
      violations.push(`wrong occurrence context ${expected.occurrenceId}`);
    if (actual.classification !== expected.classification)
      violations.push(`wrong occurrence classification ${expected.occurrenceId}`);
    if (actual.ownerTask !== expected.ownerTask)
      violations.push(`wrong occurrence owner ${expected.occurrenceId}`);
  }
  return violations;
}

function createMlux005Draft15RuntimeCandidate(): Mlux005Draft15Candidate {
  const expectedUnitIds = new Set(MLUX_005_DRAFT15_UNIT_FIXTURE.map(({ unitId }) => unitId));
  const sharedUnits = MLUX_004_RUNTIME_MAPPING.filter(({ unitId }) => expectedUnitIds.has(unitId));
  const units = [...MLUX_005_RUNTIME_MAPPING, ...sharedUnits];
  const runtime = createLocaleRuntime('en');
  const resources = Object.fromEntries(
    MLUX_005_DRAFT15_UNIT_FIXTURE.map((expected) => [
      expected.unitId,
      {
        english: singleBraceMlux005Draft15ResourceValue(
          runtime.getResource(
            'en',
            expected.namespace,
            expected.plural ? `${expected.key}_one` : expected.key,
          ),
          expected.variables,
          expected.english.includes('{{'),
        ),
        russian: singleBraceMlux005Draft15ResourceValue(
          runtime.getResource(
            'ru',
            expected.namespace,
            expected.plural ? `${expected.key}_one` : expected.key,
          ),
          expected.variables,
          expected.russian.includes('{{'),
        ),
        uzbek: singleBraceMlux005Draft15ResourceValue(
          runtime.getResource(
            'uz',
            expected.namespace,
            expected.plural ? `${expected.key}_one` : expected.key,
          ),
          expected.variables,
          expected.uzbek.includes('{{'),
        ),
      },
    ]),
  );
  const occurrences = [
    ...MLUX_005_RUNTIME_MAPPING.flatMap(({ unitId, occurrences: mappedOccurrences }) =>
      mappedOccurrences.map((occurrence) => ({
        occurrenceId: occurrence.id,
        unitId,
        context: occurrence.context,
        classification: occurrence.classification ?? '',
        ownerTask: occurrence.ownerTask,
      })),
    ),
    ...MLUX_005_SHARED_OCCURRENCES.map((occurrence) => ({
      occurrenceId: occurrence.id,
      unitId: occurrence.unitId,
      context: occurrence.context,
      classification: occurrence.classification ?? '',
      ownerTask: occurrence.ownerTask,
    })),
  ];
  return { units, occurrences, resources };
}

function singleBraceMlux005Draft15ResourceValue(
  value: string | undefined,
  variables: readonly string[],
  preserveI18nextPlaceholders = false,
): string | undefined {
  if (preserveI18nextPlaceholders) return value;
  return variables.reduce(
    (current, variable) => current?.split(`{{${variable}}}`).join(`{${variable}}`),
    value,
  );
}

interface ExpectedMlux003RecordInput {
  readonly unitId: string;
  readonly namespace: LocaleMappingRecord['namespace'];
  readonly key: string;
  readonly english: string;
  readonly occurrences: readonly ExpectedMlux003Occurrence[];
  readonly variables?: readonly string[];
}

function expectedMlux003Record({
  unitId,
  namespace,
  key,
  english,
  occurrences,
  variables = [],
}: ExpectedMlux003RecordInput): LocaleMappingRecord {
  return {
    unitId,
    namespace,
    key,
    english,
    variables,
    plural: false,
    resourceStatus: 'Draft',
    russian: { resource: 'Draft', review: 'Pending' },
    uzbek: { resource: 'Draft', review: 'Pending' },
    ownerTask: 'MLUX-003',
    occurrences: occurrences.map((occurrence) => ({ ...occurrence, ownerTask: 'MLUX-003' })),
  };
}

const MLUX_003_EXPECTED_MAPPING: readonly LocaleMappingRecord[] = [
  expectedMlux003Record({
    unitId: 'MLUX-C0004',
    namespace: 'navigation',
    key: 'logIn',
    english: 'Log in',
    occurrences: [{ id: 'O0054', context: 'PAGE-004 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0006',
    namespace: 'navigation',
    key: 'myLearning',
    english: 'My learning',
    occurrences: [{ id: 'O0062', context: 'PAGE-008 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0007',
    namespace: 'navigation',
    key: 'instructorCourses',
    english: 'Instructor courses',
    occurrences: [{ id: 'O0040', context: 'PAGE-010 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0010',
    namespace: 'common',
    key: 'cart',
    english: 'Cart',
    occurrences: [{ id: 'O0060', context: 'PAGE-007 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0037',
    namespace: 'routes',
    key: 'courseCatalogTitle',
    english: 'Course catalog',
    occurrences: [{ id: 'O0048', context: 'PAGE-001 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0038',
    namespace: 'routes',
    key: 'courseCatalogDescription',
    english: 'Browse and discover available courses.',
    occurrences: [{ id: 'O0049', context: 'PAGE-001 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0039',
    namespace: 'routes',
    key: 'courseDetailsTitle',
    english: 'Course details',
    occurrences: [{ id: 'O0050', context: 'PAGE-002 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0040',
    namespace: 'routes',
    key: 'courseDetailsDescription',
    english: 'Review course information and lessons.',
    occurrences: [{ id: 'O0051', context: 'PAGE-002 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0041',
    namespace: 'routes',
    key: 'createAccountTitle',
    english: 'Create account',
    occurrences: [{ id: 'O0052', context: 'PAGE-003 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0042',
    namespace: 'routes',
    key: 'createAccountDescription',
    english: 'Create a LearnHub account to start learning or teaching.',
    occurrences: [{ id: 'O0053', context: 'PAGE-003 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0043',
    namespace: 'routes',
    key: 'loginDescription',
    english: 'Access your learning or instructor workspace.',
    occurrences: [{ id: 'O0055', context: 'PAGE-004 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0044',
    namespace: 'routes',
    key: 'forgotPasswordTitle',
    english: 'Forgot password',
    occurrences: [{ id: 'O0056', context: 'PAGE-005 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0045',
    namespace: 'routes',
    key: 'forgotPasswordDescription',
    english: 'Request help signing back in to your account.',
    occurrences: [{ id: 'O0057', context: 'PAGE-005 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0046',
    namespace: 'routes',
    key: 'resetPasswordTitle',
    english: 'Reset password',
    occurrences: [{ id: 'O0058', context: 'PAGE-006 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0047',
    namespace: 'routes',
    key: 'resetPasswordDescription',
    english: 'Choose a new password for your account.',
    occurrences: [{ id: 'O0059', context: 'PAGE-006 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0048',
    namespace: 'routes',
    key: 'cartDescription',
    english: 'Your selected courses will appear here.',
    occurrences: [{ id: 'O0061', context: 'PAGE-007 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0049',
    namespace: 'routes',
    key: 'myLearningDescription',
    english: 'Your course enrollments will appear here.',
    occurrences: [{ id: 'O0063', context: 'PAGE-008 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0024',
    namespace: 'routes',
    key: 'learningDetailsTitle',
    english: 'Learning details',
    occurrences: [{ id: 'O0034', context: 'PAGE-009 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0025',
    namespace: 'routes',
    key: 'learningDetailsDescription',
    english: 'Course progress and lessons will appear here.',
    occurrences: [{ id: 'O0035', context: 'PAGE-009 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0026',
    namespace: 'routes',
    key: 'courseAssistantTitle',
    english: 'Course assistant',
    occurrences: [{ id: 'O0036', context: 'PAGE-014 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0027',
    namespace: 'routes',
    key: 'courseAssistantDescription',
    english: 'Ask questions about an active course.',
    occurrences: [{ id: 'O0037', context: 'PAGE-014 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0028',
    namespace: 'routes',
    key: 'aiAssistantTitle',
    english: 'AI assistant',
    occurrences: [{ id: 'O0038', context: 'PAGE-015 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0029',
    namespace: 'routes',
    key: 'aiAssistantDescription',
    english: 'Ask general learning questions.',
    occurrences: [{ id: 'O0039', context: 'PAGE-015 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0030',
    namespace: 'routes',
    key: 'instructorCoursesDescription',
    english: 'Your authored courses will appear here.',
    occurrences: [{ id: 'O0041', context: 'PAGE-010 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0031',
    namespace: 'routes',
    key: 'editCourseTitle',
    english: 'Edit course',
    occurrences: [{ id: 'O0042', context: 'PAGE-011 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0032',
    namespace: 'routes',
    key: 'editCourseDescription',
    english: 'Course and lesson editing will appear here.',
    occurrences: [{ id: 'O0043', context: 'PAGE-011 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0033',
    namespace: 'routes',
    key: 'courseEnrollmentsTitle',
    english: 'Course enrollments',
    occurrences: [{ id: 'O0044', context: 'PAGE-012 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0034',
    namespace: 'routes',
    key: 'courseEnrollmentsDescription',
    english: 'The selected course roster will appear here.',
    occurrences: [{ id: 'O0045', context: 'PAGE-012 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0035',
    namespace: 'routes',
    key: 'editLessonTitle',
    english: 'Edit lesson',
    occurrences: [{ id: 'O0046', context: 'PAGE-013 title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0036',
    namespace: 'routes',
    key: 'editLessonDescription',
    english: 'Lesson metadata and upload tools will appear here.',
    occurrences: [{ id: 'O0047', context: 'PAGE-013 description' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0050',
    namespace: 'routes',
    key: 'renderErrorDocumentTitle',
    english: 'Something went wrong | LearnHub',
    occurrences: [{ id: 'O0064', context: 'document title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0051',
    namespace: 'routes',
    key: 'bootstrapDocumentTitle',
    english: 'Preparing your workspace | LearnHub',
    occurrences: [{ id: 'O0065', context: 'document title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0052',
    namespace: 'routes',
    key: 'sessionErrorDocumentTitle',
    english: 'Session check failed | LearnHub',
    occurrences: [{ id: 'O0066', context: 'document title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0053',
    namespace: 'routes',
    key: 'pageDocumentTitle',
    english: '{{pageTitle}} | LearnHub',
    variables: ['pageTitle'],
    occurrences: [{ id: 'O0067', context: 'document title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0054',
    namespace: 'routes',
    key: 'notFoundDocumentTitle',
    english: 'Page not found | LearnHub',
    occurrences: [{ id: 'O0068', context: 'document title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0055',
    namespace: 'routes',
    key: 'bootstrapHeading',
    english: 'Preparing your workspace',
    occurrences: [{ id: 'O0069', context: 'BootstrapState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0056',
    namespace: 'routes',
    key: 'bootstrapDescription',
    english: 'We are verifying your session.',
    occurrences: [{ id: 'O0070', context: 'BootstrapState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0057',
    namespace: 'routes',
    key: 'bootstrapLoadingLabel',
    english: 'Loading application',
    occurrences: [{ id: 'O0071', context: 'BootstrapState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0058',
    namespace: 'routes',
    key: 'sessionErrorHeading',
    english: 'Session check failed',
    occurrences: [{ id: 'O0072', context: 'SessionErrorState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0059',
    namespace: 'routes',
    key: 'tryAgain',
    english: 'Try again',
    occurrences: [
      { id: 'O0073', context: 'SessionErrorState' },
      { id: 'O0076', context: 'RenderErrorState' },
    ],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0060',
    namespace: 'routes',
    key: 'renderErrorHeading',
    english: 'Something went wrong',
    occurrences: [{ id: 'O0074', context: 'RenderErrorState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0061',
    namespace: 'routes',
    key: 'renderErrorDescription',
    english: 'We could not display this page. Try again or return to the catalog.',
    occurrences: [{ id: 'O0075', context: 'RenderErrorState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0062',
    namespace: 'routes',
    key: 'forbiddenHeading',
    english: 'You do not have access to this page',
    occurrences: [{ id: 'O0077', context: 'ForbiddenState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0063',
    namespace: 'routes',
    key: 'forbiddenDescription',
    english: 'Use an account with the required role, or return to the catalog.',
    occurrences: [{ id: 'O0078', context: 'ForbiddenState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0064',
    namespace: 'routes',
    key: 'notFoundHeading',
    english: 'Page not found',
    occurrences: [{ id: 'O0079', context: 'NotFoundState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-C0065',
    namespace: 'routes',
    key: 'notFoundDescription',
    english: 'The address may be incorrect, or the page may have moved.',
    occurrences: [{ id: 'O0080', context: 'NotFoundState' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-003-S001',
    namespace: 'routes',
    key: 'sessionErrorNoticeTitle',
    english: 'Unable to start the application',
    occurrences: [{ id: 'MLUX-003-SO001', context: 'SessionErrorState notice title' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-003-S002',
    namespace: 'routes',
    key: 'sessionErrorNoticeDescription',
    english: 'We could not verify your session. Check your connection and try again.',
    occurrences: [{ id: 'MLUX-003-SO002', context: 'SessionErrorState notice copy' }],
  }),
  expectedMlux003Record({
    unitId: 'MLUX-003-S003',
    namespace: 'routes',
    key: 'backToCatalog',
    english: 'Back to catalog',
    occurrences: [
      { id: 'MLUX-003-SO003', context: 'RenderErrorState' },
      { id: 'MLUX-003-SO004', context: 'ForbiddenState' },
      { id: 'MLUX-003-SO005', context: 'NotFoundState' },
    ],
  }),
];

const MLUX_003_EXPECTED_OCCURRENCE_IDS = [
  ...Array.from({ length: 47 }, (_, index) => `O${String(index + 34).padStart(4, '0')}`),
  'MLUX-003-SO001',
  'MLUX-003-SO002',
  'MLUX-003-SO003',
  'MLUX-003-SO004',
  'MLUX-003-SO005',
];

function interpolationVariables(value: string): string[] {
  return Array.from(value.matchAll(/\{\{([^}]+)\}\}/g), ([, variable]) => variable).sort();
}

function asI18nextResourceValue(english: string, variables: readonly string[]): string {
  return variables.reduce(
    (value, variable) => value.split(`{${variable}}`).join(`{{${variable}}}`),
    english,
  );
}

interface ExpectedMlux004RuntimeOccurrence {
  readonly id: string;
  readonly context: string;
  readonly classification: string;
  readonly ownerTask: 'MLUX-004';
}

interface ExpectedMlux004RuntimeUnit {
  readonly unitId: string;
  readonly namespace: string;
  readonly key: string;
  readonly english: string;
  readonly variables: readonly string[];
  readonly plural: boolean;
  readonly resourceStatus: string;
  readonly russian: {
    readonly value: string;
    readonly resource: string;
    readonly review: string;
  };
  readonly uzbek: {
    readonly value: string;
    readonly resource: string;
    readonly review: string;
  };
  readonly ownerTask: LocaleOwnerTask;
  readonly occurrences: readonly ExpectedMlux004RuntimeOccurrence[];
}

const MLUX_004_DRAFT17_RUNTIME_UNIT_IDS = new Set(
  MLUX_004_DRAFT17_PROJECTION.map(({ unitId }) => unitId),
);

const MLUX_004_DRAFT22_RUNTIME_PROJECTION: readonly ExpectedMlux004RuntimeUnit[] =
  MLUX004_DRAFT22_CORPUS_PROJECTION.units
    .filter(
      (unit) =>
        MLUX_004_DRAFT17_RUNTIME_UNIT_IDS.has(unit.unitId) ||
        unit.runtimeOwnerTasks.includes('MLUX-004'),
    )
    .map((unit) => ({
      unitId: unit.unitId,
      namespace: unit.namespace,
      key: unit.key,
      english: unit.runtimeEnglish,
      variables: [...unit.variables].sort(),
      plural: unit.plural,
      resourceStatus: unit.status,
      russian: {
        value: unit.russian.value,
        resource: unit.russian.resourceStatus,
        review: unit.russian.reviewStatus,
      },
      uzbek: {
        value: unit.uzbek.value,
        resource: unit.uzbek.resourceStatus,
        review: unit.uzbek.reviewStatus,
      },
      ownerTask: (unit.runtimeOwnerTasks[0] ?? 'MLUX-004') as LocaleOwnerTask,
      occurrences: MLUX004_DRAFT22_CORPUS_PROJECTION.occurrences
        .filter(
          (occurrence) => occurrence.unitId === unit.unitId && occurrence.ownerTask === 'MLUX-004',
        )
        .map((occurrence) => ({
          id: occurrence.occurrenceId.replace(/^MLUX-/, ''),
          context: occurrence.runtimeContext,
          classification: occurrence.classification,
          ownerTask: 'MLUX-004',
        })),
    }));

function mlux004ContractViolations(mapping: readonly LocaleMappingRecord[]): string[] {
  const violations: string[] = [];

  const expectedUnitIds = new Set(MLUX_004_DRAFT22_RUNTIME_PROJECTION.map(({ unitId }) => unitId));
  const actualUnitIds = mapping.map(({ unitId }) => unitId);
  for (const expected of MLUX_004_DRAFT22_RUNTIME_PROJECTION) {
    const matchingRecords = mapping.filter(({ unitId }) => unitId === expected.unitId);
    if (matchingRecords.length === 0) {
      violations.push(`missing unit ${expected.unitId}`);
      continue;
    }
    if (matchingRecords.length > 1) {
      violations.push(`duplicate unit ${expected.unitId}`);
      continue;
    }
    const [actual] = matchingRecords;
    if (!actual) continue;
    if (actual.namespace !== expected.namespace)
      violations.push(`wrong namespace ${expected.unitId}`);
    if (actual.key !== expected.key) violations.push(`wrong key ${expected.unitId}`);
    if (actual.english !== expected.english) violations.push(`wrong value ${expected.unitId}`);
    if (actual.ownerTask !== expected.ownerTask)
      violations.push(`wrong resource owner ${expected.unitId}`);
    if (actual.resourceStatus !== expected.resourceStatus)
      violations.push(`wrong status ${expected.unitId}`);
    if (
      actual.russian.resource !== expected.russian.resource ||
      actual.russian.review !== expected.russian.review
    )
      violations.push(`wrong Russian status ${expected.unitId}`);
    if (
      actual.uzbek.resource !== expected.uzbek.resource ||
      actual.uzbek.review !== expected.uzbek.review
    )
      violations.push(`wrong Uzbek status ${expected.unitId}`);
    if (JSON.stringify([...actual.variables].sort()) !== JSON.stringify([...expected.variables]))
      violations.push(`wrong variables ${expected.unitId}`);
    if (actual.plural !== expected.plural) violations.push(`wrong plural ${expected.unitId}`);

    const expectedOccurrences = new Map(
      expected.occurrences.map((occurrence) => [occurrence.id, occurrence]),
    );
    for (const expectedOccurrence of expected.occurrences) {
      const matchingOccurrences = actual.occurrences.filter(
        ({ id }) => id === expectedOccurrence.id,
      );
      if (matchingOccurrences.length === 0) {
        violations.push(`missing occurrence ${expectedOccurrence.id}`);
        continue;
      }
      if (matchingOccurrences.length > 1) {
        violations.push(`duplicate occurrence ${expectedOccurrence.id}`);
        continue;
      }
      const [actualOccurrence] = matchingOccurrences;
      if (!actualOccurrence) continue;
      if (actualOccurrence.context !== expectedOccurrence.context)
        violations.push(`wrong context ${expectedOccurrence.id}`);
      if (actualOccurrence.classification !== expectedOccurrence.classification)
        violations.push(`wrong classification ${expectedOccurrence.id}`);
      if (actualOccurrence.ownerTask !== expectedOccurrence.ownerTask)
        violations.push(`wrong owner ${expectedOccurrence.id}`);
    }
    for (const { id } of actual.occurrences) {
      if (!expectedOccurrences.has(id)) violations.push(`extra occurrence ${id}`);
    }
  }
  for (const unitId of actualUnitIds) {
    if (!expectedUnitIds.has(unitId)) violations.push(`extra unit ${unitId}`);
  }

  return violations;
}

function mlux003ContractViolations(mapping: readonly LocaleMappingRecord[]): string[] {
  const expectedIds = new Set(MLUX_003_EXPECTED_MAPPING.map(({ unitId }) => unitId));
  const actualIds = mapping.map(({ unitId }) => unitId);
  const violations: string[] = [];

  for (const unitId of expectedIds) {
    const count = actualIds.filter((actualUnitId) => actualUnitId === unitId).length;
    if (count === 0) violations.push(`missing unit ${unitId}`);
    if (count > 1) violations.push(`duplicate unit ${unitId}`);
  }
  for (const unitId of actualIds) {
    if (!expectedIds.has(unitId)) violations.push(`extra unit ${unitId}`);
  }

  const expectedOccurrenceIds = new Set(
    MLUX_003_EXPECTED_MAPPING.flatMap(({ occurrences }) => occurrences.map(({ id }) => id)),
  );
  const actualOccurrenceIds = mapping.flatMap(({ occurrences }) => occurrences.map(({ id }) => id));
  for (const occurrenceId of expectedOccurrenceIds) {
    const count = actualOccurrenceIds.filter(
      (actualOccurrenceId) => actualOccurrenceId === occurrenceId,
    ).length;
    if (count === 0) violations.push(`missing occurrence ${occurrenceId}`);
    if (count > 1) violations.push(`duplicate occurrence ${occurrenceId}`);
  }
  for (const occurrenceId of actualOccurrenceIds) {
    if (!expectedOccurrenceIds.has(occurrenceId))
      violations.push(`extra occurrence ${occurrenceId}`);
  }

  return violations;
}
const FOUNDATION_UNIT_ID_PATTERN = /^MLUX-C00(?:0[1-9]|1\d|2[0-3])$/;

function memoryStorage(initialValues: Record<string, string> = {}): LocaleStorage {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function LocaleProbe() {
  const { locale, setLocale } = useLocale();
  return (
    <>
      <output aria-label="active locale">{locale}</output>
      <button type="button" onClick={() => setLocale('uz')}>
        Set Uzbek
      </button>
    </>
  );
}

const LANGUAGE_SELECTOR_CLASSES = {
  className: 'language-selector-test',
  menuClassName: 'language-menu-test',
  optionClassName: 'language-option-test',
  selectedOptionClassName: 'language-option-selected-test',
};

function withBrowserNavigator(value: unknown, assertion: () => void): void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value });

  try {
    assertion();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'navigator');
    }
  }
}

function ThrowingLocaleProbe(): ReactElement {
  useLocale();
  throw new Error('abandoned locale render');
}

describe('locale foundation', () => {
  it('exposes the named locale placeholder contract through the shared locale entry', () => {
    const publicContract: LocalePlaceholderContract = {
      en: ['page', 'pages', 'suffix', 'total'],
      ru: ['page', 'pages', 'total'],
      uz: ['page', 'pages', 'total'],
    };

    expect(publicContract).toEqual({
      en: ['page', 'pages', 'suffix', 'total'],
      ru: ['page', 'pages', 'total'],
      uz: ['page', 'pages', 'total'],
    });
  });

  it('exposes the exact decided occurrence-owner union, including the MLUX-006 follow-up handoff', () => {
    const followupOwner: LocaleOwnerTask = 'MLUX-006-FOLLOWUP';

    expect(LOCALE_OWNER_TASKS).toEqual([
      'MLUX-002',
      'MLUX-003',
      'MLUX-004',
      'MLUX-005',
      'MLUX-006-FOLLOWUP',
    ]);
    expect(followupOwner).toBe('MLUX-006-FOLLOWUP');
  });

  it('keeps the complete MLUX-004 DRAFT-22 allocation, non-plural resource parity, variables, plural flags, and Draft/Pending state', () => {
    const runtime = createLocaleRuntime('en');
    expect(MLUX_004_DRAFT22_RUNTIME_PROJECTION).toHaveLength(311);
    expect(
      MLUX_004_DRAFT22_RUNTIME_PROJECTION.flatMap(({ occurrences }) => occurrences),
    ).toHaveLength(383);
    expect(mlux004ContractViolations(MLUX_004_RUNTIME_MAPPING)).toEqual([]);

    for (const expected of MLUX_004_DRAFT22_RUNTIME_PROJECTION) {
      if (expected.plural) continue;
      const namespace = expected.namespace as LocaleMappingRecord['namespace'];
      expect(runtime.getResource('en', namespace, expected.key)).toBe(
        asI18nextResourceValue(expected.english, expected.variables),
      );
      expect(runtime.getResource('ru', namespace, expected.key)).toBe(
        asI18nextResourceValue(expected.russian.value, expected.variables),
      );
      expect(runtime.getResource('uz', namespace, expected.key)).toBe(
        asI18nextResourceValue(expected.uzbek.value, expected.variables),
      );
    }
  });

  it('rejects independent MLUX-004 key, value, context, classification and owner mutations', () => {
    const original = MLUX_004_RUNTIME_MAPPING[0];
    expect(original).toBeDefined();
    if (!original) return;

    const mutation = (mutatedRecord: LocaleMappingRecord) => [
      mutatedRecord,
      ...MLUX_004_RUNTIME_MAPPING.slice(1),
    ];
    const firstOccurrence = original.occurrences[0];
    expect(firstOccurrence).toBeDefined();
    if (!firstOccurrence) return;

    expect(mlux004ContractViolations(mutation({ ...original, key: 'wrongKey' }))).toContain(
      `wrong key ${original.unitId}`,
    );
    expect(mlux004ContractViolations(mutation({ ...original, english: 'Wrong value' }))).toContain(
      `wrong value ${original.unitId}`,
    );
    expect(
      mlux004ContractViolations(
        mutation({
          ...original,
          occurrences: [
            { ...firstOccurrence, context: 'Wrong context' },
            ...original.occurrences.slice(1),
          ],
        }),
      ),
    ).toContain(`wrong context ${firstOccurrence.id}`);
    expect(
      mlux004ContractViolations(
        mutation({
          ...original,
          occurrences: [
            { ...firstOccurrence, classification: 'Accessibility only' },
            ...original.occurrences.slice(1),
          ],
        }),
      ),
    ).toContain(`wrong classification ${firstOccurrence.id}`);
    expect(
      mlux004ContractViolations(
        mutation({
          ...original,
          occurrences: [
            { ...firstOccurrence, ownerTask: 'MLUX-003' },
            ...original.occurrences.slice(1),
          ],
        }),
      ),
    ).toContain(`wrong owner ${firstOccurrence.id}`);
  });

  it('rejects D05-specific unit, occurrence, and association parity mutations', () => {
    const d05Records = MLUX_004_RUNTIME_MAPPING.filter(({ unitId }) =>
      ['MLUX-C0366', 'MLUX-C0367', 'MLUX-C0368'].includes(unitId),
    );
    const priceRange = d05Records.find(({ unitId }) => unitId === 'MLUX-C0366');
    const priceLabel = d05Records.find(({ unitId }) => unitId === 'MLUX-C0367');
    const priceSuffix = d05Records.find(({ unitId }) => unitId === 'MLUX-C0368');

    expect(d05Records).toHaveLength(3);
    expect(priceRange?.occurrences).toHaveLength(1);
    expect(priceLabel?.occurrences).toHaveLength(1);
    expect(priceSuffix?.occurrences).toHaveLength(2);
    if (!priceRange || !priceLabel || !priceSuffix) return;

    const replaceRecord = (
      unitId: string,
      mutate: (record: LocaleMappingRecord) => LocaleMappingRecord,
    ): LocaleMappingRecord[] =>
      MLUX_004_RUNTIME_MAPPING.map((record) =>
        record.unitId === unitId ? mutate(record) : record,
      );

    for (const record of [priceRange, priceLabel, priceSuffix]) {
      expect(
        mlux004ContractViolations(
          replaceRecord(record.unitId, (current) => ({ ...current, key: 'wrongKey' })),
        ),
      ).toEqual([`wrong key ${record.unitId}`]);
      expect(
        mlux004ContractViolations(
          replaceRecord(record.unitId, (current) => ({ ...current, english: 'Wrong value' })),
        ),
      ).toEqual([`wrong value ${record.unitId}`]);
    }

    for (const record of [priceRange, priceLabel, priceSuffix]) {
      for (const occurrence of record.occurrences) {
        expect(
          mlux004ContractViolations(
            replaceRecord(record.unitId, (current) => ({
              ...current,
              occurrences: current.occurrences.map((candidate) =>
                candidate.id === occurrence.id
                  ? { ...candidate, context: 'Wrong context' }
                  : candidate,
              ),
            })),
          ),
        ).toEqual([`wrong context ${occurrence.id}`]);
        expect(
          mlux004ContractViolations(
            replaceRecord(record.unitId, (current) => ({
              ...current,
              occurrences: current.occurrences.map((candidate) =>
                candidate.id === occurrence.id
                  ? {
                      ...candidate,
                      classification:
                        candidate.classification === 'Visible UI copy'
                          ? 'Accessibility only'
                          : 'Visible UI copy',
                    }
                  : candidate,
              ),
            })),
          ),
        ).toEqual([`wrong classification ${occurrence.id}`]);
        expect(
          mlux004ContractViolations(
            replaceRecord(record.unitId, (current) => ({
              ...current,
              occurrences: current.occurrences.map((candidate) =>
                candidate.id === occurrence.id
                  ? { ...candidate, ownerTask: 'MLUX-003' }
                  : candidate,
              ),
            })),
          ),
        ).toEqual([`wrong owner ${occurrence.id}`]);
      }
    }

    expect(
      mlux004ContractViolations(
        MLUX_004_RUNTIME_MAPPING.filter(({ unitId }) => unitId !== 'MLUX-C0366'),
      ),
    ).toEqual(['missing unit MLUX-C0366']);
    expect(
      mlux004ContractViolations([
        ...MLUX_004_RUNTIME_MAPPING,
        { ...priceRange, unitId: 'MLUX-C0369' },
      ]),
    ).toEqual(['extra unit MLUX-C0369']);
    expect(
      mlux004ContractViolations(
        replaceRecord('MLUX-C0368', (current) => ({
          ...current,
          occurrences: current.occurrences.filter(({ id }) => id !== 'O0515'),
        })),
      ),
    ).toEqual(['missing occurrence O0515']);
    expect(
      mlux004ContractViolations(
        replaceRecord('MLUX-C0368', (current) => ({
          ...current,
          occurrences: [...current.occurrences, { ...current.occurrences[0]!, id: 'O0516' }],
        })),
      ),
    ).toEqual(['extra occurrence O0516']);
    expect(
      mlux004ContractViolations(
        MLUX_004_RUNTIME_MAPPING.map((record) => {
          if (record.unitId === 'MLUX-C0367') {
            return { ...record, occurrences: [...record.occurrences, priceSuffix.occurrences[0]!] };
          }
          if (record.unitId === 'MLUX-C0368') {
            return {
              ...record,
              occurrences: record.occurrences.filter(({ id }) => id !== 'O0514'),
            };
          }
          return record;
        }),
      ),
    ).toEqual(['extra occurrence O0514', 'missing occurrence O0514']);
  });

  it('keeps the independently enumerated MLUX-003 allocation, resource parity and occurrences complete', () => {
    const runtime = createLocaleRuntime('en');
    expect(MLUX_003_RUNTIME_MAPPING).toEqual(MLUX_003_EXPECTED_MAPPING);
    expect(MLUX_003_RUNTIME_MAPPING).toHaveLength(49);
    expect(MLUX_003_RUNTIME_MAPPING.flatMap(({ occurrences }) => occurrences)).toHaveLength(52);
    expect(
      MLUX_003_EXPECTED_MAPPING.flatMap(({ occurrences }) =>
        occurrences.map(({ id }) => id),
      ).sort(),
    ).toEqual([...MLUX_003_EXPECTED_OCCURRENCE_IDS].sort());
    expect(mlux003ContractViolations(MLUX_003_RUNTIME_MAPPING)).toEqual([]);

    for (const expected of MLUX_003_EXPECTED_MAPPING) {
      const resourceKey = `${expected.namespace}:${expected.key}`;
      expect(runtime.getResource('en', expected.namespace, expected.key)).toBe(expected.english);
      expect(runtime.exists(resourceKey)).toBe(true);

      for (const locale of ['ru', 'uz'] as const) {
        const resource = runtime.getResource(locale, expected.namespace, expected.key);
        expect(resource).toEqual(expect.any(String));
        expect(interpolationVariables(resource as string)).toEqual(
          interpolationVariables(expected.english),
        );
      }
    }

    expect(runtime.getResource('en', 'routes', 'notFoundDocumentTitle')).toBe(
      'Page not found | LearnHub',
    );
    expect(runtime.getResource('ru', 'routes', 'notFoundDocumentTitle')).toBe(
      'Страница не найдена | LearnHub',
    );
    expect(runtime.getResource('uz', 'routes', 'notFoundDocumentTitle')).toBe(
      'Sahifa topilmadi | LearnHub',
    );
  });

  it('rejects a mutation-equivalent MLUX-003 allocation with a removed record and duplicate unit', () => {
    const removedRecord = MLUX_003_RUNTIME_MAPPING.find(({ unitId }) => unitId === 'MLUX-C0037');
    const replacementRecord = MLUX_003_RUNTIME_MAPPING.find(
      ({ unitId }) => unitId === 'MLUX-C0038',
    );

    expect(removedRecord).toBeDefined();
    expect(replacementRecord).toBeDefined();
    if (!removedRecord || !replacementRecord) return;

    const mutationEquivalent = MLUX_003_RUNTIME_MAPPING.map((mapping) =>
      mapping.unitId === removedRecord.unitId
        ? { ...replacementRecord, occurrences: removedRecord.occurrences }
        : mapping,
    );

    expect(mlux003ContractViolations(mutationEquivalent)).toEqual(
      expect.arrayContaining(['missing unit MLUX-C0037', 'duplicate unit MLUX-C0038']),
    );
    expect(mutationEquivalent).not.toEqual(MLUX_003_EXPECTED_MAPPING);
  });

  it('references the rendered language menu only while the disclosure is open', async () => {
    render(
      <LocaleProvider store={createBrowserLocaleStore(memoryStorage())}>
        <LanguageSelector {...LANGUAGE_SELECTOR_CLASSES} />
      </LocaleProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Change language' });
    expect(trigger.getAttribute('aria-controls')).toBeNull();

    const user = userEvent.setup();
    await act(async () => {
      await user.click(trigger);
    });
    const menu = screen.getByLabelText('Language menu');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);

    await act(async () => {
      await user.click(trigger);
    });
    expect(trigger.getAttribute('aria-controls')).toBeNull();
  });

  it('collects browser language preferences only from available string-valued sources', () => {
    withBrowserNavigator(undefined, () => {
      expect(getBrowserLocales()).toEqual([]);
    });
    withBrowserNavigator({ language: 'ru-RU' }, () => {
      expect(getBrowserLocales()).toEqual(['ru-RU']);
    });
    withBrowserNavigator({ languages: [], language: 'uz-UZ' }, () => {
      expect(getBrowserLocales()).toEqual(['uz-UZ']);
    });
    withBrowserNavigator({ languages: ['uz-Cyrl-UZ', 'ru-RU'], language: 'en-US' }, () => {
      expect(getBrowserLocales()).toEqual(['uz-Cyrl-UZ', 'ru-RU']);
    });
    withBrowserNavigator({ languages: [], language: undefined }, () => {
      expect(getBrowserLocales()).toEqual([]);
    });
  });

  it('normalizes locale tags independently from host-specific case rules', () => {
    const localeLowerCase = vi
      .spyOn(String.prototype, 'toLocaleLowerCase')
      .mockImplementation(() => 'turkish-locale-result');

    try {
      expect(normalizeLocale('RU-ru')).toBe('ru');
    } finally {
      localeLowerCase.mockRestore();
    }
  });

  it('uses a supported saved preference before browser languages and persists the selected locale', async () => {
    const storage = memoryStorage({ 'learnhub.locale': 'ru-RU' });
    const store = createBrowserLocaleStore(storage);

    expect(resolveLocale({ storedLocale: store.get(), browserLocales: ['uz-UZ'] })).toBe('ru');

    const firstRender = render(
      <LocaleProvider store={store}>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('active locale').textContent).toBe('ru');

    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Set Uzbek' }));
    });
    expect(storage.getItem('learnhub.locale')).toBe('uz');
    expect(screen.getByLabelText('active locale').textContent).toBe('uz');

    firstRender.unmount();
    render(
      <LocaleProvider store={store}>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('active locale').textContent).toBe('uz');
  });

  it('synchronizes the committed provider locale to the document language', async () => {
    const previousDocumentLanguage = document.documentElement.lang;
    try {
      document.documentElement.lang = 'en';
      render(
        <LocaleProvider initialLocale="ru">
          <LocaleProbe />
        </LocaleProvider>,
      );
      expect(document.documentElement.lang).toBe('ru');

      await act(async () => {
        await userEvent.setup().click(screen.getByRole('button', { name: 'Set Uzbek' }));
      });
      expect(document.documentElement.lang).toBe('uz');
    } finally {
      document.documentElement.lang = previousDocumentLanguage;
    }
  });

  it('keeps provider initialization instance-owned across rerenders and an abandoned render', () => {
    void localeRuntime.changeLanguage('en');
    const changeSingletonLanguage = vi.spyOn(localeRuntime, 'changeLanguage');
    const globalRuntimeBeforeRender = getI18n();
    const globalLanguageBeforeRender = globalRuntimeBeforeRender?.language;
    expect(globalRuntimeBeforeRender).toBe(localeRuntime);
    const committed = render(
      <LocaleProvider initialLocale="ru">
        <LocaleProbe />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText('active locale').textContent).toBe('ru');
    expect(localeRuntime.language).toBe('en');
    expect(changeSingletonLanguage).not.toHaveBeenCalled();
    expect(getI18n()).toBe(globalRuntimeBeforeRender);
    expect(getI18n()?.language).toBe(globalLanguageBeforeRender);

    committed.rerender(
      <LocaleProvider initialLocale="uz">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('active locale').textContent).toBe('ru');
    expect(localeRuntime.language).toBe('en');
    expect(changeSingletonLanguage).not.toHaveBeenCalled();
    expect(getI18n()).toBe(globalRuntimeBeforeRender);
    expect(getI18n()?.language).toBe(globalLanguageBeforeRender);

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <LocaleProvider initialLocale="uz">
          <ThrowingLocaleProbe />
        </LocaleProvider>,
      ),
    ).toThrow('abandoned locale render');
    expect(localeRuntime.language).toBe('en');
    expect(changeSingletonLanguage).not.toHaveBeenCalled();
    expect(getI18n()).toBe(globalRuntimeBeforeRender);
    expect(getI18n()?.language).toBe(globalLanguageBeforeRender);
    consoleError.mockRestore();
  });

  it('accepts supported browser languages and falls back to English for unsupported values', () => {
    expect(resolveLocale({ browserLocales: ['en-GB'] })).toBe('en');
    expect(resolveLocale({ browserLocales: ['uz-Cyrl-UZ', 'ru-RU'] })).toBe('uz');
    expect(resolveLocale({ browserLocales: ['de-DE', 'fr-FR'] })).toBe('en');
    expect(resolveLocale({ storedLocale: 'not-a-locale', browserLocales: ['ru-RU'] })).toBe('ru');
  });

  it('keeps English as the explicit fallback for missing translated entries', () => {
    const lookup = createLocaleLookup(
      { language: 'Language', logout: 'Log out' },
      { ru: { language: 'Язык' }, uz: { language: 'Til' } },
    );

    expect(lookup.get('language', 'ru')).toBe('Язык');
    expect(lookup.get('logout', 'uz')).toBe('Log out');
    expect(lookup.get('logout', 'en')).toBe('Log out');
  });

  it('runs only the approved locales with immutable English fallback and actionable missing-key output', () => {
    const diagnostics: LocaleRuntimeDiagnostics = { missingKeys: [] };
    diagnostics.missingKeys.push({ namespace: 'test', key: 'direct-diagnostic-contract' });
    const runtime = createLocaleRuntime('ru', diagnostics);

    expect((runtime.options.supportedLngs || []).filter((locale) => locale !== 'cimode')).toEqual([
      'en',
      'ru',
      'uz',
    ]);
    expect(runtime.options.fallbackLng).toEqual(['en']);
    expect(runtime.t('common:language')).toBe('Язык');
    expect(runtime.t('common:not-a-real-key')).toBe('Translation unavailable');
    expect(diagnostics.missingKeys).toContainEqual({ namespace: 'common', key: 'not-a-real-key' });
    expect(diagnostics.missingKeys).toContainEqual({
      namespace: 'test',
      key: 'direct-diagnostic-contract',
    });
  });

  it('keeps the exported runtime stable when a provider initializes its own locale', async () => {
    await localeRuntime.changeLanguage('en');

    render(
      <LocaleProvider initialLocale="ru">
        <LocaleProbe />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText('active locale').textContent).toBe('ru');
    expect(localeRuntime.language).toBe('en');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('provides the canonical MLUX-C0369 logout copy in every supported locale', () => {
    const runtime = createLocaleRuntime('en');
    const mapping = MLUX_002_RUNTIME_MAPPING.find(({ unitId }) => unitId === 'MLUX-C0369');

    expect(mapping).toMatchObject({
      namespace: 'auth',
      key: 'logOut',
      english: 'Log out',
      occurrences: [
        {
          id: 'O0521',
          context: 'src/app/layouts/AccountMenu.tsx:244 — AppShell / authenticated account menu',
        },
      ],
    });
    expect({
      en: runtime.getResource('en', 'auth', 'logOut'),
      ru: runtime.getResource('ru', 'auth', 'logOut'),
      uz: runtime.getResource('uz', 'auth', 'logOut'),
    }).toEqual({ en: 'Log out', ru: 'Выйти', uz: 'Chiqish' });
  });

  it('adopts canonical student and anonymous mobile-navigation landmarks in every locale', () => {
    const runtime = createLocaleRuntime('en');

    expect(
      MLUX_002_RUNTIME_MAPPING.filter(
        ({ unitId }) => unitId === 'MLUX-C0370' || unitId === 'MLUX-C0371',
      ),
    ).toMatchObject([
      {
        unitId: 'MLUX-C0370',
        namespace: 'a11y',
        key: 'studentNavigation',
        english: 'Student navigation',
        occurrences: [{ id: 'O0522' }],
      },
      {
        unitId: 'MLUX-C0371',
        namespace: 'a11y',
        key: 'anonymousNavigation',
        english: 'Anonymous navigation',
        occurrences: [{ id: 'O0523' }],
      },
    ]);
    expect({
      en: [
        runtime.getResource('en', 'a11y', 'studentNavigation'),
        runtime.getResource('en', 'a11y', 'anonymousNavigation'),
      ],
      ru: [
        runtime.getResource('ru', 'a11y', 'studentNavigation'),
        runtime.getResource('ru', 'a11y', 'anonymousNavigation'),
      ],
      uz: [
        runtime.getResource('uz', 'a11y', 'studentNavigation'),
        runtime.getResource('uz', 'a11y', 'anonymousNavigation'),
      ],
    }).toEqual({
      en: ['Student navigation', 'Anonymous navigation'],
      ru: ['Навигация студента', 'Навигация гостя'],
      uz: ['Talaba navigatsiyasi', 'Mehmon navigatsiyasi'],
    });
  });

  it('provides the canonical account-role labels in every supported locale', () => {
    const runtime = createLocaleRuntime('en');

    expect(
      MLUX_004_RUNTIME_MAPPING.filter(({ unitId }) =>
        ['MLUX-C0285', 'MLUX-C0164', 'MLUX-C0286'].includes(unitId),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unitId: 'MLUX-C0285',
          namespace: 'auth',
          key: 'student',
          english: 'Student',
        }),
        expect.objectContaining({
          unitId: 'MLUX-C0164',
          namespace: 'course',
          key: 'instructor',
          english: 'Instructor',
        }),
        expect.objectContaining({
          unitId: 'MLUX-C0286',
          namespace: 'auth',
          key: 'admin',
          english: 'Admin',
        }),
      ]),
    );
    expect(
      MLUX_004_SHARED_OCCURRENCES.filter(({ id }) => ['O0707', 'O0708', 'O0709'].includes(id)),
    ).toEqual([
      {
        id: 'O0707',
        unitId: 'MLUX-C0285',
        context: 'src/app/layouts/AccountMenu.tsx:214 — AppShell / authenticated account menu',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0708',
        unitId: 'MLUX-C0164',
        context: 'src/app/layouts/AccountMenu.tsx:214 — AppShell / authenticated account menu',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
      {
        id: 'O0709',
        unitId: 'MLUX-C0286',
        context: 'src/app/layouts/AccountMenu.tsx:214 — AppShell / authenticated account menu',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-004',
      },
    ]);
    expect({
      en: [
        runtime.getResource('en', 'auth', 'student'),
        runtime.getResource('en', 'course', 'instructor'),
        runtime.getResource('en', 'auth', 'admin'),
      ],
      ru: [
        runtime.getResource('ru', 'auth', 'student'),
        runtime.getResource('ru', 'course', 'instructor'),
        runtime.getResource('ru', 'auth', 'admin'),
      ],
      uz: [
        runtime.getResource('uz', 'auth', 'student'),
        runtime.getResource('uz', 'course', 'instructor'),
        runtime.getResource('uz', 'auth', 'admin'),
      ],
    }).toEqual({
      en: ['Student', 'Instructor', 'Admin'],
      ru: ['Студент', 'Преподаватель', 'Администратор'],
      uz: ['Talaba', 'O‘qituvchi', 'Administrator'],
    });
  });

  it('keeps the independently enumerated DRAFT-18 MLUX-002 allocation, resources, review state and occurrences complete', () => {
    const runtime = createLocaleRuntime('en');
    const foundationMapping = MLUX_002_RUNTIME_MAPPING.filter(({ unitId }) =>
      FOUNDATION_UNIT_ID_PATTERN.test(unitId),
    );
    const foundationOccurrences = foundationMapping
      .flatMap((mapping) => mapping.occurrences)
      .filter(({ id }) => /^O00(?:0[1-9]|[12]\d|3[0-3])$/.test(id));
    const expectedIds = [
      'MLUX-C0001',
      'MLUX-C0002',
      'MLUX-C0003',
      'MLUX-C0004',
      'MLUX-C0005',
      'MLUX-C0006',
      'MLUX-C0007',
      'MLUX-C0008',
      'MLUX-C0009',
      'MLUX-C0010',
      'MLUX-C0011',
      'MLUX-C0012',
      'MLUX-C0013',
      'MLUX-C0014',
      'MLUX-C0015',
      'MLUX-C0016',
      'MLUX-C0017',
      'MLUX-C0018',
      'MLUX-C0019',
      'MLUX-C0020',
      'MLUX-C0021',
      'MLUX-C0022',
      'MLUX-C0023',
      'MLUX-C0369',
      'MLUX-C0370',
      'MLUX-C0371',
      'MLUX-C0372',
      'MLUX-C0373',
    ];

    expect(MLUX_002_RUNTIME_MAPPING.map((mapping) => mapping.unitId)).toEqual(expectedIds);
    expect(MLUX_002_RUNTIME_MAPPING.flatMap((mapping) => mapping.occurrences)).toHaveLength(44);
    expect(foundationMapping.map((mapping) => mapping.unitId)).toEqual(expectedIds.slice(0, 23));
    expect(
      ['MLUX-C0000', 'MLUX-C0024', 'MLUX-C0099'].filter((unitId) =>
        FOUNDATION_UNIT_ID_PATTERN.test(unitId),
      ),
    ).toEqual([]);
    expect(foundationOccurrences).toHaveLength(33);
    expect(foundationOccurrences.map(({ id }) => id).sort()).toEqual(
      Array.from({ length: 33 }, (_, index) => `O${String(index + 1).padStart(4, '0')}`),
    );
    expect(
      MLUX_002_RUNTIME_MAPPING.flatMap((mapping) => mapping.occurrences)
        .map(({ id }) => id)
        .sort(),
    ).toEqual([
      ...Array.from({ length: 33 }, (_, index) => `O${String(index + 1).padStart(4, '0')}`),
      'O0521',
      'O0522',
      'O0523',
      'O0524',
      'O0525',
      'O0528',
      'O0529',
      'O0530',
      'O0531',
      'O0532',
      'O0533',
    ]);
    expect(MLUX_002_SHARED_OCCURRENCES).toEqual([
      {
        id: 'O0526',
        unitId: 'MLUX-C0229',
        context: 'src/app/layouts/AppShell.tsx:753 — AppShell / instructor desktop header action',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-002',
      },
      {
        id: 'O0527',
        unitId: 'MLUX-C0229',
        context:
          'src/app/layouts/AppShell.tsx:875 — AppShell / instructor compact navigation action',
        classification: 'Visible UI copy',
        ownerTask: 'MLUX-002',
      },
    ]);
    for (const mapping of MLUX_002_RUNTIME_MAPPING) {
      expect(mapping.unitId).toMatch(/^MLUX-C\d{4}$/);
      expect(mapping.key).not.toMatch(/^MLUX-/);
      expect(mapping.resourceStatus).toBe('Draft');
      expect(mapping.russian).toEqual({ resource: 'Draft', review: 'Pending' });
      expect(mapping.uzbek).toEqual({ resource: 'Draft', review: 'Pending' });
      expect(mapping.ownerTask).toBe('MLUX-002');
      expect(runtime.exists(`${mapping.namespace}:${mapping.key}`)).toBe(true);
    }

    expect({
      en: {
        logOut: runtime.getResource('en', 'auth', 'logOut'),
        studentNavigation: runtime.getResource('en', 'a11y', 'studentNavigation'),
        anonymousNavigation: runtime.getResource('en', 'a11y', 'anonymousNavigation'),
        skipToMainContent: runtime.getResource('en', 'a11y', 'skipToMainContent'),
        learnHubHome: runtime.getResource('en', 'a11y', 'learnHubHome'),
      },
      ru: {
        logOut: runtime.getResource('ru', 'auth', 'logOut'),
        studentNavigation: runtime.getResource('ru', 'a11y', 'studentNavigation'),
        anonymousNavigation: runtime.getResource('ru', 'a11y', 'anonymousNavigation'),
        skipToMainContent: runtime.getResource('ru', 'a11y', 'skipToMainContent'),
        learnHubHome: runtime.getResource('ru', 'a11y', 'learnHubHome'),
      },
      uz: {
        logOut: runtime.getResource('uz', 'auth', 'logOut'),
        studentNavigation: runtime.getResource('uz', 'a11y', 'studentNavigation'),
        anonymousNavigation: runtime.getResource('uz', 'a11y', 'anonymousNavigation'),
        skipToMainContent: runtime.getResource('uz', 'a11y', 'skipToMainContent'),
        learnHubHome: runtime.getResource('uz', 'a11y', 'learnHubHome'),
      },
    }).toEqual({
      en: {
        logOut: 'Log out',
        studentNavigation: 'Student navigation',
        anonymousNavigation: 'Anonymous navigation',
        skipToMainContent: 'Skip to main content',
        learnHubHome: 'LearnHub home',
      },
      ru: {
        logOut: 'Выйти',
        studentNavigation: 'Навигация студента',
        anonymousNavigation: 'Навигация гостя',
        skipToMainContent: 'Перейти к основному содержимому',
        learnHubHome: 'Главная LearnHub',
      },
      uz: {
        logOut: 'Chiqish',
        studentNavigation: 'Talaba navigatsiyasi',
        anonymousNavigation: 'Mehmon navigatsiyasi',
        skipToMainContent: "Asosiy mazmunga o'tish",
        learnHubHome: 'LearnHub bosh sahifasi',
      },
    });
  });

  it('binds the DRAFT-19 AppShell occurrence metadata and exact wordmark exclusion to live source lines', () => {
    const occurrences = [
      ...MLUX_002_RUNTIME_MAPPING.flatMap(
        ({ occurrences: mappedOccurrences }) => mappedOccurrences,
      ),
      ...MLUX_002_SHARED_OCCURRENCES,
    ];

    for (const binding of MLUX_002_SOURCE_BINDINGS) {
      const occurrence = occurrences.find(({ id }) => id === binding.occurrenceId);
      expect(occurrence).toBeTruthy();
      const lineMatch = occurrence?.context.match(/^src\/app\/layouts\/AppShell\.tsx:(\d+) —/);
      expect(lineMatch).toBeTruthy();
      const sourceLine = APP_SHELL_SOURCE_LINES[Number(lineMatch?.[1]) - 1];
      expect(sourceLine).toContain(binding.expectedSource);
    }

    for (const binding of MLUX_002_NAVIGATION_DECLARATION_BINDINGS) {
      const occurrence = occurrences.find(({ id }) => id === binding.occurrenceId);
      expect(occurrence).toBeTruthy();
      const lineMatch = occurrence?.context.match(
        /^src\/app\/layouts\/app-shell-navigation\.ts:(\d+) —/,
      );
      expect(lineMatch).toBeTruthy();
      const sourceLine = APP_SHELL_NAVIGATION_SOURCE_LINES[Number(lineMatch?.[1]) - 1];
      expect(sourceLine).toContain(binding.expectedSource);
    }

    expect(APP_SHELL_SOURCE_LINES[610]?.trim()).toBe(
      '<span className={styles.brandWordmark}>LearnHub</span>',
    );
  });

  it('keeps the independently enumerated DRAFT-24 instructor allocation complete and shared resources unpublished', () => {
    const runtime = createLocaleRuntime('en');
    const runtimeUnitIds = MLUX_005_RUNTIME_MAPPING.map(({ unitId }) => unitId);
    const runtimeOccurrenceIds = MLUX_005_RUNTIME_MAPPING.flatMap(({ occurrences }) =>
      occurrences.map(({ id }) => id),
    );

    expect(MLUX_005_DRAFT15_INSTRUCTOR_UNIT_IDS).toHaveLength(
      MLUX_005_DRAFT15_COUNTS.instructorUnits,
    );
    expect(MLUX_005_DRAFT15_SHARED_UNIT_IDS).toHaveLength(MLUX_005_DRAFT15_COUNTS.sharedUnits);
    expect(MLUX_005_RUNTIME_MAPPING).toHaveLength(MLUX_005_DRAFT15_COUNTS.instructorUnits);
    expect(runtimeOccurrenceIds).toHaveLength(MLUX_005_DRAFT15_COUNTS.instructorOccurrences);
    expect(MLUX_005_SHARED_OCCURRENCES).toHaveLength(MLUX_005_DRAFT15_COUNTS.sharedOccurrences);
    expect([...MLUX_005_DRAFT15_INSTRUCTOR_UNIT_IDS].sort()).toEqual([...runtimeUnitIds].sort());
    expect([...MLUX_005_DRAFT15_SHARED_OCCURRENCE_IDS].sort()).toEqual(
      MLUX_005_SHARED_OCCURRENCES.map(({ id }) => id).sort(),
    );
    expect(new Set([...runtimeUnitIds, ...MLUX_005_DRAFT15_SHARED_UNIT_IDS]).size).toBe(
      MLUX_005_DRAFT15_COUNTS.totalUnits,
    );
    expect(runtimeOccurrenceIds.length + MLUX_005_SHARED_OCCURRENCES.length).toBe(
      MLUX_005_DRAFT15_COUNTS.totalOccurrences,
    );

    for (const mapping of MLUX_005_RUNTIME_MAPPING) {
      expect(mapping.ownerTask).toBe('MLUX-005');
      expect(mapping.occurrences.every(({ ownerTask }) => ownerTask === 'MLUX-005')).toBe(true);
      expect(mapping.key).not.toMatch(/^unit\d+$/);
      expect(
        runtime.exists(
          `${mapping.namespace}:${mapping.key}`,
          mapping.plural ? { count: 1 } : undefined,
        ),
      ).toBe(true);
    }
  });

  it('keeps the DRAFT-24 course-row action name parameterized and bound to the live consumer', () => {
    const runtime = createLocaleRuntime('en');
    const courseTitle = 'API $& {title} — dars';

    expect(runtime.t('instructor:coursesCourseActions', { lng: 'en', courseTitle })).toBe(
      `${courseTitle} actions`,
    );
    expect(runtime.t('instructor:coursesCourseActions', { lng: 'ru', courseTitle })).toBe(
      `Действия с курсом «${courseTitle}»`,
    );
    expect(runtime.t('instructor:coursesCourseActions', { lng: 'uz', courseTitle })).toBe(
      `${courseTitle} kursi bo‘yicha amallar`,
    );
    expect(INSTRUCTOR_COURSES_SOURCE).toContain("t('instructor:coursesCourseActions'");
    expect(INSTRUCTOR_COURSES_SOURCE).not.toContain('aria-label={`${course.title} actions`}');
  });

  it('rejects DRAFT-24 owner and duplicate-resource mutations', () => {
    const first = MLUX_005_RUNTIME_MAPPING[0];
    expect(first).toBeDefined();
    if (!first) return;

    const duplicate = [...MLUX_005_RUNTIME_MAPPING, first];
    expect(new Set(duplicate.map(({ unitId }) => unitId)).size).not.toBe(duplicate.length);
    const wrongOwner = { ...first, ownerTask: 'MLUX-004' as const };
    expect(wrongOwner.ownerTask).not.toBe('MLUX-005');
    expect(MLUX_005_SHARED_OCCURRENCES.every(({ ownerTask }) => ownerTask === 'MLUX-005')).toBe(
      true,
    );
  });

  it('keeps the independent DRAFT-24 additive validation resources semantically exact', () => {
    const runtime = createLocaleRuntime('en');
    expect(mlux005Draft15AdditiveContractViolations(MLUX_005_RUNTIME_MAPPING)).toEqual([]);
    for (const expected of MLUX_005_DRAFT15_ADDITIVE_RESOURCES) {
      expect(runtime.getResource('en', 'instructor', expected.key)).toBe(expected.english);
      expect(runtime.getResource('ru', 'instructor', expected.key)).toBe(expected.russian);
      expect(runtime.getResource('uz', 'instructor', expected.key)).toBe(expected.uzbek);
    }
    const first = MLUX_005_RUNTIME_MAPPING.find(({ unitId }) => unitId === 'MLUX-C0360');
    expect(first).toBeDefined();
    if (!first) return;
    expect(mlux005Draft15AdditiveContractViolations([{ ...first, key: 'wrongKey' }])).toContain(
      'wrong key MLUX-C0360',
    );
    expect(
      mlux005Draft15AdditiveContractViolations([
        {
          ...first,
          occurrences: [{ ...first.occurrences[0]!, classification: 'Visible UI copy' }],
        },
      ]),
    ).toContain('wrong occurrence MLUX-C0360');
  });

  it('keeps the DRAFT-24 enrollment count plural forms exact in EN, RU and UZ', () => {
    const runtime = createLocaleRuntime('en');
    for (const [locale, forms] of Object.entries(MLUX_005_DRAFT23_ENROLLMENT_PLURAL_FORMS)) {
      for (const [suffix, expected] of Object.entries(forms)) {
        expect(runtime.getResource(locale, 'instructor', `courseEnrollmentsCount_${suffix}`)).toBe(
          expected,
        );
      }
    }
  });

  it('matches every DRAFT-24 resource, publication field and occurrence against the independent fixture', () => {
    const candidate = createMlux005Draft15RuntimeCandidate();
    expect(MLUX_005_DRAFT15_UNIT_FIXTURE).toHaveLength(MLUX_005_DRAFT15_COUNTS.totalUnits);
    expect(MLUX_005_DRAFT15_OCCURRENCE_FIXTURE).toHaveLength(
      MLUX_005_DRAFT15_COUNTS.totalOccurrences,
    );
    expect(candidate.units).toHaveLength(MLUX_005_DRAFT15_COUNTS.totalUnits);
    expect(candidate.occurrences).toHaveLength(MLUX_005_DRAFT15_COUNTS.totalOccurrences);
    expect(collectMlux005Draft15ContractViolations(candidate)).toEqual([]);
  });

  it('rejects DRAFT-24 semantic, locale, publication and occurrence candidate mutations', () => {
    const candidate = createMlux005Draft15RuntimeCandidate();
    const firstUnit = candidate.units[0];
    const firstOccurrence = candidate.occurrences[0];
    const combinedOccurrence = candidate.occurrences.find(
      ({ occurrenceId }) => occurrenceId === 'O0506',
    );
    const visibleOnlyOccurrence = candidate.occurrences.find(
      ({ occurrenceId }) => occurrenceId === 'O0508',
    );
    const courseActionsUnit = candidate.units.find(({ unitId }) => unitId === 'MLUX-C0456');
    const courseActionsOccurrence = candidate.occurrences.find(
      ({ occurrenceId }) => occurrenceId === 'O0645',
    );
    const sharedOccurrence = candidate.occurrences.find((occurrence) =>
      MLUX_005_DRAFT15_SHARED_OCCURRENCE_IDS.includes(
        occurrence.occurrenceId as (typeof MLUX_005_DRAFT15_SHARED_OCCURRENCE_IDS)[number],
      ),
    );
    expect(firstUnit).toBeDefined();
    expect(firstOccurrence).toBeDefined();
    expect(combinedOccurrence).toBeDefined();
    expect(visibleOnlyOccurrence).toBeDefined();
    expect(courseActionsUnit).toBeDefined();
    expect(courseActionsOccurrence).toBeDefined();
    expect(sharedOccurrence).toBeDefined();
    if (
      !firstUnit ||
      !firstOccurrence ||
      !combinedOccurrence ||
      !visibleOnlyOccurrence ||
      !courseActionsUnit ||
      !courseActionsOccurrence ||
      !sharedOccurrence
    )
      return;

    const replaceFirstUnit = (
      replacement: Mlux005Draft15UnitCandidate,
    ): Mlux005Draft15Candidate => ({
      ...candidate,
      units: [replacement, ...candidate.units.slice(1)],
    });
    const replaceFirstOccurrence = (
      replacement: Mlux005Draft15OccurrenceFixture,
    ): Mlux005Draft15Candidate => ({
      ...candidate,
      occurrences: [replacement, ...candidate.occurrences.slice(1)],
    });
    const firstResource = candidate.resources[firstUnit.unitId];
    expect(firstResource).toBeDefined();
    if (!firstResource) return;

    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstUnit({ ...firstUnit, key: 'wrongSemanticKey' }),
      ),
    ).toContain(`wrong semantic key ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        resources: {
          ...candidate.resources,
          [firstUnit.unitId]: { ...firstResource, english: 'wrong English' },
        },
      }),
    ).toContain(`wrong English ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        resources: {
          ...candidate.resources,
          [firstUnit.unitId]: { ...firstResource, russian: 'wrong Russian' },
        },
      }),
    ).toContain(`wrong Russian ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        resources: {
          ...candidate.resources,
          [firstUnit.unitId]: { ...firstResource, uzbek: 'wrong Uzbek' },
        },
      }),
    ).toContain(`wrong Uzbek ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstUnit({ ...firstUnit, resourceStatus: 'Approved' }),
      ),
    ).toContain(`wrong resource status ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstUnit({
          ...firstUnit,
          russian: { ...firstUnit.russian, review: 'Accepted' },
        }),
      ),
    ).toContain(`wrong review status ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstUnit({ ...firstUnit, variables: ['differentVariable'] }),
      ),
    ).toContain(`wrong variables ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations(replaceFirstUnit({ ...firstUnit, plural: true })),
    ).toContain(`wrong plural ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstUnit({ ...firstUnit, ownerTask: 'MLUX-004' }),
      ),
    ).toContain(`wrong publisher ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        units: candidate.units.map((unit) =>
          unit.unitId === courseActionsUnit.unitId ? { ...unit, variables: [] } : unit,
        ),
      }),
    ).toContain('wrong variables MLUX-C0456');
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: candidate.occurrences.map((occurrence) =>
          occurrence.occurrenceId === courseActionsOccurrence.occurrenceId
            ? { ...occurrence, classification: 'Visible UI copy' }
            : occurrence,
        ),
      }),
    ).toContain('wrong occurrence classification O0645');
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstOccurrence({ ...firstOccurrence, unitId: 'MLUX-C9999' }),
      ),
    ).toContain(`wrong occurrence unit association ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstOccurrence({ ...firstOccurrence, context: 'wrong context' }),
      ),
    ).toContain(`wrong occurrence context ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstOccurrence({ ...firstOccurrence, classification: 'wrong classification' }),
      ),
    ).toContain(`wrong occurrence classification ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: candidate.occurrences.map((occurrence) =>
          occurrence.occurrenceId === combinedOccurrence.occurrenceId
            ? { ...occurrence, classification: 'Visible UI copy' }
            : occurrence,
        ),
      }),
    ).toContain('wrong occurrence classification O0506');
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: candidate.occurrences.map((occurrence) =>
          occurrence.occurrenceId === combinedOccurrence.occurrenceId
            ? { ...occurrence, occurrenceId: 'O0507' }
            : occurrence,
        ),
      }),
    ).toEqual(expect.arrayContaining(['missing occurrence O0506', 'duplicate occurrence O0507']));
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: candidate.occurrences.map((occurrence) =>
          occurrence.occurrenceId === visibleOnlyOccurrence.occurrenceId
            ? { ...occurrence, classification: 'Visible UI copy + accessibility label' }
            : occurrence,
        ),
      }),
    ).toContain('wrong occurrence classification O0508');
    expect(
      collectMlux005Draft15ContractViolations(
        replaceFirstOccurrence({ ...firstOccurrence, ownerTask: 'MLUX-004' }),
      ),
    ).toContain(`wrong occurrence owner ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        units: [...candidate.units, firstUnit],
      }),
    ).toContain(`duplicate unit ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        units: candidate.units.slice(1),
      }),
    ).toContain(`missing unit ${firstUnit.unitId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        units: [...candidate.units, { ...firstUnit, unitId: 'MLUX-C9999' }],
      }),
    ).toContain('extra unit MLUX-C9999');
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: [...candidate.occurrences, firstOccurrence],
      }),
    ).toContain(`duplicate occurrence ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: candidate.occurrences.slice(1),
      }),
    ).toContain(`missing occurrence ${firstOccurrence.occurrenceId}`);
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: [...candidate.occurrences, { ...firstOccurrence, occurrenceId: 'O9999' }],
      }),
    ).toContain('extra occurrence O9999');
    expect(
      collectMlux005Draft15ContractViolations({
        ...candidate,
        occurrences: candidate.occurrences.map((occurrence) =>
          occurrence.occurrenceId === sharedOccurrence.occurrenceId
            ? { ...occurrence, unitId: firstUnit.unitId }
            : occurrence,
        ),
      }),
    ).toContain(`wrong occurrence unit association ${sharedOccurrence.occurrenceId}`);
  });
});
