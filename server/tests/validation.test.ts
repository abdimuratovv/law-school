import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MAX_JSON_BYTES, paginationSchema, saveAnswersSchema } from '../../shared/contracts/api';
import { studentQuestionSchema } from '../../shared/contracts/questions';
import { readJson, validate } from '../http/validation';

const operationId = '8f07600c-bac9-4ec1-86ec-41081f0b4ed0';
const snapshot = { revision: 0, operationId, answers: {}, flags: [] };
const jsonRequest = (body: string, headers?: HeadersInit) => new Request('https://school.test/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body,
});

describe('bounded API validation', () => {
  it('reads a valid answer snapshot and rejects private extra properties', async () => {
    expect(await readJson(jsonRequest(JSON.stringify(snapshot)), saveAnswersSchema)).toEqual(snapshot);
    await expect(readJson(jsonRequest(JSON.stringify({ ...snapshot, score: 100 })), saveAnswersSchema))
      .rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
  });

  it.each(['', '{broken', '{"secret":"not valid JSON}'])('redacts malformed input %s', async body => {
    await expect(readJson(jsonRequest(body), z.unknown()))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_JSON', message: 'Send a valid JSON body.' });
  });

  it('requires JSON media type', async () => {
    const request = new Request('https://school.test/save', { method: 'POST', body: '{}' });
    await expect(readJson(request, z.unknown())).rejects.toMatchObject({ status: 415 });
  });

  it('enforces actual streamed bytes without Content-Length', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_JSON_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const request = new Request('https://school.test/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream,
    });
    await expect(readJson(request, z.unknown())).rejects.toMatchObject({ status: 413 });
  });

  it('counts UTF-8 bytes rather than text length', async () => {
    await expect(readJson(jsonRequest(JSON.stringify('😀'.repeat(MAX_JSON_BYTES / 4))), z.string()))
      .rejects.toMatchObject({ status: 413 });
  });

  it('rejects invalid UTF-8 instead of silently replacing characters', async () => {
    const request = new Request('https://school.test/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: new Uint8Array([34, 0xff, 34]),
    });
    await expect(readJson(request, z.unknown())).rejects.toMatchObject({ status: 400 });
  });

  it('bounds answer count, Unicode length and revision', () => {
    expect(saveAnswersSchema.safeParse({ ...snapshot, answers: { q1: '😀'.repeat(1000) } }).success).toBe(true);
    for (const input of [
      { ...snapshot, answers: { q1: 'a'.repeat(1001) } },
      { ...snapshot, answers: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`q${i}`, 'A'])) },
      { ...snapshot, revision: -1 },
      { ...snapshot, revision: 1.5 },
      { ...snapshot, operationId: 'not-an-operation-id' },
    ]) expect(saveAnswersSchema.safeParse(input).success).toBe(false);
  });

  it('caps list pagination and returns field paths without submitted values', () => {
    expect(validate(paginationSchema, {})).toEqual({ limit: 25 });
    expect(validate(paginationSchema, { limit: '100' })).toEqual({ limit: 100 });
    expect(() => validate(paginationSchema, { limit: '1000000' })).toThrow();
    try { validate(saveAnswersSchema, { ...snapshot, answers: { q1: 'private-text'.repeat(100) } }); }
    catch (error) {
      expect(JSON.stringify(error)).not.toContain('private-text');
      expect(error).toMatchObject({ status: 422, issues: [{ path: 'answers.q1', code: 'custom' }] });
      return;
    }
    throw new Error('Expected validation failure.');
  });
});

describe('student question allowlist', () => {
  it('removes choice keys and nested private metadata', () => {
    const result = studentQuestionSchema.parse({
      id: 'q1', kind: 'single', topic: 'civil', stem: 'Question?',
      correct: 'opt-c', explanation: 'private-explanation', grading: { secret: true },
      options: ['a', 'b', 'c', 'd'].map(id => ({ id: `opt-${id}`, text: id, isCorrect: true })),
    });
    expect(JSON.stringify(result)).not.toMatch(/correct|Correct|grading|private-explanation/);
  });

  it('removes accepted answers from written questions', () => {
    const result = studentQuestionSchema.parse({
      id: 'q2', kind: 'written', topic: 'civil', stem: 'Question?', accepted: ['private-answer'],
    });
    expect(result).toEqual({ id: 'q2', kind: 'written', topic: 'civil', stem: 'Question?' });
  });

  it('rejects duplicate option IDs', () => {
    expect(studentQuestionSchema.safeParse({
      id: 'q1', kind: 'single', topic: 'civil', stem: 'Question?',
      options: Array.from({ length: 4 }, () => ({ id: 'same', text: 'Option' })),
    }).success).toBe(false);
  });
});
