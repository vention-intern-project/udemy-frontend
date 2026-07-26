// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';

import { createAppQueryClient } from '../../../src/app/query';
import type { Cart } from '../../../src/entities/cart';
import { type CartRecovery, type CheckoutScope, type EnrollmentStatusRefresh, useCheckoutCart } from '../../../src/features/checkout-cart';
import { SessionProvider, type AccessTokenStore } from '../../../src/features/auth-session';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../../src/shared/api';

const student = { email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student', birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z' };
const cart: Cart = {
  id: 1,
  items: [{ id: 10, courseId: 7, addedAt: '2026-01-01T00:00:00Z', course: { id: 7, title: 'Checkout test course', price: '19.99', currency: 'USD' } }],
  totalPrice: '19.99', currency: 'USD', itemCount: 1,
};

function tokenStore(): AccessTokenStore {
  return { get: () => 'student-token', set: () => {}, clear: () => {} };
}

function decode<TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>, value: unknown): TResponse {
  return options.decode ? options.decode(value) : value as TResponse;
}

interface CheckoutProbeProps {
  readonly scope: CheckoutScope;
  readonly recovery: CartRecovery;
  readonly refresh: EnrollmentStatusRefresh;
}

function CheckoutProbe({ scope, recovery, refresh }: CheckoutProbeProps) {
  const workflow = useCheckoutCart(scope);
  return <section aria-busy={workflow.pending}>
    <output>{workflow.pending ? 'pending' : 'idle'}</output>
    {scope === 'cart'
      ? <button type="button" onClick={() => workflow.checkout(recovery)}>Checkout</button>
      : <button type="button" onClick={() => workflow.completeMockPayment(4, 'success', refresh)}>Pay</button>}
  </section>;
}

interface PaymentLockProbeProps {
  readonly refresh: EnrollmentStatusRefresh;
}

function PaymentLockProbe({ refresh }: PaymentLockProbeProps) {
  const workflow = useCheckoutCart('enrollment:4');
  return <section aria-busy={workflow.pending}>
    <output>{workflow.pending ? 'pending' : 'idle'}</output>
    <output>{workflow.paymentActionsLocked ? 'locked' : 'unlocked'}</output>
    <output>{workflow.feedback?.kind ?? 'no feedback'}</output>
    <button type="button" onClick={() => workflow.completeMockPayment(4, 'success', refresh)}>Success</button>
    <button type="button" onClick={() => workflow.completeMockPayment(4, 'failed', refresh)}>Failure</button>
    <button type="button" onClick={() => workflow.checkPaymentStatus(4, refresh)}>Check status</button>
  </section>;
}

afterEach(() => cleanup());

describe('useCheckoutCart', () => {
  it('keeps a newer scope attempt locked when an older checkout settles late', async () => {
    let resolveCheckout: ((value: unknown) => void) | undefined;
    let resolvePayment: ((value: unknown) => void) | undefined;
    const checkoutPromise = new Promise<unknown>((resolve) => { resolveCheckout = resolve; });
    const paymentPromise = new Promise<unknown>((resolve) => { resolvePayment = resolve; });
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart/checkout') return decode(options, await checkoutPromise);
      if (options.path === '/payments/complete') return decode(options, await paymentPromise);
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    const recovery: CartRecovery = { refetchCart: async () => cart };
    const refresh: EnrollmentStatusRefresh = { refetchEnrollment: async () => 'active' };
    const queryClient = createAppQueryClient();
    const store = tokenStore();
    const view = render(<QueryClientProvider client={queryClient}><SessionProvider client={{ request }} tokenStore={store}><CheckoutProbe scope="cart" recovery={recovery} refresh={refresh} /></SessionProvider></QueryClientProvider>);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Checkout' })).toBeTruthy());
    await act(async () => { screen.getByRole('button', { name: 'Checkout' }).click(); });
    await waitFor(() => expect(screen.getByText('pending')).toBeTruthy());

    await act(async () => {
      view.rerender(<QueryClientProvider client={queryClient}><SessionProvider client={{ request }} tokenStore={store}><CheckoutProbe scope="enrollment:4" recovery={recovery} refresh={refresh} /></SessionProvider></QueryClientProvider>);
    });
    await waitFor(() => expect(screen.getByText('idle')).toBeTruthy());
    await act(async () => { screen.getByRole('button', { name: 'Pay' }).click(); });
    await waitFor(() => expect(screen.getByText('pending')).toBeTruthy());

    await act(async () => { resolveCheckout?.({ message: 'Checkout successful.', enrolled_courses: 1 }); });
    expect(screen.getByText('pending')).toBeTruthy();

    await act(async () => { resolvePayment?.({ enrollment_id: 4, status: 'active', message: 'Payment successful.' }); });
    await waitFor(() => expect(screen.getByText('idle')).toBeTruthy());
  });

  it('blocks both payment outcomes until pending reconciliation proves the unknown payment did not settle', async () => {
    let paymentPosts = 0;
    let sessionReads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') {
        sessionReads += 1;
        return decode(options, student);
      }
      if (options.path === '/payments/complete') {
        paymentPosts += 1;
        throw new ApiError({ kind: 'invalid_response', status: 200, message: 'invalid success response' });
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    const refresh: EnrollmentStatusRefresh = {
      refetchEnrollment: async () => {
        return 'pending_payment';
      },
    };
    const queryClient = createAppQueryClient();
    render(<QueryClientProvider client={queryClient}><SessionProvider client={{ request }} tokenStore={tokenStore()}><PaymentLockProbe refresh={refresh} /></SessionProvider></QueryClientProvider>);

    await waitFor(() => expect(sessionReads).toBe(1));
    await act(async () => { screen.getByRole('button', { name: 'Success' }).click(); });
    await waitFor(() => expect(screen.getByText('payment_status_unknown')).toBeTruthy());
    expect(screen.getByText('locked')).toBeTruthy();

    await act(async () => {
      screen.getByRole('button', { name: 'Success' }).click();
      screen.getByRole('button', { name: 'Failure' }).click();
    });
    expect(paymentPosts).toBe(1);

    await act(async () => { screen.getByRole('button', { name: 'Check status' }).click(); });
    await waitFor(() => expect(screen.getByText('payment_pending')).toBeTruthy());
    expect(screen.getByText('unlocked')).toBeTruthy();
    expect(paymentPosts).toBe(1);
  });
});
