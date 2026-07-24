// @vitest-environment jsdom

import {
  act, cleanup, render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppRouter, densityForPath, RouteErrorBoundary } from '../../src/app/router';
import type { UserProfileDto, UserRoleDto } from '../../src/entities/user';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import type { ApiClient, ApiRequestOptions } from '../../src/shared/api';
import { ThemeProvider } from '../../src/shared/ui/theme';

function profile(role: UserRoleDto): UserProfileDto {
  return {
    email: `${role}@example.com`,
    name: role === 'student' ? 'Sam' : role === 'instructor' ? 'Indira' : 'Alex',
    surname: 'User',
    role,
    birthday: null,
    phone_number: null,
    created_at: '2026-07-20T00:00:00Z',
  };
}

function store(token: string | null): AccessTokenStore {
  let value = token;
  return {
    get: () => value,
    set: (next) => { value = next; },
    clear: () => { value = null; },
  };
}

function clientFor(role: UserRoleDto): ApiClient {
  return {
    request: async <TResponse, TBody = unknown>(
      options: ApiRequestOptions<TBody, TResponse>,
    ): Promise<TResponse> => {
      const value: unknown = profile(role);
      return 'decode' in options && options.decode
        ? options.decode(value)
        : value as TResponse;
    },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

function renderApp(path: string, role?: UserRoleDto) {
  const request = vi.fn(async () => profile(role ?? 'student'));
  const client = role ? clientFor(role) : { request } as ApiClient;
  const initialPathname = new URL(path, 'https://learnhub.test').pathname;
  return render(
    <ThemeProvider initialDensityMode={densityForPath(initialPathname)}>
      <SessionProvider client={client} tokenStore={store(role ? 'token' : null)}>
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <RouteErrorBoundary>
            <AppRouter />
          </RouteErrorBoundary>
          <LocationProbe />
        </MemoryRouter>
      </SessionProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  globalThis.localStorage.clear();
  vi.restoreAllMocks();
});

describe('application routing and guards', () => {
  it('keeps the busy bootstrap main landmark separate from its polite status region', () => {
    const client: ApiClient = {
      request: <TResponse,>() => new Promise<TResponse>(() => undefined),
    };
    render(
      <ThemeProvider initialDensityMode="marketplace">
        <SessionProvider client={client} tokenStore={store('token')}>
          <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <AppRouter />
          </MemoryRouter>
        </SessionProvider>
      </ThemeProvider>,
    );

    const main = screen.getByRole('main');
    expect(main.getAttribute('aria-busy')).toBe('true');
    expect(within(main).getAllByRole('status')).toHaveLength(1);
    const status = within(main).getByRole('status', { name: 'Loading application' });
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(within(main).getByRole('heading', { level: 1, name: 'Preparing your workspace' })).toBeTruthy();
    expect(main.textContent).toContain('We are verifying your session.');
  });

  it('redirects an anonymous protected visit with a safe path/query/hash returnTo', async () => {
    renderApp('/cart?coupon=SAVE#summary');

    await screen.findByRole('heading', { level: 1, name: 'Log in' });
    expect(screen.getByLabelText('current location').textContent)
      .toBe('/login?returnTo=%2Fcart%3Fcoupon%3DSAVE%23summary');
  });

  it('renders an accessible forbidden state for an authenticated wrong role', async () => {
    renderApp('/cart', 'instructor');

    expect(await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' }))
      .toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: 'Cart' })).toBe(null);
    expect(screen.getByRole('link', { name: 'Back to catalog' })).toBeTruthy();
  });

  it('shows only guest navigation to an anonymous user', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
    const catalogSearch = screen.getByRole('search', { name: 'Course catalog search' });
    const headerSearch = within(catalogSearch).getByLabelText('Search courses');
    expect(headerSearch.getAttribute('placeholder'))
      .toBe('Search courses, topics, or instructors');
    const label = catalogSearch.querySelector('label.ui-field__label');
    expect(label?.querySelector('.ui-sr-only')?.textContent).toBe('Search courses');
    const icon = catalogSearch.querySelector('svg.app-catalog-search__icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('focusable')).toBe('false');
    expect(icon?.getAttribute('role')).toBe(null);
    expect(within(catalogSearch).queryByRole('button', { name: 'Search' })).toBeNull();
    expect(headerSearch.getAttribute('role')).toBe('combobox');
    expect(headerSearch.getAttribute('aria-autocomplete')).toBe('list');
    expect(headerSearch.getAttribute('autocomplete')).toBe('off');
    expect(headerSearch.getAttribute('aria-expanded')).toBe('false');
    expect(headerSearch.getAttribute('aria-controls')).toBe(null);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Browse courses' })).toBeTruthy();
    const accountNavigation = screen.getByRole('navigation', { name: 'Account navigation' });
    const logIn = within(accountNavigation).getByRole('link', { name: 'Log in' });
    const signUp = within(accountNavigation).getByRole('link', { name: 'Sign up' });
    expect(logIn.getAttribute('href')).toBe('/login');
    expect(signUp.getAttribute('href')).toBe('/signup');
    expect(within(navigation).getByRole('link', { name: 'Browse courses' }).getAttribute('aria-current')).toBe('page');
    expect(logIn.getAttribute('aria-current')).toBe(null);
    expect(signUp.getAttribute('aria-current')).toBe(null);
    const header = catalogSearch.closest('header');
    expect(header).toBeTruthy();
    expect(header?.classList.contains('app-header--anonymous-catalog')).toBe(true);
    const headerInner = header!.querySelector('.app-header__inner');
    expect(Array.from(headerInner?.children ?? []).map((child) => child.className)).toEqual([
      'app-header__catalog-start',
      'app-catalog-search',
      'app-header__catalog-end',
    ]);
    expect(headerInner?.querySelector('.app-header__catalog-start')?.contains(navigation)).toBe(true);
    expect(headerInner?.querySelector('.app-header__catalog-end')?.contains(accountNavigation)).toBe(true);
    expect(Array.from(header!.querySelectorAll('a, input')).map((element) => {
      if (element instanceof HTMLInputElement) return element.getAttribute('aria-label') ?? element.name;
      return element.getAttribute('aria-label') ?? element.textContent?.trim();
    })).toEqual(['LearnHub home', 'Browse courses', 'search_query', 'Log in', 'Sign up']);
    expect(within(navigation).queryByRole('link', { name: 'Cart' })).toBe(null);
    expect(within(navigation).queryByRole('link', { name: 'Instructor courses' })).toBe(null);
  });

  it('does not render the catalog search on a non-catalog route', async () => {
    renderApp('/login');
    await screen.findByRole('heading', { level: 1, name: 'Log in' });
    expect(screen.queryByRole('search', { name: 'Course catalog search' })).toBe(null);
  });

  it.each(['/login/help', '/signup/help'])(
    'does not mark a guest auth leaf current on unknown nested path %s',
    async (path) => {
      renderApp(path);
      await screen.findByRole('heading', { level: 1, name: 'Page not found' });
      const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
      expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
      expect(within(navigation).getByRole('link', { name: 'Sign up' }).getAttribute('aria-current'))
        .toBe(null);
      expect(within(navigation).getByRole('link', { name: 'Log in' }).getAttribute('aria-current'))
        .toBe(null);
    },
  );

  it('shows student navigation and marks the current page', async () => {
    renderApp('/learning', 'student');
    await screen.findByRole('heading', { level: 1, name: 'My learning' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Cart' })).toBeTruthy();
    expect(within(navigation).getByRole('link', { name: 'My learning' }).getAttribute('aria-current'))
      .toBe('page');
    expect(within(navigation).queryByRole('link', { name: 'Instructor courses' })).toBe(null);
  });

  it('uses route metadata to set workspace density initially and marketplace density after navigation', async () => {
    renderApp('/learning', 'student');
    await screen.findByRole('heading', { level: 1, name: 'My learning' });
    await waitFor(() => expect(document.documentElement.getAttribute('data-density')).toBe('workspace'));
    await waitFor(() => expect(document.title).toBe('My learning | LearnHub'));

    const user = userEvent.setup();
    await act(async () => user.click(screen.getByRole('link', { name: 'LearnHub home' })));
    await screen.findByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
    await waitFor(() => expect(document.documentElement.getAttribute('data-density')).toBe('marketplace'));
    await waitFor(() => expect(document.title).toBe('Course catalog | LearnHub'));
    await waitFor(() => expect(screen.getByRole('main')).toBe(document.activeElement));
  });

  it('removes the recent-search outside-pointer listener when the open draft has zero matches', async () => {
    globalThis.localStorage.setItem(
      'learnhub.catalog-search-history',
      JSON.stringify(['React Basics', 'TypeScript']),
    );
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: 'Search courses' });

    await act(async () => { await user.click(input); });
    const listbox = await screen.findByRole('listbox', { name: 'Recent searches' });
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    const pointerListener = [...addEventListener.mock.calls]
      .reverse()
      .find(([type]) => type === 'pointerdown')?.[1];
    expect(pointerListener).toBeTruthy();

    await act(async () => {
      await user.clear(input);
      await user.type(input, 'no matching history');
    });
    await waitFor(() => expect(screen.queryByRole('listbox', { name: 'Recent searches' })).toBeNull());
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-controls')).toBeNull();
    await waitFor(() => expect(removeEventListener).toHaveBeenCalledWith('pointerdown', pointerListener, true));
  });

  it.each([
    ['/LOGIN/', undefined, 'Log in | LearnHub'],
    ['/Learning/', 'student' as const, 'My learning | LearnHub'],
    ['/instructor/courses/ABC/edit/', 'instructor' as const, 'Edit course | LearnHub'],
  ])('applies Router-parity metadata and title for %s', async (path, role, expectedTitle) => {
    renderApp(path, role);
    await waitFor(() => expect(document.title).toBe(expectedTitle));
    expect(document.querySelector('.app-shell')?.getAttribute('data-layout'))
      .toBe(role ? 'workspace' : 'auth');
  });

  it('does not mark the My learning section as the current page on learning details', async () => {
    renderApp('/learning/enrollments/42', 'student');
    await screen.findByRole('heading', { level: 1, name: 'Learning details' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'My learning' }).getAttribute('aria-current'))
      .toBe(null);
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  it('shows instructor navigation without student links', async () => {
    renderApp('/instructor/courses', 'instructor');
    await screen.findByRole('heading', { level: 1, name: 'Instructor courses' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Instructor courses' })).toBeTruthy();
    expect(within(navigation).queryByRole('link', { name: 'Course enrollments' })).toBe(null);
    expect(within(navigation).queryByRole('link', { name: 'Cart' })).toBe(null);
    expect(within(navigation).queryByRole('link', { name: 'My learning' })).toBe(null);
  });

  it('shows course enrollments only for an instructor with a selected course', async () => {
    renderApp('/instructor/courses/42/edit', 'instructor');
    await screen.findByRole('heading', { level: 1, name: 'Edit course' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const enrollments = within(navigation).getByRole('link', { name: 'Course enrollments' });
    expect(enrollments.getAttribute('href')).toBe('/instructor/courses/42/enrollments');
    expect(within(navigation).getByRole('link', { name: 'Instructor courses' }).getAttribute('aria-current'))
      .toBe(null);
    expect(enrollments.getAttribute('aria-current')).toBe(null);
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  it('marks only the contextual course enrollments leaf as current on PAGE-012', async () => {
    renderApp('/instructor/courses/42/enrollments', 'instructor');
    await screen.findByRole('heading', { level: 1, name: 'Course enrollments' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Instructor courses' }).getAttribute('aria-current'))
      .toBe(null);
    expect(within(navigation).getByRole('link', { name: 'Course enrollments' }).getAttribute('aria-current'))
      .toBe('page');
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('does not expose contextual instructor navigation to a student', async () => {
    renderApp('/instructor/courses/42/edit', 'student');
    await screen.findByRole('heading', { level: 1, name: 'You do not have access to this page' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).queryByRole('link', { name: 'Course enrollments' })).toBe(null);
  });

  it('gives admin no invented workspace and redirects guest-only routes home', async () => {
    renderApp('/login', 'admin');
    await screen.findByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
    expect(screen.getByLabelText('current location').textContent).toBe('/');
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).queryAllByRole('link')).toHaveLength(0);
  });

  it('renders a not-found state for unknown routes', async () => {
    renderApp('/does-not-exist');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    await waitFor(() => expect(document.title).toBe('LearnHub'));
  });

  it('exposes the skip link and semantic landmarks', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
    expect(screen.getByRole('link', { name: 'Skip to main content' }).getAttribute('href'))
      .toBe('#main-content');
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
  });

  it('closes mobile navigation when Escape is pressed while its trigger remains focused', async () => {
    renderApp('/instructor/courses', 'instructor');
    await screen.findByRole('heading', { level: 1, name: 'Instructor courses' });
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Open navigation' });

    await act(async () => user.click(trigger));
    expect(trigger).toBe(document.activeElement);
    await screen.findByRole('navigation', { name: 'Mobile navigation' });
    await act(async () => user.keyboard('{Escape}'));

    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBe(null));
    await waitFor(() => expect(trigger).toBe(document.activeElement));
  });

  it('renders product copy without workflow or internal page metadata', async () => {
    const view = renderApp('/login');
    await screen.findByRole('heading', { level: 1, name: 'Log in' });
    expect(view.container.textContent).not.toMatch(/PAGE-\d+|FE-\d+|later task|scheduled/i);
    expect(view.container.textContent).toContain('Access your learning or instructor workspace.');
  });

  it('renders stable public-safe session failure copy without backend detail', async () => {
    const client: ApiClient = {
      request: async () => {
        throw new Error('private upstream hostname and diagnostic details');
      },
    };
    render(
      <ThemeProvider initialDensityMode="marketplace">
        <SessionProvider client={client} tokenStore={store('token')}>
          <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <RouteErrorBoundary>
              <AppRouter />
            </RouteErrorBoundary>
          </MemoryRouter>
        </SessionProvider>
      </ThemeProvider>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Session check failed' });
    expect(screen.getByRole('alert').textContent)
      .toContain('We could not verify your session. Check your connection and try again.');
    expect(document.body.textContent).not.toContain('private upstream hostname');
  });
});
