import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Neon over HTTP: one fetch per query, no pooled connection to manage on Workers.
 * Multi-statement writes that must be atomic go through `db.batch([...])`, which Neon runs
 * as one non-interactive transaction.
 */
export function createDb(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl), schema });
}

export type Db = ReturnType<typeof createDb>;
