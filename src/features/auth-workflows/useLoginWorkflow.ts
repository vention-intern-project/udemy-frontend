import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type RefObject } from 'react';

import type { LoginRequestDto } from '@entities/user';
import { useSession } from '@features/auth-session';

import { login } from './api';
import { authWorkflowMutationKeys } from './mutation-keys';
import { useAuthErrorFocus, useSubmissionAttemptLifecycle } from './AuthForm';
import {
  compactFieldErrors,
  mapAuthFailure,
  validateLogin,
  type AuthFieldErrors,
} from './validation';

const FIELD_ORDER = ['email', 'password'] as const;

interface LoginMutationVariables {
  readonly input: LoginRequestDto;
  readonly signal: AbortSignal;
}

export interface LoginWorkflow {
  readonly email: string;
  readonly fieldErrors: AuthFieldErrors;
  readonly isPending: boolean;
  readonly password: string;
  readonly summary: string | null;
  readonly summaryRef: RefObject<HTMLDivElement>;
  setEmail(value: string): void;
  setPassword(value: string): void;
  submit(event: FormEvent): Promise<void>;
}

export function useLoginWorkflow(ownerKey: string): LoginWorkflow {
  const session = useSession();
  const [email, setEmailValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(
    summary,
    fieldErrors,
    FIELD_ORDER,
  );
  const attempts = useSubmissionAttemptLifecycle(ownerKey);
  const mutation = useMutation({
    mutationKey: authWorkflowMutationKeys.login,
    mutationFn: ({ input, signal }: LoginMutationVariables) => login(session, input, signal),
    gcTime: 0,
    retry: false,
  });
  const clearFieldError = (field: keyof AuthFieldErrors) => {
    if (!fieldErrors[field]) return;
    const remaining = { ...fieldErrors };
    delete remaining[field];
    setFieldErrors(remaining);
    setSummary(null);
  };
  const setEmail = (value: string) => {
    setEmailValue(value);
    clearFieldError('email');
  };
  const setPassword = (value: string) => {
    setPasswordValue(value);
    clearFieldError('password');
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    const attempt = attempts.begin();
    if (!attempt) return;
    const input = { email: email.trim(), password };
    const validation = compactFieldErrors(validateLogin(input));
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setSummary('Review the highlighted fields and submit again.');
      requestSummaryFocus();
      attempts.finish(attempt);
      return;
    }
    setFieldErrors({});
    setSummary(null);
    try {
      const token = await mutation.mutateAsync({ input, signal: attempt.signal });
      if (!attempts.isCurrent(attempt)) return;
      session.acceptAccessToken(token.accessToken);
      if (!attempts.isCurrent(attempt)) return;
      setPasswordValue('');
    } catch (error) {
      if (!attempts.isCurrent(attempt)) return;
      const failure = mapAuthFailure(error, 'login');
      setFieldErrors(failure.fields);
      setSummary(failure.summary);
      requestSummaryFocus();
    } finally {
      if (attempts.finish(attempt)) mutation.reset();
    }
  }
  return {
    email,
    fieldErrors,
    isPending: mutation.isPending,
    password,
    summary,
    summaryRef,
    setEmail,
    setPassword,
    submit,
  };
}
