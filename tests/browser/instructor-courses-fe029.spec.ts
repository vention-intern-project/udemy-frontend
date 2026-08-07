import { expect, test, type Page, type Route } from '@playwright/test';

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
  await page.getByRole('button', { name: 'Go to page 2' }).press('Enter');
  await expect(page).toHaveURL(/\/instructor\/courses\?page=2$/);
  await expect(page.getByText(pageTwoCourse.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).toBeFocused();

  for (const width of [320, 640, 768, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByText(pageTwoCourse.title)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  expect(collectionQueries).toContain('?page=1&page_size=20');
  expect(collectionQueries.filter((query) => query === '?page=2&page_size=20')).toHaveLength(1);
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
