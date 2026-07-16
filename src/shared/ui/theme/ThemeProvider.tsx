/**
 * ThemeProvider
 *
 * React context provider for the application's density mode.
 * Wraps a section of the tree with a density-mode data attribute and
 * exposes `useDensityMode()` hook for consumers.
 *
 * Usage:
 *   // Marketplace pages
 *   <ThemeProvider densityMode="marketplace">
 *     <CatalogPage />
 *   </ThemeProvider>
 *
 *   // Workspace/task pages
 *   <ThemeProvider densityMode="workspace">
 *     <InstructorCoursesPage />
 *   </ThemeProvider>
 *
 *   // Inside any component:
 *   const { densityMode } = useDensityMode();
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import type { ThemeContextValue, DensityMode } from './types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ThemeContext = createContext<ThemeContextValue | null>(null);

ThemeContext.displayName = 'ThemeContext';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface ThemeProviderProps {
  /** Initial density mode. Defaults to 'marketplace'. */
  densityMode?: DensityMode;
  children: ReactNode;
}

export function ThemeProvider({
  densityMode: initialMode = 'marketplace',
  children,
}: ThemeProviderProps) {
  const [densityMode, setDensityModeState] =
    useState<DensityMode>(initialMode);

  const setDensityMode = useCallback((mode: DensityMode) => {
    setDensityModeState(mode);
  }, []);

  const value: ThemeContextValue = {
    densityMode,
    setDensityMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {/* data-density attribute enables CSS density overrides */}
      <div data-density={densityMode} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
/**
 * Access the current density mode and setter from any component inside ThemeProvider.
 *
 * @throws If used outside of a ThemeProvider.
 */
export function useDensityMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error(
      'useDensityMode must be used within a <ThemeProvider>. ' +
        'Wrap the relevant page or section with <ThemeProvider densityMode="marketplace|workspace">.',
    );
  }
  return ctx;
}
