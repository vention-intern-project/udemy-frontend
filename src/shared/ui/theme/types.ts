/**
 * Theme types
 *
 * DensityMode and ThemeContext types used by ThemeProvider and consumers.
 */

import type { DensityMode } from '../tokens/density';

export type { DensityMode };

export interface ThemeContextValue {
  /** Current density mode. Default: 'marketplace' */
  densityMode: DensityMode;
  /** Switch density mode programmatically */
  setDensityMode: (mode: DensityMode) => void;
}
