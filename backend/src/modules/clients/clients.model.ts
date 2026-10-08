import { pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, deletedAt, updatedAt } from '../../core/db/columns';

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email').notNull(),
  rfc: text('rfc'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

export type ClientRow = typeof clients.$inferSelect;
