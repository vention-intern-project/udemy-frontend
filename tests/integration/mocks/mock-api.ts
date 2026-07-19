import {
  API_OPERATION_BY_ID,
  type ContractAssumptionCode,
  type SelectedApiOperationId,
} from '../../../src/entities/api';

export interface MockApiRequest {
  operationId: SelectedApiOperationId;
  request: Request;
  pathParams: Readonly<Record<string, string>>;
  query: URLSearchParams;
}

export interface MockApiResponse {
  status?: number;
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
}

export type MockApiResolver = (request: MockApiRequest) => MockApiResponse | Promise<MockApiResponse>;

export interface MockApiHandler {
  operationId: SelectedApiOperationId;
  resolve: MockApiResolver;
}

export type MockApiFetch = ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) & {
  readonly operationIds: readonly SelectedApiOperationId[];
  readonly assumptionTags: readonly ContractAssumptionCode[];
};

function compilePath(path: string): { pattern: RegExp; names: readonly string[] } {
  const names: string[] = [];
  const escaped = path
    .split('/')
    .map((part) => {
      if (!part.startsWith(':')) {
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      names.push(part.slice(1));
      return '([^/]+)';
    })
    .join('/');

  return { pattern: new RegExp(`^${escaped}$`), names };
}

function responseFrom(spec: MockApiResponse): Response {
  const status = spec.status ?? 200;
  const headers = new Headers(spec.headers);

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  if (spec.body instanceof Blob || typeof spec.body === 'string') {
    return new Response(spec.body, { status, headers });
  }

  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(spec.body ?? null), { status, headers });
}

export function createMockApiFetch(handlers: readonly MockApiHandler[]): MockApiFetch {
  const handlerById = new Map(handlers.map((handler) => [handler.operationId, handler]));
  if (handlerById.size !== handlers.length) {
    throw new Error('Each mock operation must have exactly one handler');
  }

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request
      ? new Request(input, init)
      : new Request(new URL(String(input), 'http://mock.local'), init);
    const url = new URL(request.url);

    for (const [operationId, definition] of Object.entries(API_OPERATION_BY_ID) as Array<
      [SelectedApiOperationId, (typeof API_OPERATION_BY_ID)[SelectedApiOperationId]]
    >) {
      if (definition.method !== request.method) {
        continue;
      }
      const compiled = compilePath(definition.path);
      const match = compiled.pattern.exec(url.pathname);
      if (!match) {
        continue;
      }

      const handler = handlerById.get(operationId);
      if (!handler) {
        return responseFrom({ status: 501, body: { detail: `No mock handler for ${operationId}` } });
      }

      const pathParams = Object.fromEntries(
        compiled.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]),
      );
      return responseFrom(await handler.resolve({
        operationId,
        request,
        pathParams,
        query: url.searchParams,
      }));
    }

    return responseFrom({ status: 404, body: { detail: 'No selected API operation matched this request' } });
  };

  const operationIds = Object.freeze(handlers.map((handler) => handler.operationId));
  const assumptionTags = Object.freeze(Array.from(new Set(
    operationIds.flatMap((id) => API_OPERATION_BY_ID[id].assumptionTags),
  )));

  return Object.assign(mockFetch, { operationIds, assumptionTags });
}
