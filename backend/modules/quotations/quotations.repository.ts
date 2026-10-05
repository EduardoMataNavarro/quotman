import { asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { Db } from '../../core/db';
import type { QuotationStatus } from './quotations.enum';
import {
  folioCounters,
  quotationLines,
  quotationStages,
  quotations,
  type LineRow,
  type QuotationRow,
  type StageRow,
} from './quotations.model';
import type { QuotationRecord } from './quotations.type';

/** Quotation columns the editor writes. */
export type QuotationFields = Pick<
  QuotationRecord,
  'clientId' | 'title' | 'issuedOn' | 'validUntil' | 'taxRateBp' | 'terms' | 'notes'
>;

export interface NewQuotation extends QuotationFields {
  id: string;
  slug: string;
  stages: QuotationRecord['stages'];
  createdAt: string;
}

export interface QuotationsRepository {
  list(filter: { status?: QuotationStatus }): Promise<Omit<QuotationRecord, 'stages'>[]>;
  /** Qty and price of every line of the given quotations, for list totals. */
  linePrices(quotationIds: string[]): Promise<{ quotationId: string; qty: number; unitPriceCents: number }[]>;
  findById(id: string): Promise<QuotationRecord | null>;
  findBySlug(slug: string): Promise<QuotationRecord | null>;
  /** Assigns the next `COT-<year>-NNN` folio in the same transaction. Returns the folio. */
  create(quotation: NewQuotation, year: number): Promise<string>;
  /** Replaces fields, stages and lines in one transaction. */
  saveContent(
    id: string,
    changes: QuotationFields & { version: number; updatedAt: string },
    stages: QuotationRecord['stages'],
  ): Promise<void>;
  delete(id: string): Promise<void>;
}

export function createQuotationsRepository(db: Db): QuotationsRepository {
  async function load(where: SQL): Promise<QuotationRecord | null> {
    const [row] = await db.select().from(quotations).where(where).limit(1);
    if (!row) return null;

    const [stages, lines] = await Promise.all([
      db.select().from(quotationStages).where(eq(quotationStages.quotationId, row.id)).orderBy(asc(quotationStages.position)),
      db.select().from(quotationLines).where(eq(quotationLines.quotationId, row.id)).orderBy(asc(quotationLines.position)),
    ]);
    return { ...toQuotation(row), stages: toStages(stages, lines) };
  }

  function contentInserts(quotationId: string, stages: QuotationRecord['stages']) {
    const items: BatchItem<'pg'>[] = [];
    if (stages.length) {
      items.push(
        db.insert(quotationStages).values(
          stages.map((s) => ({ id: s.id, quotationId, name: s.name, position: s.position })),
        ),
      );
    }
    const lines = stages.flatMap((s) => s.lines.map((l) => ({ ...l, stageId: s.id, quotationId })));
    if (lines.length) items.push(db.insert(quotationLines).values(lines));
    return items;
  }

  return {
    async list({ status }) {
      const rows = await db
        .select()
        .from(quotations)
        .where(status ? eq(quotations.status, status) : undefined)
        .orderBy(desc(quotations.updatedAt));
      return rows.map(toQuotation);
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
          folio: sql`(select 'COT-' || ${String(year)} || '-' || lpad(${folioCounters.lastNumber}::text, 3, '0') from ${folioCounters} where ${folioCounters.year} = ${year})`,
          clientId: q.clientId,
          title: q.title,
          issuedOn: q.issuedOn,
          validUntil: q.validUntil,
          taxRateBp: q.taxRateBp,
          terms: q.terms,
          notes: q.notes,
          createdAt: q.createdAt,
          updatedAt: q.createdAt,
        })
        .returning({ folio: quotations.folio });

      const [, inserted] = await db.batch([bumpFolio, insert, ...contentInserts(q.id, q.stages)]);
      return (inserted as { folio: string }[])[0].folio;
    },

    async saveContent(id, changes, stages) {
      await db.batch([
        db.update(quotations).set(changes).where(eq(quotations.id, id)),
        // Lines cascade with their stages.
        db.delete(quotationStages).where(eq(quotationStages.quotationId, id)),
        ...contentInserts(id, stages),
      ]);
    },

    async delete(id) {
      await db.delete(quotations).where(eq(quotations.id, id));
    },
  };
}

const iso = (value: string | null) => (value === null ? null : new Date(value).toISOString());

function toQuotation(row: QuotationRow): Omit<QuotationRecord, 'stages'> {
  return {
    ...row,
    sentAt: iso(row.sentAt),
    viewedAt: iso(row.viewedAt),
    decidedAt: iso(row.decidedAt),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toStages(stages: StageRow[], lines: LineRow[]): QuotationRecord['stages'] {
  return stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    position: stage.position,
    lines: lines
      .filter((line) => line.stageId === stage.id)
      .map(({ id, serviceId, title, description, qty, unitPriceCents, position }) => ({
        id, serviceId, title, description, qty, unitPriceCents, position,
      })),
  }));
}
