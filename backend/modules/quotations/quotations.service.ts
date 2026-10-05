import { addDays, daysBetween, isoDateInMexico } from '../../../shared/dates';
import { computeTotals } from '../../../shared/totals';
import type { Clock } from '../../core/clock';
import { ConflictError, NotFoundError } from '../../core/errors';
import type { Ids } from '../../core/ids';
import type { CatalogService } from '../catalog';
import type { Client, ClientsService } from '../clients';
import type { IssuerService } from '../issuer';
import type { QuotationLineInput, SaveQuotationDto } from './quotations.dto';
import { FROZEN_STATUSES, QuotationStatus } from './quotations.enum';
import type { QuotationFields, QuotationsRepository } from './quotations.repository';
import type {
  ClientRef,
  LineRecord,
  QuotationDetail,
  QuotationDocument,
  QuotationRecord,
  QuotationSummary,
  StageRecord,
} from './quotations.type';

export interface QuotationsServiceDeps {
  repo: QuotationsRepository;
  catalog: Pick<CatalogService, 'get'>;
  clients: Pick<ClientsService, 'get' | 'getMany'>;
  issuer: Pick<IssuerService, 'require'>;
  clock: Clock;
  ids: Ids;
}

export function createQuotationsService(deps: QuotationsServiceDeps) {
  const { repo, catalog, clients, issuer, clock, ids } = deps;

  const today = () => isoDateInMexico(clock.now());

  async function load(id: string): Promise<QuotationRecord> {
    const record = await repo.findById(id);
    if (!record) throw new NotFoundError('Esa cotización no existe.', 'quotation_not_found');
    return record;
  }

  async function detail(record: QuotationRecord): Promise<QuotationDetail> {
    const client = await clients.get(record.clientId);
    return {
      ...record,
      client: toClientRef(client),
      totals: computeTotals({ lines: record.stages.flatMap((s) => s.lines), taxRateBp: record.taxRateBp }),
      expired: isExpired(record, today()),
      hasUnpublishedChanges: hasUnpublishedChanges(record),
    };
  }

  /** Stage and line records with fresh ids; lines from a service copy its current values. */
  async function buildStages(input: SaveQuotationDto['stages']): Promise<StageRecord[]> {
    return Promise.all(
      input.map(async (stage, stagePosition) => ({
        id: ids.id(),
        name: stage.name || null,
        position: stagePosition,
        lines: await Promise.all(stage.lines.map((line, position) => buildLine(line, position))),
      })),
    );
  }

  async function buildLine(line: QuotationLineInput, position: number): Promise<LineRecord> {
    const service = line.serviceId ? await catalog.get(line.serviceId) : null;
    return {
      id: ids.id(),
      serviceId: service?.id ?? null,
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
    };
  }

  async function create(input: SaveQuotationDto): Promise<QuotationDetail> {
    await clients.get(input.clientId);
    const id = ids.id();
    await repo.create(
      {
        id,
        slug: ids.slug(),
        ...fieldsFrom(input),
        stages: await buildStages(input.stages),
        createdAt: clock.now().toISOString(),
      },
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
      const now = today();
      return records.map((record) => {
        const client = clientsById.get(record.clientId);
        return {
          id: record.id,
          slug: record.slug,
          folio: record.folio,
          title: record.title,
          status: record.status,
          client: { id: record.clientId, name: client?.name ?? '', company: client?.company ?? null },
          totalCents: computeTotals({
            lines: prices.filter((p) => p.quotationId === record.id),
            taxRateBp: record.taxRateBp,
          }).totalCents,
          issuedOn: record.issuedOn,
          validUntil: record.validUntil,
          expired: isExpired(record, now),
          hasUnpublishedChanges: hasUnpublishedChanges(record),
          updatedAt: record.updatedAt,
        };
      });
    },

    get: async (id: string) => detail(await load(id)),

    create,

    /** Saves the whole document. Accepted and rejected quotations are frozen. */
    async save(id: string, input: SaveQuotationDto): Promise<QuotationDetail> {
      const current = await load(id);
      assertEditable(current);
      if (input.clientId !== current.clientId) await clients.get(input.clientId);

      // The first edit after a publish opens a new version; further edits stay in it.
      const version = current.publishedVersion === current.version ? current.version + 1 : current.version;
      await repo.saveContent(
        id,
        { ...fieldsFrom(input), version, updatedAt: clock.now().toISOString() },
        await buildStages(input.stages),
      );
      return detail(await load(id));
    },

    /** Copies a quotation into a new draft dated today, keeping its validity length. */
    async duplicate(id: string): Promise<QuotationDetail> {
      const source = await load(id);
      const issuedOn = today();
      return create({
        clientId: source.clientId,
        title: source.title,
        issuedOn,
        validUntil: addDays(issuedOn, Math.max(0, daysBetween(source.issuedOn, source.validUntil))),
        taxRateBp: source.taxRateBp,
        terms: source.terms,
        notes: source.notes,
        stages: source.stages.map((stage) => ({
          name: stage.name,
          lines: stage.lines.map(({ serviceId, title, description, qty, unitPriceCents }) => ({
            serviceId,
            title,
            description,
            qty,
            unitPriceCents,
          })),
        })),
      });
    },

    /** Only drafts that were never published; anything a client has seen stays on record. */
    async remove(id: string): Promise<void> {
      const record = await load(id);
      if (record.status !== QuotationStatus.Draft || record.publishedVersion !== null) {
        throw new ConflictError(
          'Solo se pueden eliminar borradores que nunca se enviaron.',
          'quotation_not_deletable',
        );
      }
      await repo.delete(id);
    },

    /** What the client page and the PDF draw. */
    async document(id: string): Promise<QuotationDocument> {
      return toDocument(await load(id), await issuer.require());
    },
  };
}

export type QuotationsService = ReturnType<typeof createQuotationsService>;

function assertEditable(record: QuotationRecord): void {
  if (FROZEN_STATUSES.includes(record.status)) {
    throw new ConflictError(
      'Esta cotización ya fue aceptada o rechazada. Duplícala para hacer cambios.',
      'quotation_frozen',
    );
  }
}

export function isExpired(record: Pick<QuotationRecord, 'status' | 'validUntil'>, today: string): boolean {
  return record.status !== QuotationStatus.Accepted && record.validUntil < today;
}

function hasUnpublishedChanges(record: Pick<QuotationRecord, 'version' | 'publishedVersion'>): boolean {
  return record.publishedVersion !== null && record.version > record.publishedVersion;
}

function toClientRef({ id, name, company, email }: Client): ClientRef {
  return { id, name, company, email };
}

function toDocument(record: QuotationRecord, issuer: Awaited<ReturnType<IssuerService['require']>>): QuotationDocument {
  const { updatedAt: _updatedAt, ...issuerFields } = issuer;
  return {
    folio: record.folio,
    issuedOn: record.issuedOn,
    validUntil: record.validUntil,
    currency: record.currency,
    taxRateBp: record.taxRateBp,
    issuer: issuerFields,
    stages: record.stages.map((stage) => ({
      name: stage.name,
      lines: stage.lines.map(({ id, title, description, qty, unitPriceCents }) => ({
        id,
        title,
        description,
        qty,
        unitPriceCents,
      })),
    })),
    terms: record.terms,
  };
}
