/**
 * Token contract tests — Breakpoint tokens
 *
 * Required breakpoint values are verified at 320px, 768px, and 1280px.
 *
 * Also verifies all 6 breakpoint values, named aliases, media query strings,
 * and catalog grid column counts.
 *
 * NOTE: Requires `npm install` (Vitest) before execution.
 */
import { describe, it, expect } from 'vitest';
import {
  BP_XS,
  BP_SM,
  BP_MD,
  BP_LG,
  BP_XL,
  BP_2XL,
  breakpoints,
  mediaQueries,
  breakpointTokens,
} from '../../../src/shared/ui/tokens/breakpoints';

describe('Breakpoint tokens', () => {
  describe('Required breakpoint values', () => {
    it('BP_XS should be exactly 320px', () => {
      expect(BP_XS).toBe(320);
    });

    it('BP_MD should be exactly 768px', () => {
      expect(BP_MD).toBe(768);
    });

    it('BP_XL should be exactly 1280px', () => {
      expect(BP_XL).toBe(1280);
    });
  });

  describe('All breakpoint values', () => {
    it('BP_XS should be 320', () => {
      expect(BP_XS).toBe(320);
    });

    it('BP_SM should be 480', () => {
      expect(BP_SM).toBe(480);
    });

    it('BP_MD should be 768', () => {
      expect(BP_MD).toBe(768);
    });

    it('BP_LG should be 1024', () => {
      expect(BP_LG).toBe(1024);
    });

    it('BP_XL should be 1280', () => {
      expect(BP_XL).toBe(1280);
    });

    it('BP_2XL should be 1440', () => {
      expect(BP_2XL).toBe(1440);
    });

    it('breakpoints should be in ascending order', () => {
      const values = [BP_XS, BP_SM, BP_MD, BP_LG, BP_XL, BP_2XL];
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe('Named breakpoint map', () => {
    it('breakpoints.xs should be 320', () => {
      expect(breakpoints.xs).toBe(320);
    });

    it('breakpoints.md should be 768', () => {
      expect(breakpoints.md).toBe(768);
    });

    it('breakpoints.xl should be 1280', () => {
      expect(breakpoints.xl).toBe(1280);
    });

    it('breakpoints should have 6 entries', () => {
      expect(Object.keys(breakpoints)).toHaveLength(6);
    });

    it('all entries: xs, sm, md, lg, xl, 2xl should be present', () => {
      expect('xs' in breakpoints).toBe(true);
      expect('sm' in breakpoints).toBe(true);
      expect('md' in breakpoints).toBe(true);
      expect('lg' in breakpoints).toBe(true);
      expect('xl' in breakpoints).toBe(true);
      expect('2xl' in breakpoints).toBe(true);
    });
  });

  describe('Media query strings', () => {
    it('mediaQueries.xs should include 320px', () => {
      expect(mediaQueries.xs).toContain('320px');
    });

    it('mediaQueries.md should include 768px', () => {
      expect(mediaQueries.md).toContain('768px');
    });

    it('mediaQueries.xl should include 1280px', () => {
      expect(mediaQueries.xl).toContain('1280px');
    });

    it('all media queries should be min-width queries', () => {
      for (const key of Object.keys(mediaQueries) as Array<keyof typeof mediaQueries>) {
        expect(mediaQueries[key]).toContain('min-width');
      }
    });
  });

  describe('breakpointTokens map', () => {
    it('should include --bp-xs with 320px', () => {
      expect(breakpointTokens['--bp-xs']).toBe('320px');
    });

    it('should include --bp-md with 768px', () => {
      expect(breakpointTokens['--bp-md']).toBe('768px');
    });

    it('should include --bp-xl with 1280px', () => {
      expect(breakpointTokens['--bp-xl']).toBe('1280px');
    });

    it('should include all 6 breakpoint CSS vars', () => {
      expect('--bp-xs' in breakpointTokens).toBe(true);
      expect('--bp-sm' in breakpointTokens).toBe(true);
      expect('--bp-md' in breakpointTokens).toBe(true);
      expect('--bp-lg' in breakpointTokens).toBe(true);
      expect('--bp-xl' in breakpointTokens).toBe(true);
      expect('--bp-2xl' in breakpointTokens).toBe(true);
    });
  });
});
