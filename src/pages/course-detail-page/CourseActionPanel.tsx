import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { CourseDetail } from '@entities/course';
import type {
  CourseMutationKind,
  CourseMutationViewState,
  CoursePreflightState,
  CoursePrimaryActionState,
} from '@features/course-detail';
import { courseActionReconciliationUncertaintyMessage } from '@features/course-action-reconciliation';
import { formatLocaleCurrency } from '@shared/locale';
import { Button, Notice, type AsyncState } from '@shared/ui/primitives';

import styles from './CourseDetailPage.module.css';

interface CourseActionPanelProps {
  readonly action: CoursePrimaryActionState | null;
  readonly course: CourseDetail;
  readonly isDraft: boolean;
  readonly mutationState: CourseMutationViewState;
  readonly preflight: CoursePreflightState;
  readonly onRetryPreflight: () => void;
  readonly onSubmitAction: (kind: CourseMutationKind) => void;
}

function actionButtonState(mutationState: CourseMutationViewState): AsyncState {
  if (mutationState.status === 'pending') return 'loading';
  if (mutationState.status === 'error') return 'error';
  return 'idle';
}

interface ActionNotice {
  readonly tone: 'error' | 'success' | 'warning';
  readonly title: string;
  readonly message: string;
  readonly retryPreflight: boolean;
}

function actionNotice(
  t: TFunction,
  isDraft: boolean,
  mutationState: CourseMutationViewState,
  preflight: CoursePreflightState,
): ActionNotice | null {
  if (isDraft)
    return {
      tone: 'warning',
      title: t('course:notAvailable', { defaultValue: 'Not available' }),
      message: t('course:courseIsNotPublished', { defaultValue: 'Course is not published' }),
      retryPreflight: false,
    };
  if (mutationState.status === 'error')
    return {
      tone: 'error',
      title: t('course:actionFailed', { defaultValue: 'Action failed' }),
      message: mutationState.disposition.message,
      retryPreflight: false,
    };
  if (mutationState.status === 'success') {
    return mutationState.action === 'enroll'
      ? {
          tone: 'success',
          title: t('course:enrollmentComplete', { defaultValue: 'Enrollment complete' }),
          message: t('course:youAreNowEnrolledInThis', {
            defaultValue: 'You are now enrolled in this course.',
          }),
          retryPreflight: false,
        }
      : {
          tone: 'success',
          title: t('course:addedToCart', { defaultValue: 'Added to cart' }),
          message: t('course:thisCourseWasAddedToYour', {
            defaultValue: 'This course was added to your cart.',
          }),
          retryPreflight: false,
        };
  }
  if (preflight === 'unavailable') {
    return {
      tone: 'error',
      title: t('course:actionUnavailable', { defaultValue: 'Action unavailable' }),
      message: courseActionReconciliationUncertaintyMessage,
      retryPreflight: true,
    };
  }
  return null;
}

export function CourseActionPanel({
  action,
  course,
  isDraft,
  mutationState,
  onRetryPreflight,
  onSubmitAction,
  preflight,
}: CourseActionPanelProps) {
  const { i18n, t } = useTranslation();
  const actionState = actionButtonState(mutationState);
  const notice = actionNotice(t, isDraft, mutationState, preflight);

  return (
    <aside
      className={styles.actionPanel}
      aria-label={t('course:courseAction', { defaultValue: 'Course action' })}
    >
      <data className={styles.price} value={course.price}>
        {formatLocaleCurrency({
          price: course.price,
          currency: course.currency,
          locale: i18n.language,
        })}
      </data>
      {notice ? (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}{' '}
          {notice.retryPreflight ? (
            <Button variant="secondary" onClick={onRetryPreflight}>
              {t('routes:tryAgain', { defaultValue: 'Try again' })}
            </Button>
          ) : null}
        </Notice>
      ) : null}
      {action?.kind === 'login' ? (
        <div className={styles.guestAction}>
          <p className={styles.guestHelper}>
            <Link className={styles.actionLink} to={action.to}>
              {action.helper.linkText}
            </Link>{' '}
            {action.helper.guidance}
          </p>
          <Button className={styles.guestUnavailableAction} fullWidth disabled>
            {action.label}
          </Button>
        </div>
      ) : null}
      {action?.kind === 'enroll' || action?.kind === 'cart' ? (
        <Button
          fullWidth
          state={actionState}
          loadingLabel={t('course:pleaseWait', { defaultValue: 'Please wait…' })}
          disabled={mutationState.status === 'pending'}
          onClick={() => onSubmitAction(action.kind)}
        >
          {action.kind === 'enroll'
            ? t('catalog:enrollFree', { defaultValue: action.label })
            : t('catalog:addToCart', { defaultValue: action.label })}
        </Button>
      ) : null}
      {action?.kind === 'disabled' ? (
        <Button fullWidth disabled>
          {action.label}
        </Button>
      ) : null}
    </aside>
  );
}
