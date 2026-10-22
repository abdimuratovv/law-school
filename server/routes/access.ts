import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { accessChangeSchema, createGroupSchema, enrollmentSchema, staffAssignmentSchema } from '../../shared/contracts/auth';
import { paginationSchema } from '../../shared/contracts/api';
import { limitMutation, requireAuthentication, requireCsrf, requireRole } from '../auth/session';
import type { ApiEnv } from '../env';
import { ApiError } from '../http/errors';
import { readJson, validate } from '../http/validation';

const staffScope = `EXISTS (SELECT 1 FROM users actor WHERE actor.id = ? AND actor.status = 'active'
  AND (actor.role = 'admin' OR (actor.role = 'teacher' AND EXISTS (
    SELECT 1 FROM group_teachers gt WHERE gt.group_id = ? AND gt.teacher_id = actor.id))))`;

async function groupId(c: Context<ApiEnv>) {
  const id = validate(z.uuid(), c.req.param('id'));
  const found = await c.env.DB.prepare(`SELECT id FROM groups WHERE id = ? AND ${staffScope}`)
    .bind(id, c.get('auth').user.id, id).first();
  if (!found) throw new ApiError(404, 'NOT_FOUND', 'Group not found.');
  return id;
}

function audit(db: D1Database, actor: string, action: string, target: string, metadata: object = {}) {
  return db.prepare(`INSERT INTO audit_events (id, actor_id, action, target_id, metadata_json, created_at)
    SELECT ?, ?, ?, ?, ?, ? WHERE changes() > 0`)
    .bind(crypto.randomUUID(), actor, action, target, JSON.stringify(metadata), Date.now());
}

export function accessRoutes() {
  const app = new Hono<ApiEnv>();
  for (const path of ['/groups', '/groups/*', '/users', '/users/*']) {
    app.use(path, requireAuthentication);
    app.use(path, async (c, next) => {
      if (!['GET', 'HEAD'].includes(c.req.method)) {
        return requireCsrf(c, async () => { await limitMutation(c); await next(); });
      }
      await next();
    });
  }

  app.get('/groups', async c => {
    const { limit, cursor } = validate(paginationSchema, { limit: c.req.query('limit'), cursor: c.req.query('cursor') });
    const actor = c.get('auth').user;
    const rows = await c.env.DB.prepare(`SELECT g.id, g.name FROM groups g WHERE g.id > ? AND (
      ? = 'admin' OR (? = 'teacher' AND EXISTS (SELECT 1 FROM group_teachers gt WHERE gt.group_id = g.id AND gt.teacher_id = ?))
      OR (? = 'student' AND EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = g.id AND gm.student_id = ?)))
      ORDER BY g.id LIMIT ?`).bind(cursor ?? '', actor.role, actor.role, actor.id, actor.role, actor.id, limit + 1).all<{ id: string; name: string }>();
    return c.json({ groups: rows.results.slice(0, limit), nextCursor: rows.results.length > limit ? rows.results[limit - 1]?.id : null });
  });

  app.post('/groups', requireRole('admin'), async c => {
    const { name } = await readJson(c.req.raw, createGroupSchema);
    const id = crypto.randomUUID(); const actor = c.get('auth').user.id;
    const results = await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO groups (id, name, created_by, created_at)
        SELECT ?, ?, id, ? FROM users WHERE id = ? AND role = 'admin' AND status = 'active'`)
        .bind(id, name, Date.now(), actor),
      audit(c.env.DB, actor, 'group.create', id),
    ]);
    if (!results[0]?.meta.changes) throw new ApiError(403, 'FORBIDDEN', 'This action is not available.');
    return c.json({ group: { id, name } }, 201);
  });

  app.get('/groups/:id/members', requireRole('admin', 'teacher'), async c => {
    const id = await groupId(c);
    const { limit, cursor } = validate(paginationSchema, { limit: c.req.query('limit'), cursor: c.req.query('cursor') });
    const rows = await c.env.DB.prepare(`SELECT u.id, u.display_name AS name, u.email
      FROM group_memberships gm JOIN users u ON u.id = gm.student_id WHERE gm.group_id = ?
      AND ${staffScope} AND u.id > ? ORDER BY u.id LIMIT ?`).bind(id, c.get('auth').user.id, id, cursor ?? '', limit + 1).all<{ id: string; name: string; email: string }>();
    return c.json({ members: rows.results.slice(0, limit), nextCursor: rows.results.length > limit ? rows.results[limit - 1]?.id : null });
  });

  app.post('/groups/:id/members', requireRole('admin', 'teacher'), async c => {
    const id = await groupId(c); const actor = c.get('auth').user.id;
    const { studentId } = await readJson(c.req.raw, enrollmentSchema);
    const results = await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO group_memberships (group_id, student_id, enrolled_by, created_at)
        SELECT ?, u.id, ?, ? FROM users u WHERE u.id = ? AND u.role = 'student' AND u.status = 'active'
        AND ${staffScope} ON CONFLICT (group_id, student_id) DO NOTHING`)
        .bind(id, actor, Date.now(), studentId, actor, id),
      audit(c.env.DB, actor, 'group.enroll', studentId, { groupId: id }),
    ]);
    if (!results[0]?.meta.changes) {
      const existing = await c.env.DB.prepare(`SELECT student_id FROM group_memberships WHERE group_id = ? AND student_id = ? AND ${staffScope}`)
        .bind(id, studentId, actor, id).first();
      if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
    }
    return c.json({ ok: true });
  });

  app.delete('/groups/:id/members/:studentId', requireRole('admin', 'teacher'), async c => {
    const id = await groupId(c); const actor = c.get('auth').user.id;
    const studentId = validate(z.uuid(), c.req.param('studentId'));
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM group_memberships WHERE group_id = ? AND student_id = ? AND ${staffScope}`)
        .bind(id, studentId, actor, id),
      audit(c.env.DB, actor, 'group.unenroll', studentId, { groupId: id }),
    ]);
    return c.json({ ok: true });
  });

  app.put('/groups/:id/teacher', requireRole('admin'), async c => {
    const id = await groupId(c); const actor = c.get('auth').user.id;
    const { teacherId } = await readJson(c.req.raw, staffAssignmentSchema);
    const results = await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO group_teachers (group_id, teacher_id, created_at)
        SELECT ?, u.id, ? FROM users u WHERE u.id = ? AND u.status = 'active' AND u.role IN ('teacher', 'admin')
        AND EXISTS (SELECT 1 FROM users a WHERE a.id = ? AND a.status = 'active' AND a.role = 'admin')
        ON CONFLICT (group_id, teacher_id) DO NOTHING`).bind(id, Date.now(), teacherId, actor),
      audit(c.env.DB, actor, 'group.assign_teacher', teacherId, { groupId: id }),
    ]);
    if (!results[0]?.meta.changes && !await c.env.DB.prepare('SELECT 1 FROM group_teachers WHERE group_id = ? AND teacher_id = ?').bind(id, teacherId).first()) {
      throw new ApiError(404, 'NOT_FOUND', 'Teacher not found.');
    }
    return c.json({ ok: true });
  });

  app.delete('/groups/:id/teachers/:teacherId', requireRole('admin'), async c => {
    const id = await groupId(c); const actor = c.get('auth').user.id;
    const teacherId = validate(z.uuid(), c.req.param('teacherId'));
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM group_teachers WHERE group_id = ? AND teacher_id = ?
        AND EXISTS (SELECT 1 FROM users a WHERE a.id = ? AND a.role = 'admin' AND a.status = 'active')`)
        .bind(id, teacherId, actor),
      audit(c.env.DB, actor, 'group.remove_teacher', teacherId, { groupId: id }),
    ]);
    return c.json({ ok: true });
  });

  app.get('/users', requireRole('admin'), async c => {
    const { limit, cursor } = validate(paginationSchema, { limit: c.req.query('limit'), cursor: c.req.query('cursor') });
    const rows = await c.env.DB.prepare(`SELECT id, display_name AS name, email, role, status, revision
      FROM users WHERE id > ? ORDER BY id LIMIT ?`).bind(cursor ?? '', limit + 1).all<{ id: string }>();
    return c.json({ users: rows.results.slice(0, limit), nextCursor: rows.results.length > limit ? rows.results[limit - 1]?.id : null });
  });

  app.patch('/users/:id/access', requireRole('admin'), async c => {
    const target = validate(z.uuid(), c.req.param('id')); const actor = c.get('auth').user.id;
    const { role, status, revision } = await readJson(c.req.raw, accessChangeSchema);
    const results = await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET role = ?, status = ?, revision = revision + 1, updated_at = max(updated_at, ?)
        WHERE id = ? AND revision = ? AND EXISTS (SELECT 1 FROM users a WHERE a.id = ? AND a.role = 'admin' AND a.status = 'active')
        AND (role != 'admin' OR status != 'active' OR (? = 'admin' AND ? = 'active')
          OR EXISTS (SELECT 1 FROM users other WHERE other.id != ? AND other.role = 'admin' AND other.status = 'active'))`)
        .bind(role, status, Date.now(), target, revision, actor, role, status, target),
      audit(c.env.DB, actor, 'user.access_change', target, { role, status }),
      c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND EXISTS (SELECT 1 FROM users WHERE id = ? AND status = 'suspended')").bind(target, target),
    ]);
    if (!results[0]?.meta.changes) throw new ApiError(409, 'CONFLICT', 'The account changed or the last administrator would be removed.');
    return c.json({ ok: true, revision: revision + 1 });
  });
  return app;
}
