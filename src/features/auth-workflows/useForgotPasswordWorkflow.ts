import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type RefObject } from 'react';

import type { ForgotPasswordRequestDto } from '@entities/user';
import { useSession } from '@features/auth-session';

import { forgotPassword } from './api';
import { useAuthErrorFocus, useSubmissionAttemptLifecycle } from './AuthForm';
import { authWorkflowMutationKeys } from './mutation-keys';
import {
  compactFieldErrors,
  mapAuthFailure,
  validateEmail,
  type AuthFieldErrors,
} from './validation';

const FIELD_ORDER = ['email'] as const;

interface ForgotPasswordMutationVariables {
  readonly input: ForgotPasswordRequestDto;
  readonly signal: AbortSignal;
}

export interface ForgotPasswordWorkflow {
  readonly email: string;
  readonly fieldErrors: AuthFieldErrors;
  readonly isPending: boolean;
  readonly success: boolean;
  readonly summary: string | null;
  readonly summaryRef: RefObject<HTMLDivElement>;
  setEmail(value: string): void;
  submit(event: FormEvent): Promise<void>;
}

export function useForgotPasswordWorkflow(ownerKey: string): ForgotPasswordWorkflow {
  const session = useSession();
  const [email, setEmailValue] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(
    summary,
    fieldErrors,
    FIELD_ORDER,
  );
  const attempts = useSubmissionAttemptLifecycle(ownerKey);
  const mutation = useMutation({
    mutationKey: authWorkflowMutationKeys.forgotPassword,
    mutationFn: ({ input, signal }: ForgotPasswordMutationVariables) =>
      forgotPassword(session, input, signal),
    gcTime: 0,
    retry: false,
  });
  const setEmail = (value: string) => {
    setEmailValue(value);
    if (!fieldErrors.email) return;
    setFieldErrors({});
    setSummary(null);
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    const attempt = attempts.begin();
    if (!attempt) return;
    const input = { email: email.trim() };
    const validation = compactFieldErrors({ email: validateEmail(input.email) });
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setSummary('Review the highlighted field and submit again.');
      requestSummaryFocus();
      attempts.finish(attempt);
      return;
    }
    setFieldErrors({});
    setSummary(null);
    try {
      await mutation.mutateAsync({ input, signal: attempt.signal });
      if (!attempts.isCurrent(attempt)) return;
      setSuccess(true);
      setEmailValue('');
    } catch (error) {
      if (!attempts.isCurrent(attempt)) return;
      const failure = mapAuthFailure(error, 'forgot');
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
    success,
    summary,
    summaryRef,
    setEmail,
    submit,
  };
}
