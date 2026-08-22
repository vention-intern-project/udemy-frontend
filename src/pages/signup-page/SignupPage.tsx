import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  PasswordField,
  resolveAuthFieldErrors,
  resolveAuthMessage,
  useSignupWorkflow,
} from '@features/auth-workflows';
import { sanitizeInternalReturnTo } from '@features/auth-session';
import { Button, Input } from '@shared/ui/primitives';
import { RolePicker } from './RolePicker';
import styles from './SignupPage.module.css';

export function SignupPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const returnTo = sanitizeInternalReturnTo(
    new URLSearchParams(location.search).get('returnTo'),
    globalThis.location?.origin,
  );
  const loginDestination = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
  const workflow = useSignupWorkflow(location.key);
  const fieldErrors = resolveAuthFieldErrors(workflow.fieldErrors, t);
  const summary = resolveAuthMessage(workflow.summary, t);
  return (
    <AuthFormShell
      title={t('routes:createAccountTitle')}
      description={t('routes:createAccountDescription')}
      footer={
        <>
          <span>{t('auth:alreadyHaveAnAccount')}</span>{' '}
          <AuthLink tone="primary" to={loginDestination}>
            {t('navigation:logIn')}
          </AuthLink>
        </>
      }
    >
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
          value={workflow.input.email}
          error={fieldErrors.email}
          disabled={workflow.isPending}
          onChange={(event) => workflow.update('email', event.currentTarget.value)}
        />
        <div className={styles.split}>
          <Input
            id="name"
            name="name"
            label={t('auth:firstName')}
            autoComplete="given-name"
            required
            value={workflow.input.name}
            error={fieldErrors.name}
            disabled={workflow.isPending}
            onChange={(event) => workflow.update('name', event.currentTarget.value)}
          />
          <Input
            id="surname"
            name="surname"
            label={t('auth:lastName')}
            autoComplete="family-name"
            required
            value={workflow.input.surname}
            error={fieldErrors.surname}
            disabled={workflow.isPending}
            onChange={(event) => workflow.update('surname', event.currentTarget.value)}
          />
        </div>
        <RolePicker
          value={workflow.input.role}
          error={fieldErrors.role}
          disabled={workflow.isPending}
          onChange={(role) => workflow.update('role', role)}
        />
        <PasswordField
          id="password"
          name="password"
          label={t('auth:password')}
          autoComplete="new-password"
          value={workflow.input.password}
          error={fieldErrors.password}
          disabled={workflow.isPending}
          onChange={(value) => workflow.update('password', value)}
        />
        <PasswordField
          id="passwordConfirmation"
          name="passwordConfirmation"
          label={t('auth:confirmPassword')}
          autoComplete="new-password"
          value={workflow.input.passwordConfirmation}
          error={fieldErrors.passwordConfirmation}
          disabled={workflow.isPending}
          onChange={(value) => workflow.update('passwordConfirmation', value)}
        />
        <Button
          type="submit"
          fullWidth
          state={workflow.isPending ? 'loading' : 'idle'}
          loadingLabel={t('auth:creatingAccount')}
        >
          {t('routes:createAccountTitle')}
        </Button>
      </form>
    </AuthFormShell>
  );
}
