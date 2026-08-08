// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { InstructorCourseEditorPage } from '../../src/pages/instructor-course-editor-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';

const instructor = {
  email: 'instructor@example.test',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'instructor',
  birthday: null,
  phone_number: null,
  created_at: '2026-08-08T00:00:00Z',
};
const course = {
  id: 7,
  title: 'Verified course',
  description: null,
  price: '10.00',
  currency: 'USD',
  published_at: null,
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
  instructor: { id: 3, name: 'Ada', surname: 'Lovelace' },
  lessons: [
    {
      id: 8,
      title: 'Existing lesson',
      lesson_type: 'video',
      download_url: '/unrendered.mp4',
      description: null,
      is_published: false,
      created_at: '2026-08-08T00:00:00Z',
      updated_at: '2026-08-08T00:00:00Z',
    },
  ],
};
const tokenStore: AccessTokenStore = { get: () => 'token', set: () => {}, clear: () => {} };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  if (!options.decode) throw new Error('Expected a decoder');
  return options.decode(value);
}

async function renderPage(client: ApiClient) {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <SessionProvider client={client} tokenStore={tokenStore}>
          <MemoryRouter initialEntries={['/instructor/courses/7/edit']}>
            <Routes>
              <Route
                path="/instructor/courses/:courseId/edit"
                element={<InstructorCourseEditorPage />}
              />
            </Routes>
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
}

describe('InstructorCourseEditorPage', () => {
  it('creates only verified lesson fields and returns focus after cancelling the identified delete', async () => {
    const createRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7/lessons' && options.method === 'POST') {
        createRequests.push(options);
        return decode(options, { ...course.lessons[0], id: 9, title: 'New lesson' });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Edit course' })).toBeTruthy();

    const deleteLesson = screen.getByRole('button', { name: 'Delete lesson' });
    await act(async () => {
      await user.click(deleteLesson);
    });
    expect(await screen.findByRole('dialog', { name: 'Delete this lesson?' })).toBeTruthy();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
    });
    await waitFor(() => expect(document.activeElement).toBe(deleteLesson));

    const lessonTitle = screen.getByRole('textbox', { name: 'Lesson title' });
    await act(async () => {
      await user.type(lessonTitle, 'New lesson');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Lesson type' }), 'pdf');
      await user.type(
        screen.getAllByRole('textbox', { name: 'Description' })[1]!,
        'Verified notes',
      );
      await user.click(screen.getByRole('checkbox', { name: 'Publish this lesson' }));
      await user.click(screen.getByRole('button', { name: 'Create lesson' }));
    });
    await waitFor(() => expect(createRequests).toHaveLength(1));
    expect(createRequests[0]?.body).toEqual({
      title: 'New lesson',
      lesson_type: 'pdf',
      description: 'Verified notes',
      is_published: true,
    });
    expect(createRequests[0]?.body).not.toHaveProperty('download_url');
  });

  it('keeps local required-title feedback associated with the field and prevents a mutation', async () => {
    const request = vi.fn(async (options: ApiRequestOptions) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7') return decode(options, course);
      throw new Error('Mutation should not run');
    });
    await renderPage({ request } as ApiClient);
    const courseTitle = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      fireEvent.change(courseTitle, { target: { value: '' } });
      fireEvent.submit(courseTitle.closest('form') as HTMLFormElement);
    });
    expect((await screen.findAllByText('Enter a course title.')).length).toBeGreaterThan(0);
    expect(courseTitle.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(courseTitle);
    expect(
      request.mock.calls.map(([options]) => (options as ApiRequestOptions).method),
    ).not.toContain('PATCH');
  });

  it('maps a verified course 422 issue to the named field without exposing server detail', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7' && options.method === 'PATCH') {
        throw new ApiError({
          kind: 'validation',
          status: 422,
          message: 'PRIVATE_COURSE_TITLE_DETAIL',
          issues: [
            {
              location: ['body', 'title'],
              message: 'PRIVATE_COURSE_TITLE_DETAIL',
              type: 'missing',
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const courseTitle = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save course' }));
    });

    expect(await screen.findByText('Course title is required.')).toBeTruthy();
    expect(courseTitle.getAttribute('aria-invalid')).toBe('true');
    expect(courseTitle.getAttribute('aria-describedby')).toContain('error');
    await waitFor(() => expect(document.activeElement).toBe(courseTitle));
    expect(screen.queryByText('PRIVATE_COURSE_TITLE_DETAIL')).toBeNull();
  });

  it('preserves unsaved course edits when a course refetch returns the same identity', async () => {
    let courseRequestCount = 0;
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') {
        courseRequestCount += 1;
        return decode(options, { ...course, title: `Server course ${courseRequestCount}` });
      }
      if (options.path === '/courses/7/lessons' && options.method === 'POST') {
        return decode(options, { ...course.lessons[0], id: 9, title: 'New lesson' });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const courseTitle = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      await user.clear(courseTitle);
      await user.type(courseTitle, 'Unsaved instructor edit');
      await user.type(screen.getByRole('textbox', { name: 'Lesson title' }), 'New lesson');
      await user.click(screen.getByRole('button', { name: 'Create lesson' }));
    });

    await waitFor(() => expect(courseRequestCount).toBeGreaterThan(1));
    expect((courseTitle as HTMLInputElement).value).toBe('Unsaved instructor edit');
  });

  it('locks all course inputs for the full pending-save duration', async () => {
    let resolveUpdate: (updatedCourse: typeof course) => void = () => {};
    const updateResponse = new Promise<typeof course>((resolve) => {
      resolveUpdate = resolve;
    });
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7' && options.method === 'PATCH') {
        return decode(options, await updateResponse);
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const courseTitle = await screen.findByRole('textbox', { name: 'Course title' });
    const description = screen.getAllByRole('textbox', { name: 'Description' })[0]!;
    const price = screen.getByRole('spinbutton', { name: 'Price' });
    const currency = screen.getByRole('textbox', { name: 'Currency' });

    await act(async () => {
      await user.clear(courseTitle);
      await user.type(courseTitle, 'Submitted course title');
      await user.click(screen.getByRole('button', { name: 'Save course' }));
    });

    await waitFor(() => {
      expect((courseTitle as HTMLInputElement).disabled).toBe(true);
      expect((description as HTMLTextAreaElement).disabled).toBe(true);
      expect((price as HTMLInputElement).disabled).toBe(true);
      expect((currency as HTMLInputElement).disabled).toBe(true);
    });
    await user.type(courseTitle, ' post-submit edit');
    expect((courseTitle as HTMLInputElement).value).toBe('Submitted course title');

    await act(async () => {
      resolveUpdate({ ...course, title: 'Submitted course title' });
      await updateResponse;
    });
    await waitFor(() => {
      expect((courseTitle as HTMLInputElement).disabled).toBe(false);
      expect((description as HTMLTextAreaElement).disabled).toBe(false);
      expect((price as HTMLInputElement).disabled).toBe(false);
      expect((currency as HTMLInputElement).disabled).toBe(false);
      expect((courseTitle as HTMLInputElement).value).toBe('Submitted course title');
    });
  });

  it('clears a failed delete mutation when cancelling or selecting a new target', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.method === 'DELETE') {
        throw new ApiError({ kind: 'not_found', status: 404, message: 'PRIVATE_DELETE_DETAIL' });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Edit course' });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Delete lesson' }));
    });
    const deleteLessonDialog = await screen.findByRole('dialog', { name: 'Delete this lesson?' });
    await act(async () => {
      await user.click(
        within(deleteLessonDialog).getByRole('button', {
          name: 'Delete lesson',
        }),
      );
    });
    expect(await screen.findByText('This course or lesson is no longer available.')).toBeTruthy();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: 'Delete course' }));
    });

    expect(await screen.findByRole('dialog', { name: 'Delete this course?' })).toBeTruthy();
    expect(screen.queryByText('This course or lesson is no longer available.')).toBeNull();
  });

  it('maps a verified create-lesson publication 422 issue to the checkbox and focuses it', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7/lessons' && options.method === 'POST') {
        throw new ApiError({
          kind: 'validation',
          status: 422,
          message: 'PRIVATE_PUBLISH_DETAIL',
          issues: [
            {
              location: ['body', 'is_published'],
              message: 'PRIVATE_PUBLISH_DETAIL',
              type: 'value_error',
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const checkbox = await screen.findByRole('checkbox', { name: 'Publish this lesson' });
    await act(async () => {
      await user.type(screen.getByRole('textbox', { name: 'Lesson title' }), 'New lesson');
      await user.click(checkbox);
      await user.click(screen.getByRole('button', { name: 'Create lesson' }));
    });

    expect(await screen.findByText('Check publish this lesson and submit again.')).toBeTruthy();
    expect(checkbox.getAttribute('name')).toBe('is_published');
    expect(checkbox.getAttribute('aria-invalid')).toBe('true');
    expect(checkbox.getAttribute('aria-describedby')).toBe('create-lesson-is-published-error');
    await waitFor(() => expect(document.activeElement).toBe(checkbox));
    expect(screen.queryByText('PRIVATE_PUBLISH_DETAIL')).toBeNull();
  });
});
