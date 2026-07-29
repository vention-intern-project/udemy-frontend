// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createAppQueryClient } from '../../src/app/query';
import { AppRouter } from '../../src/app/router/AppRouter';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { LearningListPage } from '../../src/pages/learning-list-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';
import { ThemeProvider } from '../../src/shared/ui/theme';

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const enrollments = {
  items: [
    {
      id: 4,
      user_id: 1,
      course_id: 7,
      status: 'cancelled',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      course: {
        id: 7,
        title: 'Cancelled course',
        description: null,
        price: '10.00',
        currency: 'USD',
      },
    },
    {
      id: 5,
      user_id: 1,
      course_id: 8,
      status: 'active',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      course: {
        id: 8,
        title: 'Active course',
        description: 'Server order must remain intact.',
        price: '0.00',
        currency: 'USD',
      },
    },
  ],
  page: 2,
  page_size: 20,
  total: 22,
  pages: 2,
  has_next: false,
  has_previous: true,
};

const emptyEnrollments = {
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
  pages: 0,
  has_next: false,
  has_previous: false,
};

afterEach(() => cleanup());

function tokenStore(): AccessTokenStore {
  return { get: () => 'student-token', set: () => {}, clear: () => {} };
}
function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  return options.decode ? options.decode(value) : (value as TResponse);
}

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current location">{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
      <button type="button" onClick={() => navigate('/learning?page=2')}>
        Navigate to page 2
      </button>
    </>
  );
}

async function renderPage(request: ApiClient['request'], initialEntry = '/learning?page=2') {
  const queryClient = createAppQueryClient();
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={{ request }} tokenStore={tokenStore()}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <LocationProbe />
            <LearningListPage />
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
  return queryClient;
}

async function renderApp(request: ApiClient['request']) {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <SessionProvider client={{ request }} tokenStore={tokenStore()}>
          <ThemeProvider initialDensityMode="workspace">
            <MemoryRouter initialEntries={['/learning']}>
              <AppRouter />
            </MemoryRouter>
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
}

describe('LearningListPage', () => {
  it('keeps the heading and loading announcement distinct from resolved empty and summary content', async () => {
    let resolveEnrollments: (() => void) | undefined;
    const enrollmentResponse = new Promise<void>((resolve) => {
      resolveEnrollments = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') {
        await enrollmentResponse;
        return decode(options, emptyEnrollments);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request, '/learning');

    expect(await screen.findByRole('heading', { name: 'My learning' })).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Loading your learning' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Start your learning journey' })).toBeNull();
    expect(screen.queryByText('0 enrollments · Page 1 of 1')).toBeNull();

    await act(async () => {
      resolveEnrollments?.();
    });
    expect(
      await screen.findByRole('heading', { name: 'Start your learning journey' }),
    ).toBeTruthy();
  });

  it('renders the exact resolved empty-state copy, decorative illustration, and catalog link', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request, '/learning');

    expect(
      await screen.findByRole('heading', { name: 'Start your learning journey' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'You haven’t enrolled in any courses yet. Browse the catalog and choose your first course.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse courses' }).getAttribute('href')).toBe('/');
    const illustration = screen.getByAltText('');
    expect(illustration.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByText('0 enrollments · Page 1 of 1')).toBeNull();
  });

  it('renders a populated vertical enrollment list without empty-state or invented learning metadata', async () => {
    const singleEnrollment = {
      ...enrollments,
      items: [enrollments.items[1]],
      page: 1,
      total: 1,
      pages: 1,
      has_next: false,
      has_previous: false,
    };
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, singleEnrollment);
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request, '/learning');

    expect(await screen.findByText('1 enrollment · Page 1 of 1')).toBeTruthy();
    const browseCourses = screen.getByRole('link', { name: 'Browse courses' });
    expect(browseCourses.getAttribute('href')).toBe('/');
    expect(browseCourses.querySelector('svg')).toBeTruthy();
    expect(
      browseCourses.compareDocumentPosition(screen.getByRole('heading', { name: 'My learning' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const courseTitle = screen.getByRole('heading', { level: 2, name: 'Active course' });
    const enrollmentStatus = screen.getByText('Active');
    expect(
      courseTitle.compareDocumentPosition(enrollmentStatus) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open learning workspace' }).getAttribute('href')).toBe(
      '/learning/enrollments/5',
    );
    expect(screen.queryByRole('heading', { name: 'Start your learning journey' })).toBeNull();
    expect(screen.queryByAltText('')).toBeNull();
    expect(screen.queryByText('0%')).toBeNull();
    expect(screen.queryByText(/instructor/i)).toBeNull();
    expect(screen.queryByText(/lessons completed/i)).toBeNull();
  });

  it('preserves API-021 server order, totals, status, and page cursor', async () => {
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      requests.push(options);
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, enrollments);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByRole('heading', { name: 'My learning' })).toBeTruthy();
    expect(screen.getByText('22 enrollments · Page 2 of 2')).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Cancelled course',
      'Active course',
    ]);
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(requests.find((entry) => entry.path === '/enrollments/my')?.query).toEqual({
      page: 2,
      page_size: 20,
    });
  });

  it('retries a list error and restores focus to the recovered heading', async () => {
    let failedOnce = false;
    const request = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/my' && !failedOnce) {
          failedOnce = true;
          throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        }
        if (options.path === '/enrollments/my')
          return decode(options, {
            ...enrollments,
            page: 1,
            pages: 2,
            has_next: true,
            has_previous: false,
          });
        throw new Error(`Unexpected request ${options.path}`);
      },
    );
    await renderPage(request as ApiClient['request']);
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await screen.findByText('22 enrollments · Page 1 of 2');
    const heading = screen.getByRole('heading', { name: 'My learning' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.queryByText('private')).toBeNull();
  });

  it('restores focus across uncached and cached API-021 pages without stealing it on background refetch', async () => {
    const requestedPages: number[] = [];
    let holdBackgroundRefresh = false;
    let resolveBackgroundRefresh: (() => void) | undefined;
    const backgroundRefresh = new Promise<void>((resolve) => {
      resolveBackgroundRefresh = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') {
        const page = Number(options.query?.page);
        requestedPages.push(page);
        if (page === 1 && holdBackgroundRefresh) await backgroundRefresh;
        const items =
          page === 1
            ? [
                {
                  ...enrollments.items[1],
                  id: 6,
                  course_id: 9,
                  course: { ...enrollments.items[1].course, id: 9, title: 'First page course' },
                },
              ]
            : enrollments.items;
        return decode(options, {
          ...enrollments,
          items,
          page,
          has_next: page === 1,
          has_previous: page === 2,
        });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    const queryClient = await renderPage(request, '/learning');
    expect(await screen.findByText('22 enrollments · Page 1 of 2')).toBeTruthy();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    });
    expect(await screen.findByText('22 enrollments · Page 2 of 2')).toBeTruthy();
    expect(screen.getByLabelText('Current location').textContent).toBe('?page=2');
    expect(requestedPages).toEqual([1, 2]);
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Cancelled course',
      'Active course',
    ]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'My learning' })),
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    });
    expect(await screen.findByText('22 enrollments · Page 1 of 2')).toBeTruthy();
    expect(screen.getByLabelText('Current location').textContent).toBe('');
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'First page course',
    ]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'My learning' })),
    );
    expect(requestedPages).toEqual([1, 2, 1]);

    const workspaceLink = screen.getByRole('link', { name: 'Open learning workspace' });
    workspaceLink.focus();
    holdBackgroundRefresh = true;
    let refresh: Promise<void> | undefined;
    await act(async () => {
      refresh = queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'private' &&
          query.queryKey[2] === 'API-021' &&
          query.queryKey[3] === 'learning:list:1',
      });
    });
    await waitFor(() => expect(requestedPages).toEqual([1, 2, 1, 1]));
    await act(async () => {
      resolveBackgroundRefresh?.();
      await refresh;
    });
    expect(document.activeElement).toBe(workspaceLink);
  });

  it('cancels interrupted page focus intent before later history-independent page success', async () => {
    let resolvePageTwo: (() => void) | undefined;
    const pageTwoResponse = new Promise<void>((resolve) => {
      resolvePageTwo = resolve;
    });
    const requestedPages: number[] = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') {
        const page = Number(options.query?.page);
        requestedPages.push(page);
        if (
          page === 2 &&
          requestedPages.filter((requestedPage) => requestedPage === 2).length === 1
        )
          await pageTwoResponse;
        const items =
          page === 1
            ? [
                {
                  ...enrollments.items[1],
                  id: 6,
                  course_id: 9,
                  course: { ...enrollments.items[1].course, id: 9, title: 'First page course' },
                },
              ]
            : enrollments.items;
        return decode(options, {
          ...enrollments,
          items,
          page,
          has_next: page === 1,
          has_previous: page === 2,
        });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, '/learning');
    const user = userEvent.setup();
    await screen.findByText('22 enrollments · Page 1 of 2');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Current location').textContent).toBe('?page=2'),
    );
    await waitFor(() => expect(requestedPages).toEqual([1, 2]));

    const historyBack = screen.getByRole('button', { name: 'History back' });
    await act(async () => {
      await user.click(historyBack);
    });
    await screen.findByText('22 enrollments · Page 1 of 2');
    await waitFor(() => expect(document.activeElement).toBe(historyBack));
    await act(async () => {
      resolvePageTwo?.();
      await Promise.resolve();
    });
    expect(document.activeElement).toBe(historyBack);

    const nonPaginationNavigation = screen.getByRole('button', { name: 'Navigate to page 2' });
    await act(async () => {
      await user.click(nonPaginationNavigation);
    });
    await screen.findByText('22 enrollments · Page 2 of 2');
    expect(screen.getByLabelText('Current location').textContent).toBe('?page=2');
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Cancelled course',
      'Active course',
    ]);
    await waitFor(() => expect(document.activeElement).toBe(nonPaginationNavigation));
  });

  it('keeps a malformed API-021 success distinct from the empty state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my')
        throw new ApiError({
          kind: 'invalid_response',
          status: 200,
          message: 'private decoder detail',
        });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, '/learning');
    expect(
      await screen.findByText('The server returned an invalid response. Try again.'),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Start your learning journey' })).toBeNull();
    expect(screen.queryByText('private decoder detail')).toBeNull();
  });

  it('clears a list 401 and routes the protected workspace to login', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my')
        throw new ApiError({ kind: 'unauthorized', status: 401, message: 'private auth detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderApp(request);
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
    expect(screen.queryByText('private auth detail')).toBeNull();
  });
});
