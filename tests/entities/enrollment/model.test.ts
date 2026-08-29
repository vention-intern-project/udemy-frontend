import { describe, expect, it } from 'vitest';

import { enrollmentCourseActionPreflight, type Enrollment } from '../../../src/entities/enrollment';

const enrollment = (status: Enrollment['status']): Enrollment => ({
  id: 4,
  userId: 1,
  courseId: 7,
  status,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  course: { id: 7, title: 'Course', description: null, price: '9.99', currency: 'USD' },
});

describe('enrollmentCourseActionPreflight', () => {
  it.each([
    ['active', 'active-entitlement'],
    ['pending_payment', 'pending-protected'],
    ['cancelled', 'cancelled-recovery'],
  ] as const)('classifies %s enrollment action state', (status, expected) => {
    expect(enrollmentCourseActionPreflight([enrollment(status)], 7)).toBe(expected);
  });

  it('keeps unrelated enrollment outside the course action preflight', () => {
    expect(enrollmentCourseActionPreflight([enrollment('active')], 8)).toBe('no-enrollment');
  });
});
