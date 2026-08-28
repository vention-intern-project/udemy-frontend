// @vitest-environment jsdom

import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  AppQueryProvider,
  SessionPrivateCacheLifecycle,
  appQueryClient,
  cancelAndRemovePrivateQueries,
  createAppQueryClient,
} from '@app/query';
import {
  API_OPERATION_BY_ID,
  API_OPERATION_METADATA_BY_ID,
  queryKeys,
  type SelectedApiOperationId,
} from '@entities/api';
import {
  createOperationQueryFn,
  requestOperation,
  selectOperationRequester,
  type SessionContextValue,
  type SessionState,
} from '@features/auth-session';
import { authWorkflowMutationKeys } from '@features/auth-workflows';
import { type AuthPolicy, type SessionCacheEpoch } from '@shared/api';

function sessionCacheEpoch(value: string): SessionCacheEpoch {
  return value as SessionCacheEpoch;
}

const sessionHook = vi.hoisted(() => ({
  state: { status: 'anonymous' } as SessionState,
  cacheEpoch: null as SessionCacheEpoch | null,
}));

vi.mock('@features/auth-session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@features/auth-session')>();
  return {
    ...actual,
    useSession: () => ({ state: sessionHook.state, cacheEpoch: sessionHook.cacheEpoch }),
  };
});

afterEach(() => {
  cleanup();
  appQueryClient.clear();
  sessionHook.state = { status: 'anonymous' };
  sessionHook.cacheEpoch = null;
  vi.restoreAllMocks();
});

function authenticatedSessionState(email: string): SessionState {
  return {
    status: 'authenticated',
    user: {
      email,
      name: 'Test',
      surname: 'Learner',
      role: 'student',
      birthday: null,
      phoneNumber: null,
      createdAt: '2026-07-24T00:00:00Z',
    },
  };
}

function sessionRequests() {
  const requestPublic = vi.fn(async () => ({ ok: true }));
  const requestOptional = vi.fn(async () => ({ ok: true }));
  const requestRequired = vi.fn(async () => ({ ok: true }));
  const session = {
    state: { status: 'anonymous' },
    retryBootstrap: vi.fn(),
    acceptAccessToken: vi.fn(),
    clearSession: vi.fn(),
    requestPublic,
    requestOptional,
    requestRequired,
  } as unknown as SessionContextValue;
  return { session, requestPublic, requestOptional, requestRequired };
}

declare function selectedOperationId(): SelectedApiOperationId;

function assertPublicOperationTypeBoundary(session: SessionContextValue): void {
  const widenedOperationId: SelectedApiOperationId = selectedOperationId();
  const queryBodyOptions = { path: '/courses', body: { unsupported: true } };
  const jsonQueryOptions = {
    path: '/login',
    body: { email: 'learner@example.test', password: 'correct horse battery staple' },
    query: { unsupported: true },
    dedupeKey: 'login:test',
  };
  void requestOperation(session, 'API-008', {
    path: '/courses',
    query: { page: 1, page_size: 20 },
  });
  void createOperationQueryFn(session, 'API-008', {
    path: '/courses',
    query: { page: 1, page_size: 20 },
  });
  // @ts-expect-error Legacy response/body generics must still retain the API-008 query contract.
  void requestOperation<unknown, { email: string; password: string }>(session, 'API-008', {
    path: '/courses',
    body: { email: 'learner@example.test', password: 'correct horse battery staple' },
    dedupeKey: 'test',
  });
  void requestOperation<unknown, { email: string; password: string }>(session, 'API-024', {
    path: '/login',
    body: { email: 'learner@example.test', password: 'correct horse battery staple' },
    dedupeKey: 'test',
  });
  void createOperationQueryFn<unknown, { email: string; password: string }>(session, 'API-024', {
    path: '/login',
    body: { email: 'learner@example.test', password: 'correct horse battery staple' },
    dedupeKey: 'test',
  });
  // @ts-expect-error A widened operation ID cannot prove that API-024 JSON options are compatible.
  void requestOperation<unknown, { email: string; password: string }>(session, widenedOperationId, {
    path: '/login',
    body: { email: 'learner@example.test', password: 'correct horse battery staple' },
    dedupeKey: 'test',
  });
  void createOperationQueryFn<unknown, { email: string; password: string }>(
    session,
    // @ts-expect-error A widened operation ID cannot prove the query-factory options contract.
    widenedOperationId,
    {
      path: '/login',
      body: { email: 'learner@example.test', password: 'correct horse battery staple' },
      dedupeKey: 'test',
    },
  );
  // @ts-expect-error Query operations cannot accept a body through requestOperation.
  void requestOperation(session, 'API-008', queryBodyOptions);
  // @ts-expect-error Query operations require their contract query through requestOperation.
  void requestOperation(session, 'API-008', { path: '/courses' });
  // @ts-expect-error JSON operations cannot accept a query through createOperationQueryFn.
  void createOperationQueryFn(session, 'API-024', jsonQueryOptions);
}

void assertPublicOperationTypeBoundary;

describe('TanStack server-state boundary', () => {
  it('uses one stable application client and disables both retry layers', () => {
    const seen: unknown[] = [];
    function Probe() {
      seen.push(useQueryClient());
      return <span>ready</span>;
    }
    const view = render(
      <AppQueryProvider>
        <Probe />
      </AppQueryProvider>,
    );
    view.rerender(
      <AppQueryProvider>
        <Probe />
      </AppQueryProvider>,
    );

    expect(seen).toEqual([appQueryClient, appQueryClient]);
    expect(appQueryClient.getDefaultOptions().queries?.retry).toBe(false);
    expect(appQueryClient.getDefaultOptions().mutations?.retry).toBe(false);
    expect(createAppQueryClient()).not.toBe(appQueryClient);
  });

  it('keeps epoch-scoped private keys shared and auth mutation keys feature-owned', () => {
    expectTypeOf(queryKeys.private.operation).parameter(1).toEqualTypeOf<SelectedApiOperationId>();
    expect(
      queryKeys.private.operation(sessionCacheEpoch('epoch-test'), 'API-026', 'current-user'),
    ).toEqual(['private', 'epoch-test', 'API-026', 'current-user']);
    expect(queryKeys.private.operationPrefix(sessionCacheEpoch('epoch-test'), 'API-021')).toEqual([
      'private',
      'epoch-test',
      'API-021',
    ]);
    expect(authWorkflowMutationKeys.login).toEqual(['mutation', 'auth', 'login']);
    expect(JSON.stringify({ queryKeys, authWorkflowMutationKeys })).not.toMatch(
      /secret-token|correct horse|learner@example/,
    );
  });

  it('matches every selected operation to its canonical auth policy and requester', () => {
    const requests = sessionRequests();
    const expected = {
      'API-002': 'required',
      'API-003': 'required',
      'API-004': 'required',
      'API-005': 'required',
      'API-006': 'required',
      'API-007': 'required',
      'API-008': 'public',
      'API-009': 'required',
      'API-010': 'optional',
      'API-011': 'required',
      'API-012': 'required',
      'API-013': 'required',
      'API-014': 'optional',
      'API-015': 'required',
      'API-016': 'required',
      'API-017': 'required',
      'API-018': 'required',
      'API-019': 'required',
      'API-020': 'required',
      'API-021': 'required',
      'API-022': 'required',
      'API-023': 'public',
      'API-024': 'public',
      'API-025': 'required',
      'API-026': 'required',
      'API-029': 'public',
      'API-030': 'optional',
      'API-031': 'required',
      'API-032': 'required',
      'API-033': 'public',
      'API-034': 'required',
      'API-035': 'required',
      'API-036': 'required',
      'API-037': 'public',
      'API-038': 'required',
      'API-039': 'required',
      'API-040': 'required',
      'API-041': 'required',
    } as const satisfies Readonly<Record<SelectedApiOperationId, AuthPolicy>>;

    expect(Object.keys(API_OPERATION_METADATA_BY_ID).sort()).toEqual(
      Object.keys(API_OPERATION_BY_ID).sort(),
    );
    Object.entries(expected).forEach(([operationId, policy]) => {
      const id = operationId as SelectedApiOperationId;
      expect(API_OPERATION_METADATA_BY_ID[id].authPolicy, id).toBe(policy);
      expect(selectOperationRequester(requests.session, id), id).toBe(
        policy === 'public'
          ? requests.requestPublic
          : policy === 'optional'
            ? requests.requestOptional
            : requests.requestRequired,
      );
    });
  });

  it('binds operation method, path, and policy and rejects mismatched caller options', async () => {
    const requests = sessionRequests();
    await requestOperation(requests.session, 'API-008', {
      path: '/courses',
      query: { page: 1, page_size: 20 },
    });
    await requestOperation(requests.session, 'API-010', { path: '/courses/course-1' });
    await requestOperation(requests.session, 'API-030', { path: '/lessons/lesson-1' });

    expect(requests.requestPublic).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/courses',
        authPolicy: 'public',
      }),
    );
    expect(requests.requestOptional).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/courses/course-1',
        authPolicy: 'optional',
      }),
    );
    expect(requests.requestOptional).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/lessons/lesson-1',
        authPolicy: 'optional',
      }),
    );
    expect(() =>
      requestOperation(requests.session, 'API-024', {
        method: 'GET',
        path: '/login',
      } as never),
    ).toThrow('Method does not match API-024');
    expect(() =>
      requestOperation(requests.session, 'API-024', {
        method: 'POST',
        path: '/signup',
      } as never),
    ).toThrow('Path does not match API-024');
    expect(() =>
      requestOperation(requests.session, 'API-024', {
        method: 'POST',
        path: '/login',
        authPolicy: 'required',
      } as never),
    ).toThrow('Auth policy does not match API-024');
  });

  it.each([
    {
      name: 'a body for a no-body operation',
      operationId: 'API-003' as const,
      options: { path: '/cart', body: { unsupported: true } },
      error: 'Body does not match API-003',
    },
    {
      name: 'a body for a query operation',
      operationId: 'API-008' as const,
      options: { path: '/courses', body: { unsupported: true } },
      error: 'Body does not match API-008',
    },
    {
      name: 'an omitted query for a query operation',
      operationId: 'API-008' as const,
      options: { path: '/courses' },
      error: 'Query is required for API-008',
    },
    {
      name: 'a null query for a query operation',
      operationId: 'API-008' as const,
      options: { path: '/courses', query: null },
      error: 'Query is required for API-008',
    },
    {
      name: 'a query for a JSON operation',
      operationId: 'API-024' as const,
      options: { path: '/login', query: { unsupported: true }, dedupeKey: 'login:test' },
      error: 'Query does not match API-024',
    },
    {
      name: 'a JSON body for a multipart operation',
      operationId: 'API-032' as const,
      options: {
        path: '/lessons/lesson-1/upload-file',
        body: { unsupported: true },
        dedupeKey: 'upload:test',
      },
      error: 'Multipart body does not match API-032',
    },
    {
      name: 'a null body for a JSON operation',
      operationId: 'API-024' as const,
      options: { path: '/login', body: null, dedupeKey: 'login:test' },
      error: 'JSON body does not match API-024',
    },
    {
      name: 'a blob response mode for a JSON operation',
      operationId: 'API-024' as const,
      options: {
        path: '/login',
        body: { email: 'learner@example.test', password: 'correct horse battery staple' },
        responseType: 'blob',
        dedupeKey: 'login:test',
      },
      error: 'Response mode does not match API-024',
    },
    {
      name: 'a blob response mode for a void operation',
      operationId: 'API-003' as const,
      options: { path: '/cart', responseType: 'blob', dedupeKey: 'cart:clear' },
      error: 'Response mode does not match API-003',
    },
    {
      name: 'an omitted mutation dedupe key',
      operationId: 'API-024' as const,
      options: {
        path: '/login',
        body: { email: 'learner@example.test', password: 'correct horse battery staple' },
      },
      error: 'Dedupe key is required for API-024',
    },
    {
      name: 'a non-string mutation dedupe key',
      operationId: 'API-024' as const,
      options: {
        path: '/login',
        body: { email: 'learner@example.test', password: 'correct horse battery staple' },
        dedupeKey: 42,
      },
      error: 'Dedupe key is required for API-024',
    },
  ])('rejects $name before dispatch', ({ operationId, options, error }) => {
    const requests = sessionRequests();

    expect(() => requestOperation(requests.session, operationId, options as never)).toThrow(error);
    expect(requests.requestPublic).not.toHaveBeenCalled();
    expect(requests.requestOptional).not.toHaveBeenCalled();
    expect(requests.requestRequired).not.toHaveBeenCalled();
  });

  it('dispatches a valid JSON operation when FormData is unavailable', async () => {
    const requests = sessionRequests();
    const formDataDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'FormData');
    Object.defineProperty(globalThis, 'FormData', { configurable: true, value: undefined });

    try {
      await requestOperation(requests.session, 'API-024', {
        path: '/login',
        body: { email: 'learner@example.test', password: 'correct horse battery staple' },
        dedupeKey: 'login:test',
      });
    } finally {
      if (formDataDescriptor === undefined) {
        Reflect.deleteProperty(globalThis, 'FormData');
      } else {
        Object.defineProperty(globalThis, 'FormData', formDataDescriptor);
      }
    }

    expect(requests.requestPublic).toHaveBeenCalledTimes(1);
  });

  it('preserves valid multipart and binary operation dispatch', async () => {
    const requests = sessionRequests();
    const upload = new FormData();
    upload.set('file', new File(['lesson'], 'lesson.pdf', { type: 'application/pdf' }));

    await requestOperation(requests.session, 'API-032', {
      path: '/lessons/lesson-1/upload-file',
      body: upload,
      dedupeKey: 'upload:lesson-1',
    });
    await requestOperation(requests.session, 'API-025', {
      path: '/media/lessons/lesson.pdf',
      responseType: 'blob',
    });

    expect(requests.requestRequired).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'POST',
        authPolicy: 'required',
        body: upload,
        dedupeKey: 'upload:lesson-1',
      }),
    );
    expect(requests.requestRequired).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'GET',
        authPolicy: 'required',
        responseType: 'blob',
      }),
    );
  });

  it('passes the TanStack query AbortSignal to the existing request client', async () => {
    const requests = sessionRequests();
    const controller = new AbortController();
    const queryFn = createOperationQueryFn(requests.session, 'API-026', { path: '/me' });
    await queryFn({ signal: controller.signal } as never);
    expect(requests.requestRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/me',
        signal: controller.signal,
        authPolicy: 'required',
      }),
    );
  });

  it('cancels before removing only the prior epoch private cache', async () => {
    const client = createAppQueryClient();
    client.setQueryData(
      queryKeys.private.operation(sessionCacheEpoch('epoch-old'), 'API-026', 'me'),
      { old: true },
    );
    client.setQueryData(
      queryKeys.private.operation(sessionCacheEpoch('epoch-new'), 'API-026', 'me'),
      { new: true },
    );
    const order: string[] = [];
    const cancel = vi.spyOn(client, 'cancelQueries').mockImplementation(async () => {
      order.push('cancel');
    });
    const remove = vi.spyOn(client, 'removeQueries').mockImplementation((filters) => {
      order.push('remove');
      return Reflect.apply(Object.getPrototypeOf(client).removeQueries, client, [filters]);
    });

    await cancelAndRemovePrivateQueries(client, sessionCacheEpoch('epoch-old'));

    expect(order).toEqual(['cancel', 'remove']);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(
      client.getQueryData(
        queryKeys.private.operation(sessionCacheEpoch('epoch-old'), 'API-026', 'me'),
      ),
    ).toBeUndefined();
    expect(
      client.getQueryData(
        queryKeys.private.operation(sessionCacheEpoch('epoch-new'), 'API-026', 'me'),
      ),
    ).toEqual({ new: true });
  });

  it('continues private cache cleanup after an earlier cancellation rejects', async () => {
    const oldQueryKey = queryKeys.private.operation(
      sessionCacheEpoch('epoch-old'),
      'API-026',
      'me',
    );
    const nextQueryKey = queryKeys.private.operation(
      sessionCacheEpoch('epoch-next'),
      'API-026',
      'me',
    );
    appQueryClient.setQueryData(oldQueryKey, { old: true });
    appQueryClient.setQueryData(nextQueryKey, { next: true });
    const cancel = vi
      .spyOn(appQueryClient, 'cancelQueries')
      .mockRejectedValueOnce(new Error('synthetic cancellation failure'))
      .mockResolvedValueOnce(undefined);

    sessionHook.state = authenticatedSessionState('old@example.com');
    sessionHook.cacheEpoch = sessionCacheEpoch('epoch-old');
    const view = render(
      <AppQueryProvider>
        <SessionPrivateCacheLifecycle />
      </AppQueryProvider>,
    );

    sessionHook.state = authenticatedSessionState('next@example.com');
    sessionHook.cacheEpoch = sessionCacheEpoch('epoch-next');
    view.rerender(
      <AppQueryProvider>
        <SessionPrivateCacheLifecycle />
      </AppQueryProvider>,
    );
    await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));

    sessionHook.state = authenticatedSessionState('latest@example.com');
    sessionHook.cacheEpoch = sessionCacheEpoch('epoch-latest');
    view.rerender(
      <AppQueryProvider>
        <SessionPrivateCacheLifecycle />
      </AppQueryProvider>,
    );
    await waitFor(() => expect(cancel).toHaveBeenCalledTimes(2));

    expect(appQueryClient.getQueryData(oldQueryKey)).toEqual({ old: true });
    expect(appQueryClient.getQueryData(nextQueryKey)).toBeUndefined();
  });

  it('removes a retired same-email epoch without selecting the new lifetime', async () => {
    const client = createAppQueryClient();
    const oldEpoch = sessionCacheEpoch('epoch-retired');
    const newEpoch = sessionCacheEpoch('epoch-current');
    const oldQueryKey = queryKeys.private.operation(oldEpoch, 'API-026', 'me');
    const newQueryKey = queryKeys.private.operation(newEpoch, 'API-026', 'me');
    client.setQueryData(oldQueryKey, { owner: 'retired' });

    sessionHook.state = authenticatedSessionState('same@example.com');
    sessionHook.cacheEpoch = oldEpoch;
    const view = render(
      <QueryClientProvider client={client}>
        <SessionPrivateCacheLifecycle />
      </QueryClientProvider>,
    );

    sessionHook.state = authenticatedSessionState('same@example.com');
    sessionHook.cacheEpoch = newEpoch;
    client.setQueryData(newQueryKey, { owner: 'current' });
    view.rerender(
      <QueryClientProvider client={client}>
        <SessionPrivateCacheLifecycle />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(client.getQueryData(oldQueryKey)).toBeUndefined());
    expect(client.getQueryData(newQueryKey)).toEqual({ owner: 'current' });
  });

  it('does not remove a new same-email epoch inserted while retired cancellation is pending', async () => {
    const client = createAppQueryClient();
    const oldEpoch = sessionCacheEpoch('epoch-retired');
    const newEpoch = sessionCacheEpoch('epoch-current');
    const oldQueryKey = queryKeys.private.operation(oldEpoch, 'API-026', 'me');
    const newQueryKey = queryKeys.private.operation(newEpoch, 'API-026', 'me');
    const cancellation = new Promise<void>(() => undefined);
    client.setQueryData(oldQueryKey, { owner: 'retired' });
    vi.spyOn(client, 'cancelQueries').mockReturnValue(cancellation);

    sessionHook.state = authenticatedSessionState('same@example.com');
    sessionHook.cacheEpoch = oldEpoch;
    const view = render(
      <QueryClientProvider client={client}>
        <SessionPrivateCacheLifecycle />
      </QueryClientProvider>,
    );

    sessionHook.cacheEpoch = newEpoch;
    view.rerender(
      <QueryClientProvider client={client}>
        <SessionPrivateCacheLifecycle />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(client.cancelQueries).toHaveBeenCalledTimes(1));
    client.setQueryData(newQueryKey, { owner: 'current' });

    expect(client.getQueryData(newQueryKey)).toEqual({ owner: 'current' });
  });
});
