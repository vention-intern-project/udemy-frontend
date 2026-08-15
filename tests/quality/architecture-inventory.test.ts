import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { APP_ROUTES } from '../../src/app/router/route-registry';

interface DocumentedRoute {
  id: string;
  path: string;
  title: string;
  pageModule: string;
  pageExport: string;
}

interface DocumentedLayer {
  name: string;
  directory: string;
}

interface InventorySnapshot {
  routes: readonly DocumentedRoute[];
  layers: readonly DocumentedLayer[];
}

interface PublicPageExport {
  exportName: string;
  modulePath: string;
}

interface RoutePageBinding {
  id: string;
  pageExport: string;
}

interface LiveInventory {
  routes: readonly DocumentedRoute[];
  layers: readonly DocumentedLayer[];
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const inventoryPath = resolve(repositoryRoot, 'docs/architecture/frontend-inventory.md');
const layerMapPath = resolve(repositoryRoot, 'docs/architecture/layer-map.md');
const appRouterPath = resolve(repositoryRoot, 'src/app/router/AppRouter.tsx');
const pagesIndexPath = resolve(repositoryRoot, 'src/pages/index.ts');

function tableRows(document: string, heading: string): string[] {
  const section = document.split(heading)[1]?.split('\n## ')[0];

  if (!section) throw new Error(`Missing inventory section: ${heading}`);

  return section
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('---'))
    .slice(1);
}

function documentedInventory(document: string): InventorySnapshot {
  const routes = tableRows(document, '## Registered routes').map((row) => {
    const [id, path, title, pageModule] = row
      .split('|')
      .slice(1, 5)
      .map((cell) => cell.trim());
    const pageMatch = /`(pages\/[^`]+)` \(`([^`]+)`\)/.exec(pageModule);

    if (!pageMatch) throw new Error(`Invalid documented page module: ${pageModule}`);

    return {
      id,
      path: path.replace(/`/g, ''),
      title,
      pageModule: pageMatch[1],
      pageExport: pageMatch[2],
    };
  });
  const layers = tableRows(document, '## Top-level layer owners').map((row) => {
    const [name, directory] = row
      .split('|')
      .slice(1, 3)
      .map((cell) => cell.trim());
    return { name: name.replace(/`/g, ''), directory: directory.replace(/`/g, '') };
  });

  return { routes, layers };
}

function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(pathToFileURL(path), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
}

function publicPageExports(pagesIndex: ts.SourceFile): readonly PublicPageExport[] {
  return pagesIndex.statements.flatMap((statement) => {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.exportClause ||
      !statement.moduleSpecifier
    ) {
      return [];
    }
    if (
      !ts.isNamedExports(statement.exportClause) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return [];
    }
    const modulePath = `pages/${statement.moduleSpecifier.text.replace(/^\.\//, '')}`;

    return statement.exportClause.elements.map((element) => ({
      exportName: element.name.text,
      modulePath,
    }));
  });
}

function routeIdsInCondition(condition: ts.Expression): readonly string[] {
  if (
    ts.isBinaryExpression(condition) &&
    condition.operatorToken.kind === ts.SyntaxKind.BarBarToken
  ) {
    return [...routeIdsInCondition(condition.left), ...routeIdsInCondition(condition.right)];
  }
  if (
    !ts.isBinaryExpression(condition) ||
    condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
  ) {
    return [];
  }

  const routeId = (expression: ts.Expression): string | undefined =>
    ts.isStringLiteral(expression) ? expression.text : undefined;
  const isRouteId = (expression: ts.Expression): boolean =>
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'route' &&
    expression.name.text === 'id';

  if (isRouteId(condition.left)) return routeId(condition.right) ? [routeId(condition.right)!] : [];
  if (isRouteId(condition.right)) return routeId(condition.left) ? [routeId(condition.left)!] : [];
  return [];
}

function returnedPageExport(statement: ts.Statement): string | undefined {
  if (!ts.isReturnStatement(statement) || !statement.expression) return undefined;
  const expression = statement.expression;

  if (ts.isJsxSelfClosingElement(expression) && ts.isIdentifier(expression.tagName)) {
    return expression.tagName.text;
  }
  if (ts.isJsxElement(expression) && ts.isIdentifier(expression.openingElement.tagName)) {
    return expression.openingElement.tagName.text;
  }
  return undefined;
}

function appRouterBindings(appRouter: ts.SourceFile): readonly RoutePageBinding[] {
  const pageForRoute = appRouter.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'pageForRoute',
  );

  if (!pageForRoute?.body) throw new Error('Missing pageForRoute in src/app/router/AppRouter.tsx.');

  return pageForRoute.body.statements.flatMap((statement) => {
    if (!ts.isIfStatement(statement)) return [];
    const pageExport = returnedPageExport(statement.thenStatement);
    if (!pageExport) return [];

    return routeIdsInCondition(statement.expression).map((id) => ({ id, pageExport }));
  });
}

function liveRouteInventory(): readonly DocumentedRoute[] {
  const exportedPages = new Map(
    publicPageExports(sourceFile(pagesIndexPath)).map((page) => [page.exportName, page.modulePath]),
  );
  const bindings = new Map(
    appRouterBindings(sourceFile(appRouterPath)).map((binding) => [binding.id, binding]),
  );

  return APP_ROUTES.map((route) => {
    const binding = bindings.get(route.id);
    if (!binding) throw new Error(`AppRouter pageForRoute has no page mapping for ${route.id}.`);
    const pageModule = exportedPages.get(binding.pageExport);
    if (!pageModule) {
      throw new Error(
        `AppRouter maps ${route.id} to ${binding.pageExport}, which src/pages/index.ts does not export.`,
      );
    }
    return {
      id: route.id,
      path: route.path,
      title: route.title,
      pageModule,
      pageExport: binding.pageExport,
    };
  });
}

function sortedRows(rows: readonly string[]): string[] {
  return [...rows].sort((left, right) => left.localeCompare(right));
}

function validateInventory(documented: InventorySnapshot, live: LiveInventory): string[] {
  const documentedRoutes = sortedRows(
    documented.routes.map((route) => `${route.id} ${route.path}`),
  );
  const liveRoutes = sortedRows(live.routes.map((route) => `${route.id} ${route.path}`));
  const documentedTitles = sortedRows(
    documented.routes.map((route) => `${route.id} ${route.title}`),
  );
  const liveTitles = sortedRows(live.routes.map((route) => `${route.id} ${route.title}`));
  const documentedMappings = sortedRows(
    documented.routes.map((route) => `${route.id} ${route.pageModule} ${route.pageExport}`),
  );
  const liveMappings = sortedRows(
    live.routes.map((route) => `${route.id} ${route.pageModule} ${route.pageExport}`),
  );
  const documentedModules = new Set(documented.routes.map((route) => route.pageModule));
  const liveModules = new Set(live.routes.map((route) => route.pageModule));
  const documentedLayers = sortedRows(
    documented.layers.map((layer) => `${layer.name} ${layer.directory}`),
  );
  const liveLayers = sortedRows(live.layers.map((layer) => `${layer.name} ${layer.directory}`));
  const diagnostics: string[] = [];

  if (JSON.stringify(documentedRoutes) !== JSON.stringify(liveRoutes)) {
    diagnostics.push(
      'Documented routes drift from APP_ROUTES. Update docs/architecture/frontend-inventory.md from src/app/router/route-registry.ts.',
    );
  }
  if (JSON.stringify(documentedTitles) !== JSON.stringify(liveTitles)) {
    diagnostics.push(
      'Documented route titles drift from APP_ROUTES. Update docs/architecture/frontend-inventory.md from src/app/router/route-registry.ts.',
    );
  }
  if (JSON.stringify(documentedMappings) !== JSON.stringify(liveMappings)) {
    diagnostics.push(
      'Documented page-module mappings drift from AppRouter and src/pages/index.ts. Update docs/architecture/frontend-inventory.md from those public route/page owners.',
    );
  }
  if (documentedModules.size !== 14 || liveModules.size !== 14) {
    diagnostics.push(
      `Expected 14 unique page modules for 15 registered routes; documented=${documentedModules.size}, live=${liveModules.size}.`,
    );
  }
  if (JSON.stringify(documentedLayers) !== JSON.stringify(liveLayers)) {
    diagnostics.push(
      'Documented top-level layers drift from src/. Update docs/architecture/frontend-inventory.md after an intentional layer change.',
    );
  }

  return diagnostics;
}

function liveInventory(): LiveInventory {
  const layerNames = readdirSync(resolve(repositoryRoot, 'src'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return {
    routes: liveRouteInventory(),
    layers: layerNames.map((name) => ({ name, directory: `src/${name}` })),
  };
}

describe('architecture inventory conformance', () => {
  it('keeps documented routes, page modules, and top-level layer owners aligned with live owners', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');

    expect(validateInventory(documentedInventory(document), liveInventory())).toEqual([]);
  });

  it('reports synthetic route and page-module drift without writing to documentation or source', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const inventory = documentedInventory(document);

    expect(
      validateInventory(
        { ...inventory, routes: [...inventory.routes, { ...inventory.routes[0], id: 'PAGE-999' }] },
        liveInventory(),
      ),
    ).toContain(
      'Documented routes drift from APP_ROUTES. Update docs/architecture/frontend-inventory.md from src/app/router/route-registry.ts.',
    );
    expect(
      validateInventory(
        {
          ...inventory,
          routes: inventory.routes.map((route) =>
            route.id === 'PAGE-015' ? { ...route, pageModule: 'pages/missing-page' } : route,
          ),
        },
        liveInventory(),
      ),
    ).toContain(
      'Documented page-module mappings drift from AppRouter and src/pages/index.ts. Update docs/architecture/frontend-inventory.md from those public route/page owners.',
    );
    expect(
      validateInventory(
        documentedInventory(
          document.replace(/(\| PAGE-001 \| `\/`\s*\| )Course catalog/, '$1Stale course catalog'),
        ),
        liveInventory(),
      ),
    ).toContain(
      'Documented route titles drift from APP_ROUTES. Update docs/architecture/frontend-inventory.md from src/app/router/route-registry.ts.',
    );
  });

  it('keeps live inventory separate from historical architecture provenance', () => {
    const layerMap = readFileSync(pathToFileURL(layerMapPath), 'utf8');

    expect(layerMap).toContain('[`frontend-inventory.md`](./frontend-inventory.md)');
    expect(layerMap).toContain('## Historical decision provenance');
    expect(layerMap).not.toContain('Proposed Full Folder Tree');
    expect(layerMap).not.toContain('PAGE-014 | (out of scope)');
  });
});
