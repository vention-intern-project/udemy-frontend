import type { Page, Route } from '@playwright/test';

export interface LearningAdmissionFixtureOptions {
  readonly cart: unknown;
  readonly student?: unknown;
  readonly enrollment?: unknown;
  readonly progress?: unknown;
  readonly lessons?: unknown;
  readonly completedLesson?: unknown;
  readonly incompleteLesson?: unknown;
}

export interface LearningCompletionScenarioController {
  readonly requests: string[];
}

export interface LearningEmptyCartFixture {
  readonly id: number;
  readonly items: readonly [];
  readonly total_price: string;
  readonly currency: string;
  readonly item_count: number;
}

export const learningEmptyCart: LearningEmptyCartFixture = {
  id: 1,
  items: [],
  total_price: '0.00',
  currency: 'USD',
  item_count: 0,
};

export async function fulfillLearningJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function installLearningStudent(page: Page) {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem('learnhub.access-token', 'student-token');
  });
}

export async function installLearningAdmissionRoutes(
  page: Page,
  options: LearningAdmissionFixtureOptions,
) {
  await page.route(
    (url) => url.pathname === '/cart' && url.search === '',
    async (route) => {
      const request = route.request();
      if (request.method() !== 'GET')
        throw new Error(`Unexpected Learning Cart request method: ${request.method()}`);
      if (request.headers().authorization !== 'Bearer student-token')
        throw new Error('Learning Cart request is missing the student token.');
      await fulfillLearningJson(route, options.cart);
    },
  );
  if (
    options.student === undefined ||
    options.enrollment === undefined ||
    options.progress === undefined ||
    options.lessons === undefined ||
    options.completedLesson === undefined ||
    options.incompleteLesson === undefined
  )
    return;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    const isLearningApi =
      url.pathname === '/me' ||
      url.pathname === '/enrollments/4' ||
      url.pathname === '/courses/7/progress' ||
      url.pathname === '/courses/7/lessons' ||
      url.pathname === '/courses/7/lessons/12/complete' ||
      url.pathname === '/courses/7/lessons/12/incomplete';
    if (!isLearningApi) return route.fallback();
    if (url.pathname === '/me') return fulfillLearningJson(route, options.student);
    if (url.pathname === '/enrollments/4') return fulfillLearningJson(route, options.enrollment);
    if (url.pathname === '/courses/7/progress') return fulfillLearningJson(route, options.progress);
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return fulfillLearningJson(route, options.lessons);
    if (url.pathname === '/courses/7/lessons/12/complete' && request.method() === 'POST')
      return fulfillLearningJson(route, options.completedLesson);
    if (url.pathname === '/courses/7/lessons/12/incomplete' && request.method() === 'POST')
      return fulfillLearningJson(route, options.incompleteLesson);
    throw new Error(`Unexpected Learning request ${request.method()} ${url.pathname}`);
  });
}

export async function installLearningCompletionScenario(
  page: Page,
): Promise<LearningCompletionScenarioController> {
  await installLearningStudent(page);
  const requests: string[] = [];
  let completeRequests = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    const isLearningApi =
      url.pathname === '/me' ||
      url.pathname === '/enrollments/4' ||
      url.pathname === '/courses/7/progress' ||
      url.pathname === '/courses/7/lessons' ||
      url.pathname === '/courses/7/lessons/12/complete' ||
      url.pathname === '/courses/7/lessons/12/incomplete';
    if (!isLearningApi) return route.fallback();
    if (url.pathname === '/me')
      return fulfillLearningJson(route, {
        email: 'student@example.test',
        name: 'Sam',
        surname: 'Student',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-01-01T00:00:00Z',
      });
    if (url.pathname === '/enrollments/4')
      return fulfillLearningJson(route, {
        id: 4,
        user_id: 1,
        course_id: 7,
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        course: {
          id: 7,
          title: 'Browser learning course',
          description: null,
          price: '0.00',
          currency: 'USD',
        },
      });
    if (url.pathname === '/courses/7/progress')
      return fulfillLearningJson(route, {
        course_id: 7,
        completed_lessons: 1,
        total_lessons: 2,
        progress_percentage: 50,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return fulfillLearningJson(route, {
        items: [
          {
            id: 12,
            title: 'First browser lesson',
            lesson_type: 'text',
            download_url: null,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/courses/7/lessons/12/complete' && request.method() === 'POST') {
      requests.push(`${request.method()} ${url.pathname}`);
      completeRequests += 1;
      if (completeRequests === 2)
        return fulfillLearningJson(route, { detail: 'private mutation failure' }, 500);
      return fulfillLearningJson(route, {
        lesson_id: 12,
        completed: true,
        completed_at: '2026-07-26T00:00:00Z',
      });
    }
    if (url.pathname === '/courses/7/lessons/12/incomplete' && request.method() === 'POST') {
      requests.push(`${request.method()} ${url.pathname}`);
      return fulfillLearningJson(route, { lesson_id: 12, completed: false, completed_at: null });
    }
    throw new Error(`Unexpected request ${request.method()} ${url.pathname}`);
  });
  return { requests };
}
