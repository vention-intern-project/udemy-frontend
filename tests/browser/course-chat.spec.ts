import { expect, test, type Page, type Route } from '@playwright/test';

const student = {
  email: 'learner@example.test',
  name: 'Learner',
  surname: 'One',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const enrollment = {
  id: 4,
  user_id: 1,
  course_id: 7,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  course: { id: 7, title: 'Active course', description: null, price: '0.00', currency: 'USD' },
};
const emptyCart = { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 };

interface ChatRequestEvidence {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

interface RuntimeDiagnostics {
  readonly unexpectedRuntimeFailures: string[];
  readonly httpFailures: string[];
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function captureRuntimeDiagnostics(page: Page): RuntimeDiagnostics {
  const diagnostics: RuntimeDiagnostics = { unexpectedRuntimeFailures: [], httpFailures: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.unexpectedRuntimeFailures.push(message.text());
  });
  page.on('pageerror', (error) => diagnostics.unexpectedRuntimeFailures.push(error.message));
  page.on('requestfailed', (request) => {
    const path = new URL(request.url()).pathname;
    const failure = request.failure()?.errorText ?? '';
    if (
      request.method() === 'GET' &&
      failure === 'net::ERR_ABORTED' &&
      [
        '/cart',
        '/courses',
        '/enrollments/my',
        '/enrollments/4',
        '/courses/7/progress',
        '/courses/7/lessons',
      ].includes(path)
    )
      return;
    diagnostics.unexpectedRuntimeFailures.push(`${request.method()} ${path} ${failure}`);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4180' && response.status() >= 400)
      diagnostics.httpFailures.push(
        `${response.request().method()} ${url.pathname} ${response.status()}`,
      );
  });
  return diagnostics;
}

async function installCourseChatFixture(page: Page, chatRequests: ChatRequestEvidence[]) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/me') return json(route, student);
    if (path === '/cart') return json(route, emptyCart);
    if (path === '/courses') {
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/enrollments/4') return json(route, enrollment);
    if (path === '/enrollments/my') {
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 0,
        progress_percentage: 0,
      });
    if (path === '/courses/7/lessons')
      return json(route, {
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    if (path === '/chat/') {
      chatRequests.push({ method: request.method(), path, body: request.postDataJSON() });
      return json(route, { thread_id: 'thread-1', response: `One answer ${chatRequests.length}.` });
    }
    return route.fallback();
  });
}

async function expectNoOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    layoutWidth: document.documentElement.clientWidth,
  }));
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
}

test('completes the mobile chat flow, restores focus, and starts fresh after navigation', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/learning/enrollments/4');
  const launcher = page.getByRole('button', { name: 'Open AI assistant' });
  await expect(launcher).toHaveCSS('width', '60px');
  await launcher.focus();
  await expect(page.getByRole('tooltip', { name: 'Open AI assistant' })).toBeVisible();
  await launcher.click();
  await expect(page.getByRole('tooltip', { name: 'Open AI assistant' })).toBeVisible();
  const input = page.getByLabel('Message the course assistant');
  await expect(input).toBeFocused();
  const miniActions = page.getByRole('button', { name: 'Conversation actions' });
  await miniActions.click();
  const miniClear = page.getByRole('button', { name: 'Clear chat' });
  await miniClear.focus();
  await miniClear.press('Escape');
  await expect(miniClear).toHaveCount(0);
  await expect(miniActions).toBeFocused();
  await miniActions.click();
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.getByRole('heading', { name: 'Clear this conversation?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(miniActions).toBeFocused();
  await input.fill('Explain this course');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  expect(chatRequests).toEqual([
    {
      method: 'POST',
      path: '/chat/',
      body: { thread_id: expect.any(String), message: 'Explain this course', course_id: 7 },
    },
  ]);
  await page.getByRole('button', { name: 'Expand course assistant' }).click();
  await expect(page).toHaveURL('/learning/enrollments/4/ai-chat');
  await expect(page.getByText('One answer 1.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toHaveCount(0);
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps a pending general request through mini-to-full expansion without a duplicate request', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  let resolveChat: (() => Promise<void>) | undefined;
  await page.route('**/chat/', async (route) => {
    chatRequests.push({
      method: route.request().method(),
      path: '/chat/',
      body: route.request().postDataJSON(),
    });
    await new Promise<void>((resolve) => {
      resolveChat = async () => {
        await json(route, { thread_id: 'general-thread', response: 'General answer.' });
        resolve();
      };
    });
  });
  await page.goto('/learning');
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await page.getByLabel('Message the course assistant').fill('Keep this pending');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Thinking…')).toBeVisible();
  await page.getByRole('button', { name: 'Expand course assistant' }).click();
  await expect(page).toHaveURL('/ai-chat');
  await expect(page.getByText('Keep this pending')).toBeVisible();
  await expect(page.getByText('Thinking…')).toBeVisible();
  if (resolveChat === undefined) throw new Error('Expected the pending chat request.');
  await resolveChat();
  await expect(page.getByText('General answer.')).toBeVisible();
  expect(chatRequests).toHaveLength(1);
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps the workspace chat bounded at desktop and effective 200% scale with reduced motion', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/learning/enrollments/4');
  const launcher = page.getByRole('button', { name: 'Open AI assistant' });
  await launcher.focus();
  await expect(launcher).toBeFocused();
  await launcher.click();
  const widget = page.getByRole('region', { name: 'Course assistant chat' });
  await expect(widget).toHaveCSS('width', '354px');
  expect(
    await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  ).toBe(true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  const scale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
  expect(scale).toBeCloseTo(2, 1);
  await expect(page.getByLabel('Message the course assistant')).toBeFocused();
  await expectNoOverflow(page);
  await cdp.detach();
  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('routes the authenticated header to the general full-page assistant without course context', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning/enrollments/4');

  await page.getByRole('link', { name: 'Open AI assistant' }).click();
  await expect(page).toHaveURL('/ai-chat');
  await expect(page.getByRole('heading', { name: 'BETA AI Learning Assistant' })).toBeVisible();
  const fullActions = page.getByRole('button', { name: 'Conversation actions' });
  await fullActions.click();
  const fullClear = page.getByRole('button', { name: 'Clear chat' });
  await fullClear.focus();
  await fullClear.press('Escape');
  await expect(fullClear).toHaveCount(0);
  await expect(fullActions).toBeFocused();
  await fullActions.click();
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.getByRole('heading', { name: 'Clear this conversation?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(fullActions).toBeFocused();
  const input = page.getByLabel('Message the course assistant');
  await expect(input).not.toBeFocused();
  await input.fill('Recommend a course');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  expect(chatRequests).toEqual([
    {
      method: 'POST',
      path: '/chat/',
      body: { thread_id: expect.any(String), message: 'Recommend a course' },
    },
  ]);
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('gives guests sign-up and login guidance without calling the assistant API', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.route('**/*', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/courses') {
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/chat/') {
      chatRequests.push({
        method: route.request().method(),
        path,
        body: route.request().postDataJSON(),
      });
      return json(route, { thread_id: 'unexpected', response: 'Unexpected response' });
    }
    return route.fallback();
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await expect(page.getByRole('region', { name: 'AI assistant sign in guidance' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
    'href',
    '/signup?returnTo=%2F',
  );
  await page.getByRole('link', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/login?returnTo=%2F');
  expect(chatRequests).toEqual([]);
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('reflows the general full-page assistant at all standard application widths', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ai-chat');
    await expect(page.getByRole('heading', { name: 'BETA AI Learning Assistant' })).toBeVisible();
    await expect(page.getByLabel('Message the course assistant')).toBeVisible();
    await expectNoOverflow(page);
  }

  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});
