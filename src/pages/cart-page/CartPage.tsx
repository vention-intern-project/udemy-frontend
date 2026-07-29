import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldX, Trash2 } from 'lucide-react';

import { cartFailureState, useCartWorkflow, type CartFailureState } from '@features/cart-workflow';
import { useCheckoutCart, type CartRecovery, type CheckoutFeedback } from '@features/checkout-cart';
import type { Cart } from '@entities/cart';
import {
  Button,
  DestructiveConfirmation,
  Notice,
  Skeleton,
  SkeletonGroup,
  VisuallyHidden,
} from '@shared/ui/primitives';

import styles from './CartPage.module.css';

interface CartRecoveryActionProps {
  failure: CartFailureState;
  onRetry(): Promise<boolean>;
  onRetryStart?(): boolean;
  onRetryFinished?(recovered: boolean): void;
  retrying?: boolean;
}

interface RemoveFocusTarget {
  removedCourseId: number;
  index: number;
}

interface CheckoutFeedbackNoticeProps {
  readonly feedback: CheckoutFeedback | null;
  readonly pending: boolean;
  onRecoverCheckout(): void;
}

function CheckoutFeedbackNotice({
  feedback,
  pending,
  onRecoverCheckout,
}: CheckoutFeedbackNoticeProps) {
  if (feedback === null) return null;
  if (feedback.kind === 'checkout_accepted')
    return (
      <Notice tone="info" title="Checkout accepted">
        <p>Mock checkout was accepted. Payment is pending; continue in My Learning.</p>
        <Link to="/learning">Check My Learning</Link>
      </Notice>
    );
  if (feedback.kind === 'recovery_required')
    return (
      <Notice tone="error" title="Checkout status needs checking">
        <p>We could not confirm checkout. Check the cart status for updated guidance.</p>
        <Button variant="secondary" disabled={pending} onClick={onRecoverCheckout}>
          Check checkout status
        </Button>
      </Notice>
    );
  if (feedback.kind === 'checkout_status_unknown')
    return (
      <Notice tone="error" title="Checkout status remains unknown">
        <p>
          Your cart still cannot prove whether checkout partially completed. Check My Learning
          before taking another checkout action.
        </p>
        <Link to="/learning">Check My Learning</Link>
      </Notice>
    );
  if (feedback.kind === 'unauthorized')
    return (
      <Notice tone="error" title="Sign in required">
        <p>Sign in again before continuing checkout.</p>
        <Link to={`/login?returnTo=${encodeURIComponent('/cart')}`}>Log in</Link>
      </Notice>
    );
  if (feedback.kind === 'not_authorized')
    return (
      <Notice tone="error" title="Checkout unavailable">
        <p>This checkout is not available for the current account.</p>
      </Notice>
    );
  if (feedback.kind === 'conflict')
    return (
      <Notice tone="error" title="Enrollment changed">
        <p>Your enrollment changed. Check My Learning before taking another action.</p>
        <Link to="/learning">Check My Learning</Link>
      </Notice>
    );
  if (feedback.kind === 'cart_changed')
    return (
      <Notice tone="error" title="Cart changed">
        <p>Your cart is no longer ready for this checkout. Refresh it before trying again.</p>
      </Notice>
    );
  return (
    <Notice tone="error" title="Checkout unavailable">
      <p>Checkout is currently unavailable. Try again later.</p>
    </Notice>
  );
}

function CartRecoveryAction({
  failure,
  onRetry,
  onRetryStart,
  onRetryFinished,
  retrying = false,
}: CartRecoveryActionProps) {
  if (failure.action.kind === 'login')
    return <Link to={`/login?returnTo=${encodeURIComponent('/cart')}`}>Log in</Link>;
  if (failure.action.kind === 'catalog')
    return (
      <Link className={styles.catalogLink} to="/">
        Browse courses
      </Link>
    );
  return (
    <Button
      variant="secondary"
      disabled={retrying}
      onClick={() => {
        if (onRetryStart && !onRetryStart()) return;
        void onRetry().then(onRetryFinished);
      }}
    >
      Refresh cart
    </Button>
  );
}

function mutationStatusMessage(
  success: boolean | undefined,
  kind: 'remove' | 'clear' | undefined,
): string {
  if (!success) return '';
  return kind === 'clear' ? 'Cart cleared.' : 'Course removed from cart.';
}

function hasSingleCartCurrency(cart: Cart): boolean {
  return cart.items.every((item) => item.course.currency === cart.currency);
}

export function CartPage() {
  const { cart, clear, feedback, isBusy, isPendingClear, isPendingRemove, remove, retry } =
    useCartWorkflow();
  const checkout = useCheckoutCart('cart');
  const [clearOpen, setClearOpen] = useState(false);
  const [removeFocusTarget, setRemoveFocusTarget] = useState<RemoveFocusTarget | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const removeActionRefs = useRef(new Map<number, HTMLDivElement>());
  const recoveryFocusPendingRef = useRef(false);
  const recoveryRetryPendingRef = useRef(false);
  const [recoveryFailure, setRecoveryFailure] = useState<CartFailureState | null>(null);
  const [isRecoveryRetrying, setIsRecoveryRetrying] = useState(false);
  const checkoutNoticeRef = useRef<HTMLDivElement>(null);
  const statusMessage = mutationStatusMessage(feedback?.success, feedback?.kind);
  const currentCart = cart.data;
  const checkoutRecovery: CartRecovery = {
    refetchCart: async (): Promise<Cart> => {
      const result = await cart.refetch({ throwOnError: true });
      if (!result.data) throw new Error('Cart recovery did not return cart data');
      return result.data;
    },
  };

  useLayoutEffect(() => {
    if (!recoveryFocusPendingRef.current || !cart.isSuccess || !currentCart) return;
    headingRef.current?.focus();
    recoveryFocusPendingRef.current = false;
  }, [cart.isSuccess, currentCart]);

  useLayoutEffect(() => {
    if (!feedback?.success || !currentCart || isBusy) return;
    if (feedback.kind === 'clear' && currentCart.items.length === 0) {
      headingRef.current?.focus();
      return;
    }
    if (feedback.kind !== 'remove') return;

    const target = removeFocusTarget;
    if (!target || currentCart.items.some((item) => item.courseId === target.removedCourseId))
      return;
    const nextItem = currentCart.items[target.index] ?? currentCart.items[target.index - 1];
    if (nextItem) {
      const trackedAction = removeActionRefs.current
        .get(nextItem.courseId)
        ?.querySelector<HTMLButtonElement>('button');
      const action = trackedAction?.isConnected
        ? trackedAction
        : document.querySelector<HTMLButtonElement>(
            `[data-cart-remove-course-id="${nextItem.courseId}"]`,
          );
      action?.focus();
    } else headingRef.current?.focus();
    setRemoveFocusTarget(null);
  }, [currentCart, feedback, isBusy, removeFocusTarget]);

  useEffect(() => {
    if (checkout.feedback !== null && !checkout.pending) checkoutNoticeRef.current?.focus();
  }, [checkout.feedback, checkout.pending]);

  if (!cart.data && checkout.feedback?.kind === 'unauthorized') {
    return (
      <section className={styles.state} aria-labelledby="cart-sign-in-heading">
        <h1 id="cart-sign-in-heading" ref={headingRef} tabIndex={-1}>
          Cart
        </h1>
        <div ref={checkoutNoticeRef} tabIndex={-1}>
          <CheckoutFeedbackNotice
            feedback={checkout.feedback}
            pending={checkout.pending}
            onRecoverCheckout={checkout.recoverCheckout}
          />
        </div>
      </section>
    );
  }

  if (!cart.data && cart.isPending && !isRecoveryRetrying) {
    return (
      <SkeletonGroup className={styles.loading} label="Loading cart">
        <Skeleton height="40px" width="48%" />
        <Skeleton height="180px" width="100%" shape="rect" />
      </SkeletonGroup>
    );
  }
  const initialLoadFailure = !cart.data
    ? cart.isError
      ? cartFailureState(cart.error, 'load')
      : recoveryFailure
    : null;
  if (initialLoadFailure) {
    return (
      <section className={styles.state} aria-labelledby="cart-heading">
        <h1 id="cart-heading" ref={headingRef} tabIndex={-1}>
          Cart
        </h1>
        <Notice tone="error" title={initialLoadFailure.title}>
          {initialLoadFailure.message}
        </Notice>
        <CartRecoveryAction
          failure={initialLoadFailure}
          onRetry={retry}
          retrying={isRecoveryRetrying}
          onRetryStart={() => {
            if (recoveryRetryPendingRef.current) return false;
            recoveryRetryPendingRef.current = true;
            recoveryFocusPendingRef.current = true;
            setRecoveryFailure(initialLoadFailure);
            setIsRecoveryRetrying(true);
            return true;
          }}
          onRetryFinished={(recovered) => {
            recoveryRetryPendingRef.current = false;
            setIsRecoveryRetrying(false);
            if (!recovered) recoveryFocusPendingRef.current = false;
          }}
        />
      </section>
    );
  }
  if (!currentCart || currentCart.items.length === 0) {
    return (
      <section
        className={[styles.state, styles.emptyState].join(' ')}
        aria-labelledby="cart-empty-heading"
      >
        <VisuallyHidden as="p" role="status" aria-live="polite">
          {statusMessage}
        </VisuallyHidden>
        <h1 id="cart-empty-heading" ref={headingRef} tabIndex={-1}>
          Your cart is empty
        </h1>
        <div ref={checkoutNoticeRef} tabIndex={-1}>
          <CheckoutFeedbackNotice
            feedback={checkout.feedback}
            pending={checkout.pending}
            onRecoverCheckout={checkout.recoverCheckout}
          />
        </div>
        <p>Add a course from the catalog when you are ready to learn.</p>
        <Link className={styles.catalogLink} to="/">
          Browse courses
        </Link>
      </section>
    );
  }
  const loadFailure = cart.isError ? cartFailureState(cart.error, 'load') : null;
  const removeFailure = feedback?.kind === 'remove' && !feedback.success ? feedback.failure : null;
  const clearFailure = feedback?.kind === 'clear' && !feedback.success ? feedback.failure : null;
  const canDisplayTotal = hasSingleCartCurrency(currentCart);
  return (
    <article className={styles.page} aria-busy={isBusy || checkout.pending}>
      <VisuallyHidden as="p" role="status" aria-live="polite">
        {statusMessage}
      </VisuallyHidden>
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          Student workspace
          <ChevronRight size={16} aria-hidden="true" />
        </p>
        <div className={styles.toolbar}>
          <div className={styles.titleRow}>
            <h1 ref={headingRef} tabIndex={-1}>
              Cart
            </h1>
            <p>
              {currentCart.itemCount} course{currentCart.itemCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            variant="secondary"
            className={styles.clearCartButton}
            onClick={() => setClearOpen(true)}
            disabled={isBusy || checkout.pending}
          >
            <span className={styles.clearCartLabel}>
              <Trash2 size={20} aria-hidden="true" />
              <span>Clear cart</span>
            </span>
          </Button>
        </div>
      </header>
      <div ref={checkoutNoticeRef} tabIndex={-1}>
        <CheckoutFeedbackNotice
          feedback={checkout.feedback}
          pending={checkout.pending}
          onRecoverCheckout={checkout.recoverCheckout}
        />
      </div>
      {loadFailure ? (
        <Notice tone="error" title={loadFailure.title}>
          {loadFailure.message} <CartRecoveryAction failure={loadFailure} onRetry={retry} />
        </Notice>
      ) : null}
      {removeFailure ? (
        <Notice tone="error" title={removeFailure.title}>
          {removeFailure.message} <CartRecoveryAction failure={removeFailure} onRetry={retry} />
        </Notice>
      ) : null}
      {clearFailure ? (
        <Notice tone="error" title={clearFailure.title}>
          {clearFailure.message} <CartRecoveryAction failure={clearFailure} onRetry={retry} />
        </Notice>
      ) : null}
      <div className={styles.content}>
        <div className={styles.courseList}>
          <div className={styles.items} role="list" aria-label="Cart courses">
            {currentCart.items.map((item, index) => (
              <section className={styles.item} key={item.id} role="listitem">
                <Link
                  className={styles.preview}
                  to={`/courses/${item.courseId}`}
                  aria-label={`Preview ${item.course.title}`}
                >
                  <span aria-hidden="true">Course preview</span>
                </Link>
                <div className={styles.courseInfo}>
                  <p className={styles.label}>Course</p>
                  <h2>
                    <Link className={styles.courseLink} to={`/courses/${item.courseId}`}>
                      {item.course.title}
                    </Link>
                  </h2>
                </div>
                <div className={styles.price}>
                  <p className={styles.label}>Price</p>
                  <p>
                    {item.course.currency} {item.course.price}
                  </p>
                </div>
                <div
                  className={styles.removeAction}
                  ref={(node) => {
                    if (node) removeActionRefs.current.set(item.courseId, node);
                    else removeActionRefs.current.delete(item.courseId);
                  }}
                >
                  <Button
                    variant="ghost"
                    className={styles.removeButton}
                    aria-label={
                      isPendingRemove(item.courseId) ? undefined : `Remove ${item.course.title}`
                    }
                    data-cart-remove-course-id={item.courseId}
                    onClick={() => {
                      setRemoveFocusTarget({ removedCourseId: item.courseId, index });
                      remove(item.courseId);
                    }}
                    disabled={isBusy}
                    state={isPendingRemove(item.courseId) ? 'loading' : 'idle'}
                    loadingLabel="Removing…"
                  >
                    <Trash2 size={20} aria-hidden="true" />
                  </Button>
                </div>
              </section>
            ))}
          </div>
        </div>
        <aside className={styles.summary} aria-label="Cart total">
          <h2 className={styles.summaryHeading}>Order summary</h2>
          <hr className={styles.summaryDivider} />
          <span className={styles.label}>Total</span>
          {canDisplayTotal ? (
            <strong>
              {currentCart.currency} {currentCart.totalPrice}
            </strong>
          ) : (
            <strong className={styles.totalUnavailable}>Total unavailable</strong>
          )}
          <Button
            fullWidth
            onClick={() => checkout.checkout(checkoutRecovery)}
            disabled={isBusy || checkout.pending || checkout.checkoutBlocked}
            state={checkout.pending ? 'loading' : 'idle'}
            loadingLabel="Checking out…"
          >
            Mock checkout
          </Button>
          <p className={styles.mockCheckoutDisclosure}>
            <ShieldX size={20} aria-hidden="true" />
            <span>Insecure checkout</span>
          </p>
        </aside>
      </div>
      <DestructiveConfirmation
        open={clearOpen}
        title="Clear cart?"
        description="This removes every course from your cart. You can add courses again from the catalog."
        confirmLabel="Clear cart"
        confirming={isPendingClear()}
        error={clearFailure?.message}
        onCancel={() => {
          if (!isBusy) setClearOpen(false);
        }}
        onConfirm={clear}
      />
    </article>
  );
}
