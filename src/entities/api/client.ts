import type { ApiClient, QueryValue } from '@shared/api';
import { normalizeLessonPageQuery, normalizePageQuery } from './assumptions';
import type { SelectedApiContractMap } from './contracts';
import { API_OPERATION_BY_ID, type SelectedApiOperationId } from './operations';

export interface ContractRequestOptions {
  signal?: AbortSignal;
  headers?: Readonly<Record<string, string>>;
  dedupeKey?: string;
}

export interface ContractApiClient {
  request<TId extends SelectedApiOperationId>(
    operationId: TId,
    input: SelectedApiContractMap[TId]['input'],
    options?: ContractRequestOptions,
  ): Promise<SelectedApiContractMap[TId]['response']>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolvePath(template: string, path: unknown): string {
  const parameters = isRecord(path) ? path : {};
  return template.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_, name: string) => {
    const value = parameters[name];
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new TypeError(`Missing path parameter: ${name}`);
    }
    return encodeURIComponent(String(value));
  });
}

function normalizeQuery(
  operationId: SelectedApiOperationId,
  query: unknown,
): Readonly<Record<string, QueryValue>> | undefined {
  if (!isRecord(query)) {
    return undefined;
  }

  if (operationId === 'API-014') {
    return normalizeLessonPageQuery(
      query as { page?: number; size?: number } & Readonly<Record<string, QueryValue>>,
    );
  }
  if (operationId === 'API-008' || operationId === 'API-013' || operationId === 'API-021') {
    return normalizePageQuery(
      query as { page?: number; page_size?: number } & Readonly<Record<string, QueryValue>>,
    );
  }
  return query as Readonly<Record<string, QueryValue>>;
}

export function createContractApiClient(apiClient: ApiClient): ContractApiClient {
  return {
    request<TId extends SelectedApiOperationId>(
      operationId: TId,
      input: SelectedApiContractMap[TId]['input'],
      options: ContractRequestOptions = {},
    ): Promise<SelectedApiContractMap[TId]['response']> {
      const definition = API_OPERATION_BY_ID[operationId];
      const inputRecord: Readonly<Record<string, unknown>> = isRecord(input) ? input : {};

      return apiClient.request({
        method: definition.method,
        path: resolvePath(definition.path, inputRecord.path),
        query: normalizeQuery(operationId, inputRecord.query),
        body: inputRecord.body,
        responseType: definition.responseMode === 'binary' ? 'blob' : 'json',
        signal: options.signal,
        headers: options.headers,
        dedupeKey: options.dedupeKey,
      });
    },
  };
}
