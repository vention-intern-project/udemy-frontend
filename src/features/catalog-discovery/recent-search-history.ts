export const CATALOG_SEARCH_HISTORY_STORAGE_KEY = 'learnhub.catalog-search-history';
export const CATALOG_SEARCH_HISTORY_LIMIT = 6;

export interface CatalogSearchHistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function normalizedTerm(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeCatalogSearchHistory(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const value of values) {
    const term = normalizedTerm(value);
    if (!term) continue;
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length === CATALOG_SEARCH_HISTORY_LIMIT) break;
  }
  return terms;
}

export function addCatalogSearchHistory(history: readonly string[], term: string): string[] {
  return normalizeCatalogSearchHistory([term, ...history]);
}

function browserStorage(): CatalogSearchHistoryStorage {
  const storage = globalThis.localStorage;
  if (!storage) throw new Error('localStorage is unavailable');
  return storage;
}

export function readCatalogSearchHistory(
  storage?: CatalogSearchHistoryStorage,
): string[] {
  try {
    const raw = (storage ?? browserStorage()).getItem(CATALOG_SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return normalizeCatalogSearchHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function persistCatalogSearchHistory(
  history: readonly string[],
  storage?: CatalogSearchHistoryStorage,
): boolean {
  try {
    (storage ?? browserStorage()).setItem(
      CATALOG_SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(normalizeCatalogSearchHistory(history)),
    );
    return true;
  } catch {
    return false;
  }
}
