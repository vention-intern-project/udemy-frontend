/**
 * Typography scale tokens
 *
 * Inter + system-fallback font stack. Display/heading/body/label/caption/metadata scale.
 * Mobile downshift values noted per token.
 */

// ---------------------------------------------------------------------------
// Font families
// ---------------------------------------------------------------------------
export const FONT_FAMILY_BASE =
  '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' as const;

export const FONT_FAMILY_NUMERIC =
  '"Inter", "Segoe UI", sans-serif' as const;

// ---------------------------------------------------------------------------
// Font weights
// ---------------------------------------------------------------------------
export const FONT_WEIGHT_REGULAR = 400 as const;
export const FONT_WEIGHT_MEDIUM = 500 as const;
export const FONT_WEIGHT_SEMIBOLD = 600 as const;
export const FONT_WEIGHT_BOLD = 700 as const;

// ---------------------------------------------------------------------------
// Type scale — each entry is { fontSize, lineHeight, fontWeight, letterSpacing }
// Mobile downshift values are separate tokens named *_MOBILE.
// ---------------------------------------------------------------------------

/** Hero-level heading — mobile: 32px/40px */
export const TYPE_DISPLAY = {
  fontSize: '40px',
  lineHeight: '48px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '-0.01em',
} as const;

export const TYPE_DISPLAY_MOBILE = {
  fontSize: '32px',
  lineHeight: '40px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '-0.01em',
} as const;

/** Page title — mobile: 28px/36px */
export const TYPE_PAGE_H1 = {
  fontSize: '32px',
  lineHeight: '40px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '-0.01em',
} as const;

export const TYPE_PAGE_H1_MOBILE = {
  fontSize: '28px',
  lineHeight: '36px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '-0.01em',
} as const;

/** Section titles — mobile: 22px/30px */
export const TYPE_SECTION_H2 = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '0',
} as const;

export const TYPE_SECTION_H2_MOBILE = {
  fontSize: '22px',
  lineHeight: '30px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '0',
} as const;

/** Card/course/lesson headings — mobile: 17px/24px */
export const TYPE_CARD_H3 = {
  fontSize: '18px',
  lineHeight: '26px',
  fontWeight: FONT_WEIGHT_SEMIBOLD,
  letterSpacing: '0',
} as const;

export const TYPE_CARD_H3_MOBILE = {
  fontSize: '17px',
  lineHeight: '24px',
  fontWeight: FONT_WEIGHT_SEMIBOLD,
  letterSpacing: '0',
} as const;

/** Default paragraph/form text */
export const TYPE_BODY_MD = {
  fontSize: '16px',
  lineHeight: '24px',
  fontWeight: FONT_WEIGHT_REGULAR,
  letterSpacing: '0',
} as const;

/** Compact body/table cells */
export const TYPE_BODY_SM = {
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: FONT_WEIGHT_REGULAR,
  letterSpacing: '0',
} as const;

/** Field labels, status labels */
export const TYPE_LABEL = {
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: FONT_WEIGHT_SEMIBOLD,
  letterSpacing: '0.005em',
} as const;

/** Button text */
export const TYPE_BUTTON = {
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: FONT_WEIGHT_SEMIBOLD,
  letterSpacing: '0.01em',
} as const;

/** Secondary metadata */
export const TYPE_CAPTION = {
  fontSize: '12px',
  lineHeight: '16px',
  fontWeight: FONT_WEIGHT_REGULAR,
  letterSpacing: '0.01em',
} as const;

/** Timestamps, compact tags */
export const TYPE_METADATA = {
  fontSize: '13px',
  lineHeight: '18px',
  fontWeight: FONT_WEIGHT_MEDIUM,
  letterSpacing: '0.005em',
} as const;

/** Progress percentages / prices — mobile: 18px/26px */
export const TYPE_NUMERIC_EMPHASIS = {
  fontSize: '20px',
  lineHeight: '28px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '0',
} as const;

export const TYPE_NUMERIC_EMPHASIS_MOBILE = {
  fontSize: '18px',
  lineHeight: '26px',
  fontWeight: FONT_WEIGHT_BOLD,
  letterSpacing: '0',
} as const;

// ---------------------------------------------------------------------------
// Consolidated typography token map (for CSS var injection)
// ---------------------------------------------------------------------------
export const typographyTokens = {
  '--font-family-base': FONT_FAMILY_BASE,
  '--font-family-numeric': FONT_FAMILY_NUMERIC,
  '--font-weight-regular': String(FONT_WEIGHT_REGULAR),
  '--font-weight-medium': String(FONT_WEIGHT_MEDIUM),
  '--font-weight-semibold': String(FONT_WEIGHT_SEMIBOLD),
  '--font-weight-bold': String(FONT_WEIGHT_BOLD),
  // Display
  '--type-display-size': TYPE_DISPLAY.fontSize,
  '--type-display-lh': TYPE_DISPLAY.lineHeight,
  '--type-display-weight': String(TYPE_DISPLAY.fontWeight),
  '--type-display-ls': TYPE_DISPLAY.letterSpacing,
  // H1
  '--type-page-h1-size': TYPE_PAGE_H1.fontSize,
  '--type-page-h1-lh': TYPE_PAGE_H1.lineHeight,
  '--type-page-h1-weight': String(TYPE_PAGE_H1.fontWeight),
  '--type-page-h1-ls': TYPE_PAGE_H1.letterSpacing,
  // H2
  '--type-section-h2-size': TYPE_SECTION_H2.fontSize,
  '--type-section-h2-lh': TYPE_SECTION_H2.lineHeight,
  '--type-section-h2-weight': String(TYPE_SECTION_H2.fontWeight),
  // H3
  '--type-card-h3-size': TYPE_CARD_H3.fontSize,
  '--type-card-h3-lh': TYPE_CARD_H3.lineHeight,
  '--type-card-h3-weight': String(TYPE_CARD_H3.fontWeight),
  // Body
  '--type-body-md-size': TYPE_BODY_MD.fontSize,
  '--type-body-md-lh': TYPE_BODY_MD.lineHeight,
  '--type-body-sm-size': TYPE_BODY_SM.fontSize,
  '--type-body-sm-lh': TYPE_BODY_SM.lineHeight,
  // Label / button
  '--type-label-size': TYPE_LABEL.fontSize,
  '--type-label-lh': TYPE_LABEL.lineHeight,
  '--type-label-weight': String(TYPE_LABEL.fontWeight),
  '--type-button-size': TYPE_BUTTON.fontSize,
  '--type-button-lh': TYPE_BUTTON.lineHeight,
  '--type-button-weight': String(TYPE_BUTTON.fontWeight),
  // Caption / metadata
  '--type-caption-size': TYPE_CAPTION.fontSize,
  '--type-caption-lh': TYPE_CAPTION.lineHeight,
  '--type-metadata-size': TYPE_METADATA.fontSize,
  '--type-metadata-lh': TYPE_METADATA.lineHeight,
  '--type-metadata-weight': String(TYPE_METADATA.fontWeight),
  // Numeric
  '--type-numeric-emphasis-size': TYPE_NUMERIC_EMPHASIS.fontSize,
  '--type-numeric-emphasis-lh': TYPE_NUMERIC_EMPHASIS.lineHeight,
  '--type-numeric-emphasis-weight': String(TYPE_NUMERIC_EMPHASIS.fontWeight),
} as const;

export type TypographyTokenKey = keyof typeof typographyTokens;
