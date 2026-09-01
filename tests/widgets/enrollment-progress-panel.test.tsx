// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  isPublished = true,
): LessonOutline {
  return {
    total: 1,
    items: [
      {
        id: 42,
        title: 'Localized lesson type',
        description: null,
        lessonType,
        isPublished,
        mediaLocator: null,
        subtitleLocator: null,
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
  currentCompletionState: () => LessonCompletionState = completionState,
  onSetCompletion = vi.fn(),
  isPending: (lessonId: number) => boolean = () => false,
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
        completionState={currentCompletionState}
        isPending={isPending}
        onSetCompletion={onSetCompletion}
        onRetry={vi.fn()}
      />
    </LocaleProvider>,
  );
}

afterEach(async () => {
  cleanup();
  await localeRuntime.changeLanguage('en');
});

describe('EnrollmentProgressPanel lesson completion activation', () => {
  const completedLessonState = (): LessonCompletionState => ({ status: 'known', completed: true });
  const lessonOutline = outlineWithLessonType('text');

  it.each([
    ['en', 'Complete', 'Complete lesson'],
    ['ru', 'Завершить', 'Завершить урок'],
    ['uz', 'Yakunlash', 'Darsni yakunlash'],
  ] as const)(
    'uses compact visible complete copy and the complete accessible name in %s',
    (locale, visibleLabel, accessibleName) => {
      renderPanel(locale, undefined, lessonOutline);

      const complete = screen.getByRole('button', { name: accessibleName });
      expect(complete.textContent).toBe(visibleLabel);
    },
  );

  it.each([
    ['en', 'Undo', 'Undo completion'],
    ['ru', 'Отменить', 'Отменить завершение'],
    ['uz', 'Bekor qilish', 'Yakunlashni bekor qilish'],
  ] as const)(
    'uses compact visible undo copy and the complete accessible name in %s',
    (locale, visibleLabel, accessibleName) => {
      renderPanel(locale, undefined, lessonOutline, completedLessonState);

      const undo = screen.getByRole('button', { name: accessibleName });
      expect(undo.textContent).toBe(visibleLabel);
    },
  );

  it.each(['pointer', 'Enter', 'Space'] as const)(
    'requests the existing incomplete transition from Undo completion by %s',
    async (activation) => {
      const onSetCompletion = vi.fn();
      const user = userEvent.setup();
      renderPanel('en', undefined, lessonOutline, completedLessonState, onSetCompletion);

      const undo = screen.getByRole('button', { name: 'Undo completion' });
      undo.focus();
      if (activation === 'pointer') await user.click(undo);
      if (activation === 'Enter') await user.keyboard('{Enter}');
      if (activation === 'Space') await user.keyboard(' ');

      expect(onSetCompletion).toHaveBeenCalledTimes(1);
      expect(onSetCompletion).toHaveBeenCalledWith(42, false);
    },
  );

  it('keeps a pending Undo completion focusable but does not delegate duplicate input', async () => {
    const onSetCompletion = vi.fn();
    const user = userEvent.setup();
    renderPanel('en', undefined, lessonOutline, completedLessonState, onSetCompletion, () => true);

    const undo = screen.getByRole('button', { name: 'Undo completion' });
    undo.focus();
    await user.click(undo);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(undo.getAttribute('aria-disabled')).toBe('true');
    expect(undo.getAttribute('aria-busy')).toBe('true');
    expect((undo as HTMLButtonElement).disabled).toBe(false);
    expect(document.activeElement).toBe(undo);
    expect(onSetCompletion).not.toHaveBeenCalled();
  });
});

describe('EnrollmentProgressPanel DRAFT-21 lesson-count noun localization', () => {
  it.each([
    ['en', { status: 'known', completed: true }, 'Completed'],
    ['ru', { status: 'known', completed: false }, 'Не завершено'],
    ['uz', { status: 'unknown' }, 'Yakunlanmagan'],
  ] as const)('localizes the visible lesson completion state in %s', (locale, state, expected) => {
    renderPanel(locale, undefined, outlineWithLessonType('video'), () => state);

    expect(screen.getByText(expected, { exact: true })).toBeTruthy();
  });

  it.each([
    ['en', 'video', 'Video lesson'],
    ['en', 'text', 'Text lesson'],
    ['ru', 'video', 'Видеоурок'],
    ['ru', 'text', 'Текстовый урок'],
    ['ru', 'pdf', 'PDF-урок'],
    ['uz', 'text', 'Matnli dars'],
    ['uz', 'pdf', 'PDF dars'],
  ] as const)(
    'localizes the visible %s lesson-type presentation for %s',
    (locale, lessonType, expected) => {
      renderPanel(locale, undefined, outlineWithLessonType(lessonType));

      expect(screen.getByText(expected, { exact: true })).toBeTruthy();
      expect(
        screen.queryByText(/Listed metadata|Перечисленные данные|Ro‘yxatdagi ma’lumotlar/),
      ).toBeNull();
    },
  );

  it('uses a learner-facing availability phrase for an unpublished lesson', () => {
    renderPanel('ru', undefined, outlineWithLessonType('text', false));

    expect(screen.getByText('Текстовый урок · Скоро будет доступно', { exact: true })).toBeTruthy();
    expect(screen.queryByText('Данные черновика')).toBeNull();
  });

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
      'Сейчас доступно: 2 · скоро будет доступно: 3 урока',
    ],
    [
      'uz',
      2,
      '2 ta darsdan 0 tasi yakunlandi',
      '2 ta darsdan 0 tasi yakunlandi, 0%',
      'Hozir 2 ta dars mavjud · 0 dars tez orada mavjud',
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
      'O‘zlashtirish holati mavjud emas',
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
