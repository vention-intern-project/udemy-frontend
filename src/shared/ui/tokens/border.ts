/**
 * Border radius tokens
 *
 * Mild radius ladder for consistent corner treatment.
 * sm: chips/badges | md: inputs/buttons | lg: cards/panels | xl: dialogs/feature panels
 *
 * Also defines border-width tokens.
 */

// ---------------------------------------------------------------------------
// Border radius scale
// ---------------------------------------------------------------------------
export const RADIUS_SM = '4px' as const;  // chips, badges, tags
export const RADIUS_MD = '8px' as const;  // inputs, buttons, small cards
export const RADIUS_LG = '12px' as const; // cards, panels, modals within page
export const RADIUS_XL = '16px' as const; // dialogs, feature panels, drawers
export const RADIUS_FULL = '9999px' as const; // pill shapes / avatar circles

// ---------------------------------------------------------------------------
// Border width tokens
// ---------------------------------------------------------------------------
export const BORDER_WIDTH_DEFAULT = '1px' as const;    // standard boundaries
export const BORDER_WIDTH_EMPHASIZED = '2px' as const; // focus-adjacent / strong boundaries

// ---------------------------------------------------------------------------
// Consolidated border token map
// ---------------------------------------------------------------------------
export const borderTokens = {
  '--radius-sm': RADIUS_SM,
  '--radius-md': RADIUS_MD,
  '--radius-lg': RADIUS_LG,
  '--radius-xl': RADIUS_XL,
  '--radius-full': RADIUS_FULL,
  '--border-width': BORDER_WIDTH_DEFAULT,
  '--border-width-emphasized': BORDER_WIDTH_EMPHASIZED,
} as const;

export type BorderTokenKey = keyof typeof borderTokens;
