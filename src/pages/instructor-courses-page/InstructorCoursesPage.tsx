import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { requestCreateCourse, requestInstructorCourses } from '@features/instructor-courses';
import { useSession } from '@features/auth-session';
import { ApiError } from '@shared/api';
import { Button, Input, Notice, Pagination, Skeleton, SkeletonGroup } from '@shared/ui/primitives';
import styles from './InstructorCoursesPage.module.css';

const COURSE_TITLE_MAX_LENGTH = 255;

type CourseTitleValidationKey =
  | 'courseEditorEnterACourseTitle'
  | 'coursesCourseTitleMustBe255CharactersOrFewer';

function titleValidationMessage(value: string): CourseTitleValidationKey | null {
  if (value.trim() === '') return 'courseEditorEnterACourseTitle';
  if (value.length > COURSE_TITLE_MAX_LENGTH) return 'coursesCourseTitleMustBe255CharactersOrFewer';
  return null;
}

function pageFrom(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

function collectionFailure(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError && error.status === 401)
    return t('instructor:coursesSignInAgainToViewYourCourses');
  if (error instanceof ApiError && error.status === 403)
    return t('instructor:coursesYouDoNotHavePermissionToViewInstructorCourses');
  if (error instanceof ApiError && error.status === 422)
    return t('instructor:coursesTheRequestedCoursePageIsNotValidTryAnotherPage');
  return t('instructor:coursesWeCouldNotLoadYourCoursesTryAgain');
}

export function InstructorCoursesPage() {
  const { t } = useTranslation();
  const session = useSession();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<CourseTitleValidationKey | null>(null);
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
      <h1 className={styles.pageTitle}>{t('navigation:instructorCourses')}</h1>
      <section className={styles.collection} aria-labelledby="your-courses-heading">
        <h2 id="your-courses-heading" ref={collectionHeadingRef} tabIndex={-1}>
          {t('instructor:coursesYourCourses')}
        </h2>
        {collection.isPending ? (
          <SkeletonGroup label={t('instructor:coursesLoadingYourCourses')}>
            <Skeleton width="100%" height="120px" shape="rect" />
          </SkeletonGroup>
        ) : null}
        {collection.isError ? (
          <Notice tone="error" title={t('instructor:coursesCourseListUnavailable')}>
            <p>{collectionFailure(collection.error, t)}</p>
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
              {t('routes:tryAgain')}
            </Button>
          </Notice>
        ) : null}
        {collection.data ? (
          <>
            {collection.data.items.length === 0 ? (
              <Notice tone="info">{t('instructor:coursesYouHaveNotCreatedAnyCoursesYet')}</Notice>
            ) : (
              <ul className={styles.courseList} aria-label={t('instructor:coursesYourCourses')}>
                {collection.data.items.map((course) => (
                  <li key={course.id} className={styles.courseRow}>
                    <div>
                      <h3>{course.title}</h3>
                      {course.description ? <p>{course.description}</p> : null}
                      <span>
                        {course.lessonCount}{' '}
                        {t('learning:lessonCount', { count: course.lessonCount })}
                      </span>
                    </div>
                    <nav
                      className={styles.courseActions}
                      aria-label={t('instructor:coursesCourseActions', {
                        courseTitle: course.title,
                      })}
                    >
                      <Link
                        className={styles.successAction}
                        to={`/instructor/courses/${course.id}/edit`}
                      >
                        {t('routes:editCourseTitle')}
                      </Link>
                      <Link
                        className={styles.successAction}
                        to={`/instructor/courses/${course.id}/enrollments`}
                      >
                        {t('routes:courseEnrollmentsTitle')}
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
                label={t('instructor:coursesYourCoursesPagination')}
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
        <h2 id="create-course-heading">{t('instructor:coursesCreateCourse')}</h2>
        <form onSubmit={submit} className={styles.form}>
          <Input
            ref={titleRef}
            id="instructor-course-title"
            name="title"
            label={t('instructor:courseEditorCourseTitle')}
            value={title}
            maxLength={COURSE_TITLE_MAX_LENGTH}
            helpText={t('instructor:coursesMaximum255Characters')}
            error={titleError ? t(`instructor:${titleError}`) : null}
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
                {t('instructor:coursesCouldNotCreateCourseTryAgain')}
              </Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={create.isPending ? 'loading' : 'idle'}
            loadingLabel={t('instructor:coursesCreatingCourse')}
          >
            {t('instructor:coursesCreateCourse')}
          </Button>
        </form>
        {create.data ? (
          <Notice tone="success" title={t('instructor:coursesCourseCreated')}>
            <p>{create.data.title}</p>
            <nav
              className={styles.successActions}
              aria-label={t('instructor:coursesNewCourseActions')}
            >
              <Link
                className={styles.successAction}
                to={`/instructor/courses/${create.data.id}/edit`}
              >
                {t('routes:editCourseTitle')}
              </Link>
              <Link
                className={styles.successAction}
                to={`/instructor/courses/${create.data.id}/enrollments`}
              >
                {t('routes:courseEnrollmentsTitle')}
              </Link>
            </nav>
          </Notice>
        ) : null}
      </section>
    </article>
  );
}
