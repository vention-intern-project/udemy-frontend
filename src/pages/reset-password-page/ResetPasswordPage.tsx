import { useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  PasswordField,
  resolveAuthFieldErrors,
  resolveAuthMessage,
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
  const { t } = useTranslation();
  const workflow = useResetPasswordWorkflow({ ownerKey, token, onSuccess });
  const fieldErrors = resolveAuthFieldErrors(workflow.fieldErrors, t);
  const summary = resolveAuthMessage(workflow.summary, t);
  return (
    <AuthFormShell
      title={t('routes:resetPasswordTitle')}
      description={t('routes:resetPasswordDescription')}
      footer={
        <AuthLink to="/login" tone="primary">
          {t('auth:backToLogin')}
        </AuthLink>
      }
    >
      <form noValidate onSubmit={workflow.submit}>
        <p className={styles.tokenHelp}>{t('auth:resetTokenHelp')}</p>
        {summary && Object.keys(workflow.fieldErrors).length === 0 ? (
          <FormErrorAlert ref={workflow.summaryRef} summary={summary} />
        ) : null}
        <PasswordField
          id="password"
          name="newPassword"
          label={t('auth:newPassword')}
          autoComplete="new-password"
          value={workflow.newPassword}
          error={fieldErrors.password}
          disabled={workflow.isPending}
          onChange={workflow.setNewPassword}
        />
        <PasswordField
          id="passwordConfirmation"
          name="passwordConfirmation"
          label={t('auth:confirmNewPassword')}
          autoComplete="new-password"
          value={workflow.passwordConfirmation}
          error={fieldErrors.passwordConfirmation}
          disabled={workflow.isPending}
          onChange={workflow.setPasswordConfirmation}
        />
        <Button
          type="submit"
          fullWidth
          state={workflow.isPending ? 'loading' : 'idle'}
          loadingLabel={t('auth:resettingPassword')}
        >
          {t('routes:resetPasswordTitle')}
        </Button>
      </form>
    </AuthFormShell>
  );
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [successfulToken, setSuccessfulToken] = useState<string | null>(null);
  const resetSucceeded = successfulToken !== null && (!token || successfulToken === token);
  if (resetSucceeded)
    return (
      <AuthFormShell
        title={t('routes:resetPasswordTitle')}
        description={t('routes:resetPasswordDescription')}
        footer={
          <AuthLink to="/login" tone="primary">
            {t('auth:backToLogin')}
          </AuthLink>
        }
      >
        <Notice tone="success" title={t('auth:passwordResetComplete')}>
          {t('auth:passwordUpdated')}{' '}
          <AuthLink to="/login" tone="primary">
            {t('auth:logInWithYourNewPassword')}
          </AuthLink>
          .
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
