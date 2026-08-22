import type { EnrollmentStatus } from '@entities/enrollment';
import type { SessionContextValue } from '@features/auth-session';
import { ApiError, type SessionCacheEpoch } from '@shared/api';

import type { LessonCompletionState, LessonProgressAttempt } from './model';

export interface LearningFailure {
  readonly titleKey: LearningFailureTitleKey;
  readonly messageKey: LearningFailureMessageKey;
  readonly unavailable: boolean;
}

export type LearningFailureTitleKey =
  | 'cart:signInRequired'
  | 'learning:learningDataUnavailable'
  | 'learning:learningWorkspaceUnavailable';

export type LearningFailureMessageKey =
  | 'common:serverReturnedAnInvalidResponseTryAgain'
  | 'learning:sessionEndedSignInToContinue'
  | 'learning:thisLearningWorkspaceIsUnavailable'
  | 'learning:tryAgainInAMoment';

export interface LessonRowStateScope {
  readonly identity: string;
  readonly states: ReadonlyMap<number, LessonCompletionState>;
}

export interface LessonMutationSnapshot {
  readonly attempt: LessonProgressAttempt;
  readonly previous: LessonCompletionState;
}

export interface MutationUnavailableScope {
  readonly identity: string;
}

export type LessonMutationFailureKind = 'aborted' | 'forbidden' | 'uncertain' | 'rejected';

export function lessonMutationFailureKind(error: unknown): LessonMutationFailureKind {
  if (error instanceof ApiError) {
    if (error.kind === 'aborted') return 'aborted';
    if (error.status === 403) return 'forbidden';
    if (error.kind === 'invalid_response' || error.kind === 'offline') return 'uncertain';
  }
  if (error instanceof TypeError) return 'uncertain';
  return 'rejected';
}

export function learningEpoch(session: SessionContextValue): SessionCacheEpoch | null {
  return session.state.status === 'authenticated' && session.state.user.role === 'student'
    ? (session.cacheEpoch ?? null)
    : null;
}

export function statusAllowsProgress(status: EnrollmentStatus | undefined): boolean {
  return status === 'active';
}

export function workspaceIdentity(
  subject: SessionCacheEpoch | null,
  enrollmentId: number | null,
): string | null {
  return subject !== null && enrollmentId !== null ? `${subject}:${enrollmentId}` : null;
}

export function attemptFor(
  subject: SessionCacheEpoch,
  enrollmentId: number,
  courseId: number,
  lessonId: number,
  targetCompleted: boolean,
): LessonProgressAttempt {
  return {
    subject,
    workspaceIdentity: workspaceIdentity(subject, enrollmentId) as string,
    enrollmentId,
    courseId,
    lessonId,
    targetCompleted,
    identity: `${subject}:${courseId}:${lessonId}:${targetCompleted ? 'complete' : 'incomplete'}`,
  };
}

export function learningFailure(error: unknown): LearningFailure {
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return {
      titleKey: 'learning:learningWorkspaceUnavailable',
      messageKey: 'learning:thisLearningWorkspaceIsUnavailable',
      unavailable: true,
    };
  }
  if (error instanceof ApiError && error.status === 401) {
    return {
      titleKey: 'cart:signInRequired',
      messageKey: 'learning:sessionEndedSignInToContinue',
      unavailable: false,
    };
  }
  if (error instanceof ApiError && error.kind === 'invalid_response') {
    return {
      titleKey: 'learning:learningDataUnavailable',
      messageKey: 'common:serverReturnedAnInvalidResponseTryAgain',
      unavailable: false,
    };
  }
  return {
    titleKey: 'learning:learningDataUnavailable',
    messageKey: 'learning:tryAgainInAMoment',
    unavailable: false,
  };
}
