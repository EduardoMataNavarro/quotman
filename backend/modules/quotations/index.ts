// Public surface of the quotations module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Ids } from '../../core/ids';
import { createQuotationsRepository } from './quotations.repository';
import { createQuotationsService, type QuotationsServiceDeps } from './quotations.service';

export type { QuotationsService } from './quotations.service';
export type * from './quotations.type';
export * from './quotations.enum';
export * from './quotations.dto';
export { quotationsAdminRoutes } from './quotations.routes';

export function createQuotationsModule(
  deps: { db: Db; clock: Clock; ids: Ids } & Pick<QuotationsServiceDeps, 'catalog' | 'clients' | 'issuer'>,
) {
  const { db, ...rest } = deps;
  return createQuotationsService({ repo: createQuotationsRepository(db), ...rest });
}
