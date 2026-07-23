import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import {
  AuthFormShell, AuthLink, FormErrorAlert, PasswordField, compactFieldErrors,
  mapAuthFailure, resetPassword, useAuthErrorFocus, useSubmissionAttemptLifecycle, validateReset,
  type AuthFieldErrors, type ResetPasswordInput,
} from '@features/auth-workflows';
import { useSession } from '@features/auth-session';
import { mutationKeys } from '@shared/api';
import { Button, Notice } from '@shared/ui/primitives';

const FIELD_ORDER = ['password', 'passwordConfirmation'] as const;

export function ResetPasswordPage() {
  const session = useSession();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(summary, fieldErrors, FIELD_ORDER);
  const attempts = useSubmissionAttemptLifecycle(location.key);
  const mutation = useMutation({
    mutationKey: mutationKeys.auth.resetPassword,
    mutationFn: ({ input, signal }: { input: ResetPasswordInput; signal: AbortSignal }) => (
      resetPassword(session, input, signal)
    ),
    gcTime: 0,
    retry: false,
  });

  if (!token) return <Navigate replace to="/forgot-password?reason=missing-token" />;

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
    setFieldErrors({}); setSummary(null);
    try {
      await mutation.mutateAsync({ input, signal: attempt.signal });
      if (!attempts.isCurrent(attempt)) return;
      setSuccess(true);
      setNewPassword('');
      setPasswordConfirmation('');
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
    <AuthFormShell title="Reset password" description="Choose a new password for your account."
      footer={<AuthLink to="/login">Back to login</AuthLink>}>
      {success ? (
        <Notice tone="success" title="Password reset complete">
          Your password has been updated. <AuthLink to="/login">Log in with your new password</AuthLink>.
        </Notice>
      ) : (
        <form className="auth-form__fields" noValidate onSubmit={submit}>
          <p className="auth-form__token-help">Your reset link supplies a private token. It stays hidden while you complete this form.</p>
          {summary && Object.keys(fieldErrors).length === 0 ? <FormErrorAlert ref={summaryRef} summary={summary} /> : null}
          <PasswordField id="password" name="newPassword" label="New password" autoComplete="new-password"
            value={newPassword} error={fieldErrors.password} disabled={mutation.isPending} onChange={setNewPassword} />
          <PasswordField id="passwordConfirmation" name="passwordConfirmation" label="Confirm new password" autoComplete="new-password"
            value={passwordConfirmation} error={fieldErrors.passwordConfirmation} disabled={mutation.isPending}
            onChange={setPasswordConfirmation} />
          <Button type="submit" fullWidth state={mutation.isPending ? 'loading' : 'idle'} loadingLabel="Resetting password...">
            Reset password
          </Button>
        </form>
      )}
    </AuthFormShell>
  );
}
