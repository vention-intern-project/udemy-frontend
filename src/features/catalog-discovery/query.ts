import type { CourseListQueryDto } from '@entities/course';

export const CATALOG_PAGE_SIZE = 24;
export type CatalogSort = 'created_at' | '-created_at' | 'price' | '-price' | 'title' | '-title';

export const CATALOG_SORT_VALUES = [
  'created_at',
  '-created_at',
  'price',
  '-price',
  'title',
  '-title',
] as const satisfies readonly CatalogSort[];

export type CatalogPriceField = 'min_price' | 'max_price';
type CatalogDraftPriceValidation = number | undefined | 'invalid';
export type CatalogFilterValidationErrorKey = 'nonNegativePrice' | 'maximumPriceMustBeAtLeast';

export interface CatalogQuery {
  search_query?: string;
  min_price?: number;
  max_price?: number;
  sort: CatalogSort;
  page: number;
}

export interface CatalogFilterDraft {
  search_query: string;
  min_price: string;
  max_price: string;
  sort: CatalogSort;
}

export interface CatalogPriceRangeDraft {
  min_price: string;
  max_price: string;
}

export interface CatalogPriceRange {
  min_price: number | undefined;
  max_price: number | undefined;
}

export type CatalogFilterValidationErrors = Readonly<
  Partial<Record<CatalogPriceField, CatalogFilterValidationErrorKey>>
>;

export interface CatalogFilterValidation {
  value?: CatalogQuery;
  errors: CatalogFilterValidationErrors;
}

function safePage(value: string | null): number {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 1 ? numeric : 1;
}

function optionalPrice(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

function isSort(value: string | null): value is CatalogSort {
  return CATALOG_SORT_VALUES.some((sort) => sort === value);
}

function normalizeSort(value: string | null): CatalogSort {
  if (value === 'id') return 'created_at';
  if (value === '-id') return '-created_at';
  return isSort(value) ? value : 'created_at';
}

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const search = params.get('search_query')?.trim();
  const rawSort = params.get('sort');
  const minPrice = optionalPrice(params.get('min_price'));
  const maxPrice = optionalPrice(params.get('max_price'));
  const hasInvertedRange = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice;
  return {
    search_query: search || undefined,
    min_price: hasInvertedRange ? undefined : minPrice,
    max_price: hasInvertedRange ? undefined : maxPrice,
    sort: normalizeSort(rawSort),
    page: safePage(params.get('page')),
  };
}

export function serializeCatalogQuery(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (query.search_query?.trim()) params.set('search_query', query.search_query.trim());
  if (query.min_price !== undefined) params.set('min_price', String(query.min_price));
  if (query.max_price !== undefined) params.set('max_price', String(query.max_price));
  if (query.sort !== 'created_at') params.set('sort', query.sort);
  if (query.page !== 1) params.set('page', String(query.page));
  return params.toString();
}

export function catalogResultSetKey(query: CatalogQuery): string {
  return serializeCatalogQuery({ ...query, page: 1, sort: 'created_at' });
}

export function toCourseListQuery(query: CatalogQuery): CourseListQueryDto {
  return {
    page: query.page,
    page_size: CATALOG_PAGE_SIZE,
    search_query: query.search_query,
    min_price: query.min_price,
    max_price: query.max_price,
    sort: query.sort,
  };
}

export function draftFromCatalogQuery(query: CatalogQuery): CatalogFilterDraft {
  return {
    search_query: query.search_query ?? '',
    min_price: query.min_price === undefined ? '' : String(query.min_price),
    max_price: query.max_price === undefined ? '' : String(query.max_price),
    sort: query.sort,
  };
}

function validateDraftPrice(value: string): CatalogDraftPriceValidation {
  if (value.trim() === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 'invalid';
}

export function validateCatalogDraft(draft: CatalogFilterDraft): CatalogFilterValidation {
  const min = validateDraftPrice(draft.min_price);
  const max = validateDraftPrice(draft.max_price);
  const errors: Partial<Record<CatalogPriceField, CatalogFilterValidationErrorKey>> = {};
  if (min === 'invalid') errors.min_price = 'nonNegativePrice';
  if (max === 'invalid') errors.max_price = 'nonNegativePrice';
  if (Object.keys(errors).length > 0) return { errors };
  const validMin = min === 'invalid' ? undefined : min;
  const validMax = max === 'invalid' ? undefined : max;
  const normalizedMax =
    validMin !== undefined && validMax !== undefined && validMax < validMin ? validMin : validMax;
  return {
    errors,
    value: {
      search_query: draft.search_query.trim() || undefined,
      min_price: validMin,
      max_price: normalizedMax,
      sort: draft.sort,
      page: 1,
    },
  };
}
