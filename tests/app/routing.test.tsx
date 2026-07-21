// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
    request: async <TResponse, TBody = unknown>(_options: ApiRequestOptions<TBody>) => (
      profile(role) as TResponse
    ),
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

afterEach(cleanup);

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
    await screen.findByRole('heading', { level: 1, name: 'Course catalog' });
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Browse courses' })).toBeTruthy();
    expect(within(navigation).getByRole('link', { name: 'Sign up' })).toBeTruthy();
    expect(within(navigation).getByRole('link', { name: 'Log in' })).toBeTruthy();
    expect(within(navigation).queryByRole('link', { name: 'Cart' })).toBe(null);
    expect(within(navigation).queryByRole('link', { name: 'Instructor courses' })).toBe(null);
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

    await userEvent.setup().click(screen.getByRole('link', { name: 'LearnHub home' }));
    await screen.findByRole('heading', { level: 1, name: 'Course catalog' });
    await waitFor(() => expect(document.documentElement.getAttribute('data-density')).toBe('marketplace'));
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
    await screen.findByRole('heading', { level: 1, name: 'Course catalog' });
    expect(screen.getByLabelText('current location').textContent).toBe('/');
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).queryAllByRole('link')).toHaveLength(0);
  });

  it('renders a not-found state for unknown routes', async () => {
    renderApp('/does-not-exist');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
  });

  it('exposes the skip link and semantic landmarks', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Course catalog' });
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

    await user.click(trigger);
    expect(trigger).toBe(document.activeElement);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    await user.keyboard('{Escape}');

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
