import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../core/errors';
import type { SaveQuotationDto } from './quotations.dto';
import type { QuotationStatus } from './quotations.enum';
import type { QuotationsRepository } from './quotations.repository';
import { createQuotationsService, isExpired } from './quotations.service';
import type { QuotationRecord } from './quotations.type';

function record(overrides: Partial<QuotationRecord> = {}): QuotationRecord {
  return {
    id: 'q1', slug: 's', folio: '2026-001', clientId: 'c1', title: 'T', status: 'draft', archivedFrom: null,
    currency: 'MXN', taxRateBp: 1600, issuedOn: '2026-10-04', validUntil: '2026-11-03', terms: [],
    notes: null, pageGradient: null, pageCss: null, sheetGradient: null, sheetCss: null, revision: 1, publishedRevision: null, sentAt: null, decidedAt: null,
    createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z', sections: [], unsectionedLines: [],
    ...overrides,
  };
}

function setup(initial: QuotationRecord) {
  let current = initial;
  const saves: { revision: number }[] = [];
  const repo: QuotationsRepository = {
    list: async () => [current],
    linePrices: async () => [],
    findById: async () => current,
    findBySlug: async () => current,
    create: async () => '2026-002',
    saveContent: async (_id, changes) => {
      saves.push(changes);
      current = { ...current, ...changes };
    },
    setStatus: async (_id, changes) => {
      current = { ...current, ...changes };
    },
    softDelete: async () => undefined,
  };
  const client = { id: 'c1', name: 'C', company: null, email: 'c@x.mx', rfc: null, createdAt: '', updatedAt: '', deletedAt: null };
  const service = createQuotationsService({
    repo,
    offeredServices: { get: async () => { throw new Error('unused'); } },
    clients: { get: async () => client, getMany: async () => [client] },
    issuer: { require: async () => { throw new Error('unused'); } },
    branding: { get: async () => ({ page: { gradient: null, css: '' }, sheet: { gradient: null, css: '' }, updatedAt: null }) },
    clock: { now: () => new Date('2026-10-10T18:00:00Z') },
    ids: { id: () => 'id', slug: () => 'slug' },
  });
  return { service, saves };
}

const input: SaveQuotationDto = {
  clientId: 'c1', title: 'T', issuedOn: '2026-10-04', validUntil: '2026-11-03', taxRateBp: 1600, terms: [], sections: [], lines: [],
};

describe('quotations service', () => {
  it('keeps the revision while a draft was never sent', async () => {
    const { service, saves } = setup(record());
    await service.save('q1', input);
    expect(saves[0].revision).toBe(1);
  });

  it('opens the next revision on the first edit after a send, and only once', async () => {
    const { service, saves } = setup(record({ status: 'changes_requested', revision: 2, publishedRevision: 2 }));
    const first = await service.save('q1', input);
    await service.save('q1', input);
    expect(saves.map((s) => s.revision)).toEqual([3, 3]);
    expect(first).toMatchObject({ displayFolio: '2026-001.3', hasUnpublishedChanges: true });
  });

  it.each<QuotationStatus>(['accepted', 'declined', 'archived'])('refuses to edit a %s quotation', async (status) => {
    const { service } = setup(record({ status }));
    await expect(service.save('q1', input)).rejects.toBeInstanceOf(ConflictError);
  });

  it('unarchives to the status it was archived from', async () => {
    const { service } = setup(record({ status: 'changes_requested' }));
    expect((await service.archive('q1')).archivedFrom).toBe('changes_requested');
    expect((await service.unarchive('q1')).status).toBe('changes_requested');
  });

  it('refuses to delete anything that was sent', async () => {
    const { service } = setup(record({ status: 'draft', publishedRevision: 1, revision: 2 }));
    await expect(service.remove('q1')).rejects.toMatchObject({ code: 'quotation_not_deletable' });
  });

  it('computes expiry in Monterrey days and never for accepted quotations', () => {
    expect(isExpired({ status: 'sent', validUntil: '2026-10-09' }, '2026-10-10')).toBe(true);
    expect(isExpired({ status: 'sent', validUntil: '2026-10-10' }, '2026-10-10')).toBe(false);
    expect(isExpired({ status: 'accepted', validUntil: '2026-01-01' }, '2026-10-10')).toBe(false);
  });
});
