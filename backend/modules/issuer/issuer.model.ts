import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { updatedAt } from '../../core/db/columns';

/** Singleton: the one row has id 1. */
export const issuerProfile = pgTable(
  'issuer_profile',
  {
    id: integer('id').primaryKey().default(1),
    name: text('name').notNull(),
    role: text('role').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    razonSocial: text('razon_social').notNull(),
    rfc: text('rfc').notNull(),
    location: text('location').notNull(),
    /** Where the logo is served from; the files module sets it on upload. */
    logoUrl: text('logo_url'),
    updatedAt: updatedAt(),
  },
  (t) => [check('issuer_profile_singleton', sql`${t.id} = 1`)],
);

export type IssuerRow = typeof issuerProfile.$inferSelect;
