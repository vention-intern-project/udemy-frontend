import type {
  LoginResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
  UserProfileDto,
  UserRoleDto,
} from './dto';
import type { AuthToken, UserProfile, UserRole } from './model';

const USER_ROLE_BY_DTO = {
  student: 'student',
  instructor: 'instructor',
  admin: 'admin',
} as const satisfies Readonly<Record<UserRoleDto, UserRole>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

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

export function decodeUserProfileDto(value: unknown): UserProfileDto {
  if (
    !isRecord(value)
    || typeof value.email !== 'string'
    || typeof value.name !== 'string'
    || typeof value.surname !== 'string'
    || !isNullableString(value.birthday)
    || !isNullableString(value.phone_number)
    || typeof value.created_at !== 'string'
  ) {
    throw new TypeError('Invalid user profile response');
  }

  const role = mapUserRoleDto(value.role);
  return {
    email: value.email,
    name: value.name,
    surname: value.surname,
    role,
    birthday: value.birthday,
    phone_number: value.phone_number,
    created_at: value.created_at,
  };
}

export function decodeLoginResponseDto(value: unknown): LoginResponseDto {
  if (!isRecord(value) || typeof value.access_token !== 'string') {
    throw new TypeError('Invalid login response');
  }
  return { access_token: value.access_token };
}

export function decodeRegisterResponseDto(value: unknown): RegisterResponseDto {
  if (
    !isRecord(value)
    || !isRecord(value.user)
    || typeof value.user.id !== 'number'
    || !Number.isFinite(value.user.id)
    || typeof value.user.email !== 'string'
    || typeof value.access_token !== 'string'
    || typeof value.token_type !== 'string'
  ) {
    throw new TypeError('Invalid registration response');
  }
  return {
    user: { id: value.user.id, email: value.user.email },
    access_token: value.access_token,
    token_type: value.token_type,
  };
}

export function decodeMessageResponseDto(value: unknown): MessageResponseDto {
  if (!isRecord(value) || typeof value.message !== 'string') {
    throw new TypeError('Invalid message response');
  }
  return { message: value.message };
}

function mapAccessToken(value: unknown): AuthToken {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError('Authentication response did not include an access token');
  }
  return { accessToken: value };
}

export function mapLoginResponseDto(dto: LoginResponseDto): AuthToken {
  return mapAccessToken(dto.access_token);
}

export function mapRegisterResponseDto(dto: RegisterResponseDto): AuthToken {
  return mapAccessToken(dto.access_token);
}
