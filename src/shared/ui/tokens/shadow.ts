/**
 * Shadow / elevation tokens
 *
 * 3-tier elevation ladder for layered surfaces.
 * Mild shadows only; heavier elevation reserved for overlays.
 */

import { OVERLAY_SCRIM } from './color';
export { OVERLAY_SCRIM as OVERLAY_SCRIM_SHADOW };

// ---------------------------------------------------------------------------
// Shadow scale
// ---------------------------------------------------------------------------
/** Cards, list items — subtle lift */
export const SHADOW_1 = '0 1px 2px rgba(17, 24, 39, 0.08)' as const;

/** Panels, popovers, sticky elements — moderate elevation */
export const SHADOW_2 = '0 4px 12px rgba(17, 24, 39, 0.12)' as const;

/** Modals, dialogs, drawers — maximum elevation */
export const SHADOW_3 = '0 12px 28px rgba(17, 24, 39, 0.16)' as const;

// ---------------------------------------------------------------------------
// Consolidated shadow token map
// ---------------------------------------------------------------------------
export const shadowTokens = {
  '--shadow-1': SHADOW_1,
  '--shadow-2': SHADOW_2,
  '--shadow-3': SHADOW_3,
  '--overlay-scrim': OVERLAY_SCRIM,
} as const;

export type ShadowTokenKey = keyof typeof shadowTokens;
