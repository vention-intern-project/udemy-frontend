import { describe, expect, it } from 'vitest';

import {
  CATALOG_SORT_VALUES,
  parseCatalogQuery,
  serializeCatalogQuery,
  toCourseListQuery,
  validateCatalogDraft,
} from '../../../src/features/catalog-discovery';

describe('catalog URL query contract', () => {
  it('uses API-008 names and customer-facing non-default sorts', () => {
    const query = parseCatalogQuery(
      new URLSearchParams('search_query=%20React%20&min_price=10&max_price=30&sort=-price&page=2'),
    );
    expect(query).toEqual({
      search_query: 'React',
      min_price: 10,
      max_price: 30,
      sort: '-price',
      page: 2,
    });
    expect(serializeCatalogQuery(query)).toBe(
      'search_query=React&min_price=10&max_price=30&sort=-price&page=2',
    );
    expect(toCourseListQuery(query)).toEqual({
      search_query: 'React',
      min_price: 10,
      max_price: 30,
      sort: '-price',
      page: 2,
      page_size: 20,
    });
  });

  it('normalizes invalid URL values and clamps an inverted submitted range to its minimum', () => {
    expect(parseCatalogQuery(new URLSearchParams('q=nope&minPrice=3&page=0&sort=rating'))).toEqual({
      sort: 'created_at',
      page: 1,
      search_query: undefined,
      min_price: undefined,
      max_price: undefined,
    });
    expect(
      validateCatalogDraft({
        search_query: 'React',
        min_price: '30',
        max_price: '10',
        sort: 'created_at',
      }),
    ).toEqual({
      errors: {},
      value: { search_query: 'React', min_price: 30, max_price: 30, sort: 'created_at', page: 1 },
    });
  });

  it('uses created_at for the clean Oldest default while canonicalizing legacy ID bookmarks', () => {
    expect(CATALOG_SORT_VALUES).toEqual([
      'created_at',
      '-created_at',
      'price',
      '-price',
      'title',
      '-title',
    ]);
    const defaultQuery = parseCatalogQuery(new URLSearchParams());
    expect(defaultQuery.sort).toBe('created_at');
    expect(serializeCatalogQuery(defaultQuery)).toBe('');
    expect(toCourseListQuery(defaultQuery)).toMatchObject({
      sort: 'created_at',
      page: 1,
      page_size: 20,
    });

    const ascendingLegacy = parseCatalogQuery(new URLSearchParams('sort=id'));
    const descendingLegacy = parseCatalogQuery(new URLSearchParams('sort=-id'));
    expect(ascendingLegacy.sort).toBe('created_at');
    expect(serializeCatalogQuery(ascendingLegacy)).toBe('');
    expect(descendingLegacy.sort).toBe('-created_at');
    expect(serializeCatalogQuery(descendingLegacy)).toBe('sort=-created_at');
    expect(toCourseListQuery(descendingLegacy)).toMatchObject({ sort: '-created_at' });
  });

  it('removes an inverted URL price range before serializing or constructing an API request', () => {
    const query = parseCatalogQuery(
      new URLSearchParams('search_query=React&min_price=30&max_price=10&sort=-price&page=2'),
    );
    expect(query).toEqual({
      search_query: 'React',
      min_price: undefined,
      max_price: undefined,
      sort: '-price',
      page: 2,
    });
    expect(serializeCatalogQuery(query)).toBe('search_query=React&sort=-price&page=2');
    expect(toCourseListQuery(query)).toEqual({
      search_query: 'React',
      min_price: undefined,
      max_price: undefined,
      sort: '-price',
      page: 2,
      page_size: 20,
    });
  });
});
