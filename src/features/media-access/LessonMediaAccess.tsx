import { lazy, Suspense, useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import type { LessonMediaLocator, LessonSubtitleLocator, LessonType } from '@entities/course';
import { Button, VisuallyHidden } from '@shared/ui/primitives';

import { useAuthorizedLessonMedia } from './useAuthorizedLessonMedia';

import styles from './LessonMediaAccess.module.css';

const LessonPdfPreview = lazy(() => import('./LessonPdfPreview'));

export interface LessonMediaAccessProps {
  readonly lessonType: LessonType;
  /** Whether the learner can access this lesson in the current course outline. */
  readonly isPublished: boolean;
  readonly locator: LessonMediaLocator | null;
  readonly subtitleLocator?: LessonSubtitleLocator | null;
  readonly textContent?: string | null;
}

export function LessonMediaAccess({
  lessonType,
  isPublished,
  locator,
  subtitleLocator = null,
  textContent = null,
}: LessonMediaAccessProps) {
  const { t } = useTranslation();
  const media = useAuthorizedLessonMedia(lessonType, locator, subtitleLocator);
  const videoRef = useRef<HTMLVideoElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const retryContainerRef = useRef<HTMLDivElement>(null);
  const loadTriggerRef = useRef<HTMLSpanElement>(null);
  const textReaderRef = useRef<HTMLElement>(null);
  const restoreLoadFocusRef = useRef(false);
  const textReaderId = `lesson-text-reader-${useId()}`;
  const [textOpen, setTextOpen] = useState(false);

  useEffect(() => {
    if (media.state.status === 'available') {
      if (media.state.kind === 'video' && media.state.presentation === 'ready')
        videoRef.current?.focus();
      return;
    }
    if (media.state.status === 'unavailable' || media.state.status === 'sign_in_required') {
      statusRef.current?.focus();
      return;
    }
    if (media.state.status === 'error') retryContainerRef.current?.querySelector('button')?.focus();
  }, [media.state]);

  useEffect(() => {
    if (
      media.state.status !== 'idle' ||
      (lessonType === 'text' && textOpen) ||
      !restoreLoadFocusRef.current
    )
      return;
    restoreLoadFocusRef.current = false;
    loadTriggerRef.current?.querySelector('button')?.focus();
  }, [lessonType, media.state.status, textOpen]);

  useEffect(() => {
    if (textOpen) textReaderRef.current?.focus();
  }, [textOpen]);

  function handleVideoLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const objectUrl = video.getAttribute('src');
    if (objectUrl === null) return;
    const isReady =
      video.readyState >= HTMLMediaElement.HAVE_METADATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0;
    if (isReady) media.markVideoReady(objectUrl);
    else media.reportVideoError(objectUrl);
  }

  function handleVideoError(event: SyntheticEvent<HTMLVideoElement>) {
    const objectUrl = event.currentTarget.getAttribute('src');
    if (objectUrl !== null) media.reportVideoError(objectUrl);
  }

  function handleMediaClose() {
    restoreLoadFocusRef.current = true;
    media.close();
  }

  function handleTextClose() {
    restoreLoadFocusRef.current = true;
    setTextOpen(false);
  }

  if (!isPublished) {
    return <p className={styles.unavailable}>{t('course:mediaUnavailableInWorkspace')}</p>;
  }

  if (lessonType === 'text') {
    if (!textOpen)
      return (
        <span ref={loadTriggerRef}>
          <Button
            variant="secondary"
            aria-expanded={false}
            aria-controls={textReaderId}
            onClick={() => setTextOpen(true)}
          >
            {t('catalog:details')}
          </Button>
        </span>
      );
    return (
      <section
        ref={textReaderRef}
        id={textReaderId}
        className={styles.textReader}
        role="region"
        aria-label={t('learning:textLessonType')}
        tabIndex={-1}
      >
        <div className={styles.textActions}>
          <Button
            className={styles.closeButton}
            variant="ghost"
            size="sm"
            aria-label={t('a11y:closeDialog', { defaultValue: 'Close dialog' })}
            onClick={handleTextClose}
          >
            <X aria-hidden="true" focusable="false" size={18} strokeWidth={1.75} />
          </Button>
        </div>
        <p className={styles.textBody}>
          {textContent ??
            t('course:noLessonDescriptionIsAvailable', {
              defaultValue: 'No lesson description is available.',
            })}
        </p>
      </section>
    );
  }
  if (!media.canLoad || media.state.status === 'unavailable') {
    const requestedUnavailable = media.state.status === 'unavailable';
    return (
      <p
        ref={requestedUnavailable ? statusRef : undefined}
        className={styles.unavailable}
        role={requestedUnavailable ? 'status' : undefined}
        tabIndex={requestedUnavailable ? -1 : undefined}
      >
        {t('course:mediaUnavailableInWorkspace')}
      </p>
    );
  }
  if (media.state.status === 'sign_in_required') {
    return (
      <p ref={statusRef} className={styles.unavailable} role="status" tabIndex={-1}>
        {t('cart:signInRequired')}
      </p>
    );
  }
  if (media.state.status === 'available') {
    return media.state.kind === 'video' ? (
      <div className={styles.videoShell}>
        <div className={styles.videoActions}>
          <Button
            className={styles.closeButton}
            variant="ghost"
            size="sm"
            aria-label={t('a11y:closeDialog', { defaultValue: 'Close dialog' })}
            onClick={handleMediaClose}
          >
            <X aria-hidden="true" focusable="false" size={18} strokeWidth={1.75} />
          </Button>
        </div>
        <div className={styles.mediaFrame} data-part="lesson-media-frame">
          <video
            ref={videoRef}
            className={styles.media}
            aria-busy={media.state.presentation === 'loading_metadata' || undefined}
            aria-label={t('learning:lessonVideoPreview', { defaultValue: 'Lesson video preview' })}
            controls
            onError={handleVideoError}
            onLoadedMetadata={handleVideoLoadedMetadata}
            preload="metadata"
            src={media.state.objectUrl}
            tabIndex={0}
          >
            {media.state.subtitleObjectUrl ? (
              <track
                data-part="lesson-subtitle-track"
                default
                kind="subtitles"
                label={t('learning:subtitleTrackLabel', { defaultValue: 'Subtitles' })}
                src={media.state.subtitleObjectUrl}
                srcLang="und"
              />
            ) : null}
          </video>
        </div>
        <VisuallyHidden as="p" role="status">
          {media.state.presentation === 'ready'
            ? t('learning:videoReady', { defaultValue: 'Video ready.' })
            : t('learning:preparingVideo', { defaultValue: 'Preparing video…' })}
        </VisuallyHidden>
      </div>
    ) : (
      <div className={styles.mediaFrame} data-part="lesson-media-frame">
        <Suspense
          fallback={
            <div className={styles.pdfLoading}>
              <div className={styles.pdfLoadingActions}>
                <Button
                  className={styles.pdfLoadingCloseButton}
                  variant="ghost"
                  aria-label={t('a11y:closeDialog', { defaultValue: 'Close dialog' })}
                  onClick={handleMediaClose}
                >
                  <X aria-hidden="true" focusable="false" size={18} strokeWidth={1.75} />
                </Button>
              </div>
              <p className={styles.pdfLoadingStatus} role="status">
                {t('course:preparingPdfPreview')}
              </p>
            </div>
          }
        >
          <LessonPdfPreview file={media.state.file} onClose={handleMediaClose} />
        </Suspense>
      </div>
    );
  }
  if (media.state.status === 'error') {
    return (
      <div ref={retryContainerRef} className={styles.failure}>
        <p role="status">
          {t('learning:mediaCouldNotBeLoadedTry', {
            defaultValue: 'Media could not be loaded. Try again.',
          })}
        </p>
        <Button variant="secondary" onClick={media.load}>
          {t('routes:tryAgain', { defaultValue: 'Try again' })}
        </Button>
      </div>
    );
  }
  const label =
    lessonType === 'video'
      ? t('learning:loadVideo', { defaultValue: 'Load video' })
      : t('learning:loadPdf', { defaultValue: 'Load PDF' });
  const isLoading = media.state.status === 'loading';
  return (
    <span ref={loadTriggerRef}>
      <Button variant="secondary" aria-busy={isLoading || undefined} onClick={media.load}>
        {isLoading ? t('learning:loadingMedia', { defaultValue: 'Loading media…' }) : label}
      </Button>
      {isLoading ? (
        <VisuallyHidden as="p" role="status">
          {t('learning:loadingMedia', { defaultValue: 'Loading media…' })}
        </VisuallyHidden>
      ) : null}
    </span>
  );
}
