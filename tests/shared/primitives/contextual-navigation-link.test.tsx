// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { ContextualNavigationLink } from '../../../src/shared/ui/primitives';

afterEach(cleanup);

describe('ContextualNavigationLink', () => {
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
});
