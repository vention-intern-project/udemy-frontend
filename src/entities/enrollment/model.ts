export type EnrollmentStatus = 'pending_payment' | 'active';

export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  course: {
    id: number;
    title: string;
    description: string | null;
    price: string;
    currency: string;
  };
}
