import { describe, expect, it } from 'vitest';

import { ApiError, normalizeHttpError, normalizeTransportError } from '../../../src/shared/api';

describe('API error normalization', () => {
  it.each([
    [400, 'bad_request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'validation'],
    [500, 'server'],
  ] as const)('maps status %s to %s', async (status, kind) => {
    const error = await normalizeHttpError(new Response(JSON.stringify({ detail: 'Backend detail' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind, status, message: 'Backend detail', detail: 'Backend detail' });
  });

  it('preserves FastAPI validation issue locations and messages', async () => {
    const detail = [
      { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
      { loc: ['query', 'page'], msg: 'value is not a valid integer', type: 'type_error.integer' },
    ];
    const error = await normalizeHttpError(new Response(JSON.stringify({ detail }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(error.message).toBe('value is not a valid email address; value is not a valid integer');
    expect(error.issues).toEqual([
      { location: ['body', 'email'], message: 'value is not a valid email address', type: 'value_error' },
      { location: ['query', 'page'], message: 'value is not a valid integer', type: 'type_error.integer' },
    ]);
  });

  it('normalizes fetch failures as offline errors', () => {
    expect(normalizeTransportError(new TypeError('fetch failed'))).toMatchObject({
      kind: 'offline',
      status: null,
      message: 'Unable to reach the server',
    });
  });

  it('normalizes DOMException AbortError failures as aborted errors', () => {
    const cause = new DOMException('The operation was aborted', 'AbortError');

    expect(normalizeTransportError(cause)).toMatchObject({
      kind: 'aborted',
      status: null,
      message: 'Request was cancelled',
      originalCause: cause,
    });
  });

  it('normalizes transport failures when DOMException is not globally available', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'DOMException');
    const cause = new TypeError('fetch failed');

    try {
      Object.defineProperty(globalThis, 'DOMException', {
        configurable: true,
        value: undefined,
        writable: true,
      });

      expect(normalizeTransportError(cause)).toMatchObject({
        kind: 'offline',
        status: null,
        message: 'Unable to reach the server',
        originalCause: cause,
      });
    } finally {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(globalThis, 'DOMException');
      } else {
        Object.defineProperty(globalThis, 'DOMException', originalDescriptor);
      }
    }
  });
});
