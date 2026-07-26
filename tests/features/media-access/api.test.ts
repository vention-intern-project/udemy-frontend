import { describe, expect, it, vi } from 'vitest';

import { requestAuthorizedLessonMedia } from '../../../src/features/media-access';
import type { ApiRequestOptions } from '../../../src/shared/api';
import type { SessionContextValue } from '../../../src/features/auth-session';

function sessionWithRequiredRequester(): SessionContextValue {
  const requestRequired = vi.fn(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
    void options;
    return {
      blob: new Blob(['media'], { type: 'video/mp4' }),
      contentType: 'video/mp4',
      contentDisposition: null,
    } as TResponse;
  });
  return {
    state: { status: 'anonymous' }, retryBootstrap: vi.fn(), acceptAccessToken: vi.fn(), clearSession: vi.fn(),
    requestPublic: vi.fn(), requestOptional: vi.fn(), requestRequired,
  } as unknown as SessionContextValue;
}

describe('authorized lesson media request', () => {
  it('uses the required API-025 binary gateway with an encoded filename and abort signal', async () => {
    const session = sessionWithRequiredRequester();
    const controller = new AbortController();

    await expect(requestAuthorizedLessonMedia(session, { filename: 'lesson one.pdf' }, controller.signal))
      .resolves.toMatchObject({ contentType: 'video/mp4' });

    expect(session.requestRequired).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET', authPolicy: 'required', path: '/media/lessons/lesson%20one.pdf', responseType: 'blob', signal: controller.signal,
    }));
    expect(session.requestPublic).not.toHaveBeenCalled();
    expect(session.requestOptional).not.toHaveBeenCalled();
  });
});
