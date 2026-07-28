import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { Cart } from '@entities/cart';
import { useSession, type SessionContextValue } from '@features/auth-session';
import type { SessionCacheEpoch } from '@shared/api';

import { clearCart, removeCartItem, requestCart } from './api';
import { cartFailureState, cartQueryKey, type CartFailureState } from './cart-state';

export type CartMutationKind = 'remove' | 'clear';

export interface CartRemoveAttempt {
  subject: SessionCacheEpoch;
  kind: 'remove';
  courseId: number;
  identity: string;
}

export interface CartClearAttempt {
  subject: SessionCacheEpoch;
  kind: 'clear';
  identity: string;
}

export type CartMutationAttempt = CartRemoveAttempt | CartClearAttempt;

export interface CartRemoveFeedback {
  kind: 'remove';
  success: boolean;
  failure?: CartFailureState;
}

export interface CartClearFeedback {
  kind: 'clear';
  success: boolean;
  failure?: CartFailureState;
}

export type CartFeedback = CartRemoveFeedback | CartClearFeedback;

export interface CartWorkflow {
  cart: UseQueryResult<Cart, unknown>;
  feedback: CartFeedback | null;
  isBusy: boolean;
  remove(courseId: number): void;
  clear(): void;
  isPendingRemove(courseId: number): boolean;
  isPendingClear(): boolean;
  retry(): Promise<boolean>;
}

function cartEpoch(session: SessionContextValue): SessionCacheEpoch | null {
  return session.state.status === 'authenticated' && session.state.user.role === 'student'
    ? (session.cacheEpoch ?? null)
    : null;
}

function removeAttempt(subject: SessionCacheEpoch, courseId: number): CartRemoveAttempt {
  return { subject, kind: 'remove', courseId, identity: `${subject}:remove:${courseId}` };
}

function clearAttempt(subject: SessionCacheEpoch): CartClearAttempt {
  return { subject, kind: 'clear', identity: `${subject}:clear:all` };
}

export function useCartWorkflow(): CartWorkflow {
  const session = useSession();
  const queryClient = useQueryClient();
  const subject = cartEpoch(session);
  const [feedback, setFeedback] = useState<CartFeedback | null>(null);
  const activeAttemptRef = useRef<CartMutationAttempt | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<CartMutationAttempt | null>(null);
  const subjectRef = useRef(subject);
  subjectRef.current = subject;
  const cart = useQuery({
    queryKey: subject ? cartQueryKey(subject) : ['disabled', 'cart'],
    queryFn: ({ signal }) => requestCart(session, signal),
    enabled: subject !== null,
  });

  useEffect(() => {
    setFeedback(null);
  }, [subject]);

  const mutation = useMutation<void, unknown, CartMutationAttempt>({
    mutationFn: (attempt) =>
      attempt.kind === 'remove' ? removeCartItem(session, attempt.courseId) : clearCart(session),
    onSuccess: async (_result, attempt) => {
      try {
        await queryClient.invalidateQueries(
          { queryKey: cartQueryKey(attempt.subject), exact: true },
          { throwOnError: true },
        );
        if (subjectRef.current === attempt.subject)
          setFeedback({ kind: attempt.kind, success: true });
      } catch (error) {
        if (subjectRef.current === attempt.subject) {
          setFeedback({
            kind: attempt.kind,
            success: false,
            failure: cartFailureState(error, 'synchronization'),
          });
        }
      }
    },
    onError: (error, attempt) => {
      if (subjectRef.current === attempt.subject)
        setFeedback({
          kind: attempt.kind,
          success: false,
          failure: cartFailureState(error, attempt.kind),
        });
    },
    onSettled: (_result, _error, attempt) => {
      if (activeAttemptRef.current?.identity !== attempt.identity) return;
      activeAttemptRef.current = null;
      setActiveAttempt(null);
    },
  });

  function submit(attempt: CartMutationAttempt) {
    if (activeAttemptRef.current) return;
    activeAttemptRef.current = attempt;
    setActiveAttempt(attempt);
    setFeedback(null);
    mutation.mutate(attempt);
  }

  function isPendingRemove(courseId: number): boolean {
    return activeAttempt?.kind === 'remove' && activeAttempt.courseId === courseId;
  }

  function isPendingClear(): boolean {
    return activeAttempt?.kind === 'clear';
  }

  async function retry(): Promise<boolean> {
    try {
      await cart.refetch({ throwOnError: true });
      setFeedback(null);
      return true;
    } catch {
      return false;
    }
  }

  return {
    cart,
    feedback,
    isBusy: activeAttempt !== null,
    remove: (courseId: number) => {
      if (subject) submit(removeAttempt(subject, courseId));
    },
    clear: () => {
      if (subject) submit(clearAttempt(subject));
    },
    isPendingRemove,
    isPendingClear,
    retry,
  };
}
