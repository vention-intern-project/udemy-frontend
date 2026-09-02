import type { Page } from '@playwright/test';

const CATALOG_RESPONSE_BODY = JSON.stringify({
  items: [
    {
      id: 7,
      title: 'React',
      description: null,
      price: '9.99',
      currency: 'USD',
      published_at: '2026-01-01T00:00:00Z',
      instructor: { id: 1, name: 'Ada', surname: 'Lovelace' },
      lessons: [{ id: 1, title: 'Intro' }],
    },
  ],
  page: 1,
  page_size: 20,
  total: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
});

const EMPTY_REVIEW_RESPONSE_BODY = JSON.stringify({
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
  pages: 0,
  has_next: false,
  has_previous: false,
});

export async function installCatalogFixture(page: Page) {
  await page.addInitScript(
    ({ catalogResponseBody, emptyReviewResponseBody }) => {
      const nativeFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        const url = new URL(request.url);
        if (request.method === 'GET' && url.pathname === '/courses') {
          if (request.signal.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
          }
          return new Response(catalogResponseBody, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (
          request.method === 'GET' &&
          url.pathname === '/courses/7/reviews' &&
          url.searchParams.size === 2 &&
          url.searchParams.get('page') === '1' &&
          url.searchParams.get('page_size') === '20'
        ) {
          if (request.signal.aborted) {
            throw new DOMException('The operation was aborted.', 'AbortError');
          }
          return new Response(emptyReviewResponseBody, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return nativeFetch(input, init);
      };
    },
    {
      catalogResponseBody: CATALOG_RESPONSE_BODY,
      emptyReviewResponseBody: EMPTY_REVIEW_RESPONSE_BODY,
    },
  );
}
