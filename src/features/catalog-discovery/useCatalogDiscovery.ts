import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogCourseList } from '@entities/course';

import { catalogFailure, catalogQueryKey, requestCatalog, type CatalogFailure, type CatalogRequester } from './api';
import { parseCatalogQuery, type CatalogQuery } from './query';

export interface CatalogDiscoveryState {
  data?: CatalogCourseList;
  failure?: CatalogFailure;
  status: 'initial-loading' | 'populated' | 'empty' | 'refreshing' | 'error-without-results' | 'error-with-results';
}

export function useCatalogDiscovery(query: CatalogQuery, request: CatalogRequester) {
  const [state, setState] = useState<CatalogDiscoveryState>({ status: 'initial-loading' });
  const [retrySequence, setRetrySequence] = useState(0);
  const requestSequence = useRef(0);
  const queryKey = catalogQueryKey(query);
  const normalizedQuery = useMemo(() => parseCatalogQuery(new URLSearchParams(queryKey)), [queryKey]);

  useEffect(() => {
    const controller = new AbortController();
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setState((previous) => previous.data
      ? { data: previous.data, status: 'refreshing' }
      : { status: 'initial-loading' });

    void requestCatalog(request, normalizedQuery, controller.signal).then((data) => {
      if (controller.signal.aborted || requestSequence.current !== sequence) return;
      setState({ data, status: data.items.length === 0 ? 'empty' : 'populated' });
    }).catch((error: unknown) => {
      if (controller.signal.aborted || requestSequence.current !== sequence) return;
      const failure = catalogFailure(error);
      if (!failure) return;
      setState((previous) => previous.data
        ? { data: previous.data, failure, status: 'error-with-results' }
        : { failure, status: 'error-without-results' });
    });

    return () => controller.abort();
  }, [normalizedQuery, request, retrySequence]);

  const retry = useCallback(() => setRetrySequence((value) => value + 1), []);
  return { ...state, retry };
}
