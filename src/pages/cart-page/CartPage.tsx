import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { cartFailureState, useCartWorkflow, type CartFailureState } from '@features/cart-workflow';
import { Button, DestructiveConfirmation, Notice, Skeleton, SkeletonGroup, VisuallyHidden } from '@shared/ui/primitives';

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

function CartRecoveryAction({ failure, onRetry, onRetryStart, onRetryFinished, retrying = false }: CartRecoveryActionProps) {
  if (failure.action.kind === 'login') return <Link to={`/login?returnTo=${encodeURIComponent('/cart')}`}>Log in</Link>;
  if (failure.action.kind === 'catalog') return <Link to="/">Browse courses</Link>;
  return <Button variant="secondary" disabled={retrying} onClick={() => {
    if (onRetryStart && !onRetryStart()) return;
    void onRetry().then(onRetryFinished);
  }}>Refresh cart</Button>;
}

function mutationStatusMessage(success: boolean | undefined, kind: 'remove' | 'clear' | undefined): string {
  if (!success) return '';
  return kind === 'clear' ? 'Cart cleared.' : 'Course removed from cart.';
}

export function CartPage() {
  const {
    cart, clear, feedback, isBusy, isPendingClear, isPendingRemove, remove, retry,
  } = useCartWorkflow();
  const [clearOpen, setClearOpen] = useState(false);
  const [removeFocusTarget, setRemoveFocusTarget] = useState<RemoveFocusTarget | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const removeActionRefs = useRef(new Map<number, HTMLDivElement>());
  const recoveryFocusPendingRef = useRef(false);
  const recoveryRetryPendingRef = useRef(false);
  const [recoveryFailure, setRecoveryFailure] = useState<CartFailureState | null>(null);
  const [isRecoveryRetrying, setIsRecoveryRetrying] = useState(false);
  const statusMessage = mutationStatusMessage(feedback?.success, feedback?.kind);
  const currentCart = cart.data;

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
    if (!target || currentCart.items.some((item) => item.courseId === target.removedCourseId)) return;
    const nextItem = currentCart.items[target.index] ?? currentCart.items[target.index - 1];
    if (nextItem) {
      const trackedAction = removeActionRefs.current.get(nextItem.courseId)?.querySelector<HTMLButtonElement>('button');
      const action = trackedAction?.isConnected
        ? trackedAction
        : document.querySelector<HTMLButtonElement>(`[data-cart-remove-course-id="${nextItem.courseId}"]`);
      action?.focus();
    } else headingRef.current?.focus();
    setRemoveFocusTarget(null);
  }, [currentCart, feedback, isBusy, removeFocusTarget]);

  if (!cart.data && cart.isPending && !isRecoveryRetrying) {
    return <SkeletonGroup className={styles.loading} label="Loading cart"><Skeleton height="40px" width="48%" /><Skeleton height="180px" width="100%" shape="rect" /></SkeletonGroup>;
  }
  const initialLoadFailure = !cart.data
    ? cart.isError
      ? cartFailureState(cart.error, 'load')
      : recoveryFailure
    : null;
  if (initialLoadFailure) {
    return <section className={styles.state} aria-labelledby="cart-heading"><h1 id="cart-heading" ref={headingRef} tabIndex={-1}>Cart</h1><Notice tone="error" title={initialLoadFailure.title}>{initialLoadFailure.message}</Notice><CartRecoveryAction failure={initialLoadFailure} onRetry={retry} retrying={isRecoveryRetrying} onRetryStart={() => {
      if (recoveryRetryPendingRef.current) return false;
      recoveryRetryPendingRef.current = true;
      recoveryFocusPendingRef.current = true;
      setRecoveryFailure(initialLoadFailure);
      setIsRecoveryRetrying(true);
      return true;
    }} onRetryFinished={(recovered) => {
      recoveryRetryPendingRef.current = false;
      setIsRecoveryRetrying(false);
      if (!recovered) recoveryFocusPendingRef.current = false;
    }} /></section>;
  }
  if (!currentCart || currentCart.items.length === 0) {
    return <section className={styles.state} aria-labelledby="cart-empty-heading"><VisuallyHidden as="p" role="status" aria-live="polite">{statusMessage}</VisuallyHidden><h1 id="cart-empty-heading" ref={headingRef} tabIndex={-1}>Your cart is empty</h1><p>Add a course from the catalog when you are ready to learn.</p><Link className={styles.catalogLink} to="/">Browse courses</Link></section>;
  }
  const loadFailure = cart.isError ? cartFailureState(cart.error, 'load') : null;
  const removeFailure = feedback?.kind === 'remove' && !feedback.success ? feedback.failure : null;
  const clearFailure = feedback?.kind === 'clear' && !feedback.success ? feedback.failure : null;
  return <article className={styles.page} aria-busy={isBusy}>
    <VisuallyHidden as="p" role="status" aria-live="polite">{statusMessage}</VisuallyHidden>
    <header className={styles.header}><div><p className={styles.eyebrow}>Student workspace</p><h1 ref={headingRef} tabIndex={-1}>Cart</h1><p>{currentCart.itemCount} course{currentCart.itemCount === 1 ? '' : 's'} selected</p></div><aside className={styles.summary} aria-label="Cart total"><span>Total</span><strong>{currentCart.currency} {currentCart.totalPrice}</strong><Button variant="secondary" onClick={() => setClearOpen(true)} disabled={isBusy}>Clear cart</Button></aside></header>
    {loadFailure ? <Notice tone="error" title={loadFailure.title}>{loadFailure.message} <CartRecoveryAction failure={loadFailure} onRetry={retry} /></Notice> : null}
    {removeFailure ? <Notice tone="error" title={removeFailure.title}>{removeFailure.message} <CartRecoveryAction failure={removeFailure} onRetry={retry} /></Notice> : null}
    {clearFailure ? <Notice tone="error" title={clearFailure.title}>{clearFailure.message} <CartRecoveryAction failure={clearFailure} onRetry={retry} /></Notice> : null}
    <div className={styles.items} role="list" aria-label="Cart courses">{currentCart.items.map((item, index) => <section className={styles.item} key={item.id} role="listitem"><div><p className={styles.label}>Course</p><h2>{item.course.title}</h2></div><div><p className={styles.label}>Price</p><p>{item.course.currency} {item.course.price}</p></div><div ref={(node) => { if (node) removeActionRefs.current.set(item.courseId, node); else removeActionRefs.current.delete(item.courseId); }}><Button variant="secondary" data-cart-remove-course-id={item.courseId} onClick={() => { setRemoveFocusTarget({ removedCourseId: item.courseId, index }); remove(item.courseId); }} disabled={isBusy}>{isPendingRemove(item.courseId) ? 'Removing…' : `Remove ${item.course.title}`}</Button></div></section>)}</div>
    <DestructiveConfirmation open={clearOpen} title="Clear cart?" description="This removes every course from your cart. You can add courses again from the catalog." confirmLabel="Clear cart" confirming={isPendingClear()} error={clearFailure?.message} onCancel={() => { if (!isBusy) setClearOpen(false); }} onConfirm={clear} />
  </article>;
}
