import type {
  CourseDetailDto, CourseDto, CourseListDto, CourseListItemDto, LessonBriefDto,
  LessonDetailDto, LessonDto, LessonListDto, LessonTypeDto,
} from './dto';
import type {
  CatalogCourse, CatalogCourseList, Course, CourseDetail, Lesson, LessonOutline,
  LessonOutlineItem, LessonType,
} from './model';
import {
  readBoolean, readNonNegativeInteger, readNullableString, readPositiveInteger, readRecord, readString,
} from '@shared/api';

const LESSON_TYPE_BY_DTO = {
  video: 'video',
  text: 'text',
  pdf: 'pdf',
} as const satisfies Readonly<Record<LessonTypeDto, LessonType>>;

export function mapLessonTypeDto(value: unknown): LessonType {
  switch (value) {
    case 'video':
      return LESSON_TYPE_BY_DTO.video;
    case 'text':
      return LESSON_TYPE_BY_DTO.text;
    case 'pdf':
      return LESSON_TYPE_BY_DTO.pdf;
    default:
      throw new TypeError(`Unsupported lesson type: ${String(value)}`);
  }
}

export function mapCourseDto(dto: CourseDto): Course {
  return {
    id: dto.id,
    instructorId: dto.instructor_id,
    title: dto.title,
    description: dto.description,
    price: dto.price,
    currency: dto.currency,
    publishedAt: dto.published_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapLessonDto(dto: LessonDto): Lesson {
  return {
    id: dto.id,
    courseId: dto.course_id,
    title: dto.title,
    lessonType: mapLessonTypeDto(dto.lesson_type),
    downloadUrl: dto.download_url,
    description: dto.description,
    isPublished: dto.is_published,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

function decodeLessonBrief(value: unknown): LessonBriefDto {
  const item = readRecord(value, 'lesson');
  return { id: readPositiveInteger(item.id, 'lesson id'), title: readString(item.title, 'lesson title') };
}

function decodeCourseListItem(value: unknown): CourseListItemDto {
  const item = readRecord(value, 'item');
  const instructor = readRecord(item.instructor, 'instructor');
  if (!Array.isArray(item.lessons)) throw new TypeError('Invalid course list lessons');
  return {
    id: readPositiveInteger(item.id, 'item id'),
    title: readString(item.title, 'item title'),
    description: readNullableString(item.description, 'item description'),
    price: readString(item.price, 'item price'),
    currency: readString(item.currency, 'item currency'),
    published_at: readNullableString(item.published_at, 'item published_at'),
    instructor: {
      id: readPositiveInteger(instructor.id, 'instructor id'),
      name: readString(instructor.name, 'instructor name'),
      surname: readString(instructor.surname, 'instructor surname'),
    },
    lessons: item.lessons.map(decodeLessonBrief),
  };
}

function decodeLessonDetail(value: unknown): LessonDetailDto {
  const item = readRecord(value, 'lesson detail');
  return {
    id: readPositiveInteger(item.id, 'lesson id'),
    title: readString(item.title, 'lesson title'),
    lesson_type: mapLessonTypeDto(item.lesson_type),
    download_url: readNullableString(item.download_url, 'lesson download_url'),
    description: readNullableString(item.description, 'lesson description'),
    is_published: readBoolean(item.is_published, 'lesson is_published'),
    created_at: readString(item.created_at, 'lesson created_at'),
    updated_at: readString(item.updated_at, 'lesson updated_at'),
  };
}

export function decodeCourseDetailDto(value: unknown): CourseDetailDto {
  const response = readRecord(value, 'detail response');
  const instructor = readRecord(response.instructor, 'detail instructor');
  if (!Array.isArray(response.lessons)) throw new TypeError('Invalid course detail lessons');
  return {
    id: readPositiveInteger(response.id, 'detail id'),
    title: readString(response.title, 'detail title'),
    description: readNullableString(response.description, 'detail description'),
    price: readString(response.price, 'detail price'),
    currency: readString(response.currency, 'detail currency'),
    published_at: readNullableString(response.published_at, 'detail published_at'),
    created_at: readString(response.created_at, 'detail created_at'),
    updated_at: readString(response.updated_at, 'detail updated_at'),
    instructor: {
      id: readPositiveInteger(instructor.id, 'instructor id'),
      name: readString(instructor.name, 'instructor name'),
      surname: readString(instructor.surname, 'instructor surname'),
    },
    lessons: response.lessons.map(decodeLessonDetail),
  };
}

export function decodeLessonListDto(value: unknown): LessonListDto {
  const response = readRecord(value, 'lesson list response');
  if (!Array.isArray(response.items)) throw new TypeError('Invalid lesson list items');
  const page = readPositiveInteger(response.page, 'lesson page');
  const pageSize = readPositiveInteger(response.page_size, 'lesson page_size');
  const total = readNonNegativeInteger(response.total, 'lesson total');
  const pages = readNonNegativeInteger(response.pages, 'lesson pages');
  const hasNext = readBoolean(response.has_next, 'lesson has_next');
  const hasPrevious = readBoolean(response.has_previous, 'lesson has_previous');
  const items = response.items.map(decodeLessonDetail);
  const expectedPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const remainingItems = Math.max(0, total - ((page - 1) * pageSize));
  const itemLimit = Math.min(pageSize, remainingItems);
  if (pages !== expectedPages
    || page > Math.max(1, pages)
    || items.length > itemLimit
    || hasNext !== (page < pages)
    || hasPrevious !== (page > 1)) {
    throw new TypeError('Invalid lesson list pagination consistency');
  }
  return { items, page, page_size: pageSize, total, pages, has_next: hasNext, has_previous: hasPrevious };
}

function mapLessonOutlineItem(dto: LessonDetailDto): LessonOutlineItem {
  return {
    id: dto.id,
    title: dto.title,
    lessonType: mapLessonTypeDto(dto.lesson_type),
    description: dto.description,
    isPublished: dto.is_published,
  };
}

export function mapCourseDetailDto(dto: CourseDetailDto): CourseDetail {
  return {
    id: dto.id,
    instructorId: dto.instructor.id,
    instructorName: `${dto.instructor.name} ${dto.instructor.surname}`.trim(),
    title: dto.title,
    description: dto.description,
    price: dto.price,
    currency: dto.currency,
    publishedAt: dto.published_at,
    lessons: dto.lessons.map(mapLessonOutlineItem),
  };
}

export function mapLessonListDto(dto: LessonListDto): LessonOutline {
  return { items: dto.items.map(mapLessonOutlineItem), total: dto.total };
}

export function decodeCourseListDto(value: unknown): CourseListDto {
  const response = readRecord(value, 'response');
  if (!Array.isArray(response.items)) throw new TypeError('Invalid course list items');
  const total = readNonNegativeInteger(response.total, 'total');
  const pages = readNonNegativeInteger(response.pages, 'pages');
  const items = response.items.map(decodeCourseListItem);
  const hasNext = readBoolean(response.has_next, 'has_next');
  const hasPrevious = readBoolean(response.has_previous, 'has_previous');

  if ((total === 0 && (pages !== 0 || items.length !== 0 || hasNext || hasPrevious)) || (total > 0 && pages === 0)) {
    throw new TypeError('Invalid course list pagination consistency');
  }

  return {
    items,
    page: readPositiveInteger(response.page, 'page'),
    page_size: readPositiveInteger(response.page_size, 'page_size'),
    total,
    pages,
    has_next: hasNext,
    has_previous: hasPrevious,
  };
}

export function mapCourseListDto(dto: CourseListDto): CatalogCourseList {
  return {
    items: dto.items.map((item): CatalogCourse => ({
      id: item.id,
      title: item.title,
      description: item.description,
      instructorName: `${item.instructor.name} ${item.instructor.surname}`.trim(),
      price: item.price,
      currency: item.currency,
      totalLessonCount: item.lessons.length,
      isPublished: item.published_at !== null,
    })),
    page: dto.page,
    pageSize: dto.page_size,
    total: dto.total,
    pages: dto.pages,
    hasNext: dto.has_next,
    hasPrevious: dto.has_previous,
  };
}
