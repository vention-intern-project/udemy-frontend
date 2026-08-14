import {
  decodeEnrollmentDto,
  decodeEnrollmentListDto,
  mapEnrollmentDto,
  mapEnrollmentListDto,
  type Enrollment,
  type EnrollmentList,
} from '@entities/enrollment';
import {
  decodeLessonListDto,
  mapLessonListDto,
  type LessonListDto,
  type LessonOutline,
  type LessonOutlineItem,
} from '@entities/course';
import { requestOperation, type SessionContextValue } from '@features/auth-session';
import { collectPaginationPages } from '@shared/api';

import {
  decodeCourseProgressDto,
  decodeLessonProgressDto,
  mapCourseProgressDto,
  mapLessonProgressDto,
} from './mappers';
import type { CourseProgress, LessonProgress } from './model';

const LEARNING_PAGE_SIZE = 20;
const OUTLINE_PAGE_SIZE = 100;
const MAX_OUTLINE_PAGES = 10;

export async function requestLearningEnrollments(
  session: SessionContextValue,
  page: number,
  signal: AbortSignal,
): Promise<EnrollmentList> {
  return requestOperation(session, 'API-021', {
    path: '/enrollments/my',
    query: { page, page_size: LEARNING_PAGE_SIZE },
    signal,
    decode: (value) => mapEnrollmentListDto(decodeEnrollmentListDto(value)),
  });
}

export async function requestLearningEnrollment(
  session: SessionContextValue,
  enrollmentId: number,
  signal: AbortSignal,
): Promise<Enrollment> {
  return requestOperation(session, 'API-022', {
    path: `/enrollments/${enrollmentId}`,
    signal,
    decode: (value) => {
      const enrollment = mapEnrollmentDto(decodeEnrollmentDto(value));
      if (enrollment.id !== enrollmentId)
        throw new TypeError('Invalid learning enrollment identity');
      return enrollment;
    },
  });
}

export async function requestCourseProgress(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<CourseProgress> {
  return requestOperation(session, 'API-019', {
    path: `/courses/${courseId}/progress`,
    signal,
    decode: (value) => {
      const progress = mapCourseProgressDto(decodeCourseProgressDto(value));
      if (progress.courseId !== courseId) throw new TypeError('Invalid course progress identity');
      return progress;
    },
  });
}

export async function requestLessonOutline(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<LessonOutline> {
  const collection = await collectPaginationPages<LessonOutlineItem>({
    context: 'lesson outline',
    signal,
    maximumPages: MAX_OUTLINE_PAGES,
    identifyItem: (item) => item.id,
    fetchPage: async (requestedPage) => {
      const dto = await requestOperation<LessonListDto>(session, 'API-014', {
        path: `/courses/${courseId}/lessons`,
        query: { page: requestedPage, size: OUTLINE_PAGE_SIZE },
        signal,
        decode: decodeLessonListDto,
      });
      if (dto.page !== requestedPage || dto.page_size !== OUTLINE_PAGE_SIZE)
        throw new TypeError('Invalid lesson outline cursor');
      if (dto.pages > MAX_OUTLINE_PAGES)
        throw new TypeError('Lesson outline exceeds the supported workspace size');
      const result = mapLessonListDto(dto);
      return {
        items: result.items,
        page: dto.page,
        pageSize: dto.page_size,
        total: result.total,
        pages: dto.pages,
        hasNext: dto.has_next,
        hasPrevious: dto.has_previous,
      };
    },
  });
  return { items: collection.items, total: collection.total };
}

export async function setLessonCompletion(
  session: SessionContextValue,
  courseId: number,
  lessonId: number,
  completed: boolean,
): Promise<LessonProgress> {
  return requestOperation(session, completed ? 'API-017' : 'API-018', {
    path: `/courses/${courseId}/lessons/${lessonId}/${completed ? 'complete' : 'incomplete'}`,
    dedupeKey: `learning:${courseId}:${lessonId}:${completed ? 'complete' : 'incomplete'}`,
    decode: (value) => mapLessonProgressDto(decodeLessonProgressDto(value)),
  });
}
