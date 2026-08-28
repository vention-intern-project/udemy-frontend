// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CourseReviews } from '@features/course-reviews';
import { useCourseReviews } from '@features/course-reviews/useCourseReviews';
import { localeRuntime } from '@shared/locale';

vi.mock('@features/course-reviews/useCourseReviews', () => ({ useCourseReviews: vi.fn() }));

const mockUseCourseReviews = vi.mocked(useCourseReviews);

interface ReviewPanelQueryState {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly data?: {
    readonly items: readonly {
      readonly id: number;
      readonly rating: number | null;
      readonly comment: string | null;
    }[];
    readonly page: number;
    readonly pages: number;
    readonly has_next: boolean;
    readonly has_previous: boolean;
  };
  refetch: () => Promise<unknown>;
}

function reviewState(list: ReviewPanelQueryState) {
  return {
    list,
    current: { isSuccess: false },
    page: 1,
    setPage: vi.fn(),
    hasOwnedReview: false,
    noOwnedReview: false,
    ready: false,
    create: { mutate: vi.fn(), isPending: false, error: null },
    update: { mutate: vi.fn(), isPending: false, error: null },
    remove: { mutate: vi.fn(), isPending: false, error: null },
  } as unknown as ReturnType<typeof useCourseReviews>;
}

function renderReviews() {
  return render(
    <I18nextProvider i18n={localeRuntime}>
      <CourseReviews courseId={7} />
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourseReviews', () => {
  it('renders public review content while current-user ownership is unresolved', () => {
    mockUseCourseReviews.mockReturnValue(
      reviewState({
        isPending: false,
        isError: false,
        data: {
          items: [{ id: 11, rating: 5, comment: 'Clear and useful.' }],
          page: 1,
          pages: 1,
          has_next: false,
          has_previous: false,
        },
        refetch: vi.fn(),
      }),
    );

    renderReviews();

    expect(screen.getByRole('heading', { level: 2, name: 'Reviews' })).toBeTruthy();
    expect(screen.getByText('Clear and useful.')).toBeTruthy();
    expect(screen.getByText('5/5')).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 3, name: 'Write a review' })).toBeNull();
  });

  it('keeps public empty and error states available without an owned-review result', () => {
    mockUseCourseReviews.mockReturnValue(
      reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
    );
    const { rerender } = renderReviews();
    expect(screen.getByText('No reviews yet.')).toBeTruthy();

    mockUseCourseReviews.mockReturnValue(
      reviewState({ isPending: false, isError: true, refetch: vi.fn() }),
    );
    rerender(
      <I18nextProvider i18n={localeRuntime}>
        <CourseReviews courseId={7} />
      </I18nextProvider>,
    );
    expect(screen.getByText('Reviews could not be loaded.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reviews' })).toBeTruthy();
  });

  it('hydrates the edit form from the owned review and resets it when ownership becomes absent', () => {
    const update = { mutate: vi.fn(), isPending: false, error: null };
    mockUseCourseReviews.mockReturnValue({
      ...reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
      current: { isSuccess: true, data: { rating: 4, comment: 'Useful examples.' } },
      hasOwnedReview: true,
      ready: true,
      update,
    } as unknown as ReturnType<typeof useCourseReviews>);
    const { rerender } = renderReviews();

    expect((screen.getByLabelText('Rating') as HTMLSelectElement).value).toBe('4');
    expect((screen.getByLabelText('Comment (optional)') as HTMLTextAreaElement).value).toBe(
      'Useful examples.',
    );
    fireEvent.submit(screen.getByRole('button', { name: 'Save review' }).closest('form')!);
    expect(update.mutate).toHaveBeenCalledWith({ rating: 4, comment: 'Useful examples.' });

    mockUseCourseReviews.mockReturnValue({
      ...reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
      noOwnedReview: true,
      ready: true,
    } as unknown as ReturnType<typeof useCourseReviews>);
    rerender(
      <I18nextProvider i18n={localeRuntime}>
        <CourseReviews courseId={7} />
      </I18nextProvider>,
    );
    expect((screen.getByLabelText('Rating') as HTMLSelectElement).value).toBe('5');
    expect((screen.getByLabelText('Comment (optional)') as HTMLTextAreaElement).value).toBe('');
  });

  it('uses canonical safe recovery copy instead of a raw create failure', () => {
    const rawCreateError = 'raw-create-server-detail@example.invalid';
    mockUseCourseReviews.mockReturnValue({
      ...reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
      noOwnedReview: true,
      create: { mutate: vi.fn(), isPending: false, error: new Error(rawCreateError) },
    } as unknown as ReturnType<typeof useCourseReviews>);

    renderReviews();

    expect(screen.getByText('Unable to complete action')).toBeTruthy();
    expect(screen.getByText('Please try again.')).toBeTruthy();
    expect(screen.queryByText(rawCreateError)).toBeNull();
  });

  it('uses canonical safe recovery copy instead of a raw update failure', () => {
    const rawUpdateError = 'raw-update-server-detail@example.invalid';
    mockUseCourseReviews.mockReturnValue({
      ...reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
      current: { isSuccess: true, data: { rating: 5, comment: 'Existing review.' } },
      hasOwnedReview: true,
      update: { mutate: vi.fn(), isPending: false, error: new Error(rawUpdateError) },
    } as unknown as ReturnType<typeof useCourseReviews>);

    renderReviews();

    expect(screen.getByText('Unable to complete action')).toBeTruthy();
    expect(screen.getByText('Please try again.')).toBeTruthy();
    expect(screen.queryByText(rawUpdateError)).toBeNull();
  });

  it('uses canonical safe recovery copy instead of a raw delete failure', () => {
    const rawDeleteError = 'raw-delete-server-detail@example.invalid';
    mockUseCourseReviews.mockReturnValue({
      ...reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
      current: { isSuccess: true, data: { rating: 5, comment: 'Existing review.' } },
      hasOwnedReview: true,
      remove: { mutate: vi.fn(), isPending: false, error: new Error(rawDeleteError) },
    } as unknown as ReturnType<typeof useCourseReviews>);

    renderReviews();
    fireEvent.click(screen.getByRole('button', { name: 'Delete review' }));

    expect(screen.getByText('Unable to complete action')).toBeTruthy();
    expect(screen.getByText('Please try again.')).toBeTruthy();
    expect(screen.queryByText(rawDeleteError)).toBeNull();
  });

  it('focuses the reviews heading only after a successful delete closes the dialog', () => {
    const remove = {
      mutate: vi.fn((_: undefined, options: { onSuccess?: () => void }) => options.onSuccess?.()),
      isPending: false,
      error: null,
    };
    mockUseCourseReviews.mockReturnValue({
      ...reviewState({
        isPending: false,
        isError: false,
        data: { items: [], page: 1, pages: 0, has_next: false, has_previous: false },
        refetch: vi.fn(),
      }),
      current: { isSuccess: true, data: { rating: 5, comment: 'Existing review.' } },
      hasOwnedReview: true,
      remove,
    } as unknown as ReturnType<typeof useCourseReviews>);

    renderReviews();
    fireEvent.click(screen.getByRole('button', { name: 'Delete review' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete review' }),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Reviews' }));
  });
});
