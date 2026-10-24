import { attemptSchema, type ServerAttempt } from '../../shared/contracts/exams';

import { ExamError } from './requestError';
export { ExamError } from './requestError';
export async function examRequest<T>(path: string, csrf?: string | null, body?: unknown): Promise<T> {
  const response = await fetch('/api/v1' + path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000),
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' }, body: JSON.stringify(body) }) });
  if (!response.ok) throw new ExamError(response.status, 'The request could not be completed.');
  return await response.json() as T;
}
export async function fetchAttempt(id: string): Promise<ServerAttempt> { return attemptSchema.parse(await examRequest('/attempts/' + encodeURIComponent(id))); }
