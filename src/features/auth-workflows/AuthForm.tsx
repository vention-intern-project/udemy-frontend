import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button, Input } from '@shared/ui/primitives';
import type { AuthField, AuthFieldErrors } from './validation';

export function AuthFormShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="auth-form" aria-labelledby="auth-form-title">
      <div className="auth-form__heading">
        <h1 id="auth-form-title">{title}</h1>
        <p>{description}</p>
      </div>
      {children}
      {footer ? <div className="auth-form__footer">{footer}</div> : null}
    </section>
  );
}

export const FormErrorAlert = forwardRef<HTMLDivElement, { summary: string }>(function FormErrorAlert({ summary }, ref) {
  return (
    <div ref={ref} className="auth-form__error-alert" role="alert" tabIndex={-1}>
      {summary}
    </div>
  );
});

export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange(value: string): void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (disabled) setVisible(false);
  }, [disabled]);
  return (
    <div className="auth-form__password">
      <Input
        id={id}
        label={label}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        value={value}
        error={error}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        trailingAction={(
          <Button
            className="auth-form__reveal"
            variant="ghost"
            size="sm"
            type="button"
            disabled={disabled}
            aria-controls={id}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" focusable="false" />
            ) : (
              <Eye aria-hidden="true" focusable="false" />
            )}
          </Button>
        )}
      />
    </div>
  );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="auth-form__link" to={to}>{children}</Link>;
}

export function useAuthErrorFocus(
  message: string | null,
  fields: AuthFieldErrors,
  fieldOrder: readonly AuthField[],
) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!message) return;
    const firstInvalidField = fieldOrder.find((field) => fields[field]);
    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus();
      return;
    }
    ref.current?.focus();
  }, [fieldOrder, fields, focusRequest, message]);
  return {
    ref,
    requestFocus: () => setFocusRequest((current) => current + 1),
  };
}

export interface SubmissionAttempt {
  readonly id: number;
  readonly signal: AbortSignal;
}

interface OwnedSubmissionAttempt extends SubmissionAttempt {
  readonly controller: AbortController;
}

export function useSubmissionAttemptLifecycle(ownerKey: string) {
  const lifecycle = useRef<{
    mounted: boolean;
    nextId: number;
    current: OwnedSubmissionAttempt | null;
  }>({ mounted: false, nextId: 0, current: null });

  useLayoutEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    return () => {
      const current = state.current;
      state.mounted = false;
      state.current = null;
      current?.controller.abort();
    };
  }, [ownerKey]);

  return {
    begin(): SubmissionAttempt | null {
      const state = lifecycle.current;
      if (!state.mounted || state.current) return null;
      const controller = new AbortController();
      const attempt: OwnedSubmissionAttempt = {
        id: state.nextId + 1,
        signal: controller.signal,
        controller,
      };
      state.nextId = attempt.id;
      state.current = attempt;
      return { id: attempt.id, signal: attempt.signal };
    },
    isCurrent(attempt: SubmissionAttempt): boolean {
      const state = lifecycle.current;
      return state.mounted
        && !attempt.signal.aborted
        && state.current?.id === attempt.id
        && state.current.signal === attempt.signal;
    },
    finish(attempt: SubmissionAttempt): boolean {
      const state = lifecycle.current;
      if (state.current?.id !== attempt.id || state.current.signal !== attempt.signal) return false;
      state.current = null;
      return state.mounted && !attempt.signal.aborted;
    },
  };
}
