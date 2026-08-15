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

interface DocumentedModuleDirectories {
  layer: string;
  directories: readonly string[];
}

interface InventorySnapshot {
  routes: readonly DocumentedRoute[];
  layers: readonly DocumentedLayer[];
  moduleDirectories: readonly DocumentedModuleDirectories[];
  diagnostics: readonly string[];
}

interface DirectModuleDirectoryParse {
  moduleDirectories: readonly DocumentedModuleDirectories[];
  diagnostics: readonly string[];
}

interface ParsedInlineCodeToken {
  value: string;
  nextCursor: number;
}

interface ParsedDirectModuleDirectoryRow {
  layer: string;
  directories: readonly string[];
}

interface InvalidDirectModuleDirectoryRow {
  diagnostic: string;
}

type DirectModuleDirectoryRowParseResult =
  | { kind: 'parsed'; row: ParsedDirectModuleDirectoryRow }
  | { kind: 'invalid'; issue: InvalidDirectModuleDirectoryRow };

interface DirectModuleDirectorySection {
  lines: readonly string[];
  diagnostics: readonly string[];
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
  moduleDirectories: readonly DocumentedModuleDirectories[];
  diagnostics: readonly string[];
}

type DirectoryEnumerator = (directoryPath: string) => readonly string[];

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = resolve(repositoryRoot, 'src');
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

function directModuleDirectorySection(document: string): DirectModuleDirectorySection {
  const heading = '## Current direct module directories';
  const documentLines = document.split(/\r?\n/);
  const headingIndexes = documentLines.flatMap((line, index) => (line === heading ? [index] : []));

  if (headingIndexes.length === 0) {
    return {
      lines: [],
      diagnostics: [
        'Missing direct module-directory section. Update docs/architecture/frontend-inventory.md.',
      ],
    };
  }
  if (headingIndexes.length > 1) {
    return { lines: [], diagnostics: ['Duplicate direct module-directory section heading.'] };
  }

  const sectionLines: string[] = [];

  for (let index = headingIndexes[0] + 1; index < documentLines.length; index += 1) {
    const line = documentLines[index];

    if (line.startsWith('## ')) break;
    sectionLines.push(line);
  }

  return { lines: sectionLines, diagnostics: [] };
}

function directModuleDirectoryToken(
  line: string,
  cursor: number,
): ParsedInlineCodeToken | undefined {
  if (line[cursor] !== '`') return undefined;

  const closingCursor = line.indexOf('`', cursor + 1);

  if (closingCursor === -1) return undefined;

  const value = line.slice(cursor + 1, closingCursor);

  if (
    value.length === 0 ||
    value.trim() !== value ||
    value === '.' ||
    value === '..' ||
    value.includes('/') ||
    value.includes('\\')
  ) {
    return undefined;
  }

  return { value, nextCursor: closingCursor + 1 };
}

function invalidDirectModuleDirectoryRow(line: string): DirectModuleDirectoryRowParseResult {
  return {
    kind: 'invalid',
    issue: { diagnostic: `Malformed direct module-directory row: ${line}.` },
  };
}

function directModuleDirectoryRowParse(line: string): DirectModuleDirectoryRowParseResult {
  if (!line.startsWith('- ')) return invalidDirectModuleDirectoryRow(line);

  const layerToken = directModuleDirectoryToken(line, 2);

  if (!layerToken || !line.startsWith(': ', layerToken.nextCursor)) {
    return invalidDirectModuleDirectoryRow(line);
  }

  let cursor = layerToken.nextCursor + 2;
  const directories: string[] = [];

  while (cursor < line.length) {
    const directoryToken = directModuleDirectoryToken(line, cursor);

    if (!directoryToken) return invalidDirectModuleDirectoryRow(line);

    directories.push(directoryToken.value);
    cursor = directoryToken.nextCursor;

    if (cursor === line.length) {
      return { kind: 'parsed', row: { layer: layerToken.value, directories } };
    }
    if (!line.startsWith(', ', cursor)) return invalidDirectModuleDirectoryRow(line);
    cursor += 2;
  }

  return invalidDirectModuleDirectoryRow(line);
}

function directModuleDirectoryParse(
  document: string,
  documentedLayers: readonly DocumentedLayer[],
): DirectModuleDirectoryParse {
  const diagnostics: string[] = [];
  const moduleDirectories: DocumentedModuleDirectories[] = [];
  const expectedLayers = new Set<string>();

  documentedLayers.forEach((layer) => {
    if (expectedLayers.has(layer.name)) {
      diagnostics.push(`Documented top-level layer is duplicated: ${layer.name}.`);
    }
    expectedLayers.add(layer.name);
  });
  const section = directModuleDirectorySection(document);

  if (section.diagnostics.length > 0) {
    return { moduleDirectories, diagnostics: [...diagnostics, ...section.diagnostics] };
  }

  const rowsByLayer = new Set<string>();
  section.lines
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const result = directModuleDirectoryRowParse(line);

      if (result.kind === 'invalid') {
        diagnostics.push(result.issue.diagnostic);
        return;
      }

      const { layer, directories } = result.row;

      if (!expectedLayers.has(layer)) {
        diagnostics.push(`Unknown direct module-directory layer: ${layer}.`);
        return;
      }
      if (rowsByLayer.has(layer)) {
        diagnostics.push(`Duplicate direct module-directory layer: ${layer}.`);
        return;
      }
      rowsByLayer.add(layer);
      const duplicateDirectory = directories.find(
        (directory, index) => directories.indexOf(directory) !== index,
      );

      if (duplicateDirectory) {
        diagnostics.push(
          `Duplicate direct module-directory value for ${layer}: ${duplicateDirectory}.`,
        );
        return;
      }
      moduleDirectories.push({ layer, directories });
    });

  expectedLayers.forEach((layer) => {
    if (!rowsByLayer.has(layer)) {
      diagnostics.push(`Missing direct module-directory layer: ${layer}.`);
    }
  });

  return { moduleDirectories, diagnostics };
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
  const directModuleDirectories = directModuleDirectoryParse(document, layers);

  return { routes, layers, ...directModuleDirectories };
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

function routeBindingsById(
  bindings: readonly RoutePageBinding[],
): ReadonlyMap<string, RoutePageBinding> {
  const bindingsById = new Map<string, RoutePageBinding>();

  bindings.forEach((binding) => {
    if (bindingsById.has(binding.id)) {
      throw new Error(
        `AppRouter pageForRoute declares duplicate route ID ${binding.id}. Remove the duplicate branch.`,
      );
    }
    bindingsById.set(binding.id, binding);
  });

  return bindingsById;
}

function liveRouteInventory(): readonly DocumentedRoute[] {
  const exportedPages = new Map(
    publicPageExports(sourceFile(pagesIndexPath)).map((page) => [page.exportName, page.modulePath]),
  );
  const bindings = routeBindingsById(appRouterBindings(sourceFile(appRouterPath)));

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

function canonicalLayerDirectory(layerName: string): string | undefined {
  const directoryPath = resolve(sourceRoot, layerName);

  return dirname(directoryPath) === sourceRoot ? directoryPath : undefined;
}

function directoryNames(directoryPath: string): readonly string[] {
  return readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function liveModuleDirectories(
  documentedLayers: readonly DocumentedLayer[],
  enumerateDirectories: DirectoryEnumerator,
): Pick<LiveInventory, 'moduleDirectories' | 'diagnostics'> {
  const diagnostics: string[] = [];
  const moduleDirectories: DocumentedModuleDirectories[] = [];

  documentedLayers.forEach((layer) => {
    const expectedDirectory = `src/${layer.name}`;
    const directoryPath = canonicalLayerDirectory(layer.name);

    if (!directoryPath) {
      diagnostics.push(`Invalid documented top-level layer name: ${layer.name}.`);
      return;
    }
    if (layer.directory !== expectedDirectory) {
      diagnostics.push(
        `Documented top-level layer directory for ${layer.name} must be ${expectedDirectory}.`,
      );
      return;
    }
    try {
      moduleDirectories.push({
        layer: layer.name,
        directories: enumerateDirectories(directoryPath),
      });
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);

      diagnostics.push(
        `Cannot read canonical direct module-directory owner src/${layer.name}: ${cause}.`,
      );
    }
  });

  return { moduleDirectories, diagnostics };
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
  const documentedModuleDirectories = sortedRows(
    documented.moduleDirectories.flatMap((layer) =>
      layer.directories.map((directory) => `${layer.layer} ${directory}`),
    ),
  );
  const liveModuleDirectories = sortedRows(
    live.moduleDirectories.flatMap((layer) =>
      layer.directories.map((directory) => `${layer.layer} ${directory}`),
    ),
  );
  const diagnostics = [...documented.diagnostics, ...live.diagnostics];

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
  if (JSON.stringify(documentedModuleDirectories) !== JSON.stringify(liveModuleDirectories)) {
    diagnostics.push(
      'Documented direct module directories drift from the live src/<layer> filesystem. Update docs/architecture/frontend-inventory.md.',
    );
  }

  return diagnostics;
}

function liveInventory(
  documented: InventorySnapshot,
  enumerateDirectories: DirectoryEnumerator = directoryNames,
): LiveInventory {
  const layerNames = readdirSync(resolve(repositoryRoot, 'src'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const directModuleDirectories = liveModuleDirectories(documented.layers, enumerateDirectories);

  return {
    routes: liveRouteInventory(),
    layers: layerNames.map((name) => ({ name, directory: `src/${name}` })),
    ...directModuleDirectories,
  };
}

describe('architecture inventory conformance', () => {
  it('keeps documented routes, page modules, and top-level layer owners aligned with live owners', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');

    const inventory = documentedInventory(document);

    expect(validateInventory(inventory, liveInventory(inventory))).toEqual([]);
  });

  it('reports synthetic route and page-module drift without writing to documentation or source', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const inventory = documentedInventory(document);

    expect(
      validateInventory(
        { ...inventory, routes: [...inventory.routes, { ...inventory.routes[0], id: 'PAGE-999' }] },
        liveInventory(inventory),
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
        liveInventory(inventory),
      ),
    ).toContain(
      'Documented page-module mappings drift from AppRouter and src/pages/index.ts. Update docs/architecture/frontend-inventory.md from those public route/page owners.',
    );
    expect(
      validateInventory(
        documentedInventory(
          document.replace(/(\| PAGE-001 \| `\/`\s*\| )Course catalog/, '$1Stale course catalog'),
        ),
        liveInventory(inventory),
      ),
    ).toContain(
      'Documented route titles drift from APP_ROUTES. Update docs/architecture/frontend-inventory.md from src/app/router/route-registry.ts.',
    );
  });

  it('reports added, removed, and renamed immediate module-directory drift', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const diagnostic =
      'Documented direct module directories drift from the live src/<layer> filesystem. Update docs/architecture/frontend-inventory.md.';
    const mutations = [
      document.replace(
        '`app`: `layouts`, `query`, `router`',
        '`app`: `layouts`, `query`, `router`, `extra`',
      ),
      document.replace('`app`: `layouts`, `query`, `router`', '`app`: `layouts`, `query`'),
      document.replace(
        '`app`: `layouts`, `query`, `router`',
        '`app`: `layouts`, `query`, `renamed-router`',
      ),
    ];

    mutations.forEach((mutation) => {
      const inventory = documentedInventory(mutation);

      expect(validateInventory(inventory, liveInventory(inventory))).toContain(diagnostic);
    });
  });

  it('reports every invalid direct-module grammar and structural input without partial acceptance', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const appRow = '- `app`: `layouts`, `query`, `router`';
    const malformedRowDiagnostic = (row: string): string =>
      `Malformed direct module-directory row: ${row}.`;
    const rowDiagnostics = [
      {
        document: document.replace(
          '## Current direct module directories',
          '## Removed directories',
        ),
        diagnostic:
          'Missing direct module-directory section. Update docs/architecture/frontend-inventory.md.',
      },
      {
        document: document.replace(
          '## Current direct module directories',
          '## Current direct module directories\n\n## Current direct module directories',
        ),
        diagnostic: 'Duplicate direct module-directory section heading.',
      },
      {
        document: document.replace(appRow, '- `app`'),
        diagnostic: 'Malformed direct module-directory row: - `app`.',
      },
      {
        document: document.replace(
          appRow,
          '- `app`: `layouts`, `query`, `router`, undocumented-module',
        ),
        diagnostic: malformedRowDiagnostic(
          '- `app`: `layouts`, `query`, `router`, undocumented-module',
        ),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`, `query`, `router`, '),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts`, `query`, `router`, '),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`; `query`'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts`; `query`'),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts` residual'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts` residual'),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts``query`'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts``query`'),
      },
      {
        document: document.replace(appRow, ` ${appRow}`),
        diagnostic: malformedRowDiagnostic(` ${appRow}`),
      },
      {
        document: document.replace(appRow, `${appRow} `),
        diagnostic: malformedRowDiagnostic(`${appRow} `),
      },
      {
        document: document.replace(appRow, '- `app`:\t`layouts`, `query`, `router`'),
        diagnostic: malformedRowDiagnostic('- `app`:\t`layouts`, `query`, `router`'),
      },
      {
        document: document.replace(appRow, '- `app`: '),
        diagnostic: malformedRowDiagnostic('- `app`: '),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`, ``'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts`, ``'),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`, ` ../outside`'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts`, ` ../outside`'),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`, `nested/module`'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts`, `nested/module`'),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`, `unterminated'),
        diagnostic: malformedRowDiagnostic('- `app`: `layouts`, `unterminated'),
      },
      {
        document: document.replace(appRow, '- `app`: `layouts`, `query`, `query`'),
        diagnostic: 'Duplicate direct module-directory value for app: query.',
      },
      {
        document: document.replace(`${appRow}\n`, ''),
        diagnostic: 'Missing direct module-directory layer: app.',
      },
      {
        document: document.replace(appRow, `${appRow}\n${appRow}`),
        diagnostic: 'Duplicate direct module-directory layer: app.',
      },
      {
        document: document.replace(
          '\n## Maintenance rule',
          '\n- `unknown`: `module`\n\n## Maintenance rule',
        ),
        diagnostic: 'Unknown direct module-directory layer: unknown.',
      },
      {
        document: document.replace(
          '\n## Maintenance rule',
          '\nDirect module directory prose\n\n## Maintenance rule',
        ),
        diagnostic: malformedRowDiagnostic('Direct module directory prose'),
      },
    ];

    rowDiagnostics.forEach(({ document: mutatedDocument, diagnostic }) => {
      const inventory = documentedInventory(mutatedDocument);

      expect(validateInventory(inventory, liveInventory(inventory))).toContain(diagnostic);
    });
  });

  it('accepts the complete current direct-module grammar independent of row and token order', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const reorderedDocument = document
      .replace('- `app`: `layouts`, `query`, `router`', '- `app`: `router`, `layouts`, `query`')
      .replace(
        '- `entities`: `api`, `cart`, `course`, `enrollment`, `user`\n- `shared`: `accessibility`, `api`, `types`, `ui`',
        '- `shared`: `accessibility`, `api`, `types`, `ui`\n- `entities`: `api`, `cart`, `course`, `enrollment`, `user`',
      );
    const inventory = documentedInventory(reorderedDocument);

    expect(inventory.diagnostics).toEqual([]);
    expect(validateInventory(inventory, liveInventory(inventory))).toEqual([]);
  });

  it('constrains direct-module discovery to canonical source-layer directories', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const layerDirectoryMutations = [
      {
        document: document.replace('| `app`      | `src/app`', '| `app`      | `../outside`'),
        diagnostic: 'Documented top-level layer directory for app must be src/app.',
      },
      {
        document: document.replace('| `app`      | `src/app`', '| `app`      | `C:/outside`'),
        diagnostic: 'Documented top-level layer directory for app must be src/app.',
      },
      {
        document: document.replace('| `app`      | `src/app`', '| `../outside` | `src/../outside`'),
        diagnostic: 'Invalid documented top-level layer name: ../outside.',
      },
    ];

    layerDirectoryMutations.forEach(({ document: mutatedDocument, diagnostic }) => {
      const inventory = documentedInventory(mutatedDocument);
      const requestedPaths: string[] = [];
      const enumerateDirectories: DirectoryEnumerator = (directoryPath) => {
        requestedPaths.push(directoryPath);
        return directoryNames(directoryPath);
      };

      expect(
        validateInventory(inventory, liveInventory(inventory, enumerateDirectories)),
      ).toContain(diagnostic);
      expect(requestedPaths).not.toContain(resolve(sourceRoot, '../outside'));
    });
  });

  it('reports an inaccessible canonical layer directory with its preserved cause', () => {
    const document = readFileSync(pathToFileURL(inventoryPath), 'utf8');
    const inventory = documentedInventory(document);
    const enumerateDirectories: DirectoryEnumerator = (directoryPath) => {
      if (directoryPath === resolve(sourceRoot, 'app')) {
        throw new Error('ENOENT injected missing canonical directory');
      }
      return directoryNames(directoryPath);
    };

    expect(validateInventory(inventory, liveInventory(inventory, enumerateDirectories))).toContain(
      'Cannot read canonical direct module-directory owner src/app: ENOENT injected missing canonical directory.',
    );
  });

  it('rejects a duplicate AppRouter route binding from an in-memory source fixture', () => {
    const duplicateRouter = ts.createSourceFile(
      'AppRouter.tsx',
      `function pageForRoute(route: { id: string }) {
        if (route.id === 'PAGE-001') return <CatalogPage />;
        if (route.id === 'PAGE-001') return <LoginPage />;
      }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    expect(() => routeBindingsById(appRouterBindings(duplicateRouter))).toThrow(
      'AppRouter pageForRoute declares duplicate route ID PAGE-001. Remove the duplicate branch.',
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
