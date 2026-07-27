// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type ApiBinaryResponse } from '../../../src/shared/api';
import { mapLessonMediaLocator } from '../../../src/entities/course';
import { LessonMediaAccess } from '../../../src/features/media-access';

const mediaMocks = vi.hoisted(() => ({ requestAuthorizedLessonMedia: vi.fn(), renderedPdf: null as Blob | null }));
const requestAuthorizedLessonMedia = mediaMocks.requestAuthorizedLessonMedia;

vi.mock('../../../src/features/media-access/api', () => ({ requestAuthorizedLessonMedia: mediaMocks.requestAuthorizedLessonMedia }));
vi.mock('../../../src/features/media-access/LessonPdfPreview', () => ({
  default: ({ file }: { file: Blob }) => {
    mediaMocks.renderedPdf = file;
    return <section role="region" aria-label="Lesson PDF preview" tabIndex={-1}>PDF preview</section>;
  },
}));
vi.mock('../../../src/features/auth-session', () => ({
  useSession: () => ({ state: { status: 'authenticated', user: { email: 'student@example.test' } } }),
}));

const objectUrl = 'blob:lesson-media';
const createObjectUrl = vi.fn(() => objectUrl);
const revokeObjectUrl = vi.fn();
const nativeUrlConstructor = globalThis.URL;

interface PendingMediaRequest {
  signal: AbortSignal | null;
  resolve(response: ApiBinaryResponse): void;
}

afterEach(() => {
  requestAuthorizedLessonMedia.mockReset();
  mediaMocks.renderedPdf = null;
  createObjectUrl.mockReset();
  createObjectUrl.mockReturnValue(objectUrl);
  revokeObjectUrl.mockReset();
  vi.unstubAllGlobals();
});

afterAll(() => {
  expect(globalThis.URL).toBe(nativeUrlConstructor);
});

function admittedMediaResponse(contentType: string | null): ApiBinaryResponse {
  return {
    blob: new Blob([], contentType === null ? {} : { type: contentType }),
    contentType,
    contentDisposition: null,
  };
}

function signalPlayableMetadata(video: HTMLVideoElement) {
  Object.defineProperties(video, {
    readyState: { configurable: true, value: HTMLMediaElement.HAVE_METADATA },
    videoWidth: { configurable: true, value: 2 },
    videoHeight: { configurable: true, value: 2 },
    duration: { configurable: true, value: 1 },
  });
  fireEvent.loadedMetadata(video);
}

describe('LessonMediaAccess', () => {
  it('does not request text or missing media and uses a generic unavailable state', () => {
    render(<LessonMediaAccess lessonType="text" locator={null} />);

    expect(screen.getByText('Media unavailable in this workspace')).toBeTruthy();
    expect(requestAuthorizedLessonMedia).not.toHaveBeenCalled();
  });

  it.each(['/media/lessons/%00private.pdf', '/media/lessons/private%0A.pdf', '/media/lessons/private%7F.pdf'])('does not request a decoded-control locator %s', (downloadUrl) => {
    render(<LessonMediaAccess lessonType="pdf" locator={mapLessonMediaLocator(downloadUrl)} />);

    expect(screen.getByText('Media unavailable in this workspace')).toBeTruthy();
    expect(requestAuthorizedLessonMedia).not.toHaveBeenCalled();
  });

  it('announces and focuses an authorized video only after playable metadata and revokes its object URL on unmount', async () => {
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    requestAuthorizedLessonMedia.mockResolvedValue(admittedMediaResponse('video/mp4'));
    const view = render(<LessonMediaAccess lessonType="video" locator={{ filename: 'lesson.mp4' }} />);

    expect(requestAuthorizedLessonMedia).not.toHaveBeenCalled();
    const trigger = screen.getByRole('button', { name: 'Load video' });
    trigger.focus();
    fireEvent.click(trigger);

    const preview = await screen.findByLabelText('Lesson video preview') as HTMLVideoElement;
    expect(preview.getAttribute('src')).toBe(objectUrl);
    expect(requestAuthorizedLessonMedia).toHaveBeenCalledTimes(1);
    expect(preview.hasAttribute('controls')).toBe(true);
    expect(preview.getAttribute('preload')).toBe('metadata');
    expect(screen.queryByText('Video ready.')).toBeNull();
    expect(document.activeElement).not.toBe(preview);

    signalPlayableMetadata(preview);

    await waitFor(() => expect(document.activeElement).toBe(preview));
    expect(screen.getByText('Video ready.')).toBeTruthy();
    view.unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith(objectUrl);
  });

  it('revokes a same-MIME corrupt video and retries with a fresh request and object URL', async () => {
    const firstObjectUrl = 'blob:corrupt-video';
    const secondObjectUrl = 'blob:replacement-video';
    createObjectUrl.mockReturnValueOnce(firstObjectUrl).mockReturnValueOnce(secondObjectUrl);
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    requestAuthorizedLessonMedia.mockResolvedValue(admittedMediaResponse('video/mp4'));
    render(<LessonMediaAccess lessonType="video" locator={{ filename: 'lesson.mp4' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Load video' }));
    const corruptPreview = await screen.findByLabelText('Lesson video preview') as HTMLVideoElement;
    expect(corruptPreview.getAttribute('src')).toBe(firstObjectUrl);
    expect(screen.queryByText('Video ready.')).toBeNull();

    fireEvent.error(corruptPreview);

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(screen.getByRole('status').textContent).toBe('Media could not be loaded. Try again.');
    expect(document.activeElement).toBe(retry);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(firstObjectUrl);

    fireEvent.click(retry);
    const replacementPreview = await screen.findByLabelText('Lesson video preview') as HTMLVideoElement;
    expect(replacementPreview.getAttribute('src')).toBe(secondObjectUrl);
    expect(requestAuthorizedLessonMedia).toHaveBeenCalledTimes(2);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Video ready.')).toBeNull();

    signalPlayableMetadata(replacementPreview);

    await waitFor(() => expect(document.activeElement).toBe(replacementPreview));
    expect(screen.getByText('Video ready.')).toBeTruthy();
  });

  it.each(['video/webm', 'video/quicktime'])('accepts the supported backend video MIME %s', async (contentType) => {
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    requestAuthorizedLessonMedia.mockResolvedValue(admittedMediaResponse(contentType));
    render(<LessonMediaAccess lessonType="video" locator={{ filename: 'lesson.video' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Load video' }));

    await waitFor(() => expect(screen.getByLabelText('Lesson video preview').getAttribute('src')).toBe(objectUrl));
  });

  it('hands an admitted PDF Blob to the in-page renderer without creating a plugin URL', async () => {
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    const response = admittedMediaResponse('application/pdf');
    requestAuthorizedLessonMedia.mockResolvedValue(response);
    render(<LessonMediaAccess lessonType="pdf" locator={{ filename: 'lesson.pdf' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Load PDF' }));

    await waitFor(() => expect(screen.getByRole('region', { name: 'Lesson PDF preview' })).toBeTruthy());
    expect(mediaMocks.renderedPdf).toBe(response.blob);
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(document.querySelector('iframe, object, embed')).toBeNull();
    expect(document.querySelector('a[download], a[target]')).toBeNull();
  });

  it.each([
    ['video', 'application/pdf'],
    ['video', 'text/html'],
    ['video', 'application/octet-stream'],
    ['video', null],
    ['pdf', 'video/mp4'],
    ['pdf', 'text/html'],
    ['pdf', 'application/octet-stream'],
    ['pdf', null],
  ] as const)('rejects %s media with unsupported normalized MIME %s without creating an object URL', async (lessonType, contentType) => {
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    requestAuthorizedLessonMedia.mockResolvedValue(admittedMediaResponse(contentType));
    render(<LessonMediaAccess lessonType={lessonType} locator={{ filename: `lesson.${lessonType === 'video' ? 'mp4' : 'pdf'}` }} />);

    fireEvent.click(screen.getByRole('button', { name: lessonType === 'video' ? 'Load video' : 'Load PDF' }));

    await waitFor(() => expect(screen.getByText('Media could not be loaded. Try again.')).toBeTruthy());
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Lesson video preview')).toBeNull();
    expect(screen.queryByTitle('Lesson PDF preview')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('keeps the activated control focused and busy while blocking duplicate pending requests', () => {
    requestAuthorizedLessonMedia.mockImplementation(() => new Promise<ApiBinaryResponse>(() => undefined));
    render(<LessonMediaAccess lessonType="video" locator={{ filename: 'lesson.mp4' }} />);
    const trigger = screen.getByRole('button', { name: 'Load video' }) as HTMLButtonElement;
    trigger.focus();

    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(document.activeElement).toBe(trigger);
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('button', { name: 'Loading media…' })).toBe(trigger);
    expect(screen.getByRole('status').textContent).toBe('Loading media…');
    expect(requestAuthorizedLessonMedia).toHaveBeenCalledTimes(1);
  });

  it('aborts and ignores a stale request when the locator changes', async () => {
    vi.stubGlobal('URL', { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    const pending: PendingMediaRequest = { signal: null, resolve: () => undefined };
    requestAuthorizedLessonMedia.mockImplementation((_session, _locator, requestSignal) => {
      pending.signal = requestSignal;
      return new Promise<ApiBinaryResponse>((resolve) => { pending.resolve = resolve; });
    });
    const view = render(<LessonMediaAccess lessonType="video" locator={{ filename: 'first.mp4' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Load video' }));
    view.rerender(<LessonMediaAccess lessonType="video" locator={{ filename: 'second.mp4' }} />);
    expect(pending.signal).not.toBeNull();
    expect(pending.signal?.aborted).toBe(true);

    pending.resolve(admittedMediaResponse('video/mp4'));
    await waitFor(() => expect(createObjectUrl).not.toHaveBeenCalled());
  });

  it.each([
    [new ApiError({ kind: 'http', status: 401, message: 'private' }), 'Sign in required', 'status'],
    [new ApiError({ kind: 'http', status: 403, message: 'private' }), 'Media unavailable in this workspace', 'status'],
    [new ApiError({ kind: 'http', status: 404, message: 'private' }), 'Media unavailable in this workspace', 'status'],
    [new ApiError({ kind: 'offline', status: null, message: 'private' }), 'Media could not be loaded. Try again.', 'retry'],
  ] as const)('maps a protected media failure to safe UI copy and a deterministic focus target', async (error, expectedMessage, focusTarget) => {
    requestAuthorizedLessonMedia.mockRejectedValue(error);
    render(<LessonMediaAccess lessonType="video" locator={{ filename: 'lesson.mp4' }} />);
    const trigger = screen.getByRole('button', { name: 'Load video' });
    trigger.focus();

    fireEvent.click(trigger);

    await waitFor(() => expect(screen.getByText(expectedMessage)).toBeTruthy());
    expect(screen.queryByText('private')).toBeNull();
    const expectedFocus = focusTarget === 'retry'
      ? screen.getByRole('button', { name: 'Try again' })
      : screen.getByText(expectedMessage);
    expect(document.activeElement).toBe(expectedFocus);
  });
});
