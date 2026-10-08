import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { toIso } from '../../core/db/columns';
import { offeredServices, type OfferedServiceRow } from './offered-services.model';
import type { OfferedService } from './offered-services.type';

export interface OfferedServicesRepository {
  list(options: { includeInactive: boolean }): Promise<OfferedService[]>;
  findById(id: string): Promise<OfferedService | null>;
  insert(service: OfferedService): Promise<void>;
  update(id: string, changes: Partial<Omit<OfferedService, 'id' | 'createdAt'>>): Promise<void>;
  softDelete(id: string, at: string): Promise<void>;
}

export function createOfferedOfferedServicesRepository(db: Db): OfferedServicesRepository {
  const live = isNull(offeredServices.deletedAt);

  return {
    async list({ includeInactive }) {
      const rows = await db
        .select()
        .from(offeredServices)
        .where(includeInactive ? live : and(live, eq(offeredServices.active, true)))
        .orderBy(asc(offeredServices.name));
      return rows.map(toService);
    },

    async findById(id) {
      const [row] = await db.select().from(offeredServices).where(and(eq(offeredServices.id, id), live)).limit(1);
      return row ? toService(row) : null;
    },

    async insert(service) {
      await db.insert(offeredServices).values(service);
    },

    async update(id, changes) {
      await db.update(offeredServices).set(changes).where(and(eq(offeredServices.id, id), live));
    },

    async softDelete(id, at) {
      await db.update(offeredServices).set({ deletedAt: at, updatedAt: at }).where(and(eq(offeredServices.id, id), live));
    },
  };
}

function toService({ deletedAt: _deletedAt, ...row }: OfferedServiceRow): OfferedService {
  return { ...row, createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt) };
}
