// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as tokenExports from '../../../src/shared/ui/tokens';
import {
  borderTokens,
  breakpointTokens,
  colorTokens,
  densityCssVarNames,
  densityTokens,
  motionTokens,
  shadowTokens,
  spacingTokens,
  stateTokens,
  TYPE_DISPLAY_MOBILE,
  TYPE_PAGE_H1_MOBILE,
  TYPE_SECTION_H2_MOBILE,
  typographyTokens,
  zIndexTokens,
} from '../../../src/shared/ui/tokens';

const tokensCss = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/shared/ui/tokens/tokens.css')),
  'utf8',
);
const mainSource = readFileSync(pathToFileURL(resolve(process.cwd(), 'src/main.tsx')), 'utf8');
const appSource = readFileSync(pathToFileURL(resolve(process.cwd(), 'src/app/App.tsx')), 'utf8');
const primitiveIndexSource = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/shared/ui/primitives/index.ts')),
  'utf8',
);

const intentionalAliases: Readonly<Record<string, string>> = {};
const customPropertyName = /^--[\w-]+$/;
const sourceImport =
  /^[\t ]*import(?:[\t ]+([^'"\r\n]+?)[\t ]+from)?[\t ]*(['"])([^'"\r\n]+)\2[\t ]*;?[\t ]*$/gm;

interface SourceImportMatch {
  clause: string | undefined;
  path: string;
  offset: number;
}

interface CssDeclarationRule {
  readonly media: string | null;
  readonly selectors: readonly string[];
  readonly values: ReadonlyMap<string, string>;
}

type CssTokenMap = Readonly<Record<string, string>>;

function normalizeCssValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/(['"])([^'"]*)\1/g, '"$2"')
    .replace(/\s+/g, ' ');
}

function normalizeCssSelector(selector: string): string {
  return selector.trim().replace(/(['"])([^'"]*)\1/g, '"$2"');
}

function cssDeclarationRules(source: string): CssDeclarationRule[] {
  const style = document.createElement('style');
  style.textContent = source;
  document.head.append(style);
  const sheet = style.sheet;
  if (!sheet) throw new Error('Expected tokens.css to produce a CSSStyleSheet.');
  const collected: CssDeclarationRule[] = [];

  function visit(rules: CSSRuleList, media: string | null) {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule;
        const values = new Map<string, string>();
        for (const name of Array.from(styleRule.style)) {
          if (name.startsWith('--')) values.set(name, styleRule.style.getPropertyValue(name));
        }
        collected.push({
          media,
          selectors: styleRule.selectorText.split(',').map((selector) => selector.trim()),
          values,
        });
      } else if (rule.type === CSSRule.MEDIA_RULE) {
        const mediaRule = rule as CSSMediaRule;
        visit(mediaRule.cssRules, mediaRule.conditionText);
      }
    }
  }

  visit(sheet.cssRules, null);
  style.remove();
  return collected;
}

function declarationsFor(
  rules: readonly CssDeclarationRule[],
  selector: string,
  media: string | null,
): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const rule of rules) {
    if (
      rule.media !== media ||
      !rule.selectors.some(
        (ruleSelector) => normalizeCssSelector(ruleSelector) === normalizeCssSelector(selector),
      )
    ) {
      continue;
    }
    for (const [name, value] of rule.values) declarations.set(name, value);
  }
  return declarations;
}

function tokenValueMismatches(
  expected: CssTokenMap,
  actual: ReadonlyMap<string, string>,
): string[] {
  return Object.entries(expected)
    .filter(
      ([name, value]) => normalizeCssValue(actual.get(name) ?? '') !== normalizeCssValue(value),
    )
    .map(([name]) => name)
    .sort();
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

function collectExportedTokenNames(value: unknown, names: Set<string>, visited: Set<object>) {
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
    const tokenImports = mainImports.filter(
      (match) => match.path === './shared/ui/tokens/tokens.css',
    );
    const applicationImports = mainImports.filter((match) => match.path === './app');

    expect(mainCssImports).toEqual(['./shared/ui/tokens/tokens.css']);
    expect(appCssImports).toEqual(['./app.css']);
    expect(primitiveIndexCssImports).toEqual([]);
    expect(
      tokenImports,
      'tokens.css must be imported exactly once by the production entry',
    ).toHaveLength(1);
    expect(tokenImports[0]?.clause, 'tokens.css must remain a side-effect import').toBeUndefined();
    expect(
      applicationImports,
      'the App entry import must remain present exactly once',
    ).toHaveLength(1);
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
    const tokenImports = imports.filter((match) => match.path === './shared/ui/tokens/tokens.css');
    const applicationImports = imports.filter((match) => match.path === './app');

    expect(imports.map((match) => match.path)).toEqual(['./shared/ui/tokens/tokens.css', './app']);
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
      Array.from(tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm), (match) => match[1]),
    );

    expect(exportedNames.size, 'TypeScript token exports must not be empty').toBeGreaterThan(0);
    expect(declaredNames.size, 'CSS token declarations must not be empty').toBeGreaterThan(0);
    for (const sentinel of ['--color-canvas', '--spacing-2', '--control-height-md']) {
      expect(exportedNames.has(sentinel), `TypeScript exports must include ${sentinel}`).toBe(true);
      expect(declaredNames.has(sentinel), `CSS declarations must include ${sentinel}`).toBe(true);
    }

    const missingAliasDeclarations = Object.keys(intentionalAliases).filter(
      (alias) => !declaredNames.has(alias),
    );
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

  it('keeps every deliberately dual-published base token value synchronized', () => {
    const rootDeclarations = declarationsFor(cssDeclarationRules(tokensCss), ':root', null);
    const dualPublishedMaps: readonly CssTokenMap[] = [
      colorTokens,
      typographyTokens,
      spacingTokens,
      borderTokens,
      shadowTokens,
      motionTokens,
      breakpointTokens,
      stateTokens,
      zIndexTokens,
    ];

    for (const tokenMap of dualPublishedMaps) {
      expect(tokenValueMismatches(tokenMap, rootDeclarations)).toEqual([]);
    }
  });

  it('keeps both density variants synchronized by selector', () => {
    const rules = cssDeclarationRules(tokensCss);
    for (const mode of ['marketplace', 'workspace'] as const) {
      const declarations = declarationsFor(rules, `[data-density="${mode}"]`, null);
      const expected = Object.fromEntries(
        Object.entries(densityTokens[mode]).map(([key, value]) => [
          densityCssVarNames[key as keyof typeof densityCssVarNames],
          value,
        ]),
      );
      expect(tokenValueMismatches(expected, declarations)).toEqual([]);
    }
  });

  it('fails closed when a declaration keeps its name but changes value', () => {
    const wrongValueFixture = new Map([['--spacing-2', '9px']]);
    expect(
      tokenValueMismatches({ '--spacing-2': spacingTokens['--spacing-2'] }, wrongValueFixture),
    ).toEqual(['--spacing-2']);
  });

  it('keeps deliberately dual-published base typography values synchronized', () => {
    const rootDeclarations = declarationsFor(cssDeclarationRules(tokensCss), ':root', null);
    expect(tokenValueMismatches(typographyTokens, rootDeclarations)).toEqual([]);
  });

  it('publishes the accepted mobile Display, H1, and H2 overrides', () => {
    const mobileBlock = tokensCss.match(/@media \(max-width: 767px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(mobileBlock).toContain(`--type-display-size: ${TYPE_DISPLAY_MOBILE.fontSize}`);
    expect(mobileBlock).toContain(`--type-display-lh: ${TYPE_DISPLAY_MOBILE.lineHeight}`);
    expect(mobileBlock).toContain(`--type-page-h1-size: ${TYPE_PAGE_H1_MOBILE.fontSize}`);
    expect(mobileBlock).toContain(`--type-page-h1-lh: ${TYPE_PAGE_H1_MOBILE.lineHeight}`);
    expect(mobileBlock).toContain(`--type-section-h2-size: ${TYPE_SECTION_H2_MOBILE.fontSize}`);
    expect(mobileBlock).toContain(`--type-section-h2-lh: ${TYPE_SECTION_H2_MOBILE.lineHeight}`);
  });
});
