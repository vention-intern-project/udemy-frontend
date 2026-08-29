import { expect, test, type Page, type Route } from '@playwright/test';
import { cartWorkflowOrigin } from './cart-workflow-server';

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const course = {
  id: 7,
  title:
    'A deliberately long mock checkout course title that must remain operable at compact widths',
  description: null,
  price: '19.99',
  currency: 'USD',
};
const checkoutResidualCopy = {
  en: {
    checkStatus: 'Check checkout status',
    mockCheckout: 'Mock checkout',
    uncertain:
      'Your cart still cannot prove whether checkout partially completed. Do not start another checkout action.',
  },
  ru: {
    checkStatus: 'Проверить статус оплаты',
    mockCheckout: 'Тестовое оформление',
    uncertain:
      'Корзина по-прежнему не может подтвердить, была ли оплата частично завершена. Не начинайте новое оформление.',
  },
  uz: {
    checkStatus: 'To‘lov holatini tekshirish',
    mockCheckout: 'Sinov buyurtmasi',
    uncertain:
      'Savatingiz to‘lov qisman yakunlanganini hali ham tasdiqlay olmaydi. Yana checkout boshlamang.',
  },
} as const;

interface CheckoutTerminalLocaleCopy {
  readonly acceptedBody: string;
  readonly acceptedTitle: string;
  readonly conflictBody: string;
  readonly conflictTitle: string;
  readonly mockCheckout: string;
}

const checkoutTerminalCopy: Readonly<Record<'en' | 'ru' | 'uz', CheckoutTerminalLocaleCopy>> = {
  en: {
    acceptedTitle: 'Checkout accepted',
    acceptedBody:
      'Mock checkout was accepted. Payment is pending; learning access is not available yet.',
    conflictTitle: 'Enrollment changed',
    conflictBody:
      'Your enrollment changed. Checkout cannot confirm a payment result or learning access.',
    mockCheckout: 'Mock checkout',
  },
  ru: {
    acceptedTitle: 'Оформление принято',
    acceptedBody:
      'Тестовое оформление принято. Платёж ожидает обработки; доступ к обучению пока недоступен.',
    conflictTitle: 'Запись на курс изменилась',
    conflictBody:
      'Ваша запись изменилась. Оформление не может подтвердить результат платежа или доступ к обучению.',
    mockCheckout: 'Тестовое оформление',
  },
  uz: {
    acceptedTitle: 'Buyurtma qabul qilindi',
    acceptedBody:
      'Sinov buyurtmasi qabul qilindi. To‘lov kutilmoqda; ta’limga kirish hozircha mavjud emas.',
    conflictTitle: 'Kursga yozilish holati o‘zgardi',
    conflictBody:
      'Yozilishingiz o‘zgardi. Checkout to‘lov natijasini yoki ta’limga kirishni tasdiqlay olmaydi.',
    mockCheckout: 'Sinov buyurtmasi',
  },
};

const obsoletePaymentControlLabels = [
  'Complete mock payment',
  'Simulate mock payment failure',
  'Завершить тестовую оплату',
  'Сымитировать сбой тестовой оплаты',
  'Sinov to‘lovini yakunlash',
  'Sinov to‘lovi xatosini taqlid qilish',
] as const;

function cart(
  items = [
    {
      id: 10,
      course_id: 7,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 7, title: course.title, price: '19.99', currency: 'USD' },
    },
  ],
) {
  return {
    id: 1,
    items,
    total_price: items.length === 0 ? '0.00' : '19.99',
    currency: 'USD',
    item_count: items.length,
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installStudent(page: Page) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
}

async function routeCheckoutApi(
  page: Page,
  handler: (route: Route, path: string, method: string) => Promise<void>,
) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.resourceType() === 'document' || url.origin !== cartWorkflowOrigin)
      return route.fallback();
    if (
      url.pathname === '/me' ||
      url.pathname === '/cart' ||
      url.pathname === '/cart/checkout' ||
      url.pathname === '/enrollments/my'
    ) {
      await handler(route, url.pathname, route.request().method());
      return;
    }
    await route.fallback();
  });
}

function assertNoOverflow(page: Page) {
  return page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
}

test('sends one checkout POST, labels accepted payment as pending, and preserves responsive keyboard access', async ({
  page,
}) => {
  await installStudent(page);
  let currentCart = cart();
  let checkoutPosts = 0;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/cart' && method === 'GET') return json(route, currentCart);
    if (path === '/cart/checkout') {
      checkoutPosts += 1;
      currentCart = cart([]);
      return json(route, { message: 'Checkout successful.', enrolled_courses: 1 });
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/cart');
  const checkout = page.getByRole('button', { name: 'Mock checkout', exact: true });
  await checkout.dblclick();
  await expect.poll(() => checkoutPosts).toBe(1);
  await expect(
    page.getByText(
      'Mock checkout was accepted. Payment is pending; learning access is not available yet.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Check My Learning' })).toHaveCount(0);
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await assertNoOverflow(page);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.client);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.client);
  }
  await page.evaluate(() => {
    document.documentElement.style.zoom = '200%';
  });
  const zoomed = await assertNoOverflow(page);
  expect(zoomed.documentWidth).toBeLessThanOrEqual(zoomed.client);
  expect(zoomed.bodyWidth).toBeLessThanOrEqual(zoomed.client);
  expect(consoleErrors).toEqual([]);
});

test('keeps a 5xx checkout locked after unchanged-cart reconciliation with actionless guidance', async ({
  page,
}) => {
  await installStudent(page);
  let checkoutPosts = 0;
  await routeCheckoutApi(page, async (route, path, method) => {
    if (path === '/me') return json(route, student);
    if (path === '/cart' && method === 'GET') return json(route, cart());
    if (path === '/cart/checkout') {
      checkoutPosts += 1;
      return json(route, { detail: 'private' }, 503);
    }
    if (path === '/enrollments/my')
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  await page.goto('/cart');
  const checkout = page.getByRole('button', { name: 'Mock checkout', exact: true });
  await checkout.click();
  await expect(
    page.getByText('We could not confirm checkout. Check the cart status for updated guidance.'),
  ).toBeVisible();
  await expect(checkout).toBeDisabled();
  await page.getByRole('button', { name: 'Check checkout status' }).press('Enter');
  await expect(
    page.getByText(
      'Your cart still cannot prove whether checkout partially completed. Do not start another checkout action.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Check My Learning' })).toHaveCount(0);
  await expect(checkout).toBeDisabled();
  await checkout.press('Enter');
  await checkout.click({ force: true });
  expect(checkoutPosts).toBe(1);
});

for (const scenario of [
  { name: 'unauthorized', status: 401, title: 'Sign in required' },
  { name: 'conflict', status: 409, title: 'Enrollment changed' },
  { name: 'unavailable', status: 503, title: 'Checkout status needs checking' },
  { name: 'malformed', status: 200, title: 'Checkout status needs checking' },
] as const)
  test(`renders ${scenario.name} checkout feedback without retrying the POST`, async ({ page }) => {
    await installStudent(page);
    let posts = 0;
    await routeCheckoutApi(page, async (route, path, method) => {
      if (path === '/me') return json(route, student);
      if (path === '/cart' && method === 'GET') return json(route, cart());
      if (path === '/cart/checkout') {
        posts += 1;
        if (scenario.name === 'malformed')
          return json(route, { message: 7, enrolled_courses: 'bad' });
        return json(route, { detail: 'private' }, scenario.status);
      }
      if (path === '/enrollments/my')
        return json(route, {
          items: [],
          page: 1,
          page_size: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${method} ${path}`);
    });
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Mock checkout', exact: true }).click();
    if (scenario.name === 'unauthorized') {
      await expect(
        page.getByRole('heading', { level: 1, name: 'Log in', exact: true }),
      ).toBeVisible();
      const loginUrl = new URL(page.url());
      expect(loginUrl.pathname).toBe('/login');
      expect(loginUrl.searchParams.get('returnTo')).toBe('/cart');
      expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(null);
    } else {
      const alert = page.getByRole('alert');
      await expect(alert.getByText(scenario.title, { exact: true })).toBeVisible();
      if (scenario.name === 'conflict') {
        await expect(
          alert.getByText(
            'Your enrollment changed. Checkout cannot confirm a payment result or learning access.',
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          alert.getByRole('link', { name: 'Check My Learning', exact: true }),
        ).toHaveCount(0);
      }
    }
    await expect(page.locator('body')).not.toContainText('private');
    expect(posts).toBe(1);
  });

for (const locale of ['en', 'ru', 'uz'] as const)
  for (const result of ['accepted', 'conflict'] as const) {
    test(`renders canonical ${result === 'accepted' ? 'C0109' : 'C0119'} Cart notice in ${locale} without terminal inference`, async ({
      page,
    }) => {
      const copy = checkoutTerminalCopy[locale];
      let currentCart = cart();
      let checkoutPosts = 0;
      await installStudent(page);
      await routeCheckoutApi(page, async (route, path, method) => {
        if (path === '/me') return json(route, student);
        if (path === '/cart' && method === 'GET') return json(route, currentCart);
        if (path === '/cart/checkout') {
          checkoutPosts += 1;
          if (result === 'accepted') {
            currentCart = cart([]);
            return json(route, { message: 'Checkout successful.', enrolled_courses: 1 });
          }
          return json(route, { detail: 'private' }, 409);
        }
        throw new Error(`Unexpected localized terminal request ${method} ${path}`);
      });

      await page.goto('/cart');
      if (locale !== 'en') {
        await page.getByRole('button', { name: 'Change language' }).press('Enter');
        await page
          .getByRole('button', { name: locale === 'ru' ? 'Русский' : "O'zbek", exact: true })
          .press('Enter');
      }
      await page.getByRole('button', { name: copy.mockCheckout, exact: true }).press('Enter');
      const notice = page.getByText(result === 'accepted' ? copy.acceptedBody : copy.conflictBody, {
        exact: true,
      });
      await expect(notice).toBeVisible();
      const feedbackNotice = notice.locator(
        'xpath=ancestor::*[@role="status" or @role="alert"][1]',
      );
      await expect(feedbackNotice).toContainText(
        result === 'accepted' ? copy.acceptedTitle : copy.conflictTitle,
      );
      await expect(feedbackNotice.getByRole('link')).toHaveCount(0);
      for (const label of obsoletePaymentControlLabels)
        await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
      expect(checkoutPosts).toBe(1);
      await page.waitForTimeout(150);
      expect(checkoutPosts).toBe(1);
    });
  }

for (const locale of ['en', 'ru', 'uz'] as const) {
  test(`localizes checkout reconciliation and preserves one-write recovery in ${locale}`, async ({
    page,
  }) => {
    test.slow();
    const copy = checkoutResidualCopy[locale];
    const diagnostics: string[] = [];
    let checkoutPosts = 0;
    page.on('pageerror', (error) => diagnostics.push(error.stack ?? error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    await installStudent(page);
    await routeCheckoutApi(page, async (route, path, method) => {
      if (path === '/me') return json(route, student);
      if (path === '/cart' && method === 'GET') return json(route, cart());
      if (path === '/cart/checkout') {
        checkoutPosts += 1;
        return json(route, { detail: 'private' }, 503);
      }
      if (path === '/enrollments/my')
        return json(route, {
          items: [],
          page: 1,
          page_size: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected localized reconciliation request ${method} ${path}`);
    });

    await page.goto('/cart');
    if (locale !== 'en') {
      await page.getByRole('button', { name: 'Change language' }).press('Enter');
      await page
        .getByRole('button', { name: locale === 'ru' ? 'Русский' : "O'zbek", exact: true })
        .press('Enter');
    }
    await page.getByRole('button', { name: copy.mockCheckout, exact: true }).press('Enter');
    const recovery = page.getByRole('button', { name: copy.checkStatus, exact: true });
    await expect(recovery).toBeVisible();
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await recovery.press('Enter');
    await expect(page.getByText(copy.uncertain, { exact: true })).toBeVisible();
    expect(checkoutPosts).toBe(1);

    for (const width of [320, 390, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await assertNoOverflow(page);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.client);
      expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.client);
    }
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const zoomed = await assertNoOverflow(page);
    expect(zoomed.documentWidth).toBeLessThanOrEqual(zoomed.client);
    expect(zoomed.bodyWidth).toBeLessThanOrEqual(zoomed.client);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
    await expect(page.locator('body')).not.toContainText(/Translation unavailable|cart:\w+/);
    expect(diagnostics).toEqual([
      'Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
    ]);
  });
}
