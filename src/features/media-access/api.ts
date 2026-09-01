import type { LessonMediaLocator, LessonSubtitleLocator } from '@entities/course';
import { requestOperation, type SessionContextValue } from '@features/auth-session';
import type { ApiBinaryResponse } from '@shared/api';

export function requestAuthorizedLessonMedia(
  session: SessionContextValue,
  locator: LessonMediaLocator,
  signal: AbortSignal,
): Promise<ApiBinaryResponse> {
  return requestOperation<ApiBinaryResponse>(session, 'API-025', {
    path: `/media/lessons/${encodeURIComponent(locator.filename)}`,
    responseType: 'blob',
    signal,
  });
}

export function requestAuthorizedLessonSubtitles(
  session: SessionContextValue,
  locator: LessonSubtitleLocator,
  signal: AbortSignal,
): Promise<ApiBinaryResponse> {
  return requestOperation<ApiBinaryResponse>(session, 'API-042', {
    path: `/courses/${locator.courseId}/lessons/${locator.lessonId}/subtitles`,
    responseType: 'blob',
    signal,
  });
}
