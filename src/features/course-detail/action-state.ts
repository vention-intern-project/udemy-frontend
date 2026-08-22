import type { SessionState } from '@features/auth-session';
import type { CourseActionReconciliationMessageKey } from '@features/course-action-reconciliation';
import { ApiError } from '@shared/api';

export interface CourseActionCandidate {
  id: number;
  price: string;
  publishedAt: string | null;
}

export type CoursePreflightState =
  | 'not-required'
  | 'loading'
  | 'eligible'
  | 'already-enrolled'
  | 'already-in-cart'
  | 'unavailable';

interface CourseLoginActionState {
  kind: 'login';
  helper: CourseLoginHelper;
  label: 'Enroll for free' | 'Add to cart';
  to: string;
}

interface CourseLoginHelper {
  readonly linkText: 'Sign in';
  readonly guidance: 'to enroll for free.' | 'to add this course to your cart.';
}

export type CoursePrimaryActionState =
  | CourseLoginActionState
  | { kind: 'enroll'; label: 'Enroll free' }
  | { kind: 'cart'; label: 'Add to cart' }
  | { kind: 'disabled'; label: string };

export interface CoursePrimaryActionInput {
  course: CourseActionCandidate;
  session: SessionState;
  preflight: CoursePreflightState;
}

export type CourseMutationRefresh = 'none' | 'detail' | 'cart' | 'enrollments' | 'preflight';

export type CourseMutationMessageKey =
  | 'actionFailedCheckConnection'
  | 'actionUnavailable'
  | 'actionCurrentlyUnavailable'
  | 'courseIsNotPublished'
  | 'logInAgainToContinue'
  | 'actionUnavailableForAccount'
  | 'courseNoLongerAvailable'
  | 'courseAlreadyInLearningList'
  | 'courseAlreadyInCart'
  | 'courseStateChangedAvailabilityRefreshed'
  | CourseActionReconciliationMessageKey;

export interface CourseMutationDisposition {
  kind: 'retryable' | 'terminal';
  preflight: CoursePreflightState | null;
  refresh: CourseMutationRefresh;
  messageKey: CourseMutationMessageKey;
}

function retryableDisposition(): CourseMutationDisposition {
  return {
    kind: 'retryable',
    preflight: null,
    refresh: 'none',
    messageKey: 'actionFailedCheckConnection',
  };
}

function unavailableDisposition(
  messageKey: CourseMutationMessageKey,
  refresh: CourseMutationRefresh = 'none',
): CourseMutationDisposition {
  return { kind: 'terminal', preflight: 'unavailable', refresh, messageKey };
}

function isRetryableApiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === 'offline' ||
      error.kind === 'server' ||
      (error.status !== null && error.status >= 500))
  );
}

function badRequestDisposition(error: ApiError): CourseMutationDisposition {
  if (error.status === 400 && error.message === 'Course is not published') {
    return unavailableDisposition('courseIsNotPublished', 'detail');
  }
  return unavailableDisposition('actionCurrentlyUnavailable');
}

function conflictDisposition(error: ApiError): CourseMutationDisposition {
  if (error.message === 'Already enrolled in this course') {
    return {
      kind: 'terminal',
      preflight: 'already-enrolled',
      refresh: 'enrollments',
      messageKey: 'courseAlreadyInLearningList',
    };
  }
  if (error.message === 'Course already in cart') {
    return {
      kind: 'terminal',
      preflight: 'already-in-cart',
      refresh: 'cart',
      messageKey: 'courseAlreadyInCart',
    };
  }
  return unavailableDisposition('courseStateChangedAvailabilityRefreshed', 'preflight');
}

type PriceKind = 'free' | 'paid' | 'invalid';

function priceKind(price: string): PriceKind {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(price)) return 'invalid';
  return /^0(?:\.0+)?$/.test(price) ? 'free' : 'paid';
}

export function coursePrimaryAction({
  course,
  session,
  preflight,
}: CoursePrimaryActionInput): CoursePrimaryActionState {
  if (course.publishedAt === null) return { kind: 'disabled', label: 'Course is not published' };
  const price = priceKind(course.price);
  if (price === 'invalid') return { kind: 'disabled', label: 'Action unavailable' };
  if (session.status !== 'authenticated') {
    return price === 'free'
      ? {
          kind: 'login',
          helper: { linkText: 'Sign in', guidance: 'to enroll for free.' },
          label: 'Enroll for free',
          to: `/login?returnTo=${encodeURIComponent(`/courses/${course.id}`)}`,
        }
      : {
          kind: 'login',
          helper: { linkText: 'Sign in', guidance: 'to add this course to your cart.' },
          label: 'Add to cart',
          to: `/login?returnTo=${encodeURIComponent(`/courses/${course.id}`)}`,
        };
  }
  if (session.user.role !== 'student')
    return { kind: 'disabled', label: 'Not available for this account' };
  if (preflight === 'loading') return { kind: 'disabled', label: 'Checking availability' };
  if (preflight === 'already-enrolled') return { kind: 'disabled', label: 'Already enrolled' };
  if (preflight === 'already-in-cart') return { kind: 'disabled', label: 'Already in cart' };
  if (preflight !== 'eligible') return { kind: 'disabled', label: 'Action unavailable' };
  return price === 'free'
    ? { kind: 'enroll', label: 'Enroll free' }
    : { kind: 'cart', label: 'Add to cart' };
}

export function courseMutationDisposition(error: unknown): CourseMutationDisposition {
  if (isRetryableApiError(error)) return retryableDisposition();
  if (!(error instanceof ApiError)) return unavailableDisposition('actionCurrentlyUnavailable');
  if (error.status === 401) return unavailableDisposition('logInAgainToContinue');
  if (error.status === 403) return unavailableDisposition('actionUnavailableForAccount');
  if (error.status === 404) return unavailableDisposition('courseNoLongerAvailable', 'detail');
  if (error.status === 400) return badRequestDisposition(error);
  if (error.status === 409) return conflictDisposition(error);
  return unavailableDisposition('actionCurrentlyUnavailable');
}
