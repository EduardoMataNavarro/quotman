import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../core/errors';
import type { SaveQuotationDto } from './quotations.dto';
import type { QuotationStatus } from './quotations.enum';
import type { QuotationsRepository } from './quotations.repository';
import { createQuotationsService, isExpired } from './quotations.service';
import type { QuotationRecord } from './quotations.type';

function record(overrides: Partial<QuotationRecord> = {}): QuotationRecord {
  return {
    id: 'q1', slug: 's', folio: 'COT-2026-001', clientId: 'c1', title: 'T', status: 'draft',
    currency: 'MXN', taxRateBp: 1600, issuedOn: '2026-10-04', validUntil: '2026-11-03', terms: [],
    notes: null, version: 1, publishedVersion: null, sentAt: null, viewedAt: null, decidedAt: null,
    createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z', stages: [],
    ...overrides,
  };
}

function setup(initial: QuotationRecord) {
  let current = initial;
  const saves: { version: number }[] = [];
  const repo: QuotationsRepository = {
    list: async () => [current],
    linePrices: async () => [],
    findById: async () => current,
    findBySlug: async () => current,
    create: async () => 'COT-2026-002',
    saveContent: async (_id, changes) => {
      saves.push(changes);
      current = { ...current, ...changes };
    },
    delete: async () => undefined,
  };
  const client = { id: 'c1', name: 'C', company: null, email: 'c@x.mx', rfc: null, createdAt: '', updatedAt: '' };
  const service = createQuotationsService({
    repo,
    catalog: { get: async () => { throw new Error('unused'); } },
    clients: { get: async () => client, getMany: async () => [client] },
    issuer: { require: async () => { throw new Error('unused'); } },
    clock: { now: () => new Date('2026-10-10T18:00:00Z') },
    ids: { id: () => 'id', slug: () => 'slug' },
  });
  return { service, saves };
}

const input: SaveQuotationDto = {
  clientId: 'c1', title: 'T', issuedOn: '2026-10-04', validUntil: '2026-11-03', taxRateBp: 1600, terms: [], stages: [],
};

describe('quotations service', () => {
  it('keeps the version while a draft was never published', async () => {
    const { service, saves } = setup(record());
    await service.save('q1', input);
    expect(saves[0].version).toBe(1);
  });

  it('opens a new version on the first edit after a publish, and only once', async () => {
    const { service, saves } = setup(record({ status: 'changes_requested', version: 2, publishedVersion: 2 }));
    await service.save('q1', input);
    await service.save('q1', input);
    expect(saves.map((s) => s.version)).toEqual([3, 3]);
  });

  it.each<QuotationStatus>(['accepted', 'rejected'])('refuses to edit a %s quotation', async (status) => {
    const { service } = setup(record({ status }));
    await expect(service.save('q1', input)).rejects.toBeInstanceOf(ConflictError);
  });

  it('refuses to delete anything a client has seen', async () => {
    const { service } = setup(record({ status: 'draft', publishedVersion: 1, version: 2 }));
    await expect(service.remove('q1')).rejects.toMatchObject({ code: 'quotation_not_deletable' });
  });

  it('computes expiry in Monterrey time and never for accepted quotations', () => {
    expect(isExpired({ status: 'sent', validUntil: '2026-10-09' }, '2026-10-10')).toBe(true);
    expect(isExpired({ status: 'sent', validUntil: '2026-10-10' }, '2026-10-10')).toBe(false);
    expect(isExpired({ status: 'accepted', validUntil: '2026-01-01' }, '2026-10-10')).toBe(false);
  });
});
