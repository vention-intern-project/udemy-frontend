import { useLocation } from 'react-router-dom';

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
      title="Log in"
      description={
        returnTo === '/cart'
          ? 'Log in with a student account to view your cart and continue checkout.'
          : 'Access your learning or instructor workspace.'
      }
      footer={
        <>
          <span>New to LearnHub?</span>{' '}
          <AuthLink tone="primary" to={signupDestination}>
            Create an account
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
          label="Email"
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
          label="Password"
          autoComplete="current-password"
          value={workflow.password}
          error={workflow.fieldErrors.password}
          disabled={workflow.isPending}
          onChange={workflow.setPassword}
        />
        <AuthLink tone="primary" to="/forgot-password">
          Forgot your password?
        </AuthLink>
        <Button
          type="submit"
          fullWidth
          state={workflow.isPending ? 'loading' : 'idle'}
          loadingLabel="Logging in..."
        >
          Log in
        </Button>
      </form>
    </AuthFormShell>
  );
}
