import { date, index, integer, jsonb, numeric, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { createdAt, deletedAt, isoTimestamp, updatedAt } from '../../core/db/columns';
import type { BrandingGradient } from '../../shared/branding-css';
import type { QuotationDocument } from '../../shared/document';
import { clients } from '../clients/clients.model';
import { offeredServices } from '../offered-services/offered-services.model';
import type { QuotationActionType, QuotationEventType, QuotationStatus } from './quotations.enum';

export const quotations = pgTable(
  'quotations',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    /** `YYYY-NNN`; shown with the revision as `YYYY-NNN.R`. */
    folio: text('folio').notNull().unique(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    status: text('status').$type<QuotationStatus>().notNull().default('draft'),
    /** The status to return to on unarchive. */
    archivedFrom: text('archived_from').$type<QuotationStatus>(),
    currency: text('currency').$type<'MXN'>().notNull().default('MXN'),
    taxRateBp: integer('tax_rate_bp').notNull().default(1600),
    issuedOn: date('issued_on', { mode: 'string' }).notNull(),
    validUntil: date('valid_until', { mode: 'string' }).notNull(),
    terms: jsonb('terms').$type<string[]>().notNull().default([]),
    notes: text('notes'),
    /** Branding override, per piece; null falls back to the global branding. */
    pageGradient: jsonb('page_gradient').$type<BrandingGradient>(),
    pageCss: text('page_css'),
    sheetGradient: jsonb('sheet_gradient').$type<BrandingGradient>(),
    sheetCss: text('sheet_css'),
    /** Starts at 1; the first edit after a send opens the next one. */
    revision: integer('revision').notNull().default(1),
    /** Last revision sent to the client; what the client sees (quotation_revisions). */
    publishedRevision: integer('published_revision'),
    sentAt: isoTimestamp('sent_at'),
    decidedAt: isoTimestamp('decided_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('quotations_status_idx').on(t.status), index('quotations_client_idx').on(t.clientId)],
);

/** Named groups of lines (the document's "Etapa" column). */
export const quotationSections = pgTable(
  'quotation_sections',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [index('quotation_sections_quotation_idx').on(t.quotationId)],
);

/** Every line belongs to a quotation; its section is optional. */
export const quotationLines = pgTable(
  'quotation_lines',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    sectionId: text('section_id').references(() => quotationSections.id, { onDelete: 'set null' }),
    /** Reference only: title, description and price are copied when the line is created. */
    offeredServiceId: text('offered_service_id').references(() => offeredServices.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    qty: numeric('qty', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [index('quotation_lines_quotation_idx').on(t.quotationId)],
);

/** The document exactly as sent, per revision. Clients only ever see these. */
export const quotationRevisions = pgTable(
  'quotation_revisions',
  {
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    document: jsonb('document').$type<QuotationDocument>().notNull(),
    publishedAt: isoTimestamp('published_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.quotationId, t.revision] })],
);

export const quotationActions = pgTable(
  'quotation_actions',
  {
    id: text('id').primaryKey(),
    quotationId: text('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
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
export type SectionRow = typeof quotationSections.$inferSelect;
export type LineRow = typeof quotationLines.$inferSelect;
