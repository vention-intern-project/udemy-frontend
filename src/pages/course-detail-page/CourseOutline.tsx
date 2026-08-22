import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { LessonOutlineItem, LessonType } from '@entities/course';
import { Button, Notice, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import { courseDetailFailure } from '@features/course-detail';

import styles from './CourseDetailPage.module.css';

interface CourseOutlineProps {
  readonly error: unknown;
  readonly headingRef: RefObject<HTMLHeadingElement>;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly items: readonly LessonOutlineItem[] | undefined;
  readonly onRetry: () => void;
}

type LessonTypeLabelKey =
  | 'instructor:courseEditorVideo'
  | 'instructor:courseEditorText'
  | 'instructor:courseEditorPdf';

const LESSON_TYPE_LABEL_KEY: Readonly<Record<LessonType, LessonTypeLabelKey>> = {
  video: 'instructor:courseEditorVideo',
  text: 'instructor:courseEditorText',
  pdf: 'instructor:courseEditorPdf',
};

export function CourseOutline({
  error,
  headingRef,
  isError,
  isPending,
  items,
  onRetry,
}: CourseOutlineProps) {
  const { t } = useTranslation();
  const failure = isError ? courseDetailFailure(error) : null;

  return (
    <section className={styles.outline} aria-labelledby="course-outline-heading">
      <h2
        ref={headingRef}
        className={styles.recoveryTarget}
        id="course-outline-heading"
        tabIndex={-1}
      >
        {t('course:courseOutline')}
      </h2>
      {isPending ? (
        <SkeletonGroup className={styles.outlineLoading} label={t('a11y:loadingCourseOutline')}>
          <Skeleton height="72px" width="100%" shape="rect" />
          <Skeleton height="72px" width="100%" shape="rect" />
        </SkeletonGroup>
      ) : null}
      {failure ? (
        <Notice tone="error" title={t(failure.titleKey)}>
          <div className={styles.outlineRecovery}>
            <p>{t(failure.messageKey)}</p>
            <div className={styles.outlineRecoveryActions}>
              <Button variant="secondary" onClick={onRetry}>
                {t('routes:tryAgain', { defaultValue: 'Try again' })}
              </Button>
            </div>
          </div>
        </Notice>
      ) : null}
      {items?.length === 0 ? <p className={styles.empty}>{t('course:noLessonsAdded')}</p> : null}
      {items && items.length > 0 ? (
        <ol className={styles.lessonList}>
          {items.map((lesson) => (
            <li key={lesson.id}>
              <h3>{lesson.title}</h3>
              <p>
                {lesson.description ??
                  t('course:noLessonDescriptionIsAvailable', {
                    defaultValue: 'No lesson description is available.',
                  })}
              </p>
              <span>
                {t(LESSON_TYPE_LABEL_KEY[lesson.lessonType])} {t('course:lessonMarker')}{' '}
                {lesson.isPublished
                  ? t('course:listed', { defaultValue: 'Listed' })
                  : t('course:draftMetadata', { defaultValue: 'Draft metadata' })}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
