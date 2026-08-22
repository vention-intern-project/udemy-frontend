// @vitest-environment jsdom

import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { createAppQueryClient } from '../../../src/app/query';
import { cartFailureState, useCartWorkflow } from '../../../src/features/cart-workflow';
import {
  SessionProvider,
  useSession,
  type AccessTokenStore,
  type SessionContextValue,
} from '../../../src/features/auth-session';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../../src/shared/api';
import { localeRuntime } from '../../../src/shared/locale';

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const cartWithItems = {
  id: 1,
  items: [
    {
      id: 10,
      course_id: 7,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 7, title: 'Long accessible course title', price: '19.990', currency: 'USD' },
    },
  ],
  total_price: '19.990',
  currency: 'USD',
  item_count: 1,
};

function tokenStore(): AccessTokenStore {
  let value: string | null = 'student-token';
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
    clear: () => {
      value = null;
    },
  };
}

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  return options.decode ? options.decode(value) : (value as TResponse);
}

interface SessionCaptureProps {
  onSession(session: SessionContextValue): void;
}

function SessionCapture({ onSession }: SessionCaptureProps) {
  onSession(useSession());
  return null;
}

function createWorkflowHarness(request: ApiClient['request']) {
  const queryClient = createAppQueryClient();
  const client: ApiClient = { request };
  let session: SessionContextValue | null = null;

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={client} tokenStore={tokenStore()}>
          <SessionCapture
            onSession={(value) => {
              session = value;
            }}
          />
          {children}
        </SessionProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    Wrapper,
    clearSession: () => {
      if (!session) throw new Error('Session was not initialized');
      session.clearSession();
    },
  };
}

describe('cart workflow recovery projection', () => {
  it.each([
    [
      'load invalid response',
      new ApiError({ kind: 'invalid_response', status: 200, message: 'private' }),
      'load',
      'cart:cartDataUnavailable',
      'common:serverReturnedAnInvalidResponseTryAgain',
    ],
    [
      'remove missing item',
      new ApiError({ kind: 'not_found', status: 404, message: 'private' }),
      'remove',
      'cart:cartChanged',
      'cart:courseNoLongerInCart',
    ],
    [
      'clear unavailable',
      new ApiError({ kind: 'server', status: 503, message: 'private' }),
      'clear',
      'cart:unableToUpdateCart',
      'common:pleaseTryAgain',
    ],
    [
      'synchronization failure',
      new ApiError({ kind: 'server', status: 503, message: 'private' }),
      'synchronization',
      'cart:cartUpdateNeedsRefresh',
      'cart:cartChangedLatestCouldNotLoad',
    ],
  ] as const)(
    'keeps $0 locale-neutral while every locale resolves its semantic copy',
    async (_name, error, operation, titleKey, messageKey) => {
      const failure = cartFailureState(error, operation);
      expect(failure).toMatchObject({ titleKey, messageKey });
      for (const locale of ['en', 'ru', 'uz'] as const) {
        await localeRuntime.changeLanguage(locale);
        expect(localeRuntime.t(failure.titleKey)).not.toBe(failure.titleKey.split(':')[1]);
        expect(localeRuntime.t(failure.messageKey)).not.toBe(failure.messageKey.split(':')[1]);
        expect(localeRuntime.t(failure.titleKey)).not.toContain('private');
        expect(localeRuntime.t(failure.messageKey)).not.toContain('private');
      }
      await localeRuntime.changeLanguage('en');
    },
  );

  it('keeps a missing remove action recoverable as a concurrent cart change', () => {
    expect(
      cartFailureState(
        new ApiError({ kind: 'not_found', status: 404, message: 'private' }),
        'remove',
      ),
    ).toMatchObject({ concurrentChange: true, action: { kind: 'retry' } });
  });

  it('keeps malformed cart success distinct from empty state', () => {
    expect(
      cartFailureState(
        new ApiError({ kind: 'invalid_response', status: 200, message: 'private' }),
        'load',
      ),
    ).toMatchObject({ titleKey: 'cart:cartDataUnavailable', action: { kind: 'retry' } });
  });

  it('keeps an authenticated forbidden cart on a safe non-login recovery path', () => {
    expect(
      cartFailureState(
        new ApiError({ kind: 'forbidden', status: 403, message: 'private' }),
        'load',
      ),
    ).toMatchObject({ titleKey: 'cart:cartUnavailable', action: { kind: 'catalog' } });
  });

  it('maps a session-expired cart request to the login recovery action', () => {
    expect(
      cartFailureState(
        new ApiError({ kind: 'unauthorized', status: 401, message: 'private' }),
        'load',
      ),
    ).toMatchObject({ titleKey: 'cart:sessionExpired', action: { kind: 'login' } });
  });

  it('does not commit stale remove feedback after the public session changes', async () => {
    let resolveRemove: (() => void) | undefined;
    const pendingRemove = new Promise<void>((resolve) => {
      resolveRemove = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      if (options.path === '/cart/items/7') {
        await pendingRemove;
        return decode(options, undefined);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    const harness = createWorkflowHarness(request);
    const { result: hook } = renderHook(() => useCartWorkflow(), { wrapper: harness.Wrapper });

    await waitFor(() => expect(hook.current.cart.data?.itemCount).toBe(1));
    act(() => {
      hook.current.remove(7);
    });
    await waitFor(() => expect(hook.current.isBusy).toBe(true));
    act(harness.clearSession);
    await waitFor(() => expect(hook.current.cart.data).toBeUndefined());
    await act(async () => {
      resolveRemove?.();
    });

    await waitFor(() => expect(hook.current.isBusy).toBe(false));
    expect(hook.current.feedback).toBeNull();
    expect(
      harness.queryClient
        .getQueryCache()
        .getAll()
        .some((query) => query.queryKey[0] === 'private' && query.queryKey[1] === 'anonymous'),
    ).toBe(false);
  });
});
