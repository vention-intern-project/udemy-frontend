import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { CatalogCourseList } from '@entities/course';

import {
  catalogFailure,
  catalogQueryKey,
  requestCatalog,
  type CatalogFailure,
  type CatalogRequester,
} from './api';
import { parseCatalogQuery, type CatalogQuery } from './query';

interface CatalogInitialLoadingState {
  readonly activeQueryKey: string;
  readonly data?: undefined;
  readonly dataQueryKey?: undefined;
  readonly failure?: undefined;
  readonly placeholderCount: number;
  readonly status: 'initial-loading';
}

interface CatalogPopulatedState {
  readonly activeQueryKey: string;
  readonly data: CatalogCourseList;
  readonly dataQueryKey: string;
  readonly failure?: undefined;
  readonly status: 'populated';
}

interface CatalogEmptyState {
  readonly activeQueryKey: string;
  readonly data: CatalogCourseList;
  readonly dataQueryKey: string;
  readonly failure?: undefined;
  readonly status: 'empty';
}

interface CatalogRefreshingState {
  readonly activeQueryKey: string;
  readonly data: CatalogCourseList;
  readonly dataQueryKey: string;
  readonly failure?: undefined;
  readonly status: 'refreshing';
}

interface CatalogErrorWithoutResultsState {
  readonly activeQueryKey: string;
  readonly data?: undefined;
  readonly dataQueryKey?: undefined;
  readonly failure: CatalogFailure;
  readonly status: 'error-without-results';
}

interface CatalogErrorWithResultsState {
  readonly activeQueryKey: string;
  readonly data: CatalogCourseList;
  readonly dataQueryKey: string;
  readonly failure: CatalogFailure;
  readonly status: 'error-with-results';
}

export type CatalogDiscoveryState =
  | CatalogInitialLoadingState
  | CatalogPopulatedState
  | CatalogEmptyState
  | CatalogRefreshingState
  | CatalogErrorWithoutResultsState
  | CatalogErrorWithResultsState;

interface CatalogRequestStartedAction {
  readonly queryKey: string;
  readonly type: 'request-started';
}

interface CatalogRequestSucceededAction {
  readonly data: CatalogCourseList;
  readonly queryKey: string;
  readonly type: 'request-succeeded';
}

interface CatalogRequestFailedAction {
  readonly failure: CatalogFailure;
  readonly queryKey: string;
  readonly type: 'request-failed';
}

type CatalogDiscoveryAction =
  | CatalogRequestStartedAction
  | CatalogRequestSucceededAction
  | CatalogRequestFailedAction;

const DEFAULT_CATALOG_PLACEHOLDER_COUNT = 4;

function placeholderCountFor(previous: CatalogDiscoveryState) {
  if (previous.data) return Math.max(DEFAULT_CATALOG_PLACEHOLDER_COUNT, previous.data.items.length);
  return previous.status === 'initial-loading'
    ? previous.placeholderCount
    : DEFAULT_CATALOG_PLACEHOLDER_COUNT;
}

function catalogDiscoveryReducer(
  previous: CatalogDiscoveryState,
  action: CatalogDiscoveryAction,
): CatalogDiscoveryState {
  switch (action.type) {
    case 'request-started':
      return previous.data && previous.dataQueryKey === action.queryKey
        ? {
            activeQueryKey: action.queryKey,
            data: previous.data,
            dataQueryKey: previous.dataQueryKey,
            status: 'refreshing',
          }
        : {
            activeQueryKey: action.queryKey,
            placeholderCount: placeholderCountFor(previous),
            status: 'initial-loading',
          };
    case 'request-succeeded':
      return {
        activeQueryKey: action.queryKey,
        data: action.data,
        dataQueryKey: action.queryKey,
        status: action.data.items.length === 0 ? 'empty' : 'populated',
      };
    case 'request-failed':
      return previous.data && previous.dataQueryKey === action.queryKey
        ? {
            activeQueryKey: action.queryKey,
            data: previous.data,
            dataQueryKey: previous.dataQueryKey,
            failure: action.failure,
            status: 'error-with-results',
          }
        : {
            activeQueryKey: action.queryKey,
            failure: action.failure,
            status: 'error-without-results',
          };
  }
}

export function useCatalogDiscovery(query: CatalogQuery, request: CatalogRequester) {
  const [state, dispatch] = useReducer(catalogDiscoveryReducer, {
    activeQueryKey: '',
    placeholderCount: DEFAULT_CATALOG_PLACEHOLDER_COUNT,
    status: 'initial-loading',
  });
  const [retrySequence, setRetrySequence] = useState(0);
  const requestSequence = useRef(0);
  const queryKey = catalogQueryKey(query);
  const normalizedQuery = useMemo(
    () => parseCatalogQuery(new URLSearchParams(queryKey)),
    [queryKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    dispatch({ queryKey, type: 'request-started' });

    void requestCatalog(request, normalizedQuery, controller.signal)
      .then((data) => {
        if (controller.signal.aborted || requestSequence.current !== sequence) return;
        dispatch({ data, queryKey, type: 'request-succeeded' });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestSequence.current !== sequence) return;
        const failure = catalogFailure(error);
        dispatch({ failure, queryKey, type: 'request-failed' });
      });

    return () => controller.abort();
  }, [normalizedQuery, queryKey, request, retrySequence]);

  const retry = useCallback(() => setRetrySequence((value) => value + 1), []);
  return { ...state, retry };
}
