import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import type { ForgotPasswordRequestDto } from '@entities/user';
import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  compactFieldErrors,
  forgotPassword,
  mapAuthFailure,
  useAuthErrorFocus,
  useSubmissionAttemptLifecycle,
  validateEmail,
  type AuthFieldErrors,
} from '@features/auth-workflows';
import { useSession } from '@features/auth-session';
import { mutationKeys } from '@shared/api';
import { Button, Input, Notice } from '@shared/ui/primitives';

const FIELD_ORDER = ['email'] as const;

interface ForgotPasswordMutationVariables {
  readonly input: ForgotPasswordRequestDto;
  readonly signal: AbortSignal;
}

export function ForgotPasswordPage() {
  const session = useSession();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(
    summary,
    fieldErrors,
    FIELD_ORDER,
  );
  const attempts = useSubmissionAttemptLifecycle(location.key);
  const mutation = useMutation({
    mutationKey: mutationKeys.auth.forgotPassword,
    mutationFn: ({ input, signal }: ForgotPasswordMutationVariables) =>
      forgotPassword(session, input, signal),
    gcTime: 0,
    retry: false,
  });
  const clearEmailError = () => {
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
      setEmail('');
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

  return (
    <AuthFormShell
      title="Forgot password"
      description="Request help signing back in to your account."
      footer={<AuthLink to="/login">Back to login</AuthLink>}
    >
      {searchParams.get('reason') === 'missing-token' ? (
        <Notice tone="warning" title="Use your reset link">
          Open the password-reset link from your recovery message to choose a new password.
        </Notice>
      ) : null}
      {success ? (
        <Notice tone="success" title="Request received">
          If the account can use password recovery, the next steps will be available through the
          configured recovery channel.
        </Notice>
      ) : (
        <form noValidate onSubmit={submit}>
          {summary && Object.keys(fieldErrors).length === 0 ? (
            <FormErrorAlert ref={summaryRef} summary={summary} />
          ) : null}
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            value={email}
            error={fieldErrors.email}
            disabled={mutation.isPending}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
              clearEmailError();
            }}
          />
          <Button
            type="submit"
            fullWidth
            state={mutation.isPending ? 'loading' : 'idle'}
            loadingLabel="Submitting request..."
          >
            Continue
          </Button>
        </form>
      )}
    </AuthFormShell>
  );
}
