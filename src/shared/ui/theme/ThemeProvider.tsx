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
  useRef,
  type ReactNode,
} from 'react';

import type { ThemeContextValue, DensityMode } from './types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ThemeContext = createContext<ThemeContextValue | null>(null);
const ThemeOwnershipDepthContext = createContext(0);

ThemeContext.displayName = 'ThemeContext';

interface DensityOwner {
  id: symbol;
  depth: number;
  sequence: number;
  mode: DensityMode;
}

const densityOwners: DensityOwner[] = [];
let densityOwnerSequence = 0;
let densityBeforeProviders: string | null | undefined;

function activeDensityOwner(): DensityOwner | undefined {
  return densityOwners.reduce<DensityOwner | undefined>((active, owner) => {
    if (!active || owner.depth > active.depth) return owner;
    if (owner.depth === active.depth && owner.sequence > active.sequence) return owner;
    return active;
  }, undefined);
}

function applyActiveDensity() {
  const root = document.documentElement;
  const active = activeDensityOwner();

  if (active) {
    root.setAttribute('data-density', active.mode);
  } else if (densityBeforeProviders === null) {
    root.removeAttribute('data-density');
  } else if (densityBeforeProviders !== undefined) {
    root.setAttribute('data-density', densityBeforeProviders);
  }
}

function registerDensityOwner(id: symbol, depth: number, mode: DensityMode) {
  if (densityOwners.length === 0) {
    densityBeforeProviders = document.documentElement.getAttribute('data-density');
  }
  densityOwners.push({ id, depth, mode, sequence: densityOwnerSequence });
  densityOwnerSequence += 1;
  applyActiveDensity();
}

function updateDensityOwner(id: symbol, mode: DensityMode) {
  const owner = densityOwners.find((candidate) => candidate.id === id);
  if (owner) owner.mode = mode;
  applyActiveDensity();
}

function unregisterDensityOwner(id: symbol) {
  const ownerIndex = densityOwners.findIndex((owner) => owner.id === id);
  if (ownerIndex >= 0) densityOwners.splice(ownerIndex, 1);
  applyActiveDensity();
  if (densityOwners.length === 0) densityBeforeProviders = undefined;
}

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
  const parentOwnershipDepth = useContext(ThemeOwnershipDepthContext);
  const [densityMode, setDensityModeState] =
    useState<DensityMode>(initialDensityMode);
  const ownerIdRef = useRef(Symbol('theme-density-owner'));
  const densityModeRef = useRef(densityMode);
  densityModeRef.current = densityMode;

  const setDensityMode = useCallback((mode: DensityMode) => {
    setDensityModeState(mode);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    densityMode,
    setDensityMode,
  }), [densityMode, setDensityMode]);

  useEffect(() => {
    const ownerId = ownerIdRef.current;
    registerDensityOwner(
      ownerId,
      parentOwnershipDepth,
      densityModeRef.current,
    );
    return () => unregisterDensityOwner(ownerId);
  }, [parentOwnershipDepth]);

  useEffect(() => {
    updateDensityOwner(ownerIdRef.current, densityMode);
  }, [densityMode]);

  return (
    <ThemeOwnershipDepthContext.Provider value={parentOwnershipDepth + 1}>
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    </ThemeOwnershipDepthContext.Provider>
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
