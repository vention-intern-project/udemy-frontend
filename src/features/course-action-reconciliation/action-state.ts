export type CourseActionReconciliationIdentity = string;

export interface CourseActionReconciliationAttemptInput {
  readonly attemptIdentity: CourseActionReconciliationIdentity;
  readonly currentIdentity: CourseActionReconciliationIdentity | null;
}

export type CourseActionRecoveryState = 'idle' | 'recovery-available' | 'recovery-pending';

export type CourseActionRecoveryEvent = 'start' | 'failure' | 'success' | 'retire';

export const courseActionReconciliationUncertaintyMessage =
  'We could not verify your enrollment or cart.';

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
