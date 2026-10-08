import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { updatedAt } from '../../core/db/columns';
import type { BrandingGradient } from '../../shared/branding-css';

/**
 * Singleton (id 1): the default look of every quotation page and sheet. Each surface has a
 * picker gradient (null = none) and extra CSS declarations applied after it.
 */
export const branding = pgTable(
  'branding',
  {
    id: integer('id').primaryKey().default(1),
    pageGradient: jsonb('page_gradient').$type<BrandingGradient>(),
    pageCss: text('page_css').notNull().default(''),
    sheetGradient: jsonb('sheet_gradient').$type<BrandingGradient>(),
    sheetCss: text('sheet_css').notNull().default(''),
    updatedAt: updatedAt(),
  },
  (t) => [check('branding_singleton', sql`${t.id} = 1`)],
);
