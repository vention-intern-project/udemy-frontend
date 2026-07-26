import { ApiError } from '@shared/api';
import { queryKeys } from '@entities/api';

/** The sole private cache identity for API-002 cart data. */
export function cartQueryKey(subject: string) {
  return queryKeys.private.operation(subject, 'API-002', 'cart');
}

export type CartFailureOperation = 'load' | 'remove' | 'clear' | 'synchronization';

export interface RetryCartFailureAction {
  kind: 'retry';
}

export interface LoginCartFailureAction {
  kind: 'login';
}

export interface CatalogCartFailureAction {
  kind: 'catalog';
}

export type CartFailureAction = RetryCartFailureAction | LoginCartFailureAction | CatalogCartFailureAction;

export interface CartFailureState {
  title: string;
  message: string;
  action: CartFailureAction;
  concurrentChange: boolean;
}

export function cartFailureState(error: unknown, operation: CartFailureOperation): CartFailureState {
  if (error instanceof ApiError && error.kind === 'invalid_response') {
    return { title: 'Cart data is unavailable', message: 'The server returned an invalid response. Try again.', action: { kind: 'retry' }, concurrentChange: false };
  }
  if (error instanceof ApiError && error.status === 401) {
    return { title: 'Your session has expired', message: 'Please log in again to view your cart.', action: { kind: 'login' }, concurrentChange: false };
  }
  if (operation === 'remove' && error instanceof ApiError && error.status === 404) {
    return { title: 'Cart changed', message: 'This course is no longer in your cart. Refresh to see the latest cart.', action: { kind: 'retry' }, concurrentChange: true };
  }
  if (error instanceof ApiError && error.status === 403) {
    return { title: 'Cart is unavailable', message: 'You do not have access to this cart.', action: { kind: 'catalog' }, concurrentChange: false };
  }
  if (operation === 'synchronization') {
    return { title: 'Cart update needs a refresh', message: 'Your cart changed, but the latest cart could not be loaded. Refresh to see the current cart.', action: { kind: 'retry' }, concurrentChange: false };
  }
  if (error instanceof ApiError && error.kind === 'offline') {
    return { title: 'You appear to be offline', message: 'Check your connection and try again.', action: { kind: 'retry' }, concurrentChange: false };
  }
  return { title: operation === 'load' ? 'We could not load your cart' : 'Unable to update cart', message: 'Please try again.', action: { kind: 'retry' }, concurrentChange: false };
}
