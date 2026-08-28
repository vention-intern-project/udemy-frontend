import type { ReviewCreateDto, ReviewDto, ReviewListDto, ReviewUpdateDto } from '@entities/review';
import { decodeReviewDto, decodeReviewListDto } from '@entities/review';
import { requestOperation, type SessionContextValue } from '@features/auth-session';
import { ApiError } from '@shared/api';

export const REVIEW_PAGE_SIZE = 20 as const;

function invalidReviewResponse(cause: TypeError): ApiError {
  return new ApiError({
    kind: 'invalid_response',
    status: 200,
    message: 'Server returned an invalid review response',
    cause,
  });
}

export function normalizeReviewPage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export async function requestCourseReviews(
  session: SessionContextValue,
  courseId: number,
  page: number,
  signal: AbortSignal,
): Promise<ReviewListDto> {
  const normalizedPage = normalizeReviewPage(page);
  try {
    const result = await requestOperation<ReviewListDto>(session, 'API-037', {
      path: `/courses/${courseId}/reviews`,
      query: { page: normalizedPage, page_size: REVIEW_PAGE_SIZE },
      signal,
      decode: decodeReviewListDto,
    });
    return result;
  } catch (error) {
    if (error instanceof TypeError) throw invalidReviewResponse(error);
    throw error;
  }
}

export function requestCurrentReview(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<ReviewDto> {
  return requestOperation(session, 'API-038', {
    path: `/courses/${courseId}/reviews/me`,
    signal,
    decode: decodeReviewDto,
  });
}

export function createCourseReview(
  session: SessionContextValue,
  courseId: number,
  body: ReviewCreateDto,
): Promise<ReviewDto> {
  return requestOperation(session, 'API-039', {
    path: `/courses/${courseId}/reviews`,
    body,
    dedupeKey: `course:${courseId}:review:create`,
    decode: decodeReviewDto,
  });
}

export function updateCourseReview(
  session: SessionContextValue,
  courseId: number,
  body: ReviewUpdateDto,
): Promise<ReviewDto> {
  return requestOperation(session, 'API-040', {
    path: `/courses/${courseId}/reviews`,
    body,
    dedupeKey: `course:${courseId}:review:update`,
    decode: decodeReviewDto,
  });
}

export function deleteCourseReview(
  session: SessionContextValue,
  courseId: number,
): Promise<{ message: string }> {
  return requestOperation(session, 'API-041', {
    path: `/courses/${courseId}/reviews`,
    dedupeKey: `course:${courseId}:review:delete`,
    decode: (value) => {
      if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value) ||
        (value as { message?: unknown }).message !== 'Review deleted'
      )
        throw new TypeError('Invalid review delete response');
      return { message: 'Review deleted' };
    },
  });
}
