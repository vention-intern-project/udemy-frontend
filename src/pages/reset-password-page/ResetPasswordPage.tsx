import { useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  PasswordField,
  useResetPasswordWorkflow,
} from '@features/auth-workflows';
import { Button, Notice } from '@shared/ui/primitives';
import styles from './ResetPasswordPage.module.css';

interface ResetPasswordFormProps {
  readonly ownerKey: string;
  readonly token: string;
  onSuccess(): void;
}

function ResetPasswordForm({ ownerKey, token, onSuccess }: ResetPasswordFormProps) {
  const workflow = useResetPasswordWorkflow({ ownerKey, token, onSuccess });
  return (
    <AuthFormShell
      title="Reset password"
      description="Choose a new password for your account."
      footer={<AuthLink to="/login">Back to login</AuthLink>}
    >
      <form noValidate onSubmit={workflow.submit}>
        <p className={styles.tokenHelp}>
          Your reset link supplies a private token. It stays hidden while you complete this form.
        </p>
        {workflow.summary && Object.keys(workflow.fieldErrors).length === 0 ? (
          <FormErrorAlert ref={workflow.summaryRef} summary={workflow.summary} />
        ) : null}
        <PasswordField
          id="password"
          name="newPassword"
          label="New password"
          autoComplete="new-password"
          value={workflow.newPassword}
          error={workflow.fieldErrors.password}
          disabled={workflow.isPending}
          onChange={workflow.setNewPassword}
        />
        <PasswordField
          id="passwordConfirmation"
          name="passwordConfirmation"
          label="Confirm new password"
          autoComplete="new-password"
          value={workflow.passwordConfirmation}
          error={workflow.fieldErrors.passwordConfirmation}
          disabled={workflow.isPending}
          onChange={workflow.setPasswordConfirmation}
        />
        <Button
          type="submit"
          fullWidth
          state={workflow.isPending ? 'loading' : 'idle'}
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
  const [successfulToken, setSuccessfulToken] = useState<string | null>(null);
  const resetSucceeded = successfulToken !== null && (!token || successfulToken === token);
  if (resetSucceeded)
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
  if (token && searchParams.has('status'))
    return <Navigate replace to={`/reset-password?token=${encodeURIComponent(token)}`} />;
  if (!token) return <Navigate replace to="/forgot-password?reason=missing-token" />;
  return (
    <ResetPasswordForm
      key={token}
      ownerKey={location.key}
      token={token}
      onSuccess={() => setSuccessfulToken(token)}
    />
  );
}
