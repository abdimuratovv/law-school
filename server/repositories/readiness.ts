const REQUIRED_MIGRATION = '0011_authoring_languages.sql';

/** A schema check, not a write or a scan of student data. */
export async function isDatabaseReady(db: D1Database): Promise<boolean> {
  const row = await db.prepare(
    'SELECT name FROM d1_migrations WHERE name = ? LIMIT 1',
  ).bind(REQUIRED_MIGRATION).first<{ name: string }>();
  return row?.name === REQUIRED_MIGRATION;
}
