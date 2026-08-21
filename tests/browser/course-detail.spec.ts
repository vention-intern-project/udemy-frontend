import { expect, test, type Page, type Response, type Route } from '@playwright/test';

const detail = {
  id: 7,
  title:
    'A complete and deliberately long React foundations course title that must wrap without clipping',
  description:
    'Build reliable interfaces with a long course description that remains readable at every supported width and effective zoom.',
  price: '19.9900',
  currency: 'USD',
  published_at: '2026-07-01T00:00:00Z',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  instructor: { id: 2, name: 'Ada', surname: 'Lovelace' },
  lessons: [],
};

const studentProfile = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const emptyCart = { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 };
const emptyEnrollments = {
  items: [],
  page: 1,
  page_size: 100,
  total: 0,
  pages: 0,
  has_next: false,
  has_previous: false,
};
const enrollmentMutation = {
  id: 4,
  user_id: 9,
  course_id: 7,
  status: 'active',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  course: {
    id: 7,
    title: detail.title,
    description: detail.description,
    price: '0.00',
    currency: detail.currency,
  },
};
const cartItemMutation = {
  id: 5,
  course_id: 7,
  added_at: '2026-07-01T00:00:00Z',
  course: { id: 7, title: detail.title, price: '19.99', currency: detail.currency },
};

function outline(downloadUrl: string | null, items = 1) {
  return {
    items:
      items === 0
        ? []
        : [
            {
              id: 3,
              title: 'Welcome',
              lesson_type: 'video',
              download_url: downloadUrl,
              description: 'Course orientation.',
              is_published: true,
              created_at: '2026-07-01T00:00:00Z',
              updated_at: '2026-07-01T00:00:00Z',
            },
          ],
    page: 1,
    page_size: 100,
    total: items,
    pages: items,
    has_next: false,
    has_previous: false,
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function isDocumentNavigation(route: Route) {
  return route.request().resourceType() === 'document';
}

function isRootApiPath(url: URL) {
  return /^\/(?:me|courses(?:\/|$)|cart(?:\/|$)|enrollments(?:\/|$))/.test(url.pathname);
}

type HttpMethod = 'GET' | 'POST';

interface ExpectedHttpFailure {
  readonly method: HttpMethod;
  readonly pathname: string;
  readonly status: number;
}

interface ObservedHttpFailure extends ExpectedHttpFailure {
  observed: boolean;
  observedResponseUrl: string | null;
  consoleObserved: boolean;
}

interface ResourceStatusConsoleEntry {
  readonly status: number;
  readonly url: string;
}

interface DiagnosticAssertions {
  expectHttpFailure(failure: ExpectedHttpFailure): void;
  assertClean(): void;
}

interface CourseResidualBrowserCopy {
  readonly loadingDetails: string;
  readonly loadingOutline: string;
  readonly outlineHeading: string;
  readonly emptyOutline: string;
  readonly lessonMarker: string;
  readonly draftCourse: string;
  readonly notFoundDescription: string;
}

const courseResidualBrowserCopy: Readonly<Record<'en' | 'ru' | 'uz', CourseResidualBrowserCopy>> = {
  en: {
    loadingDetails: 'Loading course details',
    loadingOutline: 'Loading course outline',
    outlineHeading: 'Course outline',
    emptyOutline: 'No lessons have been added yet.',
    lessonMarker: 'lesson ·',
    draftCourse: 'Draft course',
    notFoundDescription: 'This course does not exist or is no longer available.',
  },
  ru: {
    loadingDetails: 'Загрузка сведений о курсе',
    loadingOutline: 'Загрузка программы курса',
    outlineHeading: 'Программа курса',
    emptyOutline: 'Уроки ещё не добавлены.',
    lessonMarker: 'урок ·',
    draftCourse: 'Черновик курса',
    notFoundDescription: 'Курс не существует или больше недоступен.',
  },
  uz: {
    loadingDetails: 'Kurs tafsilotlari yuklanmoqda',
    loadingOutline: 'Kurs dasturi yuklanmoqda',
    outlineHeading: 'Kurs dasturi',
    emptyOutline: 'Hali darslar qo‘shilmagan.',
    lessonMarker: 'dars ·',
    draftCourse: 'Kurs qoralamasi',
    notFoundDescription: 'Bu kurs mavjud emas yoki endi ochiq emas.',
  },
};

function parseResourceStatusConsoleEntry(
  text: string,
  locationUrl: string,
): ResourceStatusConsoleEntry | undefined {
  const statusMatch = /Failed to load resource: the server responded with a status of (\d+)/.exec(
    text,
  );
  if (!statusMatch || locationUrl.length === 0) return undefined;
  return { status: Number(statusMatch[1]), url: locationUrl };
}

function findExpectedFailureForConsole(
  expectedFailures: readonly ObservedHttpFailure[],
  entry: ResourceStatusConsoleEntry,
): ObservedHttpFailure | undefined {
  return expectedFailures.find(
    (failure) =>
      !failure.consoleObserved &&
      failure.observed &&
      failure.status === entry.status &&
      failure.observedResponseUrl === entry.url,
  );
}

async function installDiagnostics(page: Page) {
  const errors: string[] = [];
  const mediaRequests: string[] = [];
  const unexpectedApiRequests: string[] = [];
  const expectedFailures: ObservedHttpFailure[] = [];
  await page.route(isRootApiPath, async (route) => {
    if (isDocumentNavigation(route)) {
      await route.fallback();
      return;
    }
    unexpectedApiRequests.push(
      `${route.request().method()} ${new URL(route.request().url()).pathname}`,
    );
    await route.abort();
  });
  page.on('response', (response) => {
    const request = response.request();
    const pathname = new URL(response.url()).pathname;
    const expected = expectedFailures.find(
      (failure) =>
        !failure.observed &&
        failure.method === request.method() &&
        failure.pathname === pathname &&
        failure.status === response.status(),
    );
    if (expected) {
      expected.observed = true;
      expected.observedResponseUrl = response.url();
    }
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const entry = parseResourceStatusConsoleEntry(message.text(), message.location().url);
    const expected = entry ? findExpectedFailureForConsole(expectedFailures, entry) : undefined;
    if (expected) {
      expected.consoleObserved = true;
      return;
    }
    errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/media/lessons/'))
      mediaRequests.push(request.url());
  });
  const diagnostics: DiagnosticAssertions = {
    expectHttpFailure: (failure) => {
      expectedFailures.push({
        ...failure,
        observed: false,
        observedResponseUrl: null,
        consoleObserved: false,
      });
    },
    assertClean: () => {
      expect(
        expectedFailures.filter((failure) => !failure.observed),
        'expected HTTP failures were not observed',
      ).toEqual([]);
      expect(
        expectedFailures.filter((failure) => !failure.consoleObserved),
        'expected resource-status console errors were not observed',
      ).toEqual([]);
      expect(errors, 'unexpected console/page errors').toEqual([]);
      expect(mediaRequests, 'lesson-file requests are forbidden on course detail').toEqual([]);
      expect(unexpectedApiRequests, 'unexpected API requests').toEqual([]);
    },
  };
  return diagnostics;
}

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    layoutWidth: document.documentElement.clientWidth,
    scale: window.visualViewport?.scale ?? 1,
    visualWidth: window.visualViewport?.width ?? window.innerWidth,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth + 0.5);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth + 0.5);
  return geometry;
}

test('binds a resource-status console allowance to the exact observed response URL', () => {
  const expectedResponseUrl = 'http://127.0.0.1:4176/courses/7';
  const observedFailure: ObservedHttpFailure = {
    method: 'GET',
    pathname: '/courses/7',
    status: 500,
    observed: true,
    observedResponseUrl: expectedResponseUrl,
    consoleObserved: false,
  };

  expect(
    findExpectedFailureForConsole([observedFailure], {
      status: 500,
      url: 'http://127.0.0.1:4176/unrelated-resource.js',
    }),
  ).toBeUndefined();
  expect(observedFailure.consoleObserved).toBe(false);
  expect(
    findExpectedFailureForConsole([observedFailure], {
      status: 500,
      url: expectedResponseUrl,
    }),
  ).toBe(observedFailure);
});

async function installStudentToken(page: Page, token = 'student-token') {
  await page.addInitScript((value) => localStorage.setItem('learnhub.access-token', value), token);
}

async function routeStudentReads(page: Page, price = '0.00') {
  await page.route('**/me', (route) => json(route, studentProfile));
  await page.route('**/courses/7**', (route) => {
    if (isDocumentNavigation(route)) return route.fallback();
    const path = new URL(route.request().url()).pathname;
    return json(route, path.endsWith('/lessons') ? outline(null) : { ...detail, price });
  });
  await page.route('**/cart', (route) => json(route, emptyCart));
  await page.route('**/enrollments/my**', (route) => json(route, emptyEnrollments));
}

test('renders populated/redacted/null API-014 fixtures as metadata only with no media request', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  let link: string | null = '/media/lessons/private.mp4';
  await page.route('**/courses/7**', async (route) => {
    if (isDocumentNavigation(route)) {
      await route.fallback();
      return;
    }
    const path = new URL(route.request().url()).pathname;
    await json(route, path.endsWith('/lessons') ? outline(link) : detail);
  });

  for (const fixture of [
    { name: 'populated-link', value: '/media/lessons/private.mp4' },
    { name: 'anonymous-redacted', value: null },
    { name: 'explicit-null', value: null },
  ]) {
    link = fixture.value;
    await page.goto(`/courses/7?fixture=${fixture.name}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('React foundations');
    await expect(page.getByRole('heading', { level: 3, name: 'Welcome' })).toBeVisible();
    await expect(page.locator('audio, video, source, [download]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /play|download/i })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('/media/lessons/');
  }
  diagnostics.assertClean();
});

test('clears a genuine invalid bearer after 401 and performs public metadata reads without authorization', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page, 'invalid-bearer');
  let bootstrap401 = 0;
  const publicCoursePaths: string[] = [];
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/me', status: 401 });
  await page.route('**/me', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer invalid-bearer');
    bootstrap401 += 1;
    await json(route, { detail: 'Could not validate credentials' }, 401);
  });
  await page.route('**/courses/7**', async (route) => {
    if (isDocumentNavigation(route)) {
      await route.fallback();
      return;
    }
    expect(route.request().headers().authorization).toBeUndefined();
    const path = new URL(route.request().url()).pathname;
    publicCoursePaths.push(path);
    await json(route, path.endsWith('/lessons') ? outline(null) : detail);
  });

  await page.goto('/courses/7?fixture=invalid-bearer-redacted');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  expect(bootstrap401).toBe(1);
  expect([...new Set(publicCoursePaths)]).toEqual(['/courses/7', '/courses/7/lessons']);
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBeNull();
  diagnostics.assertClean();
});

test('recovers detail and outline independently with keyboard focus and polite status', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  let detailAvailable = false;
  let outlineAvailable = false;
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/courses/7', status: 500 });
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/courses/7', status: 500 });
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/courses/7/lessons', status: 500 });
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/courses/7/lessons', status: 500 });
  await page.route('**/courses/7**', async (route) => {
    if (isDocumentNavigation(route)) {
      await route.fallback();
      return;
    }
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/lessons')) {
      await json(
        route,
        outlineAvailable ? outline(null, 0) : { detail: 'temporary outline failure' },
        outlineAvailable ? 200 : 500,
      );
    } else {
      await json(
        route,
        detailAvailable ? detail : { detail: 'temporary detail failure' },
        detailAvailable ? 200 : 500,
      );
    }
  });

  await page.goto('/courses/7');
  const detailRetry = page.getByRole('button', { name: 'Try again' });
  await detailRetry.focus();
  await expect(detailRetry).toBeFocused();
  detailAvailable = true;
  await detailRetry.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(
    page.getByRole('status').filter({ hasText: 'Course details recovered.' }),
  ).toHaveText('Course details recovered.');

  const outlineSection = page.locator('section[aria-labelledby="course-outline-heading"]');
  const outlineRecovery = outlineSection.getByRole('alert');
  const outlineRecoveryMessage = outlineRecovery
    .locator('p')
    .filter({ hasText: 'Please try again.' });
  const outlineRetry = outlineRecovery.getByRole('button', { name: 'Try again' });
  await expect(outlineRecoveryMessage).toHaveText('Please try again.');
  await expect(outlineRetry).toBeVisible();
  const recoverySnapshot = await outlineRecovery.ariaSnapshot();
  expect(recoverySnapshot).toMatch(/- paragraph: Please try again\.\s+- button "Try again"/);

  for (const width of [320, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(outlineRecoveryMessage).toBeVisible();
    await expect(outlineRetry).toBeVisible();
    const geometry = await outlineRecovery.evaluate((notice) => {
      const message = notice.querySelector('p');
      const action = notice.querySelector('button');
      const actionRow = message?.nextElementSibling;
      if (
        !message ||
        !action ||
        !(actionRow instanceof HTMLElement) ||
        !actionRow.contains(action)
      ) {
        throw new Error('Outline recovery structure is incomplete');
      }
      const noticeBox = notice.getBoundingClientRect();
      const messageBox = message.getBoundingClientRect();
      const actionBox = action.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        actionFlexWrap: getComputedStyle(actionRow).flexWrap,
        noticeBox: { left: noticeBox.left, right: noticeBox.right },
        messageBox: { left: messageBox.left, right: messageBox.right, bottom: messageBox.bottom },
        actionBox: { left: actionBox.left, right: actionBox.right, top: actionBox.top },
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.actionFlexWrap).toBe('wrap');
    expect(geometry.noticeBox.left).toBeGreaterThanOrEqual(0);
    expect(geometry.noticeBox.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.messageBox.left).toBeGreaterThanOrEqual(geometry.noticeBox.left);
    expect(geometry.messageBox.right).toBeLessThanOrEqual(geometry.noticeBox.right);
    expect(geometry.actionBox.left).toBeGreaterThanOrEqual(geometry.noticeBox.left);
    expect(geometry.actionBox.right).toBeLessThanOrEqual(geometry.noticeBox.right);
    expect(geometry.messageBox.bottom).toBeLessThan(geometry.actionBox.top);
  }

  await outlineRetry.focus();
  outlineAvailable = true;
  await outlineRetry.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Course outline' })).toBeFocused();
  await expect(
    page.getByRole('status').filter({ hasText: 'Course outline recovered.' }),
  ).toHaveText('Course outline recovered.');
  diagnostics.assertClean();
});

test('renders Draft as unavailable and sends no student mutation or preflight request', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page);
  await page.route('**/me', (route) => json(route, studentProfile));
  await page.route(
    (url) => url.pathname === '/cart' && url.search === '',
    async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toBe('Bearer student-token');
      await json(route, emptyCart);
    },
  );
  await page.route('**/courses/7**', (route) => {
    if (isDocumentNavigation(route)) return route.fallback();
    const path = new URL(route.request().url()).pathname;
    return json(
      route,
      path.endsWith('/lessons') ? outline(null) : { ...detail, published_at: null },
    );
  });
  await page.goto('/courses/7');
  await expect(page.getByRole('button', { name: 'Course is not published' })).toBeDisabled();
  await expect(page.getByText('Course is not published')).toHaveCount(2);
  diagnostics.assertClean();
});

test('retries a failed student preflight and refetches its exact cart/enrollment owners', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page);
  let cartRequests = 0;
  let enrollmentRequests = 0;
  let preflightAvailable = false;
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/cart', status: 500 });
  diagnostics.expectHttpFailure({ method: 'GET', pathname: '/cart', status: 500 });
  await page.route('**/me', (route) => json(route, studentProfile));
  await page.route('**/courses/7**', (route) => {
    if (isDocumentNavigation(route)) return route.fallback();
    const path = new URL(route.request().url()).pathname;
    return json(route, path.endsWith('/lessons') ? outline(null) : { ...detail, price: '0.00' });
  });
  await page.route('**/cart', async (route) => {
    cartRequests += 1;
    await json(
      route,
      preflightAvailable ? emptyCart : { detail: 'temporary preflight failure' },
      preflightAvailable ? 200 : 500,
    );
  });
  await page.route('**/enrollments/my**', async (route) => {
    enrollmentRequests += 1;
    await json(route, emptyEnrollments);
  });

  await page.goto('/courses/7');
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  const requestsBeforeRetry = { cart: cartRequests, enrollments: enrollmentRequests };
  preflightAvailable = true;
  await retry.click();
  await expect(page.getByRole('button', { name: 'Enroll free' })).toBeEnabled();
  expect(cartRequests).toBe(requestsBeforeRetry.cart + 1);
  expect(enrollmentRequests).toBe(requestsBeforeRetry.enrollments + 1);
  diagnostics.assertClean();
});

test('deduplicates pending free enrollment and reports enrollment-specific success', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page);
  await routeStudentReads(page);
  let mutations = 0;
  await page.route('**/enrollments', async (route) => {
    mutations += 1;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ course_id: 7 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await json(route, enrollmentMutation, 201);
  });

  await page.goto('/courses/7');
  await page.getByRole('button', { name: 'Enroll free' }).dblclick();
  await expect(page.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  await expect(page.getByText('You are now enrolled in this course.')).toBeVisible();
  expect(mutations).toBe(1);
  diagnostics.assertClean();
});

test('sends the paid cart request once and reports cart-specific success', async ({ page }) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page);
  await routeStudentReads(page, '19.99');
  let mutations = 0;
  await page.route('**/cart/items', async (route) => {
    mutations += 1;
    expect(route.request().postDataJSON()).toEqual({ course_id: 7 });
    await json(route, cartItemMutation, 201);
  });

  await page.goto('/courses/7');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('This course was added to your cart.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/access has been updated|now enrolled/i);
  expect(mutations).toBe(1);
  diagnostics.assertClean();
});

for (const scenario of [
  {
    name: 'enrollment null',
    price: '0.00',
    action: 'Enroll free',
    path: '**/enrollments',
    payload: null,
  },
  {
    name: 'cart partial object',
    price: '19.99',
    action: 'Add to cart',
    path: '**/cart/items',
    payload: { id: 5 },
  },
]) {
  test(`fails closed for malformed ${scenario.name} mutation success`, async ({ page }) => {
    const diagnostics = await installDiagnostics(page);
    await installStudentToken(page);
    await routeStudentReads(page, scenario.price);
    let mutations = 0;
    await page.route(scenario.path, async (route) => {
      mutations += 1;
      await json(route, scenario.payload, 201);
    });

    await page.goto('/courses/7');
    await page.getByRole('button', { name: scenario.action }).click();
    await expect(page.getByText('This action is currently unavailable.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Action unavailable' })).toBeDisabled();
    await expect(page.locator('body')).not.toContainText(/now enrolled|added to your cart/i);
    expect(mutations).toBe(1);
    diagnostics.assertClean();
  });
}

test('fails enrollment preflight closed for a mismatched response cursor without mutation', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page);
  let mutations = 0;
  await page.route('**/me', (route) => json(route, studentProfile));
  await page.route('**/courses/7**', (route) => {
    if (isDocumentNavigation(route)) return route.fallback();
    const path = new URL(route.request().url()).pathname;
    return json(route, path.endsWith('/lessons') ? outline(null) : { ...detail, price: '0.00' });
  });
  await page.route('**/cart', (route) => json(route, emptyCart));
  await page.route('**/enrollments/my**', (route) =>
    json(route, { ...emptyEnrollments, page: 2, has_previous: true }),
  );
  await page.route(/\/(?:cart\/items|enrollments)$/, async (route) => {
    mutations += 1;
    await route.abort();
  });

  await page.goto('/courses/7');
  await expect(page.getByRole('button', { name: 'Action unavailable' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(mutations).toBe(0);
  diagnostics.assertClean();
});

test('keeps non-refresh terminal failures disabled while refreshed conflict truth can restore eligibility', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  const cases = [
    { status: 403, detail: 'private forbidden detail', expected: 'Action unavailable' },
    { status: 409, detail: 'Already enrolled in this course', expected: 'Enroll free' },
    {
      status: 422,
      detail: [{ loc: ['body'], msg: 'private issue', type: 'value_error' }],
      expected: 'Action unavailable',
    },
    { status: 404, detail: 'Course not found', expected: 'Action unavailable' },
  ];
  for (const [index, scenario] of cases.entries()) {
    await page.context().clearCookies();
    await installStudentToken(page);
    await routeStudentReads(page);
    let mutations = 0;
    const completedDetailResponses: Response[] = [];
    const collectCompletedDetailResponse = (response: Response) => {
      if (
        response.request().method() === 'GET' &&
        response.request().resourceType() !== 'document' &&
        new URL(response.url()).pathname === '/courses/7' &&
        response.status() === 200
      ) {
        completedDetailResponses.push(response);
      }
    };
    page.on('response', collectCompletedDetailResponse);
    await page.unroute('**/courses/7**');
    await page.route('**/courses/7**', async (route) => {
      if (isDocumentNavigation(route)) {
        await route.fallback();
        return;
      }
      const path = new URL(route.request().url()).pathname;
      await json(route, path.endsWith('/lessons') ? outline(null) : { ...detail, price: '0.00' });
    });
    await page.route('**/enrollments', async (route) => {
      mutations += 1;
      await json(route, { detail: scenario.detail }, scenario.status);
    });

    try {
      await page.goto(`/courses/7?terminal=${index}`);
      const enrollAction = page.getByRole('button', { name: 'Enroll free' });
      await expect(enrollAction).toBeEnabled();
      const detailResponsesBeforeMutation = completedDetailResponses.length;
      diagnostics.expectHttpFailure({
        method: 'POST',
        pathname: '/enrollments',
        status: scenario.status,
      });
      await enrollAction.click();
      const resultingAction = page.getByRole('button', { name: scenario.expected });
      if (scenario.status !== 409) await expect(resultingAction).toBeDisabled();
      else await expect(resultingAction).toBeEnabled();
      await expect(page.locator('body')).not.toContainText(
        /private forbidden detail|private issue/,
      );
      expect(mutations).toBe(1);
      expect(completedDetailResponses.length - detailResponsesBeforeMutation).toBe(
        scenario.status === 404 ? 1 : 0,
      );
      diagnostics.assertClean();
    } finally {
      page.off('response', collectCompletedDetailResponse);
    }
  }
});

for (const scenario of [
  {
    name: 'mutation 401',
    status: 401,
    detail: 'Could not validate credentials',
    expected: 'Sign in',
    role: 'link',
    price: '0.00',
    mutationPath: '**/enrollments',
  },
  {
    name: 'publication mutation failure',
    status: 400,
    detail: 'Course is not published',
    expected: 'Action unavailable',
    role: 'button',
    price: '0.00',
    mutationPath: '**/enrollments',
  },
  {
    name: 'cart conflict',
    status: 409,
    detail: 'Course already in cart',
    expected: 'Add to cart',
    role: 'button',
    price: '19.99',
    mutationPath: '**/cart/items',
  },
  {
    name: 'unexpected conflict',
    status: 409,
    detail: 'Unexpected conflict',
    expected: 'Enroll free',
    role: 'button',
    price: '0.00',
    mutationPath: '**/enrollments',
  },
]) {
  test(`uses authoritative refresh truth for ${scenario.name} with terminal diagnostics`, async ({
    page,
  }) => {
    const diagnostics = await installDiagnostics(page);
    await installStudentToken(page);
    await routeStudentReads(page, scenario.price);
    let mutations = 0;
    await page.route(scenario.mutationPath, async (route) => {
      mutations += 1;
      await json(route, { detail: scenario.detail }, scenario.status);
    });

    await page.goto('/courses/7');
    diagnostics.expectHttpFailure({
      method: 'POST',
      pathname: scenario.price === '0.00' ? '/enrollments' : '/cart/items',
      status: scenario.status,
    });
    await page
      .getByRole('button', { name: scenario.price === '0.00' ? 'Enroll free' : 'Add to cart' })
      .click();
    const action =
      scenario.role === 'link'
        ? page.getByRole('link', { name: scenario.expected })
        : page.getByRole('button', { name: scenario.expected });
    await expect(action).toBeVisible();
    if (scenario.role === 'button' && scenario.status !== 409) await expect(action).toBeDisabled();
    if (scenario.role === 'button' && scenario.status === 409) await expect(action).toBeEnabled();
    expect(mutations).toBe(1);
    await expect(page.locator('body')).not.toContainText(
      /Could not validate credentials|Unexpected conflict/,
    );
    diagnostics.assertClean();
  });
}

for (const scenario of [
  {
    name: 'instructor account',
    profile: { ...studentProfile, role: 'instructor' },
    cart: emptyCart,
    enrollments: emptyEnrollments,
    expected: 'Not available for this account',
    price: '0.00',
  },
  {
    name: 'already-enrolled preflight',
    profile: studentProfile,
    cart: emptyCart,
    enrollments: {
      ...emptyEnrollments,
      items: [
        {
          id: 12,
          user_id: 9,
          course_id: 7,
          status: 'active',
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
          course: {
            id: 7,
            title: detail.title,
            description: detail.description,
            price: detail.price,
            currency: detail.currency,
          },
        },
      ],
      total: 1,
      pages: 1,
    },
    expected: 'Already enrolled',
    price: '0.00',
  },
  {
    name: 'already-in-cart preflight',
    profile: studentProfile,
    cart: {
      ...emptyCart,
      items: [
        {
          id: 5,
          course_id: 7,
          added_at: '2026-07-01T00:00:00Z',
          course: { id: 7, title: detail.title, price: detail.price, currency: detail.currency },
        },
      ],
      item_count: 1,
    },
    enrollments: emptyEnrollments,
    expected: 'Already in cart',
    price: '19.99',
  },
]) {
  test(`blocks ${scenario.name} before any mutation with diagnostics`, async ({ page }) => {
    const diagnostics = await installDiagnostics(page);
    await installStudentToken(page);
    let mutations = 0;
    await page.route('**/me', (route) => json(route, scenario.profile));
    await page.route('**/courses/7**', (route) => {
      if (isDocumentNavigation(route)) return route.fallback();
      const path = new URL(route.request().url()).pathname;
      return json(
        route,
        path.endsWith('/lessons') ? outline(null) : { ...detail, price: scenario.price },
      );
    });
    await page.route('**/cart', (route) => json(route, scenario.cart));
    await page.route('**/enrollments/my**', (route) => json(route, scenario.enrollments));
    await page.route(/\/(?:cart\/items|enrollments)$/, async (route) => {
      mutations += 1;
      await route.abort();
    });

    await page.goto('/courses/7');
    await expect(page.getByRole('button', { name: scenario.expected })).toBeDisabled();
    expect(mutations).toBe(0);
    diagnostics.assertClean();
  });
}

test('keeps only offline/server mutation failure retryable', async ({ page }) => {
  const diagnostics = await installDiagnostics(page);
  await installStudentToken(page);
  await routeStudentReads(page);
  let mutations = 0;
  await page.route('**/enrollments', async (route) => {
    mutations += 1;
    await json(
      route,
      mutations === 1 ? { detail: 'temporary server failure' } : enrollmentMutation,
      mutations === 1 ? 500 : 201,
    );
  });

  await page.goto('/courses/7');
  diagnostics.expectHttpFailure({ method: 'POST', pathname: '/enrollments', status: 500 });
  await page.getByRole('button', { name: 'Enroll free' }).click();
  await expect(
    page.getByText('The action failed. Check your connection and try again.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enroll free' })).toBeEnabled();
  await page.getByRole('button', { name: 'Enroll free' }).click();
  await expect(page.getByText('You are now enrolled in this course.')).toBeVisible();
  expect(mutations).toBe(2);
  diagnostics.assertClean();
});

test('renders the free guest unavailable action in the neutral disabled CTA family', async ({
  page,
}) => {
  const diagnostics = await installDiagnostics(page);
  await page.route('**/courses/7**', async (route) => {
    if (isDocumentNavigation(route)) {
      await route.fallback();
      return;
    }
    const path = new URL(route.request().url()).pathname;
    await json(route, path.endsWith('/lessons') ? outline(null) : { ...detail, price: '0.00' });
  });

  await page.goto('/courses/7?guest=free');

  await expect(page.getByText('Sign in to enroll for free.')).toBeVisible();
  const signIn = page.getByRole('link', { name: 'Sign in' });
  await expect(signIn).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F7');
  await expect(signIn.locator('xpath=ancestor::p')).toHaveText('Sign in to enroll for free.');
  await expect(signIn).toHaveCSS('color', 'rgb(91, 63, 214)');
  await signIn.hover();
  await expect(signIn).toHaveCSS('color', 'rgb(73, 50, 182)');
  const guestUnavailableAction = page.getByRole('button', { name: 'Enroll for free' });
  await expect(guestUnavailableAction).toBeDisabled();
  await expect(guestUnavailableAction.locator('svg')).toHaveCount(0);
  await expect(guestUnavailableAction).toHaveCSS('background-color', 'rgb(229, 231, 235)');
  await expect(guestUnavailableAction).toHaveCSS('color', 'rgb(156, 163, 175)');
  diagnostics.assertClean();
});

test('preserves keyboard access and reflow without horizontal overflow', async ({
  page,
}, testInfo) => {
  const diagnostics = await installDiagnostics(page);
  await page.route('**/courses/7**', async (route) => {
    if (isDocumentNavigation(route)) {
      await route.fallback();
      return;
    }
    const path = new URL(route.request().url()).pathname;
    await json(route, path.endsWith('/lessons') ? outline(null) : detail);
  });
  await page.goto('/courses/7');

  await expect(page.getByText('Sign in to add this course to your cart.')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.matches(':focus-visible'))).toBe(true);

  const signIn = page.getByRole('link', { name: 'Sign in' });
  await expect(signIn.locator('xpath=ancestor::p')).toHaveText(
    'Sign in to add this course to your cart.',
  );
  await expect(signIn).toHaveCSS('color', 'rgb(91, 63, 214)');
  await signIn.hover();
  await expect(signIn).toHaveCSS('color', 'rgb(73, 50, 182)');
  await signIn.focus();
  await expect(signIn).toBeFocused();
  expect(await signIn.evaluate((link) => link.matches(':focus-visible'))).toBe(true);
  const guestUnavailableAction = page.getByRole('button', { name: 'Add to cart' });
  await expect(guestUnavailableAction).toBeDisabled();
  await expect(guestUnavailableAction.locator('svg')).toHaveCount(0);
  expect(
    await guestUnavailableAction.evaluate((button) => {
      const styles = getComputedStyle(button);
      return {
        background: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        color: styles.color,
        cursor: styles.cursor,
        minHeight: styles.minHeight,
      };
    }),
  ).toEqual({
    background: 'rgb(229, 231, 235)',
    borderRadius: '8px',
    color: 'rgb(156, 163, 175)',
    cursor: 'not-allowed',
    minHeight: '44px',
  });
  await guestUnavailableAction.hover();
  await expect(guestUnavailableAction).toHaveCSS('background-color', 'rgb(229, 231, 235)');
  for (const width of [320, 390, 768, 1280, 1440, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
    await testInfo.attach(`course-detail-${width}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim(),
    ),
  ).toBe('0ms');
  diagnostics.assertClean();
});

for (const locale of ['en', 'ru', 'uz'] as const) {
  test(`resolves the complete admitted course residual family without overflow or writes in ${locale}`, async ({
    page,
  }) => {
    test.slow();
    const copy = courseResidualBrowserCopy[locale];
    const diagnostics = await installDiagnostics(page);
    let writes = 0;
    let detailPending = true;
    let outlinePending = true;
    let draft = false;
    let outlineItems = 1;
    let resolveDetail: (() => void) | undefined;
    let resolveOutline: (() => void) | undefined;
    const detailGate = new Promise<void>((resolve) => {
      resolveDetail = resolve;
    });
    const outlineGate = new Promise<void>((resolve) => {
      resolveOutline = resolve;
    });
    page.on('request', (request) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes += 1;
    });
    await page.route('**/courses/7**', async (route) => {
      if (isDocumentNavigation(route)) {
        await route.fallback();
        return;
      }
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/lessons')) {
        if (outlinePending) await outlineGate;
        await json(route, outline(null, outlineItems));
        return;
      }
      if (detailPending) await detailGate;
      await json(route, { ...detail, published_at: draft ? null : detail.published_at });
    });

    await page.goto('/courses/7');
    if (locale !== 'en') {
      await page.getByRole('button', { name: 'Change language' }).press('Enter');
      await page
        .getByRole('button', { name: locale === 'ru' ? 'Русский' : "O'zbek", exact: true })
        .press('Enter');
    }
    await expect(page.getByRole('status', { name: copy.loadingDetails })).toBeVisible();

    detailPending = false;
    resolveDetail?.();
    await expect(page.getByRole('heading', { level: 1, name: detail.title })).toBeVisible();
    await expect(page.getByRole('status', { name: copy.loadingOutline })).toBeVisible();

    outlinePending = false;
    resolveOutline?.();
    await expect(page.getByRole('heading', { level: 2, name: copy.outlineHeading })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Welcome' })).toBeVisible();
    await expect(page.getByText(new RegExp(`video ${copy.lessonMarker}`))).toBeVisible();
    await expect(page.getByText('Ada Lovelace')).toBeVisible();

    for (const width of [320, 390, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 900 });
      const signIn = page.getByRole('link', { name: 'Sign in' });
      await signIn.focus();
      await expect(signIn).toBeFocused();
      await expectNoHorizontalOverflow(page);
    }

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const scaledGeometry = await expectNoHorizontalOverflow(page);
    expect(scaledGeometry.scale).toBeCloseTo(2, 1);
    expect(scaledGeometry.visualWidth * scaledGeometry.scale).toBeCloseTo(
      scaledGeometry.layoutWidth,
      0,
    );
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();

    draft = true;
    outlineItems = 0;
    await page.reload();
    await expect(page.getByText(copy.draftCourse, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.emptyOutline, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: detail.title })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/courses/not-a-number');
    await expect(page.getByText(copy.notFoundDescription, { exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(
      /Translation unavailable|a11y:\w+|course:(?:courseOutline|draftCourse|lessonMarker|noLessonsAdded|thisCourseDoesNotExistOr)/,
    );
    await expectNoHorizontalOverflow(page);
    expect(writes).toBe(0);
    diagnostics.assertClean();
  });
}
