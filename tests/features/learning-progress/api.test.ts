import { describe, expect, it, vi } from 'vitest';

import {
  decodeCourseProgressDto,
  decodeLessonProgressDto,
  lessonCompletionLabel,
  requestCourseProgress,
  requestLearningEnrollment,
  requestLearningEnrollments,
  requestLessonOutline,
  setLessonCompletion,
} from '../../../src/features/learning-progress';
import type { ApiRequestOptions } from '../../../src/shared/api';
import type { SessionContextValue } from '../../../src/features/auth-session';

interface LessonPageInput {
  readonly page: number;
  readonly lessonIds: readonly number[];
  readonly total: number;
  readonly pages: number;
  readonly pageSize?: number;
}

function lessonDto(id: number) {
  return {
    id,
    title: `Lesson ${id}`,
    lesson_type: 'video',
    download_url: null,
    description: null,
    is_published: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function lessonPage({ page, lessonIds, total, pages, pageSize = 100 }: LessonPageInput) {
  return {
    items: lessonIds.map(lessonDto),
    page,
    page_size: pageSize,
    total,
    pages,
    has_next: page < pages,
    has_previous: page > 1,
  };
}

function sessionRespondingWith(value: unknown): SessionContextValue {
  const requestRequired = vi.fn(
    async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) =>
      options.decode ? options.decode(value) : (value as TResponse),
  );
  return {
    state: { status: 'anonymous' },
    retryBootstrap: vi.fn(),
    acceptAccessToken: vi.fn(),
    clearSession: vi.fn(),
    requestPublic: requestRequired,
    requestOptional: requestRequired,
    requestRequired,
  } as unknown as SessionContextValue;
}

function sessionRespondingWithSequence(values: readonly unknown[]): SessionContextValue {
  let responseIndex = 0;
  const requestRequired = vi.fn(
    async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      const value = values[responseIndex];
      responseIndex += 1;
      return options.decode ? options.decode(value) : (value as TResponse);
    },
  );
  return {
    state: { status: 'anonymous' },
    retryBootstrap: vi.fn(),
    acceptAccessToken: vi.fn(),
    clearSession: vi.fn(),
    requestPublic: requestRequired,
    requestOptional: requestRequired,
    requestRequired,
  } as unknown as SessionContextValue;
}

describe('learning-progress transport and row-state boundary', () => {
  it('strictly decodes API-017/018 lesson progress responses', () => {
    expect(
      decodeLessonProgressDto({
        lesson_id: 7,
        completed: true,
        completed_at: '2026-07-01T00:00:00Z',
      }),
    ).toEqual({ lesson_id: 7, completed: true, completed_at: '2026-07-01T00:00:00Z' });
    expect(() =>
      decodeLessonProgressDto({ lesson_id: 7, completed: 'true', completed_at: null }),
    ).toThrow();
  });

  it('keeps API-019 as an aggregate-only representation', () => {
    expect(
      decodeCourseProgressDto({
        course_id: 3,
        completed_lessons: 1,
        total_lessons: 3,
        progress_percentage: 33.33,
      }),
    ).toEqual({ course_id: 3, completed_lessons: 1, total_lessons: 3, progress_percentage: 33.33 });
    expect(() =>
      decodeCourseProgressDto({
        course_id: 3,
        completed_lessons: 4,
        total_lessons: 3,
        progress_percentage: 100,
      }),
    ).toThrow();
    expect(() =>
      decodeCourseProgressDto({
        course_id: 3,
        completed_lessons: 1,
        total_lessons: 3,
        progress_percentage: 33.34,
      }),
    ).toThrow();
  });

  it('rejects API-022 and API-019 responses that do not match their requested resource identity', async () => {
    const signal = new AbortController().signal;
    await expect(
      requestLearningEnrollment(
        sessionRespondingWith({
          id: 5,
          user_id: 1,
          course_id: 7,
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          course: { id: 7, title: 'Mismatched', description: null, price: '0.00', currency: 'USD' },
        }),
        4,
        signal,
      ),
    ).rejects.toThrow('Invalid learning enrollment identity');
    await expect(
      requestCourseProgress(
        sessionRespondingWith({
          course_id: 8,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        }),
        7,
        signal,
      ),
    ).rejects.toThrow('Invalid course progress identity');
  });

  it('rejects a malformed API-021 success instead of projecting an empty enrollment list', async () => {
    await expect(
      requestLearningEnrollments(
        sessionRespondingWith({
          items: [],
          page: 2,
          page_size: 20,
          total: 3,
          pages: 1,
          has_next: false,
          has_previous: true,
        }),
        1,
        new AbortController().signal,
      ),
    ).rejects.toThrow(/pagination/i);
  });

  it('rejects an API-014 collection that exceeds the ten-page workspace maximum', async () => {
    const session = sessionRespondingWith({
      items: Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        title: `Lesson ${index + 1}`,
        lesson_type: 'video',
        download_url: null,
        description: null,
        is_published: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      })),
      page: 1,
      page_size: 100,
      total: 1100,
      pages: 11,
      has_next: true,
      has_previous: false,
    });

    await expect(requestLessonOutline(session, 7, new AbortController().signal)).rejects.toThrow(
      /lesson outline/i,
    );
    expect(session.requestOptional).toHaveBeenCalledTimes(1);
  });

  it('does not issue API-014 when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const session = sessionRespondingWith(null);

    await expect(requestLessonOutline(session, 7, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(session.requestOptional).not.toHaveBeenCalled();
  });

  it('collects every API-014 page with the exact path, size query, and supplied signal', async () => {
    const firstPageIds = Array.from({ length: 100 }, (_, index) => index + 1);
    const session = sessionRespondingWithSequence([
      lessonPage({ page: 1, lessonIds: firstPageIds, total: 101, pages: 2 }),
      lessonPage({ page: 2, lessonIds: [101], total: 101, pages: 2 }),
    ]);
    const signal = new AbortController().signal;

    const result = await requestLessonOutline(session, 7, signal);

    expect(result).toMatchObject({ total: 101 });
    expect(result.items).toHaveLength(101);
    expect(result.items[0]?.id).toBe(1);
    expect(result.items[result.items.length - 1]?.id).toBe(101);
    expect(session.requestOptional).toHaveBeenCalledTimes(2);
    expect(session.requestOptional).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        path: '/courses/7/lessons',
        query: { page: 1, size: 100 },
        signal,
      }),
    );
    expect(session.requestOptional).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        path: '/courses/7/lessons',
        query: { page: 2, size: 100 },
        signal,
      }),
    );
  });

  it('rejects an API-014 response whose cursor does not match the requested page', async () => {
    const session = sessionRespondingWithSequence([
      lessonPage({ page: 2, lessonIds: [101], total: 101, pages: 2 }),
    ]);

    await expect(requestLessonOutline(session, 7, new AbortController().signal)).rejects.toThrow(
      'Invalid lesson outline cursor',
    );
    expect(session.requestOptional).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['total', lessonPage({ page: 2, lessonIds: [101, 102], total: 102, pages: 2 })],
    [
      'pages',
      lessonPage({
        page: 2,
        lessonIds: Array.from({ length: 100 }, (_, index) => index + 101),
        total: 201,
        pages: 3,
      }),
    ],
    [
      'page size',
      lessonPage({
        page: 2,
        lessonIds: Array.from({ length: 50 }, (_, index) => index + 101),
        total: 101,
        pages: 3,
        pageSize: 50,
      }),
    ],
  ])('rejects API-014 %s drift without requesting another page', async (_caseName, secondPage) => {
    const firstPageIds = Array.from({ length: 100 }, (_, index) => index + 1);
    const session = sessionRespondingWithSequence([
      lessonPage({ page: 1, lessonIds: firstPageIds, total: 101, pages: 2 }),
      secondPage,
    ]);

    await expect(requestLessonOutline(session, 7, new AbortController().signal)).rejects.toThrow(
      /lesson outline/i,
    );
    expect(session.requestOptional).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate lesson identity across API-014 pages without another request', async () => {
    const firstPageIds = Array.from({ length: 100 }, (_, index) => index + 1);
    const session = sessionRespondingWithSequence([
      lessonPage({ page: 1, lessonIds: firstPageIds, total: 101, pages: 2 }),
      lessonPage({ page: 2, lessonIds: [100], total: 101, pages: 2 }),
    ]);

    await expect(requestLessonOutline(session, 7, new AbortController().signal)).rejects.toThrow(
      /lesson outline/i,
    );
    expect(session.requestOptional).toHaveBeenCalledTimes(2);
  });

  it('rejects an API-014 final item count mismatch without another request', async () => {
    const firstPageIds = Array.from({ length: 100 }, (_, index) => index + 1);
    const session = sessionRespondingWithSequence([
      lessonPage({ page: 1, lessonIds: firstPageIds, total: 102, pages: 2 }),
      lessonPage({ page: 2, lessonIds: [101], total: 102, pages: 2 }),
    ]);

    await expect(requestLessonOutline(session, 7, new AbortController().signal)).rejects.toThrow(
      /lesson outline total/i,
    );
    expect(session.requestOptional).toHaveBeenCalledTimes(2);
  });

  it('uses API-018 for an explicit known-incomplete row update', async () => {
    const result = await setLessonCompletion(
      sessionRespondingWith({
        lesson_id: 12,
        completed: false,
        completed_at: null,
      }),
      7,
      12,
      false,
    );
    expect(result).toEqual({ lessonId: 12, completed: false, completedAt: null });
  });

  it('does not infer a fresh lesson row completion state from aggregate progress', () => {
    expect(lessonCompletionLabel({ status: 'unknown' })).toBe('Completion status unavailable');
    expect(lessonCompletionLabel({ status: 'known', completed: true })).toBe('Completed');
    expect(lessonCompletionLabel({ status: 'known', completed: false })).toBe('Not completed');
  });
});
