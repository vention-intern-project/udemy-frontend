/**
 * Token contract tests — Component state tokens
 *
 * Verifies all 8 required component state variants:
 *   initial | loading | empty | success | error | disabled | focus | selected
 *
 * Also verifies that each state has the required CSS variable references
 * and that the ALL_COMPONENT_STATES tuple is complete.
 *
 * NOTE: Requires `npm install` (Vitest) before execution.
 */
import { describe, it, expect } from 'vitest';
import {
  stateTokenMap,
  ALL_COMPONENT_STATES,
  stateClassMap,
  type ComponentState,
} from '../../../src/shared/ui/tokens/states';

const REQUIRED_STATES: ComponentState[] = [
  'initial',
  'loading',
  'empty',
  'success',
  'error',
  'disabled',
  'focus',
  'selected',
];

describe('Component state tokens', () => {
  describe('ALL_COMPONENT_STATES completeness', () => {
    it('should define exactly 8 states', () => {
      expect(ALL_COMPONENT_STATES).toHaveLength(8);
    });

    it.each(REQUIRED_STATES)('should include state: %s', (state) => {
      expect(ALL_COMPONENT_STATES).toContain(state);
    });
  });

  describe('stateTokenMap structure', () => {
    it.each(REQUIRED_STATES)('state "%s" should have a bg token', (state) => {
      expect(stateTokenMap[state]).toBeDefined();
      expect(stateTokenMap[state].bg).toBeTruthy();
    });

    it.each(REQUIRED_STATES)('state "%s" should have a fg token', (state) => {
      expect(stateTokenMap[state].fg).toBeTruthy();
    });

    it.each(REQUIRED_STATES)('state "%s" should have a border token', (state) => {
      expect(stateTokenMap[state].border).toBeTruthy();
    });

    it.each(REQUIRED_STATES)(
      'state "%s" bg/fg/border tokens should reference CSS variables',
      (state) => {
        const { bg, fg, border } = stateTokenMap[state];
        // Each token should be a CSS var reference or a valid value
        const isVar = (v: string) => v.startsWith('var(') || v.startsWith('#') || v.startsWith('rgba');
        expect(isVar(bg)).toBe(true);
        expect(isVar(fg)).toBe(true);
        expect(isVar(border)).toBe(true);
      },
    );
  });

  describe('State: initial', () => {
    it('should use base surface token for bg', () => {
      expect(stateTokenMap.initial.bg).toBe('var(--color-surface)');
    });

    it('should use primary text token for fg', () => {
      expect(stateTokenMap.initial.fg).toBe('var(--text-primary)');
    });

    it('should not require an aria attribute', () => {
      expect(stateTokenMap.initial.ariaAttr).toBeUndefined();
    });
  });

  describe('State: loading', () => {
    it('should use surface bg', () => {
      expect(stateTokenMap.loading.bg).toBe('var(--color-surface)');
    });

    it('should use muted text for fg', () => {
      expect(stateTokenMap.loading.fg).toBe('var(--text-muted)');
    });

    it('should include aria-busy attribute', () => {
      expect(stateTokenMap.loading.ariaAttr).toContain('aria-busy');
    });
  });

  describe('State: empty', () => {
    it('should use canvas (not surface) for bg', () => {
      expect(stateTokenMap.empty.bg).toBe('var(--color-canvas)');
    });

    it('should use muted text for fg', () => {
      expect(stateTokenMap.empty.fg).toBe('var(--text-muted)');
    });
  });

  describe('State: success', () => {
    it('should use feedback-success-bg for bg', () => {
      expect(stateTokenMap.success.bg).toBe('var(--feedback-success-bg)');
    });

    it('should use feedback-success for fg', () => {
      expect(stateTokenMap.success.fg).toBe('var(--feedback-success)');
    });

    it('should use feedback-success for border', () => {
      expect(stateTokenMap.success.border).toBe('var(--feedback-success)');
    });
  });

  describe('State: error', () => {
    it('should use feedback-error-bg for bg', () => {
      expect(stateTokenMap.error.bg).toBe('var(--feedback-error-bg)');
    });

    it('should use feedback-error for fg', () => {
      expect(stateTokenMap.error.fg).toBe('var(--feedback-error)');
    });

    it('should include aria-invalid attribute', () => {
      expect(stateTokenMap.error.ariaAttr).toContain('aria-invalid');
    });
  });

  describe('State: disabled', () => {
    it('should use state-disabled-bg for bg', () => {
      expect(stateTokenMap.disabled.bg).toBe('var(--state-disabled-bg)');
    });

    it('should use state-disabled-text for fg', () => {
      expect(stateTokenMap.disabled.fg).toBe('var(--state-disabled-text)');
    });

    it('should include aria-disabled attribute', () => {
      expect(stateTokenMap.disabled.ariaAttr).toContain('aria-disabled');
    });
  });

  describe('State: focus', () => {
    it('should use focus-ring token for border', () => {
      expect(stateTokenMap.focus.border).toBe('var(--focus-ring)');
    });

    it('should include focus-visible indicator', () => {
      expect(stateTokenMap.focus.ariaAttr).toContain('focus-visible');
    });
  });

  describe('State: selected', () => {
    it('should use state-selected bg', () => {
      expect(stateTokenMap.selected.bg).toBe('var(--state-selected)');
    });

    it('should use primary action bg for border', () => {
      expect(stateTokenMap.selected.border).toBe('var(--action-primary-bg)');
    });

    it('should include aria-selected attribute', () => {
      expect(stateTokenMap.selected.ariaAttr).toContain('aria-selected');
    });
  });

  describe('stateClassMap', () => {
    it.each(REQUIRED_STATES)('state "%s" should have a class mapping', (state) => {
      expect(stateClassMap[state]).toBeDefined();
    });

    it('initial state should map to empty string (no modifier)', () => {
      expect(stateClassMap.initial).toBe('');
    });

    it('loading state should map to is-loading class', () => {
      expect(stateClassMap.loading).toBe('is-loading');
    });

    it('error state should map to is-error class', () => {
      expect(stateClassMap.error).toBe('is-error');
    });

    it('disabled state should map to is-disabled class', () => {
      expect(stateClassMap.disabled).toBe('is-disabled');
    });

    it('selected state should map to is-selected class', () => {
      expect(stateClassMap.selected).toBe('is-selected');
    });
  });
});
