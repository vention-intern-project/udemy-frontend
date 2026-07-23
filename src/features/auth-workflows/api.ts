import {
  API_OPERATION_BY_ID,
} from '@entities/api';
import {
  type ForgotPasswordRequestDto,
  type LoginRequestDto,
  type LoginResponseDto,
  type MessageResponseDto,
  type RegisterResponseDto,
  type ResetPasswordRequestDto,
  type UserRegisterDto,
  decodeLoginResponseDto,
  decodeMessageResponseDto,
  decodeRegisterResponseDto,
  mapLoginResponseDto,
  mapRegisterResponseDto,
  type AuthToken,
} from '@entities/user';
import {
  requestOperation,
  type SessionContextValue,
} from '@features/auth-session';

export interface SignupInput extends UserRegisterDto {
  passwordConfirmation: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  passwordConfirmation: string;
}

export async function login(
  session: SessionContextValue,
  input: LoginRequestDto,
  signal?: AbortSignal,
): Promise<AuthToken> {
  const operation = API_OPERATION_BY_ID['API-024'];
  const dto = await requestOperation<LoginResponseDto, LoginRequestDto>(session, operation.id, {
    method: operation.method,
    path: operation.path,
    body: input,
    signal,
    decode: decodeLoginResponseDto,
  });
  return mapLoginResponseDto(dto);
}

export async function signup(
  session: SessionContextValue,
  input: SignupInput,
  signal?: AbortSignal,
): Promise<AuthToken> {
  const operation = API_OPERATION_BY_ID['API-033'];
  const body: UserRegisterDto = {
    email: input.email,
    name: input.name,
    surname: input.surname,
    password: input.password,
    role: input.role,
  };
  const dto = await requestOperation<RegisterResponseDto, UserRegisterDto>(session, operation.id, {
    method: operation.method,
    path: operation.path,
    body,
    signal,
    decode: decodeRegisterResponseDto,
  });
  return mapRegisterResponseDto(dto);
}

export async function forgotPassword(
  session: SessionContextValue,
  input: ForgotPasswordRequestDto,
  signal?: AbortSignal,
): Promise<void> {
  const operation = API_OPERATION_BY_ID['API-023'];
  await requestOperation<MessageResponseDto, ForgotPasswordRequestDto>(session, operation.id, {
    method: operation.method,
    path: operation.path,
    body: input,
    signal,
    decode: decodeMessageResponseDto,
  });
}

export async function resetPassword(
  session: SessionContextValue,
  input: ResetPasswordInput,
  signal?: AbortSignal,
): Promise<void> {
  const operation = API_OPERATION_BY_ID['API-029'];
  const body: ResetPasswordRequestDto = {
    token: input.token,
    new_password: input.newPassword,
  };
  await requestOperation<MessageResponseDto, ResetPasswordRequestDto>(session, operation.id, {
    method: operation.method,
    path: operation.path,
    body,
    signal,
    decode: decodeMessageResponseDto,
  });
}
