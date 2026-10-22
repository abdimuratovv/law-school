import type { z } from 'zod';
import { MAX_JSON_BYTES } from '../../shared/contracts/constants';
import { ApiError } from './errors';

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Check the supplied fields.',
      parsed.error.issues.slice(0, 100).map(issue => ({
        path: issue.path.map(String).join('.'), code: issue.code,
      })),
    );
  }
  return parsed.data;
}

/** Enforce bytes while streaming, even when Content-Length is absent or untrusted. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const type = request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase();
  if (type !== 'application/json') {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.');
  }
  const declared = request.headers.get('Content-Length');
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_JSON_BYTES) {
    await request.body?.cancel();
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_JSON_BYTES) {
          await reader.cancel();
          throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Send a valid JSON body.');
  }
  return validate(schema, value);
}
