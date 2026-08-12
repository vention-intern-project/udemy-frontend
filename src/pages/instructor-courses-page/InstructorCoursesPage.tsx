import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { requestCreateCourse, requestInstructorCourses } from '@features/instructor-courses';
import { useSession } from '@features/auth-session';
import { ApiError } from '@shared/api';
import { Button, Input, Notice, Pagination, Skeleton, SkeletonGroup } from '@shared/ui/primitives';
import styles from './InstructorCoursesPage.module.css';

const COURSE_TITLE_MAX_LENGTH = 255;

function titleValidationMessage(value: string): string | null {
  if (value.trim() === '') return 'Enter a course title.';
  if (value.length > COURSE_TITLE_MAX_LENGTH)
    return 'Course title must be 255 characters or fewer.';
  return null;
}

function pageFrom(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

function collectionFailure(error: unknown): string {
  if (error instanceof ApiError && error.status === 401)
    return 'Sign in again to view your courses.';
  if (error instanceof ApiError && error.status === 403)
    return 'You do not have permission to view instructor courses.';
  if (error instanceof ApiError && error.status === 422)
    return 'The requested course page is not valid. Try another page.';
  return 'We could not load your courses. Try again.';
}

export function InstructorCoursesPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const failureSummaryRef = useRef<HTMLDivElement>(null);
  const collectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const page = pageFrom(params.get('page'));
  const collection = useQuery({
    queryKey: ['instructor-courses', session.cacheEpoch ?? null, page],
    queryFn: ({ signal }) => requestInstructorCourses(session, page, signal),
  });
  const create = useMutation({
    mutationFn: () => requestCreateCourse(session, { title: title.trim() }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['instructor-courses', session.cacheEpoch ?? null],
      }),
  });
  useEffect(() => {
    if (create.isError) failureSummaryRef.current?.focus({ preventScroll: true });
  }, [create.isError]);
  useEffect(() => {
    if (collection.isSuccess) collectionHeadingRef.current?.focus({ preventScroll: true });
  }, [collection.isSuccess, page]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending) return;
    const validationMessage = titleValidationMessage(title);
    if (validationMessage !== null) {
      setTitleError(validationMessage);
      titleRef.current?.focus();
      return;
    }
    setTitleError(null);
    create.mutate();
  };
  return (
    <article className={styles.page}>
      <h1 className={styles.pageTitle}>Instructor courses</h1>
      <section className={styles.collection} aria-labelledby="your-courses-heading">
        <h2 id="your-courses-heading" ref={collectionHeadingRef} tabIndex={-1}>
          Your courses
        </h2>
        {collection.isPending ? (
          <SkeletonGroup label="Loading your courses">
            <Skeleton width="100%" height="120px" shape="rect" />
          </SkeletonGroup>
        ) : null}
        {collection.isError ? (
          <Notice tone="error" title="Course list unavailable">
            <p>{collectionFailure(collection.error)}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (collection.error instanceof ApiError && collection.error.status === 422) {
                  setParams({});
                  return;
                }
                void collection.refetch();
              }}
            >
              Try again
            </Button>
          </Notice>
        ) : null}
        {collection.data ? (
          <>
            {collection.data.items.length === 0 ? (
              <Notice tone="info">You have not created any courses yet.</Notice>
            ) : (
              <ul className={styles.courseList} aria-label="Your courses">
                {collection.data.items.map((course) => (
                  <li key={course.id} className={styles.courseRow}>
                    <div>
                      <h3>{course.title}</h3>
                      {course.description ? <p>{course.description}</p> : null}
                      <span>
                        {course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <nav className={styles.courseActions} aria-label={`${course.title} actions`}>
                      <Link
                        className={styles.successAction}
                        to={`/instructor/courses/${course.id}/edit`}
                      >
                        Edit course
                      </Link>
                      <Link
                        className={styles.successAction}
                        to={`/instructor/courses/${course.id}/enrollments`}
                      >
                        Course enrollments
                      </Link>
                    </nav>
                  </li>
                ))}
              </ul>
            )}
            {collection.data.pages > 1 ? (
              <Pagination
                currentPage={collection.data.page}
                totalPages={collection.data.pages}
                hasNext={collection.data.hasNext}
                hasPrevious={collection.data.hasPrevious}
                label="Your courses pagination"
                directionDisplay="arrows"
                onPageChange={(nextPage) =>
                  setParams(nextPage === 1 ? {} : { page: String(nextPage) })
                }
              />
            ) : null}
          </>
        ) : null}
      </section>
      <section className={styles.panel} aria-labelledby="create-course-heading">
        <h2 id="create-course-heading">Create course</h2>
        <form onSubmit={submit} className={styles.form}>
          <Input
            ref={titleRef}
            id="instructor-course-title"
            name="title"
            label="Course title"
            value={title}
            maxLength={COURSE_TITLE_MAX_LENGTH}
            helpText="Maximum 255 characters."
            error={titleError}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError !== null) setTitleError(null);
            }}
            onInvalid={(event) => {
              event.preventDefault();
              const validationMessage = titleValidationMessage(title);
              if (validationMessage !== null) setTitleError(validationMessage);
              titleRef.current?.focus();
            }}
            required
          />
          {create.isError ? (
            <div ref={failureSummaryRef} tabIndex={-1} role="alert">
              <Notice tone="error" politeness="off">
                We could not create the course. Try again.
              </Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={create.isPending ? 'loading' : 'idle'}
            loadingLabel="Creating course"
          >
            Create course
          </Button>
        </form>
        {create.data ? (
          <Notice tone="success" title="Course created">
            <p>{create.data.title}</p>
            <nav className={styles.successActions} aria-label="New course actions">
              <Link
                className={styles.successAction}
                to={`/instructor/courses/${create.data.id}/edit`}
              >
                Edit course
              </Link>
              <Link
                className={styles.successAction}
                to={`/instructor/courses/${create.data.id}/enrollments`}
              >
                Course enrollments
              </Link>
            </nav>
          </Notice>
        ) : null}
      </section>
    </article>
  );
}
