import { expect, test, type ConsoleMessage, type Page, type Request } from '@playwright/test';

function response(items: unknown[] = [], pagination: Partial<{ page: number; pages: number; has_next: boolean; has_previous: boolean }> = {}) {
  return JSON.stringify({ items, page: 1, page_size: 20, total: items.length, pages: items.length ? 1 : 0, has_next: false, has_previous: false, ...pagination });
}

function permittedCourse(title = 'React') {
  return { id: 7, title, description: null, price: '9.99', currency: 'USD', published_at: '2026-01-01T00:00:00Z', instructor: { id: 1, name: 'Ada', surname: 'Lovelace' }, lessons: [{ id: 1, title: 'Intro' }] };
}

async function monitor(page: Page, allowed: {
  requestFailure?: (request: Request) => boolean;
  consoleError?: (message: ConsoleMessage) => boolean;
} = {}) {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !allowed.consoleError?.(message)) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!allowed.requestFailure?.(request)) failures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
  });
  return () => {
    expect(errors, 'unexpected browser console/page errors').toEqual([]);
    expect(failures, 'unexpected browser request failures').toEqual([]);
  };
}

test('hydrates, applies, traverses catalog history, and keeps real-browser diagnostics clean', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()]) });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?search_query=React&min_price=5&sort=-price');
  await expect(page.getByLabel('Search courses')).toHaveValue('React');
  await expect(page.getByLabel('Search courses')).toHaveAttribute('placeholder', 'Search title, description, or instructor first or last name');
  await expect(page.getByRole('link', { name: 'React' })).toHaveAttribute('href', '/courses/7');
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await expect(page.getByText('Total lessons').locator('..')).toHaveText('Total lessons1');
  expect(requests[0]).toContain('page_size=20');

  await page.getByLabel('Search courses').fill('TypeScript');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/search_query=TypeScript/);
  await page.goBack();
  await expect(page.getByLabel('Search courses')).toHaveValue('React');
  await page.goForward();
  await expect(page.getByLabel('Search courses')).toHaveValue('TypeScript');

  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Apply filters' }).focus();
  await expect(page.getByRole('button', { name: 'Apply filters' })).toBeFocused();
  assertClean();
});

test('canonicalizes an inverted range and honors server-false pagination availability', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()], { pages: 3, has_next: false, has_previous: false }) });
  });

  await page.goto('/?search_query=React&min_price=30&max_price=10&page=1');
  await expect(page).toHaveURL('/?search_query=React');
  expect(requests).not.toContainEqual(expect.stringContaining('min_price='));
  expect(requests).not.toContainEqual(expect.stringContaining('max_price='));
  await expect(page.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: '1 course found. Page 1.' })).toHaveCount(1);
  const requestCountBeforeDisabledClick = requests.length;
  await page.getByRole('button', { name: 'Go to next page' }).evaluate((button) => (button as HTMLButtonElement).click());
  expect(requests).toHaveLength(requestCountBeforeDisabledClick);
  assertClean();
});

test('shows linked negative-price validation on Enter, then submits a corrected value', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()]) });
  });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'React' })).toBeVisible();
  const requestCountBeforeInvalidSubmit = requests.length;
  const minimum = page.getByLabel('Minimum price');
  await minimum.fill('-1');
  await minimum.press('Enter');

  await expect(page.getByText('Enter a non-negative price.')).toBeVisible();
  await expect(minimum).toHaveAttribute('aria-invalid', 'true');
  await expect(minimum).toHaveAttribute('aria-describedby', /-error/);
  await expect(page).toHaveURL('/');
  expect(requests).toHaveLength(requestCountBeforeInvalidSubmit);

  await minimum.fill('5');
  await minimum.press('Enter');
  await expect(page).toHaveURL('/?min_price=5');
  await expect.poll(() => requests.length).toBe(requestCountBeforeInvalidSubmit + 1);
  const correctedRequest = requests[requests.length - 1];
  expect(correctedRequest).toContain('min_price=5');
  expect(correctedRequest).toContain('page_size=20');
  assertClean();
});

test('allows only the exact simulated offline request failure and retries successfully', async ({ page }) => {
  let offlineAttempts = 0;
  const assertClean = await monitor(page, {
    requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED'
      || new URL(request.url()).searchParams.get('search_query') === 'offline',
    consoleError: (message) => message.text() === 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
  });
  await page.route('**/courses**', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get('search_query') === 'offline' && offlineAttempts++ < 2) {
      await route.abort('internetdisconnected');
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse('Recovered')]) });
  });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Recovered' })).toBeVisible();
  await page.getByLabel('Search courses').fill('offline');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('alert')).toContainText('You appear to be offline');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: 'Recovered' })).toBeVisible();
  expect(offlineAttempts).toBe(3);
  assertClean();
});
