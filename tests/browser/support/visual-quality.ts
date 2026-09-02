import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { expect, type Page, type TestInfo } from '@playwright/test';

export interface HttpFailureIdentity {
  method: string;
  path: string;
  status: number;
}

export interface ExpectedHttpFailure extends HttpFailureIdentity {
  occurrences: number;
  remaining: number;
}

export interface ObservedHttpFailure extends HttpFailureIdentity {
  url: string;
}

export interface RequestFailureIdentity {
  method: string;
  path: string;
  errorText: string;
}

export interface ExpectedRequestFailure extends RequestFailureIdentity {
  occurrences: number;
  remaining: number;
}

export interface ObservedRequestFailure extends RequestFailureIdentity {
  url: string;
}

export type OptionalRequestFailureAllowanceRetirement = () => void;

export interface ConsoleErrorEvidence {
  text: string;
  url: string;
}

export type VisualViewportEvidence = { width: number; height: number } | { notApplicable: string };

type RuntimeInputValue = string | number | boolean;

export interface VisualScenarioEvidence {
  routes: readonly string[];
  states: readonly string[];
  viewports: readonly VisualViewportEvidence[];
  expectedOutcome: string;
  runtimeInputs: Readonly<Record<string, RuntimeInputValue>>;
}

export interface RuntimeEvidenceSnapshot {
  pageErrors: readonly string[];
  consoleErrors: readonly ConsoleErrorEvidence[];
  failedRequests: readonly string[];
  errorResponses: readonly ObservedHttpFailure[];
  acceptedHttpFailures: readonly ObservedHttpFailure[];
  expectedHttpFailures: readonly ExpectedHttpFailure[];
}

export interface RuntimeEvidenceViolations {
  pageErrors: readonly string[];
  unexpectedConsoleErrors: readonly ConsoleErrorEvidence[];
  failedRequests: readonly string[];
  errorResponses: readonly ObservedHttpFailure[];
  unconsumedExpectedResponses: readonly ExpectedHttpFailure[];
}

export interface HttpFailureAccounting {
  allow(identity: HttpFailureIdentity, occurrences: number): void;
  observe(method: string, url: string, status: number): void;
  acceptedFailures(): readonly ObservedHttpFailure[];
  violations(): Pick<RuntimeEvidenceViolations, 'errorResponses' | 'unconsumedExpectedResponses'>;
}

export interface RequestFailureAccounting {
  allow(identity: RequestFailureIdentity, occurrences: number): void;
  allowOptional(identity: RequestFailureIdentity): OptionalRequestFailureAllowanceRetirement;
  observe(method: string, url: string, errorText: string): void;
  acceptedFailures(): readonly ObservedRequestFailure[];
  violations(): {
    requestFailures: readonly ObservedRequestFailure[];
    unconsumedExpectedRequestFailures: readonly ExpectedRequestFailure[];
  };
}

interface MutableRuntimeEvidence {
  pageErrors: string[];
  consoleErrors: ConsoleErrorEvidence[];
  failedRequests: string[];
  errorResponses: ObservedHttpFailure[];
  acceptedHttpFailures: ObservedHttpFailure[];
  expectedHttpFailures: ExpectedHttpFailure[];
}

export interface VisualQualityRuntime {
  setScenario(evidence: VisualScenarioEvidence): void;
  allowHttpFailure(identity: HttpFailureIdentity, occurrences: number): void;
  completeAssertions(actualOutcome: string): void;
  finalize(): Promise<void>;
}

interface SetupOptions {
  capabilityFiles: readonly string[];
  command: string;
}

const RESOURCE_ERROR_PATTERN =
  /^Failed to load resource: the server responded with a status of (\d{3})(?: .*)?$/;

function requestPath(url: string) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

function observeHttpFailure(method: string, url: string, status: number): ObservedHttpFailure {
  return { method, path: requestPath(url), status, url };
}

export function matchesHttpFailureIdentity(
  expected: HttpFailureIdentity,
  actual: HttpFailureIdentity,
) {
  return (
    expected.method === actual.method &&
    expected.path === actual.path &&
    expected.status === actual.status
  );
}

export function consumeExpectedHttpFailure(
  expectedFailures: ExpectedHttpFailure[],
  actual: HttpFailureIdentity,
) {
  const expected = expectedFailures.find(
    (candidate) => candidate.remaining > 0 && matchesHttpFailureIdentity(candidate, actual),
  );
  if (!expected) return false;
  expected.remaining -= 1;
  return true;
}

export function createHttpFailureAccounting(): HttpFailureAccounting {
  const expectedFailures: ExpectedHttpFailure[] = [];
  const acceptedFailures: ObservedHttpFailure[] = [];
  const errorResponses: ObservedHttpFailure[] = [];

  return {
    allow(identity, occurrences) {
      if (!Number.isInteger(occurrences) || occurrences < 1) {
        throw new Error(
          `Expected a positive HTTP failure occurrence count, received ${occurrences}`,
        );
      }
      expectedFailures.push({ ...identity, occurrences, remaining: occurrences });
    },
    observe(method, url, status) {
      if (status < 400) return;
      const failure = observeHttpFailure(method, url, status);
      if (consumeExpectedHttpFailure(expectedFailures, failure)) acceptedFailures.push(failure);
      else errorResponses.push(failure);
    },
    acceptedFailures() {
      return acceptedFailures;
    },
    violations() {
      return {
        errorResponses,
        unconsumedExpectedResponses: expectedFailures.filter(({ remaining }) => remaining > 0),
      };
    },
  };
}

export function createRequestFailureAccounting(): RequestFailureAccounting {
  const expectedFailures: ExpectedRequestFailure[] = [];
  const optionalFailures: ExpectedRequestFailure[] = [];
  const acceptedFailures: ObservedRequestFailure[] = [];
  const requestFailures: ObservedRequestFailure[] = [];

  return {
    allow(identity, occurrences) {
      if (!Number.isInteger(occurrences) || occurrences < 1) {
        throw new Error(
          `Expected a positive request failure occurrence count, received ${occurrences}`,
        );
      }
      expectedFailures.push({ ...identity, occurrences, remaining: occurrences });
    },
    allowOptional(identity) {
      const allowance = { ...identity, occurrences: 1, remaining: 1 };
      optionalFailures.push(allowance);
      return () => {
        const allowanceIndex = optionalFailures.indexOf(allowance);
        if (allowanceIndex >= 0) optionalFailures.splice(allowanceIndex, 1);
      };
    },
    observe(method, url, errorText) {
      const failure = { method, path: requestPath(url), errorText, url };
      const expected = [...expectedFailures, ...optionalFailures].find(
        (candidate) =>
          candidate.remaining > 0 &&
          candidate.method === failure.method &&
          candidate.path === failure.path &&
          candidate.errorText === failure.errorText,
      );
      if (expected) {
        expected.remaining -= 1;
        acceptedFailures.push(failure);
      } else requestFailures.push(failure);
    },
    acceptedFailures() {
      return acceptedFailures;
    },
    violations() {
      return {
        requestFailures,
        unconsumedExpectedRequestFailures: expectedFailures.filter(
          ({ remaining }) => remaining > 0,
        ),
      };
    },
  };
}

export function matchesAcceptedResponseConsole(
  message: ConsoleErrorEvidence,
  accepted: ObservedHttpFailure,
) {
  const statusMatch = RESOURCE_ERROR_PATTERN.exec(message.text);
  return (
    statusMatch !== null &&
    accepted.status === Number(statusMatch[1]) &&
    accepted.url === message.url
  );
}

export function matchesAcceptedRequestConsole(
  message: ConsoleErrorEvidence,
  accepted: ObservedRequestFailure,
) {
  return (
    message.url === accepted.url && message.text.includes(accepted.errorText.replace(/^net::/, ''))
  );
}

export function findUnexpectedConsoleErrors(
  messages: readonly ConsoleErrorEvidence[],
  acceptedFailures: readonly ObservedHttpFailure[],
  acceptedRequestFailures: readonly ObservedRequestFailure[] = [],
) {
  const consumedAcceptedFailures = new Set<number>();
  const consumedAcceptedRequestFailures = new Set<number>();
  return messages.filter((message) => {
    const acceptedIndex = acceptedFailures.findIndex(
      (failure, index) =>
        !consumedAcceptedFailures.has(index) && matchesAcceptedResponseConsole(message, failure),
    );
    if (acceptedIndex !== -1) {
      consumedAcceptedFailures.add(acceptedIndex);
      return false;
    }
    const requestIndex = acceptedRequestFailures.findIndex(
      (failure, index) =>
        !consumedAcceptedRequestFailures.has(index) &&
        matchesAcceptedRequestConsole(message, failure),
    );
    if (requestIndex === -1) return true;
    consumedAcceptedRequestFailures.add(requestIndex);
    return false;
  });
}

export function collectRuntimeEvidenceViolations(
  evidence: RuntimeEvidenceSnapshot,
): RuntimeEvidenceViolations {
  return {
    pageErrors: [...evidence.pageErrors],
    unexpectedConsoleErrors: findUnexpectedConsoleErrors(
      evidence.consoleErrors,
      evidence.acceptedHttpFailures,
    ),
    failedRequests: [...evidence.failedRequests],
    errorResponses: [...evidence.errorResponses],
    unconsumedExpectedResponses: evidence.expectedHttpFailures.filter(
      ({ remaining }) => remaining > 0,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isViewportEvidence(value: unknown): value is VisualViewportEvidence {
  if (!isRecord(value)) return false;
  if ('notApplicable' in value) return isNonEmptyString(value.notApplicable);
  return (
    Number.isInteger(value.width) &&
    Number(value.width) > 0 &&
    Number.isInteger(value.height) &&
    Number(value.height) > 0
  );
}

export function validateVisualScenarioEvidence(value: unknown) {
  if (!isRecord(value)) return ['scenario metadata is missing'];
  const problems: string[] = [];
  if (
    !Array.isArray(value.routes) ||
    value.routes.length === 0 ||
    !value.routes.every(isNonEmptyString)
  ) {
    problems.push('routes must contain at least one non-empty route');
  }
  if (
    !Array.isArray(value.states) ||
    value.states.length === 0 ||
    !value.states.every(isNonEmptyString)
  ) {
    problems.push('states must contain at least one non-empty state');
  }
  if (
    !Array.isArray(value.viewports) ||
    value.viewports.length === 0 ||
    !value.viewports.every(isViewportEvidence)
  ) {
    problems.push('viewports must contain exact dimensions or a non-applicable reason');
  }
  if (!isNonEmptyString(value.expectedOutcome)) {
    problems.push('expectedOutcome must be a non-empty string');
  }
  if (!isRecord(value.runtimeInputs) || Object.keys(value.runtimeInputs).length === 0) {
    problems.push('runtimeInputs must contain at least one input');
  } else if (
    !Object.values(value.runtimeInputs).every(
      (input) =>
        typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean',
    )
  ) {
    problems.push('runtimeInputs values must be strings, numbers, or booleans');
  }
  return problems;
}

export function setupVisualQualityRuntime(
  page: Page,
  testInfo: TestInfo,
  options: SetupOptions,
): VisualQualityRuntime {
  const runtimeEvidence: MutableRuntimeEvidence = {
    pageErrors: [],
    consoleErrors: [],
    failedRequests: [],
    errorResponses: [],
    acceptedHttpFailures: [],
    expectedHttpFailures: [],
  };
  let scenario: VisualScenarioEvidence | undefined;
  let actualOutcome: string | undefined;
  let finalized = false;

  page.on('pageerror', (error) => runtimeEvidence.pageErrors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeEvidence.consoleErrors.push({ text: message.text(), url: message.location().url });
    }
  });
  page.on('requestfailed', (request) => {
    runtimeEvidence.failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`,
    );
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const failure = observeHttpFailure(
      response.request().method(),
      response.url(),
      response.status(),
    );
    if (consumeExpectedHttpFailure(runtimeEvidence.expectedHttpFailures, failure)) {
      runtimeEvidence.acceptedHttpFailures.push(failure);
    } else {
      runtimeEvidence.errorResponses.push(failure);
    }
  });

  return {
    setScenario(evidence) {
      if (scenario) throw new Error('Visual scenario metadata was already set for this result');
      scenario = evidence;
    },
    allowHttpFailure(identity, occurrences) {
      if (!Number.isInteger(occurrences) || occurrences < 1) {
        throw new Error(
          `Expected a positive HTTP failure occurrence count, received ${occurrences}`,
        );
      }
      runtimeEvidence.expectedHttpFailures.push({
        ...identity,
        occurrences,
        remaining: occurrences,
      });
    },
    completeAssertions(outcome) {
      if (!isNonEmptyString(outcome)) throw new Error('Actual outcome must be a non-empty string');
      actualOutcome = outcome;
    },
    async finalize() {
      if (finalized) throw new Error('Visual quality runtime was finalized more than once');
      finalized = true;
      const metadataProblems = validateVisualScenarioEvidence(scenario);
      const violations = collectRuntimeEvidenceViolations(runtimeEvidence);
      const evidencePath = testInfo.outputPath('visual-quality-evidence.json');
      const attachment = {
        schemaVersion: 1,
        capabilityFiles: [...options.capabilityFiles],
        execution: {
          command: options.command,
          project: testInfo.project.name,
          browser: page.context().browser()?.browserType().name() ?? 'unavailable',
          browserVersion: page.context().browser()?.version() ?? 'unavailable',
          configuredRetries: testInfo.project.retries,
          configuredWorkers: testInfo.config.workers,
          retryAttempt: testInfo.retry,
        },
        scenario: scenario ?? null,
        observed: {
          actualOutcome: actualOutcome ?? null,
          assertionsCompleted: actualOutcome !== undefined,
          acceptedHttpFailures: runtimeEvidence.acceptedHttpFailures,
          runtimeViolationCounts: {
            pageErrors: violations.pageErrors.length,
            consoleErrors: violations.unexpectedConsoleErrors.length,
            failedRequests: violations.failedRequests.length,
            errorResponses: violations.errorResponses.length,
            unconsumedExpectedResponses: violations.unconsumedExpectedResponses.length,
          },
        },
        evidenceLocation: evidencePath,
      };
      await mkdir(dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, `${JSON.stringify(attachment, null, 2)}\n`, 'utf8');
      await testInfo.attach('visual-scenario-evidence', {
        path: evidencePath,
        contentType: 'application/json',
      });

      expect.soft(metadataProblems, 'mandatory visual scenario metadata').toEqual([]);
      expect.soft(actualOutcome, 'assertion completion outcome').toBeTruthy();
      expect.soft(violations.pageErrors, 'uncaught browser errors').toEqual([]);
      expect
        .soft(violations.unexpectedConsoleErrors, 'unexpected browser console errors')
        .toEqual([]);
      expect.soft(violations.failedRequests, 'unexpected failed requests').toEqual([]);
      expect.soft(violations.errorResponses, 'unexpected HTTP error responses').toEqual([]);
      expect
        .soft(violations.unconsumedExpectedResponses, 'expected HTTP error responses not observed')
        .toEqual([]);
    },
  };
}
