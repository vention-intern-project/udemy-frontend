import { expect, test, type Page } from '@playwright/test';

type BackendRole = 'student' | 'instructor' | 'admin';

function monitorRuntime(page: Page, expectedHttpResourceErrors: readonly number[] = []) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return () => {
    const remainingExpectedStatuses = [...expectedHttpResourceErrors];
    const unexpectedConsoleErrors = consoleErrors.filter((message) => {
      const match = /^Failed to load resource: the server responded with a status of (\d{3}) \(.+\)$/.exec(message);
      const status = match ? Number(match[1]) : null;
      const expectedIndex = status === null ? -1 : remainingExpectedStatuses.indexOf(status);
      if (expectedIndex < 0) return true;
      remainingExpectedStatuses.splice(expectedIndex, 1);
      return false;
    });
    expect(pageErrors, 'uncaught browser errors').toEqual([]);
    expect(unexpectedConsoleErrors, 'unexpected browser console errors').toEqual([]);
  };
}

async function mockAuthenticatedSession(page: Page, role: BackendRole) {
  await page.addInitScript(() => {
    localStorage.setItem('learnhub.access-token', 'browser-test-token');
  });
  await page.route('**/me', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      email: `${role}@example.com`,
      name: role === 'student' ? 'Sam' : role === 'instructor' ? 'Indira' : 'Alex',
      surname: 'User',
      role,
      birthday: null,
      phone_number: null,
      created_at: '2026-07-20T00:00:00Z',
    }),
  }));
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
}

test('redirects an anonymous protected route with its internal returnTo', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cart?coupon=SAVE#summary');
  await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/cart?coupon=SAVE#summary');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('shows a bootstrap state then student-only workspace navigation', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'student');
  await page.route('**/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fallback();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learning');
  await expect(page.getByRole('heading', { level: 1, name: 'Preparing your workspace' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Cart' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'My learning' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Instructor courses' })).toHaveCount(0);
  assertRuntimeClean();
});

test('keeps wrong-role content hidden behind an accessible forbidden state', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Cart' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to catalog' })).toBeVisible();
  assertRuntimeClean();
});

test('clears an invalid stored bearer when /me rejects it', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page, [401]);
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'expired-token'));
  await page.route('**/me', async (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Expired token' }),
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Course catalog' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(null);
  assertRuntimeClean();
});

test('announces a recoverable session error and retries /me', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page, [503]);
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'retry-token'));
  let attempts = 0;
  await page.route('**/me', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Service unavailable' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'student@example.com',
        name: 'Sam',
        surname: 'User',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-07-20T00:00:00Z',
      }),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Session check failed' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'We could not verify your session. Check your connection and try again.',
  );
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Course catalog' })).toBeVisible();
  expect(attempts).toBe(2);
  assertRuntimeClean();
});

test('supports keyboard-operated mobile navigation and focus restoration', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/instructor/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'Instructor courses' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();

  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'Instructor courses' }).last().focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();

  await page.keyboard.press('Enter');
  const currentRouteLink = page.getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Instructor courses' });
  await currentRouteLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('renders the not-found route at mobile width without overflow', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});
