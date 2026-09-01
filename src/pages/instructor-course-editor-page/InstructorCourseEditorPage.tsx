import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  BookOpen,
  ChevronLeft,
  FileText,
  FileVideo,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from 'lucide-react';
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
  uploadInstructorLessonFile,
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

interface LessonTypeIconProps {
  readonly lessonType: LessonType;
}

interface LessonUploadRule {
  readonly accept: string;
  readonly descriptionKey:
    | 'instructor:lessonEditorMp4WebmOrMovUpTo150Mb'
    | 'instructor:lessonEditorPdfUpTo50Mb';
  readonly maxBytes: number;
}

interface CreateLessonMutationResult {
  readonly lesson: InstructorEditorLesson;
  readonly uploadFailed: boolean;
}

interface CreatedLessonUploadFailure {
  readonly lessonId: number;
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

function lessonUploadRule(type: LessonType): LessonUploadRule | null {
  if (type === 'video') {
    return {
      accept: '.mp4,.webm,.mov',
      maxBytes: 150 * 1024 * 1024,
      descriptionKey: 'instructor:lessonEditorMp4WebmOrMovUpTo150Mb',
    };
  }
  if (type === 'pdf') {
    return {
      accept: '.pdf',
      maxBytes: 50 * 1024 * 1024,
      descriptionKey: 'instructor:lessonEditorPdfUpTo50Mb',
    };
  }
  return null;
}

function fileMatchesLessonUploadRule(file: File, rule: LessonUploadRule | null): boolean {
  if (rule === null) return false;
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  return rule.accept.split(',').includes(extension) && file.size <= rule.maxBytes;
}

function LessonTypeIcon({ lessonType }: LessonTypeIconProps) {
  if (lessonType === 'video') return <FileVideo aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

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

interface InstructorCourseEditorHeaderProps {
  readonly courseTitle?: string;
}

function InstructorCourseEditorHeader({ courseTitle }: InstructorCourseEditorHeaderProps) {
  const { t } = useTranslation();
  const breadcrumbCurrent = courseTitle ?? t('routes:editCourseTitle');
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
          {breadcrumbCurrent}
        </span>
      </nav>
      <header className={styles.header}>
        <h1>{t('routes:editCourseTitle')}</h1>
        <p>{t('routes:courseDetailsDescription')}</p>
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
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [lessonFileError, setLessonFileError] = useState(false);
  const [createdLessonUploadFailure, setCreatedLessonUploadFailure] =
    useState<CreatedLessonUploadFailure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorEditorLesson | 'course' | null>(null);
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const initializedCourseIdRef = useRef<number | null>(null);
  const courseTitleRef = useRef<HTMLInputElement>(null);
  const courseDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const coursePriceRef = useRef<HTMLInputElement>(null);
  const courseCurrencyRef = useRef<HTMLInputElement>(null);
  const lessonTitleRef = useRef<HTMLInputElement>(null);
  const lessonTypeRef = useRef<HTMLButtonElement>(null);
  const lessonDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const lessonPublishedRef = useRef<HTMLInputElement>(null);
  const lessonFileRef = useRef<HTMLInputElement>(null);
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
    mutationFn: async (): Promise<CreateLessonMutationResult> => {
      if (courseId === null) throw new Error('Course is unavailable');
      const lesson = await createInstructorLesson(session, courseId, lessonForm);
      if (lessonFile === null) return { lesson, uploadFailed: false };
      try {
        await uploadInstructorLessonFile(session, lesson.id, lessonFile);
        return { lesson, uploadFailed: false };
      } catch {
        return { lesson, uploadFailed: true };
      }
    },
    onSuccess: async ({ lesson, uploadFailed }) => {
      setLessonError(null);
      setLessonFieldErrors({});
      setLessonForm(INITIAL_LESSON_FORM);
      setLessonFile(null);
      setLessonFileError(false);
      if (lessonFileRef.current) lessonFileRef.current.value = '';
      setCreatedLessonUploadFailure(uploadFailed ? { lessonId: lesson.id } : null);
      setIsLessonFormOpen(false);
      await Promise.all([refreshCourse(), refreshCollection()]);
      document
        .getElementById(uploadFailed ? 'created-lesson-upload-retry' : 'add-lesson-trigger')
        ?.focus({ preventScroll: true });
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
    if (isLessonFormOpen) lessonTitleRef.current?.focus({ preventScroll: true });
  }, [isLessonFormOpen]);
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
    const uploadRule = lessonUploadRule(lessonForm.lessonType);
    if (lessonFile !== null && !fileMatchesLessonUploadRule(lessonFile, uploadRule)) {
      setLessonFileError(true);
      lessonFileRef.current?.focus();
      return;
    }
    setLessonError(null);
    setLessonFieldErrors({});
    setLessonFileError(false);
    setCreatedLessonUploadFailure(null);
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
  const uploadRule = lessonUploadRule(lessonForm.lessonType);
  const changeLessonFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setLessonFile(selectedFile);
    setLessonFileError(
      selectedFile !== null && !fileMatchesLessonUploadRule(selectedFile, uploadRule),
    );
  };
  const toggleCreateLesson = () => {
    setIsLessonFormOpen((isOpen) => !isOpen);
    setCreatedLessonUploadFailure(null);
  };

  return (
    <article
      className={styles.page}
      aria-busy={updateCourse.isPending || createLesson.isPending || remove.isPending}
    >
      <InstructorCourseEditorHeader courseTitle={course.data.title} />
      <section
        className={`${styles.panel} ${styles.courseDetailsPanel}`}
        aria-labelledby="course-details-heading"
      >
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon} aria-hidden="true">
            <FileText />
          </span>
          <h2 id="course-details-heading">{t('routes:courseDetailsTitle')}</h2>
        </div>
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
              required
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
              required
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
          <div className={styles.formActions}>
            <Button
              type="submit"
              className={styles.pendingPrimaryAction}
              disabled={updateCourse.isPending}
              aria-busy={updateCourse.isPending}
            >
              {t('instructor:courseEditorSaveChanges')}
            </Button>
          </div>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="lessons-heading">
        <div className={styles.sectionHeadingRow}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden="true">
              <BookOpen />
            </span>
            <h2 id="lessons-heading">{t('instructor:courseEditorLessons')}</h2>
          </div>
          <Button
            id="add-lesson-trigger"
            type="button"
            variant="secondary"
            className={styles.lessonDisclosureButton}
            aria-expanded={isLessonFormOpen}
            aria-controls="create-lesson-panel"
            onClick={toggleCreateLesson}
          >
            <Plus aria-hidden="true" />
            {t('instructor:courseEditorAddLesson')}
          </Button>
        </div>
        {course.data.lessons.length === 0 ? (
          <div className={styles.emptyLessons}>
            <h3>{t('instructor:courseEditorNoLessonsYet')}</h3>
            <p>{t('instructor:courseEditorThisCourseHasNoLessonsYet')}</p>
          </div>
        ) : (
          <ul className={styles.lessonList}>
            {course.data.lessons.map((lesson) => (
              <li key={lesson.id} className={styles.lessonRow}>
                <div className={styles.lessonSummary}>
                  <span className={styles.lessonIcon} aria-hidden="true">
                    <LessonTypeIcon lessonType={lesson.lessonType} />
                  </span>
                  <div>
                    <h3>{lesson.title}</h3>
                    <p>
                      {t(LESSON_TYPE_LABEL_KEY[lesson.lessonType])}
                      <span
                        className={`${styles.statusDot} ${lesson.isPublished ? styles.statusDotPublished : ''}`}
                        aria-hidden="true"
                      />
                      {lesson.isPublished
                        ? t('course:published')
                        : t('instructor:courseEditorNotPublished')}
                    </p>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.backLink} to={`/instructor/lessons/${lesson.id}/edit`}>
                    <Pencil aria-hidden="true" size={18} />
                    {t('routes:editLessonTitle')}
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    className={styles.lessonDeleteAction}
                    aria-label={t('instructor:courseEditorDeleteLesson')}
                    disabled={remove.isPending}
                    onClick={() => {
                      remove.reset();
                      setDeleteTarget(lesson);
                    }}
                  >
                    <Trash2 aria-hidden="true" size={19} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {createdLessonUploadFailure ? (
        <Notice tone="error" title={t('instructor:lessonEditorSourceFileUploadFailed')}>
          <p>{t('instructor:courseEditorLessonCreatedFileUploadFailed')}</p>
          <Link
            id="created-lesson-upload-retry"
            className={styles.backLink}
            to={`/instructor/lessons/${createdLessonUploadFailure.lessonId}/edit`}
          >
            <Pencil aria-hidden="true" size={18} />
            {t('routes:editLessonTitle')}
          </Link>
        </Notice>
      ) : null}
      {isLessonFormOpen ? (
        <section
          id="create-lesson-panel"
          className={styles.panel}
          aria-labelledby="create-lesson-heading"
        >
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
              onValueChange={(value) => {
                setLessonForm({ ...lessonForm, lessonType: value as LessonType });
                setLessonFile(null);
                setLessonFileError(false);
                if (lessonFileRef.current) lessonFileRef.current.value = '';
              }}
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
              onChange={(event) =>
                setLessonForm({ ...lessonForm, description: event.target.value })
              }
            />
            {uploadRule ? (
              <div className={styles.uploadField}>
                <label className={styles.fileLabel} htmlFor="create-lesson-file">
                  {t('instructor:courseEditorOptionalLessonFile')}
                </label>
                <div className={styles.uploadPicker}>
                  <input
                    ref={lessonFileRef}
                    id="create-lesson-file"
                    className={styles.uploadInput}
                    type="file"
                    accept={uploadRule.accept}
                    aria-invalid={lessonFileError || undefined}
                    aria-describedby={
                      lessonFileError ? 'create-lesson-file-error' : 'create-lesson-file-help'
                    }
                    onChange={changeLessonFile}
                  />
                  <UploadCloud aria-hidden="true" />
                  <span className={styles.uploadPrompt}>
                    {t('instructor:lessonEditorUploadLessonFile')}
                  </span>
                  <span id="create-lesson-file-help" className={styles.uploadHelp}>
                    {uploadRule.descriptionKey === 'instructor:lessonEditorMp4WebmOrMovUpTo150Mb'
                      ? t('instructor:lessonEditorMp4WebmOrMovUpTo150Mb')
                      : t('instructor:lessonEditorPdfUpTo50Mb')}
                  </span>
                  {lessonFile ? <span className={styles.fileName}>{lessonFile.name}</span> : null}
                </div>
                {lessonFileError ? (
                  <span id="create-lesson-file-error" className={styles.fieldError} role="alert">
                    {t('instructor:lessonEditorChooseAFileThatMatchesTheStatedTypeAndSizeLimit')}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className={styles.uploadUnavailable}>
                <FileText aria-hidden="true" />
                <p>{t('instructor:lessonEditorFileUploadIsUnavailableForTextLessons')}</p>
              </div>
            )}
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
              <span
                id="create-lesson-is-published-error"
                className={styles.fieldError}
                role="alert"
              >
                {resolvedLessonFieldErrors.isPublished}
              </span>
            ) : null}
            {lessonFailure && Object.keys(lessonFieldErrors).length === 0 ? (
              <div ref={lessonErrorRef} tabIndex={-1} role="alert">
                <Notice tone="error">{lessonFailure.summary}</Notice>
              </div>
            ) : null}
            <div className={styles.formActions}>
              <Button
                type="submit"
                state={createLesson.isPending ? 'loading' : 'idle'}
                loadingLabel={t('instructor:courseEditorCreatingLesson')}
              >
                {t('instructor:courseEditorCreateLesson')}
              </Button>
            </div>
          </form>
        </section>
      ) : null}
      <section
        className={`${styles.panel} ${styles.dangerZone}`}
        aria-labelledby="danger-zone-heading"
      >
        <div className={styles.dangerZoneCopy}>
          <span className={styles.dangerZoneIcon} aria-hidden="true">
            <TriangleAlert />
          </span>
          <div>
            <h2 id="danger-zone-heading">{t('instructor:courseEditorDangerZone')}</h2>
            <p>{t('instructor:courseEditorDangerZoneDescription')}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          className={styles.dangerZoneButton}
          disabled={updateCourse.isPending || createLesson.isPending}
          onClick={() => {
            remove.reset();
            setDeleteTarget('course');
          }}
        >
          <Trash2 aria-hidden="true" size={19} />
          {t('instructor:courseEditorDeleteCourse')}
        </Button>
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
