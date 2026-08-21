import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  resolveAuthFieldErrors,
  resolveAuthMessage,
  useForgotPasswordWorkflow,
} from '@features/auth-workflows';
import { Button, Input, Notice } from '@shared/ui/primitives';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const workflow = useForgotPasswordWorkflow(location.key);
  const fieldErrors = resolveAuthFieldErrors(workflow.fieldErrors, t);
  const summary = resolveAuthMessage(workflow.summary, t);
  return (
    <AuthFormShell
      title={t('routes:forgotPasswordTitle')}
      description={t('routes:forgotPasswordDescription')}
      footer={<AuthLink to="/login">{t('auth:backToLogin')}</AuthLink>}
    >
      {searchParams.get('reason') === 'missing-token' ? (
        <Notice tone="warning" title={t('auth:useYourResetLink')}>
          {t('auth:openRecoveryLink')}
        </Notice>
      ) : null}
      {workflow.success ? (
        <Notice tone="success" title={t('auth:requestReceived')}>
          {t('auth:recoveryChannel')}
        </Notice>
      ) : (
        <form noValidate onSubmit={workflow.submit}>
          {summary && Object.keys(workflow.fieldErrors).length === 0 ? (
            <FormErrorAlert ref={workflow.summaryRef} summary={summary} />
          ) : null}
          <Input
            id="email"
            name="email"
            type="email"
            label={t('auth:email')}
            autoComplete="email"
            required
            value={workflow.email}
            error={fieldErrors.email}
            disabled={workflow.isPending}
            onChange={(event) => workflow.setEmail(event.currentTarget.value)}
          />
          <Button
            type="submit"
            fullWidth
            state={workflow.isPending ? 'loading' : 'idle'}
            loadingLabel={t('auth:submittingRequest')}
          >
            {t('common:continue')}
          </Button>
        </form>
      )}
    </AuthFormShell>
  );
}
