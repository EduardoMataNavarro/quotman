// Public surface of the catalog module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Ids } from '../../core/ids';
import { createCatalogRepository } from './catalog.repository';
import { createCatalogService } from './catalog.service';

export type { CatalogService } from './catalog.service';
export type { CatalogItem } from './catalog.type';
export * from './catalog.dto';
export { catalogRoutes } from './catalog.routes';

export function createCatalogModule(deps: { db: Db; clock: Clock; ids: Ids }) {
  return createCatalogService({
    repo: createCatalogRepository(deps.db),
    clock: deps.clock,
    ids: deps.ids,
  });
}
