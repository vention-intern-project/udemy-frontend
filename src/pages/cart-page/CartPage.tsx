import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, type To, useLocation } from 'react-router-dom';
import { ChevronLeft, ShieldX, Trash2 } from 'lucide-react';

import { sanitizeInternalReturnTo } from '@features/auth-session';
import { cartFailureState, useCartWorkflow, type CartFailureState } from '@features/cart-workflow';
import { useCheckoutCart, type CartRecovery, type CheckoutFeedback } from '@features/checkout-cart';
import type { Cart } from '@entities/cart';
import {
  Button,
  DestructiveConfirmation,
  Notice,
  Skeleton,
  SkeletonGroup,
  activateContextualNavigationOnSpace,
  ContextualNavigationLink,
  VisuallyHidden,
} from '@shared/ui/primitives';

import styles from './CartPage.module.css';

interface CartRecoveryActionProps {
  failure: CartFailureState;
  onRetry(): Promise<boolean>;
  onRetryStart?(): boolean;
  onRetryFinished?(recovered: boolean): void;
  retrying?: boolean;
  t: TFunction;
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

interface SummaryJumpState {
  readonly isBelowViewport: boolean;
  readonly isMobile: boolean;
}

interface CartNavigationState {
  readonly returnTo?: unknown;
}

interface CartReturnTarget {
  readonly label: string;
  readonly labelKey: string;
  readonly to: To;
}

interface CartReturnRoute {
  readonly label: string;
  readonly labelKey: string;
  readonly path: string;
}

const mobileSummaryQuery = '(max-width: 1023px)';
const cartReturnFallback: CartReturnTarget = {
  label: 'Catalog',
  labelKey: 'navigation:catalog',
  to: '/',
};
const cartReturnRoutes: readonly CartReturnRoute[] = [
  {
    path: '/courses/:courseId',
    label: 'Course details',
    labelKey: 'routes:courseDetailsTitle',
  },
  { path: '/signup', label: 'Create account', labelKey: 'routes:createAccountTitle' },
  { path: '/login', label: 'Log in', labelKey: 'navigation:logIn' },
  {
    path: '/forgot-password',
    label: 'Forgot password',
    labelKey: 'routes:forgotPasswordTitle',
  },
  {
    path: '/reset-password',
    label: 'Reset password',
    labelKey: 'routes:resetPasswordTitle',
  },
  { path: '/learning', label: 'My learning', labelKey: 'navigation:myLearning' },
  {
    path: '/learning/enrollments/:enrollmentId',
    label: 'Learning details',
    labelKey: 'routes:learningDetailsTitle',
  },
  {
    path: '/learning/enrollments/:enrollmentId/ai-chat',
    label: 'Course assistant',
    labelKey: 'routes:courseAssistantTitle',
  },
  { path: '/ai-chat', label: 'AI assistant', labelKey: 'routes:aiAssistantTitle' },
  {
    path: '/instructor/courses',
    label: 'Instructor courses',
    labelKey: 'navigation:instructorCourses',
  },
  {
    path: '/instructor/courses/:courseId/edit',
    label: 'Edit course',
    labelKey: 'routes:editCourseTitle',
  },
  {
    path: '/instructor/courses/:courseId/enrollments',
    label: 'Course enrollments',
    labelKey: 'routes:courseEnrollmentsTitle',
  },
  {
    path: '/instructor/lessons/:lessonId/edit',
    label: 'Edit lesson',
    labelKey: 'routes:editLessonTitle',
  },
];

function cartReturnTarget(state: unknown): CartReturnTarget {
  const candidate = (state as CartNavigationState | null)?.returnTo;
  const returnTo =
    typeof candidate === 'string'
      ? sanitizeInternalReturnTo(candidate, globalThis.location?.origin)
      : null;
  if (!returnTo) return cartReturnFallback;

  const url = new URL(returnTo, globalThis.location?.origin ?? 'http://localhost');
  if (url.pathname === '/cart') return cartReturnFallback;

  if (url.pathname === '/') {
    return {
      label: 'Catalog',
      labelKey: 'navigation:catalog',
      to: { pathname: url.pathname, search: url.search, hash: url.hash },
    };
  }

  const route = cartReturnRoutes.find(({ path }) => matchPath({ path, end: true }, url.pathname));
  if (!route) return cartReturnFallback;

  return {
    label: route.label,
    labelKey: route.labelKey,
    to: { pathname: url.pathname, search: url.search, hash: url.hash },
  };
}

function getSummaryJumpState(summaryHeading: HTMLElement): SummaryJumpState {
  const navigation = document
    .querySelector<HTMLAnchorElement>('nav a[href="/cart"]')
    ?.closest<HTMLElement>('nav');
  const visibleViewportBottom = navigation?.getBoundingClientRect().top ?? window.innerHeight;
  const summaryBounds = summaryHeading.getBoundingClientRect();

  return {
    isBelowViewport: summaryBounds.top >= visibleViewportBottom,
    isMobile: window.matchMedia?.(mobileSummaryQuery).matches ?? false,
  };
}

function CheckoutFeedbackNotice({
  feedback,
  pending,
  onRecoverCheckout,
}: CheckoutFeedbackNoticeProps) {
  const { t } = useTranslation();
  if (feedback === null) return null;
  if (feedback.kind === 'checkout_accepted')
    return (
      <Notice tone="info" title={t('cart:checkoutAccepted', { defaultValue: 'Checkout accepted' })}>
        <p>
          {t('cart:mockCheckoutWasAcceptedPaymentIs', {
            defaultValue:
              'Mock checkout was accepted. Payment is pending; continue in My Learning.',
          })}
        </p>
        <Link to="/learning">
          {t('cart:checkMyLearning', { defaultValue: 'Check My Learning' })}
        </Link>
      </Notice>
    );
  if (feedback.kind === 'recovery_required')
    return (
      <Notice
        tone="error"
        title={t('cart:checkoutStatusNeedsChecking', {
          defaultValue: 'Checkout status needs checking',
        })}
      >
        <p>
          {t('cart:weCouldNotConfirmCheckoutCheck', {
            defaultValue:
              'We could not confirm checkout. Check the cart status for updated guidance.',
          })}
        </p>
        <Button variant="secondary" disabled={pending} onClick={onRecoverCheckout}>
          {t('cart:checkCheckoutStatus')}
        </Button>
      </Notice>
    );
  if (feedback.kind === 'checkout_status_unknown')
    return (
      <Notice
        tone="error"
        title={t('cart:checkoutStatusRemainsUnknown', {
          defaultValue: 'Checkout status remains unknown',
        })}
      >
        <p>{t('cart:checkoutStatusUncertain')}</p>
        <Link to="/learning">
          {t('cart:checkMyLearning', { defaultValue: 'Check My Learning' })}
        </Link>
      </Notice>
    );
  if (feedback.kind === 'unauthorized')
    return (
      <Notice tone="error" title={t('cart:signInRequired', { defaultValue: 'Sign in required' })}>
        <p>
          {t('cart:signInAgainBeforeContinuingCheckout', {
            defaultValue: 'Sign in again before continuing checkout.',
          })}
        </p>
        <Link to={`/login?returnTo=${encodeURIComponent('/cart')}`}>
          {t('navigation:logIn', { defaultValue: 'Log in' })}
        </Link>
      </Notice>
    );
  if (feedback.kind === 'not_authorized')
    return (
      <Notice
        tone="error"
        title={t('cart:checkoutUnavailable', { defaultValue: 'Checkout unavailable' })}
      >
        <p>
          {t('cart:thisCheckoutIsNotAvailableFor', {
            defaultValue: 'This checkout is not available for the current account.',
          })}
        </p>
      </Notice>
    );
  if (feedback.kind === 'conflict')
    return (
      <Notice
        tone="error"
        title={t('cart:enrollmentChanged', { defaultValue: 'Enrollment changed' })}
      >
        <p>
          {t('cart:yourEnrollmentChangedCheckMyLearning', {
            defaultValue:
              'Your enrollment changed. Check My Learning before taking another action.',
          })}
        </p>
        <Link to="/learning">
          {t('cart:checkMyLearning', { defaultValue: 'Check My Learning' })}
        </Link>
      </Notice>
    );
  if (feedback.kind === 'cart_changed')
    return (
      <Notice tone="error" title={t('cart:cartChanged', { defaultValue: 'Cart changed' })}>
        <p>
          {t('cart:yourCartIsNoLongerReady', {
            defaultValue:
              'Your cart is no longer ready for this checkout. Refresh it before trying again.',
          })}
        </p>
      </Notice>
    );
  return (
    <Notice
      tone="error"
      title={t('cart:checkoutUnavailable', { defaultValue: 'Checkout unavailable' })}
    >
      <p>
        {t('cart:checkoutIsCurrentlyUnavailableTryAgain', {
          defaultValue: 'Checkout is currently unavailable. Try again later.',
        })}
      </p>
    </Notice>
  );
}

function CartRecoveryAction({
  failure,
  onRetry,
  onRetryStart,
  onRetryFinished,
  retrying = false,
  t,
}: CartRecoveryActionProps) {
  if (failure.action.kind === 'login')
    return (
      <Link to={`/login?returnTo=${encodeURIComponent('/cart')}`}>{t('navigation:logIn')}</Link>
    );
  if (failure.action.kind === 'catalog')
    return (
      <Link className={styles.catalogLink} to="/">
        {t('cart:browseCourses', { defaultValue: 'Browse courses' })}
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
      {t('cart:refreshCart')}
    </Button>
  );
}

function mutationStatusMessage(
  t: TFunction,
  success: boolean | undefined,
  kind: 'remove' | 'clear' | undefined,
): string {
  if (!success) return '';
  return kind === 'clear'
    ? t('cart:cartCleared', { defaultValue: 'Cart cleared.' })
    : t('cart:courseRemovedFromCart', { defaultValue: 'Course removed from cart.' });
}

function hasSingleCartCurrency(cart: Cart): boolean {
  return cart.items.every((item) => item.course.currency === cart.currency);
}

export function CartPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { cart, clear, feedback, isBusy, isPendingClear, remove, retry } = useCartWorkflow();
  const checkout = useCheckoutCart('cart');
  const [clearOpen, setClearOpen] = useState(false);
  const [removeFocusTarget, setRemoveFocusTarget] = useState<RemoveFocusTarget | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  const summaryJumpFrameRef = useRef<number | null>(null);
  const removeActionRefs = useRef(new Map<number, HTMLDivElement>());
  const recoveryFocusPendingRef = useRef(false);
  const recoveryRetryPendingRef = useRef(false);
  const [recoveryFailure, setRecoveryFailure] = useState<CartFailureState | null>(null);
  const [isRecoveryRetrying, setIsRecoveryRetrying] = useState(false);
  const [isSummaryJumpVisible, setIsSummaryJumpVisible] = useState(false);
  const checkoutNoticeRef = useRef<HTMLDivElement>(null);
  const statusMessage = mutationStatusMessage(t, feedback?.success, feedback?.kind);
  const currentCart = cart.data;
  const returnTarget = cartReturnTarget(location.state);
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

  useEffect(() => {
    const summaryHeading = summaryHeadingRef.current;
    if (!summaryHeading || !currentCart || currentCart.items.length === 0) {
      setIsSummaryJumpVisible(false);
      return;
    }

    const updateSummaryJumpVisibility = () => {
      const state = getSummaryJumpState(summaryHeading);
      setIsSummaryJumpVisible(state.isMobile && state.isBelowViewport);
    };
    const scheduleSummaryJumpVisibility = () => {
      if (summaryJumpFrameRef.current !== null) return;
      summaryJumpFrameRef.current = requestAnimationFrame(() => {
        summaryJumpFrameRef.current = null;
        updateSummaryJumpVisibility();
      });
    };
    const mobileMedia = window.matchMedia?.(mobileSummaryQuery);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(scheduleSummaryJumpVisibility, { threshold: 0 });

    observer?.observe(summaryHeading);
    updateSummaryJumpVisibility();
    window.addEventListener('scroll', scheduleSummaryJumpVisibility, { passive: true });
    window.addEventListener('resize', scheduleSummaryJumpVisibility);
    mobileMedia?.addEventListener('change', scheduleSummaryJumpVisibility);

    return () => {
      observer?.disconnect();
      const pendingFrame = summaryJumpFrameRef.current;
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
        if (summaryJumpFrameRef.current === pendingFrame) summaryJumpFrameRef.current = null;
      }
      window.removeEventListener('scroll', scheduleSummaryJumpVisibility);
      window.removeEventListener('resize', scheduleSummaryJumpVisibility);
      mobileMedia?.removeEventListener('change', scheduleSummaryJumpVisibility);
    };
  }, [currentCart]);

  const focusOrderSummary = () => {
    const summaryHeading = summaryHeadingRef.current;
    if (!summaryHeading) return;

    summaryHeading.focus({ preventScroll: true });
    summaryHeading.scrollIntoView?.({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const removeCourse = (courseId: number, index: number) => {
    if (isBusy) return;

    setRemoveFocusTarget({ removedCourseId: courseId, index });
    remove(courseId);
  };

  if (!cart.data && checkout.feedback?.kind === 'unauthorized') {
    return (
      <section className={styles.state} aria-labelledby="cart-sign-in-heading">
        <h1 id="cart-sign-in-heading" ref={headingRef} tabIndex={-1}>
          {t('common:cart')}
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
      <SkeletonGroup className={styles.loading} label={t('a11y:loadingCart')}>
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
          {t('common:cart')}
        </h1>
        <Notice tone="error" title={initialLoadFailure.title}>
          {initialLoadFailure.message}
        </Notice>
        <CartRecoveryAction
          failure={initialLoadFailure}
          onRetry={retry}
          retrying={isRecoveryRetrying}
          t={t}
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
          {t('cart:yourCartIsEmpty')}
        </h1>
        <div ref={checkoutNoticeRef} tabIndex={-1}>
          <CheckoutFeedbackNotice
            feedback={checkout.feedback}
            pending={checkout.pending}
            onRecoverCheckout={checkout.recoverCheckout}
          />
        </div>
        <p>
          {t('cart:addACourseFromTheCatalog', {
            defaultValue: 'Add a course from the catalog when you are ready to learn.',
          })}
        </p>
        <Link className={styles.catalogLink} to="/">
          {t('cart:browseCourses', { defaultValue: 'Browse courses' })}
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
        <nav className={styles.returnPath} aria-label={t('a11y:breadcrumb')}>
          <ContextualNavigationLink
            className={styles.returnLink}
            to={returnTarget.to}
            onKeyDown={activateContextualNavigationOnSpace}
          >
            <ChevronLeft size={20} aria-hidden="true" />
            <span>{t(returnTarget.labelKey, { defaultValue: returnTarget.label })}</span>
          </ContextualNavigationLink>
          <span className={styles.returnCurrent} aria-hidden="true">
            /
          </span>
          <span className={styles.returnCurrent} aria-current="page">
            {t('common:cart')}
          </span>
        </nav>
        <div className={styles.toolbar}>
          <div className={styles.titleRow}>
            <h1 ref={headingRef} tabIndex={-1}>
              {t('common:cart')}
            </h1>
            <p>{t('catalog:resultCount', { count: currentCart.itemCount })}</p>
          </div>
          <Button
            variant="secondary"
            className={styles.clearCartButton}
            onClick={() => setClearOpen(true)}
            disabled={isBusy || checkout.pending}
          >
            <span className={styles.clearCartLabel}>
              <Trash2 size={20} aria-hidden="true" />
              <span>{t('cart:clearCart', { defaultValue: 'Clear cart' })}</span>
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
          {loadFailure.message} <CartRecoveryAction failure={loadFailure} onRetry={retry} t={t} />
        </Notice>
      ) : null}
      {removeFailure ? (
        <Notice tone="error" title={removeFailure.title}>
          {removeFailure.message}{' '}
          <CartRecoveryAction failure={removeFailure} onRetry={retry} t={t} />
        </Notice>
      ) : null}
      {clearFailure ? (
        <Notice tone="error" title={clearFailure.title}>
          {clearFailure.message} <CartRecoveryAction failure={clearFailure} onRetry={retry} t={t} />
        </Notice>
      ) : null}
      <div className={styles.content}>
        <div className={styles.courseList}>
          <div className={styles.items} role="list" aria-label={t('a11y:cartCourses')}>
            {currentCart.items.map((item, index) => (
              <section className={styles.item} key={item.id} role="listitem">
                <Link
                  className={styles.preview}
                  to={`/courses/${item.courseId}`}
                  aria-label={t('cart:preview', {
                    defaultValue: `Preview ${item.course.title}`,
                    courseTitle: item.course.title,
                  })}
                >
                  <span aria-hidden="true">
                    {t('cart:coursePreview', { defaultValue: 'Course preview' })}
                  </span>
                </Link>
                <div className={styles.courseInfo}>
                  <p className={styles.label}>{t('cart:courseLabel')}</p>
                  <h2>
                    <Link className={styles.courseLink} to={`/courses/${item.courseId}`}>
                      {item.course.title}
                    </Link>
                  </h2>
                </div>
                <div className={styles.itemFooter}>
                  <div className={styles.price}>
                    <p className={styles.label}>{t('instructor:courseEditorPrice')}</p>
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
                      aria-label={t('cart:remove', {
                        defaultValue: `Remove ${item.course.title}`,
                        courseTitle: item.course.title,
                      })}
                      data-cart-remove-course-id={item.courseId}
                      onClick={() => removeCourse(item.courseId, index)}
                    >
                      <Trash2 size={20} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
        {isSummaryJumpVisible ? (
          <div className={styles.summaryJump}>
            <Button variant="secondary" onClick={focusOrderSummary}>
              {t('cart:goToOrderSummary')}
            </Button>
          </div>
        ) : null}
        <aside className={styles.summary} aria-label={t('a11y:cartTotal')}>
          <h2 className={styles.summaryHeading} ref={summaryHeadingRef} tabIndex={-1}>
            {t('cart:orderSummary')}
          </h2>
          <hr className={styles.summaryDivider} />
          <span className={styles.label}>{t('cart:total')}</span>
          {canDisplayTotal ? (
            <strong>
              {currentCart.currency} {currentCart.totalPrice}
            </strong>
          ) : (
            <strong className={styles.totalUnavailable}>{t('cart:totalUnavailable')}</strong>
          )}
          <Button
            fullWidth
            onClick={() => checkout.checkout(checkoutRecovery)}
            disabled={isBusy || checkout.pending || checkout.checkoutBlocked}
            state={checkout.pending ? 'loading' : 'idle'}
            loadingLabel={t('cart:checkingOut', { defaultValue: 'Checking out…' })}
          >
            {t('cart:mockCheckout')}
          </Button>
          <p className={styles.mockCheckoutDisclosure}>
            <ShieldX size={20} aria-hidden="true" />
            <span>{t('cart:insecureCheckout', { defaultValue: 'Insecure checkout' })}</span>
          </p>
        </aside>
      </div>
      <DestructiveConfirmation
        open={clearOpen}
        title={t('cart:clearCart0132', { defaultValue: 'Clear cart?' })}
        description={t('cart:thisRemovesEveryCourseFromYour', {
          defaultValue:
            'This removes every course from your cart. You can add courses again from the catalog.',
        })}
        confirmLabel={t('cart:clearCart', { defaultValue: 'Clear cart' })}
        confirming={isPendingClear()}
        pendingLabel={t('cart:clearingCart', { defaultValue: 'Clearing cart...' })}
        error={clearFailure?.message}
        onCancel={() => {
          if (!isBusy) setClearOpen(false);
        }}
        onConfirm={clear}
      />
    </article>
  );
}
