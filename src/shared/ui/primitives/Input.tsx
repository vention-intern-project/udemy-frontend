import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { FieldShell, useFieldA11y } from './Field';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helpText,
    error,
    fieldClassName,
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

  return (
    <FieldShell
      {...ids}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      className={fieldClassName}
    >
      <input
        {...props}
        ref={ref}
        id={ids.controlId}
        required={required}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={ids.describedBy}
        className={['ui-control', 'ui-input', className].filter(Boolean).join(' ')}
      />
    </FieldShell>
  );
});
