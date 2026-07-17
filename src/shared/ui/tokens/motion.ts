/**
 * Motion / animation tokens
 *
 * Short, purposeful transitions. Skeleton shimmer and decorative animation
 * must be disabled when user prefers reduced motion (WCAG 2.2 / prefers-reduced-motion).
 */

// ---------------------------------------------------------------------------
// Duration tokens (ms)
// ---------------------------------------------------------------------------
/** Micro-interactions: button press, hover highlight */
export const DURATION_FAST = 120 as const;     // ms

/** Standard transitions: menu open, panel slide, fade */
export const DURATION_BASE = 180 as const;     // ms

/** Complex transitions: page-level fades, dialog entry */
export const DURATION_SLOW = 240 as const;     // ms

/**
 * Reduced-motion fallback: only opacity transitions ≤ 80ms are allowed
 * when prefers-reduced-motion is active.
 */
export const DURATION_REDUCED_MOTION = 80 as const; // ms

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------
/** Standard easing — applied to all UI transitions */
export const EASING_STANDARD = 'cubic-bezier(0.2, 0, 0, 1)' as const;

/** Entry easing — elements entering the screen */
export const EASING_ENTER = 'cubic-bezier(0, 0, 0.2, 1)' as const;

/** Exit easing — elements leaving the screen */
export const EASING_EXIT = 'cubic-bezier(0.4, 0, 1, 1)' as const;

// ---------------------------------------------------------------------------
// Allowed motion descriptions (for documentation; not runtime constants)
// ---------------------------------------------------------------------------
export const MOTION_POLICY = {
  allowed: [
    'Subtle fade for dialogs/toasts',
    'Small translate/opacity for menus/panels',
    'Skeleton shimmer (non-reduced mode only)',
  ],
  reducedMotionBehavior: [
    'Disable shimmer and transform transitions',
    'Keep instant state updates',
    'Optional opacity-only transitions <= 80ms',
    'No decorative or parallax animation',
  ],
} as const;

// ---------------------------------------------------------------------------
// Consolidated motion token map
// ---------------------------------------------------------------------------
export const motionTokens = {
  '--duration-fast': `${DURATION_FAST}ms`,
  '--duration-base': `${DURATION_BASE}ms`,
  '--duration-slow': `${DURATION_SLOW}ms`,
  '--duration-reduced': `${DURATION_REDUCED_MOTION}ms`,
  '--easing-standard': EASING_STANDARD,
  '--easing-enter': EASING_ENTER,
  '--easing-exit': EASING_EXIT,
} as const;

export type MotionTokenKey = keyof typeof motionTokens;
