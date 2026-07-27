export type EnrollmentStatus = 'pending_payment' | 'active' | 'cancelled';

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
