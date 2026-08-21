import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { APP_ROUTES } from '../../src/app/router';
import { MLUX_003_SOURCE_EXCLUSIONS } from './mlux003-source-exclusions';

const PLACEHOLDER_NOTE = 'Use the navigation to continue exploring LearnHub.';

interface PlaceholderSourceSeam {
  readonly sourcePath: string;
  readonly line: number;
  readonly seam: 'jsx';
  readonly value: string;
}

function registeredRouteIdsMissingConcretePage(
  appRouterSource: string,
  routeIds: readonly (typeof APP_ROUTES)[number]['id'][],
): readonly string[] {
  const sourceFile = ts.createSourceFile(
    'AppRouter.tsx',
    appRouterSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const pageForRoute = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'pageForRoute',
  );
  if (!pageForRoute?.body) return [...routeIds];

  let fallbackOffset = -1;
  const findFallback = (node: ts.Node): void => {
    if (
      ts.isReturnStatement(node) &&
      node.expression &&
      ts.isJsxSelfClosingElement(node.expression) &&
      node.expression.tagName.getText(sourceFile) === 'PlaceholderPage'
    ) {
      fallbackOffset = node.getStart(sourceFile);
      return;
    }
    ts.forEachChild(node, findFallback);
  };
  findFallback(pageForRoute.body);
  if (fallbackOffset < 0) return [...routeIds];

  const routeIdsInCondition = (node: ts.Expression): readonly string[] => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      return [...routeIdsInCondition(node.left), ...routeIdsInCondition(node.right)];
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      node.left.getText(sourceFile) === 'route.id' &&
      ts.isStringLiteral(node.right)
    ) {
      return [node.right.text];
    }
    return [];
  };

  const concretePageTagReturnedBy = (statement: ts.Statement): string | null => {
    const returnStatement = ts.isReturnStatement(statement)
      ? statement
      : ts.isBlock(statement) &&
          statement.statements.length === 1 &&
          ts.isReturnStatement(statement.statements[0])
        ? statement.statements[0]
        : null;
    const expression = returnStatement?.expression;
    if (!expression) return null;
    if (ts.isJsxSelfClosingElement(expression)) return expression.tagName.getText(sourceFile);
    if (ts.isJsxElement(expression)) return expression.openingElement.tagName.getText(sourceFile);
    return null;
  };

  const handledRouteIds = new Set<string>();
  const collectHandledRouteIds = (node: ts.Node): void => {
    if (node.getStart(sourceFile) >= fallbackOffset) return;
    if (ts.isIfStatement(node)) {
      const returnedPageTag = concretePageTagReturnedBy(node.thenStatement);
      if (returnedPageTag && returnedPageTag !== 'PlaceholderPage') {
        for (const routeId of routeIdsInCondition(node.expression)) {
          handledRouteIds.add(routeId);
        }
      }
      return;
    }
    ts.forEachChild(node, collectHandledRouteIds);
  };
  collectHandledRouteIds(pageForRoute.body);

  return routeIds.filter((routeId) => !handledRouteIds.has(routeId));
}

function sourceSeamForValue(
  sourcePath: string,
  source: string,
  value: string,
): PlaceholderSourceSeam {
  const offset = source.indexOf(value);
  if (offset < 0) throw new Error(`Missing exact source value in ${sourcePath}: ${value}`);

  return {
    sourcePath,
    line: source.slice(0, offset).split(/\r?\n/).length,
    seam: 'jsx',
    value,
  };
}

describe('PlaceholderPage source-bound exclusion', () => {
  const appRouterSource = readFileSync(
    new URL('../../src/app/router/AppRouter.tsx', import.meta.url),
    'utf8',
  );
  const placeholderSourcePath = 'src/app/router/PlaceholderPage.tsx';
  const placeholderSource = readFileSync(
    new URL('../../src/app/router/PlaceholderPage.tsx', import.meta.url),
    'utf8',
  );

  it('keeps every current registered route on a concrete page before the fallback', () => {
    const routeIds = APP_ROUTES.map(({ id }) => id);

    expect(routeIds).toHaveLength(15);
    expect(registeredRouteIdsMissingConcretePage(appRouterSource, routeIds)).toEqual([]);
  });

  it('detects when a registered route would fall through to PlaceholderPage', () => {
    const mutatedRouterSource = appRouterSource.replace(
      "if (route.id === 'PAGE-001') return <CatalogPage />;",
      '',
    );

    expect(
      registeredRouteIdsMissingConcretePage(
        mutatedRouterSource,
        APP_ROUTES.map(({ id }) => id),
      ),
    ).toEqual(['PAGE-001']);
  });

  it('rejects a route comparison whose branch no longer returns a concrete page', () => {
    const fallthroughRouterSource = appRouterSource.replace(
      "if (route.id === 'PAGE-001') return <CatalogPage />;",
      "if (route.id === 'PAGE-001') { /* compared but not handled */ }",
    );
    const placeholderRouterSource = appRouterSource.replace(
      "if (route.id === 'PAGE-001') return <CatalogPage />;",
      "if (route.id === 'PAGE-001') return <PlaceholderPage route={route} />;",
    );

    expect(
      registeredRouteIdsMissingConcretePage(
        fallthroughRouterSource,
        APP_ROUTES.map(({ id }) => id),
      ),
    ).toEqual(['PAGE-001']);
    expect(
      registeredRouteIdsMissingConcretePage(
        placeholderRouterSource,
        APP_ROUTES.map(({ id }) => id),
      ),
    ).toEqual(['PAGE-001']);
  });

  it('binds the raw fallback note to one exact DRAFT-25 exclusion fingerprint', () => {
    const sourceSeam = sourceSeamForValue(
      placeholderSourcePath,
      placeholderSource,
      PLACEHOLDER_NOTE,
    );

    expect(sourceSeam).toEqual({
      sourcePath: placeholderSourcePath,
      line: 16,
      seam: 'jsx',
      value: PLACEHOLDER_NOTE,
    });
    expect(MLUX_003_SOURCE_EXCLUSIONS).toEqual([
      {
        id: 'MLUX-X012',
        corpusVersion: 'MLUX-001-DRAFT-25',
        ...sourceSeam,
        status: 'Excluded',
        origin: 'Current-route unreachable fallback note',
        boundaryReason:
          'AppRouter.pageForRoute handles every current APP_ROUTES ID with a concrete page before its final PlaceholderPage fallback. This exact path/line/seam/value is non-renderable for the current registry; a route-coverage regression test must fail if a future registered route can reach the fallback.',
      },
    ]);
  });
});
