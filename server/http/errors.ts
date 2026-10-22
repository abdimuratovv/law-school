import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorResponse, ErrorCode } from '../../shared/contracts/api';
import type { ApiEnv } from '../env';

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: ErrorCode,
    message: string,
    public readonly issues?: { path: string; code: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: unknown, c: Context<ApiEnv>): Response {
  const known = error instanceof ApiError;
  if (!known) {
    // No raw exceptions, URLs, headers, payloads or provider tokens in logs.
    console.error(JSON.stringify({ event: 'api_error', requestId: c.get('requestId') }));
  }
  const body: ApiErrorResponse = {
    error: {
      code: known ? error.code : 'INTERNAL_ERROR',
      message: known ? error.message : 'An unexpected error occurred.',
      ...(known && error.issues ? { issues: error.issues } : {}),
    },
    requestId: c.get('requestId'),
  };
  return c.json(body, known ? error.status : 500);
}
