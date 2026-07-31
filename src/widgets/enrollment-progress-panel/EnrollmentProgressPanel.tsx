import type { LessonOutline } from '@entities/course';
import type { CourseProgress, LessonCompletionState } from '@features/learning-progress';
import { lessonCompletionLabel } from '@features/learning-progress';
import { LessonMediaAccess } from '@features/media-access';
import { Button, Notice, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import styles from './EnrollmentProgressPanel.module.css';

export interface EnrollmentProgressPanelProps {
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

export function EnrollmentProgressPanel({
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
  const failed =
    (progressError !== null && progressError !== undefined) ||
    (outlineError !== null && outlineError !== undefined);
  if (failed) {
    return (
      <Notice tone="error" title="Learning progress is unavailable">
        <p>Try again to load this workspace.</p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </Notice>
    );
  }
  if (progressLoading || outlineLoading) {
    return (
      <SkeletonGroup className={styles.loading} label="Loading learning progress">
        <Skeleton height="92px" width="100%" shape="rect" />
      </SkeletonGroup>
    );
  }
  if (!progress || !outline) return null;
  const lessonsLabel = lessonCountLabel(progress.totalLessons);
  const availableLessonCount = outline.total;
  const comingSoonLessonCount = Math.max(0, progress.totalLessons - availableLessonCount);
  return (
    <section className={styles.panel} aria-labelledby="learning-progress-heading">
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
      <section className={styles.lessons} aria-labelledby="learning-lessons-heading">
        <div className={styles.lessonsHeading}>
          <h2 id="learning-lessons-heading">Lessons ({outline.total})</h2>
          <p className={styles.lessonAvailability}>
            {availableLessonCount} available now · {comingSoonLessonCount}{' '}
            {lessonCountLabel(comingSoonLessonCount)} coming soon
          </p>
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
                  <Button
                    variant={markComplete ? 'primary' : 'secondary'}
                    aria-busy={pending || undefined}
                    aria-disabled={pending || undefined}
                    className={`${styles.lessonCompletionAction}${
                      markComplete ? ` ${styles.markComplete}` : ''
                    }`}
                    onClick={() =>
                      setLessonCompletion(pending, lesson.id, markComplete, onSetCompletion)
                    }
                  >
                    {markComplete ? 'Mark complete' : 'Mark incomplete'}
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}
