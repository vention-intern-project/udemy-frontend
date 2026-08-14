import { describe, expect, it, vi } from 'vitest';

import { requestCourseChat } from '../../../src/features/course-chat';
import {
  createApiClient,
  createMutationAttemptIdentity,
  type ApiClient,
  type ApiRequestOptions,
} from '../../../src/shared/api';
import type { SessionContextValue } from '../../../src/features/auth-session';

type FetchArguments = Parameters<typeof fetch>;
type FetchResult = ReturnType<typeof fetch>;

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

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

function sessionForClient(client: ApiClient): SessionContextValue {
  const requestRequired = vi.fn(<TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) =>
    client.request<TResponse, TBody>(options),
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
        createMutationAttemptIdentity(),
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

  it('dispatches distinct messages and threads with one cancellation signal independently', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetchMock = vi
      .fn<FetchArguments, FetchResult>()
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    const session = sessionForClient(createApiClient({ fetch: fetchMock }));
    const signal = new AbortController().signal;
    const firstMessage = 'First private learner question';
    const secondMessage = 'Second private learner question';

    const first = requestCourseChat(
      session,
      'private-thread-1',
      firstMessage,
      { kind: 'course', courseId: 7 },
      createMutationAttemptIdentity(),
      signal,
    );
    const second = requestCourseChat(
      session,
      'private-thread-2',
      secondMessage,
      { kind: 'course', courseId: 8 },
      createMutationAttemptIdentity(),
      signal,
    );

    const firstOptions = vi.mocked(session.requestRequired).mock.calls[0]?.[0];
    const secondOptions = vi.mocked(session.requestRequired).mock.calls[1]?.[0];
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(firstOptions?.dedupeKey).not.toBe(secondOptions?.dedupeKey);
    expect(firstOptions?.dedupeKey).not.toContain(firstMessage);
    expect(firstOptions?.dedupeKey).not.toContain('private-thread-1');
    expect(secondOptions?.dedupeKey).not.toContain(secondMessage);
    expect(secondOptions?.dedupeKey).not.toContain('private-thread-2');

    firstResponse.resolve(
      new Response(
        JSON.stringify({
          thread_id: 'private-thread-1',
          response: 'First answer',
        }),
        { status: 200 },
      ),
    );
    secondResponse.resolve(
      new Response(
        JSON.stringify({
          thread_id: 'private-thread-2',
          response: 'Second answer',
        }),
        { status: 200 },
      ),
    );
    await expect(Promise.all([first, second])).resolves.toEqual([
      { thread_id: 'private-thread-1', response: 'First answer' },
      { thread_id: 'private-thread-2', response: 'Second answer' },
    ]);
  });

  it('collapses one deliberate duplicate through the actual client key path', async () => {
    const response = deferred<Response>();
    const fetchMock = vi.fn<FetchArguments, FetchResult>().mockReturnValue(response.promise);
    const session = sessionForClient(createApiClient({ fetch: fetchMock }));
    const identity = createMutationAttemptIdentity();
    const signal = new AbortController().signal;

    const first = requestCourseChat(
      session,
      'thread-1',
      'Same question',
      { kind: 'course', courseId: 7 },
      identity,
      signal,
    );
    const duplicate = requestCourseChat(
      session,
      'thread-1',
      'Same question',
      { kind: 'course', courseId: 7 },
      identity,
      signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    response.resolve(
      new Response(
        JSON.stringify({
          thread_id: 'thread-1',
          response: 'One answer',
        }),
        { status: 200 },
      ),
    );
    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      { thread_id: 'thread-1', response: 'One answer' },
      { thread_id: 'thread-1', response: 'One answer' },
    ]);
  });

  it('uses one shared signal only to cancel distinct in-flight attempts', async () => {
    const fetchMock = vi.fn<FetchArguments, FetchResult>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        }),
    );
    const session = sessionForClient(createApiClient({ fetch: fetchMock }));
    const controller = new AbortController();
    const first = requestCourseChat(
      session,
      'thread-1',
      'First question',
      { kind: 'course', courseId: 7 },
      createMutationAttemptIdentity(),
      controller.signal,
    );
    const second = requestCourseChat(
      session,
      'thread-2',
      'Second question',
      { kind: 'course', courseId: 8 },
      createMutationAttemptIdentity(),
      controller.signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    controller.abort();
    await expect(first).rejects.toMatchObject({ kind: 'aborted' });
    await expect(second).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('rejects malformed response text at the API boundary', async () => {
    await expect(
      requestCourseChat(
        sessionFor({ thread_id: 'thread-1', response: 2 }),
        'thread-1',
        'Question',
        { kind: 'course', courseId: 7 },
        createMutationAttemptIdentity(),
      ),
    ).rejects.toThrow(/chat response text/i);
  });
});
