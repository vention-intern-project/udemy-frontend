import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  catalogFailure,
  requestCatalog,
  type CatalogRequester,
} from '../../../src/features/catalog-discovery';
import { ApiError, type ApiClient } from '../../../src/shared/api';

const validResponse = {
  items: [
    {
      id: 1,
      title: 'React',
      description: null,
      price: '9.99',
      currency: 'USD',
      published_at: null,
      instructor: { id: 2, name: 'Ada', surname: 'Lovelace' },
      lessons: [],
    },
  ],
  page: 2,
  page_size: 20,
  total: 21,
  pages: 2,
  has_next: false,
  has_previous: true,
};

describe('catalog request boundary', () => {
  it('keeps the catalog requester aligned with its API client owner', () => {
    expectTypeOf<CatalogRequester>().toEqualTypeOf<ApiClient['request']>();
  });

  it('uses the exact API-008 request object with the fixed page size', async () => {
    const request = vi.fn().mockResolvedValue(validResponse) as CatalogRequester;
    await expect(
      requestCatalog(
        request,
        { search_query: 'React', min_price: 5, max_price: 10, sort: '-price', page: 2 },
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({ page: 2, pageSize: 20, hasPrevious: true, hasNext: false });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/courses',
        query: {
          search_query: 'React',
          min_price: 5,
          max_price: 10,
          sort: '-price',
          page: 2,
          page_size: 24,
        },
      }),
    );
  });

  it('normalizes decoder failures to the public invalid-response classification', async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ ...validResponse, has_next: 'no' }) as CatalogRequester;
    await expect(
      requestCatalog(request, { sort: 'created_at', page: 1 }, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
    expect(
      catalogFailure(
        new ApiError({ kind: 'invalid_response', status: null, message: 'Malformed' }),
      ),
    ).toMatchObject({
      kind: 'invalid_response',
      titleKey: 'catalog:catalogDataUnavailable',
      messageKey: 'catalog:tryAgainShortly',
    });
  });

  it.each([
    [
      'offline',
      new ApiError({ kind: 'offline', status: null, message: 'private offline detail' }),
      'common:youAppearOffline',
      'common:checkConnectionAndTryAgain',
    ],
    [
      'request',
      new ApiError({ kind: 'server', status: 503, message: 'private server detail' }),
      'catalog:catalogLoadFailed',
      'common:pleaseTryAgain',
    ],
  ] as const)(
    'keeps the %s public failure locale-neutral',
    (_kind, error, titleKey, messageKey) => {
      expect(catalogFailure(error)).toMatchObject({ titleKey, messageKey });
    },
  );
});
