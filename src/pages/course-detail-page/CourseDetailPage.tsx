import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { courseDetailFailure, useCourseDetail } from '@features/course-detail';
import { useSession } from '@features/auth-session';
import {
  Button,
  ContextualNavigationLink,
  Notice,
  Skeleton,
  SkeletonGroup,
  VisuallyHidden,
} from '@shared/ui/primitives';

import { CourseActionPanel } from './CourseActionPanel';
import styles from './CourseDetailPage.module.css';
import { CourseOutline } from './CourseOutline';

function parseCourseId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

type CourseRecoveryTarget = 'detail' | 'outline';

interface CourseRetryFocusIntent {
  readonly identity: string;
  readonly target: CourseRecoveryTarget;
}

function CourseNotFound() {
  return (
    <section className={styles.state} aria-labelledby="course-not-found-heading">
      <h1 id="course-not-found-heading">Course not found</h1>
      <p>This course does not exist or is no longer available.</p>
      <ContextualNavigationLink to="/">Return to the course catalog</ContextualNavigationLink>
    </section>
  );
}

export function CourseDetailPage() {
  const { courseId: courseIdParam } = useParams();
  const courseId = parseCourseId(courseIdParam);
  const session = useSession();
  const { action, detail, mutationState, outline, preflight, retryPreflight, submitAction } =
    useCourseDetail(courseId);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const outlineHeadingRef = useRef<HTMLHeadingElement>(null);
  const retryIntentRef = useRef<CourseRetryFocusIntent | null>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const retryIdentity = `${session.cacheEpoch ?? 'anonymous'}:${courseId ?? 'invalid'}`;

  useEffect(() => {
    retryIntentRef.current = null;
    setRecoveryMessage(null);
  }, [retryIdentity]);

  useEffect(() => {
    const intent = retryIntentRef.current;
    if (intent?.identity !== retryIdentity) return;
    if (intent.target === 'detail' && detail.isSuccess) {
      retryIntentRef.current = null;
      setRecoveryMessage('Course details recovered.');
      detailHeadingRef.current?.focus();
    } else if (intent.target === 'outline' && outline.isSuccess) {
      retryIntentRef.current = null;
      setRecoveryMessage('Course outline recovered.');
      outlineHeadingRef.current?.focus();
    }
  }, [detail.isSuccess, outline.isSuccess, retryIdentity]);

  const finishRetry = (intent: CourseRetryFocusIntent, succeeded: boolean) => {
    if (!succeeded && retryIntentRef.current === intent) retryIntentRef.current = null;
  };

  const retryDetail = () => {
    const intent: CourseRetryFocusIntent = { identity: retryIdentity, target: 'detail' };
    retryIntentRef.current = intent;
    setRecoveryMessage(null);
    void detail.refetch().then(
      (result) => finishRetry(intent, result.isSuccess),
      () => finishRetry(intent, false),
    );
  };
  const retryOutline = () => {
    const intent: CourseRetryFocusIntent = { identity: retryIdentity, target: 'outline' };
    retryIntentRef.current = intent;
    setRecoveryMessage(null);
    void outline.refetch().then(
      (result) => finishRetry(intent, result.isSuccess),
      () => finishRetry(intent, false),
    );
  };

  if (courseId === null) return <CourseNotFound />;
  if (detail.isPending) {
    return (
      <SkeletonGroup className={styles.loading} label="Loading course details">
        <Skeleton height="40px" width="70%" />
        <Skeleton height="24px" width="45%" />
        <Skeleton height="160px" width="100%" shape="rect" />
      </SkeletonGroup>
    );
  }
  if (detail.isError) {
    const failure = courseDetailFailure(detail.error);
    if (failure.notFound) return <CourseNotFound />;
    return (
      <section className={styles.state} aria-labelledby="course-error-heading">
        <h1 id="course-error-heading">{failure.title}</h1>
        <Notice tone="error" title={failure.title}>
          {failure.message}
        </Notice>
        <Button onClick={retryDetail}>Try again</Button>
      </section>
    );
  }

  const course = detail.data;
  const isDraft = course.publishedAt === null;
  const description = course.description ?? 'No course description is available.';

  return (
    <article className={styles.page}>
      {recoveryMessage ? (
        <VisuallyHidden as="p" role="status" aria-live="polite">
          {recoveryMessage}
        </VisuallyHidden>
      ) : null}
      <header className={styles.summary}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{isDraft ? 'Draft course' : 'Course details'}</p>
          <h1 ref={detailHeadingRef} className={styles.recoveryTarget} tabIndex={-1}>
            {course.title}
          </h1>
          <p className={styles.description}>{description}</p>
          <dl className={styles.metadata}>
            <div>
              <dt>Instructor</dt>
              <dd>{course.instructorName}</dd>
            </div>
            <div>
              <dt>Total lessons</dt>
              <dd>{outline.data?.total ?? course.lessons.length}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{isDraft ? 'Draft' : 'Published'}</dd>
            </div>
          </dl>
        </div>
        <CourseActionPanel
          action={action}
          course={course}
          isDraft={isDraft}
          mutationState={mutationState}
          preflight={preflight}
          onRetryPreflight={() => void retryPreflight()}
          onSubmitAction={submitAction}
        />
      </header>

      <CourseOutline
        error={outline.error}
        headingRef={outlineHeadingRef}
        isError={outline.isError}
        isPending={outline.isPending}
        items={outline.data?.items}
        onRetry={retryOutline}
      />
    </article>
  );
}
