import { describe, expect, it, vi } from 'vitest';

import {
  decodeCourseEnrollmentList,
  decodeInstructorCourseCollection,
  requestCourseEnrollments,
  requestCreateCourse,
  requestInstructorCourses,
} from '@features/instructor-courses';
import type { ApiRequestOptions } from '@shared/api';
import { createApiClient } from '@shared/api';
import type { SessionContextValue } from '@features/auth-session';

const course = {
  id: 7,
  instructor_id: 3,
  title: 'Course',
  description: null,
  price: '0.00',
  currency: 'USD',
  published_at: null,
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-30T00:00:00Z',
};

function roster(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: 9,
        user_id: 12,
        course_id: 7,
        status: 'active',
        created_at: '2026-07-30T00:00:00Z',
        updated_at: '2026-07-30T01:00:00Z',
        user: { id: 12, name: 'Sam', surname: 'Student', email: 'sam@example.test' },
      },
    ],
    page: 1,
    page_size: 20,
    total: 1,
    pages: 1,
    has_next: false,
    has_previous: false,
    ...overrides,
  };
}

function instructorCourseList(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: 17,
        title: 'Instructor course',
        description: 'Returned by the authenticated instructor collection.',
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
    ...overrides,
  };
}

function decoderFaithfulSession(response: unknown): SessionContextValue {
  return {
    requestRequired: async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (!options.decode) throw new Error('Expected a decoder');
      return options.decode(response);
    },
  } as SessionContextValue;
}

describe('instructor course API', () => {
  it('uses API-035 with the exact instructor collection path, pagination, signal, and decoder-faithful result', async () => {
    const signal = new AbortController().signal;
    const requestRequired = vi.fn(decoderFaithfulSession(instructorCourseList()).requestRequired);

    await expect(
      requestInstructorCourses({ requestRequired } as unknown as SessionContextValue, 1, signal),
    ).resolves.toEqual({
      items: [
        {
          id: 17,
          title: 'Instructor course',
          description: 'Returned by the authenticated instructor collection.',
          lessonCount: 1,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      pages: 1,
      hasNext: false,
      hasPrevious: false,
    });

    expect(requestRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/courses/my',
        query: { page: 1, page_size: 20 },
        signal,
        decode: expect.any(Function),
      }),
    );
  });

  it.each([
    ['malformed pagination', instructorCourseList({ pages: 0 })],
    ['a short page that contradicts its total', instructorCourseList({ total: 2 })],
    [
      'duplicate course identities',
      instructorCourseList({
        total: 2,
        items: [
          instructorCourseList().items[0],
          { ...(instructorCourseList().items[0] as Record<string, unknown>) },
        ],
      }),
    ],
    ['an unexpected response page', instructorCourseList()],
  ])('rejects instructor collection responses with %s', (_scenario, response) => {
    const expectedPage = _scenario === 'an unexpected response page' ? 2 : undefined;
    expect(() => decodeInstructorCourseCollection(response, expectedPage)).toThrow(TypeError);
  });

  it('decodes a complete verified roster row and binds it to the requested course', () => {
    expect(decodeCourseEnrollmentList(roster(), 7)).toEqual({
      items: [
        {
          id: 9,
          userId: 12,
          courseId: 7,
          status: 'active',
          createdAt: '2026-07-30T00:00:00Z',
          updatedAt: '2026-07-30T01:00:00Z',
          student: { id: 12, name: 'Sam', surname: 'Student', email: 'sam@example.test' },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      pages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it.each([
    [
      'a cross-course row',
      roster({ items: [{ ...(roster().items[0] as Record<string, unknown>), course_id: 8 }] }),
    ],
    [
      'a mismatched outer and nested learner identity',
      roster({ items: [{ ...(roster().items[0] as Record<string, unknown>), user_id: 13 }] }),
    ],
    [
      'a duplicate enrollment id',
      roster({
        total: 2,
        items: [
          roster().items[0],
          {
            ...(roster().items[0] as Record<string, unknown>),
            user_id: 13,
            user: { id: 13, name: 'Ada', surname: 'Lovelace', email: 'ada@example.test' },
          },
        ],
      }),
    ],
    [
      'a duplicate learner identity',
      roster({
        total: 2,
        items: [roster().items[0], { ...(roster().items[0] as Record<string, unknown>), id: 10 }],
      }),
    ],
    [
      'an overfull page',
      roster({
        total: 1,
        items: [
          roster().items[0],
          {
            ...(roster().items[0] as Record<string, unknown>),
            id: 10,
            user_id: 13,
            user: { id: 13, name: 'Ada', surname: 'Lovelace', email: 'ada@example.test' },
          },
        ],
      }),
    ],
    ['inconsistent pagination', roster({ total: 1, pages: 0 })],
  ])('rejects %s', (_scenario, response) => {
    expect(() => decodeCourseEnrollmentList(response, 7)).toThrow(TypeError);
  });

  it('uses the verified title-only create contract and exact-body attempt identity', async () => {
    const requestRequired = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (!options.decode) throw new Error('Expected a decoder');
        return options.decode(course);
      },
    );
    await requestCreateCourse({ requestRequired } as unknown as SessionContextValue, {
      title: ' Course ',
    });
    expect(requestRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/courses',
        body: { title: ' Course ' },
        dedupeKey: 'course:create: Course ',
      }),
    );
  });

  it('shares an identical create body but transports distinct title bodies separately', async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    let resolveSecond: ((response: Response) => void) | undefined;
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          if (!resolveFirst) resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    const client = createApiClient({ baseUrl: 'https://api.example.test', fetch });
    const session = { requestRequired: client.request } as unknown as SessionContextValue;

    const first = requestCreateCourse(session, { title: 'Course' });
    const sameBody = requestCreateCourse(session, { title: 'Course' });
    expect(fetch).toHaveBeenCalledTimes(1);
    const distinctBody = requestCreateCourse(session, { title: 'Different course' });
    expect(fetch).toHaveBeenCalledTimes(2);

    resolveFirst?.(new Response(JSON.stringify(course)));
    resolveSecond?.(new Response(JSON.stringify({ ...course, id: 8, title: 'Different course' })));
    await expect(first).resolves.toMatchObject({ id: 7 });
    await expect(sameBody).resolves.toMatchObject({ id: 7 });
    await expect(distinctBody).resolves.toMatchObject({ id: 8 });
  });

  it.each([
    [
      'a missing course id',
      Object.fromEntries(Object.entries(course).filter(([key]) => key !== 'id')),
    ],
    ['a null course title', { ...course, title: null }],
    ['a wrong-type price', { ...course, price: 0 }],
    ['an invalid course identity', { ...course, id: 0 }],
    ['an invalid instructor identity', { ...course, instructor_id: 0 }],
  ])('rejects API-009 malformed 2xx with %s', async (_scenario, response) => {
    await expect(
      requestCreateCourse(decoderFaithfulSession(response), { title: 'Course' }),
    ).rejects.toThrow(TypeError);
  });

  it('uses the verified roster path, abort signal, decoder, and pagination', async () => {
    const signal = new AbortController().signal;
    const requestRequired = vi.fn(decoderFaithfulSession(roster()).requestRequired);
    await expect(
      requestCourseEnrollments({ requestRequired } as unknown as SessionContextValue, 7, 1, signal),
    ).resolves.toMatchObject({ total: 1 });
    expect(requestRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/courses/7/enrollments',
        query: { page: 1, page_size: 20 },
        signal,
        decode: expect.any(Function),
      }),
    );
  });

  it('fails closed when the operation requester invokes the decoder for an invalid roster fixture', async () => {
    await expect(
      requestCourseEnrollments(
        decoderFaithfulSession({
          items: [],
          page: 2,
          page_size: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: true,
        }),
        7,
        2,
        new AbortController().signal,
      ),
    ).rejects.toThrow(TypeError);
  });
});
