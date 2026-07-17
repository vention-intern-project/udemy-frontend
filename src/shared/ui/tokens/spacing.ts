/**
 * Spacing scale tokens
 *
 * Base unit: 4px. Constrained 8-step scale: 4/8/12/16/24/32/48/64.
 * Named tier aliases follow spacing intent (xs → xl3).
 *
 * Additional layout tokens: control heights, gutters, section spacing.
 */

// ---------------------------------------------------------------------------
// Base unit
// ---------------------------------------------------------------------------
export const SPACING_BASE = 4 as const; // px

// ---------------------------------------------------------------------------
// Numeric scale (px values as numbers for arithmetic)
// ---------------------------------------------------------------------------
export const SPACING_1 = 4 as const;   // xs
export const SPACING_2 = 8 as const;   // sm
export const SPACING_3 = 12 as const;  // md-sm
export const SPACING_4 = 16 as const;  // md
export const SPACING_6 = 24 as const;  // lg
export const SPACING_8 = 32 as const;  // xl
export const SPACING_12 = 48 as const; // 2xl
export const SPACING_16 = 64 as const; // 3xl

// ---------------------------------------------------------------------------
// Named step aliases
// ---------------------------------------------------------------------------
export const spacing = {
  /** 4px */  xs: SPACING_1,
  /** 8px */  sm: SPACING_2,
  /** 12px */ mdSm: SPACING_3,
  /** 16px */ md: SPACING_4,
  /** 24px */ lg: SPACING_6,
  /** 32px */ xl: SPACING_8,
  /** 48px */ xl2: SPACING_12,
  /** 64px */ xl3: SPACING_16,
} as const;

export type SpacingKey = keyof typeof spacing;

// ---------------------------------------------------------------------------
// Control heights (minimum interactive target: 44px on touch)
// ---------------------------------------------------------------------------
export const CONTROL_HEIGHT_SM = 36 as const;
export const CONTROL_HEIGHT_MD = 44 as const;
export const CONTROL_HEIGHT_LG = 52 as const;

// ---------------------------------------------------------------------------
// Component-specific spacing
// ---------------------------------------------------------------------------
export const INPUT_PADDING_HORIZONTAL = SPACING_3;  // 12px
export const CARD_INNER_SPACING_MARKETPLACE = SPACING_4;  // 16px
export const CARD_INNER_SPACING_WORKSPACE = SPACING_3;    // 12px
export const FORM_FIELD_STACK_GAP = SPACING_4;            // 16px
export const SECTION_SPACING_DEFAULT = SPACING_8;         // 32px
export const SECTION_SPACING_MAJOR = SPACING_12;          // 48px

// ---------------------------------------------------------------------------
// Layout tokens
// ---------------------------------------------------------------------------
export const LAYOUT_HEADER_HEIGHT = 64 as const; // px
export const CONTAINER_MAX_WIDTH_PUBLIC = 1200 as const;    // px
export const CONTAINER_MAX_WIDTH_WORKSPACE = 1360 as const; // px

// Gutter tokens per viewport
export const GUTTER_MOBILE = SPACING_4;   // 16px
export const GUTTER_TABLET = 20 as const; // 20px (between scale steps, by design)

// ---------------------------------------------------------------------------
// Consolidated spacing token map (for CSS var injection)
// ---------------------------------------------------------------------------
export const spacingTokens = {
  '--spacing-1': `${SPACING_1}px`,
  '--spacing-2': `${SPACING_2}px`,
  '--spacing-3': `${SPACING_3}px`,
  '--spacing-4': `${SPACING_4}px`,
  '--spacing-6': `${SPACING_6}px`,
  '--spacing-8': `${SPACING_8}px`,
  '--spacing-12': `${SPACING_12}px`,
  '--spacing-16': `${SPACING_16}px`,
  '--control-height-sm': `${CONTROL_HEIGHT_SM}px`,
  '--control-height-md': `${CONTROL_HEIGHT_MD}px`,
  '--control-height-lg': `${CONTROL_HEIGHT_LG}px`,
  '--input-padding-h': `${INPUT_PADDING_HORIZONTAL}px`,
  '--form-field-gap': `${FORM_FIELD_STACK_GAP}px`,
  '--section-spacing': `${SECTION_SPACING_DEFAULT}px`,
  '--section-spacing-major': `${SECTION_SPACING_MAJOR}px`,
  '--layout-header-height': `${LAYOUT_HEADER_HEIGHT}px`,
  '--container-max-public': `${CONTAINER_MAX_WIDTH_PUBLIC}px`,
  '--container-max-workspace': `${CONTAINER_MAX_WIDTH_WORKSPACE}px`,
  '--gutter-mobile': `${GUTTER_MOBILE}px`,
  '--gutter-tablet': `${GUTTER_TABLET}px`,
  '--gutter-desktop': `${SPACING_6}px`,
} as const;

export type SpacingTokenKey = keyof typeof spacingTokens;
