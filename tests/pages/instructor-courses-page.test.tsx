// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { InstructorCoursesPage } from '../../src/pages/instructor-courses-page';
import { createApiClient, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';

const instructor = {
  email: 'instructor@example.test',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'instructor',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const tokenStore: AccessTokenStore = {
  get: () => 'instructor-token',
  set: () => {},
  clear: () => {},
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderPage(client: ApiClient) {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <SessionProvider client={client} tokenStore={tokenStore}>
          <MemoryRouter>
            <InstructorCoursesPage />
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
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
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
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
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      await user.type(title, 'A'.repeat(255));
      await user.click(screen.getByRole('button', { name: 'Create course' }));
    });
    await waitFor(() => expect(createRequests).toHaveLength(1));
    expect(createRequests[0]?.body).toEqual({ title: 'A'.repeat(255) });
  });

  it('blocks an oversized or whitespace-only title locally and returns keyboard focus to the field', async () => {
    const createRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
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

  it('uses the session request boundary to suppress overlapping create transports', async () => {
    let resolveCreate: ((value: Response) => void) | undefined;
    const fetch = vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith('/me'))
        return Promise.resolve(new Response(JSON.stringify(instructor)));
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
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
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
