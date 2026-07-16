/**
 * Semantic color tokens
 *
 * Light-theme semantic color architecture with role tokens for:
 * canvas / surface / text / border / action / feedback / state
 */

// ---------------------------------------------------------------------------
// Surface tokens
// ---------------------------------------------------------------------------
export const COLOR_CANVAS = '#F7F8FA' as const;
export const COLOR_SURFACE = '#FFFFFF' as const;
export const COLOR_SURFACE_ELEVATED = '#FFFFFF' as const;
export const COLOR_SURFACE_INVERTED = '#1F2937' as const;

// ---------------------------------------------------------------------------
// Text tokens
// ---------------------------------------------------------------------------
export const TEXT_PRIMARY = '#111827' as const;
export const TEXT_SECONDARY = '#374151' as const;
export const TEXT_MUTED = '#6B7280' as const;

// ---------------------------------------------------------------------------
// Border tokens
// ---------------------------------------------------------------------------
export const BORDER_DEFAULT = '#D1D5DB' as const;
export const BORDER_STRONG = '#9CA3AF' as const;

// ---------------------------------------------------------------------------
// Action tokens
// ---------------------------------------------------------------------------
/** Primary CTA background — hover: ACTION_PRIMARY_BG_HOVER, pressed: ACTION_PRIMARY_BG_PRESSED */
export const ACTION_PRIMARY_BG = '#6D28D9' as const;
export const ACTION_PRIMARY_BG_HOVER = '#5B21B6' as const;
export const ACTION_PRIMARY_BG_PRESSED = '#4C1D95' as const;
export const ACTION_PRIMARY_FG = '#FFFFFF' as const;

/** Secondary CTA background */
export const ACTION_SECONDARY_BG = '#EDE9FE' as const;
export const ACTION_SECONDARY_BG_HOVER = '#DDD6FE' as const;
export const ACTION_SECONDARY_BG_PRESSED = '#C4B5FD' as const;
export const ACTION_SECONDARY_FG = '#4C1D95' as const;

/** Text links */
export const ACTION_LINK = '#1D4ED8' as const;

// ---------------------------------------------------------------------------
// Focus token
// ---------------------------------------------------------------------------
/** 2px outer ring with 2px offset — keyboard focus only */
export const FOCUS_RING = '#2563EB' as const;
export const FOCUS_RING_WIDTH = '2px' as const;
export const FOCUS_RING_OFFSET = '2px' as const;

// ---------------------------------------------------------------------------
// State tokens
// ---------------------------------------------------------------------------
export const STATE_SELECTED_BG = '#DBEAFE' as const;
export const STATE_DISABLED_BG = '#E5E7EB' as const;
export const STATE_DISABLED_TEXT = '#9CA3AF' as const;
export const STATE_DISABLED_OPACITY = '0.56' as const;

// ---------------------------------------------------------------------------
// Feedback / semantic status tokens
// ---------------------------------------------------------------------------
export const FEEDBACK_SUCCESS = '#047857' as const;
export const FEEDBACK_SUCCESS_BG = '#ECFDF5' as const;
export const FEEDBACK_WARNING = '#92400E' as const;
export const FEEDBACK_WARNING_BG = '#FFFBEB' as const;
export const FEEDBACK_ERROR = '#B91C1C' as const;
export const FEEDBACK_ERROR_BG = '#FEF2F2' as const;
export const FEEDBACK_INFO = '#1E40AF' as const;
export const FEEDBACK_INFO_BG = '#EFF6FF' as const;

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------
export const RATING_EMPHASIS = '#B45309' as const;
export const OVERLAY_SCRIM = 'rgba(17, 24, 39, 0.56)' as const;
export const DIVIDER = `1px solid ${BORDER_DEFAULT}` as const;

// ---------------------------------------------------------------------------
// Consolidated color token map (for programmatic access / CSS var injection)
// ---------------------------------------------------------------------------
export const colorTokens = {
  // Surface
  '--color-canvas': COLOR_CANVAS,
  '--color-surface': COLOR_SURFACE,
  '--color-surface-elevated': COLOR_SURFACE_ELEVATED,
  '--color-surface-inverted': COLOR_SURFACE_INVERTED,
  // Text
  '--text-primary': TEXT_PRIMARY,
  '--text-secondary': TEXT_SECONDARY,
  '--text-muted': TEXT_MUTED,
  // Border
  '--border-default': BORDER_DEFAULT,
  '--border-strong': BORDER_STRONG,
  // Action
  '--action-primary-bg': ACTION_PRIMARY_BG,
  '--action-primary-bg-hover': ACTION_PRIMARY_BG_HOVER,
  '--action-primary-bg-pressed': ACTION_PRIMARY_BG_PRESSED,
  '--action-primary-fg': ACTION_PRIMARY_FG,
  '--action-secondary-bg': ACTION_SECONDARY_BG,
  '--action-secondary-bg-hover': ACTION_SECONDARY_BG_HOVER,
  '--action-secondary-bg-pressed': ACTION_SECONDARY_BG_PRESSED,
  '--action-secondary-fg': ACTION_SECONDARY_FG,
  '--action-link': ACTION_LINK,
  // Focus
  '--focus-ring': FOCUS_RING,
  '--focus-ring-width': FOCUS_RING_WIDTH,
  '--focus-ring-offset': FOCUS_RING_OFFSET,
  // States
  '--state-selected': STATE_SELECTED_BG,
  '--state-disabled-bg': STATE_DISABLED_BG,
  '--state-disabled-text': STATE_DISABLED_TEXT,
  '--state-disabled-opacity': STATE_DISABLED_OPACITY,
  // Feedback
  '--feedback-success': FEEDBACK_SUCCESS,
  '--feedback-success-bg': FEEDBACK_SUCCESS_BG,
  '--feedback-warning': FEEDBACK_WARNING,
  '--feedback-warning-bg': FEEDBACK_WARNING_BG,
  '--feedback-error': FEEDBACK_ERROR,
  '--feedback-error-bg': FEEDBACK_ERROR_BG,
  '--feedback-info': FEEDBACK_INFO,
  '--feedback-info-bg': FEEDBACK_INFO_BG,
  // Misc
  '--rating-emphasis': RATING_EMPHASIS,
  '--overlay-scrim': OVERLAY_SCRIM,
} as const;

export type ColorTokenKey = keyof typeof colorTokens;
