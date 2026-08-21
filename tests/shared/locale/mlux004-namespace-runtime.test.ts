import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createLocaleRuntime, MLUX_004_RUNTIME_MAPPING } from '@shared/locale';

import { MLUX_004_DRAFT17_PROJECTION } from './mlux004-draft11-projection';

const TASK_ADDED_LOOKUP_OWNERS = [
  'src/features/auth-workflows/AuthForm.tsx',
  'src/features/media-access/LessonMediaAccess.tsx',
  'src/features/media-access/LessonPdfPreview.tsx',
  'src/pages/ai-chat-page/AiChatPage.tsx',
  'src/pages/catalog-page/CatalogPage.tsx',
  'src/pages/catalog-page/CourseCard.tsx',
  'src/pages/catalog-page/SortControl.tsx',
  'src/pages/cart-page/CartPage.tsx',
  'src/pages/course-detail-page/CourseActionPanel.tsx',
  'src/pages/course-detail-page/CourseDetailPage.tsx',
  'src/pages/course-detail-page/CourseOutline.tsx',
  'src/pages/forgot-password-page/ForgotPasswordPage.tsx',
  'src/pages/learning-detail-page/LearningDetailPage.tsx',
  'src/pages/learning-list-page/LearningListPage.tsx',
  'src/pages/login-page/LoginPage.tsx',
  'src/pages/reset-password-page/ResetPasswordPage.tsx',
  'src/pages/signup-page/RolePicker.tsx',
  'src/pages/signup-page/SignupPage.tsx',
  'src/shared/ui/primitives/Button.tsx',
  'src/shared/ui/primitives/DestructiveConfirmation.tsx',
  'src/shared/ui/primitives/Dialog.tsx',
  'src/shared/ui/primitives/Notice.tsx',
  'src/shared/ui/primitives/Pagination.tsx',
  'src/shared/ui/primitives/Skeleton.tsx',
  'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx',
  'src/widgets/course-chat/CourseChatLauncherInteraction.tsx',
  'src/widgets/course-chat/CourseChatPanel.tsx',
  'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.tsx',
] as const;

const LOCALIZED_LOOKUPS = [
  { key: 'catalog:noCoursesFound', english: 'No courses found' },
  { key: 'catalog:courseResultPages', english: 'Course result pages' },
  { key: 'course:courseNotFound', english: 'Course not found' },
  { key: 'cart:clearCart', english: 'Clear cart' },
  { key: 'cart:preview', english: 'Preview {{courseTitle}}', variables: { courseTitle: 'Course' } },
  { key: 'learning:startYourLearningJourney', english: 'Start your learning journey' },
  { key: 'learning:learningEnrollmentsPagination', english: 'Learning enrollments pagination' },
  { key: 'common:loading', english: 'Loading…' },
  { key: 'navigation:logIn', english: 'Log in' },
  { key: 'routes:tryAgain', english: 'Try again' },
  { key: 'routes:courseDetailsTitle', english: 'Course details' },
  { key: 'a11y:pagination', english: 'Pagination' },
  { key: 'learning:loadingYourLearning', english: 'Loading your learning' },
  {
    key: 'learning:noCoursesEnrolledYet',
    english:
      'You haven’t enrolled in any courses yet. Browse the catalog and choose your first course.',
  },
  { key: 'learning:browseCourses', english: 'Browse courses' },
  {
    key: 'learning:enrollmentSummary',
    english: '{{total}} enrollment{{suffix}} · Page {{page}} of {{pages}}',
    variables: { total: 2, suffix: 's', page: 1, pages: 2 },
  },
  { key: 'learning:openCourse', english: 'Open course' },
  { key: 'ai:thinking', english: 'Thinking…' },
  { key: 'ai:couldntGenerateResponse', english: 'Couldn’t generate a response.' },
  {
    key: 'catalog:browseCoursesCraftedByIndustry',
    english:
      'Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.',
  },
  { key: 'cart:browseCourses', english: 'Browse courses' },
  { key: 'catalog:priceUnavailable', english: 'Price unavailable' },
  { key: 'catalog:priceRange', english: 'Price range' },
  { key: 'catalog:priceLabel', english: 'Price:' },
  { key: 'catalog:price', english: 'price' },
  { key: 'course:courseAction', english: 'Course action' },
] as const;

const D05_LOCALIZED_PRICE_NAMES = {
  ru: {
    'catalog:priceRange': 'Диапазон цен',
    'catalog:priceLabel': 'Цена:',
    'catalog:price': 'цена',
  },
  uz: {
    'catalog:priceRange': 'Narx oralig‘i',
    'catalog:priceLabel': 'Narx:',
    'catalog:price': 'narx',
  },
} as const;

function placeholderNames(value: string): string[] {
  return [...value.matchAll(/\{\{([A-Za-z][A-Za-z0-9]*)}}/g)].map((match) => match[1]!).sort();
}

interface D04SourceOccurrence {
  readonly occurrenceId: string;
  readonly owner: string;
  readonly key: string;
  readonly seam: string;
}

interface D05SourceOccurrence extends D04SourceOccurrence {}

// Every entry deliberately carries its own source seam: this must not be
// inferred from runtime mapping/resources or collapsed by matching only a key.
const D04_SOURCE_TO_CORPUS: readonly D04SourceOccurrence[] = [
  {
    occurrenceId: 'O0487',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'navigation:myLearning',
    seam: "if (enrollments.isPending) {\n    return (\n      <article className={styles.page}>\n        <header className={styles.pageHeader}>\n          <h1 tabIndex={-1} ref={headingRef}>\n            {t('navigation:myLearning', { defaultValue: 'My learning' })}",
  },
  {
    occurrenceId: 'O0488',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'learning:loadingYourLearning',
    seam: "<SkeletonGroup\n          className={styles.loading}\n          label={t('learning:loadingYourLearning', { defaultValue: 'Loading your learning' })}",
  },
  {
    occurrenceId: 'O0489',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'navigation:myLearning',
    seam: "if (enrollments.isError) {\n    const failure = learningFailure(enrollments.error);\n    return (\n      <article className={styles.state}>\n        <h1 tabIndex={-1} ref={headingRef}>\n          {t('navigation:myLearning', { defaultValue: 'My learning' })}",
  },
  {
    occurrenceId: 'O0490',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'learning:noCoursesEnrolledYet',
    seam: "{t('learning:noCoursesEnrolledYet', {\n                defaultValue:\n                  'You haven’t enrolled in any courses yet. Browse the catalog and choose your first course.',\n              })}",
  },
  {
    occurrenceId: 'O0491',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'learning:browseCourses',
    seam: "<Link className={styles.primaryAction} to=\"/\">\n              {t('learning:browseCourses', { defaultValue: 'Browse courses' })}",
  },
  {
    occurrenceId: 'O0492',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'learning:enrollmentSummary',
    seam: '<p className={styles.summary} aria-live="polite">\n            {t(\'learning:enrollmentSummary\', {',
  },
  {
    occurrenceId: 'O0493',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'learning:openCourse',
    seam: "<Link className={styles.workspaceAction} to={`/learning/enrollments/${enrollment.id}`}>\n              {t('learning:openCourse', { defaultValue: 'Open course' })}",
  },
  {
    occurrenceId: 'O0494',
    owner: 'src/widgets/course-chat/CourseChatPanel.tsx',
    key: 'ai:thinking',
    seam: "<span className={styles.typingLabel}>\n          {t('ai:thinking', { defaultValue: 'Thinking…' })}",
  },
  {
    occurrenceId: 'O0495',
    owner: 'src/widgets/course-chat/CourseChatPanel.tsx',
    key: 'ai:couldntGenerateResponse',
    seam: "<p className={styles.responseErrorCopy}>\n        {t('ai:couldntGenerateResponse', { defaultValue: 'Couldn’t generate a response.' })}",
  },
  {
    occurrenceId: 'O0496',
    owner: 'src/pages/catalog-page/CatalogPage.tsx',
    key: 'catalog:browseCoursesCraftedByIndustry',
    seam: "{t('catalog:browseCoursesCraftedByIndustry', {\n              defaultValue:\n                'Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.',\n            })}",
  },
  {
    occurrenceId: 'O0497',
    owner: 'src/pages/cart-page/CartPage.tsx',
    key: 'cart:browseCourses',
    seam: "if (failure.action.kind === 'catalog')\n    return (\n      <Link className={styles.catalogLink} to=\"/\">\n        {t('cart:browseCourses', { defaultValue: 'Browse courses' })}",
  },
  {
    occurrenceId: 'O0498',
    owner: 'src/pages/cart-page/CartPage.tsx',
    key: 'cart:browseCourses',
    seam: "<Link className={styles.catalogLink} to=\"/\">\n          {t('cart:browseCourses', { defaultValue: 'Browse courses' })}",
  },
  {
    occurrenceId: 'O0499',
    owner: 'src/pages/catalog-page/course-card-presentation.ts',
    key: 'catalog:priceUnavailable',
    seam: 'if (!DECIMAL_PRICE.test(price) || !CURRENCY_CODE.test(currency)) return priceUnavailable();',
  },
  {
    occurrenceId: 'O0500',
    owner: 'src/pages/catalog-page/course-card-presentation.ts',
    key: 'catalog:priceUnavailable',
    seam: '} catch {\n    return priceUnavailable();',
  },
  {
    occurrenceId: 'O0501',
    owner: 'src/pages/course-detail-page/CourseActionPanel.tsx',
    key: 'course:courseAction',
    seam: "<aside\n      className={styles.actionPanel}\n      aria-label={t('course:courseAction', { defaultValue: 'Course action' })}",
  },
  {
    occurrenceId: 'O0502',
    owner: 'src/pages/learning-list-page/LearningListPage.tsx',
    key: 'routes:tryAgain',
    seam: "<Button\n          onClick={() => {\n            retryList();\n          }}\n        >\n          {t('routes:tryAgain', { defaultValue: 'Try again' })}",
  },
];

const D05_SOURCE_TO_CORPUS: readonly D05SourceOccurrence[] = [
  {
    occurrenceId: 'O0512',
    owner: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx',
    key: 'catalog:priceRange',
    seam: "{t('catalog:priceRange', { defaultValue: 'Price range' })}",
  },
  {
    occurrenceId: 'O0513',
    owner: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx',
    key: 'catalog:priceLabel',
    seam: "{t('catalog:priceLabel', { defaultValue: 'Price:' })}",
  },
  {
    occurrenceId: 'O0514',
    owner: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx',
    key: 'catalog:price',
    seam: "<VisuallyHidden> {t('catalog:price', { defaultValue: 'price' })}</VisuallyHidden>",
  },
  {
    occurrenceId: 'O0515',
    owner: 'src/widgets/catalog-filter-bar/CatalogFilterBar.tsx',
    key: 'catalog:price',
    seam: "<VisuallyHidden> {t('catalog:price', { defaultValue: 'price' })}</VisuallyHidden>",
  },
];

describe('MLUX-004 namespace runtime', () => {
  it('uses canonical namespace separators in every task-added lookup seam', () => {
    const dotLookup = /t\(\s*['"](?:catalog|course|cart|learning|common|navigation|routes)\./;
    const affected = TASK_ADDED_LOOKUP_OWNERS.flatMap((owner) => {
      const source = readFileSync(new URL(`../../../${owner}`, import.meta.url), 'utf8');
      return dotLookup.test(source) ? [owner] : [];
    });

    expect(affected).toEqual([]);
  });

  it('binds every D04 residual source seam to a recorded DRAFT-12 occurrence', () => {
    const occurrenceIds = new Set(
      MLUX_004_DRAFT17_PROJECTION.flatMap(({ occurrences }) => occurrences.map(({ id }) => id)),
    );

    expect(D04_SOURCE_TO_CORPUS).toHaveLength(16);
    for (const { owner, key, occurrenceId, seam } of D04_SOURCE_TO_CORPUS) {
      const source = readFileSync(new URL(`../../../${owner}`, import.meta.url), 'utf8');
      expect(source, `${occurrenceId} must retain its concrete ${key} source seam`).toContain(seam);
      expect(occurrenceIds, `${key} must be in the independent corpus`).toContain(occurrenceId);
    }
  });

  it('binds every D05 Catalog price seam to a recorded DRAFT-17 occurrence', () => {
    const occurrenceIds = new Set(
      MLUX_004_DRAFT17_PROJECTION.flatMap(({ occurrences }) => occurrences.map(({ id }) => id)),
    );
    expect(D05_SOURCE_TO_CORPUS).toHaveLength(4);
    for (const { owner, key, occurrenceId, seam } of D05_SOURCE_TO_CORPUS) {
      const source = readFileSync(new URL(`../../../${owner}`, import.meta.url), 'utf8');
      expect(source, `${occurrenceId} must retain its concrete ${key} source seam`).toContain(seam);
      expect(occurrenceIds, `${key} must be in the independent corpus`).toContain(occurrenceId);
    }
  });

  it('declares and renders the exact locale-aware C0350 placeholder contract', () => {
    const enrollmentSummary = MLUX_004_RUNTIME_MAPPING.find(
      ({ unitId }) => unitId === 'MLUX-C0350',
    );
    expect(enrollmentSummary).toBeDefined();
    if (!enrollmentSummary) return;

    expect([...enrollmentSummary.variables].sort()).toEqual(['page', 'pages', 'suffix', 'total']);
    expect(enrollmentSummary.placeholdersByLocale).toEqual({
      en: ['page', 'pages', 'suffix', 'total'],
      ru: ['page', 'pages', 'total'],
      uz: ['page', 'pages', 'total'],
    });

    const runtime = createLocaleRuntime('en');
    for (const locale of ['en', 'ru', 'uz'] as const) {
      const template = String(runtime.getResource(locale, 'learning', 'enrollmentSummary'));
      expect(placeholderNames(template), locale).toEqual(
        enrollmentSummary.placeholdersByLocale?.[locale],
      );
    }

    expect(
      runtime.t('learning:enrollmentSummary', {
        lng: 'en',
        total: 1,
        suffix: '',
        page: 1,
        pages: 1,
      }),
    ).toBe('1 enrollment · Page 1 of 1');
    expect(
      runtime.t('learning:enrollmentSummary', {
        lng: 'en',
        total: 2,
        suffix: 's',
        page: 1,
        pages: 2,
      }),
    ).toBe('2 enrollments · Page 1 of 2');
    expect(
      runtime.t('learning:enrollmentSummary', {
        lng: 'ru',
        total: 2,
        suffix: 's',
        page: 1,
        pages: 2,
      }),
    ).toBe('Записей на курсы: 2 · Страница 1 из 2');
    expect(
      runtime.t('learning:enrollmentSummary', {
        lng: 'uz',
        total: 2,
        suffix: 's',
        page: 1,
        pages: 2,
      }),
    ).toBe('Kurslarga yozilishlar: 2 · 1-sahifa, jami 2 ta');
  });

  for (const locale of ['ru', 'uz'] as const) {
    it(`resolves every affected namespace to ${locale} visible and accessible copy without fallbacks`, () => {
      const runtime = createLocaleRuntime(locale);

      for (const lookup of LOCALIZED_LOOKUPS) {
        const value = runtime.t(lookup.key, {
          defaultValue: lookup.english,
          ...('variables' in lookup ? lookup.variables : {}),
        });
        expect(value, lookup.key).not.toBe(lookup.english);
        expect(value, lookup.key).not.toBe(lookup.key);
        expect(value, lookup.key).not.toContain('Translation unavailable');
      }
    });

    it(`uses the exact D05 ${locale} fieldset, visible-label, and input-suffix resources`, () => {
      const runtime = createLocaleRuntime(locale);
      for (const [key, expected] of Object.entries(D05_LOCALIZED_PRICE_NAMES[locale])) {
        expect(runtime.t(key)).toBe(expected);
      }
    });
  }
});
