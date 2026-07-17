/**
 * Breakpoint tokens
 *
 * Six-tier responsive breakpoint system.
 * Acceptance criteria require values at: 320px (xs), 768px (md), 1280px (xl).
 *
 * Container strategy: fluid with max-widths per layout context.
 * Grid columns by breakpoint documented below.
 */

// ---------------------------------------------------------------------------
// Breakpoint values (px as numbers — usable in JS media-query helpers)
// ---------------------------------------------------------------------------
/** Minimum supported viewport — no horizontal scroll for page content */
export const BP_XS = 320 as const;

/** Large phones / small tablets */
export const BP_SM = 480 as const;

/** Tablets / large phones landscape — table→card transform below this */
export const BP_MD = 768 as const;

/** Small laptops — lesson/progress panels switch from stacked to side-by-side */
export const BP_LG = 1024 as const;

/** Standard laptop — full grid columns, xl containers */
export const BP_XL = 1280 as const;

/** Wide desktop — max container sizes apply */
export const BP_2XL = 1440 as const;

// ---------------------------------------------------------------------------
// Named breakpoint map
// ---------------------------------------------------------------------------
export const breakpoints = {
  xs: BP_XS,
  sm: BP_SM,
  md: BP_MD,
  lg: BP_LG,
  xl: BP_XL,
  '2xl': BP_2XL,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

// ---------------------------------------------------------------------------
// Media query helpers (CSS string values for use in CSS-in-JS or CSS)
// ---------------------------------------------------------------------------
export const mediaQueries = {
  /** min-width: 320px */
  xs: `(min-width: ${BP_XS}px)`,
  /** min-width: 480px */
  sm: `(min-width: ${BP_SM}px)`,
  /** min-width: 768px */
  md: `(min-width: ${BP_MD}px)`,
  /** min-width: 1024px */
  lg: `(min-width: ${BP_LG}px)`,
  /** min-width: 1280px */
  xl: `(min-width: ${BP_XL}px)`,
  /** min-width: 1440px */
  '2xl': `(min-width: ${BP_2XL}px)`,
} as const;

// ---------------------------------------------------------------------------
// Grid column counts by breakpoint (catalog cards: 1/2/3/4 per sm/md/lg/xl)
// ---------------------------------------------------------------------------
export const catalogGridColumns = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 4,
  '2xl': 4,
} as const;

// ---------------------------------------------------------------------------
// Consolidated breakpoint token map
// ---------------------------------------------------------------------------
export const breakpointTokens = {
  '--bp-xs': `${BP_XS}px`,
  '--bp-sm': `${BP_SM}px`,
  '--bp-md': `${BP_MD}px`,
  '--bp-lg': `${BP_LG}px`,
  '--bp-xl': `${BP_XL}px`,
  '--bp-2xl': `${BP_2XL}px`,
} as const;

export type BreakpointTokenKey = keyof typeof breakpointTokens;
