import { ApiError } from '@shared/api';
import type { LoginRequestDto } from '@entities/user';
import type { TFunction } from 'i18next';
import type { ResetPasswordInput, SignupInput } from './api';

export type AuthField = 'email' | 'name' | 'surname' | 'password' | 'passwordConfirmation' | 'role';
export type AuthFieldLabel =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'password'
  | 'confirmPassword'
  | 'newPassword'
  | 'role';

interface AuthFieldRequiredMessage {
  readonly kind: 'field-required';
  readonly fieldLabel: AuthFieldLabel;
}

interface AuthInvalidEmailMessage {
  readonly kind: 'invalid-email';
}

interface AuthPasswordsDoNotMatchMessage {
  readonly kind: 'passwords-do-not-match';
}

interface AuthInvalidRoleMessage {
  readonly kind: 'invalid-role';
}

interface AuthCheckFieldMessage {
  readonly kind: 'check-field';
}

interface AuthReviewHighlightedFieldMessage {
  readonly kind: 'review-highlighted-field';
}

interface AuthReviewHighlightedFieldsMessage {
  readonly kind: 'review-highlighted-fields';
}

interface AuthCouldNotProcessFormMessage {
  readonly kind: 'could-not-process-form';
}

interface AuthOfflineMessage {
  readonly kind: 'offline';
}

interface AuthRequestFailureMessage {
  readonly kind: 'request-failure';
}

interface AuthSignupFailureMessage {
  readonly kind: 'signup-failure';
}

interface AuthLoginFailureMessage {
  readonly kind: 'login-failure';
}

interface AuthResetFailureMessage {
  readonly kind: 'reset-failure';
}

interface AuthForgotFailureMessage {
  readonly kind: 'forgot-failure';
}

export type AuthMessage =
  | AuthFieldRequiredMessage
  | AuthInvalidEmailMessage
  | AuthPasswordsDoNotMatchMessage
  | AuthInvalidRoleMessage
  | AuthCheckFieldMessage
  | AuthReviewHighlightedFieldMessage
  | AuthReviewHighlightedFieldsMessage
  | AuthCouldNotProcessFormMessage
  | AuthOfflineMessage
  | AuthRequestFailureMessage
  | AuthSignupFailureMessage
  | AuthLoginFailureMessage
  | AuthResetFailureMessage
  | AuthForgotFailureMessage;

export type AuthFieldErrors = Partial<Record<AuthField, AuthMessage>>;
export type LocalizedAuthFieldErrors = Partial<Record<AuthField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(value: string, fieldLabel: AuthFieldLabel): AuthMessage | undefined {
  return value.trim() === '' ? { kind: 'field-required', fieldLabel } : undefined;
}

export function validateEmail(email: string): AuthMessage | undefined {
  return (
    required(email, 'email') ?? (!EMAIL_PATTERN.test(email) ? { kind: 'invalid-email' } : undefined)
  );
}

export function validateLogin(input: LoginRequestDto): AuthFieldErrors {
  return {
    email: validateEmail(input.email),
    password: required(input.password, 'password'),
  };
}

export function validateSignup(input: SignupInput): AuthFieldErrors {
  const allowedRoles = ['student', 'instructor', 'admin'];
  return {
    email: validateEmail(input.email),
    name: required(input.name, 'firstName'),
    surname: required(input.surname, 'lastName'),
    password: required(input.password, 'password'),
    passwordConfirmation:
      required(input.passwordConfirmation, 'confirmPassword') ??
      (input.passwordConfirmation !== input.password
        ? { kind: 'passwords-do-not-match' }
        : undefined),
    role: allowedRoles.includes(input.role) ? undefined : { kind: 'invalid-role' },
  };
}

export function validateReset(input: ResetPasswordInput): AuthFieldErrors {
  return {
    password: required(input.newPassword, 'newPassword'),
    passwordConfirmation:
      required(input.passwordConfirmation, 'confirmPassword') ??
      (input.passwordConfirmation !== input.newPassword
        ? { kind: 'passwords-do-not-match' }
        : undefined),
  };
}

export function compactFieldErrors(errors: AuthFieldErrors): AuthFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter((entry) => Boolean(entry[1])),
  ) as AuthFieldErrors;
}

const SERVER_FIELD_NAMES: Readonly<Record<string, AuthField>> = {
  email: 'email',
  name: 'name',
  surname: 'surname',
  password: 'password',
  new_password: 'password',
  role: 'role',
};

const SERVER_FIELD_LABELS: Readonly<Record<AuthField, AuthFieldLabel>> = {
  email: 'email',
  name: 'firstName',
  surname: 'lastName',
  password: 'password',
  passwordConfirmation: 'confirmPassword',
  role: 'role',
};

function safeServerFieldMessage(field: AuthField, type: string): AuthMessage {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes('missing') || normalizedType.includes('required')) {
    return { kind: 'field-required', fieldLabel: SERVER_FIELD_LABELS[field] };
  }
  if (
    field === 'email' &&
    (normalizedType.includes('email') || normalizedType.includes('pattern'))
  ) {
    return { kind: 'invalid-email' };
  }
  if (field === 'role' && (normalizedType.includes('enum') || normalizedType.includes('literal'))) {
    return { kind: 'invalid-role' };
  }
  return { kind: 'check-field' };
}

export interface FormFailure {
  summary: AuthMessage;
  fields: AuthFieldErrors;
}

type AuthFailureOperation = 'signup' | 'login' | 'forgot' | 'reset';

export function mapAuthFailure(error: unknown, operation: AuthFailureOperation): FormFailure {
  if (error instanceof ApiError && error.kind === 'offline') {
    return {
      summary: { kind: 'offline' },
      fields: {},
    };
  }

  if (error instanceof ApiError && error.kind === 'validation') {
    const fields: AuthFieldErrors = {};
    error.issues.forEach((issue) => {
      const key = SERVER_FIELD_NAMES[String(issue.location[issue.location.length - 1])];
      if (key && !fields[key]) fields[key] = safeServerFieldMessage(key, issue.type);
    });
    return {
      summary:
        Object.keys(fields).length > 0
          ? { kind: 'review-highlighted-fields' }
          : { kind: 'could-not-process-form' },
      fields,
    };
  }

  if (
    error instanceof ApiError &&
    (error.kind === 'server' || error.kind === 'http' || error.kind === 'invalid_response')
  ) {
    return { summary: { kind: 'request-failure' }, fields: {} };
  }

  const summary =
    operation === 'signup'
      ? { kind: 'signup-failure' as const }
      : operation === 'login'
        ? { kind: 'login-failure' as const }
        : operation === 'reset'
          ? { kind: 'reset-failure' as const }
          : { kind: 'forgot-failure' as const };
  return { summary, fields: {} };
}

export function resolveAuthMessage(message: AuthMessage | null, t: TFunction): string | null {
  if (!message) return null;
  switch (message.kind) {
    case 'field-required':
      return t('auth:validationFieldRequired', { fieldLabel: t(`auth:${message.fieldLabel}`) });
    case 'invalid-email':
      return t('auth:validationInvalidEmail');
    case 'passwords-do-not-match':
      return t('auth:validationPasswordsDoNotMatch');
    case 'invalid-role':
      return t('auth:validationInvalidRole');
    case 'check-field':
      return t('auth:validationCheckField');
    case 'review-highlighted-field':
      return t('auth:validationReviewHighlightedField');
    case 'review-highlighted-fields':
      return t('auth:validationReviewHighlightedFields');
    case 'could-not-process-form':
      return t('auth:validationCouldNotProcessForm');
    case 'offline':
      return t('auth:failureOffline');
    case 'request-failure':
      return t('auth:failureRequest');
    case 'signup-failure':
      return t('auth:failureSignup');
    case 'login-failure':
      return t('auth:failureLogin');
    case 'reset-failure':
      return t('auth:failureReset');
    case 'forgot-failure':
      return t('auth:failureForgot');
  }
}

export function resolveAuthFieldErrors(
  errors: AuthFieldErrors,
  t: TFunction,
): LocalizedAuthFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [field, resolveAuthMessage(message, t)]),
  ) as LocalizedAuthFieldErrors;
}
