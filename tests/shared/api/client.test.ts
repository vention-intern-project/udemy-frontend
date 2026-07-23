import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../../../src/shared/api';

type FetchArguments = Parameters<typeof fetch>;
type FetchResult = ReturnType<typeof fetch>;

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe('fetch API client', () => {
  it('serializes query/body and attaches a bearer token', async () => {
    const fetchMock = vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const client = createApiClient({
      baseUrl: 'https://api.example.test/',
      fetch: fetchMock,
      getAccessToken: () => 'token-value',
    });

    await client.request<{ id: number }, { course_id: number }>({
      method: 'POST',
      path: '/cart/items',
      query: { page: 1, omitted: undefined },
      body: { course_id: 7 },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.test/cart/items?page=1');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ course_id: 7 }));
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-value');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('retries a safe GET once for offline and 500 failures', async () => {
    const offlineFetch = vi.fn<FetchArguments, FetchResult>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const serverFetch = vi.fn<FetchArguments, FetchResult>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'temporary' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(createApiClient({ fetch: offlineFetch, sleep }).request({ path: '/courses' }))
      .resolves.toEqual({ ok: true });
    await expect(createApiClient({ fetch: serverFetch, sleep }).request({ path: '/courses' }))
      .resolves.toEqual({ ok: true });
    expect(offlineFetch).toHaveBeenCalledTimes(2);
    expect(serverFetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('never automatically retries a mutation', async () => {
    const fetchMock = vi.fn<FetchArguments, FetchResult>()
      .mockResolvedValue(new Response(JSON.stringify({ detail: 'server error' }), { status: 500 }));
    const client = createApiClient({ fetch: fetchMock, sleep: vi.fn().mockResolvedValue(undefined) });

    await expect(client.request({ method: 'POST', path: '/enrollments', body: { course_id: 3 } }))
      .rejects.toMatchObject({ kind: 'server' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates matching in-flight mutations without caching their result', async () => {
    const firstResponse = createDeferred<Response>();
    const secondResponse = createDeferred<Response>();
    const fetchMock = vi.fn<FetchArguments, FetchResult>()
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    const client = createApiClient({ fetch: fetchMock });
    const options = {
      method: 'POST' as const,
      path: '/cart/items',
      body: { course_id: 3 },
      dedupeKey: 'add-course-3',
    };

    const first = client.request<{ id: number }>(options);
    const duplicate = client.request<{ id: number }>(options);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    firstResponse.resolve(new Response(JSON.stringify({ id: 8 }), { status: 200 }));
    await expect(Promise.all([first, duplicate])).resolves.toEqual([{ id: 8 }, { id: 8 }]);

    const next = client.request<{ id: number }>(options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    secondResponse.resolve(new Response(JSON.stringify({ id: 9 }), { status: 200 }));
    await expect(next).resolves.toEqual({ id: 9 });
  });

  it('notifies the session boundary on 401 and exposes a normalized error', async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient({
      fetch: vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response(
        JSON.stringify({ detail: 'Could not validate credentials' }),
        { status: 401 },
      )),
      onUnauthorized,
    });

    await expect(client.request({ path: '/me' })).rejects.toEqual(expect.objectContaining({
      kind: 'unauthorized',
      status: 401,
    }));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not let a failing unauthorized callback replace the API error', async () => {
    const client = createApiClient({
      fetch: vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response(
        JSON.stringify({ detail: 'Could not validate credentials' }),
        { status: 401 },
      )),
      onUnauthorized: () => {
        throw new Error('session storage unavailable');
      },
    });

    await expect(client.request({ path: '/me' })).rejects.toMatchObject({
      kind: 'unauthorized',
      message: 'Could not validate credentials',
    });
  });

  it('supports 204 and binary responses', async () => {
    const contentDisposition = "attachment; filename*=UTF-8''lessons%2Flesson%00%20one.pdf";
    const fetchMock = vi.fn<FetchArguments, FetchResult>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(new Blob(['lesson']), {
        status: 200,
        headers: {
          'Content-Type': 'Application/PDF; charset=binary',
          'Content-Disposition': contentDisposition,
        },
      }));
    const client = createApiClient({ fetch: fetchMock });

    await expect(client.request<void>({ method: 'DELETE', path: '/cart' })).resolves.toBeUndefined();
    const binary = await client.request<import('../../../src/shared/api').ApiBinaryResponse>({
      path: '/media/lessons/a.pdf',
      responseType: 'blob',
    });
    expect(await binary.blob.text()).toBe('lesson');
    expect(binary).toMatchObject({
      contentType: 'application/pdf',
      contentDisposition,
      filename: 'lesson one.pdf',
    });
  });

  it('decodes successful JSON from unknown before returning it', async () => {
    const decode = vi.fn((value: unknown) => {
      expect(value).toEqual({ id: 7 });
      return { courseId: (value as { id: number }).id };
    });
    const client = createApiClient({
      fetch: vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response(
        JSON.stringify({ id: 7 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )),
    });

    await expect(client.request({
      path: '/courses/7',
      decode,
    })).resolves.toEqual({ courseId: 7 });
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('normalizes successful decoder failures with the HTTP status', async () => {
    const client = createApiClient({
      fetch: vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response(
        JSON.stringify({ role: 'owner' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )),
    });

    await expect(client.request({
      path: '/me',
      decode: () => {
        throw new TypeError('Invalid profile role');
      },
    })).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 200,
      message: 'Server returned an invalid success response',
    });
  });

  it('passes undefined to a decoder for an empty successful response', async () => {
    const decode = vi.fn((value: unknown) => {
      expect(value).toBeUndefined();
      return 'decoded-empty';
    });
    const client = createApiClient({
      fetch: vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response(null, { status: 204 })),
    });

    await expect(client.request({
      method: 'DELETE',
      path: '/cart',
      decode,
    })).resolves.toBe('decoded-empty');
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('distinguishes malformed success payloads from offline failures', async () => {
    const client = createApiClient({
      fetch: vi.fn<FetchArguments, FetchResult>().mockResolvedValue(new Response('not-json', { status: 200 })),
    });

    await expect(client.request({ path: '/courses' })).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 200,
    });
  });
});
