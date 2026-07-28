import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  PasswordField,
  compactFieldErrors,
  mapAuthFailure,
  resetPassword,
  useAuthErrorFocus,
  useSubmissionAttemptLifecycle,
  validateReset,
  type AuthFieldErrors,
  type ResetPasswordInput,
} from '@features/auth-workflows';
import { useSession } from '@features/auth-session';
import { mutationKeys } from '@shared/api';
import { Button, Notice } from '@shared/ui/primitives';
import styles from './ResetPasswordPage.module.css';

const FIELD_ORDER = ['password', 'passwordConfirmation'] as const;

interface ResetPasswordMutationVariables {
  readonly input: ResetPasswordInput;
  readonly signal: AbortSignal;
}

interface ResetPasswordFormProps {
  readonly ownerKey: string;
  readonly token: string;
}

function ResetPasswordForm({ ownerKey, token }: ResetPasswordFormProps) {
  const session = useSession();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(
    summary,
    fieldErrors,
    FIELD_ORDER,
  );
  const attempts = useSubmissionAttemptLifecycle(ownerKey);
  const mutation = useMutation({
    mutationKey: mutationKeys.auth.resetPassword,
    mutationFn: ({ input, signal }: ResetPasswordMutationVariables) =>
      resetPassword(session, input, signal),
    gcTime: 0,
    retry: false,
  });

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
      navigate('/reset-password?status=success', { replace: true });
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

  return (
    <AuthFormShell
      title="Reset password"
      description="Choose a new password for your account."
      footer={<AuthLink to="/login">Back to login</AuthLink>}
    >
      <form noValidate onSubmit={submit}>
        <p className={styles.tokenHelp}>
          Your reset link supplies a private token. It stays hidden while you complete this form.
        </p>
        {summary && Object.keys(fieldErrors).length === 0 ? (
          <FormErrorAlert ref={summaryRef} summary={summary} />
        ) : null}
        <PasswordField
          id="password"
          name="newPassword"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          error={fieldErrors.password}
          disabled={mutation.isPending}
          onChange={setNewPassword}
        />
        <PasswordField
          id="passwordConfirmation"
          name="passwordConfirmation"
          label="Confirm new password"
          autoComplete="new-password"
          value={passwordConfirmation}
          error={fieldErrors.passwordConfirmation}
          disabled={mutation.isPending}
          onChange={setPasswordConfirmation}
        />
        <Button
          type="submit"
          fullWidth
          state={mutation.isPending ? 'loading' : 'idle'}
          loadingLabel="Resetting password..."
        >
          Reset password
        </Button>
      </form>
    </AuthFormShell>
  );
}

export function ResetPasswordPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const resetSucceeded = searchParams.get('status') === 'success';

  if (resetSucceeded && token) return <Navigate replace to="/reset-password?status=success" />;
  if (resetSucceeded) {
    return (
      <AuthFormShell
        title="Reset password"
        description="Choose a new password for your account."
        footer={<AuthLink to="/login">Back to login</AuthLink>}
      >
        <Notice tone="success" title="Password reset complete">
          Your password has been updated.{' '}
          <AuthLink to="/login">Log in with your new password</AuthLink>.
        </Notice>
      </AuthFormShell>
    );
  }
  if (!token) return <Navigate replace to="/forgot-password?reason=missing-token" />;

  return <ResetPasswordForm key={token} ownerKey={location.key} token={token} />;
}
