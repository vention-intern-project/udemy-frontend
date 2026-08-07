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
import { mutationKeys, type AuthPolicy, type SessionCacheEpoch } from '@shared/api';

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

  it('centralizes epoch-scoped private keys and credential-free mutation keys', () => {
    expectTypeOf(queryKeys.private.operation).parameter(1).toEqualTypeOf<SelectedApiOperationId>();
    expect(
      queryKeys.private.operation(sessionCacheEpoch('epoch-test'), 'API-026', 'current-user'),
    ).toEqual(['private', 'epoch-test', 'API-026', 'current-user']);
    expect(queryKeys.private.operationPrefix(sessionCacheEpoch('epoch-test'), 'API-021')).toEqual([
      'private',
      'epoch-test',
      'API-021',
    ]);
    expect(mutationKeys.auth.login).toEqual(['mutation', 'auth', 'login']);
    expect(JSON.stringify({ queryKeys, mutationKeys })).not.toMatch(
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
    await requestOperation(requests.session, 'API-008', { path: '/courses' });
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
      }),
    ).toThrow('Method does not match API-024');
    expect(() =>
      requestOperation(requests.session, 'API-024', {
        method: 'POST',
        path: '/signup',
      }),
    ).toThrow('Path does not match API-024');
    expect(() =>
      requestOperation(requests.session, 'API-024', {
        method: 'POST',
        path: '/login',
        authPolicy: 'required',
      }),
    ).toThrow('Auth policy does not match API-024');
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
