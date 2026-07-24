import type {
  CourseDto, CourseListDto, CourseListItemDto, LessonBriefDto, LessonDto, LessonTypeDto,
} from './dto';
import type { CatalogCourse, CatalogCourseList, Course, Lesson, LessonType } from './model';

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

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid course list ${context}`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, context: string): string {
  if (typeof value !== 'string') throw new TypeError(`Invalid course list ${context}`);
  return value;
}

function nullableString(value: unknown, context: string): string | null {
  return value === null ? null : string(value, context);
}

function positiveInteger(value: unknown, context: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError(`Invalid course list ${context}`);
  }
  return value as number;
}

function nonNegativeInteger(value: unknown, context: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`Invalid course list ${context}`);
  }
  return value as number;
}

function boolean(value: unknown, context: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`Invalid course list ${context}`);
  return value;
}

function decodeLessonBrief(value: unknown): LessonBriefDto {
  const item = record(value, 'lesson');
  return { id: positiveInteger(item.id, 'lesson id'), title: string(item.title, 'lesson title') };
}

function decodeCourseListItem(value: unknown): CourseListItemDto {
  const item = record(value, 'item');
  const instructor = record(item.instructor, 'instructor');
  if (!Array.isArray(item.lessons)) throw new TypeError('Invalid course list lessons');
  return {
    id: positiveInteger(item.id, 'item id'),
    title: string(item.title, 'item title'),
    description: nullableString(item.description, 'item description'),
    price: string(item.price, 'item price'),
    currency: string(item.currency, 'item currency'),
    published_at: nullableString(item.published_at, 'item published_at'),
    instructor: {
      id: positiveInteger(instructor.id, 'instructor id'),
      name: string(instructor.name, 'instructor name'),
      surname: string(instructor.surname, 'instructor surname'),
    },
    lessons: item.lessons.map(decodeLessonBrief),
  };
}

export function decodeCourseListDto(value: unknown): CourseListDto {
  const response = record(value, 'response');
  if (!Array.isArray(response.items)) throw new TypeError('Invalid course list items');
  const total = nonNegativeInteger(response.total, 'total');
  const pages = nonNegativeInteger(response.pages, 'pages');
  const items = response.items.map(decodeCourseListItem);
  const hasNext = boolean(response.has_next, 'has_next');
  const hasPrevious = boolean(response.has_previous, 'has_previous');

  if ((total === 0 && (pages !== 0 || items.length !== 0 || hasNext || hasPrevious)) || (total > 0 && pages === 0)) {
    throw new TypeError('Invalid course list pagination consistency');
  }

  return {
    items,
    page: positiveInteger(response.page, 'page'),
    page_size: positiveInteger(response.page_size, 'page_size'),
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
