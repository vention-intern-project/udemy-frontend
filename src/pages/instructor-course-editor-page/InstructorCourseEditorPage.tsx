import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { LessonType } from '@entities/course';
import {
  createInstructorLesson,
  deleteInstructorCourse,
  deleteInstructorLesson,
  instructorEditorCourseQueryKey,
  requestInstructorEditorCourse,
  updateInstructorCourse,
  mapInstructorEditorFormFailure,
  type InstructorEditorCourse,
  type InstructorEditorLesson,
} from '@features/instructor-course-editor';
import { useSession } from '@features/auth-session';
import {
  Button,
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

type CourseFieldErrors = Readonly<Record<string, string>>;
type LessonFieldErrors = Readonly<Record<string, string>>;

const COURSE_ERROR_FIELDS = {
  title: { field: 'title', label: 'Course title' },
  description: { field: 'description', label: 'Description' },
  price: { field: 'price', label: 'Price' },
  currency: { field: 'currency', label: 'Currency' },
};

const LESSON_ERROR_FIELDS = {
  title: { field: 'title', label: 'Lesson title' },
  lesson_type: { field: 'lessonType', label: 'Lesson type' },
  description: { field: 'description', label: 'Description' },
  is_published: { field: 'isPublished', label: 'Publish this lesson' },
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

export function InstructorCourseEditorPage() {
  const courseId = positiveInteger(useParams().courseId);
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [courseForm, setCourseForm] = useState<CourseFormState | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(INITIAL_LESSON_FORM);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [courseFieldErrors, setCourseFieldErrors] = useState<CourseFieldErrors>({});
  const [lessonFieldErrors, setLessonFieldErrors] = useState<LessonFieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<InstructorEditorLesson | 'course' | null>(null);
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
    if (course.data) setCourseForm(initialCourseForm(course.data));
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
    onSuccess: async () => {
      setCourseError(null);
      setCourseFieldErrors({});
      await Promise.all([refreshCourse(), refreshCollection()]);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          action: 'save this course',
          unauthorized: 'Sign in again before continuing.',
          forbidden: 'You do not have permission to change this course.',
          notFound: 'This course is no longer available.',
        },
        COURSE_ERROR_FIELDS,
      );
      setCourseError(failure.summary);
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
          action: 'create this lesson',
          unauthorized: 'Sign in again before continuing.',
          forbidden: 'You do not have permission to change this course.',
          notFound: 'This course is no longer available.',
        },
        LESSON_ERROR_FIELDS,
      );
      setLessonError(failure.summary);
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
      <Notice tone="error" title="Course not found">
        This course address is not valid.
      </Notice>
    );
  }
  if (course.isPending) {
    return (
      <SkeletonGroup label="Loading course editor">
        <Skeleton width="100%" height="320px" shape="rect" />
      </SkeletonGroup>
    );
  }
  if (course.isError) {
    return (
      <Notice tone="error" title="Course editor unavailable">
        <p>
          {
            mapInstructorEditorFormFailure(
              course.error,
              {
                action: 'load this course',
                unauthorized: 'Sign in again before continuing.',
                forbidden: 'You do not have permission to change this course.',
                notFound: 'This course is no longer available.',
              },
              COURSE_ERROR_FIELDS,
            ).summary
          }
        </p>
        <Button variant="secondary" onClick={() => void course.refetch()}>
          Try again
        </Button>
      </Notice>
    );
  }
  if (!course.data || !courseForm) return null;
  const submitCourse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (updateCourse.isPending) return;
    if (courseForm.title.trim() === '') {
      setCourseError('Enter a course title.');
      setCourseFieldErrors({ title: 'Enter a course title.' });
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
      setLessonError('Enter a lesson title.');
      setLessonFieldErrors({ title: 'Enter a lesson title.' });
      lessonTitleRef.current?.focus();
      return;
    }
    setLessonError(null);
    setLessonFieldErrors({});
    createLesson.mutate();
  };
  const courseFailure = courseError;
  const lessonFailure = lessonError;
  const deletingCourse = deleteTarget === 'course';

  return (
    <article
      className={styles.page}
      aria-busy={updateCourse.isPending || createLesson.isPending || remove.isPending}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Instructor workspace</p>
          <h1>Edit course</h1>
        </div>
        <Link className={styles.backLink} to="/instructor/courses">
          Back to your courses
        </Link>
      </header>
      <section className={styles.panel} aria-labelledby="course-details-heading">
        <h2 id="course-details-heading">Course details</h2>
        <form className={styles.form} onSubmit={submitCourse}>
          <Input
            ref={courseTitleRef}
            label="Course title"
            name="title"
            maxLength={255}
            required
            value={courseForm.title}
            error={courseFieldErrors.title}
            onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
          />
          <Textarea
            ref={courseDescriptionRef}
            label="Description"
            name="description"
            value={courseForm.description}
            error={courseFieldErrors.description}
            onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
          />
          <div className={styles.fieldRow}>
            <Input
              ref={coursePriceRef}
              label="Price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={courseForm.price}
              error={courseFieldErrors.price}
              onChange={(event) => setCourseForm({ ...courseForm, price: event.target.value })}
            />
            <Input
              ref={courseCurrencyRef}
              label="Currency"
              name="currency"
              minLength={3}
              maxLength={3}
              value={courseForm.currency}
              error={courseFieldErrors.currency}
              onChange={(event) => setCourseForm({ ...courseForm, currency: event.target.value })}
            />
          </div>
          {courseFailure && Object.keys(courseFieldErrors).length === 0 ? (
            <div ref={courseErrorRef} tabIndex={-1} role="alert">
              <Notice tone="error">{courseFailure}</Notice>
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button
              type="submit"
              state={updateCourse.isPending ? 'loading' : 'idle'}
              loadingLabel="Saving course"
            >
              Save course
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={updateCourse.isPending || createLesson.isPending}
              onClick={() => setDeleteTarget('course')}
            >
              Delete course
            </Button>
          </div>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons</h2>
        {course.data.lessons.length === 0 ? (
          <Notice tone="info">This course has no lessons yet.</Notice>
        ) : (
          <ul className={styles.lessonList}>
            {course.data.lessons.map((lesson) => (
              <li key={lesson.id} className={styles.lessonRow}>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>
                    {lesson.lessonType} · {lesson.isPublished ? 'Published' : 'Not published'}
                  </p>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.backLink} to={`/instructor/lessons/${lesson.id}/edit`}>
                    Edit lesson
                  </Link>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() => setDeleteTarget(lesson)}
                  >
                    Delete lesson
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="create-lesson-heading">
        <h2 id="create-lesson-heading">Create lesson</h2>
        <form className={styles.form} onSubmit={submitLesson}>
          <Input
            ref={lessonTitleRef}
            label="Lesson title"
            name="lesson-title"
            maxLength={255}
            required
            value={lessonForm.title}
            error={lessonFieldErrors.title}
            onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}
          />
          <Select
            ref={lessonTypeRef}
            label="Lesson type"
            name="lesson-type"
            value={lessonForm.lessonType}
            error={lessonFieldErrors.lessonType}
            onChange={(event) =>
              setLessonForm({ ...lessonForm, lessonType: event.target.value as LessonType })
            }
          >
            <option value="video">Video</option>
            <option value="text">Text</option>
            <option value="pdf">PDF</option>
          </Select>
          <Textarea
            ref={lessonDescriptionRef}
            label="Description"
            name="lesson-description"
            value={lessonForm.description}
            error={lessonFieldErrors.description}
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
            Publish this lesson
          </label>
          {lessonFieldErrors.isPublished ? (
            <span id="create-lesson-is-published-error" className={styles.fieldError} role="alert">
              {lessonFieldErrors.isPublished}
            </span>
          ) : null}
          {lessonFailure && Object.keys(lessonFieldErrors).length === 0 ? (
            <div ref={lessonErrorRef} tabIndex={-1} role="alert">
              <Notice tone="error">{lessonFailure}</Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={createLesson.isPending ? 'loading' : 'idle'}
            loadingLabel="Creating lesson"
          >
            Create lesson
          </Button>
        </form>
      </section>
      <DestructiveConfirmation
        open={deleteTarget !== null}
        title={deletingCourse ? 'Delete this course?' : 'Delete this lesson?'}
        description={
          deletingCourse
            ? `Delete ${course.data.title}. This action is permanent.`
            : `Delete ${(deleteTarget as InstructorEditorLesson | null)?.title ?? 'this lesson'}. This action is permanent.`
        }
        confirmLabel={deletingCourse ? 'Delete course' : 'Delete lesson'}
        confirming={remove.isPending}
        error={
          remove.isError
            ? mapInstructorEditorFormFailure(
                remove.error,
                {
                  action: 'delete this item',
                  unauthorized: 'Sign in again before continuing.',
                  forbidden: 'You do not have permission to change this course.',
                  notFound: 'This course or lesson is no longer available.',
                },
                COURSE_ERROR_FIELDS,
              ).summary
            : undefined
        }
        onCancel={() => {
          if (!remove.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => remove.mutate()}
      />
    </article>
  );
}
