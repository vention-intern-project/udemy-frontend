import { describe, expect, it, vi } from 'vitest';

import { clearCart, removeCartItem, requestCart } from '../../../src/features/cart-workflow';
import type { SessionContextValue } from '../../../src/features/auth-session';
import { ApiError, createApiClient, type ApiRequestOptions } from '../../../src/shared/api';

function sessionWith(request: SessionContextValue['requestRequired']): SessionContextValue {
  return { state: { status: 'anonymous' }, retryBootstrap() {}, acceptAccessToken() {}, clearSession() {}, requestPublic: request, requestOptional: request, requestRequired: request };
}

describe('cart workflow API boundary', () => {
  it('reads the backend cart once and preserves exact decimal strings', async () => {
    const calls: ApiRequestOptions[] = [];
    const request: SessionContextValue['requestRequired'] = async <TResponse, TBody = unknown>(options: ApiRequestOptions<TBody, NoInfer<TResponse>>) => { calls.push(options); return options.decode?.({ id: 2, items: [{ id: 5, course_id: 7, added_at: '2026-01-01T00:00:00Z', course: { id: 7, title: 'Decimal course', price: '19.990', currency: 'USD' } }], total_price: '19.990', currency: 'USD', item_count: 1 }) as TResponse; };
    const cart = await requestCart(sessionWith(request), new AbortController().signal);
    expect(cart).toMatchObject({ totalPrice: '19.990', itemCount: 1 });
    expect(calls[0]).toMatchObject({ path: '/cart', method: 'GET', authPolicy: 'required' });
  });

  it('rejects a cart whose item_count does not match its items', async () => {
    const request = async <TResponse, TBody = unknown>(options: ApiRequestOptions<TBody, NoInfer<TResponse>>) => options.decode?.({ id: 2, items: [], total_price: '0', currency: 'USD', item_count: 1 }) as TResponse;
    await expect(requestCart(sessionWith(request), new AbortController().signal)).rejects.toThrow('Invalid cart item count');
  });

  it('uses exact protected remove and clear operations with void responses', async () => {
    const calls: ApiRequestOptions[] = [];
    const request: SessionContextValue['requestRequired'] = async <TResponse, TBody = unknown>(options: ApiRequestOptions<TBody, NoInfer<TResponse>>) => { calls.push(options); return options.decode?.(undefined) as TResponse; };
    await removeCartItem(sessionWith(request), 7);
    await clearCart(sessionWith(request));
    expect(calls).toEqual([
      expect.objectContaining({ path: '/cart/items/7', method: 'DELETE', authPolicy: 'required', dedupeKey: 'cart:remove:7' }),
      expect.objectContaining({ path: '/cart', method: 'DELETE', authPolicy: 'required', dedupeKey: 'cart:clear' }),
    ]);
    expect(() => calls[0]?.decode?.({ unexpected: true })).toThrow(TypeError);
    expect(() => calls[1]?.decode?.(null)).toThrow(TypeError);
  });

  it.each([
    ['remove', (session: SessionContextValue) => removeCartItem(session, 7)],
    ['clear', (session: SessionContextValue) => clearCart(session)],
  ] as const)('accepts a 204 void response for %s', async (_operation, execute) => {
    const client = createApiClient({ fetch: async () => new Response(null, { status: 204 }) });
    await expect(execute(sessionWith(client.request))).resolves.toBeUndefined();
  });

  it.each([
    ['remove', (session: SessionContextValue) => removeCartItem(session, 7)],
    ['clear', (session: SessionContextValue) => clearCart(session)],
  ] as const)('normalizes unexpected successful JSON for %s without a success path', async (_operation, execute) => {
    const client = createApiClient({
      fetch: async () => new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
    const onSuccess = vi.fn();

    await execute(sessionWith(client.request)).then(onSuccess, () => undefined);

    expect(onSuccess).not.toHaveBeenCalled();
    await expect(execute(sessionWith(client.request))).rejects.toMatchObject({ kind: 'invalid_response', status: 200 } satisfies Partial<ApiError>);
  });
});
