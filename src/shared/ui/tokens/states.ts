/**
 * Component state tokens
 *
 * Covers all 8 required component state variants:
 *   initial | loading | empty | success | error | disabled | focus | selected
 *
 * These tokens define the logical state names used across all components.
 * CSS custom property equivalents live in tokens.css.
 */

// ---------------------------------------------------------------------------
// Component state type
// ---------------------------------------------------------------------------
export type ComponentState =
  | 'initial'
  | 'loading'
  | 'empty'
  | 'success'
  | 'error'
  | 'disabled'
  | 'focus'
  | 'selected';

// ---------------------------------------------------------------------------
// State token map — maps each state to its semantic CSS variable names
// These CSS variable names are defined in tokens.css.
// ---------------------------------------------------------------------------
export const stateTokenMap: Readonly<Record<ComponentState, Readonly<{
  /** Background color CSS variable */
  bg: string;
  /** Foreground/text color CSS variable */
  fg: string;
  /** Border color CSS variable */
  border: string;
  /** aria attribute for the state (where applicable) */
  ariaAttr?: string;
}>>> = {
  initial: {
    bg: 'var(--color-surface)',
    fg: 'var(--text-primary)',
    border: 'var(--border-default)',
  },
  loading: {
    bg: 'var(--color-surface)',
    fg: 'var(--text-muted)',
    border: 'var(--border-default)',
    ariaAttr: 'aria-busy="true"',
  },
  empty: {
    bg: 'var(--color-canvas)',
    fg: 'var(--text-muted)',
    border: 'var(--border-default)',
  },
  success: {
    bg: 'var(--feedback-success-bg)',
    fg: 'var(--feedback-success)',
    border: 'var(--feedback-success)',
  },
  error: {
    bg: 'var(--feedback-error-bg)',
    fg: 'var(--feedback-error)',
    border: 'var(--feedback-error)',
    ariaAttr: 'aria-invalid="true"',
  },
  disabled: {
    bg: 'var(--state-disabled-bg)',
    fg: 'var(--state-disabled-text)',
    border: 'var(--border-default)',
    ariaAttr: 'aria-disabled="true"',
  },
  focus: {
    bg: 'var(--color-surface)',
    fg: 'var(--text-primary)',
    border: 'var(--focus-ring)',
    ariaAttr: 'data-focus-visible',
  },
  selected: {
    bg: 'var(--state-selected)',
    fg: 'var(--text-primary)',
    border: 'var(--action-primary-bg)',
    ariaAttr: 'aria-selected="true"',
  },
} as const;

// ---------------------------------------------------------------------------
// All valid component states (runtime tuple for iteration / validation)
// ---------------------------------------------------------------------------
export const ALL_COMPONENT_STATES: readonly ComponentState[] = [
  'initial',
  'loading',
  'empty',
  'success',
  'error',
  'disabled',
  'focus',
  'selected',
] as const;

// ---------------------------------------------------------------------------
// State-specific CSS classes (BEM modifier pattern for each state)
// ---------------------------------------------------------------------------
export const stateClassMap: Readonly<Record<ComponentState, string>> = {
  initial: '',
  loading: 'is-loading',
  empty: 'is-empty',
  success: 'is-success',
  error: 'is-error',
  disabled: 'is-disabled',
  focus: 'is-focus',
  selected: 'is-selected',
} as const;
