import { decodeCartItemDto } from '@entities/cart';
import {
  decodeCourseDetailDto,
  decodeLessonListDto,
  mapCourseDetailDto,
  mapLessonListDto,
  type CourseDetail,
  type LessonDetailDto,
  type LessonListDto,
  type LessonOutline,
} from '@entities/course';
import {
  decodeEnrollmentDto,
  decodeEnrollmentListDto,
  mapEnrollmentListDto,
  type Enrollment,
  type EnrollmentList,
} from '@entities/enrollment';
import type { SessionContextValue } from '@features/auth-session';
import { requestOperation } from '@features/auth-session';
import { ApiError, collectPaginationPages } from '@shared/api';

const PAGE_SIZE = 100;
const MAX_AGGREGATE_PAGES = 10;

function invalidSuccessResponse(cause: TypeError): ApiError {
  return new ApiError({
    kind: 'invalid_response',
    status: 200,
    message: 'Server returned an invalid success response',
    cause,
  });
}

export async function requestCourseDetail(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<CourseDetail> {
  return requestOperation<CourseDetail>(session, 'API-010', {
    path: `/courses/${courseId}`,
    signal,
    decode: (value) => mapCourseDetailDto(decodeCourseDetailDto(value)),
  });
}

export async function requestLessonOutline(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<LessonOutline> {
  let expectedPages: number | null = null;
  let expectedTotal: number | null = null;
  let expectedPageSize: number | null = null;
  const lessonIds = new Set<number>();
  let collection;
  try {
    collection = await collectPaginationPages<LessonDetailDto>({
      context: 'lesson aggregate',
      signal,
      maximumPages: MAX_AGGREGATE_PAGES,
      identifyItem: (item) => item.id,
      fetchPage: async (requestedPage) => {
        const list = await requestOperation<LessonListDto>(session, 'API-014', {
          path: `/courses/${courseId}/lessons`,
          query: { page: requestedPage, size: PAGE_SIZE },
          signal,
          decode: (value) => {
            const decoded = decodeLessonListDto(value);
            if (decoded.page !== requestedPage || decoded.page_size !== PAGE_SIZE) {
              throw new TypeError('Invalid lesson aggregate cursor');
            }
            if (decoded.pages > MAX_AGGREGATE_PAGES)
              throw new TypeError('Invalid lesson aggregate pagination');
            if (expectedPages === null) {
              expectedPages = decoded.pages;
              expectedTotal = decoded.total;
              expectedPageSize = decoded.page_size;
            } else if (
              decoded.pages !== expectedPages ||
              decoded.total !== expectedTotal ||
              decoded.page_size !== expectedPageSize
            ) {
              throw new TypeError('Invalid lesson aggregate metadata');
            }
            for (const item of decoded.items) {
              if (lessonIds.has(item.id)) throw new TypeError('Invalid lesson aggregate identity');
              lessonIds.add(item.id);
            }
            return decoded;
          },
        });
        return {
          items: list.items,
          page: list.page,
          pageSize: list.page_size,
          total: list.total,
          pages: list.pages,
          hasNext: list.has_next,
          hasPrevious: list.has_previous,
        };
      },
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Invalid lesson aggregate total') {
      throw invalidSuccessResponse(new TypeError('Invalid lesson outline aggregate'));
    }
    throw error;
  }
  const result = mapLessonListDto({
    items: [...collection.items],
    page: 1,
    page_size: collection.pageSize,
    total: collection.total,
    pages: collection.pages,
    has_next: false,
    has_previous: false,
  });
  return { items: result.items, total: result.total };
}

export async function requestEnrollments(
  session: SessionContextValue,
  signal: AbortSignal,
): Promise<EnrollmentList> {
  let collection;
  let expectedPages: number | null = null;
  let expectedTotal: number | null = null;
  let expectedPageSize: number | null = null;
  const enrollmentIds = new Set<number>();
  const courseIds = new Set<number>();
  try {
    collection = await collectPaginationPages<Enrollment>({
      context: 'enrollment aggregate',
      signal,
      maximumPages: MAX_AGGREGATE_PAGES,
      identifyItem: (item) => item.id,
      fetchPage: async (requestedPage) => {
        const list = await requestOperation<EnrollmentList>(session, 'API-021', {
          path: '/enrollments/my',
          query: { page: requestedPage, page_size: PAGE_SIZE },
          signal,
          decode: (value) => {
            const decoded = mapEnrollmentListDto(decodeEnrollmentListDto(value));
            if (decoded.page !== requestedPage || decoded.pageSize !== PAGE_SIZE) {
              throw new TypeError('Invalid enrollment aggregate cursor');
            }
            if (decoded.pages > MAX_AGGREGATE_PAGES)
              throw new TypeError('Invalid enrollment aggregate pagination');
            if (expectedPages === null) {
              expectedPages = decoded.pages;
              expectedTotal = decoded.total;
              expectedPageSize = decoded.pageSize;
            } else if (
              decoded.pages !== expectedPages ||
              decoded.total !== expectedTotal ||
              decoded.pageSize !== expectedPageSize
            ) {
              throw new TypeError('Invalid enrollment aggregate metadata');
            }
            for (const item of decoded.items) {
              if (enrollmentIds.has(item.id) || courseIds.has(item.courseId)) {
                throw new TypeError('Invalid enrollment aggregate identity');
              }
              enrollmentIds.add(item.id);
              courseIds.add(item.courseId);
            }
            return decoded;
          },
        });
        return {
          items: list.items,
          page: list.page,
          pageSize: list.pageSize,
          total: list.total,
          pages: list.pages,
          hasNext: list.hasNext,
          hasPrevious: list.hasPrevious,
        };
      },
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Invalid enrollment aggregate total') {
      throw invalidSuccessResponse(new TypeError('Invalid enrollment aggregate'));
    }
    throw error;
  }
  return {
    items: collection.items,
    page: 1,
    pageSize: collection.pageSize,
    pages: collection.pages,
    total: collection.total,
    hasNext: false,
    hasPrevious: false,
  };
}

export async function enrollFree(session: SessionContextValue, courseId: number): Promise<void> {
  await requestOperation<unknown>(session, 'API-020', {
    path: '/enrollments',
    body: { course_id: courseId },
    dedupeKey: `course:${courseId}:enroll`,
    decode: decodeEnrollmentDto,
  });
}

export async function addCourseToCart(
  session: SessionContextValue,
  courseId: number,
): Promise<void> {
  await requestOperation<unknown>(session, 'API-005', {
    path: '/cart/items',
    body: { course_id: courseId },
    dedupeKey: `course:${courseId}:cart`,
    decode: decodeCartItemDto,
  });
}
