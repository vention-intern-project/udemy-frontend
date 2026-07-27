import { lazy, Suspense, useEffect, useRef, type SyntheticEvent } from 'react';

import type { LessonMediaLocator, LessonType } from '@entities/course';
import { Button, VisuallyHidden } from '@shared/ui/primitives';

import { useAuthorizedLessonMedia } from './useAuthorizedLessonMedia';

import styles from './LessonMediaAccess.module.css';

const LessonPdfPreview = lazy(() => import('./LessonPdfPreview'));

export interface LessonMediaAccessProps {
  readonly lessonType: LessonType;
  readonly locator: LessonMediaLocator | null;
}

export function LessonMediaAccess({ lessonType, locator }: LessonMediaAccessProps) {
  const media = useAuthorizedLessonMedia(lessonType, locator);
  const videoRef = useRef<HTMLVideoElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const retryContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (media.state.status === 'available') {
      if (media.state.kind === 'video' && media.state.presentation === 'ready') videoRef.current?.focus();
      return;
    }
    if (media.state.status === 'unavailable' || media.state.status === 'sign_in_required') {
      statusRef.current?.focus();
      return;
    }
    if (media.state.status === 'error') retryContainerRef.current?.querySelector('button')?.focus();
  }, [media.state]);

  function handleVideoLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const objectUrl = video.getAttribute('src');
    if (objectUrl === null) return;
    const isReady = video.readyState >= HTMLMediaElement.HAVE_METADATA
      && video.videoWidth > 0
      && video.videoHeight > 0
      && Number.isFinite(video.duration)
      && video.duration > 0;
    if (isReady) media.markVideoReady(objectUrl);
    else media.reportVideoError(objectUrl);
  }

  function handleVideoError(event: SyntheticEvent<HTMLVideoElement>) {
    const objectUrl = event.currentTarget.getAttribute('src');
    if (objectUrl !== null) media.reportVideoError(objectUrl);
  }

  if (!media.canLoad || media.state.status === 'unavailable') {
    const requestedUnavailable = media.state.status === 'unavailable';
    return <p ref={requestedUnavailable ? statusRef : undefined} className={styles.unavailable} role={requestedUnavailable ? 'status' : undefined} tabIndex={requestedUnavailable ? -1 : undefined}>Media unavailable in this workspace</p>;
  }
  if (media.state.status === 'sign_in_required') {
    return <p ref={statusRef} className={styles.unavailable} role="status" tabIndex={-1}>Sign in required</p>;
  }
  if (media.state.status === 'available') {
    return media.state.kind === 'video'
      ? <div className={styles.mediaFrame} data-part="lesson-media-frame"><video ref={videoRef} className={styles.media} aria-busy={media.state.presentation === 'loading_metadata' || undefined} aria-label="Lesson video preview" controls onError={handleVideoError} onLoadedMetadata={handleVideoLoadedMetadata} preload="metadata" src={media.state.objectUrl} tabIndex={0} /><VisuallyHidden as="p" role="status">{media.state.presentation === 'ready' ? 'Video ready.' : 'Preparing video…'}</VisuallyHidden></div>
      : <div className={styles.mediaFrame} data-part="lesson-media-frame"><Suspense fallback={<p className={styles.pdfLoading} role="status">Preparing PDF preview…</p>}><LessonPdfPreview file={media.state.file} /></Suspense></div>;
  }
  if (media.state.status === 'error') {
    return <div ref={retryContainerRef} className={styles.failure}><p role="status">Media could not be loaded. Try again.</p><Button variant="secondary" onClick={media.load}>Try again</Button></div>;
  }
  const label = lessonType === 'video' ? 'Load video' : 'Load PDF';
  const isLoading = media.state.status === 'loading';
  return <><Button variant="secondary" aria-busy={isLoading || undefined} onClick={media.load}>{isLoading ? 'Loading media…' : label}</Button>{isLoading ? <VisuallyHidden as="p" role="status">Loading media…</VisuallyHidden> : null}</>;
}
