import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hasActiveLearningEntitlement } from '@entities/enrollment';
import type { LearningFeedbackMotionPreferences } from '@features/learning-progress';

import { learningFailure, useLearningWorkspace } from '@features/learning-progress';
import { useSession } from '@features/auth-session';
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryIntentRef = useRef<LearningRetryFocusIntent | null>(null);
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
  if (workspace.enrollment.isError && workspace.enrollment.data === undefined) {
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
  const available = hasActiveLearningEntitlement(enrollment.status);
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
    <article className={styles.page}>
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
                  {t(workspace.feedback.messageKey)}
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
            {enrollment.status === 'pending_payment'
              ? t('learning:mockPaymentAwaitingCompletion', {
                  defaultValue:
                    'Payment is pending. Learning remains locked until your enrollment is active.',
                })
              : t('learning:learningProgressIsNotAvailableFor', {
                  defaultValue: 'Learning progress is not available for this enrollment.',
                })}
          </Notice>
        )}
      </div>
    </article>
  );
}
