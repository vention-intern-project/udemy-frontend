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

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Invalid user profile response');
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid user profile ${field}`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}

export function decodeUserProfileDto(value: unknown): UserProfileDto {
  const profile = record(value);
  return {
    email: string(profile.email, 'email'),
    name: string(profile.name, 'name'),
    surname: string(profile.surname, 'surname'),
    role: mapUserRoleDto(profile.role),
    birthday: nullableString(profile.birthday, 'birthday'),
    phone_number: nullableString(profile.phone_number, 'phone_number'),
    created_at: string(profile.created_at, 'created_at'),
  };
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
