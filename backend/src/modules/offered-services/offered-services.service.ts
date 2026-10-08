import type { Clock } from '../../core/clock';
import { NotFoundError } from '../../core/errors';
import type { Ids } from '../../core/ids';
import { stripUndefined } from '../../core/objects';
import type { CreateOfferedServiceDto, UpdateOfferedServiceDto } from './offered-services.dto';
import type { OfferedServicesRepository } from './offered-services.repository';
import type { OfferedService } from './offered-services.type';

export interface OfferedOfferedServicesServiceDeps {
  repo: OfferedServicesRepository;
  clock: Clock;
  ids: Ids;
}

export function createOfferedOfferedServicesService({ repo, clock, ids }: OfferedOfferedServicesServiceDeps) {
  async function get(id: string): Promise<OfferedService> {
    const service = await repo.findById(id);
    if (!service) throw new NotFoundError('Ese servicio no existe.', 'offered_service_not_found');
    return service;
  }

  return {
    list: (options: { includeInactive: boolean }) => repo.list(options),

    get,

    async create(input: CreateOfferedServiceDto): Promise<OfferedService> {
      const now = clock.now().toISOString();
      const service: OfferedService = {
        id: ids.id(),
        name: input.name,
        description: input.description ?? null,
        unitPriceCents: input.unitPriceCents,
        unit: input.unit,
        defaultSection: input.defaultSection ?? null,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await repo.insert(service);
      return service;
    },

    async update(id: string, input: UpdateOfferedServiceDto): Promise<OfferedService> {
      const current = await get(id);
      const next: OfferedService = { ...current, ...stripUndefined(input), updatedAt: clock.now().toISOString() };
      const { id: _id, createdAt: _createdAt, ...changes } = next;
      await repo.update(id, changes);
      return next;
    },

    /** Soft delete: lines that copied this service keep their values. */
    async remove(id: string): Promise<void> {
      await get(id);
      await repo.softDelete(id, clock.now().toISOString());
    },
  };
}

export type OfferedServicesService = ReturnType<typeof createOfferedOfferedServicesService>;
