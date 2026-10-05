import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../core/db';
import * as schema from '../core/db/schema';

const MIGRATIONS = join(import.meta.dirname, '../../drizzle');

/**
 * In-memory Postgres with the real migrations applied. Neon's `db.batch()` (one
 * non-interactive transaction) is emulated with BEGIN/COMMIT on PGlite's single connection.
 */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    for (const statement of readFileSync(join(MIGRATIONS, file), 'utf8').split('--> statement-breakpoint')) {
      await client.exec(statement);
    }
  }

  const db = drizzle({ client, schema });
  const batch = async (queries: readonly PromiseLike<unknown>[]) => {
    await client.exec('BEGIN');
    try {
      const results: unknown[] = [];
      for (const query of queries) results.push(await query);
      await client.exec('COMMIT');
      return results;
    } catch (error) {
      await client.exec('ROLLBACK');
      throw error;
    }
  };
  return Object.assign(db, { batch }) as unknown as Db;
}
