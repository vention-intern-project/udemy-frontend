import type { CourseDto, LessonDto, LessonTypeDto } from './dto';
import type { Course, Lesson, LessonType } from './model';

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
