import { describe, expect, it } from 'vitest';

import {
  addCatalogSearchHistory,
  CATALOG_SEARCH_HISTORY_STORAGE_KEY,
  normalizeCatalogSearchHistory,
  persistCatalogSearchHistory,
  readCatalogSearchHistory,
  type CatalogSearchHistoryStorage,
} from '../../../src/features/catalog-discovery';

function storage(values: Record<string, string | null> = {}): CatalogSearchHistoryStorage {
  return {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => { values[key] = value; },
  };
}

describe('catalog recent-search history', () => {
  it('keeps at most six newest trimmed terms and lets the newest casing win case-insensitively', () => {
    const history = addCatalogSearchHistory(
      ['React', 'TypeScript', 'react', '  ', 'CSS', 'HTML', 'Node', 'Testing'],
      ' REACT ',
    );

    expect(history).toEqual(['REACT', 'TypeScript', 'CSS', 'HTML', 'Node', 'Testing']);
  });

  it('normalizes malformed storage values to a safe bounded list', () => {
    expect(normalizeCatalogSearchHistory('not an array')).toEqual([]);
    expect(normalizeCatalogSearchHistory([' React ', null, 'react', 7, '', 'TypeScript']))
      .toEqual(['React', 'TypeScript']);
    expect(readCatalogSearchHistory(storage({ [CATALOG_SEARCH_HISTORY_STORAGE_KEY]: '{bad json' }))).toEqual([]);
    expect(readCatalogSearchHistory(storage({ [CATALOG_SEARCH_HISTORY_STORAGE_KEY]: JSON.stringify({ term: 'React' }) }))).toEqual([]);
  });

  it('fails open when browser storage cannot be read or written', () => {
    const unavailable: CatalogSearchHistoryStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };

    expect(readCatalogSearchHistory(unavailable)).toEqual([]);
    expect(persistCatalogSearchHistory(['React'], unavailable)).toBe(false);
    expect(readCatalogSearchHistory()).toEqual([]);
    expect(persistCatalogSearchHistory(['React'])).toBe(false);
    expect(addCatalogSearchHistory([], 'React')).toEqual(['React']);
  });

  it('persists only the normalized public-key value', () => {
    const values: Record<string, string | null> = {};
    expect(persistCatalogSearchHistory([' React ', 'react', 'TypeScript'], storage(values))).toBe(true);
    expect(values[CATALOG_SEARCH_HISTORY_STORAGE_KEY]).toBe(JSON.stringify(['React', 'TypeScript']));
  });
});
