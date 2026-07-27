import type { CourseDetail } from '@entities/course';
import type { SessionState } from '@features/auth-session';
import { ApiError } from '@shared/api';

export type CoursePreflightState =
  | 'not-required'
  | 'loading'
  | 'eligible'
  | 'already-enrolled'
  | 'already-in-cart'
  | 'unavailable';

export type CoursePrimaryActionState =
  | { kind: 'login'; label: string; to: string }
  | { kind: 'enroll'; label: 'Enroll free' }
  | { kind: 'cart'; label: 'Add to cart' }
  | { kind: 'disabled'; label: string };

export interface CoursePrimaryActionInput {
  course: CourseDetail;
  session: SessionState;
  preflight: CoursePreflightState;
}

export type CourseMutationRefresh = 'none' | 'detail' | 'cart' | 'enrollments' | 'preflight';

export interface CourseMutationDisposition {
  kind: 'retryable' | 'terminal';
  preflight: CoursePreflightState | null;
  refresh: CourseMutationRefresh;
  message: string;
}

type PriceKind = 'free' | 'paid' | 'invalid';

function priceKind(price: string): PriceKind {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(price)) return 'invalid';
  return /^0(?:\.0+)?$/.test(price) ? 'free' : 'paid';
}

export function coursePrimaryAction({ course, session, preflight }: CoursePrimaryActionInput): CoursePrimaryActionState {
  if (course.publishedAt === null) return { kind: 'disabled', label: 'Course is not published' };
  const price = priceKind(course.price);
  if (price === 'invalid') return { kind: 'disabled', label: 'Action unavailable' };
  if (session.status !== 'authenticated') {
    const label = price === 'free' ? 'Log in to enroll free' : 'Log in to add to cart';
    return { kind: 'login', label, to: `/login?returnTo=${encodeURIComponent(`/courses/${course.id}`)}` };
  }
  if (session.user.role !== 'student') return { kind: 'disabled', label: 'Not available for this account' };
  if (preflight === 'loading') return { kind: 'disabled', label: 'Checking availability' };
  if (preflight === 'already-enrolled') return { kind: 'disabled', label: 'Already enrolled' };
  if (preflight === 'already-in-cart') return { kind: 'disabled', label: 'Already in cart' };
  if (preflight !== 'eligible') return { kind: 'disabled', label: 'Action unavailable' };
  return price === 'free' ? { kind: 'enroll', label: 'Enroll free' } : { kind: 'cart', label: 'Add to cart' };
}

export function courseMutationDisposition(error: unknown): CourseMutationDisposition {
  if (error instanceof ApiError && (error.kind === 'offline' || error.kind === 'server' || (error.status !== null && error.status >= 500))) {
    return {
      kind: 'retryable', preflight: null, refresh: 'none',
      message: 'The action failed. Check your connection and try again.',
    };
  }
  if (error instanceof ApiError && error.status === 401) {
    return { kind: 'terminal', preflight: 'unavailable', refresh: 'none', message: 'Log in again to continue.' };
  }
  if (error instanceof ApiError && error.status === 403) {
    return { kind: 'terminal', preflight: 'unavailable', refresh: 'none', message: 'This action is not available for your account.' };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { kind: 'terminal', preflight: 'unavailable', refresh: 'detail', message: 'This course is no longer available.' };
  }
  if (error instanceof ApiError && error.message === 'Course is not published') {
    return { kind: 'terminal', preflight: 'unavailable', refresh: 'detail', message: 'Course is not published' };
  }
  if (error instanceof ApiError && error.status === 409 && error.message === 'Already enrolled in this course') {
    return { kind: 'terminal', preflight: 'already-enrolled', refresh: 'enrollments', message: 'The course is already in your learning list.' };
  }
  if (error instanceof ApiError && error.status === 409 && error.message === 'Course already in cart') {
    return { kind: 'terminal', preflight: 'already-in-cart', refresh: 'cart', message: 'The course is already in your cart.' };
  }
  if (error instanceof ApiError && error.status === 409) {
    return { kind: 'terminal', preflight: 'unavailable', refresh: 'preflight', message: 'The course state changed. Availability has been refreshed.' };
  }
  return { kind: 'terminal', preflight: 'unavailable', refresh: 'none', message: 'This action is currently unavailable.' };
}
