import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import type { LoginRequestDto } from '@entities/user';
import {
  AuthFormShell,
  AuthLink,
  FormErrorAlert,
  PasswordField,
  compactFieldErrors,
  login,
  mapAuthFailure,
  useAuthErrorFocus,
  useSubmissionAttemptLifecycle,
  validateLogin,
  type AuthFieldErrors,
} from '@features/auth-workflows';
import { useSession } from '@features/auth-session';
import { mutationKeys } from '@shared/api';
import { Button, Input } from '@shared/ui/primitives';

const FIELD_ORDER = ['email', 'password'] as const;

interface LoginMutationVariables {
  readonly input: LoginRequestDto;
  readonly signal: AbortSignal;
}

export function LoginPage() {
  const session = useSession();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(summary, fieldErrors, FIELD_ORDER);
  const attempts = useSubmissionAttemptLifecycle(location.key);
  const mutation = useMutation({
    mutationKey: mutationKeys.auth.login,
    mutationFn: ({ input, signal }: LoginMutationVariables) => login(session, input, signal),
    gcTime: 0,
    retry: false,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const attempt = attempts.begin();
    if (!attempt) return;
    const input = { email: email.trim(), password };
    const validation = compactFieldErrors(validateLogin(input));
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
      const token = await mutation.mutateAsync({ input, signal: attempt.signal });
      if (!attempts.isCurrent(attempt)) return;
      session.acceptAccessToken(token.accessToken);
      if (!attempts.isCurrent(attempt)) return;
      setPassword('');
    } catch (error) {
      if (!attempts.isCurrent(attempt)) return;
      const failure = mapAuthFailure(error, 'login');
      setFieldErrors(failure.fields);
      setSummary(failure.summary);
      requestSummaryFocus();
    } finally {
      if (attempts.finish(attempt)) mutation.reset();
    }
  }

  return (
    <AuthFormShell
      title="Log in"
      description="Access your learning or instructor workspace."
      footer={<><span>New to LearnHub?</span> <AuthLink to="/signup">Create an account</AuthLink></>}
    >
      <form className="auth-form__fields" noValidate onSubmit={submit}>
        {summary && Object.keys(fieldErrors).length === 0 ? <FormErrorAlert ref={summaryRef} summary={summary} /> : null}
        <Input id="email" name="email" type="email" label="Email" autoComplete="email" required
          value={email} error={fieldErrors.email} disabled={mutation.isPending}
          onChange={(event) => setEmail(event.currentTarget.value)} />
        <PasswordField id="password" name="password" label="Password" autoComplete="current-password"
          value={password} error={fieldErrors.password} disabled={mutation.isPending} onChange={setPassword} />
        <AuthLink to="/forgot-password">Forgot your password?</AuthLink>
        <Button type="submit" fullWidth state={mutation.isPending ? 'loading' : 'idle'}
          loadingLabel="Logging in...">Log in</Button>
      </form>
    </AuthFormShell>
  );
}
