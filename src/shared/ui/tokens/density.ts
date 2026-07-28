/**
 * Density mode tokens
 *
 * Two density variants:
 * - marketplace: comfortable spacing for browsing/discovery
 * - workspace:   compact spacing for task/management flows
 *
 * Density affects: vertical rhythm, card inner spacing, type emphasis,
 * form density, and section gaps. It does not alter typography.
 */

// ---------------------------------------------------------------------------
// Density mode identifier
// ---------------------------------------------------------------------------
export type DensityMode = 'marketplace' | 'workspace';

export const DENSITY_MARKETPLACE: DensityMode = 'marketplace';
export const DENSITY_WORKSPACE: DensityMode = 'workspace';

// ---------------------------------------------------------------------------
// Per-density token overrides
// Overrides are expressed as partial CSS variable sets applied to a scope element.
// ---------------------------------------------------------------------------

export interface DensityTokenSet {
  /** Card inner padding */
  cardInnerPadding: string;
  /** Vertical rhythm between sections */
  sectionGap: string;
  /** Gap between list items / table rows */
  itemGap: string;
  /** Form field stack gap */
  formFieldGap: string;
  /** Container horizontal gutter */
  gutter: string;
}

export const densityTokens: Readonly<Record<DensityMode, DensityTokenSet>> = {
  /**
   * Marketplace density — comfortable browsing rhythm.
   * Larger vertical spacing, card-forward layout.
   */
  marketplace: {
    cardInnerPadding: '16px', // --spacing-4
    sectionGap: '32px', // --spacing-8 (default section spacing)
    itemGap: '24px', // --spacing-6
    formFieldGap: '16px', // --spacing-4
    gutter: '24px', // --gutter-desktop
  },

  /**
   * Workspace density — compact task-management rhythm.
   * Tighter gutters and spacing while maintaining >=44px touch targets.
   */
  workspace: {
    cardInnerPadding: '12px', // --spacing-3
    sectionGap: '16px', // --spacing-4
    itemGap: '12px', // --spacing-3
    formFieldGap: '16px', // --spacing-4 (form fields keep standard gap)
    gutter: '16px', // --gutter-mobile (compact side padding)
  },
} as const;

// ---------------------------------------------------------------------------
// CSS variable names for density overrides
// (injected at the density root element level)
// ---------------------------------------------------------------------------
export const densityCssVarNames = {
  cardInnerPadding: '--density-card-inner',
  sectionGap: '--density-section-gap',
  itemGap: '--density-item-gap',
  formFieldGap: '--density-form-gap',
  gutter: '--density-gutter',
} as const;

/**
 * Build a CSS custom property set for the given density mode.
 * Optional helper for explicitly applying density variables to a scoped element.
 * ThemeProvider uses the data-density attribute; tokens.css supplies its overrides.
 */
export function buildDensityVars(mode: DensityMode): Record<string, string> {
  const tokens = densityTokens[mode];
  return {
    [densityCssVarNames.cardInnerPadding]: tokens.cardInnerPadding,
    [densityCssVarNames.sectionGap]: tokens.sectionGap,
    [densityCssVarNames.itemGap]: tokens.itemGap,
    [densityCssVarNames.formFieldGap]: tokens.formFieldGap,
    [densityCssVarNames.gutter]: tokens.gutter,
  };
}
