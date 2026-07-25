import {
  decodeCartDto, decodeCartItemDto, mapCartDto, type Cart,
} from '@entities/cart';
import {
  decodeCourseDetailDto, decodeLessonListDto, mapCourseDetailDto, mapLessonListDto,
  type CourseDetail, type LessonListDto, type LessonOutline,
} from '@entities/course';
import {
  decodeEnrollmentDto, decodeEnrollmentListDto, mapEnrollmentListDto, type Enrollment, type EnrollmentList,
} from '@entities/enrollment';
import type { SessionContextValue } from '@features/auth-session';
import { requestOperation } from '@features/auth-session';
import { ApiError } from '@shared/api';

const PAGE_SIZE = 100;

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
  const lists: LessonListDto[] = [];
  const lessonIds = new Set<number>();
  let page = 1;
  let total = 0;
  let pages = 1;
  let pageSize = PAGE_SIZE;
  do {
    const requestedPage = page;
    const list = await requestOperation<LessonListDto>(session, 'API-014', {
      path: `/courses/${courseId}/lessons`, query: { page: requestedPage, size: PAGE_SIZE }, signal,
      decode: (value) => {
        const decoded = decodeLessonListDto(value);
        if (decoded.page !== requestedPage || decoded.page_size !== PAGE_SIZE) {
          throw new TypeError('Invalid lesson aggregate cursor');
        }
        if (requestedPage === 1) {
          pages = decoded.pages;
          total = decoded.total;
          pageSize = decoded.page_size;
        } else if (decoded.pages !== pages || decoded.total !== total || decoded.page_size !== pageSize) {
          throw new TypeError('Invalid lesson aggregate metadata');
        }
        for (const item of decoded.items) {
          if (lessonIds.has(item.id)) throw new TypeError('Invalid lesson aggregate identity');
          lessonIds.add(item.id);
        }
        return decoded;
      },
    });
    lists.push(list);
    page += 1;
  } while (page <= pages);
  const itemCount = lists.reduce((count, list) => count + list.items.length, 0);
  if (itemCount !== total) {
    throw new ApiError({
      kind: 'invalid_response',
      status: 200,
      message: 'Server returned an invalid success response',
      cause: new TypeError('Invalid lesson outline aggregate'),
    });
  }
  return {
    items: lists.flatMap((list) => mapLessonListDto(list).items),
    total,
  };
}

export async function requestCart(session: SessionContextValue, signal: AbortSignal): Promise<Cart> {
  return requestOperation<Cart>(session, 'API-002', {
    path: '/cart', signal, decode: (value) => mapCartDto(decodeCartDto(value)),
  });
}

export async function requestEnrollments(session: SessionContextValue, signal: AbortSignal): Promise<EnrollmentList> {
  const items: Enrollment[] = [];
  const enrollmentIds = new Set<number>();
  const courseIds = new Set<number>();
  let page = 1;
  let pages = 1;
  let total = 0;
  let pageSize = PAGE_SIZE;
  do {
    const requestedPage = page;
    const list = await requestOperation<EnrollmentList>(session, 'API-021', {
      path: '/enrollments/my', query: { page: requestedPage, page_size: PAGE_SIZE }, signal,
      decode: (value) => mapEnrollmentListDto(decodeEnrollmentListDto(value)),
    });
    if (list.page !== requestedPage || list.pageSize !== PAGE_SIZE) {
      throw new TypeError('Invalid enrollment aggregate cursor');
    }
    if (requestedPage === 1) {
      pages = list.pages;
      total = list.total;
      pageSize = list.pageSize;
    } else if (list.pages !== pages || list.total !== total || list.pageSize !== pageSize) {
      throw new TypeError('Invalid enrollment aggregate metadata');
    }
    for (const item of list.items) {
      if (enrollmentIds.has(item.id) || courseIds.has(item.courseId)) {
        throw new TypeError('Invalid enrollment aggregate identity');
      }
      enrollmentIds.add(item.id);
      courseIds.add(item.courseId);
      items.push(item);
    }
    page += 1;
  } while (page <= pages);
  if (items.length !== total) {
    throw new ApiError({
      kind: 'invalid_response',
      status: 200,
      message: 'Server returned an invalid success response',
      cause: new TypeError('Invalid enrollment aggregate'),
    });
  }
  return { items, page: 1, pageSize, pages, total, hasNext: false, hasPrevious: false };
}

export async function enrollFree(session: SessionContextValue, courseId: number): Promise<void> {
  await requestOperation<unknown>(session, 'API-020', {
    path: '/enrollments', body: { course_id: courseId }, dedupeKey: `course:${courseId}:enroll`, decode: decodeEnrollmentDto,
  });
}

export async function addCourseToCart(session: SessionContextValue, courseId: number): Promise<void> {
  await requestOperation<unknown>(session, 'API-005', {
    path: '/cart/items', body: { course_id: courseId }, dedupeKey: `course:${courseId}:cart`, decode: decodeCartItemDto,
  });
}
