import { describe, expect, it, vi } from 'vitest';

import {
  decodeCourseProgressDto,
  decodeLessonProgressDto,
  lessonCompletionLabel,
  requestCourseProgress,
  requestLearningEnrollment,
  requestLearningEnrollments,
  setLessonCompletion,
} from '../../../src/features/learning-progress';
import type { ApiRequestOptions } from '../../../src/shared/api';
import type { SessionContextValue } from '../../../src/features/auth-session';

function sessionRespondingWith(value: unknown): SessionContextValue {
  const requestRequired = vi.fn(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => (
    options.decode ? options.decode(value) : value as TResponse
  ));
  return {
    state: { status: 'anonymous' }, retryBootstrap: vi.fn(), acceptAccessToken: vi.fn(), clearSession: vi.fn(),
    requestPublic: vi.fn(), requestOptional: vi.fn(), requestRequired,
  } as unknown as SessionContextValue;
}

describe('learning-progress transport and row-state boundary', () => {
  it('strictly decodes API-017/018 lesson progress responses', () => {
    expect(decodeLessonProgressDto({ lesson_id: 7, completed: true, completed_at: '2026-07-01T00:00:00Z' }))
      .toEqual({ lesson_id: 7, completed: true, completed_at: '2026-07-01T00:00:00Z' });
    expect(() => decodeLessonProgressDto({ lesson_id: 7, completed: 'true', completed_at: null })).toThrow();
  });

  it('keeps API-019 as an aggregate-only representation', () => {
    expect(decodeCourseProgressDto({ course_id: 3, completed_lessons: 1, total_lessons: 3, progress_percentage: 33.33 }))
      .toEqual({ course_id: 3, completed_lessons: 1, total_lessons: 3, progress_percentage: 33.33 });
    expect(() => decodeCourseProgressDto({ course_id: 3, completed_lessons: 4, total_lessons: 3, progress_percentage: 100 })).toThrow();
    expect(() => decodeCourseProgressDto({ course_id: 3, completed_lessons: 1, total_lessons: 3, progress_percentage: 33.34 })).toThrow();
  });

  it('rejects API-022 and API-019 responses that do not match their requested resource identity', async () => {
    const signal = new AbortController().signal;
    await expect(requestLearningEnrollment(sessionRespondingWith({
      id: 5, user_id: 1, course_id: 7, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      course: { id: 7, title: 'Mismatched', description: null, price: '0.00', currency: 'USD' },
    }), 4, signal)).rejects.toThrow('Invalid learning enrollment identity');
    await expect(requestCourseProgress(sessionRespondingWith({
      course_id: 8, completed_lessons: 0, total_lessons: 1, progress_percentage: 0,
    }), 7, signal)).rejects.toThrow('Invalid course progress identity');
  });

  it('rejects a malformed API-021 success instead of projecting an empty enrollment list', async () => {
    await expect(requestLearningEnrollments(sessionRespondingWith({
      items: [], page: 2, page_size: 20, total: 3, pages: 1, has_next: false, has_previous: true,
    }), 1, new AbortController().signal)).rejects.toThrow(/pagination/i);
  });

  it('uses API-018 for an explicit known-incomplete row update', async () => {
    const result = await setLessonCompletion(sessionRespondingWith({
      lesson_id: 12, completed: false, completed_at: null,
    }), 7, 12, false);
    expect(result).toEqual({ lessonId: 12, completed: false, completedAt: null });
  });

  it('does not infer a fresh lesson row completion state from aggregate progress', () => {
    expect(lessonCompletionLabel({ status: 'unknown' })).toBe('Completion status unavailable');
    expect(lessonCompletionLabel({ status: 'known', completed: true })).toBe('Completed');
    expect(lessonCompletionLabel({ status: 'known', completed: false })).toBe('Not completed');
  });
});
