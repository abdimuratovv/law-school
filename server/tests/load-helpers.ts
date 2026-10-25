export interface DatabaseMetrics { calls: number; statements: number; rowsRead: number; rowsWritten: number }
export const emptyMetrics = (): DatabaseMetrics => ({ calls: 0, statements: 0, rowsRead: 0, rowsWritten: 0 });

/** Observe actual local D1 metadata, counting a batch as one binding call. */
export function meteredDatabase(db: D1Database, metrics: DatabaseMetrics, maxCalls = Infinity): D1Database {
  const originals = new WeakMap<object, D1PreparedStatement>();
  const count = (statements: number) => {
    metrics.calls++; metrics.statements += statements;
    if (metrics.calls > maxCalls) throw new Error(`D1 call budget exceeded: ${metrics.calls}`);
  };
  const record = <T>(result: D1Result<T>) => {
    metrics.rowsRead += result.meta.rows_read;
    metrics.rowsWritten += result.meta.rows_written;
    return result;
  };
  const wrap = (statement: D1PreparedStatement): D1PreparedStatement => {
    const proxy = {
      bind: (...values: unknown[]) => wrap(statement.bind(...values)),
      all: async <T>() => { count(1); return record(await statement.all<T>()); },
      run: async <T>() => { count(1); return record(await statement.run<T>()); },
      first: async <T>(column?: string) => {
        count(1);
        const row = record(await statement.all<Record<string, unknown>>()).results[0];
        return (row ? column === undefined ? row : row[column] : null) as T | null;
      },
    } as D1PreparedStatement;
    originals.set(proxy, statement);
    return proxy;
  };
  return {
    prepare: (sql: string) => wrap(db.prepare(sql)),
    batch: async <T>(statements: D1PreparedStatement[]) => {
      count(statements.length);
      return (await db.batch<T>(statements.map(statement => originals.get(statement) ?? statement))).map(record);
    },
  } as D1Database;
}
