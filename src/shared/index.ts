// Shared — primitives, utilities, config, tokens; no business logic
// Allowed imports: none (lowest layer)
// Forbidden imports: all other layers

// Design system tokens
export * from './ui/tokens';

// Theme provider and density mode
export { ThemeProvider, useDensityMode } from './ui/theme';
export type { ThemeContextValue, DensityMode } from './ui/theme';
