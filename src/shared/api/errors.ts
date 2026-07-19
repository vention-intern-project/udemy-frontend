export type ApiErrorKind =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'offline'
  | 'aborted'
  | 'invalid_response'
  | 'http';

export interface ApiValidationIssue {
  location: ReadonlyArray<string | number>;
  message: string;
  type: string;
}

export interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  status: number | null;
  detail?: unknown;
  issues?: readonly ApiValidationIssue[];
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly detail: unknown;
  readonly issues: readonly ApiValidationIssue[];
  readonly originalCause: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.detail = init.detail;
    this.issues = init.issues ?? [];
    this.originalCause = init.cause;
  }
}

interface FastApiIssueLike {
  loc?: unknown;
  msg?: unknown;
  type?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toValidationIssues(detail: unknown): readonly ApiValidationIssue[] {
  if (!Array.isArray(detail)) {
    return [];
  }

  return detail.flatMap((candidate: FastApiIssueLike) => {
    if (!isRecord(candidate) || !Array.isArray(candidate.loc) || typeof candidate.msg !== 'string') {
      return [];
    }

    const location = candidate.loc.filter(
      (segment): segment is string | number => typeof segment === 'string' || typeof segment === 'number',
    );

    return [{
      location,
      message: candidate.msg,
      type: typeof candidate.type === 'string' ? candidate.type : 'validation_error',
    }];
  });
}

function detailMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim() !== '') {
    return detail;
  }

  const issues = toValidationIssues(detail);
  if (issues.length > 0) {
    return issues.map((issue) => issue.message).join('; ');
  }

  return fallback;
}

function kindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation';
    case 500:
      return 'server';
    default:
      return 'http';
  }
}

export async function normalizeHttpError(response: Response): Promise<ApiError> {
  let payload: unknown;

  try {
    payload = await response.clone().json();
  } catch {
    try {
      payload = await response.clone().text();
    } catch {
      payload = undefined;
    }
  }

  const detail = isRecord(payload) && 'detail' in payload ? payload.detail : payload;
  const issues = response.status === 422 ? toValidationIssues(detail) : [];

  return new ApiError({
    kind: kindForStatus(response.status),
    status: response.status,
    detail,
    issues,
    message: detailMessage(detail, response.statusText || `Request failed with status ${response.status}`),
  });
}

export function normalizeTransportError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({
      kind: 'aborted',
      status: null,
      message: 'Request was cancelled',
      cause: error,
    });
  }

  return new ApiError({
    kind: 'offline',
    status: null,
    message: 'Unable to reach the server',
    cause: error,
  });
}
