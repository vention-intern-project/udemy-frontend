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

export type LessonProgressFeedbackVisibility = 'visible' | 'exiting';

export interface LessonProgressFeedback {
  readonly tone: LessonProgressFeedbackTone;
  readonly message: string;
  readonly visibility: LessonProgressFeedbackVisibility;
}

export interface LearningFeedbackMotionPreferences {
  readonly reducedMotion: boolean;
}

export const DEFAULT_LEARNING_FEEDBACK_MOTION_PREFERENCES: LearningFeedbackMotionPreferences = {
  reducedMotion: false,
};

export type LessonCompletionState = { status: 'unknown' } | { status: 'known'; completed: boolean };

export interface LessonProgressAttempt {
  subject: SessionCacheEpoch;
  workspaceIdentity: string;
  enrollmentId: number;
  courseId: number;
  lessonId: number;
  targetCompleted: boolean;
  identity: string;
}
import type { SessionCacheEpoch } from '@shared/api';
