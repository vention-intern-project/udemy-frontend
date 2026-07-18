import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as tokenExports from '../../../src/shared/ui/tokens';

const tokensCss = readFileSync(
  new URL('../../../src/shared/ui/tokens/tokens.css', import.meta.url),
  'utf8',
);

const intentionalAliases: Readonly<Record<string, string>> = {};
const customPropertyName = /^--[\w-]+$/;

function sortedUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function collectExportedTokenNames(
  value: unknown,
  names: Set<string>,
  visited: Set<object>,
) {
  if (typeof value === 'string' && customPropertyName.test(value)) {
    names.add(value);
    return;
  }
  if (typeof value !== 'object' || value === null || visited.has(value)) return;

  visited.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    if (customPropertyName.test(key)) names.add(key);
    collectExportedTokenNames(nestedValue, names, visited);
  }
}

describe('TypeScript and CSS token parity', () => {
  it('keeps custom-property names synchronized in both directions', () => {
    const exportedNames = new Set<string>();
    const visited = new Set<object>();
    for (const value of Object.values(tokenExports)) {
      collectExportedTokenNames(value, exportedNames, visited);
    }

    expect(typeof tokensCss, 'tokens.css raw import must be a string').toBe('string');
    expect(tokensCss.trim(), 'tokens.css raw import must not be empty').not.toBe('');
    expect(tokensCss, 'tokens.css must contain canonical root rules').toContain(':root');

    const declaredNames = new Set(
      Array.from(
        tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm),
        (match) => match[1],
      ),
    );

    expect(exportedNames.size, 'TypeScript token exports must not be empty')
      .toBeGreaterThan(0);
    expect(declaredNames.size, 'CSS token declarations must not be empty')
      .toBeGreaterThan(0);
    for (const sentinel of ['--color-canvas', '--spacing-2', '--control-height-md']) {
      expect(exportedNames.has(sentinel), `TypeScript exports must include ${sentinel}`).toBe(true);
      expect(declaredNames.has(sentinel), `CSS declarations must include ${sentinel}`).toBe(true);
    }

    const missingAliasDeclarations = Object.keys(intentionalAliases)
      .filter((alias) => !declaredNames.has(alias));
    expect(missingAliasDeclarations, 'explicit CSS aliases must be declared').toEqual([]);

    const canonicalCssNames = new Set(
      Array.from(declaredNames, (name) => intentionalAliases[name] ?? name),
    );
    const missingInCss = sortedUnique(
      Array.from(exportedNames).filter((name) => !canonicalCssNames.has(name)),
    );
    const extraInCss = sortedUnique(
      Array.from(canonicalCssNames).filter((name) => !exportedNames.has(name)),
    );

    expect(missingInCss, 'exported TypeScript tokens missing from CSS').toEqual([]);
    expect(extraInCss, 'CSS tokens missing from TypeScript exports').toEqual([]);
  });
});
