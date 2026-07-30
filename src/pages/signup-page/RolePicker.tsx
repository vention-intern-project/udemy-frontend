import { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { UserRoleDto } from '@entities/user';
import { FieldShell, useFieldA11y } from '@shared/ui/primitives';

import styles from './RolePicker.module.css';

interface RoleOption {
  readonly value: UserRoleDto;
  readonly label: string;
}

interface RolePickerProps {
  readonly value: UserRoleDto;
  readonly disabled: boolean;
  readonly error?: string;
  onChange(value: UserRoleDto): void;
}

const ROLE_OPTIONS: readonly RoleOption[] = [
  { value: 'student', label: 'Student' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'admin', label: 'Admin' },
];

export function RolePicker({ value, disabled, error, onChange }: RolePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const focusListboxRef = useRef(false);
  const ids = useFieldA11y({ id: 'role', hasHelp: false, hasError: Boolean(error) });
  const listboxId = `signup-role-options-${useId()}`;
  const selectedIndex = Math.max(
    0,
    ROLE_OPTIONS.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback((restoreFocus = false) => {
    focusListboxRef.current = false;
    setOpen(false);
    setActiveIndex(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const openListbox = useCallback(
    (index = selectedIndex, focusListbox = false) => {
      if (disabled) return;
      focusListboxRef.current = focusListbox;
      setActiveIndex(index);
      setOpen(true);
    },
    [disabled, selectedIndex],
  );
  const select = useCallback(
    (index: number) => {
      const option = ROLE_OPTIONS[index];
      if (!option) return;
      close(true);
      if (option.value !== value) onChange(option.value);
    },
    [close, onChange, value],
  );

  useEffect(() => close(), [close, value]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [close, open]);
  useEffect(() => {
    if (!open || !focusListboxRef.current) return;
    focusListboxRef.current = false;
    listboxRef.current?.focus();
  }, [open]);

  const selectedOption = ROLE_OPTIONS[selectedIndex] ?? ROLE_OPTIONS[0];
  const activeOptionId = activeIndex === null ? undefined : `${listboxId}-option-${activeIndex}`;

  return (
    <FieldShell {...ids} label="Role" required error={error}>
      <div
        ref={rootRef}
        className={[styles.control, open && styles.controlOpen].filter(Boolean).join(' ')}
      >
        <button
          ref={triggerRef}
          aria-controls={open ? listboxId : undefined}
          aria-describedby={ids.describedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          aria-required="true"
          className={styles.trigger}
          disabled={disabled}
          id={ids.controlId}
          type="button"
          onClick={() => {
            if (open) close();
            else openListbox(selectedIndex, true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openListbox(selectedIndex, true);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              openListbox(Math.min(selectedIndex + 1, ROLE_OPTIONS.length - 1), true);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              openListbox(Math.max(selectedIndex - 1, 0), true);
            }
          }}
        >
          <span>{selectedOption?.label}</span>
          <span className={styles.chevron} data-part="signup-role-chevron" aria-hidden="true" />
        </button>
        {open ? (
          <div
            ref={listboxRef}
            aria-activedescendant={activeOptionId}
            aria-label="Role options"
            className={styles.listbox}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(
                  Math.min((activeIndex ?? selectedIndex) + 1, ROLE_OPTIONS.length - 1),
                );
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(Math.max((activeIndex ?? selectedIndex) - 1, 0));
              } else if (event.key === 'Home') {
                event.preventDefault();
                setActiveIndex(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                setActiveIndex(ROLE_OPTIONS.length - 1);
              } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (activeIndex !== null) select(activeIndex);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
              } else if (event.key === 'Tab') {
                close();
              }
            }}
          >
            {ROLE_OPTIONS.map((option, index) => (
              <div
                key={option.value}
                aria-selected={option.value === value}
                className={[styles.option, activeIndex === index && styles.optionActive]
                  .filter(Boolean)
                  .join(' ')}
                id={`${listboxId}-option-${index}`}
                role="option"
                onClick={() => select(index)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className={styles.radio} data-part="signup-role-radio" aria-hidden="true" />
                {option.label}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}
