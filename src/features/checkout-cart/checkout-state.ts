import type { Cart, MockPaymentStatusDto } from '@entities/cart';
import type { EnrollmentStatus } from '@entities/enrollment';

export type CheckoutScope = 'cart' | `enrollment:${number}`;

export interface CartRecovery {
  refetchCart(): Promise<Cart>;
}

export interface EnrollmentStatusRefresh {
  refetchEnrollment(): Promise<EnrollmentStatus>;
}

export interface CheckoutAttempt {
  readonly identity: string;
  readonly kind: 'checkout';
  readonly subject: string;
  readonly scope: 'cart';
  readonly recovery: CartRecovery;
}

export interface CheckoutRecoveryAttempt {
  readonly identity: string;
  readonly kind: 'checkout_recovery';
  readonly subject: string;
  readonly scope: 'cart';
  readonly recovery: CartRecovery;
}

export interface MockPaymentAttempt {
  readonly identity: string;
  readonly kind: 'mock_payment';
  readonly subject: string;
  readonly scope: CheckoutScope;
  readonly enrollmentId: number;
  readonly outcome: MockPaymentStatusDto;
  readonly refresh: EnrollmentStatusRefresh;
}

export interface PaymentStatusAttempt {
  readonly identity: string;
  readonly kind: 'payment_status';
  readonly subject: string;
  readonly scope: CheckoutScope;
  readonly enrollmentId: number;
  readonly refresh: EnrollmentStatusRefresh;
}

export interface PaymentActionLock {
  readonly identity: string;
  readonly subject: string;
  readonly scope: CheckoutScope;
  readonly enrollmentId: number;
}

export type CheckoutActiveAttempt = CheckoutAttempt | CheckoutRecoveryAttempt | MockPaymentAttempt | PaymentStatusAttempt;

export interface CheckoutAcceptedFeedback { readonly kind: 'checkout_accepted'; }
export interface CheckoutRecoveryRequiredFeedback { readonly kind: 'recovery_required'; }
export interface CheckoutStatusUnknownFeedback { readonly kind: 'checkout_status_unknown'; }
export interface CheckoutUnauthorizedFeedback { readonly kind: 'unauthorized'; }
export interface CheckoutNotAuthorizedFeedback { readonly kind: 'not_authorized'; }
export interface CheckoutConflictFeedback { readonly kind: 'conflict'; }
export interface CheckoutCartChangedFeedback { readonly kind: 'cart_changed'; }
export interface CheckoutUnavailableFeedback { readonly kind: 'unavailable'; }
export interface PaymentCompletedFeedback { readonly kind: 'payment_completed'; }
export interface PaymentDeclinedFeedback { readonly kind: 'payment_declined'; }
export interface PaymentPendingFeedback { readonly kind: 'payment_pending'; }
export interface PaymentStatusUnknownFeedback { readonly kind: 'payment_status_unknown'; }

export type CheckoutFeedback =
  | CheckoutAcceptedFeedback
  | CheckoutRecoveryRequiredFeedback
  | CheckoutStatusUnknownFeedback
  | CheckoutUnauthorizedFeedback
  | CheckoutNotAuthorizedFeedback
  | CheckoutConflictFeedback
  | CheckoutCartChangedFeedback
  | CheckoutUnavailableFeedback
  | PaymentCompletedFeedback
  | PaymentDeclinedFeedback
  | PaymentPendingFeedback
  | PaymentStatusUnknownFeedback;

export interface CheckoutWorkflow {
  readonly pending: boolean;
  readonly checkoutBlocked: boolean;
  readonly paymentActionsLocked: boolean;
  readonly feedback: CheckoutFeedback | null;
  checkout(recovery: CartRecovery): void;
  recoverCheckout(): void;
  completeMockPayment(enrollmentId: number, outcome: MockPaymentStatusDto, refresh: EnrollmentStatusRefresh): void;
  checkPaymentStatus(enrollmentId: number, refresh: EnrollmentStatusRefresh): void;
}
