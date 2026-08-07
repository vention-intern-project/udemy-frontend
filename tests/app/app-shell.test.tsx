// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell, presentCart } from '../../src/app/layouts/AppShell';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import type { ApiClient, ApiRequestOptions } from '../../src/shared/api';
import { ThemeProvider } from '../../src/shared/ui/theme';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});

function tokenStore(token: string | null): AccessTokenStore {
  return { get: () => token, set() {}, clear() {} };
}

function cartResponse(itemCount: number) {
  return { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: itemCount };
}

function authenticatedClient(
  role: 'student' | 'instructor' | 'admin',
  cart = cartResponse(0),
): ApiClient {
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
            <LocationStateProbe />
          </MemoryRouter>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

function LocationStateProbe() {
  const location = useLocation();
  return <output aria-label="location state">{JSON.stringify(location.state)}</output>;
}

function stubCompactViewport(matches = true) {
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener() {},
    removeEventListener() {},
  }));
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

  it('does not fetch API-002 or render assistant controls for anonymous, instructor, or admin sessions', async () => {
    const anonymousRequest = vi.fn(authenticatedClient('student').request);
    renderShell({ request: anonymousRequest as ApiClient['request'] }, null);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Catalog' })).toBeTruthy());
    expect(screen.getByRole('link', { name: 'Cart' }).getAttribute('href')).toBe('/cart');
    expect(screen.queryByRole('button', { name: 'Open AI assistant' })).toBeNull();
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
    expect(screen.queryByRole('button', { name: 'Open AI assistant' })).toBeNull();
    cleanup();

    const adminRequest = vi.fn(authenticatedClient('admin').request);
    renderShell({ request: adminRequest as ApiClient['request'] }, 'admin-token');
    await waitFor(() =>
      expect(adminRequest.mock.calls.map(([options]) => options.path)).toEqual(['/me']),
    );
    expect(screen.queryByRole('button', { name: 'Open AI assistant' })).toBeNull();
  });

  it('keeps anonymous desktop auth actions secondary and removes Cart from compact DOM order', async () => {
    stubCompactViewport();
    renderShell(authenticatedClient('student'), null, '/login');

    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    await waitFor(() =>
      expect(within(primaryNavigation).getByRole('link', { name: 'Catalog' })).toBeTruthy(),
    );
    const accountNavigation = screen.getByRole('navigation', { name: 'Account navigation' });
    const login = within(accountNavigation).getByRole('link', { name: 'Log in' });

    expect(within(primaryNavigation).queryByRole('link', { name: 'Log in' })).toBeNull();
    expect(login.getAttribute('aria-current')).toBe('page');
    expect(login.className).toContain('navLinkLogin');
    expect(screen.queryByRole('link', { name: 'Cart' })).toBeNull();
    expect(
      [...document.querySelectorAll('a')].map((link) => link.textContent?.trim()),
    ).not.toContain('Cart');
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

  it('keeps decorative header marks inside named links without changing Cart or Profile semantics', async () => {
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const brand = await screen.findByRole('link', { name: 'LearnHub home' });
    const assistant = screen.getByRole('link', { name: 'Open AI assistant' });
    const cart = await screen.findByRole('link', { name: 'Cart (0)' });
    const profile = screen.getByRole('button', { name: 'Account menu for student User' });
    const brandMark = brand.querySelector('img');
    const assistantMark = assistant.querySelector('img');

    expect(brandMark?.getAttribute('aria-hidden')).toBe('true');
    expect(brandMark?.getAttribute('alt')).toBe('');
    expect(brandMark?.getAttribute('src')).toContain('learnhub-book-ui018.png');
    expect(assistantMark?.getAttribute('aria-hidden')).toBe('true');
    expect(assistantMark?.getAttribute('alt')).toBe('');
    expect(assistantMark?.getAttribute('src')).toContain('ai-assistant-navigation-ui018-2.png');
    expect(cart.querySelector('svg')?.getAttribute('stroke-width')).toBe('1.6');
    expect(profile.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a labelled account-details popover and clears the session through Log out', async () => {
    renderShell(authenticatedClient('student'), 'student-token');
    const accountTrigger = await screen.findByRole('button', {
      name: 'Account menu for student User',
    });
    expect(accountTrigger.getAttribute('title')).toBeNull();

    fireEvent.mouseEnter(accountTrigger);
    const accountDetails = screen.getByRole('group', {
      name: 'Account details for student User',
    });
    expect(accountDetails).toBeTruthy();
    expect(screen.getByText('student@example.test')).toBeTruthy();
    expect(screen.getByText('student User')).toBeTruthy();
    expect(screen.getByText('student', { exact: true })).toBeTruthy();
    expect(
      accountDetails.querySelector('[data-part="account-menu-profile"]')?.textContent,
    ).toContain('student User');
    expect(screen.getByRole('separator')).toBeTruthy();

    fireEvent.click(accountTrigger);
    expect(accountTrigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(accountTrigger);
    expect(accountTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('group', { name: 'Account details for student User' })).toBeNull();

    fireEvent.click(accountTrigger);
    expect(accountTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('group', { name: 'Account details for student User' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Account details for student User' })).toBeNull();
    expect(document.activeElement).toBe(accountTrigger);

    fireEvent.click(accountTrigger);
    const logout = screen.getByRole('button', { name: 'Log out' });
    expect(logout.querySelector('svg')).toBeTruthy();

    fireEvent.click(logout);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Account menu/ })).toBeNull();
  });

  it('restores account focus when scroll removes its focused details without stealing outside focus', async () => {
    renderShell(authenticatedClient('student'), 'student-token');
    const accountTrigger = await screen.findByRole('button', {
      name: 'Account menu for student User',
    });

    fireEvent.click(accountTrigger);
    const logout = screen.getByRole('button', { name: 'Log out' });
    act(() => logout.focus());
    expect(document.activeElement).toBe(logout);

    fireEvent.scroll(window);
    expect(screen.queryByRole('group', { name: 'Account details for student User' })).toBeNull();
    expect(document.activeElement).toBe(accountTrigger);

    fireEvent.click(accountTrigger);
    const outsideTarget = document.createElement('button');
    document.body.append(outsideTarget);
    act(() => outsideTarget.focus());
    fireEvent.pointerDown(outsideTarget);
    expect(screen.queryByRole('group', { name: 'Account details for student User' })).toBeNull();
    expect(document.activeElement).toBe(outsideTarget);
    outsideTarget.remove();
  });

  it('uses one route-only labelled bottom navigation for authenticated student mobile', async () => {
    stubCompactViewport();
    const request = vi.fn(authenticatedClient('student').request);
    renderShell({ request: request as ApiClient['request'] }, 'student-token');

    const studentNavigation = await screen.findByRole('navigation', { name: 'Student navigation' });
    expect(
      within(studentNavigation).getByRole('link', { name: 'Catalog' }).getAttribute('href'),
    ).toBe('/');
    expect(
      within(studentNavigation).getByRole('link', { name: 'My learning' }).getAttribute('href'),
    ).toBe('/learning');
    expect(
      within(studentNavigation).getByRole('link', { name: 'AI chat' }).getAttribute('href'),
    ).toBe('/ai-chat');
    await waitFor(() =>
      expect(within(studentNavigation).getByRole('link', { name: 'Cart (0)' })).toBeTruthy(),
    );
    expect(
      within(studentNavigation).getByRole('link', { name: 'Cart (0)' }).getAttribute('href'),
    ).toBe('/cart');
    expect(screen.getByRole('button', { name: 'Account menu for student User' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open AI assistant' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Open navigation|Close navigation/ })).toBeNull();

    fireEvent.click(within(studentNavigation).getByRole('link', { name: 'AI chat' }));
    expect(request.mock.calls.map(([options]) => options.path)).toEqual(['/me', '/cart']);
  });

  it('uses the enrollment-aware assistant destination from student mobile navigation', async () => {
    stubCompactViewport();
    renderShell(
      authenticatedClient('student'),
      'student-token',
      '/learning/enrollments/42/lesson-3',
    );

    const navigation = await screen.findByRole('navigation', { name: 'Student navigation' });
    const assistant = within(navigation).getByRole('link', { name: 'AI chat' });
    expect(assistant.getAttribute('href')).toBe('/learning/enrollments/42/ai-chat');
    fireEvent.click(assistant);
    await waitFor(() =>
      expect(screen.getByLabelText('location state').textContent).toBe(
        '{"returnTo":"/learning/enrollments/42/lesson-3"}',
      ),
    );
  });
});
