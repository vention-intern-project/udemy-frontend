import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  PasswordField,
  useLoginWorkflow,
} from '@features/auth-workflows';
import { sanitizeInternalReturnTo } from '@features/auth-session';
import { Button, Input } from '@shared/ui/primitives';

export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const returnTo = sanitizeInternalReturnTo(
    new URLSearchParams(location.search).get('returnTo'),
    globalThis.location?.origin,
  );
  const signupDestination = returnTo
    ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
    : '/signup';
  const workflow = useLoginWorkflow(location.key);
  return (
    <AuthFormShell
      title={t('navigation:logIn')}
      description={
        returnTo === '/cart' ? t('auth:logInWithAStudentAccount') : t('routes:loginDescription')
      }
      footer={
        <>
          <span>{t('auth:newToLearnhub')}</span>{' '}
          <AuthLink tone="primary" to={signupDestination}>
            {t('auth:createAnAccount')}
          </AuthLink>
        </>
      }
    >
      <form noValidate onSubmit={workflow.submit}>
        {workflow.summary && Object.keys(workflow.fieldErrors).length === 0 ? (
          <FormErrorAlert ref={workflow.summaryRef} summary={workflow.summary} />
        ) : null}
        <Input
          id="email"
          name="email"
          type="email"
          label={t('auth:email')}
          autoComplete="email"
          required
          value={workflow.email}
          error={workflow.fieldErrors.email}
          disabled={workflow.isPending}
          onChange={(event) => workflow.setEmail(event.currentTarget.value)}
        />
        <PasswordField
          id="password"
          name="password"
          label={t('auth:password')}
          autoComplete="current-password"
          value={workflow.password}
          error={workflow.fieldErrors.password}
          disabled={workflow.isPending}
          onChange={workflow.setPassword}
        />
        <AuthLink tone="primary" to="/forgot-password">
          {t('auth:forgotYourPassword')}
        </AuthLink>
        <Button
          type="submit"
          fullWidth
          state={workflow.isPending ? 'loading' : 'idle'}
          loadingLabel={t('auth:loggingIn')}
        >
          {t('navigation:logIn')}
        </Button>
      </form>
    </AuthFormShell>
  );
}
