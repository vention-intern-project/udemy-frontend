import { Link } from 'react-router-dom';

import type { CourseDetail } from '@entities/course';
import type {
  CourseMutationKind,
  CourseMutationViewState,
  CoursePreflightState,
  CoursePrimaryActionState,
} from '@features/course-detail';
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
  isDraft: boolean,
  mutationState: CourseMutationViewState,
  preflight: CoursePreflightState,
): ActionNotice | null {
  if (isDraft)
    return {
      tone: 'warning',
      title: 'Not available',
      message: 'Course is not published',
      retryPreflight: false,
    };
  if (mutationState.status === 'error')
    return {
      tone: 'error',
      title: 'Action failed',
      message: mutationState.disposition.message,
      retryPreflight: false,
    };
  if (mutationState.status === 'success') {
    return mutationState.action === 'enroll'
      ? {
          tone: 'success',
          title: 'Enrollment complete',
          message: 'You are now enrolled in this course.',
          retryPreflight: false,
        }
      : {
          tone: 'success',
          title: 'Added to cart',
          message: 'This course was added to your cart.',
          retryPreflight: false,
        };
  }
  if (preflight === 'unavailable') {
    return {
      tone: 'error',
      title: 'Action unavailable',
      message: 'We could not verify your enrollment or cart.',
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
  const actionState = actionButtonState(mutationState);
  const notice = actionNotice(isDraft, mutationState, preflight);

  return (
    <aside className={styles.actionPanel} aria-label="Course action">
      <data className={styles.price} value={course.price}>
        {course.currency}&nbsp;{course.price}
      </data>
      {notice ? (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}{' '}
          {notice.retryPreflight ? (
            <Button variant="secondary" onClick={onRetryPreflight}>
              Try again
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
          loadingLabel="Please wait…"
          disabled={mutationState.status === 'pending'}
          onClick={() => onSubmitAction(action.kind)}
        >
          {action.label}
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
