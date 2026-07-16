/**
 * CSS custom property injection utility
 *
 * Applies a flat record of CSS variable name→value pairs to a DOM element.
 * Used by ThemeProvider to inject density and global tokens.
 */

/**
 * Apply CSS custom properties to an element.
 *
 * @param element - The DOM element to apply the vars to (usually document.documentElement).
 * @param vars    - A Record mapping CSS variable names (e.g. '--color-canvas') to values.
 */
export function applyCssVars(
  element: HTMLElement,
  vars: Record<string, string>,
): void {
  for (const [name, value] of Object.entries(vars)) {
    element.style.setProperty(name, value);
  }
}

/**
 * Remove CSS custom properties from an element.
 *
 * @param element  - The DOM element to clear the vars from.
 * @param varNames - Array of CSS variable names to remove.
 */
export function removeCssVars(
  element: HTMLElement,
  varNames: readonly string[],
): void {
  for (const name of varNames) {
    element.style.removeProperty(name);
  }
}

/**
 * Merge multiple CSS var record objects into one flat record.
 * Later entries override earlier ones for the same key.
 */
export function mergeCssVarSets(
  ...varSets: Array<Record<string, string>>
): Record<string, string> {
  return Object.assign({}, ...varSets);
}
