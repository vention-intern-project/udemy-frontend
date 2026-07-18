import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from 'react';

import { FieldShell, useFieldA11y } from './Field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
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
        <textarea
          {...props}
          ref={ref}
          id={ids.controlId}
          required={required}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={ids.describedBy}
          className={['ui-control', 'ui-textarea', className].filter(Boolean).join(' ')}
        />
      </FieldShell>
    );
  },
);
