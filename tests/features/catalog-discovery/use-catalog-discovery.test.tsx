// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  useCatalogDiscovery,
  type CatalogRequester,
} from '../../../src/features/catalog-discovery';
import { ApiError } from '../../../src/shared/api';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function result(title?: string) {
  return {
    items: title
      ? [
          {
            id: 1,
            title,
            description: null,
            price: '9.99',
            currency: 'USD',
            published_at: null,
            instructor: { id: 2, name: 'Ada', surname: 'Lovelace' },
            lessons: [],
          },
        ]
      : [],
    page: 1,
    page_size: 20,
    total: title ? 1 : 0,
    pages: title ? 1 : 0,
    has_next: false,
    has_previous: false,
  };
}

describe('catalog discovery lifecycle', () => {
  it('keeps equivalent canonical queries on one request and replaces changed queries', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const signals: AbortSignal[] = [];
    const request = vi.fn((options) => {
      signals.push(options.signal as AbortSignal);
      return signals.length === 1 ? first.promise : second.promise;
    }) as CatalogRequester;
    const { result: hook, rerender } = renderHook(
      ({ search_query }) =>
        useCatalogDiscovery({ search_query, sort: 'created_at', page: 1 }, request),
      { initialProps: { search_query: 'react' } },
    );

    rerender({ search_query: ' react ' });
    expect(request).toHaveBeenCalledTimes(1);

    rerender({ search_query: 'typescript' });
    expect(request).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true);
    first.resolve(result('Old'));
    second.resolve(result('New'));

    await waitFor(() => expect(hook.current.data?.items[0].title).toBe('New'));
    expect(hook.current.status).toBe('populated');
  });

  it('aborts and ignores stale requests while retaining only the newest result', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const signals: AbortSignal[] = [];
    const request = vi.fn((options) => {
      signals.push(options.signal as AbortSignal);
      return signals.length === 1 ? first.promise : second.promise;
    }) as CatalogRequester;
    const { result: hook, rerender } = renderHook(
      ({ search_query }) =>
        useCatalogDiscovery({ search_query, sort: 'created_at', page: 1 }, request),
      { initialProps: { search_query: 'first' } },
    );

    rerender({ search_query: 'second' });
    expect(signals[0].aborted).toBe(true);
    first.resolve(result('Old'));
    second.resolve(result('New'));
    await waitFor(() => expect(hook.current.data?.items[0].title).toBe('New'));
    expect(hook.current.status).toBe('populated');
  });

  it('retains prior-query data while a changed query is pending and marks a failed refresh', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const request = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise) as CatalogRequester;
    const { result: hook, rerender } = renderHook(
      ({ search_query }) =>
        useCatalogDiscovery({ search_query, sort: 'created_at', page: 1 }, request),
      { initialProps: { search_query: 'first' } },
    );

    first.resolve(result('First'));
    await waitFor(() => expect(hook.current.data?.items[0].title).toBe('First'));

    rerender({ search_query: 'second' });
    const pending = hook.current;
    expect(pending.status).toBe('refreshing');
    expect(pending.data?.items[0].title).toBe('First');

    second.reject(new ApiError({ kind: 'server', status: 500, message: 'Unavailable' }));
    await waitFor(() => expect(hook.current.status).toBe('error-with-results'));
    expect(hook.current.data?.items[0].title).toBe('First');
    expect(hook.current.failure?.kind).toBe('request');
  });

  it('atomically replaces retained cards only when the changed query succeeds', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const request = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise) as CatalogRequester;
    const { result: hook, rerender } = renderHook(
      ({ search_query }) =>
        useCatalogDiscovery({ search_query, sort: 'created_at', page: 1 }, request),
      { initialProps: { search_query: 'first' } },
    );

    first.resolve(result('First'));
    await waitFor(() => expect(hook.current.data?.items[0].title).toBe('First'));

    rerender({ search_query: 'second' });
    expect(hook.current.status).toBe('refreshing');
    expect(hook.current.data?.items[0].title).toBe('First');

    second.resolve(result('Second'));
    await waitFor(() => expect(hook.current.status).toBe('populated'));
    expect(hook.current.data?.items[0].title).toBe('Second');
  });

  it('retains same-query cards while retrying and reaches terminal failure for a live aborted rejection', async () => {
    const first = deferred<unknown>();
    const retry = deferred<unknown>();
    const request = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(retry.promise) as CatalogRequester;
    const { result: hook } = renderHook(() =>
      useCatalogDiscovery({ search_query: 'same-query', sort: 'created_at', page: 1 }, request),
    );

    first.resolve(result('Current'));
    await waitFor(() => expect(hook.current.status).toBe('populated'));

    act(() => {
      hook.current.retry();
    });
    await waitFor(() => expect(hook.current.status).toBe('refreshing'));
    expect(hook.current.data?.items[0].title).toBe('Current');

    retry.reject(new ApiError({ kind: 'aborted', status: null, message: 'Requester aborted' }));
    await waitFor(() => expect(hook.current.status).toBe('error-with-results'));
    expect(hook.current.data?.items[0].title).toBe('Current');
    expect(hook.current.failure?.kind).toBe('request');
  });

  it("aborts StrictMode's superseded request and ignores its late result", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const signals: AbortSignal[] = [];
    const request = vi.fn((options) => {
      signals.push(options.signal as AbortSignal);
      return signals.length === 1 ? first.promise : second.promise;
    }) as CatalogRequester;
    const { result: hook } = renderHook(
      () =>
        useCatalogDiscovery({ search_query: 'strict-mode', sort: 'created_at', page: 1 }, request),
      { wrapper: StrictMode },
    );

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(signals[0].aborted).toBe(true);
    first.resolve(result('Stale'));
    second.resolve(result('Current'));

    await waitFor(() => expect(hook.current.data?.items[0].title).toBe('Current'));
    expect(hook.current.status).toBe('populated');
    expect(hook.current.failure).toBeUndefined();
  });

  it('distinguishes empty, offline error, retry, and changed-query failure states', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ kind: 'offline', status: null, message: 'Offline' }))
      .mockResolvedValueOnce(result('Recovered'))
      .mockResolvedValueOnce(result())
      .mockRejectedValueOnce(new ApiError({ kind: 'server', status: 500, message: 'Unavailable' }));
    const { result: hook, rerender } = renderHook(
      ({ search_query }) =>
        useCatalogDiscovery(
          { search_query, sort: 'created_at', page: 1 },
          request as CatalogRequester,
        ),
      { initialProps: { search_query: 'offline' } },
    );

    await waitFor(() => expect(hook.current.status).toBe('error-without-results'));
    expect(hook.current.data).toBeUndefined();
    expect(hook.current.failure?.kind).toBe('offline');
    await act(async () => {
      hook.current.retry();
    });
    await waitFor(() => expect(hook.current.data?.items[0].title).toBe('Recovered'));
    expect(hook.current.status).toBe('populated');
    expect(hook.current.failure).toBeUndefined();

    rerender({ search_query: 'empty' });
    await waitFor(() => expect(hook.current.status).toBe('empty'));
    expect(hook.current.data?.items).toEqual([]);
    expect(hook.current.failure).toBeUndefined();
    rerender({ search_query: 'failed-refresh' });
    await waitFor(() => expect(hook.current.status).toBe('error-with-results'));
    expect(hook.current.data?.items).toEqual([]);
    expect(hook.current.failure?.kind).toBe('request');
  });
});
