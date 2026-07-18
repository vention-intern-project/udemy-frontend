import { useId, type ReactNode } from 'react';

import { joinIds } from '../../accessibility';

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
    <div className={['ui-field', className].filter(Boolean).join(' ')}>
      <label className="ui-field__label" htmlFor={controlId}>
        {label}
        {required ? (
          <span className="ui-field__required" aria-hidden="true">
            {' '}*
          </span>
        ) : null}
      </label>
      {children}
      {helpText ? (
        <div className="ui-field__help" id={helpId}>
          {helpText}
        </div>
      ) : null}
      {error ? (
        <div className="ui-field__error" id={errorId}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
