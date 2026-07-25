import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as tokenExports from '../../../src/shared/ui/tokens';

const tokensCss = readFileSync(
  new URL('../../../src/shared/ui/tokens/tokens.css', import.meta.url),
  'utf8',
);
const mainSource = readFileSync(
  new URL('../../../src/main.tsx', import.meta.url),
  'utf8',
);
const appSource = readFileSync(
  new URL('../../../src/app/App.tsx', import.meta.url),
  'utf8',
);
const primitiveIndexSource = readFileSync(
  new URL('../../../src/shared/ui/primitives/index.ts', import.meta.url),
  'utf8',
);

const intentionalAliases: Readonly<Record<string, string>> = {};
const customPropertyName = /^--[\w-]+$/;
const sourceImport = /^[\t ]*import(?:[\t ]+([^'"\r\n]+?)[\t ]+from)?[\t ]*(['"])([^'"\r\n]+)\2[\t ]*;?[\t ]*$/gm;

interface SourceImportMatch {
  clause: string | undefined;
  path: string;
  offset: number;
}

function sortedUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function collectSourceImports(source: string): SourceImportMatch[] {
  return Array.from(source.matchAll(sourceImport), (match) => ({
    clause: match[1],
    path: match[3],
    offset: match.index,
  }));
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
  it('keeps the production global CSS boundary explicit and foundation-first', () => {
    const mainImports = collectSourceImports(mainSource);
    const appImports = collectSourceImports(appSource);
    const primitiveIndexImports = collectSourceImports(primitiveIndexSource);
    const mainCssImports = mainImports
      .filter((match) => match.clause === undefined && match.path.endsWith('.css'))
      .map((match) => match.path);
    const appCssImports = appImports
      .filter((match) => match.clause === undefined && match.path.endsWith('.css'))
      .map((match) => match.path);
    const primitiveIndexCssImports = primitiveIndexImports
      .filter((match) => match.clause === undefined && match.path.endsWith('.css'))
      .map((match) => match.path);
    const tokenImports = mainImports
      .filter((match) => match.path === './shared/ui/tokens/tokens.css');
    const applicationImports = mainImports
      .filter((match) => match.path === './app');

    expect(mainCssImports).toEqual(['./shared/ui/tokens/tokens.css']);
    expect(appCssImports).toEqual(['./app.css']);
    expect(primitiveIndexCssImports).toEqual([]);
    expect(tokenImports, 'tokens.css must be imported exactly once by the production entry')
      .toHaveLength(1);
    expect(tokenImports[0]?.clause, 'tokens.css must remain a side-effect import')
      .toBeUndefined();
    expect(applicationImports, 'the App entry import must remain present exactly once')
      .toHaveLength(1);
    expect(
      tokenImports[0]?.offset,
      'tokens.css must be loaded before the App reset/element contract',
    ).toBeLessThan(applicationImports[0]?.offset);
  });

  it('keeps exact import paths and order across quote and semicolon formatting', () => {
    const formattingVariant = [
      '  import   "./shared/ui/tokens/tokens.css"',
      'import { App }   from   "./app"  ',
    ].join('\n');
    const imports = collectSourceImports(formattingVariant);
    const tokenImports = imports
      .filter((match) => match.path === './shared/ui/tokens/tokens.css');
    const applicationImports = imports
      .filter((match) => match.path === './app');

    expect(imports.map((match) => match.path)).toEqual([
      './shared/ui/tokens/tokens.css',
      './app',
    ]);
    expect(tokenImports).toHaveLength(1);
    expect(tokenImports[0]?.clause).toBeUndefined();
    expect(applicationImports).toHaveLength(1);
    expect(tokenImports[0]?.offset).toBeLessThan(applicationImports[0]?.offset);
  });

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
