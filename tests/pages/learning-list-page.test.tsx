// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createAppQueryClient } from '../../src/app/query';
import { AppRouter } from '../../src/app/router/AppRouter';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { LearningListPage } from '../../src/pages/learning-list-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';
import { LocaleProvider, type Locale } from '../../src/shared/locale';
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

interface EnrollmentFixtureItem {
  readonly id: number;
  readonly user_id: number;
  readonly course_id: number;
  readonly status: 'pending_payment' | 'active' | 'cancelled';
  readonly created_at: string;
  readonly updated_at: string;
  readonly course: {
    readonly id: number;
    readonly title: string;
    readonly description: string | null;
    readonly price: string;
    readonly currency: string;
  };
}

interface EnrollmentFixturePage {
  readonly items: readonly EnrollmentFixtureItem[];
  readonly total?: number;
  readonly pages?: number;
}

interface LearningCollectionPage {
  readonly items: readonly EnrollmentFixtureItem[];
  readonly page: number;
  readonly page_size: 100;
  readonly total: number;
  readonly pages: number;
  readonly has_next: boolean;
  readonly has_previous: boolean;
}

function learningCollectionPage(
  page: number,
  source: EnrollmentFixturePage,
): LearningCollectionPage {
  if (source.items.length === 0) {
    return { ...emptyEnrollments, page: 1, page_size: 100 };
  }
  if (source.total === 1 && source.pages === 1) {
    return {
      items: source.items,
      page: 1,
      page_size: 100,
      total: 1,
      pages: 1,
      has_next: false,
      has_previous: false,
    };
  }
  const active = source.items.find((item) => item.status === 'active') ?? source.items[0];
  const firstPageItems = Array.from({ length: 100 }, (_, index): EnrollmentFixtureItem => {
    const id = index + 1;
    const isActive = index >= 80;
    return {
      ...active,
      id,
      course_id: id + 100,
      status: isActive ? 'active' : 'cancelled',
      course: {
        ...active.course,
        id: id + 100,
        title: isActive && index === 80 ? active.course.title : `Enrollment course ${id}`,
      },
    };
  });
  return page === 1
    ? {
        items: firstPageItems,
        page: 1,
        page_size: 100,
        total: 101,
        pages: 2,
        has_next: true,
        has_previous: false,
      }
    : {
        items: [
          {
            ...active,
            id: 101,
            course_id: 201,
            status: 'active',
            course: { ...active.course, id: 201, title: 'Active course page two' },
          },
        ],
        page: 2,
        page_size: 100,
        total: 101,
        pages: 2,
        has_next: false,
        has_previous: true,
      };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});

function tokenStore(): AccessTokenStore {
  return { get: () => 'student-token', set: () => {}, clear: () => {} };
}
function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  const response =
    options.path === '/enrollments/my' &&
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as EnrollmentFixturePage).items)
      ? learningCollectionPage(Number(options.query?.page), value as EnrollmentFixturePage)
      : value;
  return options.decode ? options.decode(response) : (response as TResponse);
}

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current location">{location.search}</output>
      <div aria-label="Current route">{`${location.pathname}${location.search}${location.hash}`}</div>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
      <button type="button" onClick={() => navigate('/learning?page=2')}>
        Navigate to page 2
      </button>
    </>
  );
}

async function renderPage(
  request: ApiClient['request'],
  initialEntry = '/learning?page=2',
  locale: Locale = 'en',
) {
  const queryClient = createAppQueryClient();
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider initialLocale={locale}>
          <SessionProvider client={{ request }} tokenStore={tokenStore()}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <LocationProbe />
              <LearningListPage />
            </MemoryRouter>
          </SessionProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
  });
  return queryClient;
}

async function renderApp(request: ApiClient['request']) {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <LocaleProvider initialLocale="en">
          <SessionProvider client={{ request }} tokenStore={tokenStore()}>
            <ThemeProvider initialDensityMode="workspace">
              <MemoryRouter initialEntries={['/learning']}>
                <AppRouter />
              </MemoryRouter>
            </ThemeProvider>
          </SessionProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
  });
}

describe('LearningListPage', () => {
  it.each([
    [
      'ru',
      'Каталог',
      'Моё обучение',
      'Активно',
      'Навигация по страницам обучения',
      'Записей на курсы: 21 · Страница 2 из 2',
      'Хлебные крошки',
    ],
    [
      'uz',
      'Katalog',
      'Ta’limim',
      'Faol',
      'Ta’limga yozilishlar sahifalari',
      'Kurslarga yozilishlar: 21 · 2-sahifa, jami 2 ta',
      'Yo‘l ko‘rsatkich',
    ],
  ] as const)(
    'uses exact %s visible and accessible MLUX-004 resources for the populated learning state',
    async (locale, catalog, myLearning, active, paginationLabel, summary, breadcrumbLabel) => {
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/my') return decode(options, enrollments);
        throw new Error(`Unexpected request ${options.path}`);
      };

      await renderPage(request, '/learning?page=2', locale);

      expect(await screen.findByRole('link', { name: catalog })).toBeTruthy();
      expect(screen.getByRole('heading', { name: myLearning })).toBeTruthy();
      expect(screen.getByText(active)).toBeTruthy();
      expect(screen.getByText(summary)).toBeTruthy();
      expect(screen.getByRole('navigation', { name: paginationLabel })).toBeTruthy();
      expect(screen.getByRole('navigation', { name: breadcrumbLabel })).toBeTruthy();
    },
  );

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
    expect(illustration.getAttribute('src')).toContain('my-learning-empty-state-ui022.png');
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
    const browseCourses = screen.getByRole('link', { name: 'Catalog' });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(browseCourses.getAttribute('href')).toBe('/');
    expect(breadcrumb.contains(browseCourses)).toBe(true);
    expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent).toContain('My learning');
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
    expect(screen.getByRole('link', { name: 'Open course' }).getAttribute('href')).toBe(
      '/learning/enrollments/5',
    );
    expect(screen.queryByRole('heading', { name: 'Start your learning journey' })).toBeNull();
    expect(screen.queryByAltText('')).toBeNull();
    expect(screen.queryByText('0%')).toBeNull();
    expect(screen.queryByText(/instructor/i)).toBeNull();
    expect(screen.queryByText(/lessons completed/i)).toBeNull();
  });

  it('activates the resolved Catalog source through the Router click path on unmodified Space', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, enrollments);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, '/learning?page=2#courses');
    const user = userEvent.setup();
    const source = await screen.findByRole('link', { name: 'Catalog' });

    source.focus();
    expect(source).toBe(document.activeElement);
    await act(async () => {
      await user.keyboard(' ');
    });

    await waitFor(() => expect(screen.getByLabelText('Current route').textContent).toBe('/'));
  });

  it('accepts the Chromium Space-key alias on the resolved Catalog source', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, enrollments);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, '/learning?page=2#courses');
    const source = await screen.findByRole('link', { name: 'Catalog' });

    source.focus();
    fireEvent.keyDown(source, { key: 'Space', code: 'Space' });

    await waitFor(() => expect(screen.getByLabelText('Current route').textContent).toBe('/'));
  });

  it('projects only active API-021 enrollment entries while preserving the page cursor', async () => {
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      requests.push(options);
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, enrollments);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, '/learning?page=2');
    expect(await screen.findByRole('heading', { name: 'My learning' })).toBeTruthy();
    expect(screen.getByText('21 enrollments · Page 2 of 2')).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Active course page two',
    ]);
    expect(screen.queryByText('Cancelled')).toBeNull();
    expect(screen.queryByText('Cancelled course')).toBeNull();
    expect(
      requests.filter((entry) => entry.path === '/enrollments/my').map((entry) => entry.query),
    ).toEqual([
      { page: 1, page_size: 100 },
      { page: 2, page_size: 100 },
    ]);
  });

  it('replace-normalizes an active page beyond the final page without showing an empty state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') return decode(options, enrollments);
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request, '/learning?page=9');

    expect(await screen.findByText('21 enrollments · Page 2 of 2')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText('Current location').textContent).toBe('?page=2'),
    );
    expect(await screen.findByRole('heading', { name: 'Active course page two' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Start your learning journey' })).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'My learning' })),
    );
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
    await renderPage(request as ApiClient['request'], '/learning');
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await screen.findByText('21 enrollments · Page 1 of 2');
    const heading = screen.getByRole('heading', { name: 'My learning' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.queryByText('private')).toBeNull();
  });

  it('resolves a settled learning-list failure in the current locale without exposing server detail', async () => {
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

    await renderPage(request, '/learning', 'uz');

    expect(await screen.findByText('Ta’lim ma’lumotlari mavjud emas')).toBeTruthy();
    expect(screen.getByText('Server noto‘g‘ri javob qaytardi. Qayta urinib ko‘ring.')).toBeTruthy();
    expect(screen.queryByText('private decoder detail')).toBeNull();
  });

  it('does not move focus when a failed list retry is followed by another failed refresh', async () => {
    let attempts = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') {
        attempts += 1;
        if (attempts < 4)
          throw new ApiError({ kind: 'server', status: 500, message: 'private list' });
        return decode(options, { ...enrollments, page: 1, pages: 2 });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    const queryClient = await renderPage(request, '/learning');
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await screen.findByRole('button', { name: 'Try again' });
    const sentinel = document.createElement('button');
    document.body.append(sentinel);
    sentinel.focus();
    await act(async () => {
      await queryClient.refetchQueries();
    });
    await screen.findByRole('button', { name: 'Try again' });
    expect(document.activeElement).toBe(sentinel);
    sentinel.remove();
  });

  it('does not let a pending list retry focus after its requested page identity changes', async () => {
    let resolveRetry: (() => void) | undefined;
    const retryResponse = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    let pageOneRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') {
        const page = Number(options.query?.page);
        if (page === 1) {
          pageOneRequests += 1;
          if (pageOneRequests === 1)
            throw new ApiError({ kind: 'server', status: 500, message: 'private list' });
          if (pageOneRequests === 2) await retryResponse;
        }
        return decode(options, {
          ...enrollments,
          page,
          has_next: page === 1,
          has_previous: page === 2,
        });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, '/learning');
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await waitFor(() => expect(pageOneRequests).toBe(2));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Navigate to page 2' }));
    });
    await screen.findByText('21 enrollments · Page 2 of 2');
    const sentinel = document.createElement('button');
    document.body.append(sentinel);
    sentinel.focus();
    await act(async () => {
      resolveRetry?.();
    });
    await waitFor(() => expect(document.activeElement).toBe(sentinel));
    sentinel.remove();
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
    expect(await screen.findByText('21 enrollments · Page 1 of 2')).toBeTruthy();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    });
    expect(await screen.findByText('21 enrollments · Page 2 of 2')).toBeTruthy();
    expect(screen.getByLabelText('Current location').textContent).toBe('?page=2');
    expect(requestedPages).toEqual([1, 2, 1, 2]);
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Active course page two',
    ]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'My learning' })),
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    });
    expect(await screen.findByText('21 enrollments · Page 1 of 2')).toBeTruthy();
    expect(screen.getByLabelText('Current location').textContent).toBe('');
    expect(screen.getAllByRole('heading', { level: 2 })[0]?.textContent).toBe('First page course');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'My learning' })),
    );
    expect(requestedPages).toEqual([1, 2, 1, 2, 1, 2]);

    const [workspaceLink] = screen.getAllByRole('link', { name: 'Open course' });
    expect(workspaceLink).toBeDefined();
    if (!workspaceLink) throw new Error('Expected an active course action to retain focus.');
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
    await waitFor(() => expect(requestedPages).toEqual([1, 2, 1, 2, 1, 2, 1]));
    await act(async () => {
      resolveBackgroundRefresh?.();
      await refresh;
    });
    expect(document.activeElement).toBe(workspaceLink);
  });

  it('replace-normalizes a background-shrunk active page without stealing focus', async () => {
    const requestedPages: number[] = [];
    let shrinkActiveCollection = false;
    const retainedActiveEnrollment: EnrollmentFixtureItem = {
      ...enrollments.items[1],
      status: 'active',
      id: 101,
      course_id: 201,
      course: { ...enrollments.items[1].course, id: 201, title: 'Active course page two' },
    };
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/my') {
        const page = Number(options.query?.page);
        requestedPages.push(page);
        const response = shrinkActiveCollection
          ? {
              items: [
                retainedActiveEnrollment,
                ...Array.from({ length: 19 }, (_, index) => ({
                  ...retainedActiveEnrollment,
                  id: 102 + index,
                  course_id: 202 + index,
                  course: {
                    ...retainedActiveEnrollment.course,
                    id: 202 + index,
                    title: `Retained active course ${index + 2}`,
                  },
                })),
              ],
              page: 1,
              page_size: 100,
              total: 20,
              pages: 1,
              has_next: false,
              has_previous: false,
            }
          : learningCollectionPage(page, {
              items: [
                { ...enrollments.items[0], status: 'cancelled' },
                { ...enrollments.items[1], status: 'active' },
              ],
              total: enrollments.total,
              pages: enrollments.pages,
            });
        return options.decode ? options.decode(response) : (response as TResponse);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    const queryClient = await renderPage(request, '/learning?page=2');
    expect(await screen.findByText('21 enrollments · Page 2 of 2')).toBeTruthy();
    const nonPaginationNavigation = screen.getByRole('button', { name: 'Navigate to page 2' });
    nonPaginationNavigation.focus();
    shrinkActiveCollection = true;

    await act(async () => {
      await queryClient.refetchQueries({
        predicate: (query) =>
          query.queryKey[0] === 'private' &&
          query.queryKey[2] === 'API-021' &&
          query.queryKey[3] === 'learning:list:2',
      });
    });

    expect(requestedPages.slice(0, 2)).toEqual([1, 2]);
    const postShrinkRequestedPages = requestedPages.slice(2);
    expect(postShrinkRequestedPages.length).toBeGreaterThanOrEqual(1);
    expect(postShrinkRequestedPages.length).toBeLessThanOrEqual(2);
    expect(postShrinkRequestedPages.every((page) => page === 1)).toBe(true);
    expect(await screen.findByText('20 enrollments · Page 1 of 1')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Current location').textContent).toBe(''));
    expect(document.activeElement).toBe(nonPaginationNavigation);
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
          requestedPages.filter((requestedPage) => requestedPage === 2).length === 2
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
    await screen.findByText('21 enrollments · Page 1 of 2');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Current location').textContent).toBe('?page=2'),
    );
    await waitFor(() => expect(requestedPages).toEqual([1, 2, 1, 2]));

    const historyBack = screen.getByRole('button', { name: 'History back' });
    await act(async () => {
      await user.click(historyBack);
    });
    await screen.findByText('21 enrollments · Page 1 of 2');
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
    await screen.findByText('21 enrollments · Page 2 of 2');
    expect(screen.getByLabelText('Current location').textContent).toBe('?page=2');
    expect(screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent)).toEqual([
      'Active course page two',
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
