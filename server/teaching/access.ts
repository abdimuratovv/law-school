import { ApiError } from '../http/errors';

export const staffActor = `EXISTS(SELECT 1 FROM users actor WHERE actor.id=? AND actor.status='active' AND actor.role IN('teacher','admin'))`;
export function ownerScope(alias:string) {
  return `EXISTS(SELECT 1 FROM users actor WHERE actor.id=? AND actor.status='active' AND (actor.role='admin' OR (actor.role='teacher' AND ${alias}.owner_id=actor.id)))`;
}
export function groupScope(groupExpression:string) {
  return `EXISTS(SELECT 1 FROM users actor WHERE actor.id=? AND actor.status='active' AND (actor.role='admin' OR (actor.role='teacher' AND EXISTS(SELECT 1 FROM group_teachers gt WHERE gt.teacher_id=actor.id AND gt.group_id=${groupExpression}))))`;
}
export const reviewScope = groupScope('(SELECT group_id FROM assignments WHERE id=a.assignment_id)');
export const unavailable = () => new ApiError(404,'NOT_FOUND','This staff record is unavailable.');
export const changed = () => new ApiError(409,'CONFLICT','The record changed. Reload before continuing.');
export function audit(db:D1Database,actor:string,action:string,target:string,metadata:object={}) {
  return db.prepare(`INSERT INTO audit_events(id,actor_id,action,target_id,metadata_json,created_at) SELECT ?,?,?,?,?,? WHERE changes()>0`)
    .bind(crypto.randomUUID(),actor,action,target,JSON.stringify(metadata),Date.now());
}
