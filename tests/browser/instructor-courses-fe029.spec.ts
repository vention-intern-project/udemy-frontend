import { expect, test, type Browser, type Locator, type Page, type Route } from '@playwright/test';

const instructorProfile = {
  email: 'instructor@example.test',
  name: 'Indira',
  surname: 'Instructor',
  role: 'instructor',
  birthday: null,
  phone_number: null,
  created_at: '2026-08-07T00:00:00Z',
};

const course = {
  id: 17,
  title: 'Contract-faithful instructor course',
  description: 'An authored course returned only by the instructor collection.',
  price: '0.00',
  currency: 'USD',
  published_at: null,
  created_at: '2026-08-07T00:00:00Z',
  updated_at: '2026-08-07T00:00:00Z',
  instructor: { id: 3, name: 'Indira', surname: 'Instructor' },
  lessons: [{ id: 101, title: 'Introduction' }],
};

const pageTwoCourse = { ...course, id: 18, title: 'Second instructor course' };
const firstPageCourses = Array.from({ length: 20 }, (_, index) => ({
  ...course,
  id: index === 0 ? course.id : index + 100,
  title: index === 0 ? course.title : `Instructor course ${index + 1}`,
}));

interface CollectionFailureScenario {
  readonly status: 401 | 403 | 422;
  readonly message: string;
}

interface InstructorCourseHeaderActions {
  readonly createAction: Locator;
  readonly routeLink: Locator;
  readonly sharesMobileActionGroup: boolean;
}

type BackgroundVariant = 'desktop' | 'tablet' | 'mobile';

interface InstructorCoursesBackgroundComposition {
  readonly continuationContent: string;
  readonly continuationDisplay: string;
  readonly continuationImage: string;
  readonly continuationPointerEvents: string;
  readonly image: string;
  readonly position: string;
  readonly repeat: string;
  readonly size: string;
  readonly variant: string;
}

interface SourceCompositionScenario {
  readonly deviceScaleFactor: number;
  readonly expectedVariant: BackgroundVariant;
  readonly physicalHeight: number;
  readonly physicalWidth: number;
  readonly viewport: { readonly height: number; readonly width: number };
}

interface FooterCanvasGeometry {
  readonly articleBottom: number;
  readonly footerTop: number;
}

interface WorkFrameBoundaryGeometry {
  readonly articleBottom: number;
  readonly footerTop: number;
  readonly workFrameBottom: number;
}

const unexpectedRuntimeErrors = new WeakMap<Page, string[]>();

function collectionResponse(
  items: readonly (typeof course)[],
  page: number,
  total: number,
  pages: number,
) {
  return {
    items,
    page,
    page_size: 20,
    total,
    pages,
    has_next: page < pages,
    has_previous: page > 1,
  };
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installInstructorSession(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem('learnhub.access-token', 'fe029-fixture-token'),
  );
  await page.route('**/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer fe029-fixture-token');
    await fulfillJson(route, 200, instructorProfile);
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.client);
  expect(widths.body).toBeLessThanOrEqual(widths.client);
}

async function expectInstructorCanvasEndsBeforeFooter(page: Page) {
  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
  const geometry = await page.evaluate<FooterCanvasGeometry>(() => {
    const article = document.querySelector('article');
    const footerElement = document.querySelector('footer');
    if (!article || !footerElement) throw new Error('Expected Instructor canvas and footer.');
    const articleBox = article.getBoundingClientRect();
    const footerBox = footerElement.getBoundingClientRect();
    return {
      articleBottom: articleBox.bottom,
      footerTop: footerBox.top,
    };
  });
  expect(geometry.articleBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
}

async function expectInstructorCanvasEndsAfterWorkFrame(page: Page) {
  const createCourse = page.getByRole('heading', { level: 2, name: 'Create course' }).locator('..');
  await createCourse.scrollIntoViewIfNeeded();
  const geometry = await page.evaluate<WorkFrameBoundaryGeometry>(() => {
    const article = document.querySelector('article');
    const footer = document.querySelector('footer');
    const createCourseHeading = Array.from(document.querySelectorAll('h2')).find(
      (heading) => heading.textContent === 'Create course',
    );
    const workFrame = createCourseHeading?.parentElement;
    if (!article || !footer || !workFrame)
      throw new Error('Expected Instructor canvas, work frame, and footer.');
    return {
      articleBottom: article.getBoundingClientRect().bottom,
      footerTop: footer.getBoundingClientRect().top,
      workFrameBottom: workFrame.getBoundingClientRect().bottom,
    };
  });
  expect(geometry.articleBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
  expect(geometry.articleBottom - geometry.workFrameBottom).toBeLessThanOrEqual(65);
}

async function readInstructorCoursesBackground(
  page: Page,
): Promise<InstructorCoursesBackgroundComposition> {
  return page.locator('article').evaluate((element) => {
    const style = getComputedStyle(element);
    const continuation = getComputedStyle(element, '::before');
    return {
      continuationContent: continuation.content,
      continuationDisplay: continuation.display,
      continuationImage: continuation.backgroundImage,
      continuationPointerEvents: continuation.pointerEvents,
      image: style.backgroundImage,
      position: style.backgroundPosition,
      repeat: style.backgroundRepeat,
      size: style.backgroundSize,
      variant: style.getPropertyValue('--instructor-courses-background-variant').trim(),
    };
  });
}

function expectDesktopTabletContinuation(
  background: InstructorCoursesBackgroundComposition,
  expectedVariant: Exclude<BackgroundVariant, 'mobile'>,
) {
  expect(background.variant).toBe(expectedVariant);
  expect(background.continuationContent).toBe('""');
  expect(background.continuationDisplay).not.toBe('none');
  expect(background.continuationImage).toContain('linear-gradient');
  expect(background.continuationPointerEvents).toBe('none');
}

async function expectApprovedSourceComposition(
  browser: Browser,
  scenario: SourceCompositionScenario,
) {
  const context = await browser.newContext({
    deviceScaleFactor: scenario.deviceScaleFactor,
    viewport: scenario.viewport,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await installInstructorSession(page);
    await page.route('**/courses/my**', async (route) => {
      await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 20, 1));
    });
    await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
    const background = await readInstructorCoursesBackground(page);
    expect(background.variant).toBe(scenario.expectedVariant);
    if (scenario.expectedVariant === 'mobile') {
      expect(background.image).toContain('instructor-courses-background-mobile-top-uifd020.png');
      expect(background.image).toContain('instructor-courses-background-mobile-bottom-uifd020.png');
    } else {
      expect(background.image).toContain(
        `instructor-courses-background-${scenario.expectedVariant}-uifd020.png`,
      );
    }
    await expectNoHorizontalOverflow(page);
    await expectInstructorCanvasEndsBeforeFooter(page);
    const screenshot = await page.screenshot();
    expect(screenshot.readUInt32BE(16)).toBe(scenario.physicalWidth);
    expect(screenshot.readUInt32BE(20)).toBe(scenario.physicalHeight);
    expect(errors, 'source-composition runtime errors').toEqual([]);
  } finally {
    await context.close();
  }
}

async function instructorCourseHeaderActions(
  page: Page,
  width: number,
): Promise<InstructorCourseHeaderActions> {
  if (width < 768) {
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await menu.click();
    const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNavigation).toBeVisible();
    const actionGroup = mobileNavigation.locator('[data-part="instructor-course-actions"]');
    return {
      createAction: actionGroup.getByRole('button', { name: 'Create course' }),
      routeLink: actionGroup.getByRole('link', { name: 'Instructor courses' }),
      sharesMobileActionGroup: true,
    };
  }

  return {
    createAction: page
      .getByRole('banner')
      .getByRole('button', { name: 'Create course', exact: true }),
    routeLink: page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Instructor courses' }),
    sharesMobileActionGroup: false,
  };
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  unexpectedRuntimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (
      /^Failed to load resource: the server responded with a status of \d{3}/.test(message.text())
    )
      return;
    errors.push(message.text());
  });
  await installInstructorSession(page);
});

test.afterEach(async ({ page }) => {
  expect(unexpectedRuntimeErrors.get(page), 'unexpected browser runtime errors').toEqual([]);
});

test('uses the approved responsive decorative canvas and preserves Instructor header actions', async ({
  page,
}) => {
  await page.route('**/courses/my**', async (route) => {
    await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 20, 1));
  });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });

  const pageCanvas = page.locator('article');
  const collection = page.getByRole('heading', { level: 2, name: 'Your courses' }).locator('..');
  const headerActions = await instructorCourseHeaderActions(page, 1024);

  await expect(pageCanvas).toHaveCSS('background-color', 'rgb(244, 241, 255)');
  await expect
    .poll(() => readInstructorCoursesBackground(page))
    .toMatchObject({
      variant: 'desktop',
      repeat: 'no-repeat',
      position: '100% 0%',
      size: '100%',
    });
  expect((await readInstructorCoursesBackground(page)).image).toContain(
    'instructor-courses-background-desktop-uifd020.png',
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Instructor courses', includeHidden: true }),
  ).toHaveCount(1);
  await expect(
    page.getByText(
      'Create meaningful courses, share your expertise, and inspire learners to grow.',
    ),
  ).toHaveCount(0);
  await expect(collection).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(collection).toHaveCSS('border-radius', '12px');
  await expectInstructorCanvasEndsBeforeFooter(page);
  await expect(headerActions.routeLink).toHaveAttribute('aria-current', 'page');
  await expect(headerActions.createAction).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  for (const width of [320, 390, 768, 1023, 1024, 1280, 1440, 195] as const) {
    await page.setViewportSize({ width, height: 900 });
    if (width !== 195) {
      await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
    }
    const expectedVariant: BackgroundVariant =
      width <= 767 ? 'mobile' : width <= 1023 ? 'tablet' : 'desktop';
    const background = await readInstructorCoursesBackground(page);
    expect(background.variant).toBe(expectedVariant);
    expect(background.repeat).toBe(
      expectedVariant === 'mobile' ? 'no-repeat, no-repeat' : 'no-repeat',
    );
    expect(background.size).toBe(expectedVariant === 'mobile' ? '100%, 100%' : '100%');
    if (expectedVariant === 'mobile') {
      expect(background.image).toContain('instructor-courses-background-mobile-top-uifd020.png');
      expect(background.image).toContain('instructor-courses-background-mobile-bottom-uifd020.png');
      expect(background.position).toBe('50% 0%, 50% 100%');
      expect(background.continuationDisplay).toBe('none');
    } else {
      expect(background.image).toContain(
        `instructor-courses-background-${expectedVariant}-uifd020.png`,
      );
      expect(background.position).toBe('100% 0%');
      expectDesktopTabletContinuation(background, expectedVariant);
    }
    const responsiveHeaderActions = await instructorCourseHeaderActions(page, width);
    await expect(responsiveHeaderActions.routeLink).toBeVisible();
    await expect(responsiveHeaderActions.createAction).toBeVisible();
    const [routeBox, actionBox] = await Promise.all([
      responsiveHeaderActions.routeLink.boundingBox(),
      responsiveHeaderActions.createAction.boundingBox(),
    ]);
    if (!routeBox || !actionBox)
      throw new Error('Instructor header action geometry is unavailable');
    expect(routeBox.height).toBeGreaterThanOrEqual(44);
    expect(actionBox.height).toBeGreaterThanOrEqual(44);
    expect(routeBox.x).toBeGreaterThanOrEqual(0);
    expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(width);
    if (responsiveHeaderActions.sharesMobileActionGroup) {
      expect(routeBox.y).toBeCloseTo(actionBox.y, 1);
      expect(actionBox.x - (routeBox.x + routeBox.width)).toBeCloseTo(8, 1);
    } else {
      expect(actionBox.x).toBeGreaterThan(routeBox.x + routeBox.width);
    }
    await expectInstructorCanvasEndsBeforeFooter(page);
    const responsiveCreateAction = responsiveHeaderActions.createAction;
    await responsiveCreateAction.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(responsiveCreateAction).toBeFocused();
    expect(
      await responsiveCreateAction.evaluate((action) => getComputedStyle(action).outlineStyle),
    ).not.toBe('none');
    await expectNoHorizontalOverflow(page);
  }

  const createRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/courses' && request.method() === 'POST') {
      createRequests.push(request.url());
    }
  });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
  const createAction = (await instructorCourseHeaderActions(page, 1024)).createAction;
  const courseTitle = page.getByRole('textbox', { name: 'Course title' });
  await createAction.press('Enter');
  await expect(courseTitle).toBeFocused();
  await expect(page).toHaveURL('/instructor/courses');
  await courseTitle.fill('Unsubmitted course title');
  const historyLengthBeforeSpace = await page.evaluate(() => window.history.length);
  await createAction.focus();
  await page.keyboard.press('Space');
  await expect(courseTitle).toBeFocused();
  await expect(courseTitle).toHaveValue('Unsubmitted course title');
  await expect(page).toHaveURL('/instructor/courses');
  expect(await page.evaluate(() => window.history.length)).toBe(historyLengthBeforeSpace);
  expect(createRequests).toEqual([]);
  await expectNoHorizontalOverflow(page);
});

test('fades desktop and tablet raster into the existing canvas for short and long course lists', async ({
  page,
}) => {
  for (const items of [[course], firstPageCourses] as const) {
    await page.route('**/courses/my**', async (route) => {
      await fulfillJson(route, 200, collectionResponse(items, 1, items.length, 1));
    });

    for (const [width, expectedVariant] of [
      [768, 'tablet'],
      [1024, 'desktop'],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
      expectDesktopTabletContinuation(await readInstructorCoursesBackground(page), expectedVariant);
      await expectInstructorCanvasEndsBeforeFooter(page);
      await expectInstructorCanvasEndsAfterWorkFrame(page);
      await expectNoHorizontalOverflow(page);
    }
    await page.unroute('**/courses/my**');
  }
});

test('renders each approved source composition at its physical reference dimensions', async ({
  browser,
}) => {
  await expectApprovedSourceComposition(browser, {
    deviceScaleFactor: 1,
    expectedVariant: 'desktop',
    physicalHeight: 1440,
    physicalWidth: 2560,
    viewport: { width: 2560, height: 1440 },
  });
  await expectApprovedSourceComposition(browser, {
    deviceScaleFactor: 2,
    expectedVariant: 'tablet',
    physicalHeight: 1024,
    physicalWidth: 1536,
    viewport: { width: 768, height: 512 },
  });
  await expectApprovedSourceComposition(browser, {
    deviceScaleFactor: 3,
    expectedVariant: 'mobile',
    physicalHeight: 2532,
    physicalWidth: 1170,
    viewport: { width: 390, height: 844 },
  });
});

test('renders the loading skeleton before the deferred collection settles', async ({ page }) => {
  let releaseCollectionResponse!: () => void;
  let resolveCollectionRoute!: (route: Route) => void;
  let collectionResponseReleased = false;
  const pendingCollectionRoute = new Promise<Route>((resolve) => {
    resolveCollectionRoute = resolve;
  });
  const collectionResponseRelease = new Promise<void>((resolve) => {
    releaseCollectionResponse = resolve;
  });
  await page.route('**/courses/my**', async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer fe029-fixture-token');
    expect(new URL(route.request().url()).search).toBe('?page=1&page_size=20');
    resolveCollectionRoute(route);
    await collectionResponseRelease;
    await fulfillJson(route, 200, collectionResponse([course], 1, 1, 1));
  });

  await page.goto('/instructor/courses', { waitUntil: 'commit' });
  const collectionRoute = await pendingCollectionRoute;
  try {
    await expect(page.getByLabel('Loading your courses')).toBeVisible();
    expect(collectionRoute.request().url()).toContain('/courses/my?page=1&page_size=20');
    collectionResponseReleased = true;
    releaseCollectionResponse();
    await expect(page.getByText(course.title)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit course' })).toHaveAttribute(
      'href',
      '/instructor/courses/17/edit',
    );
    await expect(page.getByRole('link', { name: 'Course enrollments' })).toHaveAttribute(
      'href',
      '/instructor/courses/17/enrollments',
    );
  } finally {
    if (!collectionResponseReleased) {
      releaseCollectionResponse();
    }
  }
});

test('uses only the authenticated collection query, paginates, and preserves stable links and focus', async ({
  page,
}) => {
  const collectionQueries: string[] = [];
  const forbiddenPublicRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/courses') forbiddenPublicRequests.push(url.href);
  });
  await page.route('**/courses/my**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    expect(request.method()).toBe('GET');
    expect(request.headers().authorization).toBe('Bearer fe029-fixture-token');
    collectionQueries.push(url.search);
    if (url.search === '?page=1&page_size=20') {
      await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 21, 2));
      return;
    }
    if (url.search === '?page=2&page_size=20') {
      await fulfillJson(route, 200, collectionResponse([pageTwoCourse], 2, 21, 2));
      return;
    }
    await route.abort();
  });

  await page.goto('/instructor/courses');
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).toBeFocused();
  const firstCourseActions = page.getByRole('navigation', { name: `${course.title} actions` });
  await expect(firstCourseActions.getByRole('link', { name: 'Edit course' })).toHaveAttribute(
    'href',
    '/instructor/courses/17/edit',
  );
  await expect(
    firstCourseActions.getByRole('link', { name: 'Course enrollments' }),
  ).toHaveAttribute('href', '/instructor/courses/17/enrollments');
  await firstCourseActions.getByRole('link', { name: 'Edit course' }).focus();
  await page.keyboard.press('Tab');
  await expect(firstCourseActions.getByRole('link', { name: 'Course enrollments' })).toBeFocused();
  const pagination = page.getByRole('navigation', { name: 'Your courses pagination' });
  await expect(pagination.getByRole('button', { name: 'Go to previous page' })).toHaveCount(0);
  await expect(
    pagination.locator('.ui-pagination__direction-slot[aria-hidden="true"]'),
  ).toHaveCount(1);
  await expect(pagination.getByRole('button', { name: 'Go to next page' })).toHaveClass(
    /ui-pagination__button--direction/,
  );
  await expect(
    pagination.getByRole('button', { name: 'Go to next page' }).locator('svg'),
  ).toHaveAttribute('width', '20');
  await pagination.getByRole('button', { name: 'Go to next page' }).click();
  await expect(page).toHaveURL(/\/instructor\/courses\?page=2$/);
  await expect(page.getByText(pageTwoCourse.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).toBeFocused();
  await expect(pagination.getByRole('button', { name: 'Go to next page' })).toHaveCount(0);
  await expect(
    pagination.locator('.ui-pagination__direction-slot[aria-hidden="true"]'),
  ).toHaveCount(1);
  await pagination.getByRole('button', { name: 'Go to previous page' }).press('Enter');
  await expect(page).toHaveURL(/\/instructor\/courses$/);
  await pagination.getByRole('button', { name: 'Go to next page' }).press('Space');
  await expect(page).toHaveURL(/\/instructor\/courses\?page=2$/);

  await page.setViewportSize({ width: 1280, height: 900 });
  const collection = page.getByRole('heading', { level: 2, name: 'Your courses' }).locator('..');
  expect(await collection.evaluate((element) => element.clientHeight)).toBeLessThan(260);
  await expectInstructorCanvasEndsBeforeFooter(page);
  await expectInstructorCanvasEndsAfterWorkFrame(page);

  for (const width of [320, 390, 640, 768, 1023, 1024, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByText(pageTwoCourse.title)).toBeVisible();
    await expect(page.locator('[data-part="instructor-courses-hero"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  expect(collectionQueries).toContain('?page=1&page_size=20');
  expect(collectionQueries.filter((query) => query === '?page=2&page_size=20')).toHaveLength(2);
  expect(forbiddenPublicRequests).toEqual([]);
});

test('renders the contract-faithful empty collection without a public collection request', async ({
  page,
}) => {
  const forbiddenPublicRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/courses') forbiddenPublicRequests.push(request.url());
  });
  await page.route('**/courses/my**', async (route) => {
    expect(new URL(route.request().url()).search).toBe('?page=1&page_size=20');
    await fulfillJson(route, 200, collectionResponse([], 1, 0, 0));
  });

  await page.goto('/instructor/courses');
  await expect(page.getByText('You have not created any courses yet.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Your courses' })).toHaveCount(0);
  for (const width of [320, 640, 768, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
  expect(forbiddenPublicRequests).toEqual([]);
});

const collectionFailureScenarios: readonly CollectionFailureScenario[] = [
  { status: 401, message: 'Sign in again to view your courses.' },
  { status: 403, message: 'You do not have permission to view instructor courses.' },
  { status: 422, message: 'The requested course page is not valid. Try another page.' },
];

for (const scenario of collectionFailureScenarios) {
  test(`renders the verified ${scenario.status} collection response safely`, async ({ page }) => {
    await page.route('**/courses/my**', async (route) => {
      await fulfillJson(route, scenario.status, {
        detail: 'Contract-faithful test-only error payload.',
      });
    });

    await page.goto('/instructor/courses');
    if (scenario.status === 401) {
      await expect(page).toHaveURL(/\/login\?returnTo=%2Finstructor%2Fcourses$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
    } else {
      await expect(page.getByText('Course list unavailable')).toBeVisible();
      await expect(page.getByText(scenario.message)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    }
    for (const width of [320, 640, 768, 1440] as const) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('retries a generic collection failure with the contract-faithful success response', async ({
  page,
}) => {
  let attempts = 0;
  let recoveryEnabled = false;
  await page.route('**/courses/my**', async (route) => {
    attempts += 1;
    if (!recoveryEnabled) {
      await fulfillJson(route, 500, { detail: 'Generic transport failure fixture.' });
      return;
    }
    await fulfillJson(route, 200, collectionResponse([course], 1, 1, 1));
  });

  await page.goto('/instructor/courses');
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(page.getByText('We could not load your courses. Try again.')).toBeVisible();
  await retry.focus();
  await expect(retry).toBeFocused();
  recoveryEnabled = true;
  await retry.press('Enter');
  await expect(page.getByText(course.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).toBeFocused();
  expect(attempts).toBeGreaterThanOrEqual(2);
  for (const width of [320, 640, 768, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
});
