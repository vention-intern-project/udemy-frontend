import type { QueryFunctionContext } from '@tanstack/react-query';

import {
  API_OPERATION_BY_ID,
  API_OPERATION_METADATA_BY_ID,
  type SelectedApiOperationId,
} from '@entities/api';
import type { ApiRequestOptions } from '@shared/api';
import type { SessionContextValue } from './SessionProvider';

type SessionRequester = SessionContextValue['requestPublic'];

function operationPathMatches(template: string, actual: string): boolean {
  const templateSegments = template.split('/');
  const actualSegments = actual.split('/');
  return templateSegments.length === actualSegments.length
    && templateSegments.every((segment, index) => (
      segment.startsWith(':') ? Boolean(actualSegments[index]) : segment === actualSegments[index]
    ));
}

function assertOperationRequest(
  operationId: SelectedApiOperationId,
  options: ApiRequestOptions,
): void {
  const operation = API_OPERATION_BY_ID[operationId];
  const metadata = API_OPERATION_METADATA_BY_ID[operationId];
  if (options.method !== undefined && options.method !== operation.method) {
    throw new Error(`Method does not match ${operationId}`);
  }
  if (!operationPathMatches(operation.path, options.path)) {
    throw new Error(`Path does not match ${operationId}`);
  }
  if (options.authPolicy !== undefined && options.authPolicy !== metadata.authPolicy) {
    throw new Error(`Auth policy does not match ${operationId}`);
  }
}

export function selectOperationRequester(
  session: SessionContextValue,
  operationId: SelectedApiOperationId,
): SessionRequester {
  const policy = API_OPERATION_METADATA_BY_ID[operationId].authPolicy;
  if (policy === 'public') return session.requestPublic;
  if (policy === 'required') return session.requestRequired;
  return session.requestOptional;
}

export function requestOperation<TResponse, TBody = unknown>(
  session: SessionContextValue,
  operationId: SelectedApiOperationId,
  options: ApiRequestOptions<TBody, TResponse>,
): Promise<TResponse> {
  const metadata = API_OPERATION_METADATA_BY_ID[operationId];
  const operation = API_OPERATION_BY_ID[operationId];
  assertOperationRequest(operationId, options);
  return selectOperationRequester(session, operationId)<TResponse, TBody>({
    ...options,
    method: operation.method,
    authPolicy: metadata.authPolicy,
  });
}

export function createOperationQueryFn<TResponse, TBody = unknown>(
  session: SessionContextValue,
  operationId: SelectedApiOperationId,
  options: ApiRequestOptions<TBody, TResponse>,
) {
  return ({ signal }: QueryFunctionContext): Promise<TResponse> => requestOperation(
    session,
    operationId,
    { ...options, signal },
  );
}
