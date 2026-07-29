import { describe, expect, it, vi } from 'vitest';

import { requestCourseChat } from '../../../src/features/course-chat';
import type { ApiRequestOptions } from '../../../src/shared/api';
import type { SessionContextValue } from '../../../src/features/auth-session';

function sessionFor(value: unknown): SessionContextValue {
  const requestRequired = vi.fn(
    async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) =>
      options.decode ? options.decode(value) : (value as TResponse),
  );
  return {
    state: { status: 'anonymous' },
    requestRequired,
    requestPublic: vi.fn(),
    requestOptional: vi.fn(),
    retryBootstrap: vi.fn(),
    acceptAccessToken: vi.fn(),
    clearSession: vi.fn(),
  } as unknown as SessionContextValue;
}

describe('course-chat API-007', () => {
  it('uses the required bearer operation with typed JSON and no caller retry path', async () => {
    const session = sessionFor({ thread_id: 'thread-1', response: 'One answer.' });
    await expect(
      requestCourseChat(
        session,
        'thread-1',
        'Explain this course',
        { kind: 'course', courseId: 7 },
        undefined,
      ),
    ).resolves.toEqual({ thread_id: 'thread-1', response: 'One answer.' });
    expect(session.requestRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/chat/',
        authPolicy: 'required',
        body: {
          thread_id: 'thread-1',
          message: 'Explain this course',
          course_id: 7,
        },
      }),
    );
  });

  it('rejects malformed response text at the API boundary', async () => {
    await expect(
      requestCourseChat(
        sessionFor({ thread_id: 'thread-1', response: 2 }),
        'thread-1',
        'Question',
        { kind: 'course', courseId: 7 },
      ),
    ).rejects.toThrow(/chat response text/i);
  });
});
