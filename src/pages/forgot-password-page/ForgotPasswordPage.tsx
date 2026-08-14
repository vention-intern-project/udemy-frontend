import { useLocation, useSearchParams } from 'react-router-dom';

import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  useForgotPasswordWorkflow,
} from '@features/auth-workflows';
import { Button, Input, Notice } from '@shared/ui/primitives';

export function ForgotPasswordPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const workflow = useForgotPasswordWorkflow(location.key);
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
      {workflow.success ? (
        <Notice tone="success" title="Request received">
          If the account can use password recovery, the next steps will be available through the
          configured recovery channel.
        </Notice>
      ) : (
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
          <Button
            type="submit"
            fullWidth
            state={workflow.isPending ? 'loading' : 'idle'}
            loadingLabel="Submitting request..."
          >
            Continue
          </Button>
        </form>
      )}
    </AuthFormShell>
  );
}
