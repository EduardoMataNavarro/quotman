import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, isoTimestamp } from '../../core/db/columns';
import type { SessionKind } from './auth.enum';

/** People who can sign in to the admin. Created with `npm run admin:create`. */
export const admins = pgTable('admins', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  /** `pbkdf2$<iterations>$<salt>$<hash>` (core/crypto.ts). */
  passwordHash: text('password_hash').notNull(),
  createdAt: createdAt(),
  lastLoginAt: isoTimestamp('last_login_at'),
});

/**
 * Admin and quotation sessions. Only SHA-256 of the session id is stored. `subject` is the
 * admin id or the quotation id.
 */
export const sessions = pgTable(
  'sessions',
  {
    idHash: text('id_hash').primaryKey(),
    kind: text('kind').$type<SessionKind>().notNull(),
    subject: text('subject').notNull(),
    expiresAt: isoTimestamp('expires_at').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_subject_idx').on(t.kind, t.subject)],
);

export type AdminRow = typeof admins.$inferSelect;
