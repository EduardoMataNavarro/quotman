import { asc, eq, ilike, inArray, or } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { isForeignKeyViolation } from '../../core/db/errors';
import { clients, type ClientRow } from './clients.model';
import type { Client } from './clients.type';

export interface ClientsRepository {
  list(filter: { q?: string }): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  findByIds(ids: string[]): Promise<Client[]>;
  insert(client: Client): Promise<void>;
  update(id: string, changes: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<void>;
  /** `referenced` when quotations still point at the client. */
  delete(id: string): Promise<'deleted' | 'referenced'>;
}

export function createClientsRepository(db: Db): ClientsRepository {
  return {
    async list({ q }) {
      const pattern = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
      const rows = await db
        .select()
        .from(clients)
        .where(
          pattern
            ? or(ilike(clients.name, pattern), ilike(clients.company, pattern), ilike(clients.email, pattern))
            : undefined,
        )
        .orderBy(asc(clients.name));
      return rows.map(toClient);
    },

    async findById(id) {
      const [row] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
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
      await db.update(clients).set(changes).where(eq(clients.id, id));
    },

    async delete(id) {
      try {
        await db.delete(clients).where(eq(clients.id, id));
        return 'deleted';
      } catch (error) {
        if (isForeignKeyViolation(error)) return 'referenced';
        throw error;
      }
    },
  };
}

function toClient(row: ClientRow): Client {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
