import { describe, expect, it } from 'vitest';

import {
  parseCatalogQuery, serializeCatalogQuery, toCourseListQuery, validateCatalogDraft,
} from '../../../src/features/catalog-discovery';

describe('catalog URL query contract', () => {
  it('uses API-008 names and canonical defaults', () => {
    const query = parseCatalogQuery(new URLSearchParams('search_query=%20React%20&min_price=10&max_price=30&sort=-price&page=2'));
    expect(query).toEqual({ search_query: 'React', min_price: 10, max_price: 30, sort: '-price', page: 2 });
    expect(serializeCatalogQuery(query)).toBe('search_query=React&min_price=10&max_price=30&sort=-price&page=2');
    expect(toCourseListQuery(query)).toEqual({ search_query: 'React', min_price: 10, max_price: 30, sort: '-price', page: 2, page_size: 20 });
  });

  it('normalizes invalid URL values and blocks invalid range submission', () => {
    expect(parseCatalogQuery(new URLSearchParams('q=nope&minPrice=3&page=0&sort=rating')))
      .toEqual({ sort: 'id', page: 1, search_query: undefined, min_price: undefined, max_price: undefined });
    expect(validateCatalogDraft({ search_query: 'React', min_price: '30', max_price: '10', sort: 'id' }))
      .toEqual({ errors: { max_price: 'Maximum price must be at least the minimum price.' } });
  });

  it('removes an inverted URL price range before serializing or constructing an API request', () => {
    const query = parseCatalogQuery(new URLSearchParams('search_query=React&min_price=30&max_price=10&sort=-price&page=2'));
    expect(query).toEqual({ search_query: 'React', min_price: undefined, max_price: undefined, sort: '-price', page: 2 });
    expect(serializeCatalogQuery(query)).toBe('search_query=React&sort=-price&page=2');
    expect(toCourseListQuery(query)).toEqual({ search_query: 'React', min_price: undefined, max_price: undefined, sort: '-price', page: 2, page_size: 20 });
  });
});
