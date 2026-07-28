import { describe, expect, it } from 'vitest';

import {
  createHttpFailureAccounting,
  createRequestFailureAccounting,
  findUnexpectedConsoleErrors,
  validateVisualScenarioEvidence,
} from './visual-quality';

describe('visual quality scenario evidence', () => {
  it('rejects an array used as runtimeInputs metadata', () => {
    const problems = validateVisualScenarioEvidence({
      routes: ['/courses'],
      states: ['catalog loaded'],
      viewports: [{ width: 1280, height: 800 }],
      expectedOutcome: 'catalog remains usable',
      runtimeInputs: ['synthetic input'],
    });

    expect(problems).toContain('runtimeInputs must contain at least one input');
  });
});

describe('request failure accounting', () => {
  const expectedFailure = {
    method: 'GET',
    path: '/courses?search=offline',
    errorText: 'net::ERR_INTERNET_DISCONNECTED',
  };

  it('consumes only the exact method, path-with-query, error, and occurrence', () => {
    const accounting = createRequestFailureAccounting();
    accounting.allow(expectedFailure, 1);
    accounting.observe(
      'GET',
      'http://127.0.0.1:4178/courses?search=offline',
      'net::ERR_INTERNET_DISCONNECTED',
    );
    accounting.observe(
      'GET',
      'http://127.0.0.1:4178/other?search=offline',
      'net::ERR_INTERNET_DISCONNECTED',
    );

    expect(accounting.acceptedFailures()).toHaveLength(1);
    expect(accounting.violations().requestFailures).toEqual([
      expect.objectContaining({ ...expectedFailure, path: '/other?search=offline' }),
    ]);
    expect(accounting.violations().unconsumedExpectedRequestFailures).toEqual([]);
  });

  it('fails closed for a missing or duplicate exact request failure and unrelated console URL', () => {
    const missing = createRequestFailureAccounting();
    missing.allow(expectedFailure, 1);
    expect(missing.violations().unconsumedExpectedRequestFailures).toEqual([
      expect.objectContaining({ ...expectedFailure, remaining: 1 }),
    ]);

    const duplicate = createRequestFailureAccounting();
    duplicate.allow(expectedFailure, 1);
    duplicate.observe(
      'GET',
      'http://127.0.0.1:4178/courses?search=offline',
      expectedFailure.errorText,
    );
    duplicate.observe(
      'GET',
      'http://127.0.0.1:4178/courses?search=offline',
      expectedFailure.errorText,
    );
    expect(duplicate.violations().requestFailures).toHaveLength(1);
    expect(
      findUnexpectedConsoleErrors(
        [
          {
            text: 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
            url: 'http://127.0.0.1:4178/unrelated',
          },
        ],
        [],
        duplicate.acceptedFailures(),
      ),
    ).toHaveLength(1);
  });
});

describe('HTTP failure accounting', () => {
  const expectedFailure = { method: 'GET', path: '/courses?search=react', status: 503 };

  it('consumes the exact expected method, path-with-query, status, and occurrence', () => {
    const accounting = createHttpFailureAccounting();
    accounting.allow(expectedFailure, 2);
    accounting.observe('GET', 'http://127.0.0.1:4178/courses?search=react', 503);
    accounting.observe('GET', 'http://127.0.0.1:4178/courses?search=react', 503);

    expect(accounting.acceptedFailures()).toHaveLength(2);
    expect(accounting.violations()).toEqual({
      errorResponses: [],
      unconsumedExpectedResponses: [],
    });
  });

  it('fails closed for missing, duplicate, or unexpected response identities', () => {
    const accounting = createHttpFailureAccounting();
    accounting.allow(expectedFailure, 1);
    accounting.observe('GET', 'http://127.0.0.1:4178/courses?search=react', 503);
    accounting.observe('GET', 'http://127.0.0.1:4178/courses?search=react', 503);
    accounting.observe('POST', 'http://127.0.0.1:4178/courses?search=react', 503);

    expect(accounting.violations().errorResponses).toEqual([
      expect.objectContaining(expectedFailure),
      expect.objectContaining({ ...expectedFailure, method: 'POST' }),
    ]);

    const missing = createHttpFailureAccounting();
    missing.allow(expectedFailure, 1);
    expect(missing.violations().unconsumedExpectedResponses).toEqual([
      expect.objectContaining({ ...expectedFailure, remaining: 1 }),
    ]);
  });
});
