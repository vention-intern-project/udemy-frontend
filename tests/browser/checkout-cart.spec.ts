import { expect, test, type Page, type Route } from '@playwright/test';
import type { MockPaymentCompletionRequestDto, MockPaymentCompletionStatusDto } from '@entities/cart';
import type { EnrollmentStatus } from '@entities/enrollment';
import { cartWorkflowOrigin } from './cart-workflow-server';

const student = { email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student', birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z' };
const course = { id: 7, title: 'A deliberately long mock checkout course title that must remain operable at compact widths', description: null, price: '19.99', currency: 'USD' };
const pendingEnrollment = { id: 4, user_id: 1, course_id: 7, status: 'pending_payment', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', course };

function cart(items = [{ id: 10, course_id: 7, added_at: '2026-01-01T00:00:00Z', course: { id: 7, title: course.title, price: '19.99', currency: 'USD' } }]) {
  return { id: 1, items, total_price: items.length === 0 ? '0.00' : '19.99', currency: 'USD', item_count: items.length };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installStudent(page: Page) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
}

async function routeCheckoutApi(page: Page, handler: (route: Route, path: string, method: string) => Promise<void>) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === 'document' || url.origin !== cartWorkflowOrigin) return route.fallback();
    if (url.pathname === '/me' || url.pathname === '/cart' || url.pathname === '/cart/checkout' || url.pathname === '/enrollments/my' || url.pathname === '/enrollments/4' || url.pathname === '/payments/complete' || url.pathname === '/courses/7/progress' || url.pathname === '/courses/7/lessons') {
      await handler(route, url.pathname, route.request().method());
      return;
    }
    await route.fallback();
  });
}

function assertNoOverflow(page: Page) {
  return page.evaluate(() => ({ client: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
}

test('sends one checkout POST, labels accepted payment as pending, and preserves responsive keyboard access', async ({ page }) => {
  await installStudent(page);
  let currentCart = cart();
  let checkoutPosts = 0;
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/cart' && method === 'GET') return json(route, currentCart);
    if (path === '/cart/checkout') { checkoutPosts += 1; currentCart = cart([]); return json(route, { message: 'Checkout successful.', enrolled_courses: 1 }); }
    if (path === '/enrollments/my') return json(route, { items: [pendingEnrollment], page: 1, page_size: 20, total: 1, pages: 1, has_next: false, has_previous: false });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/cart');
  const checkout = page.getByRole('button', { name: 'Mock checkout', exact: true });
  await checkout.dblclick();
  await expect.poll(() => checkoutPosts).toBe(1);
  await expect(page.getByText('Mock checkout was accepted. Payment is pending; continue in My Learning.')).toBeVisible();
  await page.getByRole('link', { name: 'Check My Learning' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
  await expect(page.getByText('Payment pending')).toBeVisible();
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await assertNoOverflow(page);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.client);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.client);
  }
  await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
  const zoomed = await assertNoOverflow(page);
  expect(zoomed.documentWidth).toBeLessThanOrEqual(zoomed.client);
  expect(zoomed.bodyWidth).toBeLessThanOrEqual(zoomed.client);
  expect(consoleErrors).toEqual([]);
});

test('keeps a 5xx checkout locked after unchanged-cart reconciliation and directs the student to My Learning', async ({ page }) => {
  await installStudent(page);
  let checkoutPosts = 0;
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/cart' && method === 'GET') return json(route, cart());
    if (path === '/cart/checkout') { checkoutPosts += 1; return json(route, { detail: 'private' }, 503); }
    if (path === '/enrollments/my') return json(route, { items: [], page: 1, page_size: 20, total: 0, pages: 0, has_next: false, has_previous: false });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/cart');
  const checkout = page.getByRole('button', { name: 'Mock checkout', exact: true });
  await checkout.click();
  await expect(page.getByText('We could not confirm checkout. Check the cart status for updated guidance.')).toBeVisible();
  await expect(checkout).toBeDisabled();
  await page.getByRole('button', { name: 'Check checkout status' }).press('Enter');
  await expect(page.getByText('Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Check My Learning' })).toBeVisible();
  await expect(checkout).toBeDisabled();
  await checkout.press('Enter');
  await checkout.click({ force: true });
  expect(checkoutPosts).toBe(1);
});

test('supports explicit mock-payment success and failure while only observed active enrollment unlocks progress', async ({ page }) => {
  await installStudent(page);
  let enrollmentStatus: EnrollmentStatus = 'pending_payment';
  let paymentPosts = 0;
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/enrollments/4') return json(route, { ...pendingEnrollment, status: enrollmentStatus });
    if (path === '/payments/complete') {
      paymentPosts += 1;
      const body = route.request().postDataJSON() as MockPaymentCompletionRequestDto;
      const completionStatus: MockPaymentCompletionStatusDto = body.status === 'success' ? 'active' : 'cancelled';
      enrollmentStatus = completionStatus;
      return json(route, { enrollment_id: 4, status: completionStatus, message: 'mock' });
    }
    if (path === '/courses/7/progress') return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 0, progress_percentage: 0 });
    if (path === '/courses/7/lessons') return json(route, { items: [], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Complete mock payment' }).dblclick();
  await expect.poll(() => paymentPosts).toBe(1);
  await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
  await page.goto('/learning/enrollments/4');
  enrollmentStatus = 'pending_payment';
  await expect(page.getByRole('button', { name: 'Simulate mock payment failure' })).toBeVisible();
  await page.getByRole('button', { name: 'Simulate mock payment failure' }).click();
  await expect(page.getByText('Cancelled')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learning progress' })).toHaveCount(0);
  expect(paymentPosts).toBe(2);
});

test('keeps an unknown mock payment locked with no second POST until status reconciliation observes pending', async ({ page }) => {
  await installStudent(page);
  let paymentPosts = 0;
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/enrollments/4') {
      return json(route, { ...pendingEnrollment, status: 'pending_payment' });
    }
    if (path === '/payments/complete') {
      paymentPosts += 1;
      await route.abort('failed');
      return;
    }
    if (path === '/courses/7/progress') return json(route, { course_id: 7, completed_lessons: 0, total_lessons: 0, progress_percentage: 0 });
    if (path === '/courses/7/lessons') return json(route, { items: [], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Complete mock payment' }).click();
  await expect(page.getByText('Payment status needs checking')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete mock payment' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Simulate mock payment failure' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Check payment status' }).click();
  await expect(page.getByText('Payment remains pending')).toBeVisible();
  expect(paymentPosts).toBe(1);
  await expect(page.getByRole('button', { name: 'Complete mock payment' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulate mock payment failure' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check payment status' })).toHaveCount(0);
});

for (const scenario of [
  { name: 'unauthorized', status: 401, title: 'Sign in required' },
  { name: 'conflict', status: 409, title: 'Enrollment changed' },
  { name: 'unavailable', status: 503, title: 'Checkout status needs checking' },
  { name: 'malformed', status: 200, title: 'Checkout status needs checking' },
] as const) test(`renders ${scenario.name} checkout feedback without retrying the POST`, async ({ page }) => {
  await installStudent(page);
  let posts = 0;
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/cart' && method === 'GET') return json(route, cart());
    if (path === '/cart/checkout') {
      posts += 1;
      if (scenario.name === 'malformed') return json(route, { message: 7, enrolled_courses: 'bad' });
      return json(route, { detail: 'private' }, scenario.status);
    }
    if (path === '/enrollments/my') return json(route, { items: [], page: 1, page_size: 20, total: 0, pages: 0, has_next: false, has_previous: false });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Mock checkout', exact: true }).click();
  if (scenario.name === 'unauthorized') {
    await expect(page.getByRole('heading', { level: 1, name: 'Log in', exact: true })).toBeVisible();
    const loginUrl = new URL(page.url());
    expect(loginUrl.pathname).toBe('/login');
    expect(loginUrl.searchParams.get('returnTo')).toBe('/cart');
    expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(null);
  } else {
    const alert = page.getByRole('alert');
    await expect(alert.getByText(scenario.title, { exact: true })).toBeVisible();
    if (scenario.name === 'conflict') {
      await expect(alert.getByText('Your enrollment changed. Check My Learning before taking another action.', { exact: true })).toBeVisible();
      await expect(alert.getByRole('link', { name: 'Check My Learning', exact: true })).toBeVisible();
    }
  }
  await expect(page.locator('body')).not.toContainText('private');
  expect(posts).toBe(1);
});
