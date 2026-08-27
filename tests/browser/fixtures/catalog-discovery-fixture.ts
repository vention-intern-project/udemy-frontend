import { expect, type Page, type Route } from '@playwright/test';

import type { CourseDetailDto } from '@entities/course';

import {
  createHttpFailureAccounting,
  createRequestFailureAccounting,
  findUnexpectedConsoleErrors,
  type ConsoleErrorEvidence,
  type HttpFailureIdentity,
  type RequestFailureIdentity,
} from '../support/visual-quality';

export interface CatalogPaginationFixture {
  page?: number;
  pages?: number;
  total?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

export interface CatalogFixtureInstructor {
  id: number;
  name: string;
  surname: string;
}

export interface CatalogFixtureLesson {
  id: number;
  title: string;
}

export interface CatalogFixtureCourse {
  id: number;
  title: string;
  description: null;
  price: string;
  currency: string;
  published_at: string;
  instructor: CatalogFixtureInstructor;
  lessons: readonly CatalogFixtureLesson[];
}

export interface CatalogBrowserMonitor {
  (): void;
  allowHttpFailure(identity: HttpFailureIdentity, occurrences?: number): void;
  allowRequestFailure(identity: RequestFailureIdentity, occurrences?: number): void;
  allowOptionalRequestFailure(identity: RequestFailureIdentity): void;
}

export interface CatalogAdmissionFixtureOptions {
  readonly courses: readonly unknown[];
  readonly pagination?: CatalogPaginationFixture;
}

export interface CatalogScenarioController {
  readonly mutationRequests: string[];
}

export interface CatalogActionStateScenarioController extends CatalogScenarioController {
  releaseAddRequest(): void;
}

export interface CatalogRefreshScenarioController {
  readonly requests: string[];
  deferNextResponse(): void;
  hasDeferredResponse(): boolean;
  releaseDeferredResponse(): void;
}

export interface CatalogHeroScenarioController {
  readonly requests: string[];
}

export interface CatalogCourseDetailScenarioController {
  readonly requests: string[];
}

export function createCatalogResponse(
  items: readonly unknown[] = [],
  pagination: CatalogPaginationFixture = {},
) {
  return JSON.stringify({
    items,
    page: 1,
    page_size: 20,
    total: items.length,
    pages: items.length === 0 ? 0 : 1,
    has_next: false,
    has_previous: false,
    ...pagination,
  });
}

export function createPermittedCatalogCourse(title = 'React'): CatalogFixtureCourse {
  return {
    id: 7,
    title,
    description: null,
    price: '9.99',
    currency: 'USD',
    published_at: '2026-01-01T00:00:00Z',
    instructor: { id: 1, name: 'Ada', surname: 'Lovelace' },
    lessons: [{ id: 1, title: 'Intro' }],
  };
}

export function createPermittedCourseDetail(
  course: CatalogFixtureCourse = createPermittedCatalogCourse(),
): CourseDetailDto {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    price: course.price,
    currency: course.currency,
    published_at: course.published_at,
    created_at: course.published_at,
    updated_at: course.published_at,
    instructor: course.instructor,
    lessons: course.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      lesson_type: 'video',
      download_url: null,
      description: null,
      is_published: true,
      created_at: course.published_at,
      updated_at: course.published_at,
    })),
  };
}

export async function installCatalogBrowserMonitor(page: Page): Promise<CatalogBrowserMonitor> {
  const pageErrors: string[] = [];
  const consoleErrors: ConsoleErrorEvidence[] = [];
  const responses = createHttpFailureAccounting();
  const requests = createRequestFailureAccounting();
  page.on('console', (message) => {
    if (message.type() === 'error')
      consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    responses.observe(response.request().method(), response.url(), response.status());
  });
  page.on('requestfailed', (request) => {
    // Route-driven document navigations may be intentionally superseded by
    // React Router. Page URL assertions cover those navigation outcomes;
    // API accounting remains fail-closed for fetch/XHR and every other
    // resource type that can represent a catalog data request.
    if (request.resourceType() === 'document') return;
    requests.observe(request.method(), request.url(), request.failure()?.errorText ?? 'unknown');
  });
  const assertClean = (() => {
    expect(pageErrors, 'unexpected browser page errors').toEqual([]);
    expect(
      findUnexpectedConsoleErrors(
        consoleErrors,
        responses.acceptedFailures(),
        requests.acceptedFailures(),
      ),
      'unexpected browser console errors',
    ).toEqual([]);
    expect(responses.violations().errorResponses, 'unexpected HTTP error responses').toEqual([]);
    expect(
      responses.violations().unconsumedExpectedResponses,
      'expected HTTP errors not observed',
    ).toEqual([]);
    expect(requests.violations().requestFailures, 'unexpected browser request failures').toEqual(
      [],
    );
    expect(
      requests.violations().unconsumedExpectedRequestFailures,
      'expected browser request failures not observed',
    ).toEqual([]);
  }) as CatalogBrowserMonitor;
  assertClean.allowHttpFailure = (identity, occurrences = 1) =>
    responses.allow(identity, occurrences);
  assertClean.allowRequestFailure = (identity, occurrences = 1) =>
    requests.allow(identity, occurrences);
  assertClean.allowOptionalRequestFailure = (identity) => requests.allowOptional(identity);
  return assertClean;
}

export async function installCatalogAdmissionRoutes(
  page: Page,
  options: CatalogAdmissionFixtureOptions,
) {
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: createCatalogResponse(options.courses, options.pagination),
    });
  });
}

export async function installCatalogCourseDetailScenario(
  page: Page,
  course: CatalogFixtureCourse = createPermittedCatalogCourse(),
): Promise<CatalogCourseDetailScenarioController> {
  const requests: string[] = [];
  await page.route(`**/courses/${course.id}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    requests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await fulfillCatalogJson(route, createPermittedCourseDetail(course));
  });
  return { requests };
}

export async function installCatalogHeroScenario(
  page: Page,
): Promise<CatalogHeroScenarioController> {
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: createCatalogResponse([createPermittedCatalogCourse()]),
    });
  });
  return { requests };
}

export async function installCatalogRefreshScenario(
  page: Page,
): Promise<CatalogRefreshScenarioController> {
  const requests: string[] = [];
  const courses = Array.from({ length: 20 }, (_, index) => ({
    ...createPermittedCatalogCourse(`React ${index + 1}`),
    id: index + 1,
  }));
  let deferNextResponse = false;
  let releaseDeferredResponse: (() => void) | null = null;
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    if (deferNextResponse) {
      deferNextResponse = false;
      await new Promise<void>((resolve) => {
        releaseDeferredResponse = resolve;
      });
      releaseDeferredResponse = null;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: createCatalogResponse(courses, { page: 1, pages: 1 }),
    });
  });
  return {
    requests,
    deferNextResponse: () => {
      deferNextResponse = true;
    },
    hasDeferredResponse: () => releaseDeferredResponse !== null,
    releaseDeferredResponse: () => {
      if (!releaseDeferredResponse) throw new Error('Expected a deferred catalog response.');
      releaseDeferredResponse();
    },
  };
}

export async function installCatalogLocalizedVerticalSliceScenario(
  page: Page,
): Promise<CatalogScenarioController> {
  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.method() === 'DELETE')
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: createCatalogResponse([
        {
          ...createPermittedCatalogCourse('React Fundamentals: Components'),
          id: 8,
          price: '0.00',
          currency: 'UZS',
          instructor: { id: 1, name: 'Samira', surname: 'Karimova' },
          lessons: [
            { id: 1, title: 'Intro' },
            { id: 2, title: 'State' },
            { id: 3, title: 'Effects' },
          ],
        },
        {
          ...createPermittedCatalogCourse('FastAPI and Async SQLAlchemy'),
          id: 11,
          price: '349000.00',
          currency: 'UZS',
          instructor: { id: 2, name: 'Nodira', surname: 'Yuldasheva' },
          lessons: [
            { id: 4, title: 'Setup' },
            { id: 5, title: 'Models' },
            { id: 6, title: 'Routes' },
          ],
        },
      ]),
    });
  });
  return { mutationRequests };
}

export async function installAnonymousCatalogScenario(
  page: Page,
): Promise<CatalogScenarioController> {
  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.method() === 'DELETE')
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: createCatalogResponse([
        { ...createPermittedCatalogCourse('Anonymous free'), id: 8, price: '0.00' },
        { ...createPermittedCatalogCourse('Anonymous paid'), id: 11, price: '29.99' },
      ]),
    });
  });
  return { mutationRequests };
}

export async function installCatalogQuietCartScenario(page: Page) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/me', async (route) =>
    fulfillCatalogJson(route, {
      email: 'student@example.test',
      name: 'Student',
      surname: 'One',
      role: 'student',
      birthday: null,
      phone_number: null,
      created_at: '2026-01-01T00:00:00Z',
    }),
  );
  await page.route('**/cart', async (route) =>
    fulfillCatalogJson(route, {
      id: 1,
      items: [
        {
          id: 11,
          course_id: 7,
          added_at: '2026-01-01T00:00:00Z',
          course: { id: 7, title: 'React', price: '9.99', currency: 'USD' },
        },
      ],
      total_price: '9.99',
      currency: 'USD',
      item_count: 1,
    }),
  );
  await page.route('**/enrollments/my**', async (route) =>
    fulfillCatalogJson(route, JSON.parse(createCatalogResponse())),
  );
  await page.route('**/courses**', async (route) =>
    fulfillCatalogJson(route, JSON.parse(createCatalogResponse([createPermittedCatalogCourse()]))),
  );
}

export async function installCatalogActionStateScenario(
  page: Page,
): Promise<CatalogActionStateScenarioController> {
  const mutationRequests: string[] = [];
  let addCourse7ToCart = false;
  let releaseAddRequest!: () => void;
  const addRequestGate = new Promise<void>((resolve) => {
    releaseAddRequest = resolve;
  });
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' || request.method() === 'DELETE')
      mutationRequests.push(`${request.method()} ${path}`);
  });
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/me', async (route) =>
    fulfillCatalogJson(route, {
      email: 'student@example.test',
      name: 'Student',
      surname: 'One',
      role: 'student',
      birthday: null,
      phone_number: null,
      created_at: '2026-01-01T00:00:00Z',
    }),
  );
  await page.route('**/cart**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/cart/items') {
      await addRequestGate;
      addCourse7ToCart = true;
      return fulfillCatalogJson(route, {
        id: 13,
        course_id: 7,
        added_at: '2026-01-01T00:00:00Z',
        course: { id: 7, title: 'Add course', price: '9.99', currency: 'USD' },
      });
    }
    if (path !== '/cart') return route.fallback();
    const items = [
      {
        id: 12,
        course_id: 10,
        added_at: '2026-01-01T00:00:00Z',
        course: { id: 10, title: 'Remove course', price: '9.99', currency: 'USD' },
      },
      ...(addCourse7ToCart
        ? [
            {
              id: 13,
              course_id: 7,
              added_at: '2026-01-01T00:00:00Z',
              course: { id: 7, title: 'Add course', price: '9.99', currency: 'USD' },
            },
          ]
        : []),
    ];
    return fulfillCatalogJson(route, {
      id: 1,
      items,
      total_price: addCourse7ToCart ? '19.98' : '9.99',
      currency: 'USD',
      item_count: items.length,
    });
  });
  await page.route('**/enrollments/my**', async (route) =>
    fulfillCatalogJson(route, {
      items: [
        {
          id: 22,
          user_id: 1,
          course_id: 9,
          status: 'active',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          course: {
            id: 9,
            title: 'Enrolled course',
            description: null,
            price: '9.99',
            currency: 'USD',
          },
        },
      ],
      page: 1,
      page_size: 100,
      total: 1,
      pages: 1,
      has_next: false,
      has_previous: false,
    }),
  );
  await page.route('**/courses**', async (route) =>
    fulfillCatalogJson(
      route,
      JSON.parse(
        createCatalogResponse([
          { ...createPermittedCatalogCourse('Add course'), id: 7, price: '9.99' },
          { ...createPermittedCatalogCourse('Free course'), id: 8, price: '0.00' },
          { ...createPermittedCatalogCourse('Enrolled course'), id: 9, price: '9.99' },
          { ...createPermittedCatalogCourse('Remove course'), id: 10, price: '9.99' },
          { ...createPermittedCatalogCourse('Draft course'), id: 11, published_at: null },
        ]),
      ),
    ),
  );
  return { mutationRequests, releaseAddRequest };
}

function fulfillCatalogJson(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
