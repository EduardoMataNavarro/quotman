import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** The sellable catalog. Quotation lines copy from it; editing it never changes a line. */
export const services = pgTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  unitPriceCents: integer('unit_price_cents').notNull(),
  unit: text('unit').notNull().default('servicio'),
  defaultStage: text('default_stage'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
