import { date, index, integer, jsonb, numeric, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, isoTimestamp, updatedAt } from '../../core/db/columns';
import { services } from '../catalog/catalog.model';
import { clients } from '../clients/clients.model';
import type { QuotationActionType, QuotationEventType, QuotationStatus } from './quotations.enum';

export const quotations = pgTable(
  'quotations',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    folio: text('folio').notNull().unique(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    status: text('status').$type<QuotationStatus>().notNull().default('draft'),
    currency: text('currency').$type<'MXN'>().notNull().default('MXN'),
    taxRateBp: integer('tax_rate_bp').notNull().default(1600),
    issuedOn: date('issued_on', { mode: 'string' }).notNull(),
    validUntil: date('valid_until', { mode: 'string' }).notNull(),
    terms: jsonb('terms').$type<string[]>().notNull().default([]),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    publishedVersion: integer('published_version'),
    sentAt: isoTimestamp('sent_at'),
    viewedAt: isoTimestamp('viewed_at'),
    decidedAt: isoTimestamp('decided_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('quotations_status_idx').on(t.status), index('quotations_client_idx').on(t.clientId)],
);

/** Every line belongs to a stage; a stage with no name renders an empty stage cell. */
export const quotationStages = pgTable(
  'quotation_stages',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    name: text('name'),
    position: integer('position').notNull(),
  },
  (t) => [index('quotation_stages_quotation_idx').on(t.quotationId)],
);

export const quotationLines = pgTable(
  'quotation_lines',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    stageId: text('stage_id')
      .notNull()
      .references(() => quotationStages.id, { onDelete: 'cascade' }),
    /** Reference only: title, description and price are copied when the line is created. */
    serviceId: text('service_id').references(() => services.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    qty: numeric('qty', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [index('quotation_lines_quotation_idx').on(t.quotationId)],
);

export const quotationActions = pgTable(
  'quotation_actions',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    type: text('type').$type<QuotationActionType>().notNull(),
    message: text('message'),
    signerName: text('signer_name'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('quotation_actions_quotation_idx').on(t.quotationId)],
);

export const quotationEvents = pgTable(
  'quotation_events',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    type: text('type').$type<QuotationEventType>().notNull(),
    at: isoTimestamp('at').notNull().defaultNow(),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('quotation_events_quotation_idx').on(t.quotationId)],
);

/** One row per year; bumped and read in the same transaction that inserts the quotation. */
export const folioCounters = pgTable('folio_counters', {
  year: integer('year').primaryKey(),
  lastNumber: integer('last_number').notNull(),
});

export type QuotationRow = typeof quotations.$inferSelect;
export type StageRow = typeof quotationStages.$inferSelect;
export type LineRow = typeof quotationLines.$inferSelect;
