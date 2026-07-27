import { decodeCartDto, mapCartDto, type Cart } from '@entities/cart';
import type { SessionContextValue } from '@features/auth-session';
import { requestOperation } from '@features/auth-session';

function decodeVoidSuccess(value: unknown): undefined {
  if (value !== undefined) throw new TypeError('Expected an empty success response');
  return undefined;
}

export async function requestCart(session: SessionContextValue, signal: AbortSignal): Promise<Cart> {
  return requestOperation<Cart>(session, 'API-002', {
    path: '/cart', signal, decode: (value) => mapCartDto(decodeCartDto(value)),
  });
}

export async function removeCartItem(session: SessionContextValue, courseId: number): Promise<void> {
  await requestOperation<undefined>(session, 'API-006', {
    path: `/cart/items/${courseId}`,
    dedupeKey: `cart:remove:${courseId}`,
    decode: decodeVoidSuccess,
  });
}

export async function clearCart(session: SessionContextValue): Promise<void> {
  await requestOperation<undefined>(session, 'API-003', {
    path: '/cart', dedupeKey: 'cart:clear', decode: decodeVoidSuccess,
  });
}
