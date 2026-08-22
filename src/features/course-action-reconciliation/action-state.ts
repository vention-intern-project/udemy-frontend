export type CourseActionReconciliationIdentity = string;

export interface CourseActionReconciliationAttemptInput {
  readonly attemptIdentity: CourseActionReconciliationIdentity;
  readonly currentIdentity: CourseActionReconciliationIdentity | null;
}

export type CourseActionRecoveryState = 'idle' | 'recovery-available' | 'recovery-pending';

export type CourseActionRecoveryEvent = 'start' | 'failure' | 'success' | 'retire';

/**
 * Locale-neutral owner for the reconciliation failure rendered by both course
 * action surfaces. The localized copy remains in the `course` namespace.
 */
export const courseActionReconciliationUncertaintyMessageKey =
  'courseActionReconciliationUncertainty' as const;

export type CourseActionReconciliationMessageKey =
  typeof courseActionReconciliationUncertaintyMessageKey;

export function isCurrentCourseActionReconciliationAttempt({
  attemptIdentity,
  currentIdentity,
}: CourseActionReconciliationAttemptInput): boolean {
  return currentIdentity === attemptIdentity;
}

export function courseActionRecoveryTransition(
  state: CourseActionRecoveryState,
  event: CourseActionRecoveryEvent,
): CourseActionRecoveryState {
  if (event === 'retire' || event === 'success') return 'idle';
  if (event === 'failure') return state === 'recovery-pending' ? 'recovery-available' : state;
  return state === 'recovery-available' ? 'recovery-pending' : state;
}
