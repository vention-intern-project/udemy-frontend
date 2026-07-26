import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EnrollmentStatus } from '@entities/enrollment';
import type { LearningWorkspaceWorkflow } from '@features/learning-progress';

import { learningFailure, useLearningWorkspace } from '@features/learning-progress';
import { useCheckoutCart, type CheckoutFeedback, type EnrollmentStatusRefresh } from '@features/checkout-cart';
import { EnrollmentProgressPanel } from '@widgets/index';
import { Button, Notice, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import styles from './LearningDetailPage.module.css';

function parseEnrollmentId(value: string | undefined): number | null {
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

type EnrollmentRefreshResult = Awaited<ReturnType<LearningWorkspaceWorkflow['enrollment']['refetch']>>;

function observedEnrollmentStatus(result: EnrollmentRefreshResult): EnrollmentStatus {
  if (result.isError) {
    if (result.error instanceof Error) throw result.error;
    throw new Error('Enrollment status refresh failed');
  }
  if (result.data === undefined) throw new Error('Enrollment status refresh returned no enrollment data');
  return result.data.status;
}

interface PaymentFeedbackNoticeProps {
  readonly feedback: CheckoutFeedback | null;
}

function PaymentFeedbackNotice({ feedback }: PaymentFeedbackNoticeProps) {
  if (feedback === null) return null;
  if (feedback.kind === 'payment_completed') return <Notice tone="info" title="Mock payment submitted">The mock payment completed. Enrollment status was refreshed; learning unlocks only after active status is observed.</Notice>;
  if (feedback.kind === 'payment_declined') return <Notice tone="error" title="Mock payment declined">The mock payment was declined. This enrollment remains locked.</Notice>;
  if (feedback.kind === 'payment_pending') return <Notice tone="info" title="Payment remains pending">The enrollment is still pending, so you can choose a new mock payment outcome.</Notice>;
  if (feedback.kind === 'payment_status_unknown') return <Notice tone="error" title="Payment status needs checking">We could not confirm the mock payment status. Check enrollment status before taking another action.</Notice>;
  if (feedback.kind === 'unauthorized') return <Notice tone="error" title="Sign in required">Sign in again before checking payment status.</Notice>;
  if (feedback.kind === 'not_authorized') return <Notice tone="error" title="Payment unavailable">This payment action is not available for the current account.</Notice>;
  if (feedback.kind === 'unavailable') return <Notice tone="error" title="Payment unavailable">Mock payment is currently unavailable. Check enrollment status later.</Notice>;
  return null;
}

export function LearningDetailPage() {
  const enrollmentId = parseEnrollmentId(useParams().enrollmentId);
  const workspace = useLearningWorkspace(enrollmentId);
  const checkout = useCheckoutCart(`enrollment:${enrollmentId ?? 0}`);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paymentNoticeRef = useRef<HTMLDivElement>(null);
  const retryEnrollmentRef = useRef(false);
  const retryWorkspaceRef = useRef(false);
  useEffect(() => {
    if (retryEnrollmentRef.current && workspace.enrollment.isSuccess) { retryEnrollmentRef.current = false; headingRef.current?.focus(); }
  }, [workspace.enrollment.isSuccess]);
  useEffect(() => {
    if (retryWorkspaceRef.current && workspace.progress.isSuccess && workspace.outline.isSuccess) { retryWorkspaceRef.current = false; headingRef.current?.focus(); }
  }, [workspace.outline.isSuccess, workspace.progress.isSuccess]);
  useEffect(() => {
    if (checkout.feedback !== null && !checkout.pending) paymentNoticeRef.current?.focus();
  }, [checkout.feedback, checkout.pending]);
  if (enrollmentId === null) return <section className={styles.state}><h1>Learning workspace unavailable</h1><p>This learning workspace is unavailable.</p><Link to="/learning">Return to my learning</Link></section>;
  if (workspace.enrollment.isPending) return <SkeletonGroup className={styles.loading} label="Loading learning workspace"><Skeleton height="40px" width="55%" /><Skeleton height="240px" width="100%" shape="rect" /></SkeletonGroup>;
  if (workspace.enrollment.isError && (workspace.enrollment.data === undefined || !checkout.paymentActionsLocked)) {
    const failure = learningFailure(workspace.enrollment.error);
    return <section className={styles.state}><h1 tabIndex={-1} ref={headingRef}>{failure.title}</h1><Notice tone="error" title={failure.title}>{failure.message}</Notice><Link to="/learning">Return to my learning</Link>{!failure.unavailable ? <Button onClick={() => { retryEnrollmentRef.current = true; void workspace.retryEnrollment(); }}>Try again</Button> : null}</section>;
  }
  const enrollment = workspace.enrollment.data;
  const enrollmentRefresh: EnrollmentStatusRefresh = {
    refetchEnrollment: async () => {
      const result = await workspace.retryEnrollment() as EnrollmentRefreshResult;
      return observedEnrollmentStatus(result);
    },
  };
  if (workspace.enrollment.data === undefined) return <section className={styles.state}><h1>Learning workspace unavailable</h1><p>This learning workspace is unavailable.</p><Link to="/learning">Return to my learning</Link></section>;
  const available = enrollment.status === 'active';
  const progressFailure = workspace.progress.isError ? learningFailure(workspace.progress.error) : null;
  if (workspace.mutationUnavailable || progressFailure?.unavailable) return <section className={styles.state}><h1 tabIndex={-1} ref={headingRef}>Learning workspace unavailable</h1><Notice tone="error" title="Learning workspace unavailable">This learning workspace is unavailable.</Notice><Link to="/learning">Return to my learning</Link></section>;
  return (
    <article className={styles.page} aria-busy={checkout.pending}>
      <Link className={styles.backLink} to="/learning">Back to my learning</Link>
      <header className={styles.header}><p className={`${styles.status} ${styles[`status${enrollment.status}`]}`}>{enrollment.status === 'active' ? 'Active' : enrollment.status === 'cancelled' ? 'Cancelled' : 'Payment pending'}</p><h1 tabIndex={-1} ref={headingRef}>{enrollment.course.title}</h1><p>{enrollment.course.description ?? 'No course description is available.'}</p></header>
      <div ref={paymentNoticeRef} tabIndex={-1}><PaymentFeedbackNotice feedback={checkout.feedback} /></div>
      {available ? <>
        {workspace.feedback ? <Notice tone={workspace.feedback.tone}>{workspace.feedback.message}</Notice> : null}
        <EnrollmentProgressPanel progress={workspace.progress.data} progressError={workspace.progress.error} progressLoading={workspace.progress.isPending} outline={workspace.outline.data} outlineError={workspace.outline.error} outlineLoading={workspace.outline.isPending} completionState={workspace.completionState} isPending={workspace.isPending} onSetCompletion={workspace.setCompletion} onRetry={() => { retryWorkspaceRef.current = true; void workspace.retryWorkspace(); }} />
      </> : <Notice tone="info" title={enrollment.status === 'pending_payment' ? 'Payment pending' : 'Learning progress unavailable'}>{enrollment.status === 'pending_payment' ? <><p>Mock payment is awaiting completion. Learning remains locked until your enrollment is active.</p><div className={styles.paymentActions}>{checkout.paymentActionsLocked ? <Button variant="secondary" onClick={() => checkout.checkPaymentStatus(enrollment.id, enrollmentRefresh)} disabled={checkout.pending} state={checkout.pending ? 'loading' : 'idle'} loadingLabel="Checking payment status…">Check payment status</Button> : <><Button onClick={() => checkout.completeMockPayment(enrollment.id, 'success', enrollmentRefresh)} disabled={checkout.pending} state={checkout.pending ? 'loading' : 'idle'} loadingLabel="Completing mock payment…">Complete mock payment</Button><Button variant="secondary" onClick={() => checkout.completeMockPayment(enrollment.id, 'failed', enrollmentRefresh)} disabled={checkout.pending}>Simulate mock payment failure</Button></>}</div></> : 'Learning progress is not available for this enrollment.'}</Notice>}
    </article>
  );
}
