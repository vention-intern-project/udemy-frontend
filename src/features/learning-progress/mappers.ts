import { readBoolean, readNonNegativeInteger, readNullableString, readPositiveInteger, readRecord } from '@shared/api';
import type { CourseProgressDto, LessonProgressDto } from '@entities/enrollment';

import type { CourseProgress, LessonCompletionState, LessonProgress } from './model';

function readPercentage(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError('Invalid course progress percentage');
  }
  return value;
}

export function decodeLessonProgressDto(value: unknown): LessonProgressDto {
  const response = readRecord(value, 'lesson progress response');
  return {
    lesson_id: readPositiveInteger(response.lesson_id, 'lesson progress lesson id'),
    completed: readBoolean(response.completed, 'lesson progress completed'),
    completed_at: readNullableString(response.completed_at, 'lesson progress completed_at'),
  };
}

export function decodeCourseProgressDto(value: unknown): CourseProgressDto {
  const response = readRecord(value, 'course progress response');
  const completedLessons = readNonNegativeInteger(response.completed_lessons, 'course progress completed lessons');
  const totalLessons = readNonNegativeInteger(response.total_lessons, 'course progress total lessons');
  const progressPercentage = readPercentage(response.progress_percentage);
  if (completedLessons > totalLessons) throw new TypeError('Invalid course progress counts');
  const expectedPercentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 10_000) / 100;
  if (Math.abs(progressPercentage - expectedPercentage) > 0.001) {
    throw new TypeError('Invalid course progress percentage');
  }
  return {
    course_id: readPositiveInteger(response.course_id, 'course progress course id'),
    completed_lessons: completedLessons,
    total_lessons: totalLessons,
    progress_percentage: progressPercentage,
  };
}

export function mapLessonProgressDto(dto: LessonProgressDto): LessonProgress {
  return { lessonId: dto.lesson_id, completed: dto.completed, completedAt: dto.completed_at };
}

export function mapCourseProgressDto(dto: CourseProgressDto): CourseProgress {
  return {
    courseId: dto.course_id,
    completedLessons: dto.completed_lessons,
    totalLessons: dto.total_lessons,
    progressPercentage: dto.progress_percentage,
  };
}

export function lessonCompletionLabel(state: LessonCompletionState): string {
  if (state.status === 'unknown') return 'Completion status unavailable';
  return state.completed ? 'Completed' : 'Not completed';
}
