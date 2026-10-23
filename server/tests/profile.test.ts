import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApi } from '../app';
import { currentUserSchema } from '../../shared/contracts/auth';
import { registerGoogleUser } from '../repositories/auth';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';

beforeEach(resetAuthDatabase);
const details = { firstName: '  Aziz  ', lastName: 'Abdimuratov', patronymic: 'O‘ktam o‘g‘li', birthDate: '2003-02-28', revision: 0 };
const app = createApi();
const url = 'https://school.test/api/v1/auth/profile';
const save = (headers: Record<string, string>, body: unknown = details) => app.request(url, { method: 'PUT', headers, body: JSON.stringify(body) }, authEnv);
async function me(headers: Record<string, string>) {
  return currentUserSchema.parse(await (await app.request('https://school.test/api/v1/auth/me', { headers }, authEnv)).json()).user;
}

describe('persistent personal profiles', () => {
  it('starts incomplete, saves all fields once and supports later editing for students and admins', async () => {
    for (const role of ['student', 'admin'] as const) {
      const owner = await account(role);
      expect((await me(owner.headers)).profile).toBeNull();
      expect((await save(owner.headers)).status).toBe(200);
      expect(await me(owner.headers)).toMatchObject({ name: 'Aziz Abdimuratov', role, revision: 1,
        profile: { firstName: 'Aziz', lastName: details.lastName, patronymic: details.patronymic, birthDate: details.birthDate } });
      const first = await env.DB.prepare('SELECT profile_completed_at FROM users WHERE id = ?').bind(owner.id).first('profile_completed_at');
      expect(first).toBeTypeOf('number');
      expect((await save(owner.headers, { ...details, birthDate: '2004-02-29', revision: 1 })).status).toBe(200);
      expect((await me(owner.headers)).profile?.birthDate).toBe('2004-02-29');
      expect(await env.DB.prepare('SELECT profile_completed_at FROM users WHERE id = ?').bind(owner.id).first('profile_completed_at')).toBe(first);
    }
  });
  it('updates only the session owner and rejects role or target injection', async () => {
    const owner = await account(); const other = await account();
    expect((await save(owner.headers, { ...details, userId: other.id })).status).toBe(422);
    expect((await save(owner.headers, { ...details, role: 'admin' })).status).toBe(422);
    expect((await save(owner.headers)).status).toBe(200);
    expect((await me(other.headers)).profile).toBeNull();
    expect((await me(owner.headers)).role).toBe('student');
  });
  it('requires authentication and same-origin, session-bound CSRF', async () => {
    const owner = await account(); const other = await account();
    expect((await save({ 'Content-Type': 'application/json' })).status).toBe(401);
    for (const headers of [{ ...owner.headers, Origin: 'https://evil.test' }, { ...owner.headers, 'X-CSRF-Token': other.csrf }]) {
      expect((await save(headers)).status).toBe(403);
    }
    expect((await me(owner.headers)).profile).toBeNull();
  });
  it.each([
    { firstName: '   ' }, { patronymic: '' }, { lastName: 'a'.repeat(101) }, { firstName: 'A\nB' },
    { birthDate: '2003-02-29' }, { birthDate: '2020-04-31' }, { birthDate: '2999-01-01' },
    { birthDate: '1899-12-31' }, { birthDate: '01/02/2003' }, { birthDate: null },
  ])('rejects invalid input %j without partial completion', async change => {
    const owner = await account();
    expect((await save(owner.headers, { ...details, ...change })).status).toBe(422);
    expect((await me(owner.headers)).profile).toBeNull();
  });
  it('rejects stale revisions instead of losing edits', async () => {
    const owner = await account();
    const responses = await Promise.all([save(owner.headers), save(owner.headers, { ...details, firstName: 'Other' })]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await me(owner.headers)).revision).toBe(1);
  });
  it('retains saved names and birth date when Google changes its display name or email', async () => {
    const google = { subject: 'stable-profile', name: 'Google Name', email: 'first@example.test' };
    const owner = await account();
    await env.DB.prepare("INSERT INTO identities (id,user_id,provider,subject,created_at) VALUES (?,?,'google',?,?)")
      .bind(crypto.randomUUID(), owner.id, google.subject, Date.now()).run();
    await save(owner.headers);
    await registerGoogleUser(env.DB, { ...google, name: 'Changed Google Name', email: 'new@example.test' });
    expect(await me(owner.headers)).toMatchObject({ name: 'Aziz Abdimuratov', email: 'new@example.test', profile: { birthDate: details.birthDate } });
  });
  it('keeps full long names within the existing bounded display-name column', async () => {
    const owner = await account();
    expect((await save(owner.headers, { ...details, firstName: 'A'.repeat(100), lastName: 'B'.repeat(100) })).status).toBe(200);
    const saved = await me(owner.headers);
    expect(saved.name).toHaveLength(100); expect(saved.profile?.lastName).toHaveLength(100);
  });
});
