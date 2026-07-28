/**
 * Token contract tests — Density mode tokens
 *
 * Verifies marketplace (comfortable) and workspace (compact) density variants.
 * Each variant has distinct spacing values for card inner padding, section gaps,
 * item gaps, form field gaps, and gutters.
 *
 * NOTE: Requires `npm install` (Vitest) before execution.
 */
import { describe, it, expect } from 'vitest';
import {
  DENSITY_MARKETPLACE,
  DENSITY_WORKSPACE,
  densityTokens,
  densityCssVarNames,
  buildDensityVars,
  type DensityMode,
} from '../../../src/shared/ui/tokens/density';

describe('Density mode tokens', () => {
  describe('DensityMode constants', () => {
    it('DENSITY_MARKETPLACE should be "marketplace"', () => {
      expect(DENSITY_MARKETPLACE).toBe('marketplace');
    });

    it('DENSITY_WORKSPACE should be "workspace"', () => {
      expect(DENSITY_WORKSPACE).toBe('workspace');
    });
  });

  describe('densityTokens completeness', () => {
    it('should define marketplace density', () => {
      expect(densityTokens.marketplace).toBeDefined();
    });

    it('should define workspace density', () => {
      expect(densityTokens.workspace).toBeDefined();
    });

    const REQUIRED_PROPS: Array<keyof (typeof densityTokens)['marketplace']> = [
      'cardInnerPadding',
      'sectionGap',
      'itemGap',
      'formFieldGap',
      'gutter',
    ];

    it.each(REQUIRED_PROPS)('marketplace density should have property: %s', (prop) => {
      expect(densityTokens.marketplace[prop]).toBeTruthy();
    });

    it.each(REQUIRED_PROPS)('workspace density should have property: %s', (prop) => {
      expect(densityTokens.workspace[prop]).toBeTruthy();
    });
  });

  describe('Marketplace density values (comfortable)', () => {
    it('cardInnerPadding should be 16px', () => {
      expect(densityTokens.marketplace.cardInnerPadding).toBe('16px');
    });

    it('sectionGap should be 32px (larger vertical rhythm)', () => {
      expect(densityTokens.marketplace.sectionGap).toBe('32px');
    });

    it('itemGap should be 24px', () => {
      expect(densityTokens.marketplace.itemGap).toBe('24px');
    });

    it('formFieldGap should be 16px', () => {
      expect(densityTokens.marketplace.formFieldGap).toBe('16px');
    });

    it('gutter should be 24px (desktop gutter)', () => {
      expect(densityTokens.marketplace.gutter).toBe('24px');
    });
  });

  describe('Workspace density values (compact)', () => {
    it('cardInnerPadding should be 12px (less than marketplace)', () => {
      expect(densityTokens.workspace.cardInnerPadding).toBe('12px');
    });

    it('sectionGap should be 16px (tighter than marketplace)', () => {
      expect(densityTokens.workspace.sectionGap).toBe('16px');
    });

    it('itemGap should be 12px (tighter than marketplace)', () => {
      expect(densityTokens.workspace.itemGap).toBe('12px');
    });

    it('formFieldGap should be 16px (same as marketplace)', () => {
      expect(densityTokens.workspace.formFieldGap).toBe('16px');
    });

    it('gutter should be 16px (mobile gutter — compact side padding)', () => {
      expect(densityTokens.workspace.gutter).toBe('16px');
    });
  });

  describe('Workspace vs marketplace token comparison', () => {
    it('workspace cardInnerPadding should be smaller than marketplace', () => {
      const mktPx = parseInt(densityTokens.marketplace.cardInnerPadding);
      const wsPx = parseInt(densityTokens.workspace.cardInnerPadding);
      expect(wsPx).toBeLessThan(mktPx);
    });

    it('workspace sectionGap should be smaller than marketplace', () => {
      const mktPx = parseInt(densityTokens.marketplace.sectionGap);
      const wsPx = parseInt(densityTokens.workspace.sectionGap);
      expect(wsPx).toBeLessThan(mktPx);
    });

    it('workspace itemGap should be smaller than marketplace', () => {
      const mktPx = parseInt(densityTokens.marketplace.itemGap);
      const wsPx = parseInt(densityTokens.workspace.itemGap);
      expect(wsPx).toBeLessThan(mktPx);
    });

    it('workspace gutter should be smaller than marketplace', () => {
      const mktPx = parseInt(densityTokens.marketplace.gutter);
      const wsPx = parseInt(densityTokens.workspace.gutter);
      expect(wsPx).toBeLessThan(mktPx);
    });
  });

  describe('densityCssVarNames', () => {
    it('should define all 5 density CSS variable names', () => {
      expect(densityCssVarNames.cardInnerPadding).toBe('--density-card-inner');
      expect(densityCssVarNames.sectionGap).toBe('--density-section-gap');
      expect(densityCssVarNames.itemGap).toBe('--density-item-gap');
      expect(densityCssVarNames.formFieldGap).toBe('--density-form-gap');
      expect(densityCssVarNames.gutter).toBe('--density-gutter');
    });

    it('all variable names should start with --density-', () => {
      for (const varName of Object.values(densityCssVarNames)) {
        expect(varName).toMatch(/^--density-/);
      }
    });
  });

  describe('buildDensityVars utility', () => {
    it('should return an object with 5 entries for marketplace', () => {
      const vars = buildDensityVars('marketplace');
      expect(Object.keys(vars)).toHaveLength(5);
    });

    it('should return an object with 5 entries for workspace', () => {
      const vars = buildDensityVars('workspace');
      expect(Object.keys(vars)).toHaveLength(5);
    });

    it('marketplace vars should include --density-card-inner: 16px', () => {
      const vars = buildDensityVars('marketplace');
      expect(vars['--density-card-inner']).toBe('16px');
    });

    it('workspace vars should include --density-card-inner: 12px', () => {
      const vars = buildDensityVars('workspace');
      expect(vars['--density-card-inner']).toBe('12px');
    });

    it('marketplace vars should include --density-section-gap: 32px', () => {
      const vars = buildDensityVars('marketplace');
      expect(vars['--density-section-gap']).toBe('32px');
    });

    it('workspace vars should include --density-section-gap: 16px', () => {
      const vars = buildDensityVars('workspace');
      expect(vars['--density-section-gap']).toBe('16px');
    });

    it('buildDensityVars result keys should match densityCssVarNames values', () => {
      const vars = buildDensityVars('marketplace');
      const expectedKeys = Object.values(densityCssVarNames);
      for (const key of expectedKeys) {
        expect(key in vars).toBe(true);
      }
    });

    it('both modes should produce different values', () => {
      const mktVars = buildDensityVars('marketplace');
      const wsVars = buildDensityVars('workspace');
      // At least some values differ
      const allSame = Object.keys(mktVars).every((k) => mktVars[k] === wsVars[k]);
      expect(allSame).toBe(false);
    });
  });

  describe('TypeScript type guard', () => {
    it('DensityMode values should be exhaustive', () => {
      const modes: DensityMode[] = ['marketplace', 'workspace'];
      expect(modes).toHaveLength(2);
    });
  });
});
