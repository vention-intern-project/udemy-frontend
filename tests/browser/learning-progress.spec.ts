import { expect, test, type Page, type Route } from '@playwright/test';

const student = { email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student', birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z' };
const enrollment = { id: 4, user_id: 1, course_id: 7, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', course: { id: 7, title: 'Browser learning course', description: null, price: '0.00', currency: 'USD' } };

async function json(route: Route, value: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
}

async function installStudent(page: Page) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
}

async function tabTo(page: Page, locator: ReturnType<Page['getByRole']>) {
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((element) => document.activeElement === element)) return;
  }
  throw new Error('Keyboard traversal did not reach the expected control');
}

interface RuntimeDiagnostics {
  readonly expectedRuntimeFailures: string[];
  readonly unexpectedRuntimeFailures: string[];
  readonly httpFailures: string[];
}

interface ExpectedRuntimeDiagnostics {
  readonly failedResourcePaths?: ReadonlySet<string>;
  readonly abortedRequests?: readonly ExpectedRequestFailure[];
}

interface ExpectedRequestFailure {
  readonly method: 'GET';
  readonly path: string;
  readonly errorText: 'net::ERR_ABORTED';
  readonly maxCount: number;
}

function expectedGetAbort(path: string, maxCount: number): ExpectedRequestFailure {
  return { method: 'GET', path, errorText: 'net::ERR_ABORTED', maxCount };
}

function captureRuntimeDiagnostics(page: Page, expected: ExpectedRuntimeDiagnostics = {}): RuntimeDiagnostics {
  const diagnostics: RuntimeDiagnostics = { expectedRuntimeFailures: [], unexpectedRuntimeFailures: [], httpFailures: [] };
  const remainingAborts = new Map(expected.abortedRequests?.map((failure) => [
    `${failure.method} ${failure.path} ${failure.errorText}`,
    failure.maxCount,
  ]));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const locationUrl = message.location().url;
    const path = locationUrl ? new URL(locationUrl).pathname : null;
    const entry = `console: ${message.text()}`;
    if (path && message.text().includes('Failed to load resource') && expected.failedResourcePaths?.has(path)) {
      diagnostics.expectedRuntimeFailures.push(entry);
    } else {
      diagnostics.unexpectedRuntimeFailures.push(entry);
    }
  });
  page.on('pageerror', (error) => diagnostics.unexpectedRuntimeFailures.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const path = new URL(request.url()).pathname;
    const errorText = request.failure()?.errorText ?? '';
    const entry = `requestfailed: ${request.method()} ${path} ${errorText}`;
    const identity = `${request.method()} ${path} ${errorText}`;
    const remaining = remainingAborts.get(identity) ?? 0;
    if (remaining > 0) {
      remainingAborts.set(identity, remaining - 1);
      diagnostics.expectedRuntimeFailures.push(entry);
    } else {
      diagnostics.unexpectedRuntimeFailures.push(entry);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4179' && response.status() >= 400) {
      diagnostics.httpFailures.push(`${response.request().method()} ${url.pathname} ${response.status()}`);
    }
  });
  return diagnostics;
}

test('keeps aggregate progress separate from fresh lesson state, dedupes action, and never requests media', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/courses/7/lessons/12/complete']),
    abortedRequests: [expectedGetAbort('/enrollments/4', 2)],
  });
  const requests: string[] = [];
  let completeRequests = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    const isLearningApi = url.pathname === '/me'
      || url.pathname === '/enrollments/4'
      || url.pathname === '/courses/7/progress'
      || url.pathname === '/courses/7/lessons'
      || url.pathname === '/courses/7/lessons/12/complete'
      || url.pathname === '/courses/7/lessons/12/incomplete';
    if (!isLearningApi) return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress') return json(route, { course_id: 7, completed_lessons: 1, total_lessons: 2, progress_percentage: 50 });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET') return json(route, { items: [{ id: 12, title: 'First browser lesson', lesson_type: 'video', download_url: '/media/private.mp4', description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
    if (url.pathname === '/courses/7/lessons/12/complete') {
      requests.push(url.pathname);
      completeRequests += 1;
      if (completeRequests === 2) return json(route, { detail: 'private mutation failure' }, 500);
      return json(route, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
    }
    if (url.pathname === '/courses/7/lessons/12/incomplete') { requests.push(url.pathname); return json(route, { lesson_id: 12, completed: false, completed_at: null }); }
    throw new Error(`Unexpected request ${request.method()} ${url.pathname}`);
  });
  await page.goto('/learning/enrollments/4');
  await expect(page.getByRole('heading', { name: 'Browser learning course' })).toBeVisible();
  await expect(page.getByText('Completion status unavailable')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-label', '1 of 2 lessons completed, 50%');
  await page.getByRole('button', { name: 'Mark complete' }).dblclick();
  await expect.poll(() => requests).toEqual(['/courses/7/lessons/12/complete']);
  const lessonRow = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'First browser lesson' }) });
  await expect(lessonRow.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark incomplete' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark incomplete' }).click();
  await expect(page.getByText('Not completed')).toBeVisible();
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByText('Lesson progress could not be updated. Try again.')).toBeVisible();
  await expect(page.getByText('Not completed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark complete' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Completion status unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark complete' })).toBeVisible();
  expect(requests).toEqual([
    '/courses/7/lessons/12/complete',
    '/courses/7/lessons/12/incomplete',
    '/courses/7/lessons/12/complete',
  ]);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.client);
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.client);
  }
  await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
  const zoomed = await page.evaluate(() => ({ client: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
  expect(zoomed.documentWidth).toBeLessThanOrEqual(zoomed.client);
  expect(zoomed.bodyWidth).toBeLessThanOrEqual(zoomed.client);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual(['POST /courses/7/lessons/12/complete 500']);
});

test('makes a forbidden lesson mutation neutral and suppresses further actions', async ({ page }) => {
  await installStudent(page);
  const forbiddenPath = '/courses/7/lessons/12/incomplete';
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set([forbiddenPath]),
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress') return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET') return json(route, { items: [{ id: 12, title: 'Forbidden mutation lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
    if (url.pathname === '/courses/7/lessons/12/complete') return json(route, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
    if (url.pathname === forbiddenPath) return json(route, { detail: 'private mutation detail' }, 403);
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });
  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await page.getByRole('button', { name: 'Mark incomplete' }).click();
  await expect(page.getByRole('heading', { name: 'Learning workspace unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: /mark|try again/i })).toHaveCount(0);
  await expect(page.getByText('private mutation detail')).toHaveCount(0);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([`POST ${forbiddenPath} 403`]);
});

test('marks a malformed mutation outcome unknown and refetches its exact progress origin', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, { abortedRequests: [expectedGetAbort('/enrollments/4', 1)] });
  let enrollmentReads = 0;
  let progressReads = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') { enrollmentReads += 1; return json(route, enrollment); }
    if (url.pathname === '/courses/7/progress') { progressReads += 1; return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 }); }
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET') return json(route, { items: [{ id: 12, title: 'Uncertain mutation lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
    if (url.pathname === '/courses/7/lessons/12/complete') return json(route, { lesson_id: 999, completed: true, completed_at: null });
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });
  await page.goto('/learning/enrollments/4');
  const initialEnrollmentReads = enrollmentReads;
  const initialProgressReads = progressReads;
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByText('We could not confirm the lesson update. Progress is being refreshed.')).toBeVisible();
  await expect(page.getByText('Completion status unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark complete' })).toBeVisible();
  await expect.poll(() => enrollmentReads).toBeGreaterThan(initialEnrollmentReads);
  await expect.poll(() => progressReads).toBeGreaterThan(initialProgressReads);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

const unavailableScenarios = [
  { operation: 'API-022', path: '/enrollments/4', status: 403 },
  { operation: 'API-022', path: '/enrollments/4', status: 404 },
  { operation: 'API-019', path: '/courses/7/progress', status: 403 },
  { operation: 'API-019', path: '/courses/7/progress', status: 404 },
] as const;

for (const scenario of unavailableScenarios) test(`makes ${scenario.operation} ${scenario.status} neutral with no actions`, async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set([scenario.path]),
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === scenario.path) return json(route, { detail: 'private' }, scenario.status);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress') return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 0, progress_percentage: 0 });
    if (url.pathname === '/courses/7/lessons') return json(route, { items: [], page: 1, page_size: 100, total: 0, pages: 1, has_next: false, has_previous: false });
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });
  await page.goto('/learning/enrollments/4');
  await expect(page.getByRole('heading', { name: 'Learning workspace unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: /mark|try again/i })).toHaveCount(0);
  await expect(page.getByText('private')).toHaveCount(0);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([`GET ${scenario.path} ${scenario.status}`]);
});

test('recovers API-022 enrollment detail by keyboard and focuses the restored course heading', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/enrollments/4']),
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  let enrollmentRecoveryEnabled = false;
  const dependentRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') {
      if (!enrollmentRecoveryEnabled) return json(route, { detail: 'private enrollment failure' }, 500);
      return json(route, enrollment);
    }
    if (url.pathname === '/courses/7/progress') {
      dependentRequests.push(url.pathname);
      return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 0, progress_percentage: 0 });
    }
    if (url.pathname === '/courses/7/lessons') {
      dependentRequests.push(url.pathname);
      return json(route, { items: [], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(page.getByRole('heading', { name: 'Learning data is unavailable' })).toBeVisible();
  await expect(retry).toBeVisible();
  await expect(page.getByText('private enrollment failure')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /mark/i })).toHaveCount(0);
  expect(dependentRequests).toEqual([]);
  await tabTo(page, retry);
  enrollmentRecoveryEnabled = true;
  await page.keyboard.press('Enter');
  const courseHeading = page.getByRole('heading', { name: enrollment.course.title });
  await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
  await expect(courseHeading).toBeFocused();
  expect(dependentRequests).toEqual(['/courses/7/progress', '/courses/7/lessons']);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual(['GET /enrollments/4 500', 'GET /enrollments/4 500']);
});

test('verifies Chromium page scale factor at 200% with overflow and focused-control access', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, { abortedRequests: [expectedGetAbort('/enrollments/4', 1)] });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, { ...enrollment, status: 'cancelled' });
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning/enrollments/4');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const scaleEvidence = await page.evaluate(() => ({
    scale: window.visualViewport?.scale ?? 1,
    visualWidth: window.visualViewport?.width ?? window.innerWidth,
    layoutWidth: document.documentElement.clientWidth,
  }));
  expect(scaleEvidence.scale).toBeCloseTo(2, 1);
  expect(scaleEvidence.visualWidth).toBeLessThan(scaleEvidence.layoutWidth);

  const backLink = page.getByRole('link', { name: 'Back to my learning' });
  await tabTo(page, backLink);
  await expect(backLink).toBeFocused();
  const geometry = await page.evaluate(() => {
    const active = document.activeElement;
    const rect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;
    const viewport = window.visualViewport;
    return {
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      layoutWidth: document.documentElement.clientWidth,
      focusLeft: rect?.left ?? -1,
      focusRight: rect?.right ?? Number.POSITIVE_INFINITY,
      visibleLeft: viewport?.offsetLeft ?? 0,
      visibleRight: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth),
    };
  });
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
  expect(geometry.focusLeft).toBeGreaterThanOrEqual(geometry.visibleLeft);
  expect(geometry.focusRight).toBeLessThanOrEqual(geometry.visibleRight);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
  await cdp.detach();
});

for (const status of ['pending_payment', 'cancelled'] as const) test(`${status} enrollment sends no progress or lesson-action request`, async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, { abortedRequests: [expectedGetAbort('/enrollments/4', 1)] });
  const learningRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') {
      learningRequests.push(url.pathname);
      return json(route, { ...enrollment, status });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) {
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    }
    return route.fallback();
  });
  await page.goto('/learning/enrollments/4');
  await expect(page.getByText('Learning progress is not available for this enrollment.')).toBeVisible();
  await expect(page.getByRole('button', { name: /mark|try again/i })).toHaveCount(0);
  expect(learningRequests).toContain('/enrollments/4');
  expect(learningRequests.length).toBeLessThanOrEqual(2);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('supports keyboard traversal and restores focus after list and workspace recovery', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/enrollments/my', '/courses/7/progress']),
    abortedRequests: [expectedGetAbort('/enrollments/my', 1), expectedGetAbort('/enrollments/4', 1)],
  });
  let listRecoveryEnabled = false;
  let workspaceRecoveryEnabled = false;
  const preListRecoveryDependents: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/')) throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/my') {
      if (!listRecoveryEnabled) return json(route, { detail: 'private list failure' }, 500);
      return json(route, { items: [enrollment], page: 1, page_size: 20, total: 1, pages: 1, has_next: false, has_previous: false });
    }
    if (url.pathname === '/enrollments/4') {
      if (!listRecoveryEnabled) preListRecoveryDependents.push(url.pathname);
      return json(route, enrollment);
    }
    if (url.pathname === '/courses/7/progress') {
      if (!listRecoveryEnabled) preListRecoveryDependents.push(url.pathname);
      if (!workspaceRecoveryEnabled) return json(route, { detail: 'private progress failure' }, 500);
      return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 0, progress_percentage: 0 });
    }
    if (url.pathname === '/courses/7/lessons') {
      if (!listRecoveryEnabled) preListRecoveryDependents.push(url.pathname);
      return json(route, { items: [], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning');
  const listRetry = page.getByRole('button', { name: 'Try again' });
  await expect(listRetry).toBeVisible();
  expect(preListRecoveryDependents).toEqual([]);
  await tabTo(page, listRetry);
  listRecoveryEnabled = true;
  await page.keyboard.press('Enter');
  const listHeading = page.getByRole('heading', { name: 'My learning' });
  await expect(page.getByText('1 enrollment · Page 1 of 1')).toBeVisible();
  await expect(listHeading).toBeFocused();

  await page.goto('/learning/enrollments/4');
  const workspaceRetry = page.getByRole('button', { name: 'Try again' });
  await expect(workspaceRetry).toBeVisible();
  await tabTo(page, workspaceRetry);
  workspaceRecoveryEnabled = true;
  await page.keyboard.press('Enter');
  const detailHeading = page.getByRole('heading', { name: enrollment.course.title });
  await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
  await expect(detailHeading).toBeFocused();
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([
    'GET /enrollments/my 500',
    'GET /enrollments/my 500',
    'GET /courses/7/progress 500',
    'GET /courses/7/progress 500',
  ]);
});
