// @vitest-environment jsdom
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { InstructorLessonEditorPage } from '../../src/pages/instructor-lesson-editor-page';
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
const lesson = {
  id: 8,
  course_id: 7,
  title: 'Verified video',
  lesson_type: 'video',
  download_url: '/unrendered.mp4',
  description: null,
  is_published: false,
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
};
const uploadAcknowledgement = {
  lesson_id: 8,
  upload_id: '0123456789abcdef0123456789abcdef',
  status: 'queued',
  detail: 'File accepted for processing.',
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
  queryClient: QueryClient = createAppQueryClient(),
  locale: Locale = 'en',
  initialEntry = '/instructor/lessons/8/edit',
) {
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider initialLocale={locale}>
          <LocaleTestControl locale="en" />
          <LocaleTestControl locale="ru" />
          <LocaleTestControl locale="uz" />
          <SessionProvider client={client} tokenStore={tokenStore}>
            <MemoryRouter initialEntries={[initialEntry]}>
              <Routes>
                <Route
                  path="/instructor/lessons/:lessonId/edit"
                  element={<InstructorLessonEditorPage />}
                />
              </Routes>
            </MemoryRouter>
          </SessionProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
  });
  return queryClient;
}

describe('InstructorLessonEditorPage', () => {
  it.each([
    [
      'en',
      'Edit lesson',
      'Lesson details',
      'Upload lesson file',
      'Instructor workspace',
      'Back to course',
      'Save lesson',
      'Upload file',
    ],
    [
      'ru',
      'Редактировать урок',
      'Сведения об уроке',
      'Загрузить файл урока',
      'Рабочая область преподавателя',
      'Вернуться к курсу',
      'Сохранить урок',
      'Загрузить файл',
    ],
    [
      'uz',
      'Darsni tahrirlash',
      'Dars tafsilotlari',
      'Dars faylini yuklash',
      'O‘qituvchi ish maydoni',
      'Kursga qaytish',
      'Darsni saqlash',
      'Faylni yuklash',
    ],
  ] as const)(
    'renders allocated lesson editor UI in %s',
    async (locale, title, details, upload, workspace, backToCourse, saveLesson, uploadFile) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/lessons/8' && options.method === 'GET')
          return decode(options, lesson);
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request }, createAppQueryClient(), locale);
      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy();
      expect(screen.getByRole('heading', { name: details })).toBeTruthy();
      expect(screen.getByRole('heading', { name: upload })).toBeTruthy();
      expect(screen.getByText(workspace)).toBeTruthy();
      expect(screen.getByRole('link', { name: backToCourse })).toBeTruthy();
      expect(screen.getByRole('button', { name: saveLesson })).toBeTruthy();
      expect(screen.getByRole('button', { name: uploadFile })).toBeTruthy();
    },
  );

  it.each([
    ['en', 'This lesson address is not valid.'],
    ['ru', 'Адрес урока указан неверно.'],
    ['uz', 'Dars manzili noto‘g‘ri.'],
  ] as const)('localizes the invalid lesson address in %s', async (locale, invalidAddress) => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage(
      { request },
      createAppQueryClient(),
      locale,
      '/instructor/lessons/not-a-lesson/edit',
    );
    expect(await screen.findByText(invalidAddress)).toBeTruthy();
  });

  it('starts status observation from the accepted acknowledgement without rendering unsupported media controls', async () => {
    const uploadRequests: ApiRequestOptions[] = [];
    const queryClient = createAppQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8' && options.method === 'GET') return decode(options, lesson);
      if (options.path === '/lessons/8/upload-file') {
        uploadRequests.push(options);
        return decode(options, uploadAcknowledgement);
      }
      if (options.path === '/lessons/uploads/0123456789abcdef0123456789abcdef/status') {
        return decode(options, {
          upload_id: '0123456789abcdef0123456789abcdef',
          lesson_id: 8,
          status: 'processing',
          failure_reason: null,
          updated_at: '2026-08-28T12:00:00Z',
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request }, queryClient);
    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: 'Upload lesson file' })).toBeTruthy();
    const file = new File(['video'], 'lesson.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Lesson file'), { target: { files: [file] } });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Upload file' }));
    });
    await waitFor(() => expect(uploadRequests).toHaveLength(1));
    expect(uploadRequests[0]?.body).toBeInstanceOf(FormData);
    expect((uploadRequests[0]?.body as FormData).get('file')).toBe(file);
    expect(await screen.findByText('Processing')).toBeTruthy();
    expect(screen.queryByText('File accepted and queued')).toBeNull();
    expect(screen.queryByText('Processing status is unavailable.')).toBeNull();
    expect(screen.queryByText(/download/i)).toBeNull();
    expect(screen.queryByText(/ready|complete|progress/i)).toBeNull();
    expect(screen.queryByLabelText('Lesson file')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Upload file' })).toBeNull();
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['instructor-course-editor', expect.any(String), 'lesson', 8],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['instructor-course-editor', expect.any(String), 'course', 7],
    });
  });

  it('renders ready as source-file-only and never exposes a raw failure reason', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8' && options.method === 'GET') return decode(options, lesson);
      if (options.path === '/lessons/8/upload-file') return decode(options, uploadAcknowledgement);
      if (options.path === '/lessons/uploads/0123456789abcdef0123456789abcdef/status') {
        return decode(options, {
          upload_id: '0123456789abcdef0123456789abcdef',
          lesson_id: 8,
          status: 'ready',
          failure_reason: 'PRIVATE_SOURCE_FAILURE_REASON',
          updated_at: '2026-08-28T12:00:00Z',
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const file = new File(['video'], 'lesson.mp4', { type: 'video/mp4' });
    fireEvent.change(await screen.findByLabelText('Lesson file'), { target: { files: [file] } });
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Upload file' }));
    });

    expect(await screen.findByText('Uploaded source file ready')).toBeTruthy();
    expect(screen.getByText('Subtitle and generated media status is unavailable.')).toBeTruthy();
    expect(screen.queryByText('PRIVATE_SOURCE_FAILURE_REASON')).toBeNull();
    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retry|cancel|play/i })).toBeNull();
  });

  it.each([
    ['ru', 'Загрузить файл', 'В очереди'],
    ['uz', 'Faylni yuklash', 'Navbatda'],
  ] as const)(
    'localizes the queued upload observation in %s',
    async (locale, uploadFile, queued) => {
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/lessons/8' && options.method === 'GET')
          return decode(options, lesson);
        if (options.path === '/lessons/8/upload-file') {
          return decode(options, uploadAcknowledgement);
        }
        if (options.path === '/lessons/uploads/0123456789abcdef0123456789abcdef/status') {
          return decode(options, {
            upload_id: '0123456789abcdef0123456789abcdef',
            lesson_id: 8,
            status: 'queued',
            failure_reason: null,
            updated_at: '2026-08-28T12:00:00Z',
          });
        }
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request }, createAppQueryClient(), locale);
      await screen.findByRole('heading', { level: 1 });
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      expect(fileInput).not.toBeNull();
      if (!fileInput) return;
      fireEvent.change(fileInput, {
        target: { files: [new File(['video'], 'lesson.mp4', { type: 'video/mp4' })] },
      });
      await act(async () => {
        await userEvent.setup().click(screen.getByRole('button', { name: uploadFile }));
      });
      expect(await screen.findByText(queued)).toBeTruthy();
    },
  );

  it('rejects a locally invalid upload without calling API-032', async () => {
    const request = vi.fn(async (options: ApiRequestOptions) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8') return decode(options, lesson);
      throw new Error('Upload should not run');
    });
    await renderPage({ request } as ApiClient);
    await screen.findByRole('heading', { name: 'Upload lesson file' });
    const oversizedPdf = new File([new Uint8Array(50 * 1024 * 1024 + 1)], 'notes.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(screen.getByLabelText('Lesson file'), { target: { files: [oversizedPdf] } });
    expect(
      await screen.findByText('Choose a file that matches the stated type and size limit.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload file' }).hasAttribute('disabled')).toBe(true);
    expect(
      request.mock.calls.map(([options]) => (options as ApiRequestOptions).path),
    ).not.toContain('/lessons/8/upload-file');
  });

  it.each([
    {
      persistedType: 'video',
      unsavedType: 'pdf',
      rejectedFile: 'notes.pdf',
      accepted: '.mp4,.webm,.mov',
    },
    { persistedType: 'pdf', unsavedType: 'video', rejectedFile: 'lesson.mp4', accepted: '.pdf' },
  ] as const)(
    'keeps %s upload validation while an unsaved type change is %s',
    async ({ persistedType, unsavedType, rejectedFile, accepted }) => {
      let lessonType = persistedType;
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/lessons/8' && options.method === 'GET') {
          return decode(options, { ...lesson, lesson_type: lessonType });
        }
        if (options.path === '/lessons/8' && options.method === 'PATCH') {
          lessonType = unsavedType;
          return decode(options, { ...lesson, lesson_type: lessonType });
        }
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request });
      const user = userEvent.setup();
      const fileInput = await screen.findByLabelText('Lesson file');
      await act(async () => {
        await user.selectOptions(
          screen.getByRole('combobox', { name: 'Lesson type' }),
          unsavedType,
        );
      });
      expect(fileInput.getAttribute('accept')).toBe(accepted);
      fireEvent.change(fileInput, {
        target: { files: [new File(['file'], rejectedFile)] },
      });
      expect(
        await screen.findByText('Choose a file that matches the stated type and size limit.'),
      ).toBeTruthy();

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Save lesson' }));
      });
      await waitFor(() =>
        expect(screen.getByLabelText('Lesson file').getAttribute('accept')).toBe(
          unsavedType === 'video' ? '.mp4,.webm,.mov' : '.pdf',
        ),
      );
    },
  );

  it.each([
    { persistedType: 'video', updatedType: 'pdf', fileName: 'lesson.mp4' },
    { persistedType: 'pdf', updatedType: 'video', fileName: 'notes.pdf' },
  ] as const)(
    'clears a selected %s file after saving an incompatible %s lesson type',
    async ({ persistedType, updatedType, fileName }) => {
      const uploadRequests: ApiRequestOptions[] = [];
      const request: ApiClient['request'] = async (options) => {
        if (options.path === '/me') return decode(options, instructor);
        if (options.path === '/lessons/8' && options.method === 'GET') {
          return decode(options, { ...lesson, lesson_type: persistedType });
        }
        if (options.path === '/lessons/8' && options.method === 'PATCH') {
          return decode(options, { ...lesson, lesson_type: updatedType });
        }
        if (options.path === '/lessons/8/upload-file') {
          uploadRequests.push(options);
          return decode(options, { ...lesson, lesson_type: updatedType });
        }
        throw new Error(`Unexpected request: ${options.method} ${options.path}`);
      };
      await renderPage({ request });
      const user = userEvent.setup();
      const fileInput = await screen.findByLabelText('Lesson file');
      fireEvent.change(fileInput, { target: { files: [new File(['file'], fileName)] } });
      expect(screen.getByRole('button', { name: 'Upload file' }).hasAttribute('disabled')).toBe(
        false,
      );

      await act(async () => {
        await user.selectOptions(
          screen.getByRole('combobox', { name: 'Lesson type' }),
          updatedType,
        );
        await user.click(screen.getByRole('button', { name: 'Save lesson' }));
      });

      expect(
        await screen.findByText(
          'The lesson type changed. Choose a file that matches the updated lesson type.',
        ),
      ).toBeTruthy();
      const updatedFileInput = screen.getByLabelText('Lesson file');
      expect(updatedFileInput.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('button', { name: 'Upload file' }).hasAttribute('disabled')).toBe(
        true,
      );
      expect(uploadRequests).toHaveLength(0);
    },
  );

  it('maps a verified lesson 422 issue to its select and keeps private detail out of the UI', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8' && options.method === 'GET') return decode(options, lesson);
      if (options.path === '/lessons/8' && options.method === 'PATCH') {
        throw new ApiError({
          kind: 'validation',
          status: 422,
          message: 'PRIVATE_LESSON_TYPE_DETAIL',
          issues: [
            {
              location: ['body', 'lesson_type'],
              message: 'PRIVATE_LESSON_TYPE_DETAIL',
              type: 'enum',
            },
          ],
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const lessonType = await screen.findByRole('combobox', { name: 'Lesson type' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save lesson' }));
    });

    expect(await screen.findByText('Check lesson type and submit again.')).toBeTruthy();
    expect(lessonType.getAttribute('aria-invalid')).toBe('true');
    expect(lessonType.getAttribute('aria-describedby')).toContain('error');
    await waitFor(() => expect(document.activeElement).toBe(lessonType));
    expect(screen.queryByText('PRIVATE_LESSON_TYPE_DETAIL')).toBeNull();
  });

  it('maps a verified publication 422 issue to the checkbox and focuses it', async () => {
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8' && options.method === 'GET') return decode(options, lesson);
      if (options.path === '/lessons/8' && options.method === 'PATCH') {
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
      await user.click(checkbox);
      await user.click(screen.getByRole('button', { name: 'Save lesson' }));
    });

    expect(await screen.findByText('Check publish this lesson and submit again.')).toBeTruthy();
    expect(checkbox.getAttribute('name')).toBe('is_published');
    expect(checkbox.getAttribute('aria-invalid')).toBe('true');
    expect(checkbox.getAttribute('aria-describedby')).toBe('edit-lesson-is-published-error');
    await waitFor(() => expect(document.activeElement).toBe(checkbox));
    expect(screen.queryByText('PRIVATE_PUBLISH_DETAIL')).toBeNull();
  });

  it('maps upload file 422 issues and uses a safe generic message for unknown detail', async () => {
    let uploadAttempt = 0;
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8' && options.method === 'GET') return decode(options, lesson);
      if (options.path === '/lessons/8/upload-file') {
        uploadAttempt += 1;
        throw new ApiError({
          kind: 'validation',
          status: 422,
          message: uploadAttempt === 1 ? 'PRIVATE_FILE_DETAIL' : 'PRIVATE_UNKNOWN_DETAIL',
          issues:
            uploadAttempt === 1
              ? [{ location: ['body', 'file'], message: 'PRIVATE_FILE_DETAIL', type: 'missing' }]
              : [
                  {
                    location: ['body', 'unknown'],
                    message: 'PRIVATE_UNKNOWN_DETAIL',
                    type: 'value_error',
                  },
                ],
        });
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const fileInput = await screen.findByLabelText('Lesson file');
    const file = new File(['video'], 'lesson.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Upload file' }));
    });
    expect(await screen.findByText('Lesson file is required.')).toBeTruthy();
    expect(fileInput.getAttribute('aria-invalid')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(fileInput));
    expect(screen.queryByText('PRIVATE_FILE_DETAIL')).toBeNull();

    fireEvent.change(fileInput, { target: { files: [file] } });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Upload file' }));
    });
    expect(
      await screen.findByText('We could not process this form. Check your details and try again.'),
    ).toBeTruthy();
    await waitFor(() =>
      expect((document.activeElement as Element).getAttribute('role')).toBe('alert'),
    );
    expect(screen.queryByText('PRIVATE_UNKNOWN_DETAIL')).toBeNull();
  });

  it('settles an in-flight upload through the current locale while preserving file, focus and retry state', async () => {
    let rejectUpload: (reason: unknown) => void = () => {};
    const uploadResponse = new Promise<never>((_resolve, reject) => {
      rejectUpload = reject;
    });
    const uploadRequests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async (options) => {
      if (options.path === '/me') return decode(options, instructor);
      if (options.path === '/lessons/8' && options.method === 'GET') return decode(options, lesson);
      if (options.path === '/lessons/8/upload-file' && options.method === 'POST') {
        uploadRequests.push(options);
        return decode(options, await uploadResponse);
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    };
    await renderPage({ request });
    const user = userEvent.setup();
    const fileInput = await screen.findByLabelText('Lesson file');
    const file = new File(['video'], 'deferred-lesson.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Upload file' }));
    });
    await waitFor(() => expect(uploadRequests).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Uploading file' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(uploadRequests).toHaveLength(1);
    expect(uploadRequests[0]?.body).toBeInstanceOf(FormData);

    await act(async () => {
      await setTestLocale('ru');
      rejectUpload(
        new ApiError({
          kind: 'validation',
          status: 422,
          message: 'PRIVATE_DEFERRED_UPLOAD_DETAIL',
          issues: [
            {
              location: ['body', 'file'],
              message: 'PRIVATE_DEFERRED_UPLOAD_DETAIL',
              type: 'missing',
            },
          ],
        }),
      );
    });

    const russianFile = await screen.findByLabelText('Файл урока');
    expect(await screen.findByText('Файл урока обязательно.')).toBeTruthy();
    expect(russianFile.getAttribute('aria-invalid')).toBe('true');
    expect(russianFile.getAttribute('aria-describedby')).toContain('error');
    await waitFor(() => expect(document.activeElement).toBe(russianFile));
    expect(screen.getByRole('button', { name: 'Загрузить файл' }).hasAttribute('disabled')).toBe(
      false,
    );
    expect(screen.queryByText('PRIVATE_DEFERRED_UPLOAD_DETAIL')).toBeNull();

    await act(async () => {
      await setTestLocale('uz');
    });
    expect(await screen.findByText('Dars fayli kiritilishi shart.')).toBeTruthy();
    expect(screen.getByLabelText('Dars fayli').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('button', { name: 'Faylni yuklash' })).toBeTruthy();
  });
});
