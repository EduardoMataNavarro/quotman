import { index, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, isoTimestamp } from '../../core/db/columns';
import type { SessionKind } from './auth.enum';

/**
 * Admin and quotation sessions. Only SHA-256 of the session id is stored. `subject` is the
 * admin email or the quotation id.
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

/** Admin sign-in codes: 6 digits + link token, 10 minutes, single use (PLAN.md §4.1). */
export const signInCodes = pgTable('sign_in_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: isoTimestamp('expires_at').notNull(),
  usedAt: isoTimestamp('used_at'),
  createdAt: createdAt(),
});
