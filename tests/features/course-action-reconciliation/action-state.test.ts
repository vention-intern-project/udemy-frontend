import { describe, expect, it } from 'vitest';

import {
  courseActionReconciliationUncertaintyMessageKey,
  courseActionRecoveryTransition,
  isCurrentCourseActionReconciliationAttempt,
  type CourseActionRecoveryState,
} from '../../../src/features/course-action-reconciliation';

describe('course action reconciliation recovery transitions', () => {
  it('starts only one live retry and retires it with the current epoch', () => {
    const available: CourseActionRecoveryState = 'recovery-available';

    expect(courseActionRecoveryTransition(available, 'start')).toBe('recovery-pending');
    expect(courseActionRecoveryTransition('recovery-pending', 'start')).toBe('recovery-pending');
    expect(courseActionRecoveryTransition('recovery-pending', 'failure')).toBe(
      'recovery-available',
    );
    expect(courseActionRecoveryTransition('recovery-pending', 'success')).toBe('idle');
    expect(courseActionRecoveryTransition('recovery-pending', 'retire')).toBe('idle');
    expect(
      isCurrentCourseActionReconciliationAttempt({
        attemptIdentity: '["epoch-a",7]',
        currentIdentity: '["epoch-a",7]',
      }),
    ).toBe(true);
    expect(
      isCurrentCourseActionReconciliationAttempt({
        attemptIdentity: '["epoch-a",7]',
        currentIdentity: '["epoch-b",7]',
      }),
    ).toBe(false);
    expect(courseActionReconciliationUncertaintyMessageKey).toBe(
      'courseActionReconciliationUncertainty',
    );
  });
});
