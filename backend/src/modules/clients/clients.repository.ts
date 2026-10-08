import { and, asc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { toIso } from '../../core/db/columns';
import { clients, type ClientRow } from './clients.model';
import type { Client } from './clients.type';

export interface ClientsRepository {
  list(filter: { q?: string }): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  /** Includes soft-deleted clients: existing quotations still show who they were for. */
  findByIds(ids: string[]): Promise<Client[]>;
  insert(client: Client): Promise<void>;
  update(id: string, changes: Partial<Omit<Client, 'id' | 'createdAt' | 'deletedAt'>>): Promise<void>;
  softDelete(id: string, at: string): Promise<void>;
}

export function createClientsRepository(db: Db): ClientsRepository {
  const live = isNull(clients.deletedAt);

  return {
    async list({ q }) {
      const pattern = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
      const rows = await db
        .select()
        .from(clients)
        .where(
          pattern
            ? and(live, or(ilike(clients.name, pattern), ilike(clients.company, pattern), ilike(clients.email, pattern)))
            : live,
        )
        .orderBy(asc(clients.name));
      return rows.map(toClient);
    },

    async findById(id) {
      const [row] = await db.select().from(clients).where(and(eq(clients.id, id), live)).limit(1);
      return row ? toClient(row) : null;
    },

    async findByIds(ids) {
      if (!ids.length) return [];
      const rows = await db.select().from(clients).where(inArray(clients.id, ids));
      return rows.map(toClient);
    },

    async insert(client) {
      await db.insert(clients).values(client);
    },

    async update(id, changes) {
      await db.update(clients).set(changes).where(and(eq(clients.id, id), live));
    },

    async softDelete(id, at) {
      await db.update(clients).set({ deletedAt: at, updatedAt: at }).where(and(eq(clients.id, id), live));
    },
  };
}

function toClient(row: ClientRow): Client {
  return { ...row, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt), deletedAt: toIso(row.deletedAt) };
}
