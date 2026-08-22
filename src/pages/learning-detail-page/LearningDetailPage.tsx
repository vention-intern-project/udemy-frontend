import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EnrollmentStatus } from '@entities/enrollment';
import type {
  LearningFeedbackMotionPreferences,
  LearningWorkspaceWorkflow,
} from '@features/learning-progress';

import { learningFailure, useLearningWorkspace } from '@features/learning-progress';
import { useSession } from '@features/auth-session';
import {
  useCheckoutCart,
  type CheckoutFeedback,
  type EnrollmentStatusRefresh,
} from '@features/checkout-cart';
import { EnrollmentProgressPanel } from '@widgets/index';
import { CourseChatLauncher } from '@widgets/course-chat';
import {
  Button,
  ContextualNavigationLink,
  Notice,
  Skeleton,
  SkeletonGroup,
} from '@shared/ui/primitives';

import styles from './LearningDetailPage.module.css';

const SUBMITTED_PAYMENT_NOTICE_DURATION_MS = 5000;

function parseEnrollmentId(value: string | undefined): number | null {
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : null;
}

function useLearningFeedbackMotionPreferences(): LearningFeedbackMotionPreferences {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(query.matches);
    updatePreference();
    query.addEventListener('change', updatePreference);
    return () => query.removeEventListener('change', updatePreference);
  }, []);
  return { reducedMotion };
}

type EnrollmentRefreshResult = Awaited<
  ReturnType<LearningWorkspaceWorkflow['enrollment']['refetch']>
>;

function observedEnrollmentStatus(result: EnrollmentRefreshResult): EnrollmentStatus {
  if (result.isError) {
    if (result.error instanceof Error) throw result.error;
    throw new Error('Enrollment status refresh failed');
  }
  if (result.data === undefined)
    throw new Error('Enrollment status refresh returned no enrollment data');
  return result.data.status;
}

interface PaymentFeedbackNoticeProps {
  readonly feedback: CheckoutFeedback | null;
}

type LearningRetryFocusTarget = 'enrollment' | 'workspace';
type LearningWorkspaceIdentity = string;

interface LearningRetryFocusIntent {
  readonly identity: LearningWorkspaceIdentity;
  readonly target: LearningRetryFocusTarget;
}

interface RetryResult {
  readonly isSuccess?: boolean;
}

function didRetrySucceed(result: unknown): boolean {
  return (
    typeof result === 'object' && result !== null && (result as RetryResult).isSuccess === true
  );
}

function PaymentFeedbackNotice({ feedback }: PaymentFeedbackNoticeProps) {
  const { t } = useTranslation();
  if (feedback === null) return null;
  if (feedback.kind === 'payment_completed')
    return (
      <Notice
        tone="info"
        title={t('learning:mockPaymentSubmitted', { defaultValue: 'Mock payment submitted' })}
      >
        {t('learning:mockPaymentCompleted')}
      </Notice>
    );
  if (feedback.kind === 'payment_declined')
    return (
      <Notice
        tone="error"
        title={t('learning:mockPaymentDeclined', { defaultValue: 'Mock payment declined' })}
      >
        {t('learning:mockPaymentDeclinedBody')}
      </Notice>
    );
  if (feedback.kind === 'payment_pending')
    return (
      <Notice
        tone="info"
        title={t('learning:paymentRemainsPending', { defaultValue: 'Payment remains pending' })}
      >
        {t('learning:enrollmentPending')}
      </Notice>
    );
  if (feedback.kind === 'payment_status_unknown')
    return (
      <Notice
        tone="error"
        title={t('learning:paymentStatusNeedsChecking', {
          defaultValue: 'Payment status needs checking',
        })}
      >
        {t('learning:paymentStatusUnconfirmed')}
      </Notice>
    );
  if (feedback.kind === 'unauthorized')
    return (
      <Notice tone="error" title={t('cart:signInRequired', { defaultValue: 'Sign in required' })}>
        {t('learning:signInBeforePaymentStatus')}
      </Notice>
    );
  if (feedback.kind === 'not_authorized')
    return (
      <Notice
        tone="error"
        title={t('learning:paymentUnavailable', { defaultValue: 'Payment unavailable' })}
      >
        {t('learning:paymentActionUnavailable')}
      </Notice>
    );
  if (feedback.kind === 'unavailable')
    return (
      <Notice
        tone="error"
        title={t('learning:paymentUnavailable', { defaultValue: 'Payment unavailable' })}
      >
        {t('learning:mockPaymentUnavailable')}
      </Notice>
    );
  return null;
}

interface LearningReturnLinkProps {
  readonly currentCourseTitle?: string;
}

function LearningReturnLink({ currentCourseTitle }: LearningReturnLinkProps) {
  const { t } = useTranslation();
  return (
    <nav className={styles.breadcrumb} aria-label={t('a11y:breadcrumb')}>
      <ContextualNavigationLink className={styles.backLink} to="/learning">
        <ChevronLeft size={20} aria-hidden="true" />
        <span>{t('navigation:myLearning', { defaultValue: 'My learning' })}</span>
      </ContextualNavigationLink>
      {currentCourseTitle ? (
        <>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{currentCourseTitle}</span>
        </>
      ) : null}
    </nav>
  );
}

export function LearningDetailPage() {
  const { t } = useTranslation();
  const enrollmentId = parseEnrollmentId(useParams().enrollmentId);
  const session = useSession();
  const feedbackMotion = useLearningFeedbackMotionPreferences();
  const workspace = useLearningWorkspace(enrollmentId, feedbackMotion);
  const checkout = useCheckoutCart(`enrollment:${enrollmentId ?? 0}`);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryIntentRef = useRef<LearningRetryFocusIntent | null>(null);
  const [submittedPaymentNoticeVisible, setSubmittedPaymentNoticeVisible] = useState(false);
  const workspaceIdentity: LearningWorkspaceIdentity = `${session.cacheEpoch ?? 'anonymous'}:${enrollmentId ?? 'invalid'}`;
  useEffect(() => {
    retryIntentRef.current = null;
  }, [workspaceIdentity]);
  useEffect(() => {
    const intent = retryIntentRef.current;
    if (
      intent?.identity === workspaceIdentity &&
      intent.target === 'enrollment' &&
      workspace.enrollment.isSuccess
    ) {
      retryIntentRef.current = null;
      headingRef.current?.focus();
    }
  }, [workspaceIdentity, workspace.enrollment.isSuccess]);
  useEffect(() => {
    const intent = retryIntentRef.current;
    if (
      intent?.identity === workspaceIdentity &&
      intent.target === 'workspace' &&
      workspace.progress.isSuccess &&
      workspace.outline.isSuccess
    ) {
      retryIntentRef.current = null;
      headingRef.current?.focus();
    }
  }, [workspaceIdentity, workspace.outline.isSuccess, workspace.progress.isSuccess]);
  useEffect(() => {
    if (checkout.feedback?.kind !== 'payment_completed') {
      setSubmittedPaymentNoticeVisible(false);
      return undefined;
    }
    setSubmittedPaymentNoticeVisible(true);
    const timeout = window.setTimeout(
      () => setSubmittedPaymentNoticeVisible(false),
      SUBMITTED_PAYMENT_NOTICE_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [checkout.feedback, workspaceIdentity]);
  const finishRetry = (intent: LearningRetryFocusIntent, succeeded: boolean) => {
    if (!succeeded && retryIntentRef.current === intent) retryIntentRef.current = null;
  };
  const retryEnrollment = () => {
    const intent: LearningRetryFocusIntent = { identity: workspaceIdentity, target: 'enrollment' };
    retryIntentRef.current = intent;
    void workspace.retryEnrollment().then(
      (result) => finishRetry(intent, didRetrySucceed(result)),
      () => finishRetry(intent, false),
    );
  };
  const retryWorkspace = () => {
    const intent: LearningRetryFocusIntent = { identity: workspaceIdentity, target: 'workspace' };
    retryIntentRef.current = intent;
    void workspace.retryWorkspace().then(
      (results) => finishRetry(intent, Array.isArray(results) && results.every(didRetrySucceed)),
      () => finishRetry(intent, false),
    );
  };
  if (enrollmentId === null)
    return (
      <section className={styles.state}>
        <h1>
          {t('learning:learningWorkspaceUnavailable', {
            defaultValue: 'Learning workspace unavailable',
          })}
        </h1>
        <p>
          {t('learning:thisLearningWorkspaceIsUnavailable', {
            defaultValue: 'This learning workspace is unavailable.',
          })}
        </p>
        <LearningReturnLink />
      </section>
    );
  if (workspace.enrollment.isPending)
    return (
      <section className={styles.loading}>
        <LearningReturnLink />
        <SkeletonGroup
          label={t('learning:loadingLearningWorkspace', {
            defaultValue: 'Loading learning workspace',
          })}
        >
          <Skeleton height="40px" width="55%" />
          <Skeleton height="240px" width="100%" shape="rect" />
        </SkeletonGroup>
      </section>
    );
  if (
    workspace.enrollment.isError &&
    (workspace.enrollment.data === undefined || !checkout.paymentActionsLocked)
  ) {
    const failure = learningFailure(workspace.enrollment.error);
    return (
      <section className={styles.state}>
        <h1 tabIndex={-1} ref={headingRef}>
          {t(failure.titleKey)}
        </h1>
        <Notice tone="error" title={t(failure.titleKey)}>
          {t(failure.messageKey)}
        </Notice>
        <LearningReturnLink />
        {!failure.unavailable ? (
          <Button
            onClick={() => {
              retryEnrollment();
            }}
          >
            {t('routes:tryAgain', { defaultValue: 'Try again' })}
          </Button>
        ) : null}
      </section>
    );
  }
  const enrollment = workspace.enrollment.data;
  const enrollmentRefresh: EnrollmentStatusRefresh = {
    refetchEnrollment: async () => {
      const result = await workspace.enrollment.refetch();
      return observedEnrollmentStatus(result);
    },
  };
  if (workspace.enrollment.data === undefined)
    return (
      <section className={styles.state}>
        <h1>
          {t('learning:learningWorkspaceUnavailable', {
            defaultValue: 'Learning workspace unavailable',
          })}
        </h1>
        <p>
          {t('learning:thisLearningWorkspaceIsUnavailable', {
            defaultValue: 'This learning workspace is unavailable.',
          })}
        </p>
        <LearningReturnLink />
      </section>
    );
  const available = enrollment.status === 'active';
  const progressFailure = workspace.progress.isError
    ? learningFailure(workspace.progress.error)
    : null;
  const outlineFailure = workspace.outline.isError
    ? learningFailure(workspace.outline.error)
    : null;
  if (workspace.mutationUnavailable || progressFailure?.unavailable || outlineFailure?.unavailable)
    return (
      <section className={styles.state}>
        <h1 tabIndex={-1} ref={headingRef}>
          {t('learning:learningWorkspaceUnavailable', {
            defaultValue: 'Learning workspace unavailable',
          })}
        </h1>
        <Notice
          tone="error"
          title={t('learning:learningWorkspaceUnavailable', {
            defaultValue: 'Learning workspace unavailable',
          })}
        >
          {t('learning:thisLearningWorkspaceIsUnavailable', {
            defaultValue: 'This learning workspace is unavailable.',
          })}
        </Notice>
        <LearningReturnLink />
      </section>
    );
  return (
    <article className={styles.page} aria-busy={checkout.pending}>
      <div className={styles.readingContent}>
        <LearningReturnLink currentCourseTitle={enrollment.course.title} />
        <header className={styles.header}>
          <p className={`${styles.status} ${styles[`status${enrollment.status}`]}`}>
            {enrollment.status === 'active'
              ? t('learning:active', { defaultValue: 'Active' })
              : enrollment.status === 'cancelled'
                ? t('learning:cancelled', { defaultValue: 'Cancelled' })
                : t('learning:paymentPending', { defaultValue: 'Payment pending' })}
          </p>
          <h1 tabIndex={-1} ref={headingRef}>
            {enrollment.course.title}
          </h1>
          <p>
            {enrollment.course.description ??
              t('catalog:noCourseDescriptionIsAvailable', {
                defaultValue: 'No course description is available.',
              })}
          </p>
        </header>
        {checkout.feedback !== null &&
        (checkout.feedback.kind !== 'payment_completed' || submittedPaymentNoticeVisible) ? (
          <div>
            <PaymentFeedbackNotice feedback={checkout.feedback} />
          </div>
        ) : null}
        {available ? (
          <>
            {workspace.feedback?.tone === 'error' ? (
              <div
                className={styles.feedbackSlot}
                data-feedback-state={workspace.feedback.visibility}
              >
                <Notice
                  className={
                    workspace.feedback.visibility === 'exiting'
                      ? styles.feedbackNoticeExiting
                      : styles.feedbackNotice
                  }
                  tone={workspace.feedback.tone}
                >
                  {workspace.feedback.message}
                </Notice>
              </div>
            ) : null}
            <EnrollmentProgressPanel
              workspaceIdentity={workspaceIdentity}
              progress={workspace.progress.data}
              progressError={workspace.progress.error}
              progressLoading={workspace.progress.isPending}
              outline={workspace.outline.data}
              outlineError={workspace.outline.error}
              outlineLoading={workspace.outline.isPending}
              completionState={workspace.completionState}
              isPending={workspace.isPending}
              onSetCompletion={workspace.setCompletion}
              onRetry={() => {
                retryWorkspace();
              }}
            />
            <CourseChatLauncher
              assistant={{
                context: { kind: 'course', courseId: enrollment.courseId },
                enrollmentId: enrollment.id,
              }}
            />
          </>
        ) : (
          <Notice
            tone="info"
            title={
              enrollment.status === 'pending_payment'
                ? t('learning:paymentPending', { defaultValue: 'Payment pending' })
                : t('learning:learningProgressUnavailable', {
                    defaultValue: 'Learning progress unavailable',
                  })
            }
          >
            {enrollment.status === 'pending_payment' ? (
              <>
                <p>{t('learning:mockPaymentAwaitingCompletion')}</p>
                <div className={styles.paymentActions}>
                  {checkout.paymentActionsLocked ? (
                    <Button
                      variant="secondary"
                      onClick={() => checkout.checkPaymentStatus(enrollment.id, enrollmentRefresh)}
                      disabled={checkout.pending}
                      state={checkout.pending ? 'loading' : 'idle'}
                      loadingLabel={t('learning:checkingPaymentStatus', {
                        defaultValue: 'Checking payment status…',
                      })}
                    >
                      {t('learning:checkPaymentStatus')}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() =>
                          checkout.completeMockPayment(enrollment.id, 'success', enrollmentRefresh)
                        }
                        disabled={checkout.pending}
                        state={checkout.pending ? 'loading' : 'idle'}
                        loadingLabel={t('learning:completingMockPayment', {
                          defaultValue: 'Completing mock payment…',
                        })}
                      >
                        {t('learning:completeMockPayment')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          checkout.completeMockPayment(enrollment.id, 'failed', enrollmentRefresh)
                        }
                        disabled={checkout.pending}
                      >
                        {t('learning:simulateMockPaymentFailure')}
                      </Button>
                    </>
                  )}
                </div>
              </>
            ) : (
              t('learning:learningProgressIsNotAvailableFor', {
                defaultValue: 'Learning progress is not available for this enrollment.',
              })
            )}
          </Notice>
        )}
      </div>
    </article>
  );
}
