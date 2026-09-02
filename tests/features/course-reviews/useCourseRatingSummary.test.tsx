// @vitest-environment jsdom

import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren, RefObject } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../../src/app/query';
import { SessionProvider, type AccessTokenStore } from '../../../src/features/auth-session';
import {
  courseRatingSummaryQueryKey,
  useCourseRatingSummary,
  useCourseReviews,
} from '../../../src/features/course-reviews';
import type { ApiClient, ApiRequestOptions } from '../../../src/shared/api';

const review = {
  id: 11,
  course_id: 7,
  user_id: 9,
  rating: 5,
  comment: null,
  created_at: '2026-08-31T00:00:00Z',
  updated_at: '2026-08-31T00:00:00Z',
};
const reviewList = {
  items: [review],
  page: 1,
  page_size: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
};

function tokenStore(): AccessTokenStore {
  return { get: () => null, set: () => true, clear: () => undefined };
}

function createHarness(request: ApiClient['request']) {
  const queryClient = createAppQueryClient();
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={{ request }} tokenStore={tokenStore()}>
          {children}
        </SessionProvider>
      </QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('course rating summary query', () => {
  it('uses the immediate fallback when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const request = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (!options.decode) throw new Error('Expected decoder');
        return options.decode(reviewList);
      },
    ) as ApiClient['request'];
    const harness = createHarness(request);
    const cardRef = { current: null } as RefObject<HTMLElement>;

    const { result } = renderHook(() => useCourseRatingSummary(7, cardRef), {
      wrapper: harness.Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual({ reviewCount: 1, averageRating: 5 }));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/courses/7/reviews', query: { page: 1, page_size: 20 } }),
    );
    expect(courseRatingSummaryQueryKey(7)).toEqual([
      'public',
      'API-037',
      'course:7:reviews:summary',
    ]);
  });

  it('invalidates the matching summary after a successful review mutation', async () => {
    const request = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (!options.decode) throw new Error('Expected decoder');
        return options.decode(options.body ? review : reviewList);
      },
    ) as ApiClient['request'];
    const harness = createHarness(request);
    const invalidate = vi.spyOn(harness.queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCourseReviews(7), { wrapper: harness.Wrapper });

    await waitFor(() => expect(result.current.list.data?.items).toHaveLength(1));
    await act(async () => {
      await result.current.create.mutateAsync({ rating: 5, comment: null });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: courseRatingSummaryQueryKey(7),
      exact: true,
    });
  });
});
