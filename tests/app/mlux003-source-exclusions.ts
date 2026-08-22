interface Mlux003SourceExclusion {
  readonly id: 'MLUX-X012';
  readonly corpusVersion: 'MLUX-001-DRAFT-26';
  readonly sourcePath: 'src/app/router/PlaceholderPage.tsx';
  readonly line: 16;
  readonly seam: 'jsx';
  readonly value: 'Use the navigation to continue exploring LearnHub.';
  readonly origin: 'Current-route unreachable fallback note';
  readonly status: 'Excluded';
  readonly boundaryReason: string;
}

export const MLUX_003_SOURCE_EXCLUSIONS = [
  {
    id: 'MLUX-X012',
    corpusVersion: 'MLUX-001-DRAFT-26',
    sourcePath: 'src/app/router/PlaceholderPage.tsx',
    line: 16,
    seam: 'jsx',
    value: 'Use the navigation to continue exploring LearnHub.',
    origin: 'Current-route unreachable fallback note',
    status: 'Excluded',
    boundaryReason:
      'AppRouter.pageForRoute handles every current APP_ROUTES ID with a concrete page before its final PlaceholderPage fallback. This exact path/line/seam/value is non-renderable for the current registry; a route-coverage regression test must fail if a future registered route can reach the fallback.',
  },
] as const satisfies readonly Mlux003SourceExclusion[];
