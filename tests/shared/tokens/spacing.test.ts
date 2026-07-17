/**
 * Token contract tests — Spacing tokens
 *
 * Verifies the 4px base unit, 8-step scale, control heights, and layout tokens.
 *
 * NOTE: Requires `npm install` (Vitest) before execution.
 */
import { describe, it, expect } from 'vitest';
import {
  SPACING_BASE,
  SPACING_1,
  SPACING_2,
  SPACING_3,
  SPACING_4,
  SPACING_6,
  SPACING_8,
  SPACING_12,
  SPACING_16,
  spacing,
  CONTROL_HEIGHT_SM,
  CONTROL_HEIGHT_MD,
  CONTROL_HEIGHT_LG,
  INPUT_PADDING_HORIZONTAL,
  CARD_INNER_SPACING_MARKETPLACE,
  CARD_INNER_SPACING_WORKSPACE,
  FORM_FIELD_STACK_GAP,
  SECTION_SPACING_DEFAULT,
  SECTION_SPACING_MAJOR,
  LAYOUT_HEADER_HEIGHT,
  CONTAINER_MAX_WIDTH_PUBLIC,
  CONTAINER_MAX_WIDTH_WORKSPACE,
  GUTTER_MOBILE,
  GUTTER_TABLET,
  spacingTokens,
} from '@shared/ui/tokens/spacing';

describe('Spacing tokens', () => {
  describe('Base unit', () => {
    it('SPACING_BASE should be 4', () => {
      expect(SPACING_BASE).toBe(4);
    });
  });

  describe('4px-grid scale', () => {
    it('SPACING_1 should be 4 (1 × 4px)', () => {
      expect(SPACING_1).toBe(4);
    });

    it('SPACING_2 should be 8 (2 × 4px)', () => {
      expect(SPACING_2).toBe(8);
    });

    it('SPACING_3 should be 12 (3 × 4px)', () => {
      expect(SPACING_3).toBe(12);
    });

    it('SPACING_4 should be 16 (4 × 4px)', () => {
      expect(SPACING_4).toBe(16);
    });

    it('SPACING_6 should be 24 (6 × 4px)', () => {
      expect(SPACING_6).toBe(24);
    });

    it('SPACING_8 should be 32 (8 × 4px)', () => {
      expect(SPACING_8).toBe(32);
    });

    it('SPACING_12 should be 48 (12 × 4px)', () => {
      expect(SPACING_12).toBe(48);
    });

    it('SPACING_16 should be 64 (16 × 4px)', () => {
      expect(SPACING_16).toBe(64);
    });

    it('all scale values should be multiples of 4', () => {
      const scaleValues = [SPACING_1, SPACING_2, SPACING_3, SPACING_4,
                           SPACING_6, SPACING_8, SPACING_12, SPACING_16];
      for (const value of scaleValues) {
        expect(value % 4).toBe(0);
      }
    });
  });

  describe('Named spacing aliases', () => {
    it('spacing.xs should be 4', () => {
      expect(spacing.xs).toBe(4);
    });

    it('spacing.sm should be 8', () => {
      expect(spacing.sm).toBe(8);
    });

    it('spacing.md should be 16', () => {
      expect(spacing.md).toBe(16);
    });

    it('spacing.lg should be 24', () => {
      expect(spacing.lg).toBe(24);
    });

    it('spacing.xl should be 32', () => {
      expect(spacing.xl).toBe(32);
    });

    it('spacing.xl2 should be 48', () => {
      expect(spacing.xl2).toBe(48);
    });

    it('spacing.xl3 should be 64', () => {
      expect(spacing.xl3).toBe(64);
    });
  });

  describe('Control heights', () => {
    it('CONTROL_HEIGHT_SM should be 36', () => {
      expect(CONTROL_HEIGHT_SM).toBe(36);
    });

    it('CONTROL_HEIGHT_MD should be 44 (minimum touch target)', () => {
      expect(CONTROL_HEIGHT_MD).toBe(44);
    });

    it('CONTROL_HEIGHT_LG should be 52', () => {
      expect(CONTROL_HEIGHT_LG).toBe(52);
    });

    it('CONTROL_HEIGHT_MD should be >= 44 for WCAG touch target', () => {
      expect(CONTROL_HEIGHT_MD).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Component-specific spacing', () => {
    it('INPUT_PADDING_HORIZONTAL should be 12', () => {
      expect(INPUT_PADDING_HORIZONTAL).toBe(12);
    });

    it('CARD_INNER_SPACING_MARKETPLACE should be 16', () => {
      expect(CARD_INNER_SPACING_MARKETPLACE).toBe(16);
    });

    it('CARD_INNER_SPACING_WORKSPACE should be 12', () => {
      expect(CARD_INNER_SPACING_WORKSPACE).toBe(12);
    });

    it('FORM_FIELD_STACK_GAP should be 16', () => {
      expect(FORM_FIELD_STACK_GAP).toBe(16);
    });

    it('SECTION_SPACING_DEFAULT should be 32', () => {
      expect(SECTION_SPACING_DEFAULT).toBe(32);
    });

    it('SECTION_SPACING_MAJOR should be 48', () => {
      expect(SECTION_SPACING_MAJOR).toBe(48);
    });
  });

  describe('Layout tokens', () => {
    it('LAYOUT_HEADER_HEIGHT should be 64', () => {
      expect(LAYOUT_HEADER_HEIGHT).toBe(64);
    });

    it('CONTAINER_MAX_WIDTH_PUBLIC should be 1200', () => {
      expect(CONTAINER_MAX_WIDTH_PUBLIC).toBe(1200);
    });

    it('CONTAINER_MAX_WIDTH_WORKSPACE should be 1360', () => {
      expect(CONTAINER_MAX_WIDTH_WORKSPACE).toBe(1360);
    });

    it('GUTTER_MOBILE should be 16', () => {
      expect(GUTTER_MOBILE).toBe(16);
    });

    it('GUTTER_TABLET should be 20', () => {
      expect(GUTTER_TABLET).toBe(20);
    });

    it('gutter desktop token should be 24px', () => {
      expect(spacingTokens['--gutter-desktop']).toBe('24px');
    });
  });

  describe('spacingTokens map', () => {
    it('should include all 8 scale steps as CSS vars', () => {
      expect('--spacing-1' in spacingTokens).toBe(true);
      expect('--spacing-2' in spacingTokens).toBe(true);
      expect('--spacing-3' in spacingTokens).toBe(true);
      expect('--spacing-4' in spacingTokens).toBe(true);
      expect('--spacing-6' in spacingTokens).toBe(true);
      expect('--spacing-8' in spacingTokens).toBe(true);
      expect('--spacing-12' in spacingTokens).toBe(true);
      expect('--spacing-16' in spacingTokens).toBe(true);
    });

    it('--spacing-1 value should be 4px', () => {
      expect(spacingTokens['--spacing-1']).toBe('4px');
    });

    it('--spacing-4 value should be 16px', () => {
      expect(spacingTokens['--spacing-4']).toBe('16px');
    });

    it('--control-height-md should be 44px', () => {
      expect(spacingTokens['--control-height-md']).toBe('44px');
    });
  });
});
