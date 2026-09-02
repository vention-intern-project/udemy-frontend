import { useEffect, useRef, useState } from 'react';

import { requestCatalogMaximumPrice, type CatalogRequester } from './api';

export interface CatalogMaximumPriceState {
  readonly maximumPrice?: string;
}

interface CatalogMaximumPriceResolvedCacheEntry {
  readonly kind: 'resolved';
  readonly maximumPrice: string | undefined;
}

interface CatalogMaximumPriceInFlightCacheEntry {
  abortScheduled: boolean;
  readonly controller: AbortController;
  readonly kind: 'in-flight';
  readonly price: Promise<string | undefined>;
  subscribers: number;
}

type CatalogMaximumPriceRequestCacheEntry =
  | CatalogMaximumPriceInFlightCacheEntry
  | CatalogMaximumPriceResolvedCacheEntry;

interface CatalogMaximumPriceSubscription {
  readonly price: Promise<string | undefined>;
  release(): void;
}

const maximumPriceRequestCache = new WeakMap<
  CatalogRequester,
  Map<string, CatalogMaximumPriceRequestCacheEntry>
>();

function cacheForSession(
  request: CatalogRequester,
): Map<string, CatalogMaximumPriceRequestCacheEntry> {
  let sessionCache = maximumPriceRequestCache.get(request);
  if (!sessionCache) {
    sessionCache = new Map();
    maximumPriceRequestCache.set(request, sessionCache);
  }
  return sessionCache;
}

function createMaximumPriceRequest(
  sessionCache: Map<string, CatalogMaximumPriceRequestCacheEntry>,
  sessionKey: string,
  request: CatalogRequester,
): CatalogMaximumPriceInFlightCacheEntry {
  const controller = new AbortController();
  const entry: CatalogMaximumPriceInFlightCacheEntry = {
    abortScheduled: false,
    controller,
    kind: 'in-flight',
    price: requestCatalogMaximumPrice(request, controller.signal),
    subscribers: 0,
  };
  void entry.price.then(
    (maximumPrice) => {
      if (sessionCache.get(sessionKey) !== entry || entry.subscribers === 0) return;
      sessionCache.set(sessionKey, { kind: 'resolved', maximumPrice });
    },
    () => {
      if (sessionCache.get(sessionKey) === entry) sessionCache.delete(sessionKey);
    },
  );
  sessionCache.set(sessionKey, entry);
  return entry;
}

function subscribeToMaximumPrice(
  request: CatalogRequester,
  sessionKey: string,
): CatalogMaximumPriceSubscription {
  const sessionCache = cacheForSession(request);
  const cached = sessionCache.get(sessionKey);
  if (cached?.kind === 'resolved') {
    return { price: Promise.resolve(cached.maximumPrice), release: () => undefined };
  }

  const entry =
    cached?.kind === 'in-flight'
      ? cached
      : createMaximumPriceRequest(sessionCache, sessionKey, request);
  entry.subscribers += 1;
  entry.abortScheduled = false;
  let released = false;

  return {
    price: entry.price,
    release: () => {
      if (released) return;
      released = true;
      entry.subscribers -= 1;
      if (entry.subscribers !== 0 || entry.abortScheduled) return;
      entry.abortScheduled = true;
      queueMicrotask(() => {
        if (entry.subscribers !== 0 || sessionCache.get(sessionKey) !== entry) return;
        sessionCache.delete(sessionKey);
        entry.controller.abort();
      });
    },
  };
}

export function useCatalogMaximumPrice(
  request: CatalogRequester,
  sessionCacheKey: string | null | undefined = null,
): CatalogMaximumPriceState {
  const [maximumPrice, setMaximumPrice] = useState<string>();
  const requestSequence = useRef(0);
  const cacheKey = sessionCacheKey ?? 'public';

  useEffect(() => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setMaximumPrice(undefined);

    const subscription = subscribeToMaximumPrice(request, cacheKey);
    void subscription.price.then(
      (price) => {
        if (requestSequence.current !== sequence) return;
        setMaximumPrice(price);
      },
      () => {
        if (requestSequence.current !== sequence) return;
        setMaximumPrice(undefined);
      },
    );

    return () => {
      requestSequence.current += 1;
      subscription.release();
    };
  }, [cacheKey, request]);

  return { maximumPrice };
}
