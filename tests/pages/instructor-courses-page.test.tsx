// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import {
  SessionProvider,
  useSession,
  type AccessTokenStore,
} from '../../src/features/auth-session';
import { InstructorCoursesPage } from '../../src/pages/instructor-courses-page';
import {
  ApiError,
  createApiClient,
  type ApiClient,
  type ApiRequestOptions,
} from '../../src/shared/api';

const instructor = {
  email: 'instructor@example.test',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'instructor',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const courseList = {
  items: [
    {
      id: 17,
      title: 'Verified collection course',
      description: 'Returned by the instructor collection.',
      price: '0.00',
      currency: 'USD',
      published_at: null,
      created_at: '2026-07-30T00:00:00Z',
      updated_at: '2026-07-30T00:00:00Z',
      instructor: { id: 3, name: 'Ada', surname: 'Lovelace' },
      lessons: [{ id: 1, title: 'Introduction' }],
    },
  ],
  page: 1,
  page_size: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
};
const emptyCourseList = { ...courseList, items: [], total: 0, pages: 0 };
const tokenStore: AccessTokenStore = {
  get: () => 'instructor-token',
  set: () => {},
  clear: () => {},
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderPage(
  client: ApiClient,
  store: AccessTokenStore = tokenStore,
  includeSessionReplacementControl = false,
  initialEntry = '/',
) {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <SessionProvider client={client} tokenStore={store}>
          <MemoryRouter initialEntries={[initialEntry]}>
            {includeSessionReplacementControl ? <SessionReplacementControl /> : null}
            <LocationDisplay />
            <InstructorCoursesPage />
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
}

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function SessionReplacementControl() {
  const session = useSession();
  return (
    <button type="button" onClick={() => session.acceptAccessToken('replacement-token')}>
      Change instructor
    </button>
  );
}

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  if (!options.decode) throw new Error('Expected a decoder');
  return options.decode(value);
}

describe('InstructorCoursesPage', () => {
  it('submits a verified 255-character title', async () => {
    const createRequests: ApiRequestOptions[] = [];
    const collectionRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/my') {
        collectionRequests.push(options);
        return decode(options, courseList);
      }
      createRequests.push(options);
      return decode(options, {
        id: 7,
        instructor_id: 3,
        title: 'A'.repeat(255),
        description: null,
        price: '0.00',
        currency: 'USD',
        published_at: null,
        created_at: '2026-07-30T00:00:00Z',
        updated_at: '2026-07-30T00:00:00Z',
      });
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const hero = document.querySelector('[data-part="instructor-courses-hero"]');
    const heroImage = hero?.querySelector('img');
    expect(hero).toBeTruthy();
    expect(heroImage?.getAttribute('src')).toContain('instructor-courses-hero-ui022');
    expect(heroImage?.getAttribute('alt')).toBe('');
    expect(heroImage?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Instructor courses' })).toBeTruthy();
    expect(
      screen.getByText(
        'Create meaningful courses, share your expertise, and inspire learners to grow.',
      ),
    ).toBeTruthy();
    expect(await screen.findByText('Verified collection course')).toBeTruthy();
    const collectionActions = screen.getByRole('navigation', {
      name: 'Verified collection course actions',
    });
    expect(
      within(collectionActions).getByRole('link', { name: 'Edit course' }).getAttribute('href'),
    ).toBe('/instructor/courses/17/edit');
    expect(
      within(collectionActions)
        .getByRole('link', { name: 'Course enrollments' })
        .getAttribute('href'),
    ).toBe('/instructor/courses/17/enrollments');
    expect(collectionRequests).toHaveLength(2);
    expect(collectionRequests.map((request) => request.query)).toEqual([
      { page: 1, page_size: 20 },
      { page: 1, page_size: 20 },
    ]);
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      await user.type(title, 'A'.repeat(255));
      await user.click(screen.getByRole('button', { name: 'Create course' }));
    });
    await waitFor(() => expect(createRequests).toHaveLength(1));
    expect(createRequests[0]?.body).toEqual({ title: 'A'.repeat(255) });
    const newCourseActions = await screen.findByRole('navigation', { name: 'New course actions' });
    expect(
      within(newCourseActions).getByRole('link', { name: 'Edit course' }).getAttribute('href'),
    ).toBe('/instructor/courses/7/edit');
    expect(
      within(newCourseActions)
        .getByRole('link', { name: 'Course enrollments' })
        .getAttribute('href'),
    ).toBe('/instructor/courses/7/enrollments');
    await waitFor(() => expect(collectionRequests).toHaveLength(3));
  });

  it('requests page two through the public pagination control with only the verified query fields', async () => {
    const collectionRequests: ApiRequestOptions[] = [];
    const firstPage = {
      ...courseList,
      items: Array.from({ length: 20 }, (_, index) => ({
        ...courseList.items[0],
        id: index + 1,
        title: index === 0 ? 'Verified collection course' : `Instructor course ${index + 1}`,
      })),
      total: 21,
      pages: 2,
      has_next: true,
    };
    const secondPage = {
      ...firstPage,
      items: [{ ...courseList.items[0], id: 18, title: 'Second instructor course' }],
      page: 2,
      has_next: false,
      has_previous: true,
    };
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      collectionRequests.push(options);
      return decode(options, options.query?.page === 2 ? secondPage : firstPage);
    };

    await renderPage({ request });
    expect(await screen.findByText('Verified collection course')).toBeTruthy();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    });
    expect(await screen.findByText('Second instructor course')).toBeTruthy();

    const pageTwoRequests = collectionRequests.filter((request) => request.query?.page === 2);
    expect(pageTwoRequests).toHaveLength(1);
    expect(pageTwoRequests[0]?.query).toEqual({ page: 2, page_size: 20 });
  });

  it('blocks an oversized or whitespace-only title locally and returns keyboard focus to the field', async () => {
    const createRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/my') return decode(options, emptyCourseList);
      createRequests.push(options);
      return decode(options, {
        id: 7,
        instructor_id: 3,
        title: 'Course',
        description: null,
        price: '0.00',
        currency: 'USD',
        published_at: null,
        created_at: '2026-07-30T00:00:00Z',
        updated_at: '2026-07-30T00:00:00Z',
      });
    };
    await renderPage({ request });
    const user = userEvent.setup();
    expect(await screen.findByText('You have not created any courses yet.')).toBeTruthy();
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      fireEvent.change(title, { target: { value: 'A'.repeat(256) } });
      fireEvent.submit(title.closest('form') as HTMLFormElement);
    });
    expect(await screen.findByText('Course title must be 255 characters or fewer.')).toBeTruthy();
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(title);
    expect(createRequests).toHaveLength(0);

    await act(async () => {
      fireEvent.change(title, { target: { value: '   ' } });
      await user.keyboard('{Enter}');
    });
    expect(await screen.findByText('Enter a course title.')).toBeTruthy();
    expect(document.activeElement).toBe(title);
    expect(createRequests).toHaveLength(0);
  });

  it('focuses the named generic failure summary after an unaddressable create failure', async () => {
    const request = vi.fn(async (options) => {
      if (options.path === '/me') return options.decode?.(instructor);
      if (options.path === '/courses/my') return options.decode?.(emptyCourseList);
      throw new Error('private upstream failure');
    });
    await renderPage({ request } as ApiClient);
    const user = userEvent.setup();
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    expect(title.getAttribute('name')).toBe('title');
    await act(async () => {
      await user.type(title, 'A course');
      await user.click(screen.getByRole('button', { name: 'Create course' }));
    });
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(summary.textContent).toContain('We could not create the course');
  });

  it('renders a loading skeleton before the decoder-faithful empty collection resolves', async () => {
    let resolveCollection: (() => void) | undefined;
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      return new Promise((resolve) => {
        resolveCollection = () => resolve(decode(options, emptyCourseList));
      });
    };
    await renderPage({ request });
    expect(await screen.findByLabelText('Loading your courses')).toBeTruthy();
    await act(async () => {
      resolveCollection?.();
    });
    expect(await screen.findByText('You have not created any courses yet.')).toBeTruthy();
  });

  it.each([
    [401, 'unauthorized', 'Sign in again to view your courses.'],
    [403, 'forbidden', 'You do not have permission to view instructor courses.'],
    [422, 'validation', 'The requested course page is not valid. Try another page.'],
  ] as const)(
    'maps the verified %i collection failure without inventing another state',
    async (status, kind, message) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        throw new ApiError({ kind, status, message: 'private collection failure' });
      };
      await renderPage({ request });
      expect((await screen.findByRole('alert')).textContent).toContain('Course list unavailable');
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.queryByText('This course was not found.')).toBeNull();
    },
  );

  it('maps a generic collection failure to a labelled retry that restores decoder-faithful content', async () => {
    let allowSuccess = false;
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (!allowSuccess) throw new ApiError({ kind: 'server', status: 500, message: 'private' });
      return decode(options, courseList);
    };
    await renderPage({ request });
    expect(await screen.findByText('We could not load your courses. Try again.')).toBeTruthy();
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    allowSuccess = true;
    await act(async () => {
      await userEvent.setup().keyboard('{Enter}');
    });
    expect(await screen.findByText('Verified collection course')).toBeTruthy();
  });

  it('resets an unaddressable 422 collection page to page one before retrying', async () => {
    const collectionRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      collectionRequests.push(options);
      if (options.query?.page === 9)
        throw new ApiError({ kind: 'validation', status: 422, message: 'private' });
      return decode(options, courseList);
    };
    await renderPage({ request }, tokenStore, false, '/?page=9');
    expect(
      await screen.findByText('The requested course page is not valid. Try another page.'),
    ).toBeTruthy();
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(await screen.findByText('Verified collection course')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('');
    expect(collectionRequests[collectionRequests.length - 1]?.query).toEqual({
      page: 1,
      page_size: 20,
    });
    expect(collectionRequests.filter((request) => request.query?.page === 1)).toHaveLength(1);
  });

  it('does not project a deferred old-session collection after the session cache epoch changes', async () => {
    let activeToken = 'original-token';
    let resolveOriginalCollection: (() => void) | undefined;
    const collectionTokens: string[] = [];
    const store: AccessTokenStore = {
      get: () => activeToken,
      set: (token) => {
        activeToken = token;
      },
      clear: () => {
        activeToken = '';
      },
    };
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      collectionTokens.push(activeToken);
      if (activeToken === 'original-token') {
        return new Promise((resolve) => {
          resolveOriginalCollection = () =>
            resolve(
              decode(options, {
                ...courseList,
                items: [{ ...courseList.items[0], title: 'Old instructor course' }],
              }),
            );
        });
      }
      return decode(options, {
        ...courseList,
        items: [{ ...courseList.items[0], title: 'Replacement instructor course' }],
      });
    };
    await renderPage({ request }, store, true);
    expect(await screen.findByLabelText('Loading your courses')).toBeTruthy();
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Change instructor' }));
    });
    expect(await screen.findByText('Replacement instructor course')).toBeTruthy();
    await act(async () => {
      resolveOriginalCollection?.();
    });
    expect(collectionTokens).toContain('original-token');
    expect(collectionTokens).toContain('replacement-token');
    expect(collectionTokens[collectionTokens.length - 1]).toBe('replacement-token');
    expect(screen.queryByText('Old instructor course')).toBeNull();
  });

  it('uses the session request boundary to suppress overlapping create transports', async () => {
    let resolveCreate: ((value: Response) => void) | undefined;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith('/me')) return Promise.resolve(new Response(JSON.stringify(instructor)));
      if (url.includes('/courses/my'))
        return Promise.resolve(new Response(JSON.stringify(emptyCourseList)));
      return new Promise<Response>((resolve) => {
        resolveCreate = resolve;
      });
    });
    await renderPage(createApiClient({ baseUrl: 'https://api.example.test', fetch }));
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      fireEvent.change(title, { target: { value: 'A course' } });
    });
    const form = title.closest('form');
    if (!form) throw new Error('Expected a form');
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    resolveCreate?.(
      new Response(
        JSON.stringify({
          id: 7,
          instructor_id: 3,
          title: 'A course',
          description: null,
          price: '0.00',
          currency: 'USD',
          published_at: null,
          created_at: '2026-07-30T00:00:00Z',
          updated_at: '2026-07-30T00:00:00Z',
        }),
      ),
    );
  });
});
