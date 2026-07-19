import type { EnrollmentDto, EnrollmentStatusDto } from './dto';
import type { Enrollment, EnrollmentStatus } from './model';

const ENROLLMENT_STATUS_BY_DTO = {
  pending_payment: 'pending_payment',
  active: 'active',
} as const satisfies Readonly<Record<EnrollmentStatusDto, EnrollmentStatus>>;

export function mapEnrollmentStatusDto(value: unknown): EnrollmentStatus {
  switch (value) {
    case 'pending_payment':
      return ENROLLMENT_STATUS_BY_DTO.pending_payment;
    case 'active':
      return ENROLLMENT_STATUS_BY_DTO.active;
    default:
      throw new TypeError(`Unsupported enrollment status: ${String(value)}`);
  }
}

export function mapEnrollmentDto(dto: EnrollmentDto): Enrollment {
  return {
    id: dto.id,
    userId: dto.user_id,
    courseId: dto.course_id,
    status: mapEnrollmentStatusDto(dto.status),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    course: { ...dto.course },
  };
}
