import type { EnrollmentDto, EnrollmentListDto, EnrollmentStatusDto } from './dto';
import type { Enrollment, EnrollmentList, EnrollmentStatus } from './model';
import {
  decodePaginationEnvelope,
  readNullableString,
  readPositiveInteger,
  readRecord,
  readString,
} from '@shared/api';

const PAGINATION_FIELDS = {
  items: 'items',
  page: 'page',
  pageSize: 'page_size',
  total: 'total',
  pages: 'pages',
  hasNext: 'has_next',
  hasPrevious: 'has_previous',
} as const;

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
  const response = decodePaginationEnvelope(value, {
    context: 'enrollment',
    decodeItem: decodeEnrollmentDto,
    fields: PAGINATION_FIELDS,
  });
  return {
    items: [...response.items],
    page: response.page,
    page_size: response.pageSize,
    total: response.total,
    pages: response.pages,
    has_next: response.hasNext,
    has_previous: response.hasPrevious,
  };
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
