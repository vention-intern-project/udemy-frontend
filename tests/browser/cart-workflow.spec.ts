import { expect, test, type Page, type Request, type Route } from '@playwright/test';

const student = {
  email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student',
  birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z',
};
const cartItem = {
  id: 10, course_id: 7, added_at: '2026-01-01T00:00:00Z',
  course: { id: 7, title: 'A deliberately long cart course title that must remain operable at every required viewport width', price: '19.990', currency: 'USD' },
};
const exactLongTotal = '1000000000000000000000019.0001';

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installStudent(page: Page) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
}

function isCartApiPath(pathname: string): boolean {
  return pathname === '/cart' || pathname === '/cart/items/7';
}

interface CartApiRequest {
  method: string;
  pathname: string;
}

type CartApiRouteHandler = (route: Route, request: CartApiRequest) => Promise<void>;

interface CartRequestLifecycle {
  initiated: string[];
  completed: string[];
  logicalCompleted: string[];
  aborted: string[];
  deleteResponses: CartResponseRecord[];
  responseProvenDeletes: string[];
  toleratedDeleteAborts: string[];
  unexpectedFailures: string[];
}

interface CartResponseRecord {
  label: string;
  status: number;
}

interface SuccessfulDeleteLifecycleExpectation {
  deleteLabel: string;
  initiated: string[];
}

function cartApiRequest(request: Request): CartApiRequest | null {
  const url = new URL(request.url());
  if (request.resourceType() === 'document' || !isCartApiPath(url.pathname)) return null;
  return { method: request.method(), pathname: url.pathname };
}

function cartRequestLabel(request: CartApiRequest): string {
  return `${request.method} ${request.pathname}`;
}

function trackCartRequestLifecycle(page: Page): CartRequestLifecycle {
  const lifecycle: CartRequestLifecycle = {
    initiated: [], completed: [], logicalCompleted: [], aborted: [], deleteResponses: [],
    responseProvenDeletes: [], toleratedDeleteAborts: [], unexpectedFailures: [],
  };
  const responseProvenDeleteRequests = new WeakSet<Request>();
  page.on('request', (request) => {
    const cartRequest = cartApiRequest(request);
    if (cartRequest) lifecycle.initiated.push(cartRequestLabel(cartRequest));
  });
  page.on('response', (response) => {
    const cartRequest = cartApiRequest(response.request());
    if (!cartRequest || cartRequest.method !== 'DELETE') return;
    const label = cartRequestLabel(cartRequest);
    const record: CartResponseRecord = { label, status: response.status() };
    lifecycle.deleteResponses.push(record);
    if (record.status === 204) {
      responseProvenDeleteRequests.add(response.request());
      lifecycle.responseProvenDeletes.push(label);
      lifecycle.logicalCompleted.push(label);
    }
  });
  page.on('requestfinished', (request) => {
    const cartRequest = cartApiRequest(request);
    if (!cartRequest) return;
    const label = cartRequestLabel(cartRequest);
    lifecycle.completed.push(label);
    if (cartRequest.method !== 'DELETE') lifecycle.logicalCompleted.push(label);
  });
  page.on('requestfailed', (request) => {
    const cartRequest = cartApiRequest(request);
    if (!cartRequest) return;
    const label = cartRequestLabel(cartRequest);
    const errorText = request.failure()?.errorText;
    if (errorText === 'net::ERR_ABORTED') {
      lifecycle.aborted.push(label);
      if (cartRequest.method === 'DELETE') {
        if (responseProvenDeleteRequests.has(request)) lifecycle.toleratedDeleteAborts.push(label);
        else lifecycle.unexpectedFailures.push(`${label} ${errorText}`);
      }
      return;
    }
    lifecycle.unexpectedFailures.push(`${label} ${errorText ?? 'unknown failure'}`);
  });
  return lifecycle;
}

async function expectSuccessfulDeleteLifecycle(
  lifecycle: CartRequestLifecycle,
  expectation: SuccessfulDeleteLifecycleExpectation,
) {
  await expect.poll(() => lifecycle.initiated).toEqual(expectation.initiated);
  await expect.poll(() => lifecycle.deleteResponses).toEqual([{ label: expectation.deleteLabel, status: 204 }]);
  await expect.poll(() => lifecycle.responseProvenDeletes).toEqual([expectation.deleteLabel]);
  await expect.poll(() => lifecycle.toleratedDeleteAborts).toEqual([expectation.deleteLabel]);
  await expect.poll(() => lifecycle.logicalCompleted).toEqual([
    'GET /cart', expectation.deleteLabel, 'GET /cart',
  ]);
  await expect.poll(() => lifecycle.completed.filter((label) => label === 'GET /cart')).toEqual([
    'GET /cart', 'GET /cart',
  ]);
  expect(lifecycle.aborted.filter((label) => label === 'GET /cart')).toEqual(['GET /cart']);
  expect(lifecycle.unexpectedFailures).toEqual([]);
}

async function routeCartApi(page: Page, handler: CartApiRouteHandler) {
  await page.route('**/*', async (route) => {
    const request = cartApiRequest(route.request());
    if (!request) {
      await route.fallback();
      return;
    }
    await handler(route, request);
  });
}

function cart(items = [cartItem]) {
  return { id: 1, items, total_price: items.length === 0 ? '0.00' : exactLongTotal, currency: 'USD', item_count: items.length };
}

test.describe('FE-009 cart workflow QA harness', () => {
  test('uses authenticated fixtures for exact cart mutation, cache count, focus/status, reduced motion, and five-width diagnostics', async ({ page }, testInfo) => {
    await installStudent(page);
    const lifecycle = trackCartRequestLifecycle(page);
    let currentCart = cart();
    await page.route('**/me', (route) => json(route, student));
    await routeCartApi(page, async (route, request) => {
      const requestLabel = cartRequestLabel(request);
      if (requestLabel === 'GET /cart') return json(route, currentCart);
      if (requestLabel === 'DELETE /cart/items/7') {
        currentCart = cart([]);
        return route.fulfill({ status: 204 });
      }
      throw new Error(`Unexpected cart request ${requestLabel}`);
    });

    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Cart', exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cart (1)' })).toBeVisible();
    await expect(page.getByLabel('Cart total')).toContainText(`USD ${exactLongTotal}`);
    await expect.poll(() => lifecycle.completed).toEqual(['GET /cart']);
    await expect.poll(() => lifecycle.aborted).toEqual(['GET /cart']);
    expect(lifecycle.initiated).toEqual(['GET /cart', 'GET /cart']);

    for (const width of [320, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('button', { name: /remove a deliberately long cart course/i })).toBeVisible();
      const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
      expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
      await testInfo.attach(`cart-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
    await page.getByRole('button', { name: /remove a deliberately long cart course/i }).click();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeFocused();
    await expect(page.getByRole('status')).toContainText('Course removed from cart.');
    await expectSuccessfulDeleteLifecycle(lifecycle, {
      deleteLabel: 'DELETE /cart/items/7',
      initiated: ['GET /cart', 'GET /cart', 'DELETE /cart/items/7', 'GET /cart'],
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim())).toBe('0ms');
  });

  test('keeps authenticated 403 on a safe catalog recovery action instead of a guest-route loop', async ({ page }) => {
    await installStudent(page);
    await page.route('**/me', (route) => json(route, student));
    await routeCartApi(page, async (route, request) => {
      if (request.method === 'GET' && request.pathname === '/cart') {
        await json(route, { detail: 'private' }, 403);
        return;
      }
      throw new Error(`Unexpected cart request ${request.method} ${request.pathname}`);
    });
    await page.goto('/cart');
    await expect(page.getByText('Cart is unavailable')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse courses' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: /log in/i })).toHaveCount(0);
  });

  test('uses the exact API-003 clear request and revalidates the cart', async ({ page }) => {
    await installStudent(page);
    const lifecycle = trackCartRequestLifecycle(page);
    let currentCart = cart();
    await page.route('**/me', (route) => json(route, student));
    await routeCartApi(page, async (route, request) => {
      const requestLabel = cartRequestLabel(request);
      if (requestLabel === 'GET /cart') return json(route, currentCart);
      if (requestLabel === 'DELETE /cart') {
        currentCart = cart([]);
        return route.fulfill({ status: 204 });
      }
      throw new Error(`Unexpected cart request ${requestLabel}`);
    });

    await page.goto('/cart');
    await page.getByRole('button', { name: 'Clear cart' }).first().click();
    await page.getByRole('button', { name: 'Clear cart' }).last().click();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeFocused();
    await expectSuccessfulDeleteLifecycle(lifecycle, {
      deleteLabel: 'DELETE /cart',
      initiated: ['GET /cart', 'GET /cart', 'DELETE /cart', 'GET /cart'],
    });
  });
});
