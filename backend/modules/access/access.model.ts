import { index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, isoTimestamp } from '../../core/db/columns';
import { quotations } from '../quotations/quotations.model';

/** Magic links. Only SHA-256 of the token is stored (PLAN.md §4.3). */
export const accessLinks = pgTable(
  'access_links',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    recipientEmail: text('recipient_email').notNull(),
    expiresAt: isoTimestamp('expires_at').notNull(),
    createdAt: createdAt(),
    firstUsedAt: isoTimestamp('first_used_at'),
    lastUsedAt: isoTimestamp('last_used_at'),
    useCount: integer('use_count').notNull().default(0),
    revokedAt: isoTimestamp('revoked_at'),
  },
  (t) => [index('access_links_quotation_idx').on(t.quotationId)],
);
