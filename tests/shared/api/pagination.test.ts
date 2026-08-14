import { describe, expect, it, vi } from 'vitest';

import {
  collectPaginationPages,
  decodePaginationEnvelope,
  type PaginationEnvelope,
} from '../../../src/shared/api';

const fields = {
  items: 'items',
  page: 'page',
  pageSize: 'page_size',
  total: 'total',
  pages: 'pages',
  hasNext: 'has_next',
  hasPrevious: 'has_previous',
} as const;

interface TestItem {
  readonly id: number;
}

function item(value: unknown): TestItem {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'number'
  ) {
    throw new TypeError('Invalid test item');
  }
  return { id: value.id };
}

function envelope(
  page: number,
  items: readonly TestItem[],
  total: number,
  pages: number,
  pageSize = 2,
): PaginationEnvelope<TestItem> {
  return {
    items,
    page,
    pageSize,
    total,
    pages,
    hasNext: page < pages,
    hasPrevious: page > 1,
  };
}

describe('pagination invariants', () => {
  it('decodes a populated normalized envelope with adapter-owned field names', () => {
    expect(
      decodePaginationEnvelope(
        {
          items: [{ id: 1 }, { id: 2 }],
          page: 1,
          page_size: 2,
          total: 3,
          pages: 2,
          has_next: true,
          has_previous: false,
        },
        { context: 'test collection', decodeItem: item, fields },
      ),
    ).toEqual(envelope(1, [{ id: 1 }, { id: 2 }], 3, 2));
  });

  it.each([
    ['non-record payload', null],
    [
      'non-array items',
      {
        items: null,
        page: 1,
        page_size: 2,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      },
    ],
    [
      'inconsistent page count',
      {
        items: [],
        page: 1,
        page_size: 2,
        total: 3,
        pages: 1,
        has_next: false,
        has_previous: false,
      },
    ],
    [
      'invalid flags',
      {
        items: [{ id: 1 }],
        page: 1,
        page_size: 2,
        total: 1,
        pages: 1,
        has_next: true,
        has_previous: false,
      },
    ],
    [
      'overfull final page',
      {
        items: [{ id: 1 }, { id: 2 }],
        page: 2,
        page_size: 2,
        total: 3,
        pages: 2,
        has_next: false,
        has_previous: true,
      },
    ],
    [
      'malformed item',
      {
        items: [{ id: 'wrong' }],
        page: 1,
        page_size: 2,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      },
    ],
  ])('rejects %s with the adapter context', (_scenario, value) => {
    expect(() =>
      decodePaginationEnvelope(value, { context: 'test collection', decodeItem: item, fields }),
    ).toThrow(/test collection/i);
  });

  it('collects ordered pages with stable metadata', async () => {
    const fetchPage = vi.fn(async (page: number) => {
      if (page === 1) return envelope(1, [{ id: 1 }, { id: 2 }], 3, 2);
      return envelope(2, [{ id: 3 }], 3, 2);
    });

    await expect(
      collectPaginationPages({
        context: 'test collection',
        signal: new AbortController().signal,
        maximumPages: 2,
        fetchPage,
        identifyItem: (value) => value.id,
      }),
    ).resolves.toEqual({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      total: 3,
      pageSize: 2,
      pages: 2,
    });
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2);
  });

  it.each([NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 1.5, 0, -1])(
    'rejects an invalid maximum page policy %s before fetching',
    async (maximumPages) => {
      const fetchPage = vi.fn();

      await expect(
        collectPaginationPages({
          context: 'test collection',
          signal: new AbortController().signal,
          maximumPages,
          fetchPage,
          identifyItem: (value: TestItem) => value.id,
        }),
      ).rejects.toThrow('Invalid test collection pagination');
      expect(fetchPage).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['cursor mismatch', [envelope(2, [{ id: 1 }], 1, 1)], 2],
    [
      'metadata drift',
      [envelope(1, [{ id: 1 }, { id: 2 }], 3, 2), envelope(2, [{ id: 3 }], 4, 2)],
      2,
    ],
    [
      'duplicate identity',
      [envelope(1, [{ id: 1 }, { id: 2 }], 3, 2), envelope(2, [{ id: 1 }], 3, 2)],
      2,
    ],
    ['declared maximum exceeded', [envelope(1, [{ id: 1 }], 3, 3)], 2],
    ['final count mismatch', [envelope(1, [{ id: 1 }], 2, 1)], 2],
  ] as const)(
    'rejects %s without a subsequent fetch',
    async (_scenario, responses, maximumPages) => {
      const fetchPage = vi.fn(async (page: number) => responses[page - 1]);
      await expect(
        collectPaginationPages({
          context: 'test collection',
          signal: new AbortController().signal,
          maximumPages,
          fetchPage,
          identifyItem: (value) => value.id,
        }),
      ).rejects.toThrow(/test collection/i);
      expect(fetchPage).toHaveBeenCalledTimes(
        _scenario === 'metadata drift' || _scenario === 'duplicate identity' ? 2 : 1,
      );
    },
  );

  it('does not fetch when the supplied signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchPage = vi.fn();

    await expect(
      collectPaginationPages({
        context: 'test collection',
        signal: controller.signal,
        maximumPages: 2,
        fetchPage,
        identifyItem: (value: TestItem) => value.id,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('preserves a fetch abort rejection unchanged', async () => {
    const abort = new DOMException('Request cancelled', 'AbortError');
    const fetchPage = vi.fn(async () => Promise.reject(abort));

    await expect(
      collectPaginationPages({
        context: 'test collection',
        signal: new AbortController().signal,
        maximumPages: 2,
        fetchPage,
        identifyItem: (value: TestItem) => value.id,
      }),
    ).rejects.toBe(abort);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('rejects when the signal aborts while the final page fetch is pending', async () => {
    const controller = new AbortController();
    let resolveFetch: ((value: PaginationEnvelope<TestItem>) => void) | undefined;
    const fetchPage = vi.fn(
      () =>
        new Promise<PaginationEnvelope<TestItem>>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const collection = collectPaginationPages({
      context: 'test collection',
      signal: controller.signal,
      maximumPages: 1,
      fetchPage,
      identifyItem: (value) => value.id,
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
    controller.abort();
    if (!resolveFetch) throw new TypeError('Expected the final page fetch to start');
    resolveFetch(envelope(1, [{ id: 1 }], 1, 1));

    await expect(collection).rejects.toMatchObject({ name: 'AbortError' });
  });
});
