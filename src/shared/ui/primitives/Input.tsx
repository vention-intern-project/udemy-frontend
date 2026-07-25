import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { FieldShell, useFieldA11y } from './Field';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  trailingAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helpText,
    error,
    fieldClassName,
    trailingAction,
    className,
    required,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const ids = useFieldA11y({
    id,
    describedBy: ariaDescribedBy,
    hasHelp: Boolean(helpText),
    hasError: Boolean(error),
  });

  const control = (
    <input
      {...props}
      ref={ref}
      id={ids.controlId}
      required={required}
      aria-invalid={error ? true : ariaInvalid}
      aria-describedby={ids.describedBy}
      className={[
        styles.control,
        trailingAction && styles.withTrailingAction,
        'ui-control',
        'ui-input',
        trailingAction && 'ui-input--with-trailing-action',
        className,
      ].filter(Boolean).join(' ')}
      data-part="control"
    />
  );

  return (
    <FieldShell
      {...ids}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      className={fieldClassName}
    >
      {trailingAction ? (
        <div
          className={[styles.controlFrame, 'ui-control-frame'].join(' ')}
          data-part="control-frame"
        >
          {control}
          <div
            className={[styles.trailingAction, 'ui-control-frame__trailing-action'].join(' ')}
            data-part="trailing-action"
          >
            {trailingAction}
          </div>
        </div>
      ) : control}
    </FieldShell>
  );
});
