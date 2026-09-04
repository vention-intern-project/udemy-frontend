// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activateContextualNavigationOnSpace,
  ContextualNavigationLink,
} from '../../../src/shared/ui/primitives';

afterEach(cleanup);

const CONTEXTUAL_NAVIGATION_LINK_STYLES = readFileSync(
  pathToFileURL(
    resolve(process.cwd(), 'src/shared/ui/primitives/ContextualNavigationLink.module.css'),
  ),
  'utf8',
);

function cssDeclarationBlock(source: string, selector: string): string {
  const selectorOffset = source.indexOf(`${selector} {`);
  expect(selectorOffset).toBeGreaterThanOrEqual(0);
  const blockStart = source.indexOf('{', selectorOffset);
  const blockEnd = source.indexOf('}', blockStart);
  expect(blockEnd).toBeGreaterThan(blockStart);
  return source.slice(blockStart + 1, blockEnd);
}

describe('ContextualNavigationLink', () => {
  it('owns the complete DD-258 contextual-link typography contract', () => {
    const linkRule = cssDeclarationBlock(CONTEXTUAL_NAVIGATION_LINK_STYLES, '.link');

    expect(linkRule).toContain('font-size: var(--type-body-md-size);');
    expect(linkRule).toContain('font-weight: var(--font-weight-medium);');
    expect(linkRule).toContain('line-height: var(--type-body-md-lh);');
  });

  it('keeps the caller destination and accessible link semantics while adding its shared class', () => {
    render(
      <MemoryRouter>
        <ContextualNavigationLink className="page-placement" to="/learning">
          Back to my learning
        </ContextualNavigationLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Back to my learning' });
    expect(link.getAttribute('href')).toBe('/learning');
    expect(link.classList.contains('page-placement')).toBe(true);
    expect(link.classList.length).toBeGreaterThan(1);
  });

  it('activates only unmodified Space through the existing link click path', () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <ContextualNavigationLink
          to="/learning"
          onClick={onClick}
          onKeyDown={activateContextualNavigationOnSpace}
        >
          Back to my learning
        </ContextualNavigationLink>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Back to my learning' });
    fireEvent.keyDown(link, { key: 'Space', code: 'Space' });
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(link, { key: ' ', shiftKey: true });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
