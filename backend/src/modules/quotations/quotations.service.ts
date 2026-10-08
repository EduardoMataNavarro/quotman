import type { Clock } from '../../core/clock';
import { ConflictError, NotFoundError } from '../../core/errors';
import type { Ids } from '../../core/ids';
import { composeSurfaceCss } from '../../shared/branding-css';
import { addDays, daysBetween, isoDateInMexico } from '../../shared/dates';
import { computeTotals } from '../../shared/totals';
import type { Client, ClientsService } from '../clients';
import type { Branding, BrandingService } from '../branding';
import type { IssuerProfile, IssuerService } from '../issuer';
import type { OfferedServicesService } from '../offered-services';
import type { QuotationLineInput, SaveQuotationDto } from './quotations.dto';
import { FROZEN_STATUSES, QuotationStatus } from './quotations.enum';
import type { QuotationContent, QuotationFields, QuotationsRepository } from './quotations.repository';
import type {
  ClientRef,
  LineRecord,
  QuotationDetail,
  QuotationDocument,
  QuotationRecord,
  QuotationSummary,
} from './quotations.type';

export interface QuotationsServiceDeps {
  repo: QuotationsRepository;
  offeredServices: Pick<OfferedServicesService, 'get'>;
  clients: Pick<ClientsService, 'get' | 'getMany'>;
  issuer: Pick<IssuerService, 'require'>;
  branding: Pick<BrandingService, 'get'>;
  clock: Clock;
  ids: Ids;
}

export function createQuotationsService(deps: QuotationsServiceDeps) {
  const { repo, offeredServices, clients, issuer, branding, clock, ids } = deps;

  const today = () => isoDateInMexico(clock.now());
  const now = () => clock.now().toISOString();

  async function load(id: string): Promise<QuotationRecord> {
    const record = await repo.findById(id);
    if (!record) throw new NotFoundError('Esa cotización no existe.', 'quotation_not_found');
    return record;
  }

  async function detail(record: QuotationRecord): Promise<QuotationDetail> {
    const [client] = await clients.getMany([record.clientId]);
    return {
      ...record,
      displayFolio: displayFolio(record.folio, record.revision),
      client: toClientRef(client!),
      totals: computeTotals({ lines: allLines(record), taxRateBp: record.taxRateBp }),
      expired: isExpired(record, today()),
      hasUnpublishedChanges: hasUnpublishedChanges(record),
    };
  }

  /** Section and line records with fresh ids; lines from a service copy its current values. */
  async function buildContent(input: SaveQuotationDto): Promise<QuotationContent> {
    return {
      sections: await Promise.all(
        input.sections.map(async (section, position) => ({
          id: ids.id(),
          name: section.name,
          position,
          lines: await Promise.all(section.lines.map(buildLine)),
        })),
      ),
      unsectionedLines: await Promise.all(input.lines.map(buildLine)),
    };
  }

  async function buildLine(line: QuotationLineInput, position: number): Promise<LineRecord> {
    const service = line.offeredServiceId ? await offeredServices.get(line.offeredServiceId) : null;
    return {
      id: ids.id(),
      offeredServiceId: service?.id ?? null,
      title: line.title ?? service!.name,
      description: line.description !== undefined ? line.description || null : (service?.description ?? null),
      qty: Math.round(line.qty * 100) / 100,
      unitPriceCents: line.unitPriceCents ?? service!.unitPriceCents,
      position,
    };
  }

  function fieldsFrom(input: SaveQuotationDto): QuotationFields {
    return {
      clientId: input.clientId,
      title: input.title,
      issuedOn: input.issuedOn,
      validUntil: input.validUntil,
      taxRateBp: input.taxRateBp,
      terms: input.terms,
      notes: input.notes || null,
      pageGradient: input.branding?.pageGradient ?? null,
      pageCss: input.branding?.pageCss || null,
      sheetGradient: input.branding?.sheetGradient ?? null,
      sheetCss: input.branding?.sheetCss || null,
    };
  }

  async function create(input: SaveQuotationDto): Promise<QuotationDetail> {
    await clients.get(input.clientId);
    const id = ids.id();
    await repo.create(
      { id, slug: ids.slug(), ...fieldsFrom(input), ...(await buildContent(input)), createdAt: now() },
      Number(input.issuedOn.slice(0, 4)),
    );
    return detail(await load(id));
  }

  return {
    async list(filter: { status?: QuotationStatus }): Promise<QuotationSummary[]> {
      const records = await repo.list(filter);
      const [prices, clientRows] = await Promise.all([
        repo.linePrices(records.map((r) => r.id)),
        clients.getMany(records.map((r) => r.clientId)),
      ]);
      const clientsById = new Map(clientRows.map((c) => [c.id, c]));
      const day = today();
      return records.map((record) => {
        const client = clientsById.get(record.clientId);
        return {
          id: record.id,
          slug: record.slug,
          displayFolio: displayFolio(record.folio, record.revision),
          title: record.title,
          status: record.status,
          client: { id: record.clientId, name: client?.name ?? '', company: client?.company ?? null },
          totalCents: computeTotals({
            lines: prices.filter((p) => p.quotationId === record.id),
            taxRateBp: record.taxRateBp,
          }).totalCents,
          issuedOn: record.issuedOn,
          validUntil: record.validUntil,
          revision: record.revision,
          expired: isExpired(record, day),
          hasUnpublishedChanges: hasUnpublishedChanges(record),
          updatedAt: record.updatedAt,
        };
      });
    },

    get: async (id: string) => detail(await load(id)),

    create,

    /** Saves the whole document. Accepted, declined and archived quotations are read-only. */
    async save(id: string, input: SaveQuotationDto): Promise<QuotationDetail> {
      const current = await load(id);
      assertEditable(current);
      if (input.clientId !== current.clientId) await clients.get(input.clientId);

      // The first edit after a send opens the next revision; further edits stay in it.
      const revision = current.publishedRevision === current.revision ? current.revision + 1 : current.revision;
      await repo.saveContent(id, { ...fieldsFrom(input), revision, updatedAt: now() }, await buildContent(input));
      return detail(await load(id));
    },

    /** Puts a quotation away from any status; read-only until unarchived. */
    async archive(id: string): Promise<QuotationDetail> {
      const record = await load(id);
      if (record.status === QuotationStatus.Archived) {
        throw new ConflictError('Esta cotización ya está archivada.', 'quotation_already_archived');
      }
      await repo.setStatus(id, { status: QuotationStatus.Archived, archivedFrom: record.status, updatedAt: now() });
      return detail(await load(id));
    },

    /** Back to the status it had when archived. */
    async unarchive(id: string): Promise<QuotationDetail> {
      const record = await load(id);
      if (record.status !== QuotationStatus.Archived) {
        throw new ConflictError('Esta cotización no está archivada.', 'quotation_not_archived');
      }
      await repo.setStatus(id, {
        status: record.archivedFrom ?? QuotationStatus.Draft,
        archivedFrom: null,
        updatedAt: now(),
      });
      return detail(await load(id));
    },

    /** Copies a quotation into a new draft dated today, keeping its validity length. */
    async duplicate(id: string): Promise<QuotationDetail> {
      const source = await load(id);
      const issuedOn = today();
      const toInput = ({ offeredServiceId, title, description, qty, unitPriceCents }: LineRecord) => ({
        offeredServiceId,
        title,
        description,
        qty,
        unitPriceCents,
      });
      return create({
        clientId: source.clientId,
        title: source.title,
        issuedOn,
        validUntil: addDays(issuedOn, Math.max(0, daysBetween(source.issuedOn, source.validUntil))),
        taxRateBp: source.taxRateBp,
        terms: source.terms,
        notes: source.notes,
        branding: {
          pageGradient: source.pageGradient,
          pageCss: source.pageCss,
          sheetGradient: source.sheetGradient,
          sheetCss: source.sheetCss,
        },
        sections: source.sections.map((section) => ({ name: section.name, lines: section.lines.map(toInput) })),
        lines: source.unsectionedLines.map(toInput),
      });
    },

    /** Soft delete, only for drafts that were never sent. */
    async remove(id: string): Promise<void> {
      const record = await load(id);
      if (record.status !== QuotationStatus.Draft || record.publishedRevision !== null) {
        throw new ConflictError('Solo se pueden eliminar borradores que nunca se enviaron.', 'quotation_not_deletable');
      }
      await repo.softDelete(id, now());
    },

    /** The current revision as the client would see it once sent (admin preview). */
    async document(id: string): Promise<QuotationDocument> {
      const [record, profile, globalBranding] = await Promise.all([load(id), issuer.require(), branding.get()]);
      return toDocument(record, profile, globalBranding);
    },
  };
}

export type QuotationsService = ReturnType<typeof createQuotationsService>;

export function displayFolio(folio: string, revision: number): string {
  return `${folio}.${revision}`;
}

function allLines(record: Pick<QuotationRecord, 'sections' | 'unsectionedLines'>): LineRecord[] {
  return [...record.sections.flatMap((s) => s.lines), ...record.unsectionedLines];
}

function assertEditable(record: QuotationRecord): void {
  if (FROZEN_STATUSES.includes(record.status)) {
    throw new ConflictError(
      record.status === QuotationStatus.Archived
        ? 'Esta cotización está archivada. Desarchívala para editarla.'
        : 'Esta cotización ya fue aceptada o rechazada. Duplícala para hacer cambios.',
      'quotation_frozen',
    );
  }
}

export function isExpired(record: Pick<QuotationRecord, 'status' | 'validUntil'>, today: string): boolean {
  return record.status !== QuotationStatus.Accepted && record.validUntil < today;
}

function hasUnpublishedChanges(record: Pick<QuotationRecord, 'revision' | 'publishedRevision'>): boolean {
  return record.publishedRevision !== null && record.revision > record.publishedRevision;
}

function toClientRef({ id, name, company, email }: Client): ClientRef {
  return { id, name, company, email };
}

/** Sections in order, then the lines in no section under an empty "Etapa" cell. */
function toDocument(record: QuotationRecord, issuer: IssuerProfile, globalBranding: Branding): QuotationDocument {
  const { updatedAt: _updatedAt, ...issuerFields } = issuer;
  const toLine = ({ id, title, description, qty, unitPriceCents }: LineRecord) => ({
    id,
    title,
    description,
    qty,
    unitPriceCents,
  });
  return {
    folio: displayFolio(record.folio, record.revision),
    issuedOn: record.issuedOn,
    validUntil: record.validUntil,
    currency: record.currency,
    taxRateBp: record.taxRateBp,
    issuer: issuerFields,
    sections: [
      ...record.sections.map((section) => ({ name: section.name, lines: section.lines.map(toLine) })),
      ...(record.unsectionedLines.length ? [{ name: null, lines: record.unsectionedLines.map(toLine) }] : []),
    ],
    terms: record.terms,
    // Each piece falls back to the global one on its own; the result is plain inline CSS.
    branding: {
      pageCss: composeSurfaceCss(
        record.pageGradient ?? globalBranding.page.gradient,
        record.pageCss ?? globalBranding.page.css,
      ),
      sheetCss: composeSurfaceCss(
        record.sheetGradient ?? globalBranding.sheet.gradient,
        record.sheetCss ?? globalBranding.sheet.css,
      ),
    },
  };
}
