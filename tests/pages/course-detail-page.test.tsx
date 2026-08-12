// @vitest-environment jsdom

import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import {
  SessionProvider,
  useSession,
  type AccessTokenStore,
} from '../../src/features/auth-session';
import { CourseDetailPage } from '../../src/pages/course-detail-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const course = {
  id: 7,
  title: 'React foundations',
  description: 'Build reliable interfaces.',
  price: '0.00',
  currency: 'USD',
  published_at: '2026-07-01T00:00:00Z',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  instructor: { id: 2, name: 'Ada', surname: 'Lovelace' },
  lessons: [],
};

const studentProfile = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const emptyCart = { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 };
const emptyEnrollments = {
  items: [],
  page: 1,
  page_size: 100,
  total: 0,
  pages: 0,
  has_next: false,
  has_previous: false,
};
const enrollmentMutation = {
  id: 4,
  user_id: 9,
  course_id: 7,
  status: 'active',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  course: {
    id: 7,
    title: course.title,
    description: course.description,
    price: '0.00',
    currency: course.currency,
  },
};
const cartItemMutation = {
  id: 5,
  course_id: 7,
  added_at: '2026-07-01T00:00:00Z',
  course: { id: 7, title: course.title, price: '19.99', currency: course.currency },
};

function lesson(downloadUrl: string | null) {
  return {
    id: 3,
    title: 'Welcome',
    lesson_type: 'video',
    download_url: downloadUrl,
    description: 'Course orientation.',
    is_published: true,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  };
}

function outline(downloadUrl: string | null) {
  return {
    items: [lesson(downloadUrl)],
    page: 1,
    page_size: 100,
    total: 1,
    pages: 1,
    has_next: false,
    has_previous: false,
  };
}

function store(token: string | null = null): AccessTokenStore {
  let value = token;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
    clear: () => {
      value = null;
    },
  };
}

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  return options.decode ? options.decode(value) : (value as TResponse);
}

interface PageHarnessOptions {
  readonly sessionControls?: boolean;
  readonly routeControls?: boolean;
  readonly tokenStore?: AccessTokenStore;
}

function PageHarnessControls({ sessionControls, routeControls }: PageHarnessOptions) {
  const session = useSession();
  const navigate = useNavigate();
  return (
    <>
      {routeControls ? (
        <button type="button" onClick={() => navigate('/courses/8')}>
          Open course 8
        </button>
      ) : null}
      {routeControls ? (
        <button type="button" onClick={() => navigate('/courses/7')}>
          Return to course 7
        </button>
      ) : null}
      {sessionControls ? (
        <button type="button" onClick={session.clearSession}>
          Clear session
        </button>
      ) : null}
    </>
  );
}

function renderPage(
  request: ApiClient['request'],
  token: string | null = null,
  path = '/courses/7',
  options: PageHarnessOptions = {},
) {
  const queryClient = createAppQueryClient();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider client={{ request }} tokenStore={options.tokenStore ?? store(token)}>
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <PageHarnessControls {...options} />
          <Routes>
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CourseDetailPage', () => {
  it.each([
    ['/media/lessons/private.mp4', 'populated-link'],
    [null, 'anonymous-redacted'],
    [null, 'explicit-null'],
  ])('renders %s as metadata only for the %s fixture', async (downloadUrl, _fixtureName) => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(downloadUrl));
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'React foundations' }),
    ).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 3, name: 'Welcome' })).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(document.querySelector('data')?.textContent).toBe('USD 0.00');
    expect(screen.getByText('1', { selector: 'dd' })).toBeTruthy();
    const signIn = await screen.findByRole('link', { name: 'Sign in' });
    expect(signIn.getAttribute('href')).toBe('/login?returnTo=%2Fcourses%2F7');
    expect(signIn.closest('p')?.textContent).toBe('Sign in to enroll for free.');
    expect(
      (screen.getByRole('button', { name: 'Enroll for free' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(document.body.textContent).not.toContain('/media/lessons/');
    expect(document.querySelector('audio, video, source, [download]')).toBeNull();
    expect(screen.queryByRole('button', { name: /play|download/i })).toBeNull();
  });

  it('renders paid guest guidance without a preflight or mutation request', async () => {
    const paths: string[] = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      paths.push(options.path);
      if (options.path === '/courses/7') return decode(options, { ...course, price: '19.99' });
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request);

    const signIn = await screen.findByRole('link', { name: 'Sign in' });
    expect(signIn.getAttribute('href')).toBe('/login?returnTo=%2Fcourses%2F7');
    expect(signIn.closest('p')?.textContent).toBe('Sign in to add this course to your cart.');
    const button = screen.getByRole('button', { name: 'Add to cart' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(paths).toEqual(['/courses/7', '/courses/7/lessons']);
  });

  it.each([
    ['0.00', 'Enroll for free'],
    ['19.99', 'Add to cart'],
  ])(
    'marks the %s guest unavailable action for the local disabled CTA treatment',
    async (price, label) => {
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/courses/7') return decode(options, { ...course, price });
        if (options.path === '/courses/7/lessons') return decode(options, outline(null));
        throw new Error(`Unexpected request ${options.path}`);
      };

      renderPage(request);

      const action = (await screen.findByRole('button', { name: label })) as HTMLButtonElement;
      expect(action.disabled).toBe(true);
      expect(action.className).toContain('guestUnavailableAction');
    },
  );

  it('clears a genuine invalid bearer after 401 before rendering public redacted metadata', async () => {
    const tokenStore = store('invalid-bearer');
    const authPolicies: Array<string | undefined> = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      authPolicies.push(options.authPolicy);
      if (options.path === '/me')
        throw new ApiError({
          kind: 'unauthorized',
          status: 401,
          message: 'Could not validate credentials',
        });
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'invalid-bearer', '/courses/7', { tokenStore });

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeTruthy();
    expect(tokenStore.get()).toBeNull();
    expect(authPolicies).toContain(undefined);
    expect(authPolicies.filter((policy) => policy === 'optional')).toHaveLength(2);
    expect(document.body.textContent).not.toContain('/media/lessons/');
    expect(document.querySelector('audio, video, source, [download]')).toBeNull();
  });

  it('renders detail 404 without requesting the outline', async () => {
    const paths: string[] = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      paths.push(options.path);
      throw new ApiError({ kind: 'not_found', status: 404, message: 'Course not found' });
    };
    renderPage(request);

    expect(await screen.findByRole('heading', { level: 1, name: 'Course not found' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Return to the course catalog' }).getAttribute('href'),
    ).toBe('/');
    expect(paths).toEqual(['/courses/7']);
  });

  it('retries only the failed outline query and exposes an empty outline distinctly', async () => {
    let outlineAttempts = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') {
        outlineAttempts += 1;
        if (outlineAttempts === 1)
          throw new ApiError({ kind: 'server', status: 503, message: 'private detail' });
        return decode(options, {
          items: [],
          page: 1,
          page_size: 100,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request);
    const user = userEvent.setup();

    expect(await screen.findByText('We could not load this course')).toBeTruthy();
    expect(screen.getByText('Please try again.', { selector: 'p' })).toBeTruthy();
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(await screen.findByText('No lessons have been added yet.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Course outline' })).toBe(
      document.activeElement,
    );
    expect(screen.getByRole('status').textContent).toContain('Course outline recovered');
    expect(outlineAttempts).toBe(2);
  });

  it('renders invalid-response recovery when lesson pagination metadata drifts across pages', async () => {
    let outlineAttempts = 0;
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...lesson(null),
      id: index + 1,
    }));
    const secondPage = Array.from({ length: 50 }, (_, index) => ({
      ...lesson(null),
      id: index + 101,
    }));
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') {
        outlineAttempts += 1;
        const payload =
          outlineAttempts === 1
            ? {
                items: firstPage,
                page: 1,
                page_size: 100,
                total: 101,
                pages: 2,
                has_next: true,
                has_previous: false,
              }
            : outlineAttempts === 2
              ? {
                  items: secondPage,
                  page: 2,
                  page_size: 100,
                  total: 150,
                  pages: 2,
                  has_next: false,
                  has_previous: true,
                }
              : {
                  items: [],
                  page: 1,
                  page_size: 100,
                  total: 0,
                  pages: 0,
                  has_next: false,
                  has_previous: false,
                };
        try {
          return decode(options, payload);
        } catch (cause) {
          throw new ApiError({
            kind: 'invalid_response',
            status: 200,
            message: 'Server returned an invalid success response',
            cause,
          });
        }
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request);

    expect(
      await screen.findByText('The server returned an invalid response. Try again.'),
    ).toBeTruthy();
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(await screen.findByText('No lessons have been added yet.')).toBeTruthy();
    expect(outlineAttempts).toBe(3);
  });

  it('moves focus to recovered detail content and announces a detail retry success', async () => {
    let detailAttempts = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/courses/7') {
        detailAttempts += 1;
        if (detailAttempts === 1)
          throw new ApiError({ kind: 'server', status: 503, message: 'private detail' });
        return decode(options, course);
      }
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request);
    const user = userEvent.setup();

    const retry = await screen.findByRole('button', { name: 'Try again' });
    retry.focus();
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    const heading = await screen.findByRole('heading', { level: 1, name: 'React foundations' });
    await waitFor(() => expect(heading).toBe(document.activeElement));
    expect(screen.getByRole('status').textContent).toContain('Course details recovered');
    expect(detailAttempts).toBe(2);
  });

  it('does not let a later background detail success consume a failed retry focus intent', async () => {
    let detailAttempts = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/courses/7') {
        detailAttempts += 1;
        if (detailAttempts < 3)
          throw new ApiError({ kind: 'server', status: 503, message: 'private detail' });
        return decode(options, course);
      }
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      throw new Error(`Unexpected request ${options.path}`);
    };
    const { queryClient } = renderPage(request);
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
    await screen.findByRole('heading', { name: 'React foundations' });
    expect(document.activeElement).toBe(sentinel);
    sentinel.remove();
  });

  it('does not let a pending detail retry focus after its course identity changes', async () => {
    let resolveRetry: (() => void) | undefined;
    const retryResponse = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    let courseSevenRequests = 0;
    const courseEight = { ...course, id: 8, title: 'Course eight' };
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/courses/7') {
        courseSevenRequests += 1;
        if (courseSevenRequests === 1)
          throw new ApiError({ kind: 'server', status: 503, message: 'private detail' });
        await retryResponse;
        return decode(options, course);
      }
      if (options.path === '/courses/8') return decode(options, courseEight);
      if (options.path === '/courses/7/lessons' || options.path === '/courses/8/lessons')
        return decode(options, outline(null));
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, null, '/courses/7', { routeControls: true });
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await waitFor(() => expect(courseSevenRequests).toBe(2));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open course 8' }));
    });
    await screen.findByRole('heading', { name: 'Course eight' });
    const sentinel = document.createElement('button');
    document.body.append(sentinel);
    sentinel.focus();
    await act(async () => {
      resolveRetry?.();
    });
    await waitFor(() => expect(document.activeElement).toBe(sentinel));
    sentinel.remove();
  });

  it('shows an authenticated Draft without preflight reads or a mutation', async () => {
    const paths: string[] = [];
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      paths.push(options.path);
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7')
        return decode(options, { ...course, published_at: null, price: '9.99' });
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'student-token');

    expect(await screen.findAllByText('Course is not published')).toHaveLength(2);
    expect(
      (screen.getByRole('button', { name: 'Course is not published' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(paths).toContain('/me');
    expect(paths).toContain('/courses/7');
    expect(paths).toContain('/courses/7/lessons');
    expect(paths).not.toContain('/cart');
    expect(paths).not.toContain('/enrollments/my');
  });

  it('deduplicates a pending free enrollment and retains success while enrollment truth converges', async () => {
    let resolveEnrollment: (() => void) | undefined;
    let mutationCount = 0;
    const pending = new Promise<void>((resolve) => {
      resolveEnrollment = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      if (options.path === '/enrollments') {
        mutationCount += 1;
        await pending;
        return decode(options, enrollmentMutation);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token');

    const button = await screen.findByRole('button', { name: 'Enroll free' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Please wait…' }) as HTMLButtonElement).disabled,
      ).toBe(true),
    );
    expect(screen.getByRole('button', { name: 'Please wait…' }).getAttribute('aria-busy')).toBe(
      'true',
    );
    await waitFor(() => expect(mutationCount).toBe(1));
    resolveEnrollment?.();
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Already enrolled' }) as HTMLButtonElement).disabled,
      ).toBe(true),
    );
    expect(await screen.findByText('You are now enrolled in this course.')).toBeTruthy();
  });

  it('uses distinct paid-cart success copy while cart truth converges without claiming course access', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, { ...course, price: '19.99' });
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      if (options.path === '/cart/items') return decode(options, cartItemMutation);
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token');

    const addToCart = await screen.findByRole('button', { name: 'Add to cart' });
    await act(async () => {
      await userEvent.setup().click(addToCart);
    });
    expect(
      ((await screen.findByRole('button', { name: 'Already in cart' })) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText('This course was added to your cart.')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/access has been updated|now enrolled/i);
  });

  it.each([
    ['/enrollments', '0.00', 'Enroll free', null],
    ['/cart/items', '19.99', 'Add to cart', { id: 5 }],
  ])(
    'fails closed when %s returns a malformed success payload',
    async (mutationPath, price, actionLabel, payload) => {
      let mutationRequests = 0;
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, studentProfile);
        if (options.path === '/courses/7') return decode(options, { ...course, price });
        if (options.path === '/courses/7/lessons') return decode(options, outline(null));
        if (options.path === '/cart') return decode(options, emptyCart);
        if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
        if (options.path === mutationPath) {
          mutationRequests += 1;
          try {
            return decode(options, payload);
          } catch (cause) {
            throw new ApiError({
              kind: 'invalid_response',
              status: 201,
              message: 'Server returned an invalid success response',
              cause,
            });
          }
        }
        throw new Error(`Unexpected request ${options.path}`);
      };
      renderPage(request, 'token');

      const action = await screen.findByRole('button', { name: actionLabel });
      await act(async () => {
        await userEvent.setup().click(action);
      });
      expect(await screen.findByText('This action is currently unavailable.')).toBeTruthy();
      expect(
        (screen.getByRole('button', { name: 'Action unavailable' }) as HTMLButtonElement).disabled,
      ).toBe(true);
      expect(screen.queryByText('You are now enrolled in this course.')).toBeNull();
      expect(screen.queryByText('This course was added to your cart.')).toBeNull();
      expect(mutationRequests).toBe(1);
    },
  );

  it('fails preflight closed and sends no mutation when enrollment pagination is invalid', async () => {
    let mutationRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') {
        return decode(options, { ...emptyEnrollments, page: 2, has_previous: true });
      }
      if (options.path === '/enrollments' || options.path === '/cart/items') {
        mutationRequests += 1;
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token');

    expect(
      ((await screen.findByRole('button', { name: 'Action unavailable' })) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(mutationRequests).toBe(0);
  });

  it.each([
    [
      new ApiError({
        kind: 'unauthorized',
        status: 401,
        message: 'Could not validate credentials',
      }),
      'Sign in',
      1,
    ],
    [
      new ApiError({ kind: 'forbidden', status: 403, message: 'private forbidden detail' }),
      'Action unavailable',
      0,
    ],
    [
      new ApiError({ kind: 'not_found', status: 404, message: 'Course not found' }),
      'Action unavailable',
      1,
    ],
    [
      new ApiError({ kind: 'bad_request', status: 400, message: 'Course is not published' }),
      'Action unavailable',
      1,
    ],
    [
      new ApiError({ kind: 'bad_request', status: 400, message: 'Cannot enroll' }),
      'Action unavailable',
      0,
    ],
    [
      new ApiError({ kind: 'validation', status: 422, message: 'private validation detail' }),
      'Action unavailable',
      0,
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Unexpected conflict' }),
      'Enroll free',
      0,
    ],
  ])(
    'fails closed after terminal mutation outcome %# and performs the exact detail refresh',
    async (mutationError, expectedLabel, expectedDetailDelta) => {
      let detailRequests = 0;
      let mutationRequests = 0;
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, studentProfile);
        if (options.path === '/courses/7') {
          detailRequests += 1;
          return decode(options, course);
        }
        if (options.path === '/courses/7/lessons') return decode(options, outline(null));
        if (options.path === '/cart') return decode(options, emptyCart);
        if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
        if (options.path === '/enrollments') {
          mutationRequests += 1;
          throw mutationError;
        }
        throw new Error(`Unexpected request ${options.path}`);
      };
      renderPage(request, 'token');
      const user = userEvent.setup();

      const enroll = await screen.findByRole('button', { name: 'Enroll free' });
      const detailRequestsBeforeMutation = detailRequests;
      await act(async () => {
        await user.click(enroll);
      });
      const resultingAction = await screen.findByRole(
        expectedLabel === 'Sign in' ? 'link' : 'button',
        { name: expectedLabel },
      );
      if (expectedLabel === 'Action unavailable' && resultingAction instanceof HTMLButtonElement)
        expect(resultingAction.disabled).toBe(true);
      expect(document.body.textContent).not.toContain('private forbidden detail');
      expect(document.body.textContent).not.toContain('private validation detail');
      await waitFor(() =>
        expect(detailRequests).toBe(detailRequestsBeforeMutation + expectedDetailDelta),
      );
      if (resultingAction instanceof HTMLButtonElement) fireEvent.click(resultingAction);
      expect(mutationRequests).toBe(1);
    },
  );

  it.each([
    [
      'Already enrolled in this course',
      'The course is already in your learning list.',
      '/enrollments/my',
      '/enrollments',
      '0.00',
      'Enroll free',
    ],
    [
      'Course already in cart',
      'The course is already in your cart.',
      '/cart',
      '/cart/items',
      '19.99',
      'Add to cart',
    ],
  ])(
    'clears a known-conflict override and feedback when its refreshed owner remains eligible: %s',
    async (message, publicMessage, refreshedPath, mutationPath, price, actionLabel) => {
      const counts = new Map<string, number>();
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        counts.set(options.path, (counts.get(options.path) ?? 0) + 1);
        if (options.path === '/me') return decode(options, studentProfile);
        if (options.path === '/courses/7') return decode(options, { ...course, price });
        if (options.path === '/courses/7/lessons') return decode(options, outline(null));
        if (options.path === '/cart') return decode(options, emptyCart);
        if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
        if (options.path === mutationPath)
          throw new ApiError({ kind: 'conflict', status: 409, message });
        throw new Error(`Unexpected request ${options.path}`);
      };
      renderPage(request, 'token');

      const actionButton = await screen.findByRole('button', { name: actionLabel });
      await act(async () => {
        await userEvent.setup().click(actionButton);
      });
      expect(
        ((await screen.findByRole('button', { name: actionLabel })) as HTMLButtonElement).disabled,
      ).toBe(false);
      await waitFor(() => expect(counts.get(refreshedPath)).toBe(2));
      expect(counts.get(refreshedPath === '/cart' ? '/enrollments/my' : '/cart')).toBe(1);
      expect(counts.get(mutationPath)).toBe(1);
      expect(screen.queryByText(publicMessage)).toBeNull();
    },
  );

  it('clears the generic-conflict override after both preflight owners confirm eligibility', async () => {
    const counts = new Map<string, number>();
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      counts.set(options.path, (counts.get(options.path) ?? 0) + 1);
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      if (options.path === '/enrollments')
        throw new ApiError({ kind: 'conflict', status: 409, message: 'Unexpected conflict' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token');
    const user = userEvent.setup();

    const enroll = await screen.findByRole('button', { name: 'Enroll free' });
    await act(async () => {
      await user.click(enroll);
    });
    expect(
      ((await screen.findByRole('button', { name: 'Enroll free' })) as HTMLButtonElement).disabled,
    ).toBe(false);
    await waitFor(() => expect(counts.get('/cart')).toBe(2));
    expect(counts.get('/enrollments/my')).toBe(2);
    expect(counts.get('/enrollments')).toBe(1);
    expect(
      screen.queryByText('The course state changed. Availability has been refreshed.'),
    ).toBeNull();
  });

  it('clears a generic-conflict notice after authoritative eligibility returns', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      if (options.path === '/enrollments')
        throw new ApiError({ kind: 'conflict', status: 409, message: 'Unexpected conflict' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token');

    const enroll = await screen.findByRole('button', { name: 'Enroll free' });
    await act(async () => {
      await userEvent.setup().click(enroll);
    });
    await screen.findByRole('button', { name: 'Enroll free' });
    expect(
      screen.queryByText('The course state changed. Availability has been refreshed.'),
    ).toBeNull();
    expect(document.querySelectorAll('.ui-notice')).toHaveLength(0);
  });

  it('retains success until authority converges, then clears it after authoritative removal', async () => {
    let enrolled = false;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') {
        return decode(
          options,
          enrolled
            ? {
                ...emptyEnrollments,
                items: [enrollmentMutation],
                total: 1,
                pages: 1,
              }
            : emptyEnrollments,
        );
      }
      if (options.path === '/enrollments') return decode(options, enrollmentMutation);
      throw new Error(`Unexpected request ${options.path}`);
    };
    const { queryClient } = renderPage(request, 'token');

    const enroll = await screen.findByRole('button', { name: 'Enroll free' });
    await act(async () => {
      await userEvent.setup().click(enroll);
    });
    expect(
      ((await screen.findByRole('button', { name: 'Already enrolled' })) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(await screen.findByText('You are now enrolled in this course.')).toBeTruthy();

    enrolled = true;
    await act(async () => {
      await queryClient.invalidateQueries();
    });
    expect(
      ((await screen.findByRole('button', { name: 'Already enrolled' })) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText('You are now enrolled in this course.')).toBeTruthy();

    const committedStates: Array<{ hasEligibleAction: boolean; hasSuccessNotice: boolean }> = [];
    const observer = new MutationObserver(() => {
      committedStates.push({
        hasEligibleAction: screen.queryByRole('button', { name: 'Enroll free' }) !== null,
        hasSuccessNotice: screen.queryByText('You are now enrolled in this course.') !== null,
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    enrolled = false;
    await act(async () => {
      await queryClient.invalidateQueries();
    });
    expect(
      ((await screen.findByRole('button', { name: 'Enroll free' })) as HTMLButtonElement).disabled,
    ).toBe(false);
    await waitFor(() =>
      expect(screen.queryByText('You are now enrolled in this course.')).toBeNull(),
    );
    observer.disconnect();
    expect(committedStates).not.toContainEqual({ hasEligibleAction: true, hasSuccessNotice: true });
  });

  it.each([
    new ApiError({ kind: 'offline', status: null, message: 'private offline detail' }),
    new ApiError({ kind: 'server', status: 500, message: 'private server detail' }),
  ])(
    'retains an explicit new-attempt action only for retryable mutation errors',
    async (mutationError) => {
      let mutationRequests = 0;
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, studentProfile);
        if (options.path === '/courses/7') return decode(options, course);
        if (options.path === '/courses/7/lessons') return decode(options, outline(null));
        if (options.path === '/cart') return decode(options, emptyCart);
        if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
        if (options.path === '/enrollments') {
          mutationRequests += 1;
          throw mutationError;
        }
        throw new Error(`Unexpected request ${options.path}`);
      };
      renderPage(request, 'token');
      const user = userEvent.setup();

      const enroll = await screen.findByRole('button', { name: 'Enroll free' });
      await act(async () => {
        await user.click(enroll);
      });
      expect(
        await screen.findByText('The action failed. Check your connection and try again.'),
      ).toBeTruthy();
      const retry = screen.getByRole('button', { name: 'Enroll free' });
      expect((retry as HTMLButtonElement).disabled).toBe(false);
      await act(async () => {
        await user.click(retry);
      });
      expect(mutationRequests).toBe(2);
    },
  );

  it('does not carry a completed mutation disposition to another course', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/8')
        return decode(options, { ...course, id: 8, title: 'Course eight' });
      if (options.path.endsWith('/lessons')) return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      if (options.path === '/enrollments') return decode(options, enrollmentMutation);
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token', '/courses/7', { routeControls: true });
    const user = userEvent.setup();

    const enroll = await screen.findByRole('button', { name: 'Enroll free' });
    await act(async () => {
      await user.click(enroll);
    });
    expect(
      ((await screen.findByRole('button', { name: 'Already enrolled' })) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(await screen.findByText('You are now enrolled in this course.')).toBeTruthy();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open course 8' }));
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Course eight' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Enroll free' })).toBeTruthy();
    expect(screen.queryByText('You are now enrolled in this course.')).toBeNull();
  });

  it.each([
    ['success', undefined],
    [
      'known conflict',
      new ApiError({ kind: 'conflict', status: 409, message: 'Already enrolled in this course' }),
    ],
  ])(
    'reconciles the attempted course cache after a pending route change on %s',
    async (_outcome, mutationError) => {
      let resolveMutation: (() => void) | undefined;
      let mutationRequests = 0;
      let enrollmentRequests = 0;
      let enrolled = false;
      const pending = new Promise<void>((resolve) => {
        resolveMutation = () => {
          enrolled = true;
          resolve();
        };
      });
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, studentProfile);
        if (options.path === '/courses/7') return decode(options, course);
        if (options.path === '/courses/8')
          return decode(options, { ...course, id: 8, title: 'Course eight' });
        if (options.path.endsWith('/lessons')) return decode(options, outline(null));
        if (options.path === '/cart') return decode(options, emptyCart);
        if (options.path === '/enrollments/my') {
          enrollmentRequests += 1;
          return decode(
            options,
            enrolled
              ? {
                  ...emptyEnrollments,
                  items: [
                    {
                      id: 12,
                      user_id: 9,
                      course_id: 7,
                      status: 'active',
                      created_at: '2026-07-01T00:00:00Z',
                      updated_at: '2026-07-01T00:00:00Z',
                      course: {
                        id: 7,
                        title: course.title,
                        description: course.description,
                        price: course.price,
                        currency: course.currency,
                      },
                    },
                  ],
                  total: 1,
                  pages: 1,
                }
              : emptyEnrollments,
          );
        }
        if (options.path === '/enrollments') {
          mutationRequests += 1;
          await pending;
          if (mutationError) throw mutationError;
          return decode(options, enrollmentMutation);
        }
        throw new Error(`Unexpected request ${options.path}`);
      };
      renderPage(request, 'token', '/courses/7', { routeControls: true });
      const user = userEvent.setup();

      const enroll = await screen.findByRole('button', { name: 'Enroll free' });
      await act(async () => {
        await user.click(enroll);
      });
      const openCourseEight = screen.getByRole('button', { name: 'Open course 8' });
      await act(async () => {
        await user.click(openCourseEight);
      });
      expect(await screen.findByRole('heading', { level: 1, name: 'Course eight' })).toBeTruthy();
      const enrollmentRequestsBeforeResolution = enrollmentRequests;
      await act(async () => {
        resolveMutation?.();
      });
      await waitFor(() => expect(enrollmentRequests).toBe(enrollmentRequestsBeforeResolution + 1));
      expect(screen.getByRole('button', { name: 'Enroll free' })).toBeTruthy();

      const returnToCourseSeven = screen.getByRole('button', { name: 'Return to course 7' });
      await act(async () => {
        await user.click(returnToCourseSeven);
      });
      expect(
        ((await screen.findByRole('button', { name: 'Already enrolled' })) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Already enrolled' }));
      expect(mutationRequests).toBe(1);
    },
  );

  it('ignores a late mutation outcome after the session identity changes', async () => {
    let resolveEnrollment: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      resolveEnrollment = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, studentProfile);
      if (options.path === '/courses/7') return decode(options, course);
      if (options.path === '/courses/7/lessons') return decode(options, outline(null));
      if (options.path === '/cart') return decode(options, emptyCart);
      if (options.path === '/enrollments/my') return decode(options, emptyEnrollments);
      if (options.path === '/enrollments') {
        await pending;
        return decode(options, enrollmentMutation);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    renderPage(request, 'token', '/courses/7', { sessionControls: true });
    const user = userEvent.setup();

    const enroll = await screen.findByRole('button', { name: 'Enroll free' });
    await act(async () => {
      await user.click(enroll);
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Clear session' }));
    });
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeTruthy();
    resolveEnrollment?.();
    await waitFor(() =>
      expect(screen.queryByText('You are now enrolled in this course.')).toBeNull(),
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  });

  it('rejects invalid route IDs without a request', async () => {
    const request = vi.fn(async () => undefined) as unknown as ApiClient['request'];
    renderPage(request, null, '/courses/not-a-number');
    expect(screen.getByRole('heading', { level: 1, name: 'Course not found' })).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
});
