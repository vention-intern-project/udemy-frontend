import { ApiError, type SessionCacheEpoch } from '@shared/api';
import { queryKeys } from '@entities/api';

/** The sole private cache identity for API-002 cart data. */
export function cartQueryKey(subject: SessionCacheEpoch) {
  return queryKeys.private.operation(subject, 'API-002', 'cart');
}

export type CartFailureOperation = 'load' | 'remove' | 'clear' | 'synchronization';

export type CartFailureTitleKey =
  | 'cart:cartDataUnavailable'
  | 'cart:cartLoadFailed'
  | 'cart:cartUnavailable'
  | 'cart:cartUpdateNeedsRefresh'
  | 'cart:sessionExpired'
  | 'cart:unableToUpdateCart'
  | 'cart:cartChanged'
  | 'common:youAppearOffline';

export type CartFailureMessageKey =
  | 'cart:cartChangedLatestCouldNotLoad'
  | 'cart:courseNoLongerInCart'
  | 'cart:logInAgainToViewCart'
  | 'cart:noAccessToCart'
  | 'common:checkConnectionAndTryAgain'
  | 'common:pleaseTryAgain'
  | 'common:serverReturnedAnInvalidResponseTryAgain';

export interface RetryCartFailureAction {
  kind: 'retry';
}

export interface LoginCartFailureAction {
  kind: 'login';
}

export interface CatalogCartFailureAction {
  kind: 'catalog';
}

export type CartFailureAction =
  | RetryCartFailureAction
  | LoginCartFailureAction
  | CatalogCartFailureAction;

export interface CartFailureState {
  readonly titleKey: CartFailureTitleKey;
  readonly messageKey: CartFailureMessageKey;
  action: CartFailureAction;
  concurrentChange: boolean;
}

export function cartFailureState(
  error: unknown,
  operation: CartFailureOperation,
): CartFailureState {
  if (error instanceof ApiError && error.kind === 'invalid_response') {
    return {
      titleKey: 'cart:cartDataUnavailable',
      messageKey: 'common:serverReturnedAnInvalidResponseTryAgain',
      action: { kind: 'retry' },
      concurrentChange: false,
    };
  }
  if (error instanceof ApiError && error.status === 401) {
    return {
      titleKey: 'cart:sessionExpired',
      messageKey: 'cart:logInAgainToViewCart',
      action: { kind: 'login' },
      concurrentChange: false,
    };
  }
  if (operation === 'remove' && error instanceof ApiError && error.status === 404) {
    return {
      titleKey: 'cart:cartChanged',
      messageKey: 'cart:courseNoLongerInCart',
      action: { kind: 'retry' },
      concurrentChange: true,
    };
  }
  if (error instanceof ApiError && error.status === 403) {
    return {
      titleKey: 'cart:cartUnavailable',
      messageKey: 'cart:noAccessToCart',
      action: { kind: 'catalog' },
      concurrentChange: false,
    };
  }
  if (operation === 'synchronization') {
    return {
      titleKey: 'cart:cartUpdateNeedsRefresh',
      messageKey: 'cart:cartChangedLatestCouldNotLoad',
      action: { kind: 'retry' },
      concurrentChange: false,
    };
  }
  if (error instanceof ApiError && error.kind === 'offline') {
    return {
      titleKey: 'common:youAppearOffline',
      messageKey: 'common:checkConnectionAndTryAgain',
      action: { kind: 'retry' },
      concurrentChange: false,
    };
  }
  return {
    titleKey: operation === 'load' ? 'cart:cartLoadFailed' : 'cart:unableToUpdateCart',
    messageKey: 'common:pleaseTryAgain',
    action: { kind: 'retry' },
    concurrentChange: false,
  };
}
