import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { LessonType } from '@entities/course';
import {
  instructorEditorCourseQueryKey,
  instructorEditorLessonQueryKey,
  mapInstructorEditorFormFailure,
  resolveInstructorEditorFailureMessage,
  resolveInstructorEditorFormFailure,
  requestInstructorEditorLesson,
  updateInstructorLesson,
  uploadInstructorLessonFile,
  type UpdateInstructorLessonInput,
  type InstructorEditorFormFailure,
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

interface UploadRule {
  readonly accept: string;
  readonly description: string;
  readonly maxBytes: number;
}

function lessonErrorFields() {
  return {
    title: { field: 'title', labelKey: 'courseEditorLessonTitle' },
    lesson_type: { field: 'lessonType', labelKey: 'courseEditorLessonType' },
    description: { field: 'description', labelKey: 'courseEditorDescription' },
    is_published: { field: 'isPublished', labelKey: 'courseEditorPublishThisLesson' },
  };
}

function uploadErrorFields() {
  return { file: { field: 'file', labelKey: 'lessonEditorLessonFile' } };
}

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function uploadRule(type: LessonType, t: TFunction): UploadRule | null {
  if (type === 'video')
    return {
      accept: '.mp4,.webm,.mov',
      maxBytes: 150 * 1024 * 1024,
      description: t('instructor:lessonEditorMp4WebmOrMovUpTo150Mb'),
    };
  if (type === 'pdf')
    return {
      accept: '.pdf',
      maxBytes: 50 * 1024 * 1024,
      description: t('instructor:lessonEditorPdfUpTo50Mb'),
    };
  return null;
}

function fileMatchesUploadRule(file: File, rule: UploadRule | null): boolean {
  if (rule === null) return false;
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  return rule.accept.split(',').includes(extension) && file.size <= rule.maxBytes;
}

export function InstructorLessonEditorPage() {
  const { t } = useTranslation();
  const formErrorFields = lessonErrorFields();
  const fileErrorFields = uploadErrorFields();
  const lessonId = positiveInteger(useParams().lessonId);
  const session = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LessonFormState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formFailure, setFormFailure] = useState<InstructorEditorFormFailure | null>(null);
  const [uploadFailure, setUploadFailure] = useState<InstructorEditorFormFailure | null>(null);
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
      setFormFailure(null);
      if (updatedLesson.lessonType !== lesson.data?.lessonType) {
        setUploadSuccess(false);
        const nextRule = uploadRule(updatedLesson.lessonType, t);
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        if (nextRule) {
          const message = {
            kind: 'resource',
            key: 'lessonEditorTheLessonTypeChangedChooseAFileThatMatchesTheUpdatedLessonType',
          } as const;
          setUploadFailure({ fields: { file: message }, summary: message });
        } else {
          setUploadFailure(null);
        }
      } else {
        setUploadFailure(null);
      }
      await refresh(updatedLesson.courseId);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          actionKey: 'lessonEditorSaveThisLesson',
          unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
          forbiddenKey: 'lessonEditorYouDoNotHavePermissionToChangeThisLesson',
          notFoundKey: 'lessonEditorThisLessonIsNoLongerAvailable',
          badRequestKey: null,
        },
        formErrorFields,
      );
      setFormFailure(failure);
    },
  });
  const upload = useMutation({
    mutationFn: () => {
      if (lessonId === null || file === null) throw new Error('Choose a file first');
      return uploadInstructorLessonFile(session, lessonId, file);
    },
    onMutate: () => lesson.data?.courseId,
    onSuccess: async (_acknowledgement, _variables, courseId) => {
      setUploadFailure(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setUploadSuccess(true);
      if (courseId !== undefined) await refresh(courseId);
    },
    onError: (error) => {
      const failure = mapInstructorEditorFormFailure(
        error,
        {
          actionKey: 'lessonEditorUploadThisFile',
          unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
          forbiddenKey: 'lessonEditorYouDoNotHavePermissionToChangeThisLesson',
          notFoundKey: 'lessonEditorThisLessonIsNoLongerAvailable',
          badRequestKey: 'lessonEditorChooseAFileThatMatchesThisLessonTypeAndSizeLimit',
        },
        fileErrorFields,
      );
      setUploadFailure(failure);
    },
  });
  useEffect(() => {
    if (formFailure?.fields.title) titleRef.current?.focus({ preventScroll: true });
    else if (formFailure?.fields.lessonType) lessonTypeRef.current?.focus({ preventScroll: true });
    else if (formFailure?.fields.description)
      descriptionRef.current?.focus({ preventScroll: true });
    else if (formFailure?.fields.isPublished) publishedRef.current?.focus({ preventScroll: true });
    else if (formFailure) formErrorRef.current?.focus({ preventScroll: true });
  }, [formFailure]);
  useEffect(() => {
    if (uploadFailure?.fields.file) fileRef.current?.focus({ preventScroll: true });
    else if (uploadFailure) uploadErrorRef.current?.focus({ preventScroll: true });
  }, [uploadFailure]);
  if (lessonId === null)
    return (
      <Notice tone="error" title={t('instructor:lessonEditorLessonNotFound')}>
        {t('instructor:lessonEditorLessonAddressInvalid')}
      </Notice>
    );
  if (lesson.isPending)
    return (
      <SkeletonGroup label={t('instructor:lessonEditorLoadingLessonEditor')}>
        <Skeleton width="100%" height="320px" shape="rect" />
      </SkeletonGroup>
    );
  if (lesson.isError)
    return (
      <Notice tone="error" title={t('instructor:lessonEditorLessonEditorUnavailable')}>
        <p>
          {resolveInstructorEditorFailureMessage(
            mapInstructorEditorFormFailure(
              lesson.error,
              {
                actionKey: 'lessonEditorLoadThisLesson',
                unauthorizedKey: 'courseEditorSignInAgainBeforeContinuing',
                forbiddenKey: 'lessonEditorYouDoNotHavePermissionToChangeThisLesson',
                notFoundKey: 'lessonEditorThisLessonIsNoLongerAvailable',
                badRequestKey: null,
              },
              formErrorFields,
            ).summary,
            t,
          )}
        </p>
        <Button variant="secondary" onClick={() => void lesson.refetch()}>
          {t('routes:tryAgain')}
        </Button>
      </Notice>
    );
  if (!lesson.data || !form) return null;
  const rule = uploadRule(lesson.data.lessonType, t);
  const resolvedFormFailure = formFailure
    ? resolveInstructorEditorFormFailure(formFailure, t)
    : null;
  const resolvedUploadFailure = uploadFailure
    ? resolveInstructorEditorFormFailure(uploadFailure, t)
    : null;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (update.isPending) return;
    if (form.title.trim() === '') {
      const message = { kind: 'resource', key: 'courseEditorEnterALessonTitle' } as const;
      setFormFailure({ fields: { title: message }, summary: message });
      titleRef.current?.focus();
      return;
    }
    setFormFailure(null);
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
      const descriptor = {
        kind: 'resource',
        key: 'lessonEditorChooseAFileThatMatchesTheStatedTypeAndSizeLimit',
      } as const;
      setUploadFailure({ fields: { file: descriptor }, summary: descriptor });
      return;
    }
    setUploadFailure(null);
    setFile(next);
  };
  const submitUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (upload.isPending) return;
    if (!file) {
      const descriptor = {
        kind: 'resource',
        key: 'lessonEditorChooseAFileBeforeUploading',
      } as const;
      setUploadFailure({ fields: { file: descriptor }, summary: descriptor });
      return;
    }
    if (!fileMatchesUploadRule(file, rule)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      const descriptor = {
        kind: 'resource',
        key: 'lessonEditorChooseAFileThatMatchesTheStatedTypeAndSizeLimit',
      } as const;
      setUploadFailure({ fields: { file: descriptor }, summary: descriptor });
      return;
    }
    setUploadFailure(null);
    upload.mutate();
  };
  return (
    <article className={styles.page} aria-busy={update.isPending || upload.isPending}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('instructor:lessonEditorInstructorWorkspace')}</p>
          <h1>{t('routes:editLessonTitle')}</h1>
        </div>
        <Link className={styles.backLink} to={`/instructor/courses/${lesson.data.courseId}/edit`}>
          {t('instructor:lessonEditorBackToCourse')}
        </Link>
      </header>
      <section className={styles.panel} aria-labelledby="lesson-details-heading">
        <h2 id="lesson-details-heading">{t('instructor:lessonEditorLessonDetails')}</h2>
        <form className={styles.form} onSubmit={submit}>
          <Input
            ref={titleRef}
            label={t('instructor:courseEditorLessonTitle')}
            name="title"
            maxLength={255}
            required
            value={form.title}
            error={resolvedFormFailure?.fields.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Select
            ref={lessonTypeRef}
            label={t('instructor:courseEditorLessonType')}
            name="lesson-type"
            value={form.lessonType}
            error={resolvedFormFailure?.fields.lessonType}
            onChange={(event) => {
              setForm({ ...form, lessonType: event.target.value as LessonType });
            }}
          >
            <option value="video">{t('instructor:courseEditorVideo')}</option>
            <option value="text">{t('instructor:courseEditorText')}</option>
            <option value="pdf">{t('instructor:courseEditorPdf')}</option>
          </Select>
          <Textarea
            ref={descriptionRef}
            label={t('instructor:courseEditorDescription')}
            name="description"
            value={form.description}
            error={resolvedFormFailure?.fields.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <label className={styles.checkbox}>
            <input
              ref={publishedRef}
              type="checkbox"
              name="is_published"
              checked={form.isPublished}
              aria-invalid={formFailure?.fields.isPublished ? true : undefined}
              aria-describedby={
                formFailure?.fields.isPublished ? 'edit-lesson-is-published-error' : undefined
              }
              onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
            />{' '}
            {t('instructor:courseEditorPublishThisLesson')}
          </label>
          {formFailure?.fields.isPublished ? (
            <span id="edit-lesson-is-published-error" className={styles.fieldError} role="alert">
              {resolvedFormFailure?.fields.isPublished}
            </span>
          ) : null}
          {formFailure && Object.keys(formFailure.fields).length === 0 ? (
            <div ref={formErrorRef} tabIndex={-1} role="alert">
              <Notice tone="error">{resolvedFormFailure?.summary}</Notice>
            </div>
          ) : null}
          <Button
            type="submit"
            state={update.isPending ? 'loading' : 'idle'}
            loadingLabel={t('instructor:lessonEditorSavingLesson')}
          >
            {t('instructor:lessonEditorSaveLesson')}
          </Button>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="upload-heading">
        <h2 id="upload-heading">{t('instructor:lessonEditorUploadLessonFile')}</h2>
        {rule === null ? (
          <Notice tone="info">
            {t('instructor:lessonEditorFileUploadIsUnavailableForTextLessons')}
          </Notice>
        ) : uploadSuccess ? (
          <Notice tone="info" title={t('instructor:lessonEditorFileAcceptedAndQueued')}>
            {t('instructor:lessonEditorProcessingStatusUnavailable')}
          </Notice>
        ) : (
          <form className={styles.form} onSubmit={submitUpload}>
            <Input
              ref={fileRef}
              label={t('instructor:lessonEditorLessonFile')}
              name="file"
              type="file"
              accept={rule.accept}
              helpText={rule.description}
              error={resolvedUploadFailure?.fields.file}
              onChange={selectFile}
            />
            {uploadFailure && Object.keys(uploadFailure.fields).length === 0 ? (
              <div ref={uploadErrorRef} tabIndex={-1} role="alert">
                <Notice tone="error">{resolvedUploadFailure?.summary}</Notice>
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={file === null}
              state={upload.isPending ? 'loading' : 'idle'}
              loadingLabel={t('instructor:lessonEditorUploadingFile')}
            >
              {t('instructor:lessonEditorUploadFile')}
            </Button>
          </form>
        )}
      </section>
    </article>
  );
}
