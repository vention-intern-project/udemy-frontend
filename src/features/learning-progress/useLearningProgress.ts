import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Enrollment, EnrollmentList, EnrollmentStatus } from '@entities/enrollment';
import type { LessonOutline } from '@entities/course';
import { ApiError, type SessionCacheEpoch } from '@shared/api';
import { useSession, type SessionContextValue } from '@features/auth-session';

import {
  requestCourseProgress,
  requestLearningEnrollment,
  requestLearningEnrollments,
  requestLessonOutline,
  setLessonCompletion,
} from './api';
import { DEFAULT_LEARNING_FEEDBACK_MOTION_PREFERENCES } from './model';
import type {
  CourseProgress,
  LearningFeedbackMotionPreferences,
  LessonCompletionState,
  LessonProgressAttempt,
  LessonProgressFeedback,
} from './model';
import {
  learningCourseProgressQueryKey,
  learningDetailQueryKey,
  learningListQueryKey,
  learningOutlineQueryKey,
} from './query-keys';

export interface LearningFailure {
  title: string;
  message: string;
  unavailable: boolean;
}

export interface LearningListWorkflow {
  readonly enrollments: UseQueryResult<EnrollmentList, unknown>;
  retry(): Promise<unknown>;
}

export interface LearningWorkspaceWorkflow {
  readonly enrollment: UseQueryResult<Enrollment, unknown>;
  readonly progress: UseQueryResult<CourseProgress, unknown>;
  readonly outline: UseQueryResult<LessonOutline, unknown>;
  readonly feedback: LessonProgressFeedback | null;
  readonly mutationUnavailable: boolean;
  completionState(lessonId: number): LessonCompletionState;
  isPending(lessonId: number): boolean;
  setCompletion(lessonId: number, completed: boolean): void;
  retryEnrollment(): Promise<unknown>;
  retryWorkspace(): Promise<unknown>;
}

const SUCCESS_FEEDBACK_VISIBLE_MS = 4000;
const SUCCESS_FEEDBACK_EXIT_MS = 120;

interface LessonRowStateScope {
  readonly identity: string;
  readonly states: ReadonlyMap<number, LessonCompletionState>;
}

interface LessonMutationSnapshot {
  readonly attempt: LessonProgressAttempt;
  readonly previous: LessonCompletionState;
}

interface MutationUnavailableScope {
  readonly identity: string;
}

type LessonMutationFailureKind = 'aborted' | 'forbidden' | 'uncertain' | 'rejected';

function lessonMutationFailureKind(error: unknown): LessonMutationFailureKind {
  if (error instanceof ApiError) {
    if (error.kind === 'aborted') return 'aborted';
    if (error.status === 403) return 'forbidden';
    if (error.kind === 'invalid_response' || error.kind === 'offline') return 'uncertain';
  }
  if (error instanceof TypeError) return 'uncertain';
  return 'rejected';
}

function learningEpoch(session: SessionContextValue): SessionCacheEpoch | null {
  return session.state.status === 'authenticated' && session.state.user.role === 'student'
    ? (session.cacheEpoch ?? null)
    : null;
}

function statusAllowsProgress(status: EnrollmentStatus | undefined): boolean {
  return status === 'active';
}

function workspaceIdentity(
  subject: SessionCacheEpoch | null,
  enrollmentId: number | null,
): string | null {
  return subject !== null && enrollmentId !== null ? `${subject}:${enrollmentId}` : null;
}

function attemptFor(
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
      title: 'Learning workspace unavailable',
      message: 'This learning workspace is unavailable.',
      unavailable: true,
    };
  }
  if (error instanceof ApiError && error.status === 401) {
    return {
      title: 'Sign in required',
      message: 'Your session has ended. Sign in to continue learning.',
      unavailable: false,
    };
  }
  if (error instanceof ApiError && error.kind === 'invalid_response') {
    return {
      title: 'Learning data is unavailable',
      message: 'The server returned an invalid response. Try again.',
      unavailable: false,
    };
  }
  return {
    title: 'Learning data is unavailable',
    message: 'Try again in a moment.',
    unavailable: false,
  };
}

export function useLearningList(page: number): LearningListWorkflow {
  const session = useSession();
  const subject = learningEpoch(session);
  const enrollments = useQuery({
    queryKey: subject ? learningListQueryKey(subject, page) : ['disabled', 'learning-list', page],
    queryFn: ({ signal }) => requestLearningEnrollments(session, page, signal),
    enabled: subject !== null,
  });
  return { enrollments, retry: () => enrollments.refetch() };
}

export function useLearningWorkspace(
  enrollmentId: number | null,
  feedbackMotion: LearningFeedbackMotionPreferences = DEFAULT_LEARNING_FEEDBACK_MOTION_PREFERENCES,
): LearningWorkspaceWorkflow {
  const session = useSession();
  const queryClient = useQueryClient();
  const subject = learningEpoch(session);
  const scope = workspaceIdentity(subject, enrollmentId);
  const currentScopeRef = useRef(scope);
  currentScopeRef.current = scope;
  const [rowScope, setRowScope] = useState<LessonRowStateScope>({
    identity: scope ?? '',
    states: new Map(),
  });
  const rowScopeRef = useRef(rowScope);
  rowScopeRef.current = rowScope;
  const [feedback, setFeedback] = useState<LessonProgressFeedback | null>(null);
  const feedbackMotionRef = useRef(feedbackMotion);
  feedbackMotionRef.current = feedbackMotion;
  const feedbackVisibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mutationUnavailableScope, setMutationUnavailableScope] =
    useState<MutationUnavailableScope | null>(null);
  const mutationUnavailableScopeRef = useRef(mutationUnavailableScope);
  mutationUnavailableScopeRef.current = mutationUnavailableScope;
  const locksRef = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlyMap<string, LessonProgressAttempt>>(new Map());

  const clearFeedbackTimers = useCallback(() => {
    if (feedbackVisibleTimerRef.current !== null) clearTimeout(feedbackVisibleTimerRef.current);
    if (feedbackExitTimerRef.current !== null) clearTimeout(feedbackExitTimerRef.current);
    feedbackVisibleTimerRef.current = null;
    feedbackExitTimerRef.current = null;
  }, []);

  const setPersistentFeedback = useCallback(
    (nextFeedback: LessonProgressFeedback | null) => {
      clearFeedbackTimers();
      setFeedback(nextFeedback);
    },
    [clearFeedbackTimers],
  );

  const setTransientSuccessFeedback = useCallback(
    (message: string, attempt: LessonProgressAttempt) => {
      clearFeedbackTimers();
      setFeedback({ tone: 'success', message, visibility: 'visible' });
      feedbackVisibleTimerRef.current = setTimeout(() => {
        if (currentScopeRef.current !== attempt.workspaceIdentity) return;
        setFeedback((current) =>
          current?.tone === 'success' ? { ...current, visibility: 'exiting' } : current,
        );
        if (feedbackMotionRef.current.reducedMotion) {
          setFeedback(null);
          return;
        }
        feedbackExitTimerRef.current = setTimeout(() => {
          if (currentScopeRef.current === attempt.workspaceIdentity) setFeedback(null);
        }, SUCCESS_FEEDBACK_EXIT_MS);
      }, SUCCESS_FEEDBACK_VISIBLE_MS);
    },
    [clearFeedbackTimers],
  );

  useEffect(() => {
    const nextScope = { identity: scope ?? '', states: new Map<number, LessonCompletionState>() };
    rowScopeRef.current = nextScope;
    setRowScope(nextScope);
    setPersistentFeedback(null);
    mutationUnavailableScopeRef.current = null;
    setMutationUnavailableScope(null);
    locksRef.current.clear();
    setPending(new Map());
  }, [scope, setPersistentFeedback]);

  useEffect(() => clearFeedbackTimers, [clearFeedbackTimers]);

  const enrollment = useQuery({
    queryKey: subject
      ? learningDetailQueryKey(subject, enrollmentId ?? 0)
      : ['disabled', 'learning-detail'],
    queryFn: ({ signal }) => requestLearningEnrollment(session, enrollmentId as number, signal),
    enabled: subject !== null && enrollmentId !== null,
  });
  const courseId = enrollment.data?.courseId;
  const enabled =
    subject !== null && courseId !== undefined && statusAllowsProgress(enrollment.data?.status);
  const progress = useQuery({
    queryKey: subject
      ? learningCourseProgressQueryKey(subject, courseId ?? 0)
      : ['disabled', 'learning-progress'],
    queryFn: ({ signal }) => requestCourseProgress(session, courseId as number, signal),
    enabled,
  });
  const outline = useQuery({
    queryKey: subject
      ? learningOutlineQueryKey(subject, courseId ?? 0)
      : ['disabled', 'learning-outline'],
    queryFn: ({ signal }) => requestLessonOutline(session, courseId as number, signal),
    enabled,
  });

  const mutation = useMutation<
    { lessonId: number; completed: boolean },
    unknown,
    LessonProgressAttempt,
    LessonMutationSnapshot
  >({
    mutationFn: async (attempt) => {
      const result = await setLessonCompletion(
        session,
        attempt.courseId,
        attempt.lessonId,
        attempt.targetCompleted,
      );
      if (result.lessonId !== attempt.lessonId || result.completed !== attempt.targetCompleted) {
        throw new TypeError('Invalid lesson progress mutation response');
      }
      return result;
    },
    onMutate: (attempt) => {
      const priorScope =
        rowScopeRef.current.identity === attempt.workspaceIdentity
          ? rowScopeRef.current
          : {
              identity: attempt.workspaceIdentity,
              states: new Map<number, LessonCompletionState>(),
            };
      const previous =
        priorScope.states.get(attempt.lessonId) ?? ({ status: 'unknown' } as LessonCompletionState);
      const nextScope: LessonRowStateScope = {
        identity: priorScope.identity,
        states: new Map(priorScope.states).set(attempt.lessonId, {
          status: 'known',
          completed: attempt.targetCompleted,
        }),
      };
      rowScopeRef.current = nextScope;
      setRowScope(nextScope);
      setPending((current) => new Map(current).set(attempt.identity, attempt));
      setPersistentFeedback(null);
      return { attempt, previous };
    },
    onSuccess: async (result, attempt) => {
      if (currentScopeRef.current === attempt.workspaceIdentity) {
        const current = rowScopeRef.current;
        if (current.identity === attempt.workspaceIdentity) {
          const nextScope: LessonRowStateScope = {
            identity: current.identity,
            states: new Map(current.states).set(result.lessonId, {
              status: 'known',
              completed: result.completed,
            }),
          };
          rowScopeRef.current = nextScope;
          setRowScope(nextScope);
        }
        setTransientSuccessFeedback(
          result.completed ? 'Lesson marked complete.' : 'Lesson marked incomplete.',
          attempt,
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: learningCourseProgressQueryKey(attempt.subject, attempt.courseId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: learningDetailQueryKey(attempt.subject, attempt.enrollmentId),
          exact: true,
        }),
      ]);
    },
    onError: async (error, attempt, context) => {
      const failureKind = lessonMutationFailureKind(error);
      const isCurrentScope = currentScopeRef.current === attempt.workspaceIdentity;
      if (isCurrentScope && failureKind === 'forbidden') {
        const unavailableScope = { identity: attempt.workspaceIdentity };
        mutationUnavailableScopeRef.current = unavailableScope;
        setMutationUnavailableScope(unavailableScope);
        setPersistentFeedback(null);
        return;
      }
      if (isCurrentScope && context && failureKind !== 'uncertain') {
        const current = rowScopeRef.current;
        if (current.identity === attempt.workspaceIdentity) {
          const nextScope: LessonRowStateScope = {
            identity: current.identity,
            states: new Map(current.states).set(attempt.lessonId, context.previous),
          };
          rowScopeRef.current = nextScope;
          setRowScope(nextScope);
        }
      }
      if (failureKind === 'aborted') return;
      if (failureKind === 'uncertain') {
        if (isCurrentScope) {
          const current = rowScopeRef.current;
          if (current.identity === attempt.workspaceIdentity) {
            const nextScope: LessonRowStateScope = {
              identity: current.identity,
              states: new Map(current.states).set(attempt.lessonId, { status: 'unknown' }),
            };
            rowScopeRef.current = nextScope;
            setRowScope(nextScope);
          }
          setPersistentFeedback({
            tone: 'error',
            message: 'We could not confirm the lesson update. Progress is being refreshed.',
            visibility: 'visible',
          });
        }
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: learningCourseProgressQueryKey(attempt.subject, attempt.courseId),
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: learningDetailQueryKey(attempt.subject, attempt.enrollmentId),
            exact: true,
          }),
        ]);
        return;
      }
      if (isCurrentScope) {
        setPersistentFeedback({
          tone: 'error',
          message: 'Lesson progress could not be updated. Try again.',
          visibility: 'visible',
        });
      }
    },
    onSettled: (_result, _error, attempt) => {
      locksRef.current.delete(attempt.identity);
      setPending((current) => {
        const next = new Map(current);
        next.delete(attempt.identity);
        return next;
      });
    },
  });

  const completionState = (lessonId: number): LessonCompletionState =>
    rowScope.identity === (scope ?? '')
      ? (rowScope.states.get(lessonId) ?? { status: 'unknown' })
      : { status: 'unknown' };
  const isPending = (lessonId: number): boolean =>
    Array.from(pending.values()).some(
      (attempt) => attempt.workspaceIdentity === scope && attempt.lessonId === lessonId,
    );
  const setCompletion = (lessonId: number, completed: boolean) => {
    if (!subject || !courseId || !statusAllowsProgress(enrollment.data?.status)) return;
    if (enrollmentId === null) return;
    const attempt = attemptFor(subject, enrollmentId, courseId, lessonId, completed);
    if (mutationUnavailableScopeRef.current?.identity === attempt.workspaceIdentity) return;
    if (locksRef.current.has(attempt.identity) || isPending(lessonId)) return;
    locksRef.current.add(attempt.identity);
    mutation.mutate(attempt);
  };
  return {
    enrollment,
    progress,
    outline,
    feedback,
    mutationUnavailable: mutationUnavailableScope?.identity === scope,
    completionState,
    isPending,
    setCompletion,
    retryEnrollment: () => enrollment.refetch(),
    retryWorkspace: () => Promise.all([progress.refetch(), outline.refetch()]),
  };
}
