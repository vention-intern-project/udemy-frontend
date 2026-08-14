import { describe, expect, it, vi } from 'vitest';

import type { SessionContextValue } from '../../../src/features/auth-session';
import { login, resetPassword } from '../../../src/features/auth-workflows/api';
import {
  createApiClient,
  createMutationAttemptIdentity,
  type ApiClient,
  type ApiRequestOptions,
} from '../../../src/shared/api';

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

function sessionForClient(client: ApiClient): SessionContextValue {
  const requestPublic = vi.fn(<TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) =>
    client.request<TResponse, TBody>(options),
  );
  return {
    state: { status: 'anonymous' },
    requestPublic,
    requestRequired: vi.fn(),
    requestOptional: vi.fn(),
    retryBootstrap: vi.fn(),
    acceptAccessToken: vi.fn(),
    clearSession: vi.fn(),
  } as unknown as SessionContextValue;
}

describe('auth workflow mutation attempts', () => {
  it('dispatches distinct private payloads with one cancellation signal independently', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetchMock = vi
      .fn<FetchArguments, FetchResult>()
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    const session = sessionForClient(createApiClient({ fetch: fetchMock }));
    const signal = new AbortController().signal;
    const firstInput = { email: 'first.private@example.test', password: 'first-password' };
    const secondInput = { email: 'second.private@example.test', password: 'second-password' };

    const first = login(session, firstInput, createMutationAttemptIdentity(), signal);
    const second = login(session, secondInput, createMutationAttemptIdentity(), signal);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstKey = vi.mocked(session.requestPublic).mock.calls[0]?.[0].dedupeKey;
    const secondKey = vi.mocked(session.requestPublic).mock.calls[1]?.[0].dedupeKey;
    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).not.toContain(firstInput.email);
    expect(firstKey).not.toContain(firstInput.password);
    expect(secondKey).not.toContain(secondInput.email);
    expect(secondKey).not.toContain(secondInput.password);

    firstResponse.resolve(
      new Response(JSON.stringify({ access_token: 'first-token' }), {
        status: 200,
      }),
    );
    secondResponse.resolve(
      new Response(JSON.stringify({ access_token: 'second-token' }), {
        status: 200,
      }),
    );
    await expect(Promise.all([first, second])).resolves.toEqual([
      { accessToken: 'first-token' },
      { accessToken: 'second-token' },
    ]);
  });

  it('collapses a deliberate duplicate that reuses one opaque attempt identity', async () => {
    const response = deferred<Response>();
    const fetchMock = vi.fn<FetchArguments, FetchResult>().mockReturnValue(response.promise);
    const session = sessionForClient(createApiClient({ fetch: fetchMock }));
    const identity = createMutationAttemptIdentity();
    const signal = new AbortController().signal;
    const input = { email: 'duplicate@example.test', password: 'duplicate-password' };

    const first = login(session, input, identity, signal);
    const duplicate = login(session, input, identity, signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(session.requestPublic).mock.calls[0]?.[0].dedupeKey).toBe(
      vi.mocked(session.requestPublic).mock.calls[1]?.[0].dedupeKey,
    );
    response.resolve(
      new Response(JSON.stringify({ access_token: 'shared-token' }), {
        status: 200,
      }),
    );
    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      { accessToken: 'shared-token' },
      { accessToken: 'shared-token' },
    ]);
  });

  it('keeps reset secrets out of the actual client dedupe path', async () => {
    const fetchMock = vi
      .fn<FetchArguments, FetchResult>()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'Password reset' }), { status: 200 }),
      );
    const session = sessionForClient(createApiClient({ fetch: fetchMock }));
    const input = {
      token: 'private-reset-token',
      newPassword: 'private-new-password',
      passwordConfirmation: 'private-new-password',
    };

    await resetPassword(session, input, createMutationAttemptIdentity());

    const key = vi.mocked(session.requestPublic).mock.calls[0]?.[0].dedupeKey;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(key).not.toContain(input.token);
    expect(key).not.toContain(input.newPassword);
  });
});
