import { Link } from 'react-router-dom';

import type { CourseDetail } from '@entities/course';
import type {
  CourseMutationKind, CourseMutationViewState, CoursePreflightState, CoursePrimaryActionState,
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

export function CourseActionPanel({
  action, course, isDraft, mutationState, onRetryPreflight, onSubmitAction, preflight,
}: CourseActionPanelProps) {
  const actionState = actionButtonState(mutationState);

  return (
    <aside className={styles.actionPanel} aria-label="Course action">
      <data className={styles.price} value={course.price}>{course.currency}&nbsp;{course.price}</data>
      {isDraft ? <Notice tone="warning" title="Not available">Course is not published</Notice> : null}
      {preflight === 'unavailable' ? (
        <Notice tone="error" title="Action unavailable">
          We could not verify your enrollment or cart. <Button variant="secondary" onClick={onRetryPreflight}>Try again</Button>
        </Notice>
      ) : null}
      {action?.kind === 'login' ? <Link className={styles.primaryLink} to={action.to}>{action.label}</Link> : null}
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
      {action?.kind === 'disabled' ? <Button fullWidth disabled>{action.label}</Button> : null}
      {mutationState.status === 'error' ? <Notice tone="error" title="Action failed">{mutationState.disposition.message}</Notice> : null}
      {mutationState.status === 'success' && mutationState.action === 'enroll' ? (
        <Notice tone="success" title="Enrollment complete">You are now enrolled in this course.</Notice>
      ) : null}
      {mutationState.status === 'success' && mutationState.action === 'cart' ? (
        <Notice tone="success" title="Added to cart">This course was added to your cart.</Notice>
      ) : null}
    </aside>
  );
}
