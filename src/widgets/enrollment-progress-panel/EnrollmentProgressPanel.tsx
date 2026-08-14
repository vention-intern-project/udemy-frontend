import { useEffect, useId, useRef } from 'react';

import type { LessonOutline } from '@entities/course';
import type { CourseProgress, LessonCompletionState } from '@features/learning-progress';
import { lessonCompletionLabel } from '@features/learning-progress';
import { LessonMediaAccess } from '@features/media-access';
import { Button, Notice, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import styles from './EnrollmentProgressPanel.module.css';

export interface EnrollmentProgressPanelProps {
  readonly workspaceIdentity: string;
  readonly progress: CourseProgress | undefined;
  readonly progressError: unknown;
  readonly progressLoading: boolean;
  readonly outline: LessonOutline | undefined;
  readonly outlineError: unknown;
  readonly outlineLoading: boolean;
  readonly completionState: (lessonId: number) => LessonCompletionState;
  readonly isPending: (lessonId: number) => boolean;
  readonly onSetCompletion: (lessonId: number, completed: boolean) => void;
  readonly onRetry: () => void;
}

function lessonCountLabel(totalLessons: number): string {
  return totalLessons === 1 ? 'lesson' : 'lessons';
}

function setLessonCompletion(
  pending: boolean,
  lessonId: number,
  completed: boolean,
  onSetCompletion: EnrollmentProgressPanelProps['onSetCompletion'],
) {
  if (pending) return;
  onSetCompletion(lessonId, completed);
}

interface LessonCompletionFocusIntent {
  readonly workspaceIdentity: string;
  pendingObserved: boolean;
}

interface LessonCompletionActionProps {
  readonly workspaceIdentity: string;
  readonly lessonId: number;
  readonly markComplete: boolean;
  readonly pending: boolean;
  readonly onSetCompletion: EnrollmentProgressPanelProps['onSetCompletion'];
}

function LessonCompletionAction({
  workspaceIdentity,
  lessonId,
  markComplete,
  pending,
  onSetCompletion,
}: LessonCompletionActionProps) {
  const actionId = `lesson-completion-action-${useId()}`;
  const focusIntentRef = useRef<LessonCompletionFocusIntent | null>(null);

  useEffect(() => {
    const focusIntent = focusIntentRef.current;
    if (focusIntent === null) return;
    if (focusIntent.workspaceIdentity !== workspaceIdentity) {
      focusIntentRef.current = null;
      return;
    }
    if (pending) {
      focusIntent.pendingObserved = true;
      return;
    }
    if (!focusIntent.pendingObserved) return;
    focusIntentRef.current = null;
    const action = document.getElementById(actionId);
    const activeElement = document.activeElement;
    if (
      action instanceof HTMLButtonElement &&
      (activeElement === action ||
        activeElement === document.body ||
        activeElement === document.documentElement ||
        activeElement?.tagName === 'MAIN')
    )
      action.focus();
  }, [actionId, pending, workspaceIdentity]);

  const handleClick = () => {
    if (pending) return;
    focusIntentRef.current = { workspaceIdentity, pendingObserved: false };
    setLessonCompletion(pending, lessonId, markComplete, onSetCompletion);
  };

  return (
    <Button
      id={actionId}
      variant={markComplete ? 'primary' : 'secondary'}
      state={pending ? 'loading' : 'idle'}
      loadingLabel="Updating…"
      statusMessage={pending ? 'Updating lesson progress.' : undefined}
      className={`${styles.lessonCompletionAction}${markComplete ? ` ${styles.markComplete}` : ''}`}
      onClick={handleClick}
    >
      {markComplete ? 'Mark complete' : 'Mark incomplete'}
    </Button>
  );
}

export function EnrollmentProgressPanel({
  workspaceIdentity,
  progress,
  progressError,
  progressLoading,
  outline,
  outlineError,
  outlineLoading,
  completionState,
  isPending,
  onSetCompletion,
  onRetry,
}: EnrollmentProgressPanelProps) {
  const progressFailed = progressError !== null && progressError !== undefined;
  const outlineFailed = outlineError !== null && outlineError !== undefined;
  if (progressFailed && outlineFailed) {
    return (
      <Notice tone="error" title="Learning progress is unavailable">
        <p>Try again to load this workspace.</p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </Notice>
    );
  }
  if (!progress && !outline && (progressLoading || outlineLoading)) {
    return (
      <SkeletonGroup className={styles.loading} label="Loading learning progress">
        <Skeleton height="92px" width="100%" shape="rect" />
      </SkeletonGroup>
    );
  }
  if (!progress && !outline) return null;
  const lessonsLabel = progress ? lessonCountLabel(progress.totalLessons) : null;
  const availableLessonCount = outline?.total;
  const comingSoonLessonCount =
    progress && availableLessonCount !== undefined
      ? Math.max(0, progress.totalLessons - availableLessonCount)
      : null;
  return (
    <section className={styles.panel} aria-label="Learning progress">
      {progressFailed || outlineFailed ? (
        <Notice
          tone="error"
          title={
            progressFailed ? 'Progress summary is unavailable' : 'Lesson outline is unavailable'
          }
        >
          <p>
            {progressFailed
              ? 'Try again to load your progress summary.'
              : 'Try again to load the lesson outline.'}
          </p>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </Notice>
      ) : null}
      {progress ? (
        <>
          <div className={styles.summary}>
            <div>
              <h2 id="learning-progress-heading">Learning progress</h2>
              <p>
                {progress.completedLessons} of {progress.totalLessons} {lessonsLabel} completed
              </p>
            </div>
            <strong>{progress.progressPercentage}%</strong>
          </div>
          <progress
            className={styles.progress}
            value={progress.progressPercentage}
            max={100}
            aria-label={`${progress.completedLessons} of ${progress.totalLessons} ${lessonsLabel} completed, ${progress.progressPercentage}%`}
          />
        </>
      ) : null}
      {outline ? (
        <section className={styles.lessons} aria-labelledby="learning-lessons-heading">
          <div className={styles.lessonsHeading}>
            <h2 id="learning-lessons-heading">Lessons ({outline.total})</h2>
            {availableLessonCount !== undefined && comingSoonLessonCount !== null ? (
              <p className={styles.lessonAvailability}>
                {availableLessonCount} available now · {comingSoonLessonCount}{' '}
                {lessonCountLabel(comingSoonLessonCount)} coming soon
              </p>
            ) : null}
          </div>
          {outline.items.length === 0 ? (
            <p>No lesson metadata is available for this course.</p>
          ) : (
            <ol className={styles.list}>
              {outline.items.map((lesson) => {
                const state = completionState(lesson.id);
                const pending = isPending(lesson.id);
                const markComplete = state.status === 'unknown' || !state.completed;
                return (
                  <li key={lesson.id} className={styles.lesson}>
                    <div className={styles.lessonDetails}>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.description ?? 'No lesson description is available.'}</p>
                      <span>
                        {lesson.lessonType} lesson ·{' '}
                        {lesson.isPublished ? 'Listed metadata' : 'Draft metadata'}
                      </span>
                      <LessonMediaAccess
                        lessonType={lesson.lessonType}
                        locator={lesson.mediaLocator}
                      />
                      <p className={styles.completion} aria-live="polite">
                        {lessonCompletionLabel(state)}
                      </p>
                    </div>
                    <LessonCompletionAction
                      workspaceIdentity={workspaceIdentity}
                      lessonId={lesson.id}
                      markComplete={markComplete}
                      pending={pending}
                      onSetCompletion={onSetCompletion}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}
    </section>
  );
}
