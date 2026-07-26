export interface LessonProgress {
  lessonId: number;
  completed: boolean;
  completedAt: string | null;
}

export interface CourseProgress {
  courseId: number;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
}

export type LessonProgressFeedbackTone = 'success' | 'error';

export interface LessonProgressFeedback {
  tone: LessonProgressFeedbackTone;
  message: string;
}

export type LessonCompletionState =
  | { status: 'unknown' }
  | { status: 'known'; completed: boolean };

export interface LessonProgressAttempt {
  subject: string;
  workspaceIdentity: string;
  enrollmentId: number;
  courseId: number;
  lessonId: number;
  targetCompleted: boolean;
  identity: string;
}
