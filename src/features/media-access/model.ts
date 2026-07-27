export type AuthorizedLessonMediaKind = 'video' | 'pdf';
export type AuthorizedVideoPresentationStatus = 'loading_metadata' | 'ready';

export interface IdleAuthorizedLessonMediaState {
  readonly status: 'idle';
}

export interface LoadingAuthorizedLessonMediaState {
  readonly status: 'loading';
}

export interface AvailableVideoLessonMediaState {
  readonly status: 'available';
  readonly kind: 'video';
  readonly objectUrl: string;
  readonly presentation: AuthorizedVideoPresentationStatus;
}

export interface AvailablePdfLessonMediaState {
  readonly status: 'available';
  readonly kind: 'pdf';
  readonly file: Blob;
}

export interface SignInRequiredLessonMediaState {
  readonly status: 'sign_in_required';
}

export interface UnavailableLessonMediaState {
  readonly status: 'unavailable';
}

export interface FailedLessonMediaState {
  readonly status: 'error';
}

export type AuthorizedLessonMediaState =
  | IdleAuthorizedLessonMediaState
  | LoadingAuthorizedLessonMediaState
  | AvailableVideoLessonMediaState
  | AvailablePdfLessonMediaState
  | SignInRequiredLessonMediaState
  | UnavailableLessonMediaState
  | FailedLessonMediaState;
