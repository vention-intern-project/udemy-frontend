import { describe, expect, it, vi } from 'vitest';

import {
  createCourseReview,
  deleteCourseReview,
  normalizeReviewPage,
  requestCourseRatingSummary,
  requestCourseReviews,
  requestCurrentReview,
  updateCourseReview,
} from '@features/course-reviews';
import type { SessionContextValue } from '@features/auth-session';
import type { ApiRequestOptions } from '@shared/api';

const review = {
  id: 11,
  course_id: 7,
  user_id: 9,
  rating: 5,
  comment: 'Great',
  created_at: '2026-08-28T09:00:00Z',
  updated_at: '2026-08-28T09:00:00Z',
};
const list = {
  items: [review],
  page: 1,
  page_size: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
};

function sessionFor(response: unknown) {
  const request = vi.fn(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
    if (!options.decode) throw new Error('Expected decoder');
    return options.decode(response);
  });
  return {
    request,
    session: {
      requestPublic: request,
      requestOptional: request,
      requestRequired: request,
    } as unknown as SessionContextValue,
  };
}

function reviewPage(page: number, total: number, ratingOffset = 0) {
  const pages = Math.ceil(total / 20);
  const start = (page - 1) * 20;
  const itemCount = Math.min(20, total - start);
  return {
    items: Array.from({ length: itemCount }, (_, index) => ({
      ...review,
      id: start + index + 1,
      rating: ((start + index + ratingOffset) % 5) + 1,
    })),
    page,
    page_size: 20,
    total,
    pages,
    has_next: page < pages,
    has_previous: page > 1,
  };
}

function sessionForPages(pages: ReadonlyMap<number, unknown>) {
  const request = vi.fn(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
    if (!options.decode) throw new Error('Expected decoder');
    const page = options.query?.page;
    if (typeof page !== 'number') throw new Error('Expected page query');
    const response = pages.get(page);
    if (!response) throw new Error(`Missing page ${page}`);
    return options.decode(response);
  });
  return {
    request,
    session: {
      requestPublic: request,
      requestOptional: request,
      requestRequired: request,
    } as unknown as SessionContextValue,
  };
}

describe('course review API', () => {
  it('normalizes invalid pages and always requests fixed page size twenty', async () => {
    const requests = sessionFor(list);
    await expect(
      requestCourseReviews(requests.session, 7, -2, new AbortController().signal),
    ).resolves.toEqual(list);
    expect(requests.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/courses/7/reviews', query: { page: 1, page_size: 20 } }),
    );
    expect(normalizeReviewPage(2.5)).toBe(1);
  });

  it('accepts validated server pagination metadata instead of requiring an echoed request cursor', async () => {
    const response = { ...list, page: 2, total: 21, pages: 2, has_previous: true };
    const requests = sessionFor(response);
    await expect(
      requestCourseReviews(requests.session, 7, 1, new AbortController().signal),
    ).resolves.toEqual(response);
  });

  it('uses required review operations for owned review and mutations', async () => {
    const current = sessionFor(review);
    await expect(
      requestCurrentReview(current.session, 7, new AbortController().signal),
    ).resolves.toEqual(review);
    const created = sessionFor(review);
    await expect(
      createCourseReview(created.session, 7, { rating: 5, comment: null }),
    ).resolves.toEqual(review);
    const updated = sessionFor(review);
    await expect(
      updateCourseReview(updated.session, 7, { rating: 4, comment: 'Updated' }),
    ).resolves.toEqual(review);
    const deleted = sessionFor({ message: 'Review deleted' });
    await expect(deleteCourseReview(deleted.session, 7)).resolves.toEqual({
      message: 'Review deleted',
    });
    expect(created.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/courses/7/reviews',
        body: { rating: 5, comment: null },
        dedupeKey: 'course:7:review:create',
      }),
    );
    expect(updated.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/courses/7/reviews',
        body: { rating: 4, comment: 'Updated' },
        dedupeKey: 'course:7:review:update',
      }),
    );
  });

  it('collects all seven pages before deriving a 124-review rating summary', async () => {
    const pages = new Map<number, unknown>();
    for (let page = 1; page <= 7; page += 1) pages.set(page, reviewPage(page, 124));
    const requests = sessionForPages(pages);

    const summary = await requestCourseRatingSummary(
      requests.session,
      7,
      new AbortController().signal,
    );

    const ratings = Array.from({ length: 124 }, (_, index) => (index % 5) + 1);
    expect(summary).toEqual({
      reviewCount: 124,
      averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
    });
    expect(requests.request).toHaveBeenCalledTimes(7);
    expect(requests.request.mock.calls.map(([options]) => options.query?.page)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('rejects the complete rating summary when one review belongs to another course', async () => {
    const wrongCoursePage = reviewPage(1, 2);
    wrongCoursePage.items[1] = { ...wrongCoursePage.items[1], course_id: 8 };
    const requests = sessionForPages(new Map([[1, wrongCoursePage]]));

    await expect(
      requestCourseRatingSummary(requests.session, 7, new AbortController().signal),
    ).rejects.toThrow('Server returned an invalid review response');
    expect(requests.request).toHaveBeenCalledTimes(1);
  });

  it('returns a proven empty summary but rejects duplicate or over-bound collections', async () => {
    const empty = sessionForPages(new Map([[1, reviewPage(1, 0)]]));
    await expect(
      requestCourseRatingSummary(empty.session, 7, new AbortController().signal),
    ).resolves.toEqual({ reviewCount: 0, averageRating: null });

    const duplicateSecondPage = reviewPage(2, 21);
    duplicateSecondPage.items[0] = { ...duplicateSecondPage.items[0], id: 1 };
    const duplicate = sessionForPages(
      new Map([
        [1, reviewPage(1, 21)],
        [2, duplicateSecondPage],
      ]),
    );
    await expect(
      requestCourseRatingSummary(duplicate.session, 7, new AbortController().signal),
    ).rejects.toThrow('Invalid course rating summary pagination');

    const overBound = sessionForPages(new Map([[1, reviewPage(1, 201)]]));
    await expect(
      requestCourseRatingSummary(overBound.session, 7, new AbortController().signal),
    ).rejects.toThrow('Invalid course rating summary pagination');
  });
});
