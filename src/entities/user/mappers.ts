import type {
  LoginResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
  UserProfileDto,
  UserRoleDto,
} from './dto';
import type { AuthToken, UserProfile, UserRole } from './model';
import { readNullableString, readPositiveInteger, readRecord, readString } from '@shared/api';

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

export function decodeUserProfileDto(value: unknown): UserProfileDto {
  const profile = readRecord(value, 'user profile response');
  const role = mapUserRoleDto(profile.role);
  return {
    email: readString(profile.email, 'user profile email'),
    name: readString(profile.name, 'user profile name'),
    surname: readString(profile.surname, 'user profile surname'),
    role,
    birthday: readNullableString(profile.birthday, 'user profile birthday'),
    phone_number: readNullableString(profile.phone_number, 'user profile phone number'),
    created_at: readString(profile.created_at, 'user profile created_at'),
  };
}

export function decodeLoginResponseDto(value: unknown): LoginResponseDto {
  const response = readRecord(value, 'login response');
  const accessToken = readString(response.access_token, 'login access token');
  mapAccessToken(accessToken);
  return { access_token: accessToken };
}

export function decodeRegisterResponseDto(value: unknown): RegisterResponseDto {
  const response = readRecord(value, 'registration response');
  const user = readRecord(response.user, 'registration user');
  const accessToken = readString(response.access_token, 'registration access token');
  mapAccessToken(accessToken);
  return {
    user: {
      id: readPositiveInteger(user.id, 'registration user id'),
      email: readString(user.email, 'registration user email'),
    },
    access_token: accessToken,
    token_type: readString(response.token_type, 'registration token type'),
  };
}

export function decodeMessageResponseDto(value: unknown): MessageResponseDto {
  const response = readRecord(value, 'message response');
  return { message: readString(response.message, 'message response message') };
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
