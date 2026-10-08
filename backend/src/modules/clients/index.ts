// Public surface of the clients module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Ids } from '../../core/ids';
import { createClientsRepository } from './clients.repository';
import { createClientsService } from './clients.service';

export type { ClientsService } from './clients.service';
export type { Client } from './clients.type';
export * from './clients.dto';
export { clientsRoutes } from './clients.routes';

export function createClientsModule(deps: { db: Db; clock: Clock; ids: Ids }) {
  return createClientsService({ repo: createClientsRepository(deps.db), clock: deps.clock, ids: deps.ids });
}
