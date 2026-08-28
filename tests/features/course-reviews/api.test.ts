import { describe, expect, it, vi } from 'vitest';

import {
  createCourseReview,
  deleteCourseReview,
  normalizeReviewPage,
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
});
