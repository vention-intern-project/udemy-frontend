import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface CssConsumerContract {
  readonly path: string;
  readonly localCustomProperties: readonly string[];
}

const tokenSource = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/shared/ui/tokens/tokens.css')),
  'utf8',
);

const consumerContracts: readonly CssConsumerContract[] = [
  {
    path: 'src/features/auth-workflows/AuthForm.module.css',
    localCustomProperties: ['--auth-physical-scrollbar-offset'],
  },
  { path: 'src/pages/learning-list-page/LearningListPage.module.css', localCustomProperties: [] },
  {
    path: 'src/pages/learning-detail-page/LearningDetailPage.module.css',
    localCustomProperties: [],
  },
  { path: 'src/features/media-access/LessonMediaAccess.module.css', localCustomProperties: [] },
  { path: 'src/features/media-access/LessonPdfPreview.module.css', localCustomProperties: [] },
  {
    path: 'src/widgets/enrollment-progress-panel/EnrollmentProgressPanel.module.css',
    localCustomProperties: [],
  },
];

const retiredTokenNames = [
  '--feedback-success-fg',
  '--feedback-warning-fg',
  '--feedback-error-fg',
  '--surface-default',
  '--radius-control',
  '--radius-card',
  '--font-size-lg',
  '--font-size-sm',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--spacing-5',
] as const;

function customProperties(source: string): Set<string> {
  return new Set(Array.from(source.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1]));
}

describe('defined CSS token consumers', () => {
  it('keeps each transferred consumer on a declared global token or its verified local variable', () => {
    const globalCustomProperties = new Set(
      Array.from(tokenSource.matchAll(/^\s*(--[\w-]+)\s*:/gm), (match) => match[1]),
    );
    const unknownReferences: string[] = [];

    for (const contract of consumerContracts) {
      const source = readFileSync(pathToFileURL(resolve(process.cwd(), contract.path)), 'utf8');
      const permitted = new Set([...globalCustomProperties, ...contract.localCustomProperties]);
      for (const customProperty of customProperties(source)) {
        if (!permitted.has(customProperty)) {
          unknownReferences.push(`${contract.path}: ${customProperty}`);
        }
      }
    }

    expect(unknownReferences).toEqual([]);
  });

  it('does not reintroduce transferred legacy aliases', () => {
    for (const contract of consumerContracts) {
      const source = readFileSync(pathToFileURL(resolve(process.cwd(), contract.path)), 'utf8');
      for (const retiredTokenName of retiredTokenNames) {
        expect(source, `${contract.path} must not use ${retiredTokenName}`).not.toContain(
          retiredTokenName,
        );
      }
    }
  });

  it('collects and rejects an undefined token with CSS whitespace after var(', () => {
    const references = customProperties('color: var( --undefined-token);');
    const declaredTokenNames = new Set(['--color-surface']);
    const unknownReferences = Array.from(references).filter(
      (customProperty) => !declaredTokenNames.has(customProperty),
    );

    expect(unknownReferences).toEqual(['--undefined-token']);
  });
});
