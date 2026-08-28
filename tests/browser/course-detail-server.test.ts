import { describe, expect, it, vi } from 'vitest';

import { waitForHtmlServerReady } from './course-detail-server';

describe('Course Detail browser server readiness', () => {
  it('waits until the Vite origin returns the app HTML instead of only accepting TCP', async () => {
    const fetchHtml = vi
      .fn<[input: string, init: RequestInit], Promise<Response>>()
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(
        new Response('<!doctype html><html><body><div id="root"></div></body></html>', {
          status: 200,
        }),
      );
    const pause = vi.fn<[milliseconds: number], Promise<void>>().mockResolvedValue(undefined);

    await waitForHtmlServerReady('http://127.0.0.1:4176', {
      deadlineMs: 1_000,
      pollIntervalMs: 1,
      fetchHtml,
      wait: pause,
    });

    expect(fetchHtml).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledWith(1);
  });

  it('reports the last incomplete response when the app shell never becomes ready', async () => {
    const fetchHtml = vi
      .fn<[input: string, init: RequestInit], Promise<Response>>()
      .mockImplementation(async () => new Response('', { status: 503 }));

    await expect(
      waitForHtmlServerReady('http://127.0.0.1:4176', {
        deadlineMs: 20,
        pollIntervalMs: 1,
        fetchHtml,
      }),
    ).rejects.toThrow('HTTP 503 returned 0 bytes without the app shell');
  });
});
