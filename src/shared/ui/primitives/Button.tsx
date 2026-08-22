import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { joinIds } from '../../accessibility';
import styles from './Button.module.css';
import { VisuallyHidden } from './VisuallyHidden';

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

export function Button({
  variant = 'primary',
  size = 'md',
  state = 'idle',
  loadingLabel,
  statusMessage,
  announceStatus = true,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  'aria-busy': ariaBusy,
  'aria-describedby': ariaDescribedBy,
  ...props
}: ButtonProps) {
  const { t } = useTranslation();
  const defaultStatus: Record<Exclude<AsyncState, 'idle'>, string> = {
    loading: t('a11y:actionInProgress', { defaultValue: 'Action in progress' }),
    success: t('a11y:actionCompleted', { defaultValue: 'Action completed' }),
    error: t('a11y:actionFailed', { defaultValue: 'Action failed' }),
  };
  const statusId = `button-status-${useId()}`;
  const isLoading = state === 'loading';
  const message =
    state === 'idle' || !announceStatus ? null : (statusMessage ?? defaultStatus[state]);
  const stateIndicator = state === 'success' ? '✓' : state === 'error' ? '!' : null;

  return (
    <span
      className={[
        styles.wrapper,
        fullWidth && styles.wrapperFull,
        'ui-button-wrap',
        fullWidth && 'ui-button-wrap--full',
      ]
        .filter(Boolean)
        .join(' ')}
      data-part="button-wrapper"
    >
      <button
        {...props}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? true : ariaBusy}
        aria-describedby={joinIds(ariaDescribedBy, message ? statusId : undefined)}
        data-state={state}
        className={[
          styles.button,
          styles[variant],
          styles[size],
          fullWidth && styles.full,
          'ui-button',
          `ui-button--${variant}`,
          `ui-button--${size}`,
          fullWidth && 'ui-button--full',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isLoading ? (
          <span
            className={[styles.spinner, 'ui-button__spinner'].join(' ')}
            data-part="spinner"
            aria-hidden="true"
          />
        ) : null}
        {stateIndicator ? (
          <span
            className={[styles.stateIcon, 'ui-button__state-icon'].join(' ')}
            data-state-indicator={state}
            aria-hidden="true"
          >
            {stateIndicator}
          </span>
        ) : null}
        <span>
          {isLoading
            ? (loadingLabel ?? t('common:loading', { defaultValue: 'Loading…' }))
            : children}
        </span>
      </button>
      {message ? (
        <VisuallyHidden id={statusId} role="status" aria-live="polite">
          {message}
        </VisuallyHidden>
      ) : null}
    </span>
  );
}
