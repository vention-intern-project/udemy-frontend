/**
 * Theme module public API
 *
 * Exports ThemeProvider, useDensityMode hook, and theme types.
 * Import from '@shared/ui/theme' in application code.
 */

export { ThemeProvider, useDensityMode } from './ThemeProvider';
export type { ThemeContextValue, DensityMode } from './types';
export { applyCssVars, removeCssVars, mergeCssVarSets } from './css-vars';
