import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { cartWorkflowOrigin } from './cart-workflow-server';

interface ReturnState {
  returnTo?: unknown;
}

interface UiFixesDeferredApiOptions {
  cartStatus?: number;
  cartItems?: CartItem[];
  learningStatus?: number;
}

interface CartItem {
  id: number;
  course_id: number;
  added_at: string;
  course: CourseSummary;
}

interface CourseSummary {
  id: number;
  title: string;
  price: string;
  currency: string;
}

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};

const course: CourseSummary = {
  id: 7,
  title: 'Deterministic Cart course',
  price: '19.99',
  currency: 'USD',
};

const populatedCartItems: CartItem[] = [
  { id: 10, course_id: course.id, added_at: '2026-01-01T00:00:00Z', course },
];

function cart(items = populatedCartItems) {
  return {
    id: 1,
    items,
    total_price: items.length === 0 ? '0.00' : '19.99',
    currency: 'USD',
    item_count: items.length,
  };
}

function learningList() {
  return {
    items: [
      {
        id: 4,
        user_id: 1,
        course_id: course.id,
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        course: { ...course, description: null },
      },
    ],
    page: 1,
    page_size: 20,
    total: 1,
    pages: 1,
    has_next: false,
    has_previous: false,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function record(testInfo: TestInfo, criterion: string, evidence: Record<string, unknown>) {
  await testInfo.attach(`${criterion}-evidence`, {
    body: JSON.stringify(evidence),
    contentType: 'application/json',
  });
}

async function installScenario(page: Page, state?: ReturnState) {
  await page.addInitScript((initialState) => {
    localStorage.setItem('learnhub.access-token', 'student-token');
    if (initialState !== undefined)
      history.replaceState({ usr: initialState, key: 'uifd-003', idx: 0 }, '', '/cart');
  }, state);
}

async function installApiFixtures(page: Page, options: UiFixesDeferredApiOptions = {}) {
  const unexpectedRequests: string[] = [];
  const mutations: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === 'document' || url.origin !== cartWorkflowOrigin) {
      await route.fallback();
      return;
    }
    const label = `${request.method()} ${url.pathname}`;
    if (url.pathname === '/me' && request.method() === 'GET') return fulfillJson(route, student);
    if (url.pathname === '/cart' && request.method() === 'GET')
      return fulfillJson(route, cart(options.cartItems), options.cartStatus ?? 200);
    if (url.pathname === '/enrollments/my' && request.method() === 'GET')
      return fulfillJson(route, learningList(), options.learningStatus ?? 200);
    if (request.resourceType() !== 'fetch') {
      await route.fallback();
      return;
    }
    if (request.method() !== 'GET') mutations.push(label);
    unexpectedRequests.push(label);
    await route.abort('failed');
  });
  return { mutations, unexpectedRequests };
}

function mainContent(page: Page) {
  return page.locator('#main-content');
}

function cartHeading(page: Page) {
  return mainContent(page).getByRole('heading', { name: 'Cart', exact: true });
}

function contextualLink(page: Page, name: 'Catalog' | 'My learning') {
  return mainContent(page).getByRole('link', { name, exact: true });
}

async function expectNoOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
  return geometry;
}

test.describe('UIFD-003 deterministic Cart contextual-return harness', () => {
  test('AC01 renders a single query/hash-preserving Cart return inside main content', async ({
    page,
  }, testInfo) => {
    await installScenario(page, { returnTo: '/learning?page=2#courses' });
    const api = await installApiFixtures(page);
    await page.goto('/cart');
    const link = contextualLink(page, 'My learning');
    await expect(cartHeading(page)).toBeVisible();
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/learning?page=2#courses');
    await record(testInfo, 'UIFD-003-AC-01', {
      href: await link.getAttribute('href'),
      unexpectedRequests: api.unexpectedRequests,
    });
    expect(api.unexpectedRequests).toEqual([]);
  });

  test('AC01 renders the My learning Catalog source only inside main content', async ({
    page,
  }, testInfo) => {
    await installScenario(page);
    const api = await installApiFixtures(page);
    await page.goto('/learning');
    const link = contextualLink(page, 'Catalog');
    await expect(mainContent(page).getByRole('heading', { name: 'My learning' })).toBeVisible();
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '/');
    await record(testInfo, 'UIFD-003-AC-01', {
      href: await link.getAttribute('href'),
      unexpectedRequests: api.unexpectedRequests,
    });
    expect(api.unexpectedRequests).toEqual([]);
  });

  for (const scenario of [
    ['missing', undefined],
    ['malformed', 'courses'],
    ['external', 'https://example.test/courses'],
    ['protocol-relative', '//example.test/courses'],
    ['backslash', '\\courses'],
    ['credentialed', 'https://user:pass@127.0.0.1:4177/courses'],
    ['unregistered', '/not-a-route'],
    ['self', '/cart?from=cart'],
  ] as const) {
    test(`AC02 rejects ${scenario[0]} Cart return state to the Catalog fallback`, async ({
      page,
    }, testInfo) => {
      await installScenario(
        page,
        scenario[1] === undefined ? undefined : { returnTo: scenario[1] },
      );
      const api = await installApiFixtures(page);
      await page.goto('/cart');
      const link = contextualLink(page, 'Catalog');
      await expect(cartHeading(page)).toBeVisible();
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', '/');
      await record(testInfo, 'UIFD-003-AC-02', {
        scenario: scenario[0],
        href: await link.getAttribute('href'),
        unexpectedRequests: api.unexpectedRequests,
      });
      expect(api.unexpectedRequests).toEqual([]);
    });
  }

  for (const activation of ['pointer', 'Enter', 'Space'] as const) {
    test(`AC03 uses same-tab Router navigation for ${activation} from the main-content return`, async ({
      page,
    }, testInfo) => {
      await installScenario(page, { returnTo: '/learning?page=2#courses' });
      const api = await installApiFixtures(page);
      await page.goto('/cart');
      const link = contextualLink(page, 'My learning');
      await expect(link).toBeVisible();
      await link.focus();
      const beforeScroll = await page.evaluate(() => window.scrollY);
      if (activation === 'pointer') await link.click();
      else await page.keyboard.press(activation === 'Space' ? 'Space' : activation);
      await expect(page).toHaveURL(/\/learning\?page=2#courses$/);
      await expect(mainContent(page).getByRole('heading', { name: 'My learning' })).toBeVisible();
      const afterScroll = await page.evaluate(() => window.scrollY);
      await record(testInfo, 'UIFD-003-AC-03', {
        activation,
        url: page.url(),
        beforeScroll,
        afterScroll,
        mutations: api.mutations,
        unexpectedRequests: api.unexpectedRequests,
      });
      expect(afterScroll).toBe(beforeScroll);
      expect(api.mutations).toEqual([]);
      expect(api.unexpectedRequests).toEqual([]);
    });
  }

  test('AC04 retains DD-239 return presentation and resolved Cart reflow without network mutations', async ({
    page,
  }, testInfo) => {
    await installScenario(page, { returnTo: '/learning?page=2#courses' });
    const api = await installApiFixtures(page);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto('/cart');
    const link = contextualLink(page, 'My learning');
    await expect(link).toHaveCSS('font-size', '16px');
    await expect(link).toHaveCSS('line-height', '24px');
    await expect(link).toHaveCSS('min-height', '44px');
    await expect(link.locator('..')).toHaveCSS('gap', '4px');
    await expect(link).toHaveCSS('color', 'rgb(91, 63, 214)');
    await link.hover();
    await expect(link).toHaveCSS('color', 'rgb(73, 50, 182)');
    const viewports: Record<string, unknown> = {};
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      viewports[String(width)] = await expectNoOverflow(page);
    }
    await page.evaluate(() => {
      document.documentElement.style.zoom = '200%';
    });
    viewports.zoom200 = await expectNoOverflow(page);
    await record(testInfo, 'UIFD-003-AC-04', {
      viewports,
      consoleErrors,
      mutations: api.mutations,
      unexpectedRequests: api.unexpectedRequests,
    });
    expect(consoleErrors).toEqual([]);
    expect(api.mutations).toEqual([]);
    expect(api.unexpectedRequests).toEqual([]);
  });

  test('AC04 keeps Cart empty and unavailable states deterministic inside main content', async ({
    page,
  }, testInfo) => {
    await installScenario(page);
    const emptyApi = await installApiFixtures(page, { cartItems: [] });
    await page.goto('/cart');
    await expect(
      mainContent(page).getByRole('heading', { name: 'Your cart is empty' }),
    ).toBeVisible();
    expect(emptyApi.unexpectedRequests).toEqual([]);

    await page.unroute('**/*');
    const unavailableApi = await installApiFixtures(page, { cartStatus: 503 });
    await page.reload();
    await expect(mainContent(page).getByText('We could not load your cart')).toBeVisible();
    await record(testInfo, 'UIFD-003-AC-04', {
      emptyUnexpectedRequests: emptyApi.unexpectedRequests,
      unavailableUnexpectedRequests: unavailableApi.unexpectedRequests,
      mutations: unavailableApi.mutations,
    });
    expect(unavailableApi.unexpectedRequests).toEqual([]);
    expect(unavailableApi.mutations).toEqual([]);
  });

  test('AC05 keeps the harness task-scoped with no product mutation', async ({
    page,
  }, testInfo) => {
    await installScenario(page, { returnTo: '/' });
    const api = await installApiFixtures(page);
    await page.goto('/cart');
    await expect(contextualLink(page, 'Catalog')).toHaveAttribute('href', '/');
    await record(testInfo, 'UIFD-003-AC-05', {
      harness: 'tests/browser/uifd-003.spec.ts',
      configuration: 'tests/browser/uifd-003.playwright.config.ts',
      mutations: api.mutations,
      unexpectedRequests: api.unexpectedRequests,
    });
    expect(api.mutations).toEqual([]);
    expect(api.unexpectedRequests).toEqual([]);
  });
});
