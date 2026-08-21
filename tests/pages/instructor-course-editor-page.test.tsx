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
import { LocaleProvider, useLocale, type Locale } from '../../src/shared/locale';

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

interface LocaleTestControlProps {
  readonly locale: Locale;
}

function LocaleTestControl({ locale }: LocaleTestControlProps) {
  const { setLocale } = useLocale();
  return (
    <button
      type="button"
      aria-label={`Set test locale to ${locale}`}
      onClick={() => setLocale(locale)}
    >
      Set test locale to {locale}
    </button>
  );
}

async function setTestLocale(locale: Locale) {
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: `Set test locale to ${locale}` }));
}

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  if (!options.decode) throw new Error('Expected a decoder');
  return options.decode(value);
}

async function renderPage(
  client: ApiClient,
  initialEntry = '/instructor/courses/7/edit',
  locale: Locale = 'en',
) {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <LocaleProvider initialLocale={locale}>
          <LocaleTestControl locale="en" />
          <LocaleTestControl locale="ru" />
          <LocaleTestControl locale="uz" />
          <SessionProvider client={client} tokenStore={tokenStore}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <Routes>
                <Route
                  path="/instructor/courses/:courseId/edit"
                  element={<InstructorCourseEditorPage />}
                />
              </Routes>
            </MemoryRouter>
          </SessionProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
  });
}

async function getResolvedEditorAction(action: string): Promise<HTMLElement> {
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  return screen.getByRole('button', { name: action });
}

function expectContextualReturnBeforeEditorHeading() {
  const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
  const returnLink = within(breadcrumb).getByRole('link', { name: 'Instructor courses' });
  const heading = screen.getByRole('heading', { level: 1, name: 'Edit course' });

  expect(returnLink.getAttribute('href')).toBe('/instructor/courses');
  expect(
    within(breadcrumb).getByText('Edit course', { selector: '[aria-current="page"]' }),
  ).toBeTruthy();
  expect(
    returnLink.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

describe('InstructorCourseEditorPage', () => {
  it.each([
    ['en', 'Save course'],
    ['ru', 'Сохранить курс'],
    ['uz', 'Kursni saqlash'],
  ] as const)(
    'renders the immutable save-course control label in %s',
    async (locale, saveLabel) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET')
          return decode(options, course);
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };

      await renderPage({ request }, '/instructor/courses/7/edit', locale);
      expect(await getResolvedEditorAction(saveLabel)).toBeTruthy();
    },
  );

  it.each([
    ['en', 'Breadcrumb', 'This course address is not valid.'],
    ['ru', 'Хлебные крошки', 'Адрес курса указан неверно.'],
    ['uz', 'Yo‘l ko‘rsatkich', 'Kurs manzili noto‘g‘ri.'],
  ] as const)(
    'localizes the invalid course address and breadcrumb accessible name in %s',
    async (locale, breadcrumbName, invalidAddress) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };

      await renderPage({ request }, '/instructor/courses/not-a-course/edit', locale);
      expect(await screen.findByText(invalidAddress)).toBeTruthy();
      expect(screen.getByRole('navigation', { name: breadcrumbName })).toBeTruthy();
    },
  );

  it.each([
    [
      'ru',
      'Удалить курс',
      'Удалить этот курс?',
      'Удалить курс «Verified course»? Это действие необратимо.',
      'Удалить урок',
      'Удалить этот урок?',
      'Удалить урок «Existing lesson»? Это действие необратимо.',
    ],
    [
      'uz',
      'Kursni o‘chirish',
      'Bu kurs o‘chirilsinmi?',
      'Verified course kursi o‘chirilsinmi? Bu amalni ortga qaytarib bo‘lmaydi.',
      'Darsni o‘chirish',
      'Bu dars o‘chirilsinmi?',
      'Existing lesson darsi o‘chirilsinmi? Bu amalni ortga qaytarib bo‘lmaydi.',
    ],
  ] as const)(
    'renders localized destructive dialog copy in %s',
    async (
      locale,
      courseAction,
      courseDialogName,
      courseDescription,
      lessonAction,
      lessonDialogName,
      lessonDescription,
    ) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET')
          return decode(options, course);
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request }, '/instructor/courses/7/edit', locale);
      const user = userEvent.setup();
      const deleteCourse = await getResolvedEditorAction(courseAction);

      await act(async () => {
        await user.click(deleteCourse);
      });
      expect((await screen.findByRole('dialog', { name: courseDialogName })).textContent).toContain(
        courseDescription,
      );
      await act(async () => {
        await user.keyboard('{Escape}');
      });

      await act(async () => {
        await user.click(await getResolvedEditorAction(lessonAction));
      });
      expect((await screen.findByRole('dialog', { name: lessonDialogName })).textContent).toContain(
        lessonDescription,
      );
    },
  );

  it.each([
    ['ru', 'Удалить урок', 'Удалить этот урок?', 'Курс или урок больше недоступен.'],
    ['uz', 'Darsni o‘chirish', 'Bu dars o‘chirilsinmi?', 'Kurs yoki dars endi mavjud emas.'],
  ] as const)(
    'renders a localized delete failure in %s',
    async (locale, action, dialogName, failureMessage) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET')
          return decode(options, course);
        if (options.method === 'DELETE')
          throw new ApiError({ kind: 'not_found', status: 404, message: 'PRIVATE_DELETE_DETAIL' });
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request }, '/instructor/courses/7/edit', locale);
      const user = userEvent.setup();
      const deleteAction = await getResolvedEditorAction(action);
      await act(async () => {
        await user.click(deleteAction);
      });
      const dialog = await screen.findByRole('dialog', { name: dialogName });
      await act(async () => {
        await user.click(within(dialog).getByRole('button', { name: action }));
      });
      expect(await screen.findByText(failureMessage)).toBeTruthy();
      expect(screen.queryByText('PRIVATE_DELETE_DETAIL')).toBeNull();
    },
  );

  it.each([
    ['ru', 401, 'Удалить урок', 'Удалить этот урок?', 'Войдите снова, чтобы продолжить.'],
    ['ru', 403, 'Удалить урок', 'Удалить этот урок?', 'У вас нет разрешения изменять этот курс.'],
    ['uz', 401, 'Darsni o‘chirish', 'Bu dars o‘chirilsinmi?', 'Davom etish uchun qayta kiring.'],
    [
      'uz',
      403,
      'Darsni o‘chirish',
      'Bu dars o‘chirilsinmi?',
      'Bu kursni o‘zgartirish huquqingiz yo‘q.',
    ],
  ] as const)(
    'renders the localized delete authorization failure in %s (%i)',
    async (locale, status, action, dialogName, failureMessage) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET')
          return decode(options, course);
        if (options.method === 'DELETE')
          throw new ApiError({ kind: 'http', status, message: 'PRIVATE_AUTHORIZATION_DETAIL' });
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request }, '/instructor/courses/7/edit', locale);
      const user = userEvent.setup();
      const deleteAction = await getResolvedEditorAction(action);
      await act(async () => {
        await user.click(deleteAction);
      });
      const dialog = await screen.findByRole('dialog', { name: dialogName });
      await act(async () => {
        await user.click(within(dialog).getByRole('button', { name: action }));
      });
      expect(await screen.findByText(failureMessage)).toBeTruthy();
      expect(screen.queryByText('PRIVATE_AUTHORIZATION_DETAIL')).toBeNull();
    },
  );

  it('renders the contextual return before the editor heading in invalid, loading, error, and resolved states', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };

    await renderPage({ request }, '/instructor/courses/not-an-id/edit');
    expectContextualReturnBeforeEditorHeading();

    cleanup();
    await renderPage({
      request: async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET') return new Promise(() => {});
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      },
    });
    expect(await screen.findByLabelText('Loading course editor')).toBeTruthy();
    expectContextualReturnBeforeEditorHeading();

    cleanup();
    await renderPage({
      request: async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET') {
          throw new ApiError({ kind: 'not_found', status: 404, message: 'PRIVATE_LOAD_DETAIL' });
        }
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      },
    });
    expect(await screen.findByText('This course is no longer available.')).toBeTruthy();
    expectContextualReturnBeforeEditorHeading();

    cleanup();
    await renderPage({ request });
    expect(await screen.findByRole('heading', { name: 'Edit course' })).toBeTruthy();
    expectContextualReturnBeforeEditorHeading();
  });

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
    const returnLink = within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole(
      'link',
      {
        name: 'Instructor courses',
      },
    );
    expect(returnLink.getAttribute('href')).toBe('/instructor/courses');
    returnLink.focus();
    expect(document.activeElement).toBe(returnLink);

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

  it('resolves a persistent 422 field descriptor in EN, RU and UZ without clearing the input', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7' && options.method === 'PATCH') {
        throw new ApiError({
          kind: 'validation',
          status: 422,
          message: 'PRIVATE_LOCALE_SWITCH_DETAIL',
          issues: [
            {
              location: ['body', 'title'],
              message: 'PRIVATE_LOCALE_SWITCH_DETAIL',
              type: 'missing',
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      await user.clear(title);
      await user.type(title, 'Persistent title');
      await user.click(screen.getByRole('button', { name: 'Save course' }));
    });
    expect(await screen.findByText('Course title is required.')).toBeTruthy();
    expect(title.getAttribute('aria-describedby')).toContain('error');
    expect((title as HTMLInputElement).value).toBe('Persistent title');
    await act(async () => {
      await setTestLocale('ru');
    });
    expect(await screen.findByText('Название курса обязательно.')).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: 'Название курса' }) as HTMLInputElement).value,
    ).toBe('Persistent title');
    await act(async () => {
      await setTestLocale('uz');
    });
    expect(await screen.findByText('Kurs nomi kiritilishi shart.')).toBeTruthy();
    expect(screen.queryByText('PRIVATE_LOCALE_SWITCH_DETAIL')).toBeNull();
  });

  it('settles an in-flight course mutation through the current locale without duplicate writes', async () => {
    let rejectUpdate: (reason: unknown) => void = () => {};
    const updateResponse = new Promise<never>((_resolve, reject) => {
      rejectUpdate = reject;
    });
    const updateRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7' && options.method === 'PATCH') {
        updateRequests.push(options);
        return decode(options, await updateResponse);
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await act(async () => {
      await user.clear(title);
      await user.type(title, 'Deferred course title');
      await user.click(screen.getByRole('button', { name: 'Save course' }));
    });
    await waitFor(() => expect(updateRequests).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Saving course' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(updateRequests).toHaveLength(1);
    expect((title as HTMLInputElement).disabled).toBe(true);

    await act(async () => {
      await setTestLocale('ru');
      rejectUpdate(
        new ApiError({
          kind: 'validation',
          status: 422,
          message: 'PRIVATE_DEFERRED_COURSE_DETAIL',
          issues: [
            {
              location: ['body', 'title'],
              message: 'PRIVATE_DEFERRED_COURSE_DETAIL',
              type: 'value_error',
            },
          ],
        }),
      );
    });

    const russianTitle = await screen.findByRole('textbox', { name: 'Название курса' });
    expect(
      await screen.findByText('Проверьте поле название курса и отправьте форму снова.'),
    ).toBeTruthy();
    expect(russianTitle.getAttribute('aria-describedby')).toContain('error');
    expect((russianTitle as HTMLInputElement).value).toBe('Deferred course title');
    await waitFor(() => expect(document.activeElement).toBe(russianTitle));
    expect(screen.queryByText('PRIVATE_DEFERRED_COURSE_DETAIL')).toBeNull();

    await act(async () => {
      await setTestLocale('uz');
    });
    expect(await screen.findByText('kurs nomi maydonini tekshirib, qayta yuboring.')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Kurs nomi' }) as HTMLInputElement).value).toBe(
      'Deferred course title',
    );
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

  it.each([
    'Ordinary course title',
    'Dollar $& title',
    'Dollar $` title',
    "Dollar $' title",
    'Braces {courseTitle}',
    'Unicode курс — dars',
  ])('keeps the literal destructive course title %s and returns focus on cancel', async (title) => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/courses/7' && options.method === 'GET')
        return decode(options, { ...course, title });
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const deleteCourse = await screen.findByRole('button', { name: 'Delete course' });
    await act(async () => {
      await user.click(deleteCourse);
    });
    const dialog = await screen.findByRole('dialog', { name: 'Delete this course?' });
    expect(dialog.textContent).toContain(title);
    const descriptionId = dialog.getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(title);
    await act(async () => {
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    });
    await waitFor(() => expect(document.activeElement).toBe(deleteCourse));
  });

  it.each([
    'Dollar $& lesson',
    'Dollar $` lesson',
    "Dollar $' lesson",
    'Braces {lessonTitle}',
    'Unicode урок — dars',
    'Ordinary lesson title',
  ])(
    'preserves the literal hostile lesson title %s through cancel and one exact pending delete',
    async (title) => {
      let resolveDelete: (value: unknown) => void = () => {};
      const deleteResponse = new Promise<unknown>((resolve) => {
        resolveDelete = resolve;
      });
      const deleteRequests: ApiRequestOptions[] = [];
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET') {
          return decode(options, {
            ...course,
            lessons: [{ ...course.lessons[0], title }],
          });
        }
        if (options.path === '/courses/7/lessons/8' && options.method === 'DELETE') {
          deleteRequests.push(options);
          return decode(options, await deleteResponse);
        }
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request });
      const user = userEvent.setup();
      const deleteLesson = await screen.findByRole('button', { name: 'Delete lesson' });
      await act(async () => {
        await user.click(deleteLesson);
      });
      const dialog = await screen.findByRole('dialog', { name: 'Delete this lesson?' });
      expect(dialog.textContent).toContain(title);
      const descriptionId = dialog.getAttribute('aria-describedby');
      expect(document.getElementById(descriptionId ?? '')?.textContent).toContain(title);
      await act(async () => {
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      });
      await waitFor(() => expect(document.activeElement).toBe(deleteLesson));

      await act(async () => {
        await user.click(deleteLesson);
      });
      const pendingDialog = await screen.findByRole('dialog', { name: 'Delete this lesson?' });
      const confirmation = within(pendingDialog).getByRole('button', { name: 'Delete lesson' });
      await act(async () => {
        await user.click(confirmation);
      });
      await waitFor(() => expect(deleteRequests).toHaveLength(1));
      expect(
        screen.getByRole('button', { name: 'Deleting lesson...' }).hasAttribute('disabled'),
      ).toBe(true);
      expect(deleteRequests).toHaveLength(1);
      expect(deleteRequests[0]?.path).toBe('/courses/7/lessons/8');
      expect(screen.getByRole('status').textContent).toContain('Deleting lesson...');

      await act(async () => {
        resolveDelete({ message: 'Lesson deleted.' });
        await deleteResponse;
      });
    },
  );

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

  it.each([
    {
      openDelete: 'Delete course',
      dialogName: 'Delete this course?',
      expectedPendingLabel: 'Deleting course...',
    },
    {
      openDelete: 'Delete lesson',
      dialogName: 'Delete this lesson?',
      expectedPendingLabel: 'Deleting lesson...',
    },
  ])(
    'uses $expectedPendingLabel while the confirmed delete remains pending',
    async ({ openDelete, dialogName, expectedPendingLabel }) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/courses/7' && options.method === 'GET')
          return decode(options, course);
        if (options.method === 'DELETE') return new Promise(() => {});
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request });
      const user = userEvent.setup();

      const deleteAction = await screen.findByRole('button', { name: openDelete });
      await act(async () => {
        await user.click(deleteAction);
      });
      const dialog = screen.getByRole('dialog', { name: dialogName });
      const confirmation = within(dialog).getByRole('button', { name: openDelete });
      await act(async () => {
        await user.click(confirmation);
      });

      await waitFor(() => {
        const confirmation = screen.getByRole('button', { name: expectedPendingLabel });
        expect((confirmation as HTMLButtonElement).disabled).toBe(true);
        expect(confirmation.getAttribute('aria-busy')).toBe('true');
        expect(screen.getByRole('status').textContent).toContain(expectedPendingLabel);
      });
    },
  );

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
