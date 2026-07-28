import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@features/auth-session';
import { isPrivateQueryForEpoch, type SessionCacheEpoch } from '@shared/api';

interface PrivateQueryCandidate {
  readonly queryKey: readonly unknown[];
}

export async function cancelAndRemovePrivateQueries(
  queryClient: QueryClient,
  epoch: SessionCacheEpoch,
): Promise<void> {
  const predicate = (query: PrivateQueryCandidate) => isPrivateQueryForEpoch(query.queryKey, epoch);
  await queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
}

export function SessionPrivateCacheLifecycle() {
  const { cacheEpoch: sessionCacheEpoch } = useSession();
  const cacheEpoch = sessionCacheEpoch ?? null;
  const queryClient = useQueryClient();
  const previousEpochRef = useRef<SessionCacheEpoch | null>(null);
  const cleanupChainRef = useRef(Promise.resolve());

  useEffect(() => {
    const previousEpoch = previousEpochRef.current;
    previousEpochRef.current = cacheEpoch;
    if (!previousEpoch || previousEpoch === cacheEpoch) return;

    cleanupChainRef.current = cleanupChainRef.current
      .then(() => cancelAndRemovePrivateQueries(queryClient, previousEpoch))
      .catch(() => undefined);
  }, [cacheEpoch, queryClient]);

  return null;
}
