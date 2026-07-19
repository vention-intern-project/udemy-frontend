import { describe, expect, it } from 'vitest';

import {
  API_OPERATIONS,
  API_OPERATION_BY_ID,
  CONTRACT_ASSUMPTIONS,
  type SelectedApiOperationId,
} from '../../../src/entities/api';
import { createApiClient, type ApiBinaryResponse } from '../../../src/shared/api';
import { createMockApiFetch } from './mock-api';

describe('deterministic API mock harness', () => {
  it('matches method/path, exposes path/query data, and integrates with the client', async () => {
    const mockFetch = createMockApiFetch([
      {
        operationId: 'API-013',
        resolve: ({ pathParams, query }) => ({
          body: {
            items: [],
            page: Number(query.get('page')),
            page_size: 20,
            total: Number(pathParams.courseId),
            pages: 1,
            has_next: false,
            has_previous: false,
          },
        }),
      },
    ]);
    const client = createApiClient({ baseUrl: 'https://api.example.test', fetch: mockFetch });

    await expect(client.request({ path: '/courses/7/enrollments', query: { page: 2 } })).resolves.toEqual({
      items: [],
      page: 2,
      page_size: 20,
      total: 7,
      pages: 1,
      has_next: false,
      has_previous: false,
    });
    expect(mockFetch.operationIds).toEqual(['API-013']);
    expect(mockFetch.assumptionTags).toEqual([CONTRACT_ASSUMPTIONS.GAP_007.code]);
  });

  it('routes valid path, query, JSON, multipart, binary, and void fixtures for every operation', async () => {
    interface RouteFixture {
      operationId: SelectedApiOperationId;
      url: string;
      init?: RequestInit;
      pathParams?: Readonly<Record<string, string>>;
      query?: Readonly<Record<string, string>>;
      jsonBody?: unknown;
      multipartBody?: Readonly<Record<string, string>>;
    }

    const jsonRequest = (method: 'POST' | 'PATCH', body: unknown): RequestInit => ({
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const upload = new FormData();
    upload.set('file', new Blob(['lesson']), 'lesson.pdf');

    const fixtures: readonly RouteFixture[] = [
      { operationId: 'API-002', url: '/cart' },
      { operationId: 'API-003', url: '/cart', init: { method: 'DELETE' } },
      { operationId: 'API-004', url: '/cart/checkout', init: { method: 'POST' } },
      { operationId: 'API-005', url: '/cart/items', init: jsonRequest('POST', { course_id: 7 }), jsonBody: { course_id: 7 } },
      { operationId: 'API-006', url: '/cart/items/7', init: { method: 'DELETE' }, pathParams: { courseId: '7' } },
      { operationId: 'API-008', url: '/courses?page=2&page_size=20&sort=-price', query: { page: '2', page_size: '20', sort: '-price' } },
      { operationId: 'API-009', url: '/courses', init: jsonRequest('POST', { title: 'APIs', price: '19.99' }), jsonBody: { title: 'APIs', price: '19.99' } },
      { operationId: 'API-010', url: '/courses/7', pathParams: { courseId: '7' } },
      { operationId: 'API-011', url: '/courses/7', init: jsonRequest('PATCH', { title: 'Typed APIs' }), pathParams: { courseId: '7' }, jsonBody: { title: 'Typed APIs' } },
      { operationId: 'API-012', url: '/courses/7', init: { method: 'DELETE' }, pathParams: { courseId: '7' } },
      { operationId: 'API-013', url: '/courses/7/enrollments?page=2&page_size=20', pathParams: { courseId: '7' }, query: { page: '2', page_size: '20' } },
      { operationId: 'API-014', url: '/courses/7/lessons?page=3&size=10', pathParams: { courseId: '7' }, query: { page: '3', size: '10' } },
      { operationId: 'API-015', url: '/courses/7/lessons', init: jsonRequest('POST', { title: 'Intro', lesson_type: 'video' }), pathParams: { courseId: '7' }, jsonBody: { title: 'Intro', lesson_type: 'video' } },
      { operationId: 'API-016', url: '/courses/7/lessons/8', init: { method: 'DELETE' }, pathParams: { courseId: '7', lessonId: '8' } },
      { operationId: 'API-017', url: '/courses/7/lessons/8/complete', init: { method: 'POST' }, pathParams: { courseId: '7', lessonId: '8' } },
      { operationId: 'API-018', url: '/courses/7/lessons/8/incomplete', init: { method: 'POST' }, pathParams: { courseId: '7', lessonId: '8' } },
      { operationId: 'API-019', url: '/courses/7/progress', pathParams: { courseId: '7' } },
      { operationId: 'API-020', url: '/enrollments', init: jsonRequest('POST', { course_id: 7 }), jsonBody: { course_id: 7 } },
      { operationId: 'API-021', url: '/enrollments/my?page=2&page_size=20', query: { page: '2', page_size: '20' } },
      { operationId: 'API-022', url: '/enrollments/8', pathParams: { enrollmentId: '8' } },
      { operationId: 'API-023', url: '/forgot-password', init: jsonRequest('POST', { email: 'student@example.test' }), jsonBody: { email: 'student@example.test' } },
      { operationId: 'API-024', url: '/login', init: jsonRequest('POST', { email: 'student@example.test', password: 'secret' }), jsonBody: { email: 'student@example.test', password: 'secret' } },
      { operationId: 'API-025', url: '/media/lessons/lesson%20one.pdf', pathParams: { filename: 'lesson one.pdf' } },
      { operationId: 'API-026', url: '/me' },
      { operationId: 'API-029', url: '/reset-password', init: jsonRequest('POST', { token: 'reset-token', new_password: 'new-secret' }), jsonBody: { token: 'reset-token', new_password: 'new-secret' } },
      { operationId: 'API-030', url: '/lessons/8', pathParams: { lessonId: '8' } },
      { operationId: 'API-031', url: '/lessons/8', init: jsonRequest('PATCH', { title: 'Updated lesson' }), pathParams: { lessonId: '8' }, jsonBody: { title: 'Updated lesson' } },
      { operationId: 'API-032', url: '/lessons/8/upload-file', init: { method: 'POST', body: upload }, pathParams: { lessonId: '8' }, multipartBody: { file: 'lesson.pdf' } },
      { operationId: 'API-033', url: '/signup', init: jsonRequest('POST', { email: 'student@example.test', name: 'Ada', surname: 'Lovelace', password: 'secret', role: 'student' }), jsonBody: { email: 'student@example.test', name: 'Ada', surname: 'Lovelace', password: 'secret', role: 'student' } },
    ];

    const routed = new Map<SelectedApiOperationId, {
      pathParams: Readonly<Record<string, string>>;
      query: Readonly<Record<string, string>>;
      jsonBody?: unknown;
      multipartBody?: Readonly<Record<string, string>>;
    }>();
    const handlers = API_OPERATIONS.map(({ id, requestMode, responseMode }) => ({
      operationId: id,
      resolve: async ({ request, pathParams, query }: Parameters<
        import('./mock-api').MockApiResolver
      >[0]) => {
        let jsonBody: unknown;
        let multipartBody: Readonly<Record<string, string>> | undefined;
        if (requestMode === 'json') {
          jsonBody = await request.clone().json();
        } else if (requestMode === 'multipart') {
          const formData = await request.clone().formData();
          multipartBody = Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : value.name,
          ]));
        }
        routed.set(id, {
          pathParams,
          query: Object.fromEntries(query),
          jsonBody,
          multipartBody,
        });

        if (responseMode === 'void') {
          return { status: 204 };
        }
        if (responseMode === 'binary') {
          return {
            body: new Blob(['lesson'], { type: 'application/pdf' }),
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'attachment; filename="lesson one.pdf"',
            },
          };
        }
        return { body: { operation_id: id } };
      },
    }));
    const mockFetch = createMockApiFetch(handlers);

    for (const fixture of fixtures) {
      const definition = API_OPERATION_BY_ID[fixture.operationId];
      const response = await mockFetch(`https://api.example.test${fixture.url}`, {
        ...fixture.init,
        method: fixture.init?.method ?? definition.method,
      });
      const captured = routed.get(fixture.operationId);
      expect(captured, fixture.operationId).toMatchObject({
        pathParams: fixture.pathParams ?? {},
        query: fixture.query ?? {},
      });
      expect(captured?.jsonBody, fixture.operationId).toEqual(fixture.jsonBody);
      expect(captured?.multipartBody, fixture.operationId).toEqual(fixture.multipartBody);

      if (definition.responseMode === 'void') {
        expect(response.status, fixture.operationId).toBe(204);
      } else if (definition.responseMode === 'binary') {
        const binary = await createApiClient({
          fetch: async () => response,
        }).request<ApiBinaryResponse>({ path: fixture.url, responseType: 'blob' });
        expect(await binary.blob.text()).toBe('lesson');
        expect(binary).toMatchObject({
          contentType: 'application/pdf',
          contentDisposition: 'attachment; filename="lesson one.pdf"',
          filename: 'lesson one.pdf',
        });
      } else {
        await expect(response.json(), fixture.operationId).resolves.toEqual({
          operation_id: fixture.operationId,
        });
      }
    }

    expect(mockFetch.operationIds).toHaveLength(29);
    expect(new Set(mockFetch.operationIds).size).toBe(29);
    expect(mockFetch.assumptionTags).toEqual([
      CONTRACT_ASSUMPTIONS.GAP_007.code,
      CONTRACT_ASSUMPTIONS.GAP_003.code,
    ]);
  });

  it('returns FastAPI-shaped deterministic errors for missing handlers and routes', async () => {
    const mockFetch = createMockApiFetch([]);
    const known = await mockFetch('https://api.example.test/courses');
    const unknown = await mockFetch('https://api.example.test/not-an-operation');

    expect(known.status).toBe(501);
    await expect(known.json()).resolves.toEqual({ detail: 'No mock handler for API-008' });
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toEqual({ detail: 'No selected API operation matched this request' });
  });

  it('rejects duplicate handlers to avoid order-dependent mock behavior', () => {
    expect(() => createMockApiFetch([
      { operationId: 'API-002', resolve: () => ({ body: {} }) },
      { operationId: 'API-002', resolve: () => ({ body: {} }) },
    ])).toThrow('Each mock operation must have exactly one handler');
  });
});
