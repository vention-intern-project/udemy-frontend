import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ChevronLeft, CircleCheck, FileText, UploadCloud } from 'lucide-react';

import type { LessonType } from '@entities/course';
import {
  instructorEditorCourseQueryKey,
  instructorEditorLessonQueryKey,
  createInstructorLessonUploadStatusObserver,
  mapInstructorEditorFormFailure,
  resolveInstructorEditorFailureMessage,
  resolveInstructorEditorFormFailure,
  requestInstructorEditorLesson,
  updateInstructorLesson,
  uploadInstructorLessonFile,
  type InstructorLessonUploadObservation,
  type InstructorLessonUploadReference,
  type InstructorLessonUploadStatusObserver,
  type UpdateInstructorLessonInput,
  type InstructorEditorFormFailure,
} from '@features/instructor-course-editor';
import { useSession } from '@features/auth-session';
import {
  Button,
  ContextualNavigationLink,
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
  const [uploadReference, setUploadReference] = useState<InstructorLessonUploadReference | null>(
    null,
  );
  const [uploadObservation, setUploadObservation] =
    useState<InstructorLessonUploadObservation | null>(null);
  const uploadObserverRef = useRef<InstructorLessonUploadStatusObserver | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const lessonTypeRef = useRef<HTMLButtonElement>(null);
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
        uploadObserverRef.current?.dispose();
        uploadObserverRef.current = null;
        setUploadReference(null);
        setUploadObservation(null);
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
    onMutate: () => {
      uploadObserverRef.current?.dispose();
      uploadObserverRef.current = null;
      setUploadReference(null);
      setUploadObservation(null);
      return lesson.data?.courseId;
    },
    onSuccess: async (acknowledgement, _variables, courseId) => {
      setUploadFailure(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setUploadReference({
        lessonId: acknowledgement.lessonId,
        uploadId: acknowledgement.uploadId,
      });
      setUploadObservation('queued');
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
  useEffect(() => {
    uploadObserverRef.current?.dispose();
    uploadObserverRef.current = null;
    if (
      uploadReference === null ||
      lessonId === null ||
      session.cacheEpoch === null ||
      uploadReference.lessonId !== lessonId
    ) {
      setUploadObservation((currentObservation) =>
        currentObservation === null ? currentObservation : null,
      );
      return;
    }
    let observer: InstructorLessonUploadStatusObserver | null = null;
    observer = createInstructorLessonUploadStatusObserver({
      session,
      reference: uploadReference,
      onStatus: (nextObservation) => {
        if (uploadObserverRef.current === observer) setUploadObservation(nextObservation);
      },
    });
    uploadObserverRef.current = observer;
    return () => {
      observer?.dispose();
      if (uploadObserverRef.current === observer) uploadObserverRef.current = null;
    };
  }, [lessonId, session, uploadReference]);
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
  const hasUnsavedChanges =
    form !== null &&
    lesson.data !== undefined &&
    (form.title !== lesson.data.title ||
      form.lessonType !== lesson.data.lessonType ||
      form.description !== (lesson.data.description ?? '') ||
      form.isPublished !== lesson.data.isPublished);
  return (
    <article className={styles.page} aria-busy={update.isPending || upload.isPending}>
      <header className={styles.header}>
        <ContextualNavigationLink
          className={styles.backLink}
          to={`/instructor/courses/${lesson.data.courseId}/edit`}
        >
          <ChevronLeft aria-hidden="true" focusable="false" size={18} />
          <span>{t('instructor:lessonEditorBackToCourse')}</span>
        </ContextualNavigationLink>
        <h1>{t('routes:editLessonTitle')}</h1>
        <p className={styles.eyebrow}>{t('instructor:lessonEditorInstructorWorkspace')}</p>
      </header>
      <section className={styles.panel} aria-labelledby="lesson-details-heading">
        <h2 id="lesson-details-heading">{t('instructor:lessonEditorLessonDetails')}</h2>
        <form id="lesson-details-form" className={styles.form} onSubmit={submit}>
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
            onValueChange={(value) => {
              setForm({ ...form, lessonType: value as LessonType });
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
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="upload-heading">
        <h2 id="upload-heading">{t('instructor:lessonEditorUploadLessonFile')}</h2>
        {rule === null ? (
          <div className={styles.uploadUnavailable}>
            <FileText aria-hidden="true" focusable="false" size={24} />
            <p>{t('instructor:lessonEditorFileUploadIsUnavailableForTextLessons')}</p>
          </div>
        ) : uploadObservation === 'queued' ? (
          <Notice tone="info" title={t('instructor:lessonEditorUploadStatusQueued')} />
        ) : uploadObservation === 'processing' ? (
          <Notice tone="info" title={t('instructor:lessonEditorUploadStatusProcessing')} />
        ) : uploadObservation === 'ready' ? (
          <Notice tone="success" title={t('instructor:lessonEditorUploadedSourceFileReady')}>
            {t('instructor:lessonEditorSubtitleAndGeneratedMediaStatusUnavailable')}
          </Notice>
        ) : uploadObservation === 'failed' ? (
          <Notice tone="error" title={t('instructor:lessonEditorSourceFileUploadFailed')} />
        ) : uploadObservation === 'unavailable' ? (
          <Notice tone="info">
            {t('instructor:lessonEditorUploadStatusUnavailableCheckLater')}
          </Notice>
        ) : (
          <form className={styles.form} onSubmit={submitUpload}>
            <div className={styles.uploadField}>
              <label className={styles.fileLabel} htmlFor="lesson-upload-file">
                {t('instructor:lessonEditorLessonFile')}
              </label>
              <div className={styles.uploadPicker}>
                <input
                  ref={fileRef}
                  id="lesson-upload-file"
                  className={styles.uploadInput}
                  name="file"
                  type="file"
                  accept={rule.accept}
                  aria-invalid={resolvedUploadFailure?.fields.file ? true : undefined}
                  aria-describedby={
                    resolvedUploadFailure?.fields.file
                      ? 'lesson-upload-file-help lesson-upload-file-error'
                      : 'lesson-upload-file-help'
                  }
                  onChange={selectFile}
                />
                <UploadCloud aria-hidden="true" focusable="false" size={28} />
                <span className={styles.uploadPrompt}>
                  {t('instructor:lessonEditorUploadLessonFile')}
                </span>
                <span id="lesson-upload-file-help" className={styles.uploadHelp}>
                  {rule.description}
                </span>
                {file ? <span className={styles.fileName}>{file.name}</span> : null}
              </div>
              {resolvedUploadFailure?.fields.file ? (
                <span id="lesson-upload-file-error" className={styles.fieldError} role="alert">
                  {resolvedUploadFailure.fields.file}
                </span>
              ) : null}
            </div>
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
      <div className={styles.pageActions}>
        {hasUnsavedChanges || update.isPending ? (
          <Button
            type="submit"
            form="lesson-details-form"
            className={update.isPending ? styles.pendingPrimaryAction : undefined}
            disabled={update.isPending}
            aria-busy={update.isPending}
          >
            {t('instructor:lessonEditorSaveLesson')}
          </Button>
        ) : (
          <span className={styles.savedState} role="status" aria-live="polite" aria-atomic="true">
            <CircleCheck aria-hidden="true" focusable="false" size={20} />
            {t('instructor:lessonEditorAllChangesSaved')}
          </span>
        )}
      </div>
    </article>
  );
}
