import { and, asc, desc, eq, inArray, isNull, ne, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Db } from '../../core/db';
import { toIso } from '../../core/db/columns';
import { QuotationStatus } from './quotations.enum';
import {
  folioCounters,
  quotationLines,
  quotationSections,
  quotations,
  type LineRow,
  type QuotationRow,
  type SectionRow,
} from './quotations.model';
import type { LineRecord, QuotationRecord, SectionRecord } from './quotations.type';

/** Quotation columns the editor writes. */
export type QuotationFields = Pick<
  QuotationRecord,
  'clientId' | 'title' | 'issuedOn' | 'validUntil' | 'taxRateBp' | 'terms' | 'notes' | 'pageGradient' | 'pageCss' | 'sheetGradient' | 'sheetCss'
>;

export type QuotationContent = Pick<QuotationRecord, 'sections' | 'unsectionedLines'>;

export interface NewQuotation extends QuotationFields, QuotationContent {
  id: string;
  slug: string;
  createdAt: string;
}

export type QuotationHeader = Omit<QuotationRecord, 'sections' | 'unsectionedLines'>;

export interface QuotationsRepository {
  list(filter: { status?: QuotationStatus }): Promise<QuotationHeader[]>;
  /** Qty and price of every line of the given quotations, for list totals. */
  linePrices(quotationIds: string[]): Promise<{ quotationId: string; qty: number; unitPriceCents: number }[]>;
  findById(id: string): Promise<QuotationRecord | null>;
  findBySlug(slug: string): Promise<QuotationRecord | null>;
  /** Assigns the next `YYYY-NNN` folio in the same transaction. Returns the folio. */
  create(quotation: NewQuotation, year: number): Promise<string>;
  /** Replaces fields, sections and lines in one transaction. */
  saveContent(id: string, changes: QuotationFields & { revision: number; updatedAt: string }, content: QuotationContent): Promise<void>;
  setStatus(id: string, changes: Pick<QuotationRecord, 'status' | 'archivedFrom' | 'updatedAt'>): Promise<void>;
  softDelete(id: string, at: string): Promise<void>;
}

export function createQuotationsRepository(db: Db): QuotationsRepository {
  const live = isNull(quotations.deletedAt);

  async function load(where: SQL): Promise<QuotationRecord | null> {
    const [row] = await db.select().from(quotations).where(and(where, live)).limit(1);
    if (!row) return null;

    const [sections, lines] = await Promise.all([
      db.select().from(quotationSections).where(eq(quotationSections.quotationId, row.id)).orderBy(asc(quotationSections.position)),
      db.select().from(quotationLines).where(eq(quotationLines.quotationId, row.id)).orderBy(asc(quotationLines.position)),
    ]);
    return { ...toHeader(row), ...toContent(sections, lines) };
  }

  function contentInserts(quotationId: string, { sections, unsectionedLines }: QuotationContent) {
    const items: BatchItem<'pg'>[] = [];
    if (sections.length) {
      items.push(
        db.insert(quotationSections).values(sections.map((s) => ({ id: s.id, quotationId, name: s.name, position: s.position }))),
      );
    }
    const lines = [
      ...sections.flatMap((s) => s.lines.map((l) => ({ ...l, sectionId: s.id, quotationId }))),
      ...unsectionedLines.map((l) => ({ ...l, sectionId: null, quotationId })),
    ];
    if (lines.length) items.push(db.insert(quotationLines).values(lines));
    return items;
  }

  return {
    async list({ status }) {
      const rows = await db
        .select()
        .from(quotations)
        .where(and(live, status ? eq(quotations.status, status) : ne(quotations.status, QuotationStatus.Archived)))
        .orderBy(desc(quotations.updatedAt));
      return rows.map(toHeader);
    },

    async linePrices(quotationIds) {
      if (!quotationIds.length) return [];
      return db
        .select({ quotationId: quotationLines.quotationId, qty: quotationLines.qty, unitPriceCents: quotationLines.unitPriceCents })
        .from(quotationLines)
        .where(inArray(quotationLines.quotationId, quotationIds));
    },

    findById: (id) => load(eq(quotations.id, id)),

    findBySlug: (slug) => load(eq(quotations.slug, slug)),

    async create(q, year) {
      const bumpFolio = db
        .insert(folioCounters)
        .values({ year, lastNumber: 1 })
        .onConflictDoUpdate({ target: folioCounters.year, set: { lastNumber: sql`${folioCounters.lastNumber} + 1` } });
      const insert = db
        .insert(quotations)
        .values({
          id: q.id,
          slug: q.slug,
          folio: sql`(select ${String(year)} || '-' || lpad(${folioCounters.lastNumber}::text, 3, '0') from ${folioCounters} where ${folioCounters.year} = ${year})`,
          clientId: q.clientId,
          title: q.title,
          issuedOn: q.issuedOn,
          validUntil: q.validUntil,
          taxRateBp: q.taxRateBp,
          terms: q.terms,
          notes: q.notes,
          pageGradient: q.pageGradient,
          pageCss: q.pageCss,
          sheetGradient: q.sheetGradient,
          sheetCss: q.sheetCss,
          createdAt: q.createdAt,
          updatedAt: q.createdAt,
        })
        .returning({ folio: quotations.folio });

      const [, inserted] = await db.batch([bumpFolio, insert, ...contentInserts(q.id, q)]);
      return (inserted as { folio: string }[])[0].folio;
    },

    async saveContent(id, changes, content) {
      await db.batch([
        db.update(quotations).set(changes).where(eq(quotations.id, id)),
        db.delete(quotationLines).where(eq(quotationLines.quotationId, id)),
        db.delete(quotationSections).where(eq(quotationSections.quotationId, id)),
        ...contentInserts(id, content),
      ]);
    },

    async setStatus(id, changes) {
      await db.update(quotations).set(changes).where(and(eq(quotations.id, id), live));
    },

    async softDelete(id, at) {
      await db.update(quotations).set({ deletedAt: at, updatedAt: at }).where(and(eq(quotations.id, id), live));
    },
  };
}

function toHeader({ deletedAt: _deletedAt, ...row }: QuotationRow): QuotationHeader {
  return {
    ...row,
    sentAt: toIso(row.sentAt),
    decidedAt: toIso(row.decidedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toLine({ id, offeredServiceId, title, description, qty, unitPriceCents, position }: LineRow): LineRecord {
  return { id, offeredServiceId, title, description, qty, unitPriceCents, position };
}

function toContent(sections: SectionRow[], lines: LineRow[]): QuotationContent {
  return {
    sections: sections.map(
      (section): SectionRecord => ({
        id: section.id,
        name: section.name,
        position: section.position,
        lines: lines.filter((line) => line.sectionId === section.id).map(toLine),
      }),
    ),
    unsectionedLines: lines.filter((line) => line.sectionId === null).map(toLine),
  };
}
