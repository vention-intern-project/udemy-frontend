import type { EnrollmentDto, EnrollmentListDto, EnrollmentStatusDto } from './dto';
import type { Enrollment, EnrollmentList, EnrollmentStatus } from './model';
import {
  readBoolean, readNonNegativeInteger, readNullableString, readPositiveInteger, readRecord, readString,
} from '@shared/api';

const ENROLLMENT_STATUS_BY_DTO = {
  pending_payment: 'pending_payment',
  active: 'active',
  cancelled: 'cancelled',
} as const satisfies Readonly<Record<EnrollmentStatusDto, EnrollmentStatus>>;

function decodeEnrollmentStatusDto(value: unknown): EnrollmentStatusDto {
  switch (value) {
    case 'pending_payment':
    case 'active':
    case 'cancelled':
      return value;
    default:
      throw new TypeError(`Unsupported enrollment status: ${String(value)}`);
  }
}

export function mapEnrollmentStatusDto(value: unknown): EnrollmentStatus {
  return ENROLLMENT_STATUS_BY_DTO[decodeEnrollmentStatusDto(value)];
}

export function mapEnrollmentDto(dto: EnrollmentDto): Enrollment {
  return {
    id: dto.id,
    userId: dto.user_id,
    courseId: dto.course_id,
    status: mapEnrollmentStatusDto(dto.status),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    course: { ...dto.course },
  };
}

export function decodeEnrollmentDto(value: unknown): EnrollmentDto {
  const item = readRecord(value, 'enrollment item');
  const course = readRecord(item.course, 'enrollment course');
  const courseId = readPositiveInteger(item.course_id, 'enrollment course id');
  const decodedCourse = {
    id: readPositiveInteger(course.id, 'enrollment nested course id'),
    title: readString(course.title, 'enrollment course title'),
    description: readNullableString(course.description, 'enrollment course description'),
    price: readString(course.price, 'enrollment course price'),
    currency: readString(course.currency, 'enrollment course currency'),
  };
  if (decodedCourse.id !== courseId) throw new TypeError('Invalid enrollment course identity');
  return {
    id: readPositiveInteger(item.id, 'enrollment id'),
    user_id: readPositiveInteger(item.user_id, 'enrollment user id'),
    course_id: courseId,
    status: decodeEnrollmentStatusDto(item.status),
    created_at: readString(item.created_at, 'enrollment created_at'),
    updated_at: readString(item.updated_at, 'enrollment updated_at'),
    course: decodedCourse,
  };
}

export function decodeEnrollmentListDto(value: unknown): EnrollmentListDto {
  const response = readRecord(value, 'enrollment response');
  if (!Array.isArray(response.items)) throw new TypeError('Invalid enrollment items');
  const items = response.items.map(decodeEnrollmentDto);
  const page = readPositiveInteger(response.page, 'enrollment page');
  const pages = readNonNegativeInteger(response.pages, 'enrollment pages');
  const total = readNonNegativeInteger(response.total, 'enrollment total');
  const pageSize = readPositiveInteger(response.page_size, 'enrollment page size');
  const hasNext = readBoolean(response.has_next, 'enrollment has_next');
  const hasPrevious = readBoolean(response.has_previous, 'enrollment has_previous');
  const expectedPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const remainingItems = Math.max(0, total - ((page - 1) * pageSize));
  const itemLimit = Math.min(pageSize, remainingItems);
  if (pages !== expectedPages
    || page > Math.max(1, pages)
    || items.length > itemLimit
    || hasNext !== (page < pages) || hasPrevious !== (page > 1)) {
    throw new TypeError('Invalid enrollment pagination');
  }
  return { items, page, page_size: pageSize, total, pages, has_next: hasNext, has_previous: hasPrevious };
}

export function mapEnrollmentListDto(dto: EnrollmentListDto): EnrollmentList {
  return {
    items: dto.items.map(mapEnrollmentDto),
    page: dto.page,
    pageSize: dto.page_size,
    pages: dto.pages,
    total: dto.total,
    hasNext: dto.has_next,
    hasPrevious: dto.has_previous,
  };
}
