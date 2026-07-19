import type { UserProfileDto, UserRoleDto } from './dto';
import type { UserProfile, UserRole } from './model';

const USER_ROLE_BY_DTO = {
  student: 'student',
  instructor: 'instructor',
  admin: 'admin',
} as const satisfies Readonly<Record<UserRoleDto, UserRole>>;

export function mapUserRoleDto(value: unknown): UserRole {
  switch (value) {
    case 'student':
      return USER_ROLE_BY_DTO.student;
    case 'instructor':
      return USER_ROLE_BY_DTO.instructor;
    case 'admin':
      return USER_ROLE_BY_DTO.admin;
    default:
      throw new TypeError(`Unsupported user role: ${String(value)}`);
  }
}

export function mapUserProfileDto(dto: UserProfileDto): UserProfile {
  return {
    email: dto.email,
    name: dto.name,
    surname: dto.surname,
    role: mapUserRoleDto(dto.role),
    birthday: dto.birthday,
    phoneNumber: dto.phone_number,
    createdAt: dto.created_at,
  };
}
