import { asc, eq } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { services, type ServiceRow } from './catalog.model';
import type { CatalogItem } from './catalog.type';

export interface CatalogRepository {
  list(options: { includeArchived: boolean }): Promise<CatalogItem[]>;
  findById(id: string): Promise<CatalogItem | null>;
  insert(item: CatalogItem): Promise<void>;
  update(id: string, changes: Partial<Omit<CatalogItem, 'id' | 'createdAt'>>): Promise<void>;
}

export function createCatalogRepository(db: Db): CatalogRepository {
  return {
    async list({ includeArchived }) {
      const rows = await db
        .select()
        .from(services)
        .where(includeArchived ? undefined : eq(services.active, true))
        .orderBy(asc(services.name));
      return rows.map(toItem);
    },

    async findById(id) {
      const [row] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      return row ? toItem(row) : null;
    },

    async insert(item) {
      await db.insert(services).values(item);
    },

    async update(id, changes) {
      await db.update(services).set(changes).where(eq(services.id, id));
    },
  };
}

function toItem(row: ServiceRow): CatalogItem {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
