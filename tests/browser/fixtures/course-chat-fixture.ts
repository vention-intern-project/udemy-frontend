import { type Page, type Route } from '@playwright/test';

const student = {
  email: 'learner@example.test',
  name: 'Learner',
  surname: 'One',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
export const courseChatEnrollment = {
  id: 4,
  user_id: 1,
  course_id: 7,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  course: { id: 7, title: 'Active course', description: null, price: '0.00', currency: 'USD' },
};
const emptyCart = { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 };
const MY_LEARNING_COLLECTION_QUERY = '?page=1&page_size=100';

export interface ChatRequestEvidence {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

export interface CourseChatFixtureOptions {
  readonly cart?: unknown;
  readonly enrollments?: readonly unknown[];
}

export type CourseChatD03Scenario =
  | 'mini-clear-menu'
  | 'full-page-clear-menu'
  | 'localized-accumulated-state';

const localizedAccumulatedCart = {
  id: 1,
  items: [
    {
      id: 1,
      course_id: 7,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 7, title: 'Localized course', price: '19.99', currency: 'USD' },
    },
  ],
  total_price: '19.99',
  currency: 'USD',
  item_count: 1,
};

export interface CourseChatD03Controller {
  readonly chatRequests: ChatRequestEvidence[];
  readonly scenario: CourseChatD03Scenario;
  install(): Promise<void>;
  openConversationActions(): Promise<void>;
  openClearDialog(): Promise<void>;
}

export async function fulfillCourseChatJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function installCourseChatFixture(
  page: Page,
  chatRequests: ChatRequestEvidence[],
  options: CourseChatFixtureOptions = {},
) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/me') return fulfillCourseChatJson(route, student);
    if (path === '/cart') return fulfillCourseChatJson(route, options.cart ?? emptyCart);
    if (path === '/courses') {
      return fulfillCourseChatJson(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/enrollments/4') return fulfillCourseChatJson(route, courseChatEnrollment);
    if (path === '/enrollments/my') {
      if (request.method() !== 'GET' || url.search !== MY_LEARNING_COLLECTION_QUERY)
        throw new Error(`Unexpected API-021 request ${request.method()} ${path}${url.search}`);
      const enrollments = options.enrollments ?? [];
      return fulfillCourseChatJson(route, {
        items: enrollments,
        page: 1,
        page_size: 100,
        total: enrollments.length,
        pages: enrollments.length === 0 ? 0 : 1,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/courses/7/progress')
      return fulfillCourseChatJson(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 0,
        progress_percentage: 0,
      });
    if (path === '/courses/7/lessons')
      return fulfillCourseChatJson(route, {
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    if (path === '/chat/') {
      chatRequests.push({ method: request.method(), path, body: request.postDataJSON() });
      return fulfillCourseChatJson(route, {
        thread_id: 'thread-1',
        response: `One answer ${chatRequests.length}.`,
      });
    }
    return route.fallback();
  });
}

export function createCourseChatD03Controller(
  page: Page,
  scenario: CourseChatD03Scenario,
): CourseChatD03Controller {
  const chatRequests: ChatRequestEvidence[] = [];

  return {
    chatRequests,
    scenario,
    async install() {
      await installCourseChatFixture(
        page,
        chatRequests,
        scenario === 'localized-accumulated-state' ? { cart: localizedAccumulatedCart } : {},
      );
    },
    async openConversationActions() {
      await page.getByRole('button', { name: 'Conversation actions' }).click();
    },
    async openClearDialog() {
      await page.getByRole('button', { name: 'Clear chat' }).click();
    },
  };
}
