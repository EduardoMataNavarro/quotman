// Public surface of the offered-services module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Ids } from '../../core/ids';
import { createOfferedOfferedServicesRepository } from './offered-services.repository';
import { createOfferedOfferedServicesService } from './offered-services.service';

export type { OfferedServicesService } from './offered-services.service';
export type { OfferedService } from './offered-services.type';
export * from './offered-services.dto';
export { offeredServicesRoutes } from './offered-services.routes';

export function createOfferedServicesModule(deps: { db: Db; clock: Clock; ids: Ids }) {
  return createOfferedOfferedServicesService({ repo: createOfferedOfferedServicesRepository(deps.db), clock: deps.clock, ids: deps.ids });
}
