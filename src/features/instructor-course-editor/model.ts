import type { LessonType } from '@entities/course';

export interface InstructorEditorLesson {
  readonly id: number;
  readonly courseId: number;
  readonly title: string;
  readonly lessonType: LessonType;
  readonly description: string | null;
  readonly isPublished: boolean;
}

export interface InstructorLessonFileUploadAcknowledgement {
  readonly lessonId: number;
  readonly uploadId: string;
  readonly status: 'queued';
  readonly detail: string;
}

export interface InstructorEditorCourse {
  readonly id: number;
  readonly instructorId: number;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly currency: string;
  readonly lessons: readonly InstructorEditorLesson[];
}

export interface UpdateInstructorCourseInput {
  readonly title: string;
  readonly description: string;
  readonly price: string;
  readonly currency: string;
}

export interface CreateInstructorLessonInput {
  readonly title: string;
  readonly lessonType: LessonType;
  readonly description: string;
  readonly isPublished: boolean;
}

export interface UpdateInstructorLessonInput {
  readonly title: string;
  readonly lessonType: LessonType;
  readonly description: string;
  readonly isPublished: boolean;
}
