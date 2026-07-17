/**
 * Z-index scale tokens
 *
 * 7-tier z-index system for predictable layering.
 * Each tier has a defined semantic role; no ad-hoc z-index values.
 */

// ---------------------------------------------------------------------------
// Z-index scale (numeric)
// ---------------------------------------------------------------------------
/** Default document flow */
export const Z_BASE = 0 as const;

/** Raised elements: sticky table headers, card hover lifts */
export const Z_RAISED = 100 as const;

/** Dropdowns, autocomplete menus, tooltips */
export const Z_DROPDOWN = 200 as const;

/** Sticky page header / navigation bar */
export const Z_STICKY = 300 as const;

/** Overlay backdrop / scrim behind modals */
export const Z_OVERLAY = 400 as const;

/** Modals, dialogs, drawers */
export const Z_MODAL = 500 as const;

/** Toast notifications / snackbars (always on top) */
export const Z_TOAST = 600 as const;

// ---------------------------------------------------------------------------
// Named z-index map
// ---------------------------------------------------------------------------
export const zIndex = {
  base: Z_BASE,
  raised: Z_RAISED,
  dropdown: Z_DROPDOWN,
  sticky: Z_STICKY,
  overlay: Z_OVERLAY,
  modal: Z_MODAL,
  toast: Z_TOAST,
} as const;

export type ZIndexKey = keyof typeof zIndex;

// ---------------------------------------------------------------------------
// Consolidated z-index token map (for CSS var injection)
// ---------------------------------------------------------------------------
export const zIndexTokens = {
  '--z-base': String(Z_BASE),
  '--z-raised': String(Z_RAISED),
  '--z-dropdown': String(Z_DROPDOWN),
  '--z-sticky': String(Z_STICKY),
  '--z-overlay': String(Z_OVERLAY),
  '--z-modal': String(Z_MODAL),
  '--z-toast': String(Z_TOAST),
} as const;

export type ZIndexTokenKey = keyof typeof zIndexTokens;
