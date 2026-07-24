import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { CatalogCourseList } from '@entities/course';

import { catalogFailure, catalogQueryKey, requestCatalog, type CatalogFailure, type CatalogRequester } from './api';
import { parseCatalogQuery, type CatalogQuery } from './query';

interface CatalogInitialLoadingState {
  readonly data?: undefined;
  readonly failure?: undefined;
  readonly status: 'initial-loading';
}

interface CatalogPopulatedState {
  readonly data: CatalogCourseList;
  readonly failure?: undefined;
  readonly status: 'populated';
}

interface CatalogEmptyState {
  readonly data: CatalogCourseList;
  readonly failure?: undefined;
  readonly status: 'empty';
}

interface CatalogRefreshingState {
  readonly data: CatalogCourseList;
  readonly failure?: undefined;
  readonly status: 'refreshing';
}

interface CatalogErrorWithoutResultsState {
  readonly data?: undefined;
  readonly failure: CatalogFailure;
  readonly status: 'error-without-results';
}

interface CatalogErrorWithResultsState {
  readonly data: CatalogCourseList;
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
  readonly type: 'request-started';
}

interface CatalogRequestSucceededAction {
  readonly data: CatalogCourseList;
  readonly type: 'request-succeeded';
}

interface CatalogRequestFailedAction {
  readonly failure: CatalogFailure;
  readonly type: 'request-failed';
}

type CatalogDiscoveryAction =
  | CatalogRequestStartedAction
  | CatalogRequestSucceededAction
  | CatalogRequestFailedAction;

function catalogDiscoveryReducer(
  previous: CatalogDiscoveryState,
  action: CatalogDiscoveryAction,
): CatalogDiscoveryState {
  switch (action.type) {
    case 'request-started':
      return previous.data
        ? { data: previous.data, status: 'refreshing' }
        : { status: 'initial-loading' };
    case 'request-succeeded':
      return {
        data: action.data,
        status: action.data.items.length === 0 ? 'empty' : 'populated',
      };
    case 'request-failed':
      return previous.data
        ? { data: previous.data, failure: action.failure, status: 'error-with-results' }
        : { failure: action.failure, status: 'error-without-results' };
  }
}

export function useCatalogDiscovery(query: CatalogQuery, request: CatalogRequester) {
  const [state, dispatch] = useReducer(catalogDiscoveryReducer, { status: 'initial-loading' });
  const [retrySequence, setRetrySequence] = useState(0);
  const requestSequence = useRef(0);
  const queryKey = catalogQueryKey(query);
  const normalizedQuery = useMemo(() => parseCatalogQuery(new URLSearchParams(queryKey)), [queryKey]);

  useEffect(() => {
    const controller = new AbortController();
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    dispatch({ type: 'request-started' });

    void requestCatalog(request, normalizedQuery, controller.signal).then((data) => {
      if (controller.signal.aborted || requestSequence.current !== sequence) return;
      dispatch({ data, type: 'request-succeeded' });
    }).catch((error: unknown) => {
      if (controller.signal.aborted || requestSequence.current !== sequence) return;
      const failure = catalogFailure(error);
      if (!failure) return;
      dispatch({ failure, type: 'request-failed' });
    });

    return () => controller.abort();
  }, [normalizedQuery, request, retrySequence]);

  const retry = useCallback(() => setRetrySequence((value) => value + 1), []);
  return { ...state, retry };
}
