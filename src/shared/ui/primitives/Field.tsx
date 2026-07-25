import { useId, type ReactNode } from 'react';

import { joinIds } from '../../accessibility';
import styles from './Field.module.css';

interface FieldA11yOptions {
  id?: string;
  describedBy?: string;
  hasHelp: boolean;
  hasError: boolean;
}

export function useFieldA11y({
  id,
  describedBy,
  hasHelp,
  hasError,
}: FieldA11yOptions) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const helpId = hasHelp ? `${controlId}-help` : undefined;
  const errorId = hasError ? `${controlId}-error` : undefined;

  return {
    controlId,
    helpId,
    errorId,
    describedBy: joinIds(describedBy, helpId, errorId),
  };
}

interface FieldShellProps {
  controlId: string;
  label: ReactNode;
  required?: boolean;
  helpText?: ReactNode;
  error?: ReactNode;
  helpId?: string;
  errorId?: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  controlId,
  label,
  required,
  helpText,
  error,
  helpId,
  errorId,
  children,
  className,
}: FieldShellProps) {
  return (
    <div
      className={[styles.field, 'ui-field', className].filter(Boolean).join(' ')}
      data-part="field"
    >
      <label
        className={[styles.label, 'ui-field__label'].join(' ')}
        data-part="label"
        htmlFor={controlId}
      >
        {label}
        {required ? (
          <span className={[styles.required, 'ui-field__required'].join(' ')} aria-hidden="true">
            {' '}*
          </span>
        ) : null}
      </label>
      {children}
      {helpText ? (
        <div className={[styles.help, 'ui-field__help'].join(' ')} data-part="help" id={helpId}>
          {helpText}
        </div>
      ) : null}
      {error ? (
        <div className={[styles.error, 'ui-field__error'].join(' ')} data-part="error" id={errorId}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
