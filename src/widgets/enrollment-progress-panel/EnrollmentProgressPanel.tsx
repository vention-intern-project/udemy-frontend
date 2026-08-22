import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Undo2 } from 'lucide-react';

import type { LessonOutline, LessonType } from '@entities/course';
import type { CourseProgress, LessonCompletionState } from '@features/learning-progress';
import { lessonCompletionLabelKey } from '@features/learning-progress';
import { LessonMediaAccess } from '@features/media-access';
import { Button, Notice, Skeleton, SkeletonGroup, VisuallyHidden } from '@shared/ui/primitives';

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

function setLessonCompletion(
  pending: boolean,
  lessonId: number,
  completed: boolean,
  onSetCompletion: EnrollmentProgressPanelProps['onSetCompletion'],
) {
  if (pending) return;
  onSetCompletion(lessonId, completed);
}

function lessonCompletionDisplayState(
  state: LessonCompletionState,
  isPublished: boolean,
): LessonCompletionState {
  if (state.status === 'unknown' && isPublished) return { status: 'known', completed: false };
  return state;
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

const LESSON_TYPE_LABEL_KEYS: Record<LessonType, string> = {
  video: 'instructor:courseEditorVideo',
  text: 'instructor:courseEditorText',
  pdf: 'instructor:courseEditorPdf',
};

function lessonTypeLabel(
  lessonType: LessonType,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return t(LESSON_TYPE_LABEL_KEYS[lessonType]);
}

function LessonCompletionAction({
  workspaceIdentity,
  lessonId,
  markComplete,
  pending,
  onSetCompletion,
}: LessonCompletionActionProps) {
  const { t } = useTranslation();
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
    <>
      <Button
        id={actionId}
        variant="ghost"
        state="idle"
        aria-disabled={pending}
        aria-busy={pending}
        className={styles.lessonCompletionAction}
        onClick={handleClick}
      >
        {markComplete ? <Check aria-hidden="true" /> : <Undo2 aria-hidden="true" />}
        {markComplete
          ? t('learning:completeLesson', { defaultValue: 'Complete lesson' })
          : t('learning:undoCompletion', { defaultValue: 'Undo completion' })}
      </Button>
      {pending ? (
        <VisuallyHidden role="status" aria-live="polite">
          {t('learning:updatingLessonProgress')}
        </VisuallyHidden>
      ) : null}
    </>
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
  const { t } = useTranslation();
  const progressFailed = progressError !== null && progressError !== undefined;
  const outlineFailed = outlineError !== null && outlineError !== undefined;
  if (progressFailed && outlineFailed) {
    return (
      <Notice
        tone="error"
        title={t('learning:learningProgressIsUnavailable', {
          defaultValue: 'Learning progress is unavailable',
        })}
      >
        <p>
          {t('learning:tryAgainToLoadThisWorkspace', {
            defaultValue: 'Try again to load this workspace.',
          })}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {t('routes:tryAgain', { defaultValue: 'Try again' })}
        </Button>
      </Notice>
    );
  }
  if (!progress && !outline && (progressLoading || outlineLoading)) {
    return (
      <SkeletonGroup className={styles.loading} label={t('a11y:loadingLearningProgress')}>
        <Skeleton height="92px" width="100%" shape="rect" />
      </SkeletonGroup>
    );
  }
  if (!progress && !outline) return null;
  const lessonsLabel = progress
    ? t('learning:lessonCount', { count: progress.totalLessons })
    : null;
  const availableLessonCount = outline?.total;
  const comingSoonLessonCount =
    progress && availableLessonCount !== undefined
      ? Math.max(0, progress.totalLessons - availableLessonCount)
      : null;
  return (
    <section
      className={styles.panel}
      aria-label={t('learning:learningProgress', { defaultValue: 'Learning progress' })}
    >
      {progressFailed || outlineFailed ? (
        <Notice
          tone="error"
          title={
            progressFailed
              ? t('learning:progressSummaryIsUnavailable', {
                  defaultValue: 'Progress summary is unavailable',
                })
              : t('learning:lessonOutlineIsUnavailable', {
                  defaultValue: 'Lesson outline is unavailable',
                })
          }
        >
          <p>
            {progressFailed
              ? t('learning:tryAgainToLoadYourProgress', {
                  defaultValue: 'Try again to load your progress summary.',
                })
              : t('learning:tryAgainToLoadTheLesson', {
                  defaultValue: 'Try again to load the lesson outline.',
                })}
          </p>
          <Button variant="secondary" onClick={onRetry}>
            {t('routes:tryAgain', { defaultValue: 'Try again' })}
          </Button>
        </Notice>
      ) : null}
      {progress ? (
        <>
          <div className={styles.summary}>
            <div>
              <h2 id="learning-progress-heading">
                {t('learning:learningProgress', { defaultValue: 'Learning progress' })}
              </h2>
              <p>
                {t('learning:ofCompleted', {
                  defaultValue: `${progress.completedLessons} of ${progress.totalLessons} ${lessonsLabel} completed`,
                  completedLessons: progress.completedLessons,
                  totalLessons: progress.totalLessons,
                  lessonsLabel,
                })}
              </p>
            </div>
            <strong>{progress.progressPercentage}%</strong>
          </div>
          <progress
            className={styles.progress}
            value={progress.progressPercentage}
            max={100}
            aria-label={t('learning:ofCompleted0343', {
              defaultValue: `${progress.completedLessons} of ${progress.totalLessons} ${lessonsLabel} completed, ${progress.progressPercentage}%`,
              completedLessons: progress.completedLessons,
              totalLessons: progress.totalLessons,
              lessonsLabel,
              progressPercentage: progress.progressPercentage,
            })}
          />
        </>
      ) : null}
      {outline ? (
        <section className={styles.lessons} aria-labelledby="learning-lessons-heading">
          <div className={styles.lessonsHeading}>
            <h2 id="learning-lessons-heading">
              {t('learning:lessons', {
                defaultValue: `Lessons (${outline.total})`,
                totalLessons: outline.total,
              })}
            </h2>
            {availableLessonCount !== undefined && comingSoonLessonCount !== null ? (
              <p className={styles.lessonAvailability}>
                {availableLessonCount} {t('learning:availableNow')} {comingSoonLessonCount}{' '}
                {t('learning:lessonCount', { count: comingSoonLessonCount })}{' '}
                {t('learning:comingSoon')}
              </p>
            ) : null}
          </div>
          {outline.items.length === 0 ? (
            <p>
              {t('learning:noLessonMetadataIsAvailableFor', {
                defaultValue: 'No lesson metadata is available for this course.',
              })}
            </p>
          ) : (
            <ol className={styles.list}>
              {outline.items.map((lesson) => {
                const state = completionState(lesson.id);
                const displayState = lessonCompletionDisplayState(state, lesson.isPublished);
                const pending = isPending(lesson.id);
                const markComplete = state.status === 'unknown' || !state.completed;
                const completionClassName = [
                  styles.completion,
                  displayState.status === 'known' &&
                    (displayState.completed
                      ? styles.completionCompleted
                      : styles.completionIncomplete),
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <li key={lesson.id} className={styles.lesson}>
                    <div className={styles.lessonDetails}>
                      <p className={completionClassName}>
                        {t(`learning:${lessonCompletionLabelKey(displayState)}`)}
                      </p>
                      <h3>{lesson.title}</h3>
                      <p>
                        {lesson.description ??
                          t('course:noLessonDescriptionIsAvailable', {
                            defaultValue: 'No lesson description is available.',
                          })}
                      </p>
                      <span>
                        {lessonTypeLabel(lesson.lessonType, t)} {t('course:lessonMarker')}{' '}
                        {lesson.isPublished
                          ? t('learning:listedMetadata', { defaultValue: 'Listed metadata' })
                          : t('course:draftMetadata', { defaultValue: 'Draft metadata' })}
                      </span>
                      <LessonMediaAccess
                        lessonType={lesson.lessonType}
                        locator={lesson.mediaLocator}
                      />
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
