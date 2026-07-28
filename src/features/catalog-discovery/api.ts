import { API_OPERATION_BY_ID } from '@entities/api';
import { decodeCourseListDto, mapCourseListDto, type CatalogCourseList } from '@entities/course';
import { ApiError, type ApiClient } from '@shared/api';

import { serializeCatalogQuery, toCourseListQuery, type CatalogQuery } from './query';

export type CatalogRequester = ApiClient['request'];
export type CatalogFailureKind = 'offline' | 'invalid_response' | 'request';

export interface CatalogFailure {
  kind: CatalogFailureKind;
  title: string;
  message: string;
}

export async function requestCatalog(
  request: CatalogRequester,
  query: CatalogQuery,
  signal: AbortSignal,
): Promise<CatalogCourseList> {
  const operation = API_OPERATION_BY_ID['API-008'];
  const response = await request<unknown>({
    method: operation.method,
    path: operation.path,
    query: { ...toCourseListQuery(query) },
    signal,
  });
  try {
    return mapCourseListDto(decodeCourseListDto(response));
  } catch (error) {
    throw new ApiError({
      kind: 'invalid_response',
      status: null,
      message: 'Server returned an invalid catalog response',
      cause: error,
    });
  }
}

export function catalogFailure(error: unknown): CatalogFailure {
  if (error instanceof ApiError && error.kind === 'offline') {
    return {
      kind: 'offline',
      title: 'You appear to be offline',
      message: 'Check your connection and try again.',
    };
  }
  if (error instanceof ApiError && error.kind === 'invalid_response') {
    return {
      kind: 'invalid_response',
      title: 'Catalog data is unavailable',
      message: 'Please try again shortly.',
    };
  }
  return { kind: 'request', title: 'We could not load courses', message: 'Please try again.' };
}

export function catalogQueryKey(query: CatalogQuery): string {
  return serializeCatalogQuery(query);
}
