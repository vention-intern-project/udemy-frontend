// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  useCatalogMaximumPrice,
  type CatalogRequester,
} from '../../../src/features/catalog-discovery';
import { ApiError } from '../../../src/shared/api';

const maximumPriceResponse = {
  items: [
    {
      id: 1,
      title: 'Most expensive',
      description: null,
      price: '349000.00',
      currency: 'UZS',
      published_at: '2026-01-01T00:00:00Z',
      instructor: { id: 2, name: 'Ada', surname: 'Lovelace' },
      lessons: [],
    },
  ],
  page: 1,
  page_size: 1,
  total: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
};

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly reject: (reason?: unknown) => void;
  readonly resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function flushRequestCleanup(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('catalog maximum price lifecycle', () => {
  it('keeps one global bound request across ordinary consumer rerenders', async () => {
    const request = vi.fn().mockResolvedValue(maximumPriceResponse) as CatalogRequester;
    const { result, rerender } = renderHook(
      ({ catalogQuery }) => {
        void catalogQuery;
        return useCatalogMaximumPrice(request, 'stability');
      },
      { initialProps: { catalogQuery: 'sort=created_at&page=1' } },
    );

    await waitFor(() => expect(result.current.maximumPrice).toBe('349000.00'));
    rerender({ catalogQuery: 'search_query=react&sort=-title&page=2' });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ query: { page: 1, page_size: 1, sort: '-price' } }),
    );
  });

  it('aborts and evicts an in-flight request after its only consumer unmounts', async () => {
    const pending = deferred<unknown>();
    const requestMock = vi.fn().mockReturnValue(pending.promise);
    const request = requestMock as CatalogRequester;
    const { unmount } = renderHook(() => useCatalogMaximumPrice(request, 'unmount'));

    const signal = requestMock.mock.calls[0]?.[0].signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);

    unmount();
    await flushRequestCleanup();

    expect(signal?.aborted).toBe(true);
    const retry = renderHook(() => useCatalogMaximumPrice(request, 'unmount'));
    expect(request).toHaveBeenCalledTimes(2);
    retry.unmount();
  });

  it('aborts a superseded requester or session without retaining its transport', async () => {
    const firstPending = deferred<unknown>();
    const secondPending = deferred<unknown>();
    const firstRequestMock = vi.fn().mockReturnValue(firstPending.promise);
    const secondRequestMock = vi.fn().mockReturnValue(secondPending.promise);
    const firstRequest = firstRequestMock as CatalogRequester;
    const secondRequest = secondRequestMock as CatalogRequester;
    const { rerender, unmount } = renderHook(
      ({ request, sessionKey }) => useCatalogMaximumPrice(request, sessionKey),
      { initialProps: { request: firstRequest, sessionKey: 'first' } },
    );

    const firstSignal = firstRequestMock.mock.calls[0]?.[0].signal;
    rerender({ request: secondRequest, sessionKey: 'second' });
    await flushRequestCleanup();

    expect(firstSignal?.aborted).toBe(true);
    expect(secondRequestMock).toHaveBeenCalledTimes(1);
    unmount();
    await flushRequestCleanup();
  });

  it('deduplicates the live request across StrictMode lifecycle replay', async () => {
    const pending = deferred<unknown>();
    const requestMock = vi.fn().mockReturnValue(pending.promise);
    const request = requestMock as CatalogRequester;
    const { unmount } = renderHook(() => useCatalogMaximumPrice(request, 'strict-mode'), {
      wrapper: StrictMode,
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls[0]?.[0].signal.aborted).toBe(false);
    unmount();
    await flushRequestCleanup();
  });

  it('evicts a rejected optional request so a later eligible consumer retries', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ kind: 'server', status: 500, message: 'Unavailable' }))
      .mockResolvedValueOnce(maximumPriceResponse) as CatalogRequester;
    const first = renderHook(() => useCatalogMaximumPrice(request, 'failure-retry'));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(first.result.current.maximumPrice).toBeUndefined());
    first.unmount();

    const second = renderHook(() => useCatalogMaximumPrice(request, 'failure-retry'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(second.result.current.maximumPrice).toBe('349000.00'));
  });

  it('does not let an aborted request poison a later retry', async () => {
    const pending = deferred<unknown>();
    const request = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(maximumPriceResponse) as CatalogRequester;
    const first = renderHook(() => useCatalogMaximumPrice(request, 'abort-retry'));

    first.unmount();
    await flushRequestCleanup();
    pending.reject(new DOMException('Aborted', 'AbortError'));

    const second = renderHook(() => useCatalogMaximumPrice(request, 'abort-retry'));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(second.result.current.maximumPrice).toBe('349000.00'));
  });
});
