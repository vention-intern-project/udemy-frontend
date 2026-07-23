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

async function expectMobileMenuGeometry(page: Page) {
  const metrics = await page.getByRole('button', { name: 'Open navigation' }).evaluate((button) => {
    const labels = button.querySelectorAll('[aria-hidden="true"]');
    const label = labels.item(0);
    const header = button.closest('.app-header');
    if (
      labels.length !== 1
      || !(label instanceof HTMLElement)
      || !(header instanceof HTMLElement)
    ) {
      throw new Error('Mobile menu geometry targets are unavailable');
    }

    const buttonRect = button.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const style = getComputedStyle(button);
    const labelStyle = getComputedStyle(label);
    return {
      labelText: label.textContent?.trim() ?? '',
      labelDisplay: labelStyle.display,
      labelVisibility: labelStyle.visibility,
      labelOpacity: Number.parseFloat(labelStyle.opacity),
      labelWidth: labelRect.width,
      labelHeight: labelRect.height,
      width: buttonRect.width,
      height: buttonRect.height,
      paddingLeft: Number.parseFloat(style.paddingLeft),
      paddingRight: Number.parseFloat(style.paddingRight),
      labelLeftInset: labelRect.left - buttonRect.left,
      labelRightInset: buttonRect.right - labelRect.right,
      labelTopInset: labelRect.top - buttonRect.top,
      labelBottomInset: buttonRect.bottom - labelRect.bottom,
      horizontalCenterOffset: Math.abs(
        (labelRect.left + labelRect.right) / 2 - (buttonRect.left + buttonRect.right) / 2,
      ),
      verticalCenterOffset: Math.abs(
        (labelRect.top + labelRect.bottom) / 2 - (buttonRect.top + buttonRect.bottom) / 2,
      ),
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
      clientHeight: button.clientHeight,
      scrollHeight: button.scrollHeight,
      headerClientWidth: header.clientWidth,
      headerScrollWidth: header.scrollWidth,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });

  expect(metrics.labelText).toBe('Menu');
  expect(metrics.labelDisplay).not.toBe('none');
  expect(metrics.labelVisibility).toBe('visible');
  expect(metrics.labelOpacity).toBeGreaterThan(0);
  expect(metrics.labelWidth).toBeGreaterThan(0);
  expect(metrics.labelHeight).toBeGreaterThan(0);
  expect(metrics.width).toBeGreaterThanOrEqual(44);
  expect(metrics.height).toBeGreaterThanOrEqual(44);
  expect(metrics.paddingLeft).toBeGreaterThanOrEqual(8);
  expect(metrics.paddingRight).toBeGreaterThanOrEqual(8);
  expect(metrics.labelLeftInset).toBeGreaterThan(metrics.paddingLeft);
  expect(metrics.labelRightInset).toBeGreaterThan(metrics.paddingRight);
  expect(metrics.labelTopInset).toBeGreaterThan(0);
  expect(metrics.labelBottomInset).toBeGreaterThan(0);
  expect(metrics.horizontalCenterOffset).toBeLessThanOrEqual(1);
  expect(metrics.verticalCenterOffset).toBeLessThanOrEqual(1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  expect(metrics.headerScrollWidth).toBeLessThanOrEqual(metrics.headerClientWidth);
  expect(metrics.outlineStyle).not.toBe('none');
  expect(metrics.outlineWidth).toBeGreaterThan(0);
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
  await expect(page).toHaveTitle('My learning | LearnHub');
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Cart' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'My learning' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Instructor courses' })).toHaveCount(0);
  assertRuntimeClean();
});

test('rejects malformed successful session data without authenticating or clearing it as a 401', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'potentially-valid-token'));
  await page.route('**/me', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ role: 'student' }),
  }));
  await page.goto('/learning');
  await expect(page.getByRole('heading', { level: 1, name: 'Session check failed' })).toBeVisible();
  await expect(page.getByText(/student/)).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token')))
    .toBe('potentially-valid-token');
  await expect(page).toHaveTitle('LearnHub');
  assertRuntimeClean();
});

test('keeps Router metadata, layout, density, and titles aligned for a case/trailing parameter route', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/instructor/COURSES/ABC/edit/');
  await expect(page.getByRole('heading', { level: 1, name: 'Edit course' })).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-layout', 'workspace');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'workspace');
  await expect(page).toHaveTitle('Edit course | LearnHub');
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('heading', { level: 1, name: 'Edit course' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).focus();
  await expectMobileMenuGeometry(page);
  await expectNoHorizontalOverflow(page);
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
  await expectMobileMenuGeometry(page);

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

  await page.setViewportSize({ width: 320, height: 740 });
  await expectMobileMenuGeometry(page);
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('preserves the source mobile menu and focus for modified and new-tab activation', async ({ page, context }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/instructor/courses/42/edit');
  await expect(page.getByRole('heading', { level: 1, name: 'Edit course' })).toBeVisible();
  const originalUrl = page.url();
  const menu = page.getByRole('button', { name: 'Open navigation' });

  async function openAndFocusInstructorCourses() {
    if (await page.getByRole('navigation', { name: 'Mobile navigation' }).count() === 0) {
      await menu.click();
    }
    const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(navigation).toBeVisible();
    const link = navigation.getByRole('link', { name: 'Instructor courses' });
    await link.focus();
    await expect(link).toBeFocused();
    return { navigation, link };
  }

  const control = await openAndFocusInstructorCourses();
  const controlPopupPromise = context.waitForEvent('page');
  await control.link.click({ modifiers: ['Control'] });
  const controlPopup = await controlPopupPromise;
  await controlPopup.waitForURL(/\/instructor\/courses(?:[?#]|$)/);
  expect(new URL(controlPopup.url()).pathname).toBe('/instructor/courses');
  expect(page.url()).toBe(originalUrl);
  await expect(control.navigation).toBeVisible();
  await expect(control.link).toBeFocused();
  await controlPopup.close();

  const meta = await openAndFocusInstructorCourses();
  const metaDefaultAllowed = await meta.link.evaluate((element) => {
    let defaultPreventedByApplication = true;
    const observeThenCancelNavigation = (event: MouseEvent) => {
      defaultPreventedByApplication = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener('click', observeThenCancelNavigation, { once: true });
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    element.dispatchEvent(event);
    return !defaultPreventedByApplication;
  });
  expect(metaDefaultAllowed).toBe(true);
  expect(page.url()).toBe(originalUrl);
  await expect(meta.navigation).toBeVisible();
  await expect(meta.link).toBeFocused();

  const middle = await openAndFocusInstructorCourses();
  const middlePopupPromise = context.waitForEvent('page');
  await middle.link.click({ button: 'middle' });
  const middlePopup = await middlePopupPromise;
  await middlePopup.waitForURL(/\/instructor\/courses(?:[?#]|$)/);
  expect(new URL(middlePopup.url()).pathname).toBe('/instructor/courses');
  expect(page.url()).toBe(originalUrl);
  await expect(middle.navigation).toBeVisible();
  await expect(middle.link).toBeFocused();
  await middlePopup.close();

  const ordinary = await openAndFocusInstructorCourses();
  await ordinary.link.click();
  await expect(page).toHaveURL(/\/instructor\/courses$/);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveTitle('Instructor courses | LearnHub');
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('renders the not-found route at mobile width without overflow', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page).toHaveTitle('LearnHub');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});
