import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../core/errors';
import type { CatalogRepository } from './catalog.repository';
import { createCatalogService } from './catalog.service';
import type { CatalogItem } from './catalog.type';

function fakeRepo(): CatalogRepository & { rows: Map<string, CatalogItem> } {
  const rows = new Map<string, CatalogItem>();
  return {
    rows,
    async list({ includeArchived }) {
      return [...rows.values()].filter((item) => includeArchived || item.active);
    },
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async insert(item) {
      rows.set(item.id, item);
    },
    async update(id, changes) {
      rows.set(id, { ...rows.get(id)!, ...changes });
    },
  };
}

function setup() {
  const repo = fakeRepo();
  let tick = Date.parse('2026-10-05T12:00:00Z');
  let seq = 0;
  const service = createCatalogService({
    repo,
    clock: { now: () => new Date((tick += 1000)) },
    ids: { id: () => `id-${++seq}`, slug: () => 'slug' },
  });
  return { repo, service };
}

describe('catalog service', () => {
  it('creates an active item with integer cents and timestamps', async () => {
    const { service } = setup();
    const item = await service.create({ name: 'Servidor', unitPriceCents: 1_500_000, unit: 'servicio' });
    expect(item).toMatchObject({ id: 'id-1', active: true, description: null, unitPriceCents: 1_500_000 });
    expect(item.createdAt).toBe(item.updatedAt);
  });

  it('archives instead of deleting, and hides archived items by default', async () => {
    const { service } = setup();
    const item = await service.create({ name: 'Diseño', unitPriceCents: 800_000, unit: 'servicio' });
    const archived = await service.update(item.id, { active: false });

    expect(archived.active).toBe(false);
    expect(archived.updatedAt > item.updatedAt).toBe(true);
    expect(await service.list({ includeArchived: false })).toEqual([]);
    expect(await service.list({ includeArchived: true })).toHaveLength(1);
  });

  it('keeps fields that the update leaves out', async () => {
    const { service } = setup();
    const item = await service.create({ name: 'API', description: 'REST', unitPriceCents: 100, unit: 'hora' });
    const updated = await service.update(item.id, { unitPriceCents: 200 });
    expect(updated).toMatchObject({ name: 'API', description: 'REST', unitPriceCents: 200, unit: 'hora' });
  });

  it('throws NotFoundError for an unknown id', async () => {
    const { service } = setup();
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundError);
  });
});
