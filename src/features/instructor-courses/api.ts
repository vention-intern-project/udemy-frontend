import type { Course, CourseDto, CourseListDto } from '@entities/course';
import { decodeCourseListDto, mapCourseDto } from '@entities/course';
import {
  mapEnrollmentStatusDto,
  type CourseEnrollmentDto,
  type EnrollmentStatusDto,
  type StudentSummaryDto,
} from '@entities/enrollment';
import { requestOperation, type SessionContextValue } from '@features/auth-session';
import {
  readBoolean,
  readNonNegativeInteger,
  readPositiveInteger,
  readRecord,
  readString,
} from '@shared/api';

const ROSTER_PAGE_SIZE = 20;
export const INSTRUCTOR_COURSE_PAGE_SIZE = 20;

export interface InstructorCourseCollectionItem {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly lessonCount: number;
}

export interface InstructorCourseCollection {
  readonly items: readonly InstructorCourseCollectionItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pages: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

export interface CourseEnrollmentStudent {
  id: number;
  name: string;
  surname: string;
  email: string;
}

export interface CourseEnrollment {
  id: number;
  userId: number;
  courseId: number;
  status: EnrollmentStatusDto;
  createdAt: string;
  updatedAt: string;
  student: CourseEnrollmentStudent;
}

export interface CourseEnrollmentList {
  items: readonly CourseEnrollment[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateCourseInput {
  readonly title: string;
}

export function decodeInstructorCourseCollection(
  value: unknown,
  expectedPage?: number,
): InstructorCourseCollection {
  const response: CourseListDto = decodeCourseListDto(value);
  if (
    response.page_size !== INSTRUCTOR_COURSE_PAGE_SIZE ||
    (expectedPage !== undefined && response.page !== expectedPage)
  ) {
    throw new TypeError('Invalid instructor course cursor');
  }
  const expectedPages = response.total === 0 ? 0 : Math.ceil(response.total / response.page_size);
  const remainingItems = Math.max(0, response.total - (response.page - 1) * response.page_size);
  if (
    response.pages !== expectedPages ||
    response.page > Math.max(1, response.pages) ||
    response.items.length !== Math.min(response.page_size, remainingItems) ||
    response.has_next !== response.page < response.pages ||
    response.has_previous !== response.page > 1
  ) {
    throw new TypeError('Invalid instructor course pagination');
  }
  const ids = new Set<number>();
  const items = response.items.map((item): InstructorCourseCollectionItem => {
    if (ids.has(item.id)) throw new TypeError('Invalid instructor course identity');
    ids.add(item.id);
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      lessonCount: item.lessons.length,
    };
  });
  return {
    items,
    page: response.page,
    pageSize: response.page_size,
    total: response.total,
    pages: response.pages,
    hasNext: response.has_next,
    hasPrevious: response.has_previous,
  };
}

function decodeCourse(value: unknown): CourseDto {
  const record = readRecord(value, 'course');
  return {
    id: readPositiveInteger(record.id, 'course id'),
    instructor_id: readPositiveInteger(record.instructor_id, 'course instructor id'),
    title: readString(record.title, 'course title'),
    description:
      record.description === null ? null : readString(record.description, 'course description'),
    price: readString(record.price, 'course price'),
    currency: readString(record.currency, 'course currency'),
    published_at:
      record.published_at === null ? null : readString(record.published_at, 'course published_at'),
    created_at: readString(record.created_at, 'course created_at'),
    updated_at: readString(record.updated_at, 'course updated_at'),
  };
}

function decodeStudent(value: unknown): StudentSummaryDto {
  const user = readRecord(value, 'course enrollment user');
  return {
    id: readPositiveInteger(user.id, 'student id'),
    name: readString(user.name, 'student name'),
    surname: readString(user.surname, 'student surname'),
    email: readString(user.email, 'student email'),
  };
}

function decodeCourseEnrollment(value: unknown, courseId: number): CourseEnrollmentDto {
  const item = readRecord(value, 'course enrollment');
  const itemCourseId = readPositiveInteger(item.course_id, 'course enrollment course id');
  if (itemCourseId !== courseId) throw new TypeError('Invalid course enrollment course identity');
  const status = mapEnrollmentStatusDto(item.status);
  const userId = readPositiveInteger(item.user_id, 'enrollment user id');
  const user = decodeStudent(item.user);
  if (userId !== user.id) throw new TypeError('Invalid course enrollment learner identity');
  return {
    id: readPositiveInteger(item.id, 'enrollment id'),
    user_id: userId,
    course_id: itemCourseId,
    status,
    created_at: readString(item.created_at, 'enrollment created_at'),
    updated_at: readString(item.updated_at, 'enrollment updated_at'),
    user,
  };
}

function mapCourseEnrollment(dto: CourseEnrollmentDto): CourseEnrollment {
  return {
    id: dto.id,
    userId: dto.user_id,
    courseId: dto.course_id,
    status: dto.status,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    student: { ...dto.user },
  };
}

export function decodeCourseEnrollmentList(
  value: unknown,
  courseId: number,
  expectedPage?: number,
): CourseEnrollmentList {
  const response = readRecord(value, 'course enrollments');
  if (!Array.isArray(response.items)) throw new TypeError('Invalid course enrollments');
  const page = readPositiveInteger(response.page, 'enrollment page');
  const pageSize = readPositiveInteger(response.page_size, 'enrollment page size');
  const total = readNonNegativeInteger(response.total, 'enrollment total');
  const pages = readNonNegativeInteger(response.pages, 'enrollment pages');
  const hasNext = readBoolean(response.has_next, 'enrollment has_next');
  const hasPrevious = readBoolean(response.has_previous, 'enrollment has_previous');
  if (pageSize !== ROSTER_PAGE_SIZE || (expectedPage !== undefined && page !== expectedPage)) {
    throw new TypeError('Invalid enrollment cursor');
  }
  const ids = new Set<number>();
  const learnerIds = new Set<number>();
  const items = response.items.map((item) => {
    const dto = decodeCourseEnrollment(item, courseId);
    if (ids.has(dto.id)) throw new TypeError('Invalid course enrollment identity');
    if (learnerIds.has(dto.user_id))
      throw new TypeError('Invalid course enrollment learner identity');
    ids.add(dto.id);
    learnerIds.add(dto.user_id);
    return mapCourseEnrollment(dto);
  });
  const expectedPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const remainingItems = Math.max(0, total - (page - 1) * pageSize);
  const itemLimit = Math.min(pageSize, remainingItems);
  if (
    pages !== expectedPages ||
    page > Math.max(1, pages) ||
    items.length > itemLimit ||
    hasNext !== page < pages ||
    hasPrevious !== page > 1
  ) {
    throw new TypeError('Invalid enrollment pagination');
  }
  return { items, page, pageSize, total, pages, hasNext, hasPrevious };
}

function createCourseAttemptKey(body: CreateCourseInput): string {
  return `course:create:${body.title}`;
}

export async function requestCreateCourse(
  session: SessionContextValue,
  body: CreateCourseInput,
): Promise<Course> {
  const response = await requestOperation<CourseDto, CreateCourseInput>(session, 'API-009', {
    path: '/courses',
    body,
    dedupeKey: createCourseAttemptKey(body),
    decode: decodeCourse,
  });
  return mapCourseDto(response);
}

export function requestCourseEnrollments(
  session: SessionContextValue,
  courseId: number,
  page: number,
  signal: AbortSignal,
): Promise<CourseEnrollmentList> {
  return requestOperation<CourseEnrollmentList>(session, 'API-013', {
    path: `/courses/${courseId}/enrollments`,
    query: { page, page_size: ROSTER_PAGE_SIZE },
    signal,
    decode: (value) => decodeCourseEnrollmentList(value, courseId, page),
  });
}

export function requestInstructorCourses(
  session: SessionContextValue,
  page: number,
  signal: AbortSignal,
): Promise<InstructorCourseCollection> {
  return requestOperation<InstructorCourseCollection>(session, 'API-035', {
    path: '/courses/my',
    query: { page, page_size: INSTRUCTOR_COURSE_PAGE_SIZE },
    signal,
    decode: (value) => decodeInstructorCourseCollection(value, page),
  });
}
