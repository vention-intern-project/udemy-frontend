import { useCallback, useEffect, useRef, useState } from 'react';

import type { LessonMediaLocator, LessonSubtitleLocator, LessonType } from '@entities/course';
import { useSession } from '@features/auth-session';
import { ApiError } from '@shared/api';

import { requestAuthorizedLessonMedia, requestAuthorizedLessonSubtitles } from './api';
import type { AuthorizedLessonMediaKind, AuthorizedLessonMediaState } from './model';

const VIDEO_CONTENT_TYPES = new Set<string>(['video/mp4', 'video/webm', 'video/quicktime']);

interface ActiveMediaRequest {
  readonly id: number;
  readonly controller: AbortController;
  objectUrl: string | null;
  subtitleObjectUrl: string | null;
}

function mediaKindFor(lessonType: LessonType): AuthorizedLessonMediaKind | null {
  return lessonType === 'video' || lessonType === 'pdf' ? lessonType : null;
}

function hasSupportedContentType(
  kind: AuthorizedLessonMediaKind,
  contentType: string | null,
): boolean {
  return kind === 'video'
    ? contentType !== null && VIDEO_CONTENT_TYPES.has(contentType)
    : contentType === 'application/pdf';
}

function failureStateFor(error: unknown): AuthorizedLessonMediaState {
  if (error instanceof ApiError) {
    if (error.kind === 'aborted') return { status: 'idle' };
    if (error.status === 401) return { status: 'sign_in_required' };
    if (error.status === 403 || error.status === 404) return { status: 'unavailable' };
  }
  return { status: 'error' };
}

export interface AuthorizedLessonMediaController {
  readonly state: AuthorizedLessonMediaState;
  readonly canLoad: boolean;
  load(): void;
  close(): void;
  markVideoReady(objectUrl: string): void;
  reportVideoError(objectUrl: string): void;
}

export function useAuthorizedLessonMedia(
  lessonType: LessonType,
  locator: LessonMediaLocator | null,
  subtitleLocator: LessonSubtitleLocator | null = null,
): AuthorizedLessonMediaController {
  const session = useSession();
  const [state, setState] = useState<AuthorizedLessonMediaState>({ status: 'idle' });
  const activeRef = useRef<ActiveMediaRequest | null>(null);
  const nextRequestIdRef = useRef(0);
  const kind = mediaKindFor(lessonType);
  const filename = locator?.filename ?? null;
  const subtitleCourseId = subtitleLocator?.courseId ?? null;
  const subtitleLessonId = subtitleLocator?.lessonId ?? null;
  const subtitlesEnabled = import.meta.env.VITE_LESSON_SUBTITLES_ENABLED === 'true';

  const disposeActive = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = null;
    active.controller.abort();
    if (active.objectUrl !== null) URL.revokeObjectURL(active.objectUrl);
    if (active.subtitleObjectUrl !== null) URL.revokeObjectURL(active.subtitleObjectUrl);
  }, []);

  useEffect(() => () => disposeActive(), [disposeActive]);

  useEffect(() => {
    disposeActive();
    setState({ status: 'idle' });
  }, [disposeActive, filename, kind, session.requestRequired, subtitleCourseId, subtitleLessonId]);

  const load = useCallback(() => {
    if (kind === null || locator === null) return;
    if (activeRef.current !== null) return;
    disposeActive();
    const active: ActiveMediaRequest = {
      id: nextRequestIdRef.current + 1,
      controller: new AbortController(),
      objectUrl: null,
      subtitleObjectUrl: null,
    };
    nextRequestIdRef.current = active.id;
    activeRef.current = active;
    setState({ status: 'loading' });
    void requestAuthorizedLessonMedia(session, locator, active.controller.signal)
      .then((response) => {
        if (activeRef.current !== active) return;
        if (!hasSupportedContentType(kind, response.contentType)) {
          activeRef.current = null;
          setState({ status: 'error' });
          return;
        }
        if (kind === 'pdf') {
          setState({ status: 'available', kind, file: response.blob });
          return;
        }
        const objectUrl = URL.createObjectURL(response.blob);
        if (activeRef.current !== active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        active.objectUrl = objectUrl;
        setState({
          status: 'available',
          objectUrl,
          subtitleObjectUrl: null,
          kind,
          presentation: 'loading_metadata',
        });
        // Subtitle requests remain opt-in while the API access contract is being completed.
        if (subtitlesEnabled && subtitleLocator !== null) {
          void requestAuthorizedLessonSubtitles(session, subtitleLocator, active.controller.signal)
            .then((subtitleResponse) => {
              if (activeRef.current !== active || subtitleResponse.contentType !== 'text/vtt')
                return;
              const subtitleObjectUrl = URL.createObjectURL(subtitleResponse.blob);
              if (activeRef.current !== active) {
                URL.revokeObjectURL(subtitleObjectUrl);
                return;
              }
              active.subtitleObjectUrl = subtitleObjectUrl;
              setState((current) =>
                current.status === 'available' &&
                current.kind === 'video' &&
                current.objectUrl === objectUrl
                  ? { ...current, subtitleObjectUrl }
                  : current,
              );
            })
            .catch(() => undefined);
        }
      })
      .catch((error: unknown) => {
        if (activeRef.current !== active) return;
        activeRef.current = null;
        const nextState = failureStateFor(error);
        if (nextState.status !== 'idle') setState(nextState);
      });
  }, [disposeActive, kind, locator, session, subtitleLocator, subtitlesEnabled]);

  const markVideoReady = useCallback((objectUrl: string) => {
    const active = activeRef.current;
    if (active?.objectUrl !== objectUrl) return;
    setState((current) =>
      current.status === 'available' && current.kind === 'video' && current.objectUrl === objectUrl
        ? { ...current, presentation: 'ready' }
        : current,
    );
  }, []);

  const close = useCallback(() => {
    disposeActive();
    setState({ status: 'idle' });
  }, [disposeActive]);

  const reportVideoError = useCallback((objectUrl: string) => {
    const active = activeRef.current;
    if (active?.objectUrl !== objectUrl) return;
    activeRef.current = null;
    active.objectUrl = null;
    const subtitleObjectUrl = active.subtitleObjectUrl;
    active.subtitleObjectUrl = null;
    active.controller.abort();
    URL.revokeObjectURL(objectUrl);
    if (subtitleObjectUrl !== null) URL.revokeObjectURL(subtitleObjectUrl);
    setState({ status: 'error' });
  }, []);

  return {
    state,
    canLoad: kind !== null && locator !== null,
    load,
    close,
    markVideoReady,
    reportVideoError,
  };
}
