import { decodeCheckoutDto, decodeMockPaymentCompleteDto, type CheckoutDto, type MockPaymentCompleteDto, type MockPaymentStatusDto } from '@entities/cart';
import { requestOperation, type SessionContextValue } from '@features/auth-session';

export function requestCheckout(session: SessionContextValue): Promise<CheckoutDto> {
  return requestOperation(session, 'API-004', { path: '/cart/checkout', dedupeKey: 'checkout:cart', decode: decodeCheckoutDto });
}

export function requestMockPaymentCompletion(session: SessionContextValue, enrollmentId: number, status: MockPaymentStatusDto): Promise<MockPaymentCompleteDto> {
  return requestOperation(session, 'API-034', { path: '/payments/complete', body: { enrollment_id: enrollmentId, status }, dedupeKey: `payment:${enrollmentId}:${status}`, decode: decodeMockPaymentCompleteDto });
}
