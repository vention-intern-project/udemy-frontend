import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { statusAllowsProgress } from '../../../src/features/learning-progress/learning-progress-contracts';

async function readContractsSource(): Promise<string> {
  return readFile(
    new URL(
      '../../../src/features/learning-progress/learning-progress-contracts.ts',
      import.meta.url,
    ),
    'utf8',
  );
}

describe('statusAllowsProgress', () => {
  it.each([
    [undefined, false],
    ['pending_payment', false],
    ['cancelled', false],
    ['active', true],
  ] as const)('preserves %p as %s', (status, expected) => {
    expect(statusAllowsProgress(status)).toBe(expected);
  });

  it('delegates defined enrollment statuses to the public entity entitlement predicate', async () => {
    const source = await readContractsSource();
    const implementation = source.match(
      /export function statusAllowsProgress\([^)]*\): boolean \{(?<body>[\s\S]*?)\n\}/,
    )?.groups?.body;

    expect(source).toContain(
      "import { hasActiveLearningEntitlement, type EnrollmentStatus } from '@entities/enrollment';",
    );
    expect(implementation).toContain('hasActiveLearningEntitlement(status)');
    expect(implementation).not.toMatch(/status\s*===\s*['"]active['"]/);
  });
});
