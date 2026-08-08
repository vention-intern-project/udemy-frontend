import { describe, expect, it, vi } from 'vitest';

import {
  createInstructorLesson,
  deleteInstructorLesson,
  mapInstructorEditorFormFailure,
  requestInstructorEditorCourse,
  updateInstructorCourse,
  uploadInstructorLessonFile,
} from '../../../src/features/instructor-course-editor';
import type { SessionContextValue } from '../../../src/features/auth-session';
import { ApiError, type ApiRequestOptions } from '../../../src/shared/api';

const course = {
  id: 7,
  title: 'Verified course',
  description: 'Course description',
  price: '10.00',
  currency: 'USD',
  published_at: null,
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
  instructor: { id: 3, name: 'Ada', surname: 'Lovelace' },
  lessons: [
    {
      id: 8,
      title: 'Introduction',
      lesson_type: 'video',
      download_url: '/media/lessons/video.mp4',
      description: null,
      is_published: false,
      created_at: '2026-08-08T00:00:00Z',
      updated_at: '2026-08-08T00:00:00Z',
    },
  ],
};
const lesson = {
  id: 8,
  course_id: 7,
  title: 'Introduction',
  lesson_type: 'video',
  download_url: '/media/lessons/video.mp4',
  description: null,
  is_published: false,
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
};

function sessionWith(requestRequired: SessionContextValue['requestRequired']): SessionContextValue {
  return {
    state: {
      status: 'authenticated',
      user: {
        email: 'instructor@example.test',
        name: 'Ada',
        surname: 'Lovelace',
        role: 'instructor',
        birthday: null,
        phoneNumber: null,
        createdAt: '2026-08-08T00:00:00Z',
      },
    },
    cacheEpoch: 'editor-test' as SessionContextValue['cacheEpoch'],
    retryBootstrap: () => undefined,
    acceptAccessToken: () => undefined,
    clearSession: () => undefined,
    requestPublic: requestRequired,
    requestRequired,
    requestOptional: requestRequired,
  };
}

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  if (!options.decode) throw new Error('Expected decoder');
  return options.decode(value);
}

function asSessionRequest(
  request: (options: ApiRequestOptions) => Promise<unknown>,
): SessionContextValue['requestRequired'] {
  return async <TResponse, TBody = unknown>(
    options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
  ): Promise<TResponse> => (await request(options)) as TResponse;
}

describe('instructor course editor API', () => {
  it('does not map a hostile inherited 422 field location', () => {
    const failure = mapInstructorEditorFormFailure(
      new ApiError({
        kind: 'validation',
        status: 422,
        message: 'PRIVATE_CONSTRUCTOR_DETAIL',
        issues: [
          {
            location: ['body', 'constructor'],
            message: 'PRIVATE_CONSTRUCTOR_DETAIL',
            type: 'missing',
          },
        ],
      }),
      {
        action: 'save this course',
        unauthorized: 'Sign in again before continuing.',
        forbidden: 'You do not have permission to change this course.',
        notFound: 'This course is no longer available.',
      },
      { title: { field: 'title', label: 'Course title' } },
    );

    expect(failure).toEqual({
      fields: {},
      summary: 'We could not process this form. Check your details and try again.',
    });
  });

  it('uses the registered course CRUD and lesson-create contracts with only verified fields', async () => {
    const request = vi.fn(async (options: ApiRequestOptions) => {
      if (options.path === '/courses/7' && options.method === 'GET') return decode(options, course);
      if (options.path === '/courses/7' && options.method === 'PATCH')
        return decode(options, { ...course, instructor_id: 3 });
      if (options.path === '/courses/7/lessons') return decode(options, lesson);
      return decode(options, { message: 'Lesson deleted successfully' });
    });
    const session = sessionWith(asSessionRequest(request));
    await expect(
      requestInstructorEditorCourse(session, 7, new AbortController().signal),
    ).resolves.toMatchObject({ id: 7, lessons: [{ id: 8, courseId: 7 }] });
    await updateInstructorCourse(session, 7, {
      title: 'Updated course',
      description: 'Updated description',
      price: '20.00',
      currency: 'EUR',
    });
    await createInstructorLesson(session, 7, {
      title: 'New lesson',
      lessonType: 'pdf',
      description: 'Notes',
      isPublished: true,
    });
    await deleteInstructorLesson(session, 7, 8);
    expect(
      request.mock.calls.map(([options]) => [options.method, options.path, options.body]),
    ).toEqual([
      ['GET', '/courses/7', undefined],
      [
        'PATCH',
        '/courses/7',
        {
          title: 'Updated course',
          description: 'Updated description',
          price: '20.00',
          currency: 'EUR',
        },
      ],
      [
        'POST',
        '/courses/7/lessons',
        { title: 'New lesson', lesson_type: 'pdf', description: 'Notes', is_published: true },
      ],
      ['DELETE', '/courses/7/lessons/8', undefined],
    ]);
  });

  it('sends API-032 as authenticated multipart file data and never maps terminal media state', async () => {
    const request = vi.fn(async (options: ApiRequestOptions) => decode(options, lesson));
    const session = sessionWith(asSessionRequest(request));
    const file = new File(['lesson'], 'lesson.mp4', { type: 'video/mp4' });
    await expect(uploadInstructorLessonFile(session, 8, file)).resolves.toEqual({
      id: 8,
      courseId: 7,
      title: 'Introduction',
      lessonType: 'video',
      description: null,
      isPublished: false,
    });
    const options = request.mock.calls[0]?.[0] as ApiRequestOptions<FormData>;
    expect(options.method).toBe('POST');
    expect(options.path).toBe('/lessons/8/upload-file');
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('file')).toBe(file);
    expect(options.query).toBeUndefined();
  });

  it('rejects malformed success payloads rather than projecting an unverified editor state', async () => {
    const request = vi.fn(async (options: ApiRequestOptions) =>
      decode(options, { ...course, lessons: [{ ...course.lessons[0], lesson_type: 'audio' }] }),
    );
    await expect(
      requestInstructorEditorCourse(
        sessionWith(asSessionRequest(request)),
        7,
        new AbortController().signal,
      ),
    ).rejects.toThrow('Invalid lesson type');
  });
});
