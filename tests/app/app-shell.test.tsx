// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell, presentCart } from '../../src/app/layouts/AppShell';
import { AppRouter } from '../../src/app/router/AppRouter';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import type { ApiClient, ApiRequestOptions } from '../../src/shared/api';
import { ThemeProvider } from '../../src/shared/ui/theme';
import { LocaleProvider, localeRuntime } from '../../src/shared/locale';

const APP_SHELL_STYLES = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/app/layouts/AppShell.module.css')),
  'utf8',
);
const DESKTOP_APP_SHELL_STYLES = APP_SHELL_STYLES.slice(
  APP_SHELL_STYLES.lastIndexOf('@media (min-width: 768px) {'),
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  await localeRuntime.changeLanguage('en');
  localStorage.clear();
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
        <LocaleProvider>
          <SessionProvider client={client} tokenStore={tokenStore(token)}>
            <MemoryRouter initialEntries={[path]}>
              <AppShell />
              <LocationStateProbe />
            </MemoryRouter>
          </SessionProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

function renderRouter(client: ApiClient, token: string | null, path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialDensityMode="marketplace">
        <LocaleProvider>
          <SessionProvider client={client} tokenStore={tokenStore(token)}>
            <MemoryRouter initialEntries={[path]}>
              <AppRouter />
            </MemoryRouter>
          </SessionProvider>
        </LocaleProvider>
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
  it('keeps Instructor courses active beside LearnHub and styles Create course as the active header action', async () => {
    const request = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (options.path === '/me')
          return options.decode?.({
            email: 'instructor@example.test',
            name: 'instructor',
            surname: 'User',
            role: 'instructor',
            birthday: null,
            phone_number: null,
            created_at: '2026-01-01T00:00:00Z',
          }) as TResponse;
        if (options.path === '/courses/my')
          return options.decode?.({
            items: [],
            page: 1,
            page_size: 20,
            total: 0,
            pages: 1,
            has_next: false,
            has_previous: false,
          }) as TResponse;
        throw new Error(`Unexpected request ${options.path}`);
      },
    );
    renderRouter(
      { request: request as ApiClient['request'] },
      'instructor-token',
      '/instructor/courses?source=header#creation',
    );

    const routeLink = await screen.findByRole('link', { name: 'Instructor courses' });
    const header = document.querySelector<HTMLElement>('[data-app-shell-header]');
    const createAction = within(header!).getByRole('button', { name: 'Create course' });
    const titleTarget = screen.getByRole('textbox', { name: 'Course title' });
    const scrollIntoView = vi.fn();
    titleTarget.scrollIntoView = scrollIntoView;
    const user = userEvent.setup();

    expect(routeLink.getAttribute('href')).toBe('/instructor/courses');
    expect(routeLink.getAttribute('aria-current')).toBe('page');
    expect(header!.contains(routeLink)).toBe(true);
    expect(header!.contains(createAction)).toBe(true);
    expect(createAction.className).toContain('navLink');
    expect(createAction.className).toContain('navAction');

    await act(async () => {
      await user.click(createAction);
    });
    expect(document.activeElement).toBe(titleTarget);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(request.mock.calls.map(([options]) => options.path)).toEqual(['/me', '/courses/my']);
  });

  it.each(['/instructor/courses/7/edit', '/instructor/courses/7/enrollments'])(
    'keeps Instructor courses beside LearnHub on %s',
    async (path) => {
      renderShell(authenticatedClient('instructor'), 'instructor-token', path);

      const routeLink = await screen.findByRole('link', { name: 'Instructor courses' });
      const header = document.querySelector<HTMLElement>('[data-app-shell-header]');
      const headerStart = header?.querySelector<HTMLElement>('[class*="headerCatalogStart"]');
      const headerEnd = header?.querySelector<HTMLElement>('[class*="headerCatalogEnd"]');

      expect(headerStart?.contains(routeLink)).toBe(true);
      expect(headerEnd?.contains(routeLink)).toBe(false);
      expect(header?.className).toContain('headerInstructorCourses');
      expect(routeLink.getAttribute('href')).toBe('/instructor/courses');
      expect(routeLink.getAttribute('aria-current')).toBeNull();
    },
  );

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

  it.each([
    { compact: false, label: 'desktop Cart link' },
    { compact: true, label: 'student-mobile Cart link' },
  ])('carries the exact internal source in Router state from the $label', async ({ compact }) => {
    if (compact) stubCompactViewport();
    renderShell(authenticatedClient('student'), 'student-token', '/learning?page=2#courses');

    const cart = await screen.findByRole('link', { name: 'Cart (0)' });
    fireEvent.click(cart);

    expect(screen.getByLabelText('location state').textContent).toBe(
      JSON.stringify({ returnTo: '/learning?page=2#courses' }),
    );
    cleanup();
  });

  it('uses decorative outline icons in desktop named links without changing Cart or Profile semantics', async () => {
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const brand = await screen.findByRole('link', { name: 'LearnHub home' });
    const assistant = screen.getByRole('link', { name: 'Open AI assistant' });
    const cart = await screen.findByRole('link', { name: 'Cart (0)' });
    const profile = screen.getByRole('button', { name: 'Account menu for student User' });
    const brandMark = brand.querySelector('img');
    const assistantIcon = assistant.querySelector('svg');

    expect(brandMark?.getAttribute('aria-hidden')).toBe('true');
    expect(brandMark?.getAttribute('alt')).toBe('');
    expect(brandMark?.getAttribute('src')).toContain('learnhub-book-ui018.png');
    expect(assistant.querySelector('img')).toBeNull();
    expect(assistantIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(assistantIcon?.getAttribute('focusable')).toBe('false');
    expect(assistantIcon?.getAttribute('width')).toBe('28');
    expect(assistantIcon?.getAttribute('height')).toBe('28');
    expect(assistantIcon?.getAttribute('stroke-width')).toBe('1.75');
    expect(cart.querySelector('svg')?.getAttribute('width')).toBe('25');
    expect(cart.querySelector('svg')?.getAttribute('height')).toBe('25');
    expect(cart.querySelector('svg')?.getAttribute('stroke-width')).toBe('1.75');
    expect(profile.getAttribute('aria-expanded')).toBe('false');
  });

  it('delays the AI assistant tooltip for pointers, opens it on focus, and keeps Escape dismissed until blur', async () => {
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const assistant = await screen.findByRole('link', { name: 'Open AI assistant' });
    vi.useFakeTimers();
    expect(screen.queryByRole('tooltip', { name: 'AI chat' })).toBeNull();

    await act(() => fireEvent.pointerEnter(assistant));
    await act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByRole('tooltip', { name: 'AI chat' })).toBeNull();
    await act(() => vi.advanceTimersByTime(1));
    const pointerTooltip = screen.getByRole('tooltip', { name: 'AI chat' });
    expect(assistant.getAttribute('aria-describedby')).toBe(pointerTooltip.id);

    await act(() => fireEvent.pointerLeave(assistant));
    expect(screen.queryByRole('tooltip', { name: 'AI chat' })).toBeNull();

    void act(() => assistant.focus());
    const focusTooltip = screen.getByRole('tooltip', { name: 'AI chat' });
    expect(assistant.getAttribute('aria-describedby')).toBe(focusTooltip.id);
    expect(document.activeElement).toBe(assistant);

    await act(() => fireEvent.keyDown(assistant, { key: 'Escape' }));
    expect(screen.queryByRole('tooltip', { name: 'AI chat' })).toBeNull();
    expect(document.activeElement).toBe(assistant);

    await act(() => fireEvent.pointerEnter(assistant));
    await act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole('tooltip', { name: 'AI chat' })).toBeNull();

    await act(() => fireEvent.blur(assistant));
    await act(() => fireEvent.pointerLeave(assistant));
    await act(() => fireEvent.pointerEnter(assistant));
    await act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('tooltip', { name: 'AI chat' })).toBeTruthy();
  });

  it('renders the Instructor LearnHub brand as an accessible Instructor courses home link', async () => {
    renderShell(authenticatedClient('instructor'), 'instructor-token', '/instructor/courses');
    const user = userEvent.setup();

    await screen.findByRole('link', { name: 'Instructor courses' });
    const header = document.querySelector<HTMLElement>('[data-app-shell-header]');
    const brandMark = header?.querySelector<HTMLImageElement>(
      'img[src*="learnhub-book-ui018.png"]',
    );
    const brand = brandMark?.parentElement;

    const brandLink = screen.getByRole('link', { name: 'LearnHub home' });
    expect(brand?.textContent?.trim()).toBe('LearnHub');
    expect(brandLink.getAttribute('href')).toBe('/instructor/courses');
    expect(brandMark?.getAttribute('aria-hidden')).toBe('true');
    expect(brandMark?.getAttribute('alt')).toBe('');

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Skip to main content' }));
    await user.tab();
    expect(document.activeElement).toBe(brandLink);
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
    expect(screen.getByText('Student', { exact: true })).toBeTruthy();
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

  it.each([
    { locale: 'en', role: 'student', label: 'Student' },
    { locale: 'ru', role: 'instructor', label: 'Преподаватель' },
    { locale: 'uz', role: 'admin', label: 'Administrator' },
  ] as const)(
    'renders the $role account role as $label in $locale and retains same-trigger reopening',
    async ({ locale, role, label }) => {
      localStorage.setItem('learnhub.locale', locale);
      renderShell(authenticatedClient(role), `${role}-token`);

      const accountTrigger = await screen.findByRole('button', {
        name: /account menu|меню аккаунта|akkaunt menyusi/i,
      });
      fireEvent.click(accountTrigger);
      expect(screen.getByText(label, { exact: true })).toBeTruthy();

      fireEvent.click(accountTrigger);
      expect(accountTrigger.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(accountTrigger);
      expect(accountTrigger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByText(label, { exact: true })).toBeTruthy();
    },
  );

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
    const mobileAssistant = within(studentNavigation).getByRole('link', { name: 'AI chat' });
    expect(mobileAssistant.getAttribute('href')).toBe('/ai-chat');
    expect(mobileAssistant.querySelector('svg')?.getAttribute('width')).toBe('20');
    expect(mobileAssistant.querySelector('svg')?.getAttribute('height')).toBe('20');
    await waitFor(() =>
      expect(within(studentNavigation).getByRole('link', { name: 'Cart (0)' })).toBeTruthy(),
    );
    expect(
      within(studentNavigation).getByRole('link', { name: 'Cart (0)' }).getAttribute('href'),
    ).toBe('/cart');
    expect(screen.getByRole('button', { name: 'Account menu for student User' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open AI assistant' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Open navigation|Close navigation/ })).toBeNull();

    fireEvent.click(mobileAssistant);
    expect(request.mock.calls.map(([options]) => options.path)).toEqual(['/me', '/cart']);
  });

  it.each([
    ['Русский', 'Навигация студента'],
    ["O'zbek", 'Talaba navigatsiyasi'],
  ])(
    'updates the student mobile navigation landmark after selecting %s',
    async (localeOption, label) => {
      stubCompactViewport();
      renderShell(authenticatedClient('student'), 'student-token', '/learning');

      fireEvent.click(await screen.findByRole('button', { name: 'Account menu for student User' }));
      fireEvent.click(screen.getByRole('button', { name: /^Language/ }));
      fireEvent.click(screen.getByRole('button', { name: localeOption }));

      expect(await screen.findByRole('navigation', { name: label })).toBeTruthy();
    },
  );

  it.each([
    ['Русский', 'Навигация гостя'],
    ["O'zbek", 'Mehmon navigatsiyasi'],
  ])(
    'updates the anonymous mobile navigation landmark after selecting %s',
    async (localeOption, label) => {
      stubCompactViewport();
      renderShell(authenticatedClient('student'), null);

      fireEvent.click(await screen.findByRole('button', { name: 'Change language' }));
      fireEvent.click(screen.getByRole('button', { name: localeOption }));

      expect(await screen.findByRole('navigation', { name: label })).toBeTruthy();
    },
  );

  it('changes the desktop language through the labelled selector without changing the route', async () => {
    const request = vi.fn(authenticatedClient('student').request);
    renderShell({ request: request as ApiClient['request'] }, 'student-token', '/learning');

    const trigger = await screen.findByRole('button', { name: 'Change language' });
    expect(trigger.textContent).toBe('EN');
    expect(trigger.querySelector('.lucide-chevron-down')).toBeTruthy();
    expect(trigger.querySelector('.lucide-globe')).toBeNull();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(trigger);
    });
    const russian = screen.getByRole('button', { name: 'Русский' });
    await act(async () => {
      await user.click(russian);
    });

    expect(localStorage.getItem('learnhub.locale')).toBe('ru');
    expect(screen.getByRole('button', { name: 'Изменить язык' })).toBeTruthy();
  });

  it.each([
    {
      localeOption: 'Русский',
      role: 'anonymous' as const,
      token: null,
      path: '/',
      labels: ['Каталог', 'Войти', 'Регистрация'],
    },
    {
      localeOption: "O'zbek",
      role: 'student' as const,
      token: 'student-token',
      path: '/learning',
      labels: ['Katalog', 'Ta’limim'],
    },
    {
      localeOption: 'Русский',
      role: 'instructor' as const,
      token: 'instructor-token',
      path: '/instructor/courses',
      labels: ['Курсы преподавателя'],
    },
  ])(
    'updates $role desktop navigation after choosing $localeOption',
    async ({ localeOption, role, token, path, labels }) => {
      renderShell(authenticatedClient(role === 'anonymous' ? 'student' : role), token, path);

      fireEvent.click(await screen.findByRole('button', { name: 'Change language' }));
      fireEvent.click(screen.getByRole('button', { name: localeOption }));

      for (const label of labels) {
        expect(await screen.findByRole('link', { name: label })).toBeTruthy();
      }
    },
  );

  it('restores a focused desktop locale option to its trigger when scroll dismisses the menu', async () => {
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const trigger = await screen.findByRole('button', { name: 'Change language' });
    fireEvent.click(trigger);
    const russian = screen.getByRole('button', { name: 'Русский' });
    act(() => russian.focus());
    expect(document.activeElement).toBe(russian);

    fireEvent.scroll(window);

    expect(screen.queryByRole('button', { name: 'Русский' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not steal unrelated focus when scroll dismisses the desktop locale menu', async () => {
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const trigger = await screen.findByRole('button', { name: 'Change language' });
    fireEvent.click(trigger);
    const outsideTarget = document.createElement('button');
    document.body.append(outsideTarget);
    act(() => outsideTarget.focus());

    fireEvent.scroll(window);

    expect(screen.queryByRole('button', { name: 'Русский' })).toBeNull();
    expect(document.activeElement).toBe(outsideTarget);
    outsideTarget.remove();
  });

  it('closes the desktop locale menu when focus moves outside while preserving inside focus', async () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const trigger = await screen.findByRole('button', { name: 'Change language' });
    fireEvent.click(trigger);
    const russian = screen.getByRole('button', { name: 'Русский' });
    act(() => russian.focus());
    expect(screen.getByRole('button', { name: 'Русский' })).toBeTruthy();

    const outsideTarget = document.createElement('button');
    document.body.append(outsideTarget);
    act(() => outsideTarget.focus());

    expect(screen.queryByRole('button', { name: 'Русский' })).toBeNull();
    expect(document.activeElement).toBe(outsideTarget);
    expect(removeEventListener).toHaveBeenCalledWith('focusin', expect.any(Function));
    outsideTarget.remove();
  });

  it.each(['{Enter}', '{Space}'])(
    'opens the desktop language menu once when the focused native trigger receives %s',
    async (key) => {
      renderShell(authenticatedClient('student'), 'student-token', '/learning');

      const trigger = await screen.findByRole('button', { name: 'Change language' });
      const user = userEvent.setup();
      await act(async () => {
        trigger.focus();
        await user.keyboard(key);
      });

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByLabelText('Language menu')).toBeTruthy();
      expect(screen.getAllByRole('button', { name: /English|Русский|O'zbek/ })).toHaveLength(3);
    },
  );

  it('orders desktop student controls as AI, Cart, Profile, then Language', async () => {
    renderShell(authenticatedClient('student'), 'student-token', '/learning');

    const assistant = await screen.findByRole('link', { name: 'Open AI assistant' });
    const cart = await screen.findByRole('link', { name: 'Cart' });
    const profile = screen.getByRole('button', { name: 'Account menu for student User' });
    const language = screen.getByRole('button', { name: 'Change language' });

    expect(assistant.compareDocumentPosition(cart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cart.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      profile.compareDocumentPosition(language) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(DESKTOP_APP_SHELL_STYLES).toMatch(
      /\.headerCartAccountGroup \.cartLink\s*\{\s*order:\s*1;/,
    );
    expect(DESKTOP_APP_SHELL_STYLES).toMatch(
      /\.headerCartAccountGroup \.account\s*\{\s*order:\s*2;/,
    );
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

  it('keeps authenticated mobile language choices in the same account popover with a Back flow', async () => {
    stubCompactViewport();
    renderShell(authenticatedClient('student'), 'student-token');

    const user = userEvent.setup();
    const accountMenu = await screen.findByRole('button', {
      name: 'Account menu for student User',
    });
    await act(async () => {
      await user.click(accountMenu);
    });
    const language = screen.getByRole('button', { name: /Language/ });
    act(() => language.focus());
    expect(document.activeElement).toBe(language);
    await act(async () => {
      await user.click(language);
    });
    expect(screen.getByRole('button', { name: 'Русский' })).toBeTruthy();
    const back = screen.getByRole('button', { name: 'Back' });
    expect(document.activeElement).toBe(back);
    await act(async () => {
      await user.click(back);
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Language/ }));

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Language/ }));
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Русский' }));
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Язык/ }));
  });

  it('reopens a pinned mobile account menu at its default view after the trigger closes Language', async () => {
    stubCompactViewport();
    renderShell(authenticatedClient('student'), 'student-token');

    const user = userEvent.setup();
    const accountMenu = await screen.findByRole('button', {
      name: 'Account menu for student User',
    });
    await act(async () => {
      await user.click(accountMenu);
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Language/ }));
    });
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();

    await act(async () => {
      await user.click(accountMenu);
    });
    expect(screen.queryByRole('group', { name: 'Account details for student User' })).toBeNull();
    expect(document.activeElement).toBe(accountMenu);

    await act(async () => {
      await user.click(accountMenu);
    });
    const accountDetails = screen.getByRole('group', {
      name: 'Account details for student User',
    });
    expect(screen.getByRole('button', { name: /Language/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(accountDetails.querySelector('[data-part="account-menu-profile"]')).toBeTruthy();
  });

  it('resets the unpinned mobile account menu to its profile view after Tab leaves Language', async () => {
    stubCompactViewport();
    renderShell(authenticatedClient('student'), 'student-token');

    const accountMenu = await screen.findByRole('button', {
      name: 'Account menu for student User',
    });
    const user = userEvent.setup();
    act(() => accountMenu.focus());
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Language/ }));
    });
    const uzbek = screen.getByRole('button', { name: "O'zbek" });
    act(() => uzbek.focus());
    await act(async () => {
      await user.keyboard('{Tab}');
    });

    expect(document.activeElement).not.toBe(accountMenu);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    act(() => accountMenu.focus());
    expect(screen.getByRole('button', { name: /Language/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
  });

  it('resets the unpinned mobile account menu to its profile view after mouseleave', async () => {
    stubCompactViewport();
    renderShell(authenticatedClient('student'), 'student-token');

    const accountMenu = await screen.findByRole('button', {
      name: 'Account menu for student User',
    });
    const menuRoot = accountMenu.parentElement;
    if (!menuRoot) throw new Error('Account menu root is unavailable.');
    fireEvent.mouseEnter(menuRoot);
    fireEvent.click(screen.getByRole('button', { name: /Language/ }));
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();

    fireEvent.mouseLeave(menuRoot);
    fireEvent.mouseEnter(menuRoot);

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.getByRole('button', { name: /Language/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
  });

  it('keeps authenticated instructor mobile language choices in the account popover alongside navigation', async () => {
    stubCompactViewport();
    renderShell(authenticatedClient('instructor'), 'instructor-token', '/instructor/courses');

    const user = userEvent.setup();
    const accountMenu = await screen.findByRole('button', {
      name: 'Account menu for instructor User',
    });
    expect(screen.queryByRole('button', { name: 'Change language' })).toBeNull();
    const navigationTrigger = screen.getByRole('button', { name: 'Open navigation' });
    await act(async () => {
      await user.click(navigationTrigger);
    });
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
    expect(document.activeElement).toBe(navigationTrigger);
    await act(async () => {
      await user.click(accountMenu);
    });
    await waitFor(() => expect(accountMenu.getAttribute('aria-expanded')).toBe('true'));
    expect(
      await screen.findByRole('group', { name: 'Account details for instructor User' }),
    ).toBeTruthy();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /Language/ }));
    });
    const back = screen.getByRole('button', { name: 'Back' });
    expect(document.activeElement).toBe(back);
    expect(screen.getByRole('button', { name: "O'zbek" })).toBeTruthy();
    await act(async () => {
      await user.click(back);
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Language/ }));
  });
});
