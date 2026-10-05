import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from '../../core/db/columns';

/** The sellable catalog. Quotation lines copy from it; editing it never changes a line. */
export const services = pgTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  unitPriceCents: integer('unit_price_cents').notNull(),
  unit: text('unit').notNull().default('servicio'),
  defaultStage: text('default_stage'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type ServiceRow = typeof services.$inferSelect;
