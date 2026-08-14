import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSession } from '@features/auth-session';

import { resetPassword, type ResetPasswordInput } from './api';
import { useAuthErrorFocus, useSubmissionAttemptLifecycle } from './AuthForm';
import { authWorkflowMutationKeys } from './mutation-keys';
import {
  compactFieldErrors,
  mapAuthFailure,
  validateReset,
  type AuthFieldErrors,
} from './validation';

const FIELD_ORDER = ['password', 'passwordConfirmation'] as const;

interface ResetPasswordMutationVariables {
  readonly input: ResetPasswordInput;
  readonly signal: AbortSignal;
}

export interface ResetPasswordWorkflowOptions {
  readonly ownerKey: string;
  readonly token: string;
  onSuccess(): void;
}

export interface ResetPasswordWorkflow {
  readonly fieldErrors: AuthFieldErrors;
  readonly isPending: boolean;
  readonly newPassword: string;
  readonly passwordConfirmation: string;
  readonly summary: string | null;
  readonly summaryRef: RefObject<HTMLDivElement>;
  setNewPassword(value: string): void;
  setPasswordConfirmation(value: string): void;
  submit(event: FormEvent): Promise<void>;
}

export function useResetPasswordWorkflow({
  ownerKey,
  token,
  onSuccess,
}: ResetPasswordWorkflowOptions): ResetPasswordWorkflow {
  const session = useSession();
  const navigate = useNavigate();
  const [newPassword, setNewPasswordValue] = useState('');
  const [passwordConfirmation, setPasswordConfirmationValue] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(
    summary,
    fieldErrors,
    FIELD_ORDER,
  );
  const attempts = useSubmissionAttemptLifecycle(ownerKey);
  const mutation = useMutation({
    mutationKey: authWorkflowMutationKeys.resetPassword,
    mutationFn: ({ input, signal }: ResetPasswordMutationVariables) =>
      resetPassword(session, input, signal),
    gcTime: 0,
    retry: false,
  });
  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const remaining = { ...current };
      delete remaining[field];
      return remaining;
    });
    if (fieldErrors[field]) setSummary(null);
  };
  const setNewPassword = (value: string) => {
    setNewPasswordValue(value);
    clearFieldError('password');
  };
  const setPasswordConfirmation = (value: string) => {
    setPasswordConfirmationValue(value);
    clearFieldError('passwordConfirmation');
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    const attempt = attempts.begin();
    if (!attempt) return;
    const input = { token, newPassword, passwordConfirmation };
    const validation = compactFieldErrors(validateReset(input));
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
      await mutation.mutateAsync({ input, signal: attempt.signal });
      if (!attempts.isCurrent(attempt)) return;
      onSuccess();
      navigate('/reset-password', { replace: true });
    } catch (error) {
      if (!attempts.isCurrent(attempt)) return;
      const failure = mapAuthFailure(error, 'reset');
      setFieldErrors(failure.fields);
      setSummary(failure.summary);
      requestSummaryFocus();
    } finally {
      if (attempts.finish(attempt)) mutation.reset();
    }
  }
  return {
    fieldErrors,
    isPending: mutation.isPending,
    newPassword,
    passwordConfirmation,
    summary,
    summaryRef,
    setNewPassword,
    setPasswordConfirmation,
    submit,
  };
}
