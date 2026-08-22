import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { queryKeys } from '@entities/api';
import type { CatalogCourse } from '@entities/course';
import { useSession } from '@features/auth-session';
import {
  courseActionRecoveryTransition,
  courseActionReconciliationUncertaintyMessageKey,
  isCurrentCourseActionReconciliationAttempt,
  type CourseActionRecoveryState,
} from '@features/course-action-reconciliation';
import {
  addCourseToCart,
  courseMutationDisposition,
  coursePrimaryAction,
  enrollFree,
  enrollmentQueryKey,
  requestEnrollments,
  type CourseActionCandidate,
  type CourseActionIdentity,
  type CourseMutationKind,
  type CourseMutationMessageKey,
  type CoursePreflightState,
} from '@features/course-detail';
import { cartQueryKey, removeCartItem, requestCart } from '@features/cart-workflow';
import type { SessionCacheEpoch } from '@shared/api';

export type CatalogCourseActionKind = CourseMutationKind | 'remove';

export interface CatalogCourseActionAttempt {
  identity: CourseActionIdentity;
  epoch: SessionCacheEpoch;
  courseId: number;
  action: CatalogCourseActionKind;
}

export interface CatalogCourseActionFeedback {
  messageKey: CourseMutationMessageKey;
  retryPreflight: boolean;
  tone: 'error';
}

export type CatalogCourseActionPresentation =
  | 'add-to-cart'
  | 'enroll-free'
  | 'enrolled'
  | 'neutral'
  | 'remove';

export interface CatalogCourseActionState {
  kind: 'button' | 'link' | 'status';
  label: string;
  to: string | null;
  disabled: boolean;
  pending: boolean;
  feedback: CatalogCourseActionFeedback | null;
  inCart: boolean;
  presentation: CatalogCourseActionPresentation;
}

function catalogLoginPresentation(course: CatalogCourse): CatalogCourseActionPresentation {
  return /^0(?:\.0+)?$/.test(course.price) ? 'enroll-free' : 'add-to-cart';
}

interface CatalogCoursePreflightOverride {
  courseId: number;
  preflight: CoursePreflightState;
  reconcileWithPreflight: boolean;
}

type CatalogCourseActionFeedbackMap = ReadonlyMap<
  CourseActionIdentity,
  CatalogCourseActionFeedback
>;
type CatalogCoursePreflightOverrideMap = ReadonlyMap<
  CourseActionIdentity,
  CatalogCoursePreflightOverride
>;
type CatalogCourseRecoveryMap = ReadonlyMap<CourseActionIdentity, CourseActionRecoveryState>;

function catalogActionCandidate(course: CatalogCourse): CourseActionCandidate {
  return {
    id: course.id,
    price: course.price,
    publishedAt: course.isPublished ? 'catalog-published' : null,
  };
}

function isActionableCandidate(course: CatalogCourse): boolean {
  return course.isPublished && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(course.price);
}

function actionIdentity(
  epoch: SessionCacheEpoch | null,
  courseId: number,
): CourseActionIdentity | null {
  return epoch ? JSON.stringify([epoch, courseId]) : null;
}

function queryPreflight(
  courseId: number,
  enabled: boolean,
  cartPending: boolean,
  enrollmentsPending: boolean,
  cartError: boolean,
  enrollmentsError: boolean,
  cartCourseIds: readonly number[],
  enrolledCourseIds: readonly number[],
): CoursePreflightState {
  if (!enabled) return 'not-required';
  if (cartPending || enrollmentsPending) return 'loading';
  if (cartError || enrollmentsError) return 'unavailable';
  if (enrolledCourseIds.includes(courseId)) return 'already-enrolled';
  if (cartCourseIds.includes(courseId)) return 'already-in-cart';
  return 'eligible';
}

export function useCatalogCourseActions(courses: readonly CatalogCourse[]) {
  const session = useSession();
  const queryClient = useQueryClient();
  const epoch = session.state.status === 'authenticated' ? (session.cacheEpoch ?? null) : null;
  const student = session.state.status === 'authenticated' && session.state.user.role === 'student';
  const preflightEnabled = student && epoch !== null && courses.some(isActionableCandidate);
  const [feedbackByIdentity, setFeedbackByIdentity] = useState<CatalogCourseActionFeedbackMap>(
    new Map(),
  );
  const [overrideByIdentity, setOverrideByIdentity] = useState<CatalogCoursePreflightOverrideMap>(
    new Map(),
  );
  const [recoveryByIdentity, setRecoveryByIdentity] = useState<CatalogCourseRecoveryMap>(new Map());
  const lockedIdentities = useRef(new Set<CourseActionIdentity>());
  const recoveryByIdentityRef = useRef(new Map<CourseActionIdentity, CourseActionRecoveryState>());
  const currentEpochRef = useRef<SessionCacheEpoch | null>(epoch);
  currentEpochRef.current = epoch;

  const setRecoveryState = useCallback(
    (identity: CourseActionIdentity, state: CourseActionRecoveryState) => {
      if (state === 'idle') recoveryByIdentityRef.current.delete(identity);
      else recoveryByIdentityRef.current.set(identity, state);
      setRecoveryByIdentity((current) => {
        const next = new Map(current);
        if (state === 'idle') next.delete(identity);
        else next.set(identity, state);
        return next;
      });
    },
    [],
  );

  const cart = useQuery({
    queryKey: epoch ? cartQueryKey(epoch) : ['disabled', 'catalog-cart'],
    queryFn: ({ signal }) => requestCart(session, signal),
    enabled: preflightEnabled,
  });
  const enrollments = useQuery({
    queryKey: epoch ? enrollmentQueryKey(epoch) : ['disabled', 'catalog-enrollments'],
    queryFn: ({ signal }) => requestEnrollments(session, signal),
    enabled: preflightEnabled,
  });

  const cartCourseIds = useMemo(
    () => cart.data?.items.map((item) => item.courseId) ?? [],
    [cart.data],
  );
  const enrolledCourseIds = useMemo(
    () => enrollments.data?.items.map((item) => item.courseId) ?? [],
    [enrollments.data],
  );
  const preflightHasAuthoritativeResult =
    preflightEnabled &&
    !cart.isPending &&
    !cart.isFetching &&
    !enrollments.isPending &&
    !enrollments.isFetching &&
    !cart.isError &&
    !enrollments.isError;

  useEffect(() => {
    lockedIdentities.current.clear();
    recoveryByIdentityRef.current.clear();
    setFeedbackByIdentity(new Map());
    setOverrideByIdentity(new Map());
    setRecoveryByIdentity(new Map());
  }, [epoch]);

  useEffect(() => {
    if (!preflightHasAuthoritativeResult) return;
    const reconciledIdentities = [...overrideByIdentity.entries()]
      .filter(([identity, override]) => {
        if (recoveryByIdentityRef.current.get(identity) === 'recovery-pending') return false;
        return (
          override.reconcileWithPreflight ||
          (override.preflight === 'already-in-cart' && cartCourseIds.includes(override.courseId)) ||
          (override.preflight === 'already-enrolled' &&
            enrolledCourseIds.includes(override.courseId))
        );
      })
      .map(([identity]) => identity);
    if (reconciledIdentities.length === 0) return;
    setOverrideByIdentity((currentOverrides) => {
      const nextOverrides = new Map(currentOverrides);
      reconciledIdentities.forEach((identity) => nextOverrides.delete(identity));
      return nextOverrides;
    });
    setFeedbackByIdentity((currentFeedback) => {
      const nextFeedback = new Map(currentFeedback);
      reconciledIdentities.forEach((identity) => nextFeedback.delete(identity));
      return nextFeedback;
    });
    reconciledIdentities.forEach((identity) => lockedIdentities.current.delete(identity));
    reconciledIdentities.forEach((identity) => recoveryByIdentityRef.current.delete(identity));
    setRecoveryByIdentity((currentRecovery) => {
      const nextRecovery = new Map(currentRecovery);
      reconciledIdentities.forEach((identity) => nextRecovery.delete(identity));
      return nextRecovery;
    });
  }, [
    cartCourseIds,
    enrolledCourseIds,
    overrideByIdentity,
    preflightHasAuthoritativeResult,
    recoveryByIdentity,
  ]);

  const invalidateForDisposition = useCallback(
    async (
      refresh: 'none' | 'detail' | 'cart' | 'enrollments' | 'preflight',
      attempt: CatalogCourseActionAttempt,
    ) => {
      if (refresh === 'cart') {
        await queryClient.invalidateQueries({ queryKey: cartQueryKey(attempt.epoch), exact: true });
      } else if (refresh === 'enrollments') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.private.operationPrefix(attempt.epoch, 'API-021'),
        });
      } else if (refresh === 'preflight') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: cartQueryKey(attempt.epoch), exact: true }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.private.operationPrefix(attempt.epoch, 'API-021'),
          }),
        ]);
      }
    },
    [queryClient],
  );

  const fetchAuthoritativePreflight = useCallback(
    async (attemptEpoch: SessionCacheEpoch) => {
      const cartKey = cartQueryKey(attemptEpoch);
      const enrollmentsKey = enrollmentQueryKey(attemptEpoch);
      return Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: cartKey,
          queryFn: ({ signal }) => requestCart(session, signal),
          staleTime: 0,
        }),
        queryClient.fetchQuery({
          queryKey: enrollmentsKey,
          queryFn: ({ signal }) => requestEnrollments(session, signal),
          staleTime: 0,
        }),
      ]);
    },
    [queryClient, session],
  );

  const mutation = useMutation<void, unknown, CatalogCourseActionAttempt>({
    mutationFn: (attempt) =>
      attempt.action === 'enroll'
        ? enrollFree(session, attempt.courseId)
        : attempt.action === 'remove'
          ? removeCartItem(session, attempt.courseId)
          : addCourseToCart(session, attempt.courseId),
    onSuccess: async (_data, attempt) => {
      if (currentEpochRef.current !== attempt.epoch) return;
      if (attempt.action === 'enroll') {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.private.operationPrefix(attempt.epoch, 'API-021'),
        });
      } else {
        await queryClient.invalidateQueries({ queryKey: cartQueryKey(attempt.epoch), exact: true });
      }
      if (currentEpochRef.current !== attempt.epoch) return;
      const preflight =
        attempt.action === 'enroll'
          ? 'already-enrolled'
          : attempt.action === 'remove'
            ? 'eligible'
            : 'already-in-cart';
      setOverrideByIdentity((current) =>
        new Map(current).set(attempt.identity, {
          courseId: attempt.courseId,
          preflight,
          reconcileWithPreflight: true,
        }),
      );
      const authoritativeQueryState = queryClient.getQueryState(
        attempt.action === 'enroll'
          ? enrollmentQueryKey(attempt.epoch)
          : cartQueryKey(attempt.epoch),
      );
      if (authoritativeQueryState?.status === 'error') {
        if (
          isCurrentCourseActionReconciliationAttempt({
            attemptIdentity: attempt.identity,
            currentIdentity: lockedIdentities.current.has(attempt.identity)
              ? attempt.identity
              : null,
          })
        )
          lockedIdentities.current.delete(attempt.identity);
        setFeedbackByIdentity((current) =>
          new Map(current).set(attempt.identity, {
            messageKey: courseActionReconciliationUncertaintyMessageKey,
            retryPreflight: true,
            tone: 'error',
          }),
        );
        setRecoveryState(attempt.identity, 'recovery-available');
      }
    },
    onError: async (error, attempt) => {
      const disposition = courseMutationDisposition(error);
      if (currentEpochRef.current !== attempt.epoch) return;
      await invalidateForDisposition(disposition.refresh, attempt);
      if (currentEpochRef.current !== attempt.epoch) return;
      setFeedbackByIdentity((current) =>
        new Map(current).set(attempt.identity, {
          messageKey: disposition.messageKey,
          retryPreflight: false,
          tone: 'error',
        }),
      );
      if (disposition.kind === 'terminal' && disposition.preflight) {
        const dispositionPreflight = disposition.preflight;
        const reconcileWithPreflight = disposition.refresh === 'preflight';
        setOverrideByIdentity((current) =>
          new Map(current).set(attempt.identity, {
            courseId: attempt.courseId,
            preflight: dispositionPreflight,
            reconcileWithPreflight,
          }),
        );
      }
      if (disposition.kind === 'retryable') lockedIdentities.current.delete(attempt.identity);
    },
  });

  const actionFor = useCallback(
    (course: CatalogCourse): CatalogCourseActionState => {
      const identity = actionIdentity(epoch, course.id);
      const basePreflight = queryPreflight(
        course.id,
        preflightEnabled,
        cart.isPending,
        enrollments.isPending,
        cart.isError,
        enrollments.isError,
        cartCourseIds,
        enrolledCourseIds,
      );
      const preflight = identity
        ? (overrideByIdentity.get(identity)?.preflight ?? basePreflight)
        : basePreflight;
      const primaryAction = coursePrimaryAction({
        course: catalogActionCandidate(course),
        session: session.state,
        preflight,
      });
      const pending = identity !== null && lockedIdentities.current.has(identity);
      const feedback = identity ? (feedbackByIdentity.get(identity) ?? null) : null;
      const recovery = identity ? (recoveryByIdentity.get(identity) ?? 'idle') : 'idle';
      const inCart = student && cartCourseIds.includes(course.id);
      if (feedback?.retryPreflight) {
        const recoveryPending = recovery === 'recovery-pending';
        return {
          kind: 'button',
          label: 'Try again',
          to: null,
          disabled: recoveryPending,
          pending: recoveryPending,
          feedback,
          inCart,
          presentation: catalogLoginPresentation(course),
        };
      }
      if (primaryAction.kind === 'login') {
        return {
          kind: 'link',
          label: primaryAction.label,
          to: primaryAction.to,
          disabled: false,
          pending: false,
          feedback,
          inCart: false,
          presentation: catalogLoginPresentation(course),
        };
      }
      if (pending && (inCart || primaryAction.kind === 'cart' || primaryAction.kind === 'enroll')) {
        return {
          kind: 'button',
          label: inCart ? 'Removing…' : primaryAction.kind === 'cart' ? 'Adding…' : 'Enrolling…',
          to: null,
          disabled: true,
          pending: true,
          feedback,
          inCart,
          presentation: inCart
            ? 'remove'
            : primaryAction.kind === 'cart'
              ? 'add-to-cart'
              : 'enroll-free',
        };
      }
      if (inCart) {
        return {
          kind: 'button',
          label: 'Remove',
          to: null,
          disabled: false,
          pending: false,
          feedback,
          inCart: true,
          presentation: 'remove',
        };
      }
      if (preflight === 'already-in-cart') {
        return {
          kind: 'button',
          label: 'Remove',
          to: null,
          disabled: true,
          pending: true,
          feedback,
          inCart: false,
          presentation: 'remove',
        };
      }
      if (preflight === 'already-enrolled') {
        return {
          kind: 'status',
          label: 'Enrolled',
          to: null,
          disabled: true,
          pending: false,
          feedback,
          inCart: false,
          presentation: 'enrolled',
        };
      }
      return {
        kind: 'button',
        label: primaryAction.label,
        to: null,
        disabled: primaryAction.kind === 'disabled',
        pending: false,
        feedback,
        inCart,
        presentation:
          primaryAction.kind === 'cart'
            ? 'add-to-cart'
            : primaryAction.kind === 'enroll'
              ? 'enroll-free'
              : 'neutral',
      };
    },
    [
      cart.isError,
      cart.isPending,
      cartCourseIds,
      enrolledCourseIds,
      enrollments.isError,
      enrollments.isPending,
      epoch,
      feedbackByIdentity,
      overrideByIdentity,
      preflightEnabled,
      recoveryByIdentity,
      session.state,
      student,
    ],
  );

  const submitAction = useCallback(
    (course: CatalogCourse) => {
      const state = actionFor(course);
      if (state.kind !== 'button' || state.disabled || !epoch) return;
      const identity = actionIdentity(epoch, course.id);
      if (identity && feedbackByIdentity.get(identity)?.retryPreflight) {
        const currentRecovery = recoveryByIdentityRef.current.get(identity) ?? 'recovery-available';
        const nextRecovery = courseActionRecoveryTransition(currentRecovery, 'start');
        if (nextRecovery === currentRecovery) return;
        setRecoveryState(identity, nextRecovery);
        void fetchAuthoritativePreflight(epoch).then((results) => {
          if (currentEpochRef.current !== epoch) return;
          if (recoveryByIdentityRef.current.get(identity) !== 'recovery-pending') return;
          const recovered = results.every((result) => result.status === 'fulfilled');
          if (!recovered) {
            setRecoveryState(
              identity,
              courseActionRecoveryTransition('recovery-pending', 'failure'),
            );
            return;
          }
          lockedIdentities.current.delete(identity);
          setFeedbackByIdentity((current) => {
            const next = new Map(current);
            next.delete(identity);
            return next;
          });
          setOverrideByIdentity((current) => {
            const next = new Map(current);
            next.delete(identity);
            return next;
          });
          setRecoveryState(identity, courseActionRecoveryTransition('recovery-pending', 'success'));
        });
        return;
      }
      const primaryAction = coursePrimaryAction({
        course: catalogActionCandidate(course),
        session: session.state,
        preflight: queryPreflight(
          course.id,
          preflightEnabled,
          cart.isPending,
          enrollments.isPending,
          cart.isError,
          enrollments.isError,
          cartCourseIds,
          enrolledCourseIds,
        ),
      });
      const inCart = student && cartCourseIds.includes(course.id);
      if (!inCart && primaryAction.kind !== 'cart' && primaryAction.kind !== 'enroll') return;
      if (!identity || lockedIdentities.current.has(identity)) return;
      lockedIdentities.current.add(identity);
      setFeedbackByIdentity((current) => {
        const next = new Map(current);
        next.delete(identity);
        return next;
      });
      const action: CatalogCourseActionKind = inCart
        ? 'remove'
        : primaryAction.kind === 'cart' || primaryAction.kind === 'enroll'
          ? primaryAction.kind
          : (() => {
              throw new Error('Catalog action is unavailable.');
            })();
      mutation.mutate({ identity, epoch, courseId: course.id, action });
    },
    [
      cart,
      actionFor,
      cartCourseIds,
      enrolledCourseIds,
      enrollments,
      epoch,
      mutation,
      feedbackByIdentity,
      fetchAuthoritativePreflight,
      preflightEnabled,
      session.state,
      setRecoveryState,
      student,
    ],
  );

  return { actionFor, submitAction };
}
