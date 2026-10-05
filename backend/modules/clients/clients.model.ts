import { pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from '../../core/db/columns';

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email').notNull(),
  rfc: text('rfc'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type ClientRow = typeof clients.$inferSelect;
