import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { LessonType } from '@entities/course';
import {
  createInstructorLesson,
  deleteInstructorCourse,
  deleteInstructorLesson,
  instructorEditorCourseQueryKey,
  requestInstructorEditorCourse,
  updateInstructorCourse,
  mapInstructorEditorFormFailure,
  resolveInstructorEditorFormFailure,
  resolveInstructorEditorFailureMessage,
  type InstructorEditorFieldErrors,
  type InstructorEditorFormFailure,
  type InstructorEditorCourse,
  type InstructorEditorLesson,
} from '@features/instructor-course-editor';
import { useSession } from '@features/auth-session';
import {
  Button,
  ContextualNavigationLink,
  DestructiveConfirmation,
  Input,
  Notice,
  Select,
  Skeleton,
  SkeletonGroup,
  Textarea,
} from '@shared/ui/primitives';

import styles from './InstructorCourseEditorPage.module.css';

interface CourseFormState {
  title: string;
  description: string;
  price: string;
  currency: string;
}

interface LessonFormState {
  title: string;
  lessonType: LessonType;
  description: string;
  isPublished: boolean;
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

function interpolateInstructorTemplate(
  t: TFunction,
  key: string,
  variable: 'courseTitle' | 'lessonTitle',
  value: string,
): string {
  return t(key).replace(`{${variable}}`, () => value);
}

/* The validation owner supplies the shared field-error contract.
 */
const COURSE_ERROR_FIELDS = {
  title: { field: 'title', labelKey: 'courseEditorCourseTitle' },
  description: { field: 'description', labelKey: 'courseEditorDescription' },
  price: { field: 'price', labelKey: 'courseEditorPrice' },
  currency: { field: 'currency', labelKey: 'courseEditorCurrency' },
};

const LESSON_ERROR_FIELDS = {
  title: { field: 'title', labelKey: 'courseEditorLessonTitle' },
  lesson_type: { field: 'lessonType', labelKey: 'courseEditorLessonType' },
  description: { field: 'description', labelKey: 'courseEditorDescription' },
  is_published: { field: 'isPublished', labelKey: 'courseEditorPublishThisLesson' },
};

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function initialCourseForm(course: InstructorEditorCourse): CourseFormState {
  return {
    title: course.title,
    description: course.description ?? '',
    price: course.price,
    currency: course.currency,
  };
}

const INITIAL_LESSON_FORM: LessonFormState = {
  title: '',
  lessonType: 'video',
  description: '',
  isPublished: false,
};

function InstructorCourseEditorHeader() {
  const { t } = useTranslation();
  return (
    <>
      <nav className={styles.breadcrumb} aria-label={t('a11y:breadcrumb')}>
        <ContextualNavigationLink className={styles.breadcrumbLink} to="/instructor/courses">
          <ChevronLeft size={20} aria-hidden="true" />
          <span>{t('navigation:instructorCourses')}</span>
        </ContextualNavigationLink>
        <span className={styles.breadcrumbCurrent} aria-hidden="true">
          /
        </span>
        <span className={styles.breadcrumbCurrent} aria-current="page">
          {t('routes:editCourseTitle')}
        </span>
      </nav>
      <header className={styles.header}>
        <h1>{t('routes:editCourseTitle')}</h1>
      </header>
    </>
  );
}

export function InstructorCourseEditorPage() {
  const { t } = useTranslation();
  const courseId = positiveInteger(useParams().courseId);
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [courseForm, setCourseForm] = useState<CourseFormState | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(INITIAL_LESSON_FORM);
  const [courseError, setCourseError] = useState<InstructorEditorFormFailure | null>(null);
  const [lessonError, setLessonError] = useState<InstructorEditorFormFailure | null>(null);
  const [courseFieldErrors, setCourseFieldErrors] = useState<InstructorEditorFieldErrors>({});
  const [lessonFieldErrors, setLessonFieldErrors] = useState<InstructorEditorFieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<InstructorEditorLesson | 'course' | null>(null);
  const initializedCourseIdRef = useRef<number | null>(null);
  const courseTitleRef = useRef<HTMLInputElement>(null);
  const courseDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const coursePriceRef = useRef<HTMLInputElement>(null);
  const courseCurrencyRef = useRef<HTMLInputElement>(null);
  const lessonTitleRef = useRef<HTMLInputElement>(null);
  const lessonTypeRef = useRef<HTMLSelectElement>(null);
  const lessonDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const lessonPublishedRef = useRef<HTMLInputElement>(null);
  const courseErrorRef = useRef<HTMLDivElement>(null);
  const lessonErrorRef = useRef<HTMLDivElement>(null);

  const course = useQuery({
    queryKey: instructorEditorCourseQueryKey(session.cacheEpoch, courseId ?? 0),
    queryFn: ({ signal }) => requestInstructorEditorCourse(session, courseId as number, signal),
    enabled: courseId !== null,
  });
  useEffect(() => {
    if (course.data && initializedCourseIdRef.current !== course.data.id) {
      initializedCourseIdRef.current = course.data.id;
      setCourseForm(initialCourseForm(course.data));
    }
  }, [course.data]);

  const refreshCourse = () =>
    courseId === null
      ? Promise.resolve()
      : queryClient.invalidateQueries({
          queryKey: instructorEditorCourseQueryKey(session.cacheEpoch, courseId),
        });
  const refreshCollection = () =>
    queryClient.invalidateQueries({
      queryKey: ['instructor-courses', session.cacheEpoch ?? null],
    });

  const updateCourse = useMutation({
    mutationFn: () => {
      if (courseId === null || courseForm === null) throw new Error('Course form is unavailable');
      return updateInstructorCourse(session, courseId, courseForm);
    },
    onSuccess: async (updatedCourse) => {
      setCourseError(null);
      setCourseFieldErrors({});
      initializedCourseIdRef.current = updatedCourse.id;
      setCourseForm(initialCourseForm(updatedCourse));
      await Promise.all([refreshCourse(), refreshCollection()]);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          actionKey: 'courseEditorSaveThisCourse',
          unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
          forbiddenKey: 'courseEditorYouDoNotHavePermissionToChangeThisCourse',
          notFoundKey: 'courseEditorThisCourseIsNoLongerAvailable',
          badRequestKey: null,
        },
        COURSE_ERROR_FIELDS,
      );
      setCourseError(failure);
      setCourseFieldErrors(failure.fields);
    },
  });
  const createLesson = useMutation({
    mutationFn: () => {
      if (courseId === null) throw new Error('Course is unavailable');
      return createInstructorLesson(session, courseId, lessonForm);
    },
    onSuccess: async () => {
      setLessonError(null);
      setLessonFieldErrors({});
      setLessonForm(INITIAL_LESSON_FORM);
      await Promise.all([refreshCourse(), refreshCollection()]);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          actionKey: 'courseEditorCreateThisLesson',
          unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
          forbiddenKey: 'courseEditorYouDoNotHavePermissionToChangeThisCourse',
          notFoundKey: 'courseEditorThisCourseIsNoLongerAvailable',
          badRequestKey: null,
        },
        LESSON_ERROR_FIELDS,
      );
      setLessonError(failure);
      setLessonFieldErrors(failure.fields);
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (courseId === null || deleteTarget === null)
        throw new Error('Delete target is unavailable');
      if (deleteTarget === 'course') return deleteInstructorCourse(session, courseId);
      return deleteInstructorLesson(session, courseId, deleteTarget.id);
    },
    onSuccess: async () => {
      const removedCourse = deleteTarget === 'course';
      setDeleteTarget(null);
      await refreshCollection();
      if (removedCourse) {
        navigate('/instructor/courses');
        return;
      }
      await refreshCourse();
    },
  });

  useEffect(() => {
    if (courseFieldErrors.title) courseTitleRef.current?.focus({ preventScroll: true });
    else if (courseFieldErrors.description)
      courseDescriptionRef.current?.focus({ preventScroll: true });
    else if (courseFieldErrors.price) coursePriceRef.current?.focus({ preventScroll: true });
    else if (courseFieldErrors.currency) courseCurrencyRef.current?.focus({ preventScroll: true });
    else if (courseError) courseErrorRef.current?.focus({ preventScroll: true });
  }, [courseError, courseFieldErrors]);
  useEffect(() => {
    if (lessonFieldErrors.title) lessonTitleRef.current?.focus({ preventScroll: true });
    else if (lessonFieldErrors.lessonType) lessonTypeRef.current?.focus({ preventScroll: true });
    else if (lessonFieldErrors.description)
      lessonDescriptionRef.current?.focus({ preventScroll: true });
    else if (lessonFieldErrors.isPublished)
      lessonPublishedRef.current?.focus({ preventScroll: true });
    else if (lessonError) lessonErrorRef.current?.focus({ preventScroll: true });
  }, [lessonError, lessonFieldErrors]);

  if (courseId === null) {
    return (
      <article className={styles.page}>
        <InstructorCourseEditorHeader />
        <Notice tone="error" title={t('course:courseNotFound')}>
          {t('instructor:courseEditorCourseAddressInvalid')}
        </Notice>
      </article>
    );
  }
  if (course.isPending) {
    return (
      <article className={styles.page}>
        <InstructorCourseEditorHeader />
        <SkeletonGroup label={t('instructor:courseEditorLoadingCourseEditor')}>
          <Skeleton width="100%" height="320px" shape="rect" />
        </SkeletonGroup>
      </article>
    );
  }
  if (course.isError) {
    return (
      <article className={styles.page}>
        <InstructorCourseEditorHeader />
        <Notice tone="error" title={t('instructor:courseEditorCourseEditorUnavailable')}>
          <p>
            {resolveInstructorEditorFailureMessage(
              mapInstructorEditorFormFailure(
                course.error,
                {
                  actionKey: 'courseEditorLoadThisCourse',
                  unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
                  forbiddenKey: 'courseEditorYouDoNotHavePermissionToChangeThisCourse',
                  notFoundKey: 'courseEditorThisCourseIsNoLongerAvailable',
                  badRequestKey: null,
                },
                COURSE_ERROR_FIELDS,
              ).summary,
              t,
            )}
          </p>
          <Button variant="secondary" onClick={() => void course.refetch()}>
            {t('routes:tryAgain')}
          </Button>
        </Notice>
      </article>
    );
  }
  if (!course.data || !courseForm) return null;
  const submitCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (updateCourse.isPending) return;
    if (courseForm.title.trim() === '') {
      setCourseError({
        fields: { title: { kind: 'resource', key: 'courseEditorEnterACourseTitle' } },
        summary: { kind: 'resource', key: 'courseEditorEnterACourseTitle' },
      });
      setCourseFieldErrors({ title: { kind: 'resource', key: 'courseEditorEnterACourseTitle' } });
      courseTitleRef.current?.focus();
      return;
    }
    setCourseError(null);
    setCourseFieldErrors({});
    updateCourse.mutate();
  };
  const submitLesson = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createLesson.isPending) return;
    if (lessonForm.title.trim() === '') {
      setLessonError({
        fields: { title: { kind: 'resource', key: 'courseEditorEnterALessonTitle' } },
        summary: { kind: 'resource', key: 'courseEditorEnterALessonTitle' },
      });
      setLessonFieldErrors({ title: { kind: 'resource', key: 'courseEditorEnterALessonTitle' } });
      lessonTitleRef.current?.focus();
      return;
    }
    setLessonError(null);
    setLessonFieldErrors({});
    createLesson.mutate();
  };
  const courseFailure = courseError ? resolveInstructorEditorFormFailure(courseError, t) : null;
  const lessonFailure = lessonError ? resolveInstructorEditorFormFailure(lessonError, t) : null;
  const resolvedCourseFieldErrors = courseFailure
    ? courseFailure.fields
    : Object.fromEntries(
        Object.entries(courseFieldErrors).map(([field, message]) => [
          field,
          resolveInstructorEditorFormFailure({ fields: { [field]: message }, summary: message }, t)
            .summary,
        ]),
      );
  const resolvedLessonFieldErrors = lessonFailure
    ? lessonFailure.fields
    : Object.fromEntries(
        Object.entries(lessonFieldErrors).map(([field, message]) => [
          field,
          resolveInstructorEditorFormFailure({ fields: { [field]: message }, summary: message }, t)
            .summary,
        ]),
      );
  const deletingCourse = deleteTarget === 'course';

  return (
    <article
      className={styles.page}
      aria-busy={updateCourse.isPending || createLesson.isPending || remove.isPending}
    >
      <InstructorCourseEditorHeader />
      <section className={styles.panel} aria-labelledby="course-details-heading">
        <h2 id="course-details-heading">{t('routes:courseDetailsTitle')}</h2>
        <form className={styles.form} onSubmit={submitCourse}>
          <Input
            ref={courseTitleRef}
            label={t('instructor:courseEditorCourseTitle')}
            name="title"
            maxLength={255}
            required
            value={courseForm.title}
            error={resolvedCourseFieldErrors.title}
            disabled={updateCourse.isPending}
            onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
          />
          <Textarea
            ref={courseDescriptionRef}
            label={t('instructor:courseEditorDescription')}
            name="description"
            value={courseForm.description}
            error={resolvedCourseFieldErrors.description}
            disabled={updateCourse.isPending}
            onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
          />
          <div className={styles.fieldRow}>
            <Input
              ref={coursePriceRef}
              label={t('instructor:courseEditorPrice')}
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={courseForm.price}
              error={resolvedCourseFieldErrors.price}
              disabled={updateCourse.isPending}
              onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })}
            />
            <Input
              ref={courseCurrencyRef}
              label={t('instructor:courseEditorCurrency')}
              name="currency"
              minLength={3}
              maxLength={3}
              value={courseForm.currency}
              error={resolvedCourseFieldErrors.currency}
              disabled={updateCourse.isPending}
              onChange={(event) => setCourseForm({ ...courseForm, currency: event.target.value })}
            />
          </div>
          {courseFailure && Object.keys(courseFieldErrors).length === 0 ? (
            <div ref={courseErrorRef} tabIndex={-1} role="alert">
              <Notice tone="error">{courseFailure.summary}</Notice>
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button
              type="submit"
              state={updateCourse.isPending ? 'loading' : 'idle'}
              loadingLabel={t('instructor:courseEditorSavingCourse')}
            >
              {t('instructor:courseEditorSaveCourse')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={updateCourse.isPending || createLesson.isPending}
              onClick={() => {
                remove.reset();
                setDeleteTarget('course');
              }}
            >
              {t('instructor:courseEditorDeleteCourse')}
            </Button>
          </div>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">{t('instructor:courseEditorLessons')}</h2>
        {course.data.lessons.length === 0 ? (
          <Notice tone="info">{t('instructor:courseEditorThisCourseHasNoLessonsYet')}</Notice>
        ) : (
          <ul className={styles.lessonList}>
            {course.data.lessons.map((lesson) => (
              <li key={lesson.id} className={styles.lessonRow}>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>
                    {t(LESSON_TYPE_LABEL_KEY[lesson.lessonType])} ·{' '}
                    {lesson.isPublished
                      ? t('course:published')
                      : t('instructor:courseEditorNotPublished')}
                  </p>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.backLink} to={`/instructor/lessons/${lesson.id}/edit`}>
                    {t('routes:editLessonTitle')}
                  </Link>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      remove.reset();
                      setDeleteTarget(lesson);
                    }}
                  >
                    {t('instructor:courseEditorDeleteLesson')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="create-lesson-heading">
        <h2 id="create-lesson-heading">{t('instructor:courseEditorCreateLesson')}</h2>
        <form className={styles.form} onSubmit={submitLesson}>
          <Input
            ref={lessonTitleRef}
            label={t('instructor:courseEditorLessonTitle')}
            name="lesson-title"
            maxLength={255}
            required
            value={lessonForm.title}
            error={resolvedLessonFieldErrors.title}
            onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}
          />
          <Select
            ref={lessonTypeRef}
            label={t('instructor:courseEditorLessonType')}
            name="lesson-type"
            value={lessonForm.lessonType}
            error={resolvedLessonFieldErrors.lessonType}
            onChange={(event) =>
              setLessonForm({ ...lessonForm, lessonType: event.target.value as LessonType })
            }
          >
            <option value="video">{t('instructor:courseEditorVideo')}</option>
            <option value="text">{t('instructor:courseEditorText')}</option>
            <option value="pdf">PDF</option>
          </Select>
          <Textarea
            ref={lessonDescriptionRef}
            label={t('instructor:courseEditorDescription')}
            name="lesson-description"
            value={lessonForm.description}
            error={resolvedLessonFieldErrors.description}
            onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })}
          />
          <label className={styles.checkbox}>
            <input
              ref={lessonPublishedRef}
              type="checkbox"
              name="is_published"
              checked={lessonForm.isPublished}
              aria-invalid={lessonFieldErrors.isPublished ? true : undefined}
              aria-describedby={
                lessonFieldErrors.isPublished ? 'create-lesson-is-published-error' : undefined
              }
              onChange={(event) =>
                setLessonForm({ ...lessonForm, isPublished: event.target.checked })
              }
            />{' '}
            {t('instructor:courseEditorPublishThisLesson')}
          </label>
          {lessonFieldErrors.isPublished ? (
            <span id="create-lesson-is-published-error" className={styles.fieldError} role="alert">
              {resolvedLessonFieldErrors.isPublished}
            </span>
          ) : null}
          {lessonFailure && Object.keys(lessonFieldErrors).length === 0 ? (
            <div ref={lessonErrorRef} tabIndex={-1} role="alert">
              <Notice tone="error">{lessonFailure.summary}</Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={createLesson.isPending ? 'loading' : 'idle'}
            loadingLabel={t('instructor:courseEditorCreatingLesson')}
          >
            {t('instructor:courseEditorCreateLesson')}
          </Button>
        </form>
      </section>
      <DestructiveConfirmation
        open={deleteTarget !== null}
        title={
          deletingCourse
            ? t('instructor:courseEditorDeleteThisCourse')
            : t('instructor:courseEditorDeleteThisLesson')
        }
        description={
          deletingCourse
            ? interpolateInstructorTemplate(
                t,
                'instructor:courseEditorDeleteCoursePermanent',
                'courseTitle',
                course.data.title,
              )
            : interpolateInstructorTemplate(
                t,
                'instructor:courseEditorDeleteLessonPermanent',
                'lessonTitle',
                (deleteTarget as InstructorEditorLesson | null)?.title ?? 'this lesson',
              )
        }
        confirmLabel={
          deletingCourse
            ? t('instructor:courseEditorDeleteCourse')
            : t('instructor:courseEditorDeleteLesson')
        }
        confirming={remove.isPending}
        pendingLabel={
          deletingCourse
            ? t('instructor:courseEditorDeletingCourse')
            : t('instructor:courseEditorDeletingLesson')
        }
        error={
          remove.isError
            ? resolveInstructorEditorFailureMessage(
                mapInstructorEditorFormFailure(
                  remove.error,
                  {
                    actionKey: 'courseEditorDeleteThisItem',
                    unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
                    forbiddenKey: 'courseEditorYouDoNotHavePermissionToChangeThisCourse',
                    notFoundKey: 'courseEditorThisCourseOrLessonIsNoLongerAvailable',
                    badRequestKey: null,
                  },
                  COURSE_ERROR_FIELDS,
                ).summary,
                t,
              )
            : undefined
        }
        onCancel={() => {
          if (!remove.isPending) {
            remove.reset();
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => remove.mutate()}
      />
    </article>
  );
}
