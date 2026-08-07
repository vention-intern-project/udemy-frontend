import type { LessonType } from '@entities/course';
import type { SessionContextValue } from '@features/auth-session';
import { requestOperation } from '@features/auth-session';
import { readBoolean, readPositiveInteger, readRecord, readString } from '@shared/api';

import type {
  CreateInstructorLessonInput,
  InstructorEditorCourse,
  InstructorEditorLesson,
  UpdateInstructorCourseInput,
  UpdateInstructorLessonInput,
} from './model';

const LESSON_TYPES = new Set<LessonType>(['video', 'text', 'pdf']);

function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : readString(value, label);
}

function lessonType(value: unknown): LessonType {
  if (typeof value === 'string' && LESSON_TYPES.has(value as LessonType))
    return value as LessonType;
  throw new TypeError('Invalid lesson type');
}

function decodeLesson(value: unknown, expectedCourseId?: number): InstructorEditorLesson {
  const lesson = readRecord(value, 'lesson');
  const courseId = expectedCourseId ?? readPositiveInteger(lesson.course_id, 'lesson course id');
  return {
    id: readPositiveInteger(lesson.id, 'lesson id'),
    courseId,
    title: readString(lesson.title, 'lesson title'),
    lessonType: lessonType(lesson.lesson_type),
    description: nullableString(lesson.description, 'lesson description'),
    isPublished: readBoolean(lesson.is_published, 'lesson is_published'),
  };
}

function decodeCourse(value: unknown): InstructorEditorCourse {
  const course = readRecord(value, 'course');
  const instructor = readRecord(course.instructor, 'course instructor');
  if (!Array.isArray(course.lessons)) throw new TypeError('Invalid course lessons');
  const id = readPositiveInteger(course.id, 'course id');
  return {
    id,
    instructorId: readPositiveInteger(instructor.id, 'course instructor id'),
    title: readString(course.title, 'course title'),
    description: nullableString(course.description, 'course description'),
    price: readString(course.price, 'course price'),
    currency: readString(course.currency, 'course currency'),
    lessons: course.lessons.map((item) => decodeLesson(item, id)),
  };
}

function decodeUpdatedCourse(value: unknown): InstructorEditorCourse {
  const course = readRecord(value, 'course');
  return {
    id: readPositiveInteger(course.id, 'course id'),
    instructorId: readPositiveInteger(course.instructor_id, 'course instructor id'),
    title: readString(course.title, 'course title'),
    description: nullableString(course.description, 'course description'),
    price: readString(course.price, 'course price'),
    currency: readString(course.currency, 'course currency'),
    lessons: [],
  };
}

function decodeDeleteMessage(value: unknown): void {
  readString(readRecord(value, 'delete response').message, 'delete message');
}

export function instructorEditorCourseQueryKey(epoch: string | null | undefined, courseId: number) {
  return ['instructor-course-editor', epoch ?? null, 'course', courseId] as const;
}

export function instructorEditorLessonQueryKey(epoch: string | null | undefined, lessonId: number) {
  return ['instructor-course-editor', epoch ?? null, 'lesson', lessonId] as const;
}

export function requestInstructorEditorCourse(
  session: SessionContextValue,
  courseId: number,
  signal: AbortSignal,
): Promise<InstructorEditorCourse> {
  return requestOperation(session, 'API-010', {
    path: `/courses/${courseId}`,
    signal,
    decode: decodeCourse,
  });
}

export function requestInstructorEditorLesson(
  session: SessionContextValue,
  lessonId: number,
  signal: AbortSignal,
): Promise<InstructorEditorLesson> {
  return requestOperation(session, 'API-030', {
    path: `/lessons/${lessonId}`,
    signal,
    decode: decodeLesson,
  });
}

export function updateInstructorCourse(
  session: SessionContextValue,
  courseId: number,
  input: UpdateInstructorCourseInput,
): Promise<InstructorEditorCourse> {
  return requestOperation(session, 'API-011', {
    path: `/courses/${courseId}`,
    body: input,
    dedupeKey: `instructor-course:${courseId}:update`,
    decode: decodeUpdatedCourse,
  });
}

export function deleteInstructorCourse(
  session: SessionContextValue,
  courseId: number,
): Promise<void> {
  return requestOperation(session, 'API-012', {
    path: `/courses/${courseId}`,
    dedupeKey: `instructor-course:${courseId}:delete`,
    decode: decodeDeleteMessage,
  });
}

export function createInstructorLesson(
  session: SessionContextValue,
  courseId: number,
  input: CreateInstructorLessonInput,
): Promise<InstructorEditorLesson> {
  return requestOperation(session, 'API-015', {
    path: `/courses/${courseId}/lessons`,
    body: {
      title: input.title,
      lesson_type: input.lessonType,
      description: input.description,
      is_published: input.isPublished,
    },
    dedupeKey: `instructor-course:${courseId}:create-lesson:${input.title}`,
    decode: (value) => decodeLesson(value, courseId),
  });
}

export function deleteInstructorLesson(
  session: SessionContextValue,
  courseId: number,
  lessonId: number,
): Promise<void> {
  return requestOperation(session, 'API-016', {
    path: `/courses/${courseId}/lessons/${lessonId}`,
    dedupeKey: `instructor-course:${courseId}:lesson:${lessonId}:delete`,
    decode: decodeDeleteMessage,
  });
}

export function updateInstructorLesson(
  session: SessionContextValue,
  lessonId: number,
  input: UpdateInstructorLessonInput,
): Promise<InstructorEditorLesson> {
  return requestOperation(session, 'API-031', {
    path: `/lessons/${lessonId}`,
    body: {
      title: input.title,
      lesson_type: input.lessonType,
      description: input.description,
      is_published: input.isPublished,
    },
    dedupeKey: `instructor-lesson:${lessonId}:update`,
    decode: decodeLesson,
  });
}

export function uploadInstructorLessonFile(
  session: SessionContextValue,
  lessonId: number,
  file: File,
): Promise<InstructorEditorLesson> {
  const body = new FormData();
  body.set('file', file);
  return requestOperation(session, 'API-032', {
    path: `/lessons/${lessonId}/upload-file`,
    body,
    dedupeKey: `instructor-lesson:${lessonId}:upload`,
    decode: decodeLesson,
  });
}
