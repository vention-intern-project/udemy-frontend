// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RouteErrorBoundary } from '../../src/app/router';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RouteErrorBoundary', () => {
  it('contains render failures behind an accessible public-safe recovery state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;

    function RenderTarget() {
      if (shouldThrow) throw new Error('private render diagnostic');
      return <h1>Recovered page</h1>;
    }

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <RouteErrorBoundary>
          <RenderTarget />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    const alert = screen.getByRole('alert');
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeTruthy();
    expect(alert.textContent).toContain('We could not display this page.');
    expect(alert.textContent).not.toContain('private render diagnostic');

    shouldThrow = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Recovered page' })).toBeTruthy();
  });

  it('resets after safe navigation away from a failing route', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function RouteTarget() {
      const location = useLocation();
      if (location.pathname === '/broken') throw new Error('private route failure');
      return <h1>Course catalog</h1>;
    }

    render(
      <MemoryRouter
        initialEntries={['/broken']}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <RouteErrorBoundary>
          <RouteTarget />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    await userEvent.setup().click(screen.getByRole('link', { name: 'Back to catalog' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Course catalog' })).toBeTruthy();
  });
});
