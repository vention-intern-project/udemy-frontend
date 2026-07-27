import { useCallback, useEffect, useRef, useState } from 'react';

import type { LessonMediaLocator, LessonType } from '@entities/course';
import { useSession } from '@features/auth-session';
import { ApiError } from '@shared/api';

import { requestAuthorizedLessonMedia } from './api';
import type { AuthorizedLessonMediaKind, AuthorizedLessonMediaState } from './model';

const VIDEO_CONTENT_TYPES = new Set<string>([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

interface ActiveMediaRequest {
  readonly id: number;
  readonly controller: AbortController;
  objectUrl: string | null;
}

function mediaKindFor(lessonType: LessonType): AuthorizedLessonMediaKind | null {
  return lessonType === 'video' || lessonType === 'pdf' ? lessonType : null;
}

function hasSupportedContentType(kind: AuthorizedLessonMediaKind, contentType: string | null): boolean {
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
  markVideoReady(objectUrl: string): void;
  reportVideoError(objectUrl: string): void;
}

export function useAuthorizedLessonMedia(
  lessonType: LessonType,
  locator: LessonMediaLocator | null,
): AuthorizedLessonMediaController {
  const session = useSession();
  const [state, setState] = useState<AuthorizedLessonMediaState>({ status: 'idle' });
  const activeRef = useRef<ActiveMediaRequest | null>(null);
  const nextRequestIdRef = useRef(0);
  const kind = mediaKindFor(lessonType);
  const filename = locator?.filename ?? null;

  const disposeActive = useCallback(() => {
    const active = activeRef.current;
    if (!active) return;
    activeRef.current = null;
    active.controller.abort();
    if (active.objectUrl !== null) URL.revokeObjectURL(active.objectUrl);
  }, []);

  useEffect(() => () => disposeActive(), [disposeActive]);

  useEffect(() => {
    disposeActive();
    setState({ status: 'idle' });
  }, [disposeActive, filename, kind, session.requestRequired]);

  const load = useCallback(() => {
    if (kind === null || locator === null) return;
    if (activeRef.current !== null) return;
    disposeActive();
    const active: ActiveMediaRequest = {
      id: nextRequestIdRef.current + 1,
      controller: new AbortController(),
      objectUrl: null,
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
        setState({ status: 'available', objectUrl, kind, presentation: 'loading_metadata' });
      })
      .catch((error: unknown) => {
        if (activeRef.current !== active) return;
        activeRef.current = null;
        const nextState = failureStateFor(error);
        if (nextState.status !== 'idle') setState(nextState);
      });
  }, [disposeActive, kind, locator, session]);

  const markVideoReady = useCallback((objectUrl: string) => {
    const active = activeRef.current;
    if (active?.objectUrl !== objectUrl) return;
    setState((current) => current.status === 'available'
      && current.kind === 'video'
      && current.objectUrl === objectUrl
      ? { ...current, presentation: 'ready' }
      : current);
  }, []);

  const reportVideoError = useCallback((objectUrl: string) => {
    const active = activeRef.current;
    if (active?.objectUrl !== objectUrl) return;
    activeRef.current = null;
    active.objectUrl = null;
    active.controller.abort();
    URL.revokeObjectURL(objectUrl);
    setState({ status: 'error' });
  }, []);

  return {
    state,
    canLoad: kind !== null && locator !== null,
    load,
    markVideoReady,
    reportVideoError,
  };
}
