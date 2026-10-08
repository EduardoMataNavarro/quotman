import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, deletedAt, updatedAt } from '../../core/db/columns';

/** Offered services: the catalog. Quotation lines copy from it; editing it never changes a line. */
export const offeredServices = pgTable('offered_services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  unitPriceCents: integer('unit_price_cents').notNull(),
  unit: text('unit').notNull().default('servicio'),
  defaultSection: text('default_section'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export type OfferedServiceRow = typeof offeredServices.$inferSelect;
