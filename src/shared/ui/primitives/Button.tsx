import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { joinIds } from '../../accessibility';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type AsyncState = 'idle' | 'loading' | 'success' | 'error';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: AsyncState;
  loadingLabel?: ReactNode;
  statusMessage?: ReactNode;
  announceStatus?: boolean;
  fullWidth?: boolean;
}

const defaultStatus: Record<Exclude<AsyncState, 'idle'>, string> = {
  loading: 'Action in progress',
  success: 'Action completed',
  error: 'Action failed',
};

export function Button({
  variant = 'primary',
  size = 'md',
  state = 'idle',
  loadingLabel = 'Loading…',
  statusMessage,
  announceStatus = true,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  'aria-describedby': ariaDescribedBy,
  ...props
}: ButtonProps) {
  const statusId = `button-status-${useId()}`;
  const isLoading = state === 'loading';
  const message = state === 'idle' || !announceStatus
    ? null
    : (statusMessage ?? defaultStatus[state]);
  const stateIndicator = state === 'success' ? '✓' : state === 'error' ? '!' : null;

  return (
    <span className={fullWidth ? 'ui-button-wrap ui-button-wrap--full' : 'ui-button-wrap'}>
      <button
        {...props}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        aria-describedby={joinIds(ariaDescribedBy, message ? statusId : undefined)}
        data-state={state}
        className={[
          'ui-button',
          `ui-button--${variant}`,
          `ui-button--${size}`,
          fullWidth && 'ui-button--full',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isLoading ? <span className="ui-button__spinner" aria-hidden="true" /> : null}
        {stateIndicator ? (
          <span
            className="ui-button__state-icon"
            data-state-indicator={state}
            aria-hidden="true"
          >
            {stateIndicator}
          </span>
        ) : null}
        <span>{isLoading ? loadingLabel : children}</span>
      </button>
      {message ? (
        <span className="ui-sr-only" id={statusId} role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </span>
  );
}
