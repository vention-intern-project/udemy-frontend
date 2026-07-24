import { ApiError } from '@shared/api';
import type { LoginRequestDto } from '@entities/user';
import type { ResetPasswordInput, SignupInput } from './api';

export type AuthField = 'email' | 'name' | 'surname' | 'password' | 'passwordConfirmation' | 'role';
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(value: string, label: string): string | undefined {
  return value.trim() === '' ? `${label} is required.` : undefined;
}

export function validateEmail(email: string): string | undefined {
  return required(email, 'Email') ?? (!EMAIL_PATTERN.test(email) ? 'Enter a valid email address.' : undefined);
}

export function validateLogin(input: LoginRequestDto): AuthFieldErrors {
  return {
    email: validateEmail(input.email),
    password: required(input.password, 'Password'),
  };
}

export function validateSignup(input: SignupInput): AuthFieldErrors {
  const allowedRoles = ['student', 'instructor', 'admin'];
  return {
    email: validateEmail(input.email),
    name: required(input.name, 'First name'),
    surname: required(input.surname, 'Last name'),
    password: required(input.password, 'Password'),
    passwordConfirmation: required(input.passwordConfirmation, 'Password confirmation')
      ?? (input.passwordConfirmation !== input.password ? 'Passwords do not match.' : undefined),
    role: allowedRoles.includes(input.role) ? undefined : 'Choose a valid role.',
  };
}

export function validateReset(input: ResetPasswordInput): AuthFieldErrors {
  return {
    password: required(input.newPassword, 'New password'),
    passwordConfirmation: required(input.passwordConfirmation, 'Password confirmation')
      ?? (input.passwordConfirmation !== input.newPassword ? 'Passwords do not match.' : undefined),
  };
}

export function compactFieldErrors(errors: AuthFieldErrors): AuthFieldErrors {
  return Object.fromEntries(Object.entries(errors).filter((entry) => Boolean(entry[1]))) as AuthFieldErrors;
}

const SERVER_FIELD_NAMES: Readonly<Record<string, AuthField>> = {
  email: 'email',
  name: 'name',
  surname: 'surname',
  password: 'password',
  new_password: 'password',
  role: 'role',
};

const SERVER_FIELD_LABELS: Readonly<Record<AuthField, string>> = {
  email: 'Email',
  name: 'First name',
  surname: 'Last name',
  password: 'Password',
  passwordConfirmation: 'Password confirmation',
  role: 'Role',
};

function safeServerFieldMessage(field: AuthField, type: string): string {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('missing') || normalizedType.includes('required')) {
    return `${SERVER_FIELD_LABELS[field]} is required.`;
  }
  if (field === 'email' && (
    normalizedType.includes('email') || normalizedType.includes('pattern')
  )) {
    return 'Enter a valid email address.';
  }
  if (field === 'role' && (
    normalizedType.includes('enum') || normalizedType.includes('literal')
  )) {
    return 'Choose a valid role.';
  }
  return 'Check this field and submit again.';
}

export interface FormFailure {
  summary: string;
  fields: AuthFieldErrors;
}

type AuthFailureOperation = 'signup' | 'login' | 'forgot' | 'reset';

export function mapAuthFailure(
  error: unknown,
  operation: AuthFailureOperation,
): FormFailure {
  if (error instanceof ApiError && error.kind === 'offline') {
    return { summary: 'You appear to be offline. Check your connection and submit again.', fields: {} };
  }

  if (error instanceof ApiError && error.kind === 'validation') {
    const fields: AuthFieldErrors = {};
    error.issues.forEach((issue) => {
      const key = SERVER_FIELD_NAMES[String(issue.location[issue.location.length - 1])];
      if (key && !fields[key]) fields[key] = safeServerFieldMessage(key, issue.type);
    });
    return {
      summary: 'Review the highlighted fields and submit again.',
      fields,
    };
  }

  const summary = operation === 'signup'
    ? 'We could not create this account. The email may already be in use.'
    : operation === 'login'
      ? 'The email or password was not accepted.'
      : operation === 'reset'
        ? 'This reset link is invalid or has expired. Request a new link and try again.'
        : 'We could not process the request. Please try again.';
  return { summary, fields: {} };
}
