import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { LessonType } from '@entities/course';
import {
  instructorEditorCourseQueryKey,
  instructorEditorLessonQueryKey,
  mapInstructorEditorFormFailure,
  requestInstructorEditorLesson,
  updateInstructorLesson,
  uploadInstructorLessonFile,
  type UpdateInstructorLessonInput,
} from '@features/instructor-course-editor';
import { useSession } from '@features/auth-session';
import {
  Button,
  Input,
  Notice,
  Select,
  Skeleton,
  SkeletonGroup,
  Textarea,
} from '@shared/ui/primitives';

import styles from './InstructorLessonEditorPage.module.css';

interface LessonFormState extends UpdateInstructorLessonInput {}

type LessonFieldErrors = Readonly<Record<string, string>>;
type UploadFieldErrors = Readonly<Record<string, string>>;

interface UploadRule {
  readonly accept: string;
  readonly description: string;
  readonly maxBytes: number;
}

const LESSON_ERROR_FIELDS = {
  title: { field: 'title', label: 'Lesson title' },
  lesson_type: { field: 'lessonType', label: 'Lesson type' },
  description: { field: 'description', label: 'Description' },
  is_published: { field: 'isPublished', label: 'Publish this lesson' },
};

const UPLOAD_ERROR_FIELDS = {
  file: { field: 'file', label: 'Lesson file' },
};

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function uploadRule(type: LessonType): UploadRule | null {
  if (type === 'video')
    return {
      accept: '.mp4,.webm,.mov',
      maxBytes: 150 * 1024 * 1024,
      description: 'MP4, WebM, or MOV up to 150 MB.',
    };
  if (type === 'pdf')
    return { accept: '.pdf', maxBytes: 50 * 1024 * 1024, description: 'PDF up to 50 MB.' };
  return null;
}

function fileMatchesUploadRule(file: File, rule: UploadRule | null): boolean {
  if (rule === null) return false;
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  return rule.accept.split(',').includes(extension) && file.size <= rule.maxBytes;
}

export function InstructorLessonEditorPage() {
  const lessonId = positiveInteger(useParams().lessonId);
  const session = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LessonFormState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<LessonFieldErrors>({});
  const [uploadFieldErrors, setUploadFieldErrors] = useState<UploadFieldErrors>({});
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const lessonTypeRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const publishedRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const uploadErrorRef = useRef<HTMLDivElement>(null);
  const lesson = useQuery({
    queryKey: instructorEditorLessonQueryKey(session.cacheEpoch, lessonId ?? 0),
    queryFn: ({ signal }) => requestInstructorEditorLesson(session, lessonId as number, signal),
    enabled: lessonId !== null,
  });
  useEffect(() => {
    if (!lesson.data) return;
    setForm({
      title: lesson.data.title,
      lessonType: lesson.data.lessonType,
      description: lesson.data.description ?? '',
      isPublished: lesson.data.isPublished,
    });
  }, [lesson.data]);
  const refresh = (courseId: number) =>
    lessonId === null
      ? Promise.resolve()
      : Promise.all([
          queryClient.invalidateQueries({
            queryKey: instructorEditorLessonQueryKey(session.cacheEpoch, lessonId),
          }),
          queryClient.invalidateQueries({
            queryKey: instructorEditorCourseQueryKey(session.cacheEpoch, courseId),
          }),
        ]);
  const update = useMutation({
    mutationFn: () => {
      if (lessonId === null || form === null) throw new Error('Lesson form is unavailable');
      return updateInstructorLesson(session, lessonId, form);
    },
    onSuccess: async (updatedLesson) => {
      setFormError(null);
      setFormFieldErrors({});
      if (updatedLesson.lessonType !== lesson.data?.lessonType) {
        const nextRule = uploadRule(updatedLesson.lessonType);
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        if (nextRule) {
          const message =
            'The lesson type changed. Choose a file that matches the updated lesson type.';
          setUploadError(message);
          setUploadFieldErrors({ file: message });
        } else {
          setUploadError(null);
          setUploadFieldErrors({});
        }
      } else {
        setUploadError(null);
        setUploadFieldErrors({});
      }
      await refresh(updatedLesson.courseId);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          action: 'save this lesson',
          unauthorized: 'Sign in again before continuing.',
          forbidden: 'You do not have permission to change this lesson.',
          notFound: 'This lesson is no longer available.',
        },
        LESSON_ERROR_FIELDS,
      );
      setFormError(failure.summary);
      setFormFieldErrors(failure.fields);
    },
  });
  const upload = useMutation({
    mutationFn: () => {
      if (lessonId === null || file === null) throw new Error('Choose a file first');
      return uploadInstructorLessonFile(session, lessonId, file);
    },
    onSuccess: async (updatedLesson) => {
      setUploadError(null);
      setUploadFieldErrors({});
      setFile(null);
      setUploadSuccess(true);
      await refresh(updatedLesson.courseId);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          action: 'upload this file',
          unauthorized: 'Sign in again before continuing.',
          forbidden: 'You do not have permission to change this lesson.',
          notFound: 'This lesson is no longer available.',
          badRequest: 'Choose a file that matches this lesson type and size limit.',
        },
        UPLOAD_ERROR_FIELDS,
      );
      setUploadError(failure.summary);
      setUploadFieldErrors(failure.fields);
    },
  });
  useEffect(() => {
    if (formFieldErrors.title) titleRef.current?.focus({ preventScroll: true });
    else if (formFieldErrors.lessonType) lessonTypeRef.current?.focus({ preventScroll: true });
    else if (formFieldErrors.description) descriptionRef.current?.focus({ preventScroll: true });
    else if (formFieldErrors.isPublished) publishedRef.current?.focus({ preventScroll: true });
    else if (formError) formErrorRef.current?.focus({ preventScroll: true });
  }, [formError, formFieldErrors]);
  useEffect(() => {
    if (uploadFieldErrors.file) fileRef.current?.focus({ preventScroll: true });
    else if (uploadError) uploadErrorRef.current?.focus({ preventScroll: true });
  }, [uploadError, uploadFieldErrors]);
  if (lessonId === null)
    return (
      <Notice tone="error" title="Lesson not found">
        This lesson address is not valid.
      </Notice>
    );
  if (lesson.isPending)
    return (
      <SkeletonGroup label="Loading lesson editor">
        <Skeleton width="100%" height="320px" shape="rect" />
      </SkeletonGroup>
    );
  if (lesson.isError)
    return (
      <Notice tone="error" title="Lesson editor unavailable">
        <p>
          {
            mapInstructorEditorFormFailure(
              lesson.error,
              {
                action: 'load this lesson',
                unauthorized: 'Sign in again before continuing.',
                forbidden: 'You do not have permission to change this lesson.',
                notFound: 'This lesson is no longer available.',
              },
              LESSON_ERROR_FIELDS,
            ).summary
          }
        </p>
        <Button variant="secondary" onClick={() => void lesson.refetch()}>
          Try again
        </Button>
      </Notice>
    );
  if (!lesson.data || !form) return null;
  const rule = uploadRule(lesson.data.lessonType);
  const formFailure = formError;
  const uploadFailure = uploadError;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (update.isPending) return;
    if (form.title.trim() === '') {
      setFormError('Enter a lesson title.');
      setFormFieldErrors({ title: 'Enter a lesson title.' });
      titleRef.current?.focus();
      return;
    }
    setFormError(null);
    setFormFieldErrors({});
    update.mutate();
  };
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    if (!next || rule === null) {
      setFile(null);
      return;
    }
    if (!fileMatchesUploadRule(next, rule)) {
      setFile(null);
      setUploadError('Choose a file that matches the stated type and size limit.');
      setUploadFieldErrors({ file: 'Choose a file that matches the stated type and size limit.' });
      return;
    }
    setUploadError(null);
    setUploadFieldErrors({});
    setFile(next);
  };
  const submitUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (upload.isPending) return;
    if (!file) {
      setUploadError('Choose a file before uploading.');
      setUploadFieldErrors({ file: 'Choose a file before uploading.' });
      return;
    }
    if (!fileMatchesUploadRule(file, rule)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setUploadError('Choose a file that matches the stated type and size limit.');
      setUploadFieldErrors({ file: 'Choose a file that matches the stated type and size limit.' });
      return;
    }
    setUploadError(null);
    setUploadFieldErrors({});
    upload.mutate();
  };
  return (
    <article className={styles.page} aria-busy={update.isPending || upload.isPending}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Instructor workspace</p>
          <h1>Edit lesson</h1>
        </div>
        <Link className={styles.backLink} to={`/instructor/courses/${lesson.data.courseId}/edit`}>
          Back to course
        </Link>
      </header>
      <section className={styles.panel} aria-labelledby="lesson-details-heading">
        <h2 id="lesson-details-heading">Lesson details</h2>
        <form className={styles.form} onSubmit={submit}>
          <Input
            ref={titleRef}
            label="Lesson title"
            name="title"
            maxLength={255}
            required
            value={form.title}
            error={formFieldErrors.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Select
            ref={lessonTypeRef}
            label="Lesson type"
            name="lesson-type"
            value={form.lessonType}
            error={formFieldErrors.lessonType}
            onChange={(event) => {
              setForm({ ...form, lessonType: event.target.value as LessonType });
            }}
          >
            <option value="video">Video</option>
            <option value="text">Text</option>
            <option value="pdf">PDF</option>
          </Select>
          <Textarea
            ref={descriptionRef}
            label="Description"
            name="description"
            value={form.description}
            error={formFieldErrors.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <label className={styles.checkbox}>
            <input
              ref={publishedRef}
              type="checkbox"
              name="is_published"
              checked={form.isPublished}
              aria-invalid={formFieldErrors.isPublished ? true : undefined}
              aria-describedby={
                formFieldErrors.isPublished ? 'edit-lesson-is-published-error' : undefined
              }
              onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
            />{' '}
            Publish this lesson
          </label>
          {formFieldErrors.isPublished ? (
            <span id="edit-lesson-is-published-error" className={styles.fieldError} role="alert">
              {formFieldErrors.isPublished}
            </span>
          ) : null}
          {formFailure && Object.keys(formFieldErrors).length === 0 ? (
            <div ref={formErrorRef} tabIndex={-1} role="alert">
              <Notice tone="error">{formFailure}</Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={update.isPending ? 'loading' : 'idle'}
            loadingLabel="Saving lesson"
          >
            Save lesson
          </Button>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="upload-heading">
        <h2 id="upload-heading">Upload lesson file</h2>
        {rule === null ? (
          <Notice tone="info">File upload is unavailable for text lessons.</Notice>
        ) : uploadSuccess ? (
          <Notice tone="info" title="File accepted and saved">
            Processing status is unavailable.
          </Notice>
        ) : (
          <form className={styles.form} onSubmit={submitUpload}>
            <Input
              ref={fileRef}
              label="Lesson file"
              name="file"
              type="file"
              accept={rule.accept}
              helpText={rule.description}
              error={uploadFieldErrors.file}
              onChange={selectFile}
            />
            {uploadFailure && Object.keys(uploadFieldErrors).length === 0 ? (
              <div ref={uploadErrorRef} tabIndex={-1} role="alert">
                <Notice tone="error">{uploadFailure}</Notice>
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={file === null}
              state={upload.isPending ? 'loading' : 'idle'}
              loadingLabel="Uploading file"
            >
              Upload file
            </Button>
          </form>
        )}
      </section>
    </article>
  );
}
