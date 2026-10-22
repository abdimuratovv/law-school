import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApi } from '../app';
import { account, authEnv, resetAuthDatabase } from './auth-helpers';
beforeEach(resetAuthDatabase);
const app = createApi();
const request = (path: string, method: string, headers: HeadersInit, body?: object) => app.request('https://school.test/api/v1' + path,
  { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }, authEnv);
async function group(teacherId: string) {
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO groups (id, name, created_by, created_at) VALUES (?, ?, ?, 0)').bind(id, '11-A', teacherId).run();
  await env.DB.prepare('INSERT INTO group_teachers (group_id, teacher_id, created_at) VALUES (?, ?, 0)').bind(id, teacherId).run();
  return id;
}
describe('group and staff access', () => {
  it('denies students staff APIs and hides groups they have not joined', async () => {
    const teacher = await account('teacher'); const student = await account(); const id = await group(teacher.id);
    expect((await request('/groups', 'POST', student.headers, { name: 'Forged' })).status).toBe(403);
    expect((await request(`/groups/${id}/members`, 'GET', student.headers)).status).toBe(403);
    expect(await (await request('/groups', 'GET', student.headers)).json()).toMatchObject({ groups: [] });
  });
  it('scopes enrollment to owned groups and audits a repeated enrollment only once', async () => {
    const teacher = await account('teacher'); const other = await account('teacher'); const student = await account();
    const owned = await group(teacher.id); const foreign = await group(other.id);
    expect((await request(`/groups/${foreign}/members`, 'GET', teacher.headers)).status).toBe(404);
    expect((await request(`/groups/${foreign}/members`, 'POST', teacher.headers, { studentId: student.id })).status).toBe(404);
    for (let i = 0; i < 2; i++) expect((await request(`/groups/${owned}/members`, 'POST', teacher.headers, { studentId: student.id })).status).toBe(200);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action = 'group.enroll'").first('count')).toBe(1);
    expect(await (await request('/groups', 'GET', student.headers)).json()).toMatchObject({ groups: [{ id: owned }] });
    expect((await request(`/groups/${owned}/members`, 'POST', teacher.headers, { studentId: other.id })).status).toBe(404);
    expect((await request(`/groups/${owned}/members/${student.id}`, 'DELETE', teacher.headers)).status).toBe(200);
    expect(await (await request('/groups', 'GET', student.headers)).json()).toMatchObject({ groups: [] });
  });
  it('guards role updates by admin and revision, and revokes sessions on suspension', async () => {
    const admin = await account('admin'); const teacher = await account('teacher'); const student = await account(); const path = `/users/${student.id}/access`;
    expect((await request(path, 'PATCH', teacher.headers, { role: 'admin', status: 'active', revision: 0 })).status).toBe(403);
    expect((await request(path, 'PATCH', admin.headers, { role: 'teacher', status: 'active', revision: 0 })).status).toBe(200);
    expect(await (await request('/auth/me', 'GET', student.headers)).json()).toMatchObject({ user: { role: 'teacher', revision: 1 } });
    expect((await request(path, 'PATCH', admin.headers, { role: 'student', status: 'active', revision: 0 })).status).toBe(409);
    expect((await request(path, 'PATCH', admin.headers, { role: 'teacher', status: 'suspended', revision: 1 })).status).toBe(200);
    expect((await request('/auth/me', 'GET', student.headers)).status).toBe(401);
    expect(await env.DB.prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?').bind(student.id).first('count')).toBe(0);
  });
  it('protects the last administrator and requires CSRF on staff mutations', async () => {
    const admin = await account('admin');
    expect((await request(`/users/${admin.id}/access`, 'PATCH', admin.headers, { role: 'student', status: 'active', revision: 0 })).status).toBe(409);
    expect((await request('/groups', 'POST', { ...admin.headers, 'X-CSRF-Token': '' }, { name: 'Group' })).status).toBe(403);
    expect((await request('/groups', 'POST', admin.headers, { name: 'New Group' })).status).toBe(201);
  });
  it('does not lose the final administrator during concurrent demotions', async () => {
    const a = await account('admin'); const b = await account('admin');
    const responses = await Promise.all([a, b].map(actor => request(`/users/${actor.id}/access`, 'PATCH', actor.headers,
      { role: 'student', status: 'active', revision: 0 })));
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'").first('count')).toBe(1);
  });
  it('limits the user directory to admins and removes teacher scope immediately', async () => {
    const admin = await account('admin'); const teacher = await account('teacher'); const other = await account('teacher');
    const id = await group(other.id);
    expect((await request('/users', 'GET', teacher.headers)).status).toBe(403);
    const first = await (await request('/users?limit=1', 'GET', admin.headers)).json() as { users: { id: string }[]; nextCursor: string };
    expect(first.users).toHaveLength(1); expect(first.nextCursor).toBe(first.users[0]?.id);
    const next = await (await request('/users?limit=1&cursor=' + first.nextCursor, 'GET', admin.headers)).json() as { users: { id: string }[] };
    expect(next.users[0]?.id).not.toBe(first.users[0]?.id);
    expect((await request(`/groups/${id}/teacher`, 'PUT', admin.headers, { teacherId: teacher.id })).status).toBe(200);
    expect((await request(`/groups/${id}/members`, 'GET', teacher.headers)).status).toBe(200);
    expect((await request(`/groups/${id}/teachers/${teacher.id}`, 'DELETE', admin.headers)).status).toBe(200);
    expect((await request(`/groups/${id}/members`, 'GET', teacher.headers)).status).toBe(404);
  });
});
describe('one-time operator bootstrap', () => {
  it('requires a verified registration and can be claimed only once', async () => {
    const user = await account();
    await expect(env.DB.prepare('INSERT INTO admin_bootstrap VALUES (1, ?, ?)').bind(user.id, Date.now()).run()).rejects.toThrow();
    await env.DB.prepare("INSERT INTO identities (id, user_id, provider, subject, created_at) VALUES (?, ?, 'google', ?, ?)")
      .bind(crypto.randomUUID(), user.id, 'verified-subject', Date.now()).run();
    await env.DB.prepare('INSERT INTO admin_bootstrap VALUES (1, ?, ?)').bind(user.id, Date.now()).run();
    expect(await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first('role')).toBe('admin');
    expect(await env.DB.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE action = 'admin.bootstrap'").first('count')).toBe(1);
    await expect(env.DB.prepare('INSERT INTO admin_bootstrap VALUES (1, ?, ?)').bind(user.id, Date.now()).run()).rejects.toThrow();
  });
});
