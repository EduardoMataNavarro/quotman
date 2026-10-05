import type { Clock } from '../../core/clock';
import { NotFoundError } from '../../core/errors';
import type { Ids } from '../../core/ids';
import { stripUndefined } from '../../core/objects';
import type { CreateCatalogItemDto, UpdateCatalogItemDto } from './catalog.dto';
import type { CatalogRepository } from './catalog.repository';
import type { CatalogItem } from './catalog.type';

export interface CatalogServiceDeps {
  repo: CatalogRepository;
  clock: Clock;
  ids: Ids;
}

export function createCatalogService({ repo, clock, ids }: CatalogServiceDeps) {
  async function get(id: string): Promise<CatalogItem> {
    const item = await repo.findById(id);
    if (!item) throw new NotFoundError('Ese servicio no existe.', 'catalog_item_not_found');
    return item;
  }

  return {
    list: (options: { includeArchived: boolean }) => repo.list(options),

    get,

    async create(input: CreateCatalogItemDto): Promise<CatalogItem> {
      const now = clock.now().toISOString();
      const item: CatalogItem = {
        id: ids.id(),
        name: input.name,
        description: input.description ?? null,
        unitPriceCents: input.unitPriceCents,
        unit: input.unit,
        defaultStage: input.defaultStage ?? null,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await repo.insert(item);
      return item;
    },

    async update(id: string, input: UpdateCatalogItemDto): Promise<CatalogItem> {
      const current = await get(id);
      const next: CatalogItem = {
        ...current,
        ...stripUndefined(input),
        updatedAt: clock.now().toISOString(),
      };
      const { id: _id, createdAt: _createdAt, ...changes } = next;
      await repo.update(id, changes);
      return next;
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
