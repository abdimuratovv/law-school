import type { AuthenticatedUser } from '../../shared/contracts/auth';
import type { GoogleProfile } from '../auth/google';

export interface UserRow { id: string; display_name: string; email: string; role: AuthenticatedUser['role']; status: string; revision: number;
  first_name: string | null; last_name: string | null; patronymic: string | null; birth_date: string | null; profile_completed_at: number | null }
export const publicUser = (row: UserRow): AuthenticatedUser => ({
  id: row.id, name: row.display_name, email: row.email, role: row.role, revision: row.revision,
  profile: row.profile_completed_at !== null && row.first_name && row.last_name && row.patronymic && row.birth_date
    ? { firstName: row.first_name, lastName: row.last_name, patronymic: row.patronymic, birthDate: row.birth_date } : null,
});

export async function registerGoogleUser(db: D1Database, profile: GoogleProfile): Promise<UserRow> {
  const newId = crypto.randomUUID();
  const now = Date.now();
  // Identity uniqueness plus one atomic D1 batch handles concurrent first logins.
  await db.batch([
    db.prepare(`INSERT INTO users (id, display_name, email, created_at, updated_at)
      SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM identities WHERE provider = 'google' AND subject = ?)`)
      .bind(newId, profile.name, profile.email, now, now, profile.subject),
    db.prepare(`INSERT INTO identities (id, user_id, provider, subject, created_at)
      SELECT ?, ?, 'google', ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)`)
      .bind(crypto.randomUUID(), newId, profile.subject, now, newId),
    db.prepare(`UPDATE users SET display_name = CASE WHEN profile_completed_at IS NULL THEN ? ELSE display_name END,
      email = ?, updated_at = max(updated_at, ?), revision = revision + 1
      WHERE id = (SELECT user_id FROM identities WHERE provider = 'google' AND subject = ?)
      AND ((profile_completed_at IS NULL AND display_name != ?) OR email != ?)`)
      .bind(profile.name, profile.email, now, profile.subject, profile.name, profile.email),
  ]);
  const user = await db.prepare(`SELECT u.* FROM users u JOIN identities i ON i.user_id = u.id
    WHERE i.provider = 'google' AND i.subject = ?`).bind(profile.subject).first<UserRow>();
  if (!user) throw new Error('Identity registration failed');
  return user;
}

export async function cleanupAuthentication(db: D1Database): Promise<void> {
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM login_flows WHERE state_hash IN (SELECT state_hash FROM login_flows WHERE expires_at <= ? LIMIT 200)').bind(now),
    db.prepare('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at <= ? LIMIT 200)').bind(now),
  ]);
}
