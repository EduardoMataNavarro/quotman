// Public surface of the issuer module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import { createIssuerRepository } from './issuer.repository';
import { createIssuerService } from './issuer.service';

export type { IssuerService } from './issuer.service';
export type { IssuerProfile } from './issuer.type';
export * from './issuer.dto';
export { issuerRoutes } from './issuer.routes';

export function createIssuerModule(deps: { db: Db; clock: Clock; seed?: Record<string, string | undefined> }) {
  return createIssuerService({ repo: createIssuerRepository(deps.db), clock: deps.clock, seed: deps.seed });
}
