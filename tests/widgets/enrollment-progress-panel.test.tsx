// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LessonOutline } from '../../src/entities/course';
import type { CourseProgress, LessonCompletionState } from '../../src/features/learning-progress';
import { LocaleProvider, localeRuntime, type Locale } from '../../src/shared/locale';
import { EnrollmentProgressPanel } from '../../src/widgets/enrollment-progress-panel';

vi.mock('../../src/features/media-access', () => ({
  LessonMediaAccess: () => null,
}));

const outline: LessonOutline = { total: 2, items: [] };

const emptyOutline: LessonOutline = { total: 0, items: [] };

function outlineWithLessonType(
  lessonType: LessonOutline['items'][number]['lessonType'],
): LessonOutline {
  return {
    total: 1,
    items: [
      {
        id: 42,
        title: 'Localized lesson type',
        description: null,
        lessonType,
        isPublished: true,
        mediaLocator: null,
      },
    ],
  };
}

function completionState(): LessonCompletionState {
  return { status: 'known', completed: false };
}

function renderPanel(
  locale: Locale,
  progress: CourseProgress | undefined,
  currentOutline = outline,
) {
  return render(
    <LocaleProvider initialLocale={locale}>
      <EnrollmentProgressPanel
        workspaceIdentity="student:7"
        progress={progress}
        progressError={null}
        progressLoading={false}
        outline={currentOutline}
        outlineError={null}
        outlineLoading={false}
        completionState={completionState}
        isPending={() => false}
        onSetCompletion={vi.fn()}
        onRetry={vi.fn()}
      />
    </LocaleProvider>,
  );
}

afterEach(async () => {
  cleanup();
  await localeRuntime.changeLanguage('en');
});

describe('EnrollmentProgressPanel DRAFT-21 lesson-count noun localization', () => {
  it.each([
    ['en', 'video', 'Video'],
    ['ru', 'video', 'Видео'],
    ['ru', 'text', 'Текст'],
    ['uz', 'text', 'Matn'],
    ['uz', 'pdf', 'PDF'],
  ] as const)(
    'localizes the visible %s lesson-type presentation for %s',
    (locale, lessonType, expected) => {
      renderPanel(locale, undefined, outlineWithLessonType(lessonType));

      expect(
        screen.getByText(
          (_, node) =>
            node?.tagName === 'SPAN' && node.textContent?.startsWith(`${expected} `) === true,
        ),
      ).toBeTruthy();
    },
  );

  it.each([
    [
      'en',
      1,
      '0 of 1 lesson completed',
      '0 of 1 lesson completed, 0%',
      '2 available now · 0 lessons coming soon',
    ],
    [
      'ru',
      5,
      'Завершено: 0 из 5 уроков',
      'Завершено: 0 из 5 уроков, 0%',
      '2 доступно сейчас · 3 урока скоро будет доступно',
    ],
    [
      'uz',
      2,
      '2 ta darsdan 0 tasi yakunlandi',
      '2 ta darsdan 0 tasi yakunlandi, 0%',
      '2 hozir mavjud · 0 dars tez orada mavjud',
    ],
  ] as const)(
    'keeps numeric progress in its existing template and localizes only the noun in %s',
    (locale, totalLessons, visibleSummary, accessibleSummary, availability) => {
      renderPanel(locale, {
        courseId: 7,
        completedLessons: 0,
        totalLessons,
        progressPercentage: 0,
      });

      expect(screen.getByText(visibleSummary)).toBeTruthy();
      expect(screen.getByRole('progressbar', { name: accessibleSummary })).toBeTruthy();
      expect(screen.getByText(availability)).toBeTruthy();
    },
  );

  it.each([
    [
      'ru',
      'Загрузка прогресса обучения',
      'Прогресс обучения недоступен',
      'Для этого курса нет данных об уроках.',
    ],
    [
      'uz',
      'Ta’lim jarayoni yuklanmoqda',
      'Ta’lim jarayoni mavjud emas',
      'Bu kurs uchun dars ma’lumotlari mavjud emas.',
    ],
  ] as const)(
    'keeps loading, error, and empty states accessible in %s',
    (locale, loading, error, empty) => {
      const { rerender } = render(
        <LocaleProvider initialLocale={locale}>
          <EnrollmentProgressPanel
            workspaceIdentity="student:7"
            progress={undefined}
            progressError={null}
            progressLoading={true}
            outline={undefined}
            outlineError={null}
            outlineLoading={true}
            completionState={completionState}
            isPending={() => false}
            onSetCompletion={vi.fn()}
            onRetry={vi.fn()}
          />
        </LocaleProvider>,
      );
      expect(screen.getByRole('status', { name: loading })).toBeTruthy();

      rerender(
        <LocaleProvider initialLocale={locale}>
          <EnrollmentProgressPanel
            workspaceIdentity="student:7"
            progress={undefined}
            progressError={new Error('private backend detail')}
            progressLoading={false}
            outline={undefined}
            outlineError={new Error('private backend detail')}
            outlineLoading={false}
            completionState={completionState}
            isPending={() => false}
            onSetCompletion={vi.fn()}
            onRetry={vi.fn()}
          />
        </LocaleProvider>,
      );
      expect(screen.getByRole('alert').textContent).toContain(error);
      expect(screen.queryByText('private backend detail')).toBeNull();

      rerender(
        <LocaleProvider initialLocale={locale}>
          <EnrollmentProgressPanel
            workspaceIdentity="student:7"
            progress={undefined}
            progressError={null}
            progressLoading={false}
            outline={emptyOutline}
            outlineError={null}
            outlineLoading={false}
            completionState={completionState}
            isPending={() => false}
            onSetCompletion={vi.fn()}
            onRetry={vi.fn()}
          />
        </LocaleProvider>,
      );
      expect(screen.getByText(empty)).toBeTruthy();
    },
  );
});
