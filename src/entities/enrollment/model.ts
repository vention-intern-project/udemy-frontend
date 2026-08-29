export type EnrollmentStatus = 'pending_payment' | 'active' | 'cancelled';

export function hasActiveLearningEntitlement(status: EnrollmentStatus): boolean {
  return status === 'active';
}

/**
 * A course-scoped projection for actions that could create or recover an
 * enrollment. This intentionally distinguishes a protected pending attempt
 * from a cancelled paid recovery and from an active learning entitlement.
 */
export type EnrollmentCourseActionPreflight =
  | 'active-entitlement'
  | 'pending-protected'
  | 'cancelled-recovery'
  | 'no-enrollment';

export interface EnrollmentCourseSummary {
  id: number;
  title: string;
  description: string | null;
  price: string;
  currency: string;
}

export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  course: EnrollmentCourseSummary;
}

export interface EnrollmentList {
  items: readonly Enrollment[];
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function enrollmentCourseActionPreflight(
  enrollments: readonly Enrollment[],
  courseId: number,
): EnrollmentCourseActionPreflight {
  const enrollment = enrollments.find((item) => item.courseId === courseId);
  if (!enrollment) return 'no-enrollment';
  if (enrollment.status === 'active') return 'active-entitlement';
  if (enrollment.status === 'pending_payment') return 'pending-protected';
  return 'cancelled-recovery';
}
