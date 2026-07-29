import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button, Input } from '@shared/ui/primitives';
import type { AuthField, AuthFieldErrors } from './validation';
import styles from './AuthForm.module.css';

interface AuthFormShellProps {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

interface FormErrorAlertProps {
  readonly summary: string;
}

interface PasswordFieldProps {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly autoComplete: string;
  readonly value: string;
  readonly error?: string;
  readonly disabled?: boolean;
  onChange(value: string): void;
}

interface AuthLinkProps {
  readonly to: string;
  readonly children: ReactNode;
  readonly tone?: AuthLinkTone;
}

type AuthLinkTone = 'default' | 'primary';

const AUTH_LINK_CLASS_BY_TONE: Record<AuthLinkTone, string> = {
  default: styles.link,
  primary: `${styles.link} ${styles.linkPrimary}`,
};

export function AuthFormShell({ title, description, children, footer }: AuthFormShellProps) {
  const headingId = useId();
  return (
    <section className={styles.root} aria-labelledby={headingId}>
      <div className={styles.heading}>
        <h1 id={headingId}>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}

export const FormErrorAlert = forwardRef<HTMLDivElement, FormErrorAlertProps>(
  function FormErrorAlert({ summary }, ref) {
    return (
      <div ref={ref} className={styles.errorAlert} role="alert" tabIndex={-1}>
        {summary}
      </div>
    );
  },
);

export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  error,
  disabled,
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (disabled) setVisible(false);
  }, [disabled]);
  return (
    <div className={styles.password}>
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
        trailingAction={
          <Button
            className={styles.reveal}
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
        }
      />
    </div>
  );
}

export function AuthLink({ to, children, tone = 'default' }: AuthLinkProps) {
  return (
    <Link className={AUTH_LINK_CLASS_BY_TONE[tone]} to={to}>
      {children}
    </Link>
  );
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

interface SubmissionAttemptLifecycleState {
  mounted: boolean;
  nextId: number;
  current: OwnedSubmissionAttempt | null;
}

export function useSubmissionAttemptLifecycle(ownerKey: string) {
  const lifecycle = useRef<SubmissionAttemptLifecycleState>({
    mounted: false,
    nextId: 0,
    current: null,
  });

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
      return (
        state.mounted &&
        !attempt.signal.aborted &&
        state.current?.id === attempt.id &&
        state.current.signal === attempt.signal
      );
    },
    finish(attempt: SubmissionAttempt): boolean {
      const state = lifecycle.current;
      if (state.current?.id !== attempt.id || state.current.signal !== attempt.signal) return false;
      state.current = null;
      return state.mounted && !attempt.signal.aborted;
    },
  };
}
