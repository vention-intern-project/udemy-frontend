import { expect, test, type Browser, type Locator, type Page, type Route } from '@playwright/test';

import {
  createRequestFailureAccounting,
  type RequestFailureAccounting,
  type RequestFailureIdentity,
} from './support/visual-quality';

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
  readonly layout: 'compact-drawer' | 'desktop-split';
}

interface CourseMenuKeyboardLocaleScenario {
  readonly actions: string;
  readonly deleteCourse: string;
  readonly enrollments: string;
  readonly locale: 'en' | 'ru' | 'uz';
}

type InstructorCollectionTransition = () => Promise<void>;

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
const instructorCollectionAbort: RequestFailureIdentity = {
  method: 'GET',
  path: '/courses/my?page=1&page_size=20',
  errorText: 'net::ERR_ABORTED',
};
const courseMenuKeyboardLocaleScenarios: readonly CourseMenuKeyboardLocaleScenario[] = [
  {
    locale: 'en',
    actions: `${course.title} actions`,
    enrollments: 'Course enrollments',
    deleteCourse: 'Delete course',
  },
  {
    locale: 'ru',
    actions: `Действия с курсом «${course.title}»`,
    enrollments: 'Записи на курс',
    deleteCourse: 'Удалить курс',
  },
  {
    locale: 'uz',
    actions: `${course.title} kursi bo‘yicha amallar`,
    enrollments: 'Kursga yozilishlar',
    deleteCourse: 'Kursni o‘chirish',
  },
];

async function allowOptionalInstructorCollectionAbortDuringTransition(
  accounting: RequestFailureAccounting,
  transition: InstructorCollectionTransition,
): Promise<void> {
  const retireAllowance = accounting.allowOptional(instructorCollectionAbort);
  try {
    await transition();
  } finally {
    retireAllowance();
  }
}

async function expectTransitionScopedInstructorCollectionAbortAccounting(): Promise<void> {
  const url = `http://127.0.0.1:4174${instructorCollectionAbort.path}`;
  const admitted = createRequestFailureAccounting();
  await allowOptionalInstructorCollectionAbortDuringTransition(admitted, async () => {
    admitted.observe('GET', url, 'net::ERR_ABORTED');
  });
  expect(admitted.acceptedFailures()).toEqual([{ ...instructorCollectionAbort, url }]);
  expect(admitted.violations().requestFailures).toEqual([]);

  const late = createRequestFailureAccounting();
  await allowOptionalInstructorCollectionAbortDuringTransition(late, async () => {});
  late.observe('GET', url, 'net::ERR_ABORTED');
  expect(late.acceptedFailures()).toEqual([]);
  expect(late.violations().requestFailures).toEqual([{ ...instructorCollectionAbort, url }]);

  const duplicate = createRequestFailureAccounting();
  await allowOptionalInstructorCollectionAbortDuringTransition(duplicate, async () => {
    duplicate.observe('GET', url, 'net::ERR_ABORTED');
    duplicate.observe('GET', url, 'net::ERR_ABORTED');
  });
  expect(duplicate.acceptedFailures()).toHaveLength(1);
  expect(duplicate.violations().requestFailures).toEqual([{ ...instructorCollectionAbort, url }]);

  const mismatched = createRequestFailureAccounting();
  const meUrl = 'http://127.0.0.1:4174/me';
  await allowOptionalInstructorCollectionAbortDuringTransition(mismatched, async () => {
    mismatched.observe('POST', url, 'net::ERR_ABORTED');
    mismatched.observe('GET', meUrl, 'net::ERR_ABORTED');
    mismatched.observe('GET', url, 'net::ERR_FAILED');
    mismatched.observe('GET', url, 'net::ERR_ABORTED');
  });
  expect(mismatched.acceptedFailures()).toEqual([{ ...instructorCollectionAbort, url }]);
  expect(mismatched.violations().requestFailures).toEqual([
    { ...instructorCollectionAbort, method: 'POST', url },
    { ...instructorCollectionAbort, path: '/me', url: meUrl },
    { ...instructorCollectionAbort, errorText: 'net::ERR_FAILED', url },
  ]);
}

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
  expect(geometry.articleBottom).toBeCloseTo(geometry.footerTop, 0);
}

async function expectInstructorCanvasEndsAfterWorkFrame(page: Page) {
  const collection = page.getByRole('heading', { level: 2, name: 'Your courses' }).locator('..');
  await collection.scrollIntoViewIfNeeded();
  const geometry = await page.evaluate<WorkFrameBoundaryGeometry>(() => {
    const article = document.querySelector('article');
    const footer = document.querySelector('footer');
    const collectionHeading = Array.from(document.querySelectorAll('h2')).find(
      (heading) => heading.textContent === 'Your courses',
    );
    const workFrame = collectionHeading?.closest('section');
    if (!article || !footer || !workFrame)
      throw new Error('Expected Instructor canvas, work frame, and footer.');
    return {
      articleBottom: article.getBoundingClientRect().bottom,
      footerTop: footer.getBoundingClientRect().top,
      workFrameBottom: workFrame.getBoundingClientRect().bottom,
    };
  });
  expect(geometry.articleBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
  expect(geometry.articleBottom).toBeGreaterThan(geometry.workFrameBottom);
}

test('renders the instructor course collection in Russian and Uzbek without overflow', async ({
  page,
}) => {
  await installInstructorSession(page);
  await page.route('**/courses/my**', async (route) => {
    await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 20, 1));
  });
  for (const [
    locale,
    pageTitle,
    pageDescription,
    heading,
    lessonCount,
    editCourse,
    enrollments,
    courseActions,
  ] of [
    [
      'ru',
      'Курсы преподавателя',
      'Создавайте курсы, добавляйте уроки и управляйте записями студентов.',
      'Ваши курсы',
      '1 урок',
      'Редактировать курс',
      'Записи на курс',
      `Действия с курсом «${course.title}»`,
    ],
    [
      'uz',
      'O‘qituvchi kurslari',
      'Kurslar yarating, darslar qo‘shing va talabalarning kursga yozilishlarini boshqaring.',
      'Kurslaringiz',
      '1 dars',
      'Kursni tahrirlash',
      'Kursga yozilishlar',
      `${course.title} kursi bo‘yicha amallar`,
    ],
  ] as const) {
    await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
    await page.evaluate((selectedLocale: string) => {
      localStorage.setItem('learnhub.locale', selectedLocale);
    }, locale);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(course.title)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: pageTitle })).toBeVisible();
    await expect(page.getByText(pageDescription)).toBeVisible();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByText(lessonCount, { exact: true }).first()).toBeVisible();
    const actions = page.getByRole('navigation', { name: courseActions }).first();
    const editLink = actions.getByRole('link', { name: editCourse });
    const menuTrigger = actions.getByRole('button', { name: courseActions });
    await expect(editLink).toBeVisible();
    await menuTrigger.click();
    const enrollmentsLink = actions.getByRole('menuitem', { name: enrollments });
    await expect(enrollmentsLink).toBeVisible();
    await editLink.focus();
    await expect(editLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menuTrigger).toBeFocused();
    await page.keyboard.press('Escape');
    await expectNoHorizontalOverflow(page);
  }
});

test('implements the complete course actions keyboard menu contract across locales and compact widths', async ({
  page,
}) => {
  await expectTransitionScopedInstructorCollectionAbortAccounting();
  const collectionRequestFailures = createRequestFailureAccounting();
  const apiFailures: string[] = [];
  const forbiddenPublicRequests: string[] = [];
  let successfulCollectionResponses = 0;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/courses') forbiddenPublicRequests.push(request.url());
  });
  page.on('requestfailed', (request) => {
    const pathname = new URL(request.url()).pathname;
    const errorText = request.failure()?.errorText ?? 'failed';
    if (pathname === '/me' || pathname === '/courses/my') {
      collectionRequestFailures.observe(request.method(), request.url(), errorText);
      return;
    }
  });
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname === '/courses/my' && response.request().method() === 'GET' && response.ok()) {
      successfulCollectionResponses += 1;
    }
    if ((pathname === '/me' || pathname === '/courses/my') && !response.ok()) {
      apiFailures.push(`${response.request().method()} ${pathname}: ${response.status()}`);
    }
  });
  await page.route('**/courses/my**', async (route) => {
    const request = route.request();
    expect(request.method()).toBe('GET');
    expect(request.headers().authorization).toBe('Bearer fe029-fixture-token');
    expect(new URL(request.url()).search).toBe('?page=1&page_size=20');
    await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 20, 1));
  });

  for (const scenario of courseMenuKeyboardLocaleScenarios) {
    for (const width of [1280, 320] as const) {
      await page.setViewportSize({ width, height: 900 });
      let responseCountBeforeTransition = successfulCollectionResponses;
      await allowOptionalInstructorCollectionAbortDuringTransition(
        collectionRequestFailures,
        async () => {
          await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
          await expect(page.getByText(course.title)).toBeVisible();
          expect(successfulCollectionResponses).toBeGreaterThan(responseCountBeforeTransition);
        },
      );
      await page.evaluate((locale: string) => {
        localStorage.setItem('learnhub.locale', locale);
      }, scenario.locale);
      responseCountBeforeTransition = successfulCollectionResponses;
      await allowOptionalInstructorCollectionAbortDuringTransition(
        collectionRequestFailures,
        async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await expect(page.getByText(course.title)).toBeVisible();
          expect(successfulCollectionResponses).toBeGreaterThan(responseCountBeforeTransition);
        },
      );

      const actions = page.getByRole('navigation', { name: scenario.actions }).first();
      const trigger = actions.getByRole('button', { name: scenario.actions });
      await trigger.focus();
      await trigger.press('Enter');
      const menu = actions.getByRole('menu');
      const enrollments = menu.getByRole('menuitem', { name: scenario.enrollments });
      const deleteCourse = menu.getByRole('menuitem', { name: scenario.deleteCourse });
      await expect(enrollments).toBeFocused();
      await expect(enrollments).toHaveAttribute('tabindex', '-1');
      await expect(deleteCourse).toHaveAttribute('tabindex', '-1');
      const menuId = await menu.getAttribute('id');
      const triggerId = await trigger.getAttribute('id');
      if (!menuId || !triggerId) throw new Error('Expected linked course menu ids.');
      await expect(trigger).toHaveAttribute('aria-controls', menuId);
      await expect(menu).toHaveAttribute('aria-labelledby', triggerId);

      await page.keyboard.press('ArrowDown');
      await expect(deleteCourse).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(enrollments).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(deleteCourse).toBeFocused();
      await page.keyboard.press('Home');
      await expect(enrollments).toBeFocused();
      await page.keyboard.press('End');
      await expect(deleteCourse).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(menu).toHaveCount(0);

      await trigger.press('Space');
      await expect(actions.getByRole('menuitem', { name: scenario.enrollments })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();

      await trigger.press('ArrowUp');
      await expect(actions.getByRole('menuitem', { name: scenario.deleteCourse })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(actions.getByRole('menu')).toHaveCount(0);
      await expect(trigger).not.toBeFocused();

      await trigger.focus();
      await trigger.press('ArrowDown');
      await expect(actions.getByRole('menuitem', { name: scenario.enrollments })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(actions.getByRole('menu')).toHaveCount(0);
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(actions.getByRole('menuitem', { name: scenario.enrollments })).toBeFocused();
      await page.getByRole('heading', { level: 1 }).click();
      await expect(actions.getByRole('menu')).toHaveCount(0);

      await trigger.focus();
      await trigger.press('ArrowUp');
      await expect(actions.getByRole('menuitem', { name: scenario.deleteCourse })).toBeFocused();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expectNoHorizontalOverflow(page);
    }
  }

  expect(apiFailures).toEqual([]);
  expect(collectionRequestFailures.violations()).toEqual({
    requestFailures: [],
    unconsumedExpectedRequestFailures: [],
  });
  expect(successfulCollectionResponses).toBeGreaterThanOrEqual(
    courseMenuKeyboardLocaleScenarios.length * 2 * 2,
  );
  expect(forbiddenPublicRequests).toEqual([]);
});

test('anchors the created-course confirmation as a compact bottom-end toast', async ({ page }) => {
  await installInstructorSession(page);
  await page.route('**/courses/my**', async (route) => {
    await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 20, 1));
  });
  await page.route('**/*', async (route) => {
    const isCreateRequest =
      route.request().method() === 'POST' &&
      route.request().postData()?.includes('Toast placement course');
    if (!isCreateRequest) {
      await route.fallback();
      return;
    }
    await fulfillJson(route, 201, {
      ...course,
      id: 91,
      instructor_id: 3,
      title: 'Toast placement course',
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(course.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).not.toBeFocused();

  const { createAction } = await instructorCourseHeaderActions(page, 1280);
  await createAction.click();
  await page.getByRole('textbox', { name: 'Course title' }).fill('Toast placement course');
  await page.getByRole('button', { name: 'Create course', exact: true }).last().click();

  const toast = page.getByRole('status');
  await expect(toast).toContainText('Course created');
  await expect(toast).toContainText('Toast placement course');
  await expect(toast.getByRole('link', { name: 'Edit course' })).toHaveAttribute(
    'href',
    '/instructor/courses/91/edit',
  );
  const toastGeometry = await toast.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      rightGap: window.innerWidth - box.right,
      position: style.position,
      zIndex: Number(style.zIndex),
      backgroundColor: style.backgroundColor,
      progressColor: getComputedStyle(element, '::after').backgroundColor,
    };
  });
  const footer = page.locator('footer');
  const [toastBox, footerBox] = await Promise.all([toast.boundingBox(), footer.boundingBox()]);
  expect(toastGeometry.position).toBe('absolute');
  expect(toastGeometry.rightGap).toBeGreaterThanOrEqual(23);
  expect(toastGeometry.rightGap).toBeLessThanOrEqual(25);
  expect(toastGeometry.zIndex).toBe(600);
  expect(toastGeometry.backgroundColor).toBe('rgb(31, 41, 55)');
  expect(toastGeometry.progressColor).toBe('rgb(91, 63, 214)');
  expect(toastBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  if (!toastBox || !footerBox) throw new Error('Expected visible toast and footer');
  expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(footerBox.y);
  await expectNoHorizontalOverflow(page);
});

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
  if (width < 1024) {
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await menu.click();
    const drawerNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(drawerNavigation).toBeVisible();
    const routeLink = drawerNavigation.getByRole('link', { name: 'Instructor courses' });
    await expect
      .poll(async () => (await routeLink.boundingBox())?.x ?? -1)
      .toBeGreaterThanOrEqual(0);
    return {
      createAction: drawerNavigation.getByRole('button', { name: 'Create course' }),
      routeLink,
      layout: 'compact-drawer',
    };
  }

  return {
    createAction: page
      .getByRole('banner')
      .getByRole('button', { name: 'Create course', exact: true }),
    routeLink: page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Instructor courses' }),
    layout: 'desktop-split',
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

  for (const width of [320, 390, 768, 1023, 1024, 1280, 1440] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
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
    if (responsiveHeaderActions.layout === 'compact-drawer') {
      expect(actionBox.y).toBeGreaterThanOrEqual(routeBox.y + routeBox.height);
      await expect(page.locator('[data-part="instructor-course-actions"]')).toHaveCount(0);
      const header = page.getByRole('banner');
      const [brandBox, menuBox, accountBox, languageBox] = await Promise.all([
        header.getByRole('link', { name: 'LearnHub home' }).boundingBox(),
        header.getByRole('button', { name: 'Close navigation' }).boundingBox(),
        header.getByRole('button', { name: 'Account menu for Indira Instructor' }).boundingBox(),
        header.getByRole('button', { name: 'Change language' }).boundingBox(),
      ]);
      if (!brandBox || !menuBox || !accountBox || !languageBox)
        throw new Error('Instructor compact header geometry is unavailable');
      expect(menuBox.x - (brandBox.x + brandBox.width)).toBeCloseTo(8, 1);
      expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(accountBox.x);
      expect(languageBox.x).toBeGreaterThanOrEqual(accountBox.x + accountBox.width);
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
  await expect(page.getByText(course.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).not.toBeFocused();
  const createAction = (await instructorCourseHeaderActions(page, 1024)).createAction;
  await expect(page.getByRole('textbox', { name: 'Course title' })).toHaveCount(0);
  await createAction.press('Enter');
  const courseTitle = page.getByRole('textbox', { name: 'Course title' });
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

test('closes the compact Instructor drawer before revealing and scrolling to Create course', async ({
  page,
}) => {
  await page.route('**/courses/my**', async (route) => {
    await fulfillJson(route, 200, collectionResponse(firstPageCourses, 1, 20, 1));
  });
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(course.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).not.toBeFocused();

  const { createAction } = await instructorCourseHeaderActions(page, 390);
  await createAction.click();

  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
  const courseTitle = page.getByRole('textbox', { name: 'Course title' });
  await expect(courseTitle).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect
    .poll(async () => {
      const box = await courseTitle.boundingBox();
      return Boolean(box && box.y >= 0 && box.y + box.height <= 600);
    })
    .toBe(true);
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
    const actions = page.getByRole('navigation', { name: `${course.title} actions` });
    await actions.getByRole('button', { name: `${course.title} actions` }).click();
    await expect(actions.getByRole('menuitem', { name: 'Course enrollments' })).toHaveAttribute(
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
  await expect(page.getByText(course.title)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).not.toBeFocused();
  const firstCourseActions = page.getByRole('navigation', { name: `${course.title} actions` });
  await expect(firstCourseActions.getByRole('link', { name: 'Edit course' })).toHaveAttribute(
    'href',
    '/instructor/courses/17/edit',
  );
  const firstCourseMenuTrigger = firstCourseActions.getByRole('button', {
    name: `${course.title} actions`,
  });
  await firstCourseActions.getByRole('link', { name: 'Edit course' }).focus();
  await page.keyboard.press('Tab');
  await expect(firstCourseMenuTrigger).toBeFocused();
  await firstCourseMenuTrigger.press('Enter');
  await expect(
    firstCourseActions.getByRole('menuitem', { name: 'Course enrollments' }),
  ).toHaveAttribute('href', '/instructor/courses/17/enrollments');
  await page.keyboard.press('Escape');
  await expect(firstCourseMenuTrigger).toBeFocused();
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
  expect(await collection.evaluate((element) => element.clientHeight)).toBeLessThan(340);
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

test('deletes a course from the compact overflow menu only after confirmation', async ({
  page,
}) => {
  let deleted = false;
  let deleteRequests = 0;
  await page.route('**/courses/my**', async (route) => {
    await fulfillJson(
      route,
      200,
      collectionResponse(deleted ? [] : [course], 1, deleted ? 0 : 1, deleted ? 0 : 1),
    );
  });
  await page.route('**/courses/17', async (route) => {
    expect(route.request().method()).toBe('DELETE');
    deleteRequests += 1;
    deleted = true;
    await fulfillJson(route, 200, { message: 'Course deleted successfully' });
  });

  await page.goto('/instructor/courses');
  await page.getByRole('button', { name: `${course.title} actions` }).click();
  await page.getByRole('menuitem', { name: 'Delete course' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this course?' });
  await expect(dialog).toContainText(course.title);
  await dialog.getByRole('button', { name: 'Delete course' }).click();
  await expect(page.getByText('You have not created any courses yet.')).toBeVisible();
  expect(deleteRequests).toBe(1);
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
