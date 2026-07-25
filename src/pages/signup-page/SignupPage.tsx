import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';

import type { UserRoleDto } from '@entities/user';
import {
  AuthFormShell, AuthLink, FormErrorAlert, PasswordField, compactFieldErrors,
  mapAuthFailure, signup, useAuthErrorFocus, useSubmissionAttemptLifecycle, validateSignup,
  type AuthFieldErrors, type SignupInput,
} from '@features/auth-workflows';
import { useSession } from '@features/auth-session';
import { mutationKeys } from '@shared/api';
import { Button, Input, Select } from '@shared/ui/primitives';
import styles from './SignupPage.module.css';

const INITIAL: SignupInput = {
  email: '', name: '', surname: '', password: '', passwordConfirmation: '', role: 'student',
};
const FIELD_ORDER = ['email', 'name', 'surname', 'role', 'password', 'passwordConfirmation'] as const;

interface SignupMutationVariables {
  readonly values: SignupInput;
  readonly signal: AbortSignal;
}

export function SignupPage() {
  const session = useSession();
  const location = useLocation();
  const [input, setInput] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const { ref: summaryRef, requestFocus: requestSummaryFocus } = useAuthErrorFocus(summary, fieldErrors, FIELD_ORDER);
  const attempts = useSubmissionAttemptLifecycle(location.key);
  const mutation = useMutation({
    mutationKey: mutationKeys.auth.signup,
    mutationFn: ({ values, signal }: SignupMutationVariables) => (
      signup(session, values, signal)
    ),
    gcTime: 0,
    retry: false,
  });
  const update = <K extends keyof SignupInput>(key: K, value: SignupInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const attempt = attempts.begin();
    if (!attempt) return;
    const values = { ...input, email: input.email.trim(), name: input.name.trim(), surname: input.surname.trim() };
    const validation = compactFieldErrors(validateSignup(values));
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      setSummary('Review the highlighted fields and submit again.');
      requestSummaryFocus();
      attempts.finish(attempt);
      return;
    }
    setFieldErrors({}); setSummary(null);
    try {
      const token = await mutation.mutateAsync({ values, signal: attempt.signal });
      if (!attempts.isCurrent(attempt)) return;
      session.acceptAccessToken(token.accessToken);
      if (!attempts.isCurrent(attempt)) return;
      setInput((current) => ({ ...current, password: '', passwordConfirmation: '' }));
    } catch (error) {
      if (!attempts.isCurrent(attempt)) return;
      const failure = mapAuthFailure(error, 'signup');
      setFieldErrors(failure.fields);
      setSummary(failure.summary);
      requestSummaryFocus();
    } finally {
      if (attempts.finish(attempt)) mutation.reset();
    }
  }

  return (
    <AuthFormShell title="Create account" description="Create a LearnHub account to start learning or teaching."
      footer={<><span>Already have an account?</span> <AuthLink to="/login">Log in</AuthLink></>}>
      <form noValidate onSubmit={submit}>
        {summary && Object.keys(fieldErrors).length === 0 ? <FormErrorAlert ref={summaryRef} summary={summary} /> : null}
        <Input id="email" name="email" type="email" label="Email" autoComplete="email" required
          value={input.email} error={fieldErrors.email} disabled={mutation.isPending}
          onChange={(event) => update('email', event.currentTarget.value)} />
        <div className={styles.split}>
          <Input id="name" name="name" label="First name" autoComplete="given-name" required
            value={input.name} error={fieldErrors.name} disabled={mutation.isPending}
            onChange={(event) => update('name', event.currentTarget.value)} />
          <Input id="surname" name="surname" label="Last name" autoComplete="family-name" required
            value={input.surname} error={fieldErrors.surname} disabled={mutation.isPending}
            onChange={(event) => update('surname', event.currentTarget.value)} />
        </div>
        <Select id="role" name="role" label="Role" className={styles.rolePicker} required value={input.role} error={fieldErrors.role}
          disabled={mutation.isPending} onChange={(event) => update('role', event.currentTarget.value as UserRoleDto)}>
          <option value="student">Student</option><option value="instructor">Instructor</option><option value="admin">Admin</option>
        </Select>
        <PasswordField id="password" name="password" label="Password" autoComplete="new-password"
          value={input.password} error={fieldErrors.password} disabled={mutation.isPending}
          onChange={(value) => update('password', value)} />
        <PasswordField id="passwordConfirmation" name="passwordConfirmation" label="Confirm password" autoComplete="new-password"
          value={input.passwordConfirmation} error={fieldErrors.passwordConfirmation} disabled={mutation.isPending}
          onChange={(value) => update('passwordConfirmation', value)} />
        <Button type="submit" fullWidth state={mutation.isPending ? 'loading' : 'idle'} loadingLabel="Creating account...">
          Create account
        </Button>
      </form>
    </AuthFormShell>
  );
}
