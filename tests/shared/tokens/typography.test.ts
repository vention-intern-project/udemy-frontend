/**
 * Token contract tests — Typography tokens
 *
 * Verifies font family, font weights, and all 12 type-scale entries.
 *
 * NOTE: Requires `npm install` (Vitest) before execution.
 */
import { describe, it, expect } from 'vitest';
import {
  FONT_FAMILY_BASE,
  FONT_FAMILY_NUMERIC,
  FONT_WEIGHT_REGULAR,
  FONT_WEIGHT_MEDIUM,
  FONT_WEIGHT_SEMIBOLD,
  FONT_WEIGHT_BOLD,
  TYPE_DISPLAY,
  TYPE_DISPLAY_MOBILE,
  TYPE_PAGE_H1,
  TYPE_PAGE_H1_MOBILE,
  TYPE_SECTION_H2,
  TYPE_SECTION_H2_MOBILE,
  TYPE_CARD_H3,
  TYPE_CARD_H3_MOBILE,
  TYPE_BODY_MD,
  TYPE_BODY_SM,
  TYPE_LABEL,
  TYPE_BUTTON,
  TYPE_CAPTION,
  TYPE_METADATA,
  TYPE_NUMERIC_EMPHASIS,
  TYPE_NUMERIC_EMPHASIS_MOBILE,
  typographyTokens,
} from '../../../src/shared/ui/tokens/typography';

describe('Typography tokens', () => {
  describe('Font families', () => {
    it('FONT_FAMILY_BASE should include Inter', () => {
      expect(FONT_FAMILY_BASE).toContain('Inter');
    });

    it('FONT_FAMILY_BASE should include system fallbacks', () => {
      expect(FONT_FAMILY_BASE).toContain('sans-serif');
    });

    it('FONT_FAMILY_NUMERIC should include Inter', () => {
      expect(FONT_FAMILY_NUMERIC).toContain('Inter');
    });
  });

  describe('Font weights', () => {
    it('FONT_WEIGHT_REGULAR should be 400', () => {
      expect(FONT_WEIGHT_REGULAR).toBe(400);
    });

    it('FONT_WEIGHT_MEDIUM should be 500', () => {
      expect(FONT_WEIGHT_MEDIUM).toBe(500);
    });

    it('FONT_WEIGHT_SEMIBOLD should be 600', () => {
      expect(FONT_WEIGHT_SEMIBOLD).toBe(600);
    });

    it('FONT_WEIGHT_BOLD should be 700', () => {
      expect(FONT_WEIGHT_BOLD).toBe(700);
    });
  });

  describe('TYPE_DISPLAY', () => {
    it('should have fontSize 40px', () => {
      expect(TYPE_DISPLAY.fontSize).toBe('40px');
    });

    it('should have lineHeight 48px', () => {
      expect(TYPE_DISPLAY.lineHeight).toBe('48px');
    });

    it('should have fontWeight 700 (bold)', () => {
      expect(TYPE_DISPLAY.fontWeight).toBe(700);
    });

    it('should have negative letter spacing', () => {
      expect(TYPE_DISPLAY.letterSpacing).toBe('-0.01em');
    });

    it('mobile variant should have fontSize 32px', () => {
      expect(TYPE_DISPLAY_MOBILE.fontSize).toBe('32px');
    });
  });

  describe('TYPE_PAGE_H1', () => {
    it('should have fontSize 32px', () => {
      expect(TYPE_PAGE_H1.fontSize).toBe('32px');
    });

    it('should have lineHeight 40px', () => {
      expect(TYPE_PAGE_H1.lineHeight).toBe('40px');
    });

    it('mobile variant should have fontSize 28px', () => {
      expect(TYPE_PAGE_H1_MOBILE.fontSize).toBe('28px');
    });
  });

  describe('TYPE_SECTION_H2', () => {
    it('should have fontSize 24px', () => {
      expect(TYPE_SECTION_H2.fontSize).toBe('24px');
    });

    it('mobile variant should have fontSize 22px', () => {
      expect(TYPE_SECTION_H2_MOBILE.fontSize).toBe('22px');
    });
  });

  describe('TYPE_CARD_H3', () => {
    it('should have fontSize 18px', () => {
      expect(TYPE_CARD_H3.fontSize).toBe('18px');
    });

    it('should have fontWeight 600 (semibold)', () => {
      expect(TYPE_CARD_H3.fontWeight).toBe(600);
    });

    it('mobile variant should have fontSize 17px', () => {
      expect(TYPE_CARD_H3_MOBILE.fontSize).toBe('17px');
    });
  });

  describe('TYPE_BODY_MD and TYPE_BODY_SM', () => {
    it('TYPE_BODY_MD should have fontSize 16px', () => {
      expect(TYPE_BODY_MD.fontSize).toBe('16px');
    });

    it('TYPE_BODY_MD should have lineHeight 24px', () => {
      expect(TYPE_BODY_MD.lineHeight).toBe('24px');
    });

    it('TYPE_BODY_SM should have fontSize 14px', () => {
      expect(TYPE_BODY_SM.fontSize).toBe('14px');
    });
  });

  describe('TYPE_LABEL and TYPE_BUTTON', () => {
    it('TYPE_LABEL should have fontWeight 600', () => {
      expect(TYPE_LABEL.fontWeight).toBe(600);
    });

    it('TYPE_BUTTON should have fontWeight 600', () => {
      expect(TYPE_BUTTON.fontWeight).toBe(600);
    });

    it('TYPE_BUTTON letterSpacing should be 0.01em', () => {
      expect(TYPE_BUTTON.letterSpacing).toBe('0.01em');
    });
  });

  describe('TYPE_CAPTION and TYPE_METADATA', () => {
    it('TYPE_CAPTION should have fontSize 12px', () => {
      expect(TYPE_CAPTION.fontSize).toBe('12px');
    });

    it('TYPE_METADATA should have fontSize 13px', () => {
      expect(TYPE_METADATA.fontSize).toBe('13px');
    });

    it('TYPE_METADATA should have fontWeight 500', () => {
      expect(TYPE_METADATA.fontWeight).toBe(500);
    });
  });

  describe('TYPE_NUMERIC_EMPHASIS', () => {
    it('should have fontSize 20px', () => {
      expect(TYPE_NUMERIC_EMPHASIS.fontSize).toBe('20px');
    });

    it('should have fontWeight 700', () => {
      expect(TYPE_NUMERIC_EMPHASIS.fontWeight).toBe(700);
    });

    it('mobile variant should have fontSize 18px', () => {
      expect(TYPE_NUMERIC_EMPHASIS_MOBILE.fontSize).toBe('18px');
    });
  });

  describe('typographyTokens map', () => {
    it('should include --font-family-base', () => {
      expect('--font-family-base' in typographyTokens).toBe(true);
    });

    it('should include all heading token keys', () => {
      expect('--type-display-size' in typographyTokens).toBe(true);
      expect('--type-page-h1-size' in typographyTokens).toBe(true);
      expect('--type-section-h2-size' in typographyTokens).toBe(true);
      expect('--type-card-h3-size' in typographyTokens).toBe(true);
    });

    it('should include body and label token keys', () => {
      expect('--type-body-md-size' in typographyTokens).toBe(true);
      expect('--type-body-sm-size' in typographyTokens).toBe(true);
      expect('--type-label-size' in typographyTokens).toBe(true);
      expect('--type-button-size' in typographyTokens).toBe(true);
    });

    it('--font-family-base value should match constant', () => {
      expect(typographyTokens['--font-family-base']).toBe(FONT_FAMILY_BASE);
    });
  });
});
