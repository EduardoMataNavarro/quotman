import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../core/errors';
import type { OfferedServicesRepository } from './offered-services.repository';
import { createOfferedOfferedServicesService } from './offered-services.service';
import type { OfferedService } from './offered-services.type';

function fakeRepo(): OfferedServicesRepository {
  const rows = new Map<string, OfferedService>();
  return {
    async list({ includeInactive }) {
      return [...rows.values()].filter((s) => includeInactive || s.active);
    },
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async insert(service) {
      rows.set(service.id, service);
    },
    async update(id, changes) {
      rows.set(id, { ...rows.get(id)!, ...changes });
    },
    async softDelete(id) {
      rows.delete(id);
    },
  };
}

function setup() {
  let tick = Date.parse('2026-10-05T12:00:00Z');
  let seq = 0;
  return createOfferedOfferedServicesService({
    repo: fakeRepo(),
    clock: { now: () => new Date((tick += 1000)) },
    ids: { id: () => `id-${++seq}`, slug: () => 'slug' },
  });
}

describe('offered services service', () => {
  it('creates an active service with integer cents and timestamps', async () => {
    const service = await setup().create({ name: 'Servidor', unitPriceCents: 1_500_000, unit: 'servicio' });
    expect(service).toMatchObject({ id: 'id-1', active: true, description: null, defaultSection: null });
    expect(service.createdAt).toBe(service.updatedAt);
  });

  it('deactivates without deleting, and hides inactive services by default', async () => {
    const services = setup();
    const created = await services.create({ name: 'Diseño', unitPriceCents: 800_000, unit: 'servicio' });
    const inactive = await services.update(created.id, { active: false });
    expect(inactive.updatedAt > created.updatedAt).toBe(true);
    expect(await services.list({ includeInactive: false })).toEqual([]);
    expect(await services.list({ includeInactive: true })).toHaveLength(1);
  });

  it('keeps fields that the update leaves out', async () => {
    const services = setup();
    const created = await services.create({ name: 'API', description: 'REST', unitPriceCents: 100, unit: 'hora' });
    expect(await services.update(created.id, { unitPriceCents: 200 })).toMatchObject({ name: 'API', description: 'REST', unitPriceCents: 200 });
  });

  it('throws NotFoundError for unknown or deleted ids', async () => {
    const services = setup();
    const created = await services.create({ name: 'X', unitPriceCents: 1, unit: 'servicio' });
    await services.remove(created.id);
    await expect(services.get(created.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
