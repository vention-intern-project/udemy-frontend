/**
 * ThemeProvider
 *
 * React context provider for the application's density mode.
 * Applies density-mode data attribute to the document root and
 * exposes `useDensityMode()` hook for consumers.
 *
 * Usage:
 *   // Marketplace pages
 *   <ThemeProvider initialDensityMode="marketplace">
 *     <CatalogPage />
 *   </ThemeProvider>
 *
 *   // Workspace/task pages
 *   <ThemeProvider initialDensityMode="workspace">
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
  useMemo,
  useEffect,
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
  initialDensityMode?: DensityMode;
  children: ReactNode;
}

export function ThemeProvider({
  initialDensityMode = 'marketplace',
  children,
}: ThemeProviderProps) {
  const [densityMode, setDensityModeState] =
    useState<DensityMode>(initialDensityMode);

  const setDensityMode = useCallback((mode: DensityMode) => {
    setDensityModeState(mode);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    densityMode,
    setDensityMode,
  }), [densityMode, setDensityMode]);

  useEffect(() => {
    const root = document.documentElement;
    const previousDensity = root.getAttribute('data-density');

    root.setAttribute('data-density', densityMode);

    return () => {
      if (previousDensity === null) {
        root.removeAttribute('data-density');
      } else {
        root.setAttribute('data-density', previousDensity);
      }
    };
  }, [densityMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
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
        'Wrap the relevant page or section with <ThemeProvider initialDensityMode="marketplace|workspace">.',
    );
  }
  return ctx;
}
