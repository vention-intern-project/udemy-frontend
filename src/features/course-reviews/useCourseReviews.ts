import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { queryKeys } from '@entities/api';
import type { ReviewCreateDto, ReviewUpdateDto } from '@entities/review';
import { useSession } from '@features/auth-session';
import { ApiError, type SessionCacheEpoch } from '@shared/api';

import {
  createCourseReview,
  deleteCourseReview,
  normalizeReviewPage,
  requestCourseReviews,
  requestCurrentReview,
  updateCourseReview,
} from './api';

function reviewListQueryKey(courseId: number, page: number) {
  return queryKeys.public.operation('API-037', `course:${courseId}:reviews:${page}`);
}
function currentReviewQueryKey(subject: SessionCacheEpoch, courseId: number) {
  return queryKeys.private.operation(subject, 'API-038', `course:${courseId}:review`);
}

export function useCourseReviews(courseId: number) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const normalizedPage = normalizeReviewPage(page);
  const subject = session.state.status === 'authenticated' ? (session.cacheEpoch ?? null) : null;
  const current = useQuery({
    queryKey: subject
      ? currentReviewQueryKey(subject, courseId)
      : ['disabled', 'current-review', courseId],
    queryFn: ({ signal }) => requestCurrentReview(session, courseId, signal),
    enabled: subject !== null,
    retry: false,
  });
  const hasOwnedReview = current.isSuccess;
  const noOwnedReview = current.error instanceof ApiError && current.error.status === 404;
  const list = useQuery({
    queryKey: reviewListQueryKey(courseId, normalizedPage),
    queryFn: ({ signal }) => requestCourseReviews(session, courseId, normalizedPage, signal),
  });
  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.public.operation(
        'API-037',
        `course:${courseId}:reviews:${normalizedPage}`,
      ),
      exact: true,
    });
    if (subject)
      await queryClient.invalidateQueries({
        queryKey: currentReviewQueryKey(subject, courseId),
        exact: true,
      });
  };
  const create = useMutation({
    mutationFn: (body: ReviewCreateDto) => createCourseReview(session, courseId, body),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (body: ReviewUpdateDto) => updateCourseReview(session, courseId, body),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => deleteCourseReview(session, courseId),
    onSuccess: invalidate,
  });
  return {
    list,
    current,
    page: normalizedPage,
    setPage,
    hasOwnedReview,
    noOwnedReview,
    ready: hasOwnedReview || noOwnedReview,
    create,
    update,
    remove,
  };
}
