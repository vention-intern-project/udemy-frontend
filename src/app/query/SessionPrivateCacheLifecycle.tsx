import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@features/auth-session';
import { isPrivateQueryForSubject } from '@shared/api';

export async function cancelAndRemovePrivateQueries(
  queryClient: QueryClient,
  subject: string,
): Promise<void> {
  const predicate = (query: { queryKey: readonly unknown[] }) => (
    isPrivateQueryForSubject(query.queryKey, subject)
  );
  await queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
}

export function SessionPrivateCacheLifecycle() {
  const { state } = useSession();
  const queryClient = useQueryClient();
  const subject = state.status === 'authenticated' ? state.user.email : null;
  const previousSubjectRef = useRef<string | null>(null);
  const cleanupChainRef = useRef(Promise.resolve());

  useEffect(() => {
    const previousSubject = previousSubjectRef.current;
    previousSubjectRef.current = subject;
    if (!previousSubject || previousSubject === subject) return;

    cleanupChainRef.current = cleanupChainRef.current.then(() => (
      cancelAndRemovePrivateQueries(queryClient, previousSubject)
    ));
  }, [queryClient, subject]);

  return null;
}
