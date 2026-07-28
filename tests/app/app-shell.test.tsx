// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell, presentCart } from '../../src/app/layouts/AppShell';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import type { ApiClient, ApiRequestOptions } from '../../src/shared/api';
import { ThemeProvider } from '../../src/shared/ui/theme';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function tokenStore(token: string | null): AccessTokenStore {
  return { get: () => token, set() {}, clear() {} };
}

function cartResponse(itemCount: number) {
  return { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: itemCount };
}

function authenticatedClient(role: 'student' | 'instructor', cart = cartResponse(0)): ApiClient {
  return {
    request: async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      const value =
        options.path === '/me'
          ? {
              email: `${role}@example.test`,
              name: role,
              surname: 'User',
              role,
              birthday: null,
              phone_number: null,
              created_at: '2026-01-01T00:00:00Z',
            }
          : cart;
      return options.decode ? options.decode(value) : (value as TResponse);
    },
  };
}

function renderShell(client: ApiClient, token: string | null, path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialDensityMode="marketplace">
        <SessionProvider client={client} tokenStore={tokenStore(token)}>
          <MemoryRouter initialEntries={[path]}>
            <AppShell />
          </MemoryRouter>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('AppShell student cart query and presentation', () => {
  it('fetches API-002 immediately for a student through the current cache epoch and renders zero', async () => {
    const request = vi.fn(authenticatedClient('student').request);
    const client = renderShell({ request: request as ApiClient['request'] }, 'student-token');

    expect(await screen.findByRole('link', { name: 'Cart (0)' })).toBeTruthy();
    expect(request.mock.calls.map(([options]) => options.path)).toEqual(['/me', '/cart']);
    expect(
      [...client.getQueryCache().getAll()].some((query) => query.queryKey[2] === 'API-002'),
    ).toBe(true);
  });

  it.each([1, 9, 10, 99, 100])(
    'presents known cart count %s with the required accessible value',
    (itemCount) => {
      const displayedCount = itemCount >= 100 ? '99+' : String(itemCount);
      expect(presentCart(itemCount)).toEqual({
        accessibleName: `Cart (${displayedCount})`,
        badge: displayedCount,
      });
    },
  );

  it('does not fetch API-002 for anonymous or instructor sessions', async () => {
    const anonymousRequest = vi.fn(authenticatedClient('student').request);
    renderShell({ request: anonymousRequest as ApiClient['request'] }, null);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Catalog' })).toBeTruthy());
    expect(screen.getByRole('link', { name: 'Cart' }).getAttribute('href')).toBe('/cart');
    expect(anonymousRequest).not.toHaveBeenCalled();
    cleanup();

    const instructorRequest = vi.fn(authenticatedClient('instructor').request);
    renderShell(
      { request: instructorRequest as ApiClient['request'] },
      'instructor-token',
      '/instructor/courses',
    );
    await waitFor(() =>
      expect(instructorRequest.mock.calls.map(([options]) => options.path)).toEqual(['/me']),
    );
    expect(screen.queryByRole('link', { name: /Cart/ })).toBeNull();
  });

  it('uses the updated shared cache entry and marks the cart active beyond its count', async () => {
    const client = renderShell(authenticatedClient('student'), 'student-token', '/cart');
    const cart = await screen.findByRole('link', { name: 'Cart (0)' });
    expect(cart.getAttribute('aria-current')).toBe('page');
    expect(cart.querySelector('svg')).toBeTruthy();

    const cartQuery = client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          typeof query.state.data === 'object' &&
          query.state.data !== null &&
          'itemCount' in query.state.data,
      );
    expect(cartQuery).toBeTruthy();
    client.setQueryData(cartQuery?.queryKey ?? ['missing-cart-query'], {
      id: 1,
      items: [],
      totalPrice: '0.00',
      currency: 'USD',
      itemCount: 9,
    });
    await waitFor(() => expect(screen.getByRole('link', { name: 'Cart (9)' })).toBeTruthy());
  });
});
