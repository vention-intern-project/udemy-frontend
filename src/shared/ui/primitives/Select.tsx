import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';

import { FieldShell, useFieldA11y } from './Field';
import styles from './Select.module.css';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
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
    children,
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
      <select
        {...props}
        ref={ref}
        id={ids.controlId}
        required={required}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={ids.describedBy}
        className={[styles.control, 'ui-control', 'ui-select', className].filter(Boolean).join(' ')}
        data-part="control"
      >
        {children}
      </select>
    </FieldShell>
  );
});
