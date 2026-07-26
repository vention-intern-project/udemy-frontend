import type { PageQueryDto, PaginationDto } from '@shared/api';

export type EnrollmentStatusDto = 'pending_payment' | 'active' | 'cancelled';

export interface EnrollmentCreateDto {
  course_id: number;
}

export interface EnrollmentCourseSummaryDto {
  id: number;
  title: string;
  description: string | null;
  price: string;
  currency: string;
}

export interface EnrollmentDto {
  id: number;
  user_id: number;
  course_id: number;
  status: EnrollmentStatusDto;
  created_at: string;
  updated_at: string;
  course: EnrollmentCourseSummaryDto;
}

export type EnrollmentListDto = PaginationDto<EnrollmentDto>;
export type EnrollmentListQueryDto = PageQueryDto;

export interface StudentSummaryDto {
  id: number;
  name: string;
  surname: string;
  email: string;
}

export interface CourseEnrollmentDto {
  id: number;
  user_id: number;
  course_id: number;
  status: EnrollmentStatusDto;
  created_at: string;
  updated_at: string;
  user: StudentSummaryDto;
}

export type CourseEnrollmentListDto = PaginationDto<CourseEnrollmentDto>;

export interface LessonProgressDto {
  lesson_id: number;
  completed: boolean;
  completed_at: string | null;
}

export interface CourseProgressDto {
  course_id: number;
  completed_lessons: number;
  total_lessons: number;
  progress_percentage: number;
}
