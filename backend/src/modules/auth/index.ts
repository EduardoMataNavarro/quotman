// Public surface of the auth module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Ids } from '../../core/ids';
import { createAuthRepository } from './auth.repository';
import { createAuthService } from './auth.service';

export type { AuthService } from './auth.service';
export type { AuthenticatedAdmin } from './auth.type';
export * from './auth.dto';
export { SessionKind } from './auth.enum';
export { ADMIN_COOKIE, adminGuard, authRoutes } from './auth.routes';

export function createAuthModule(deps: { db: Db; clock: Clock; ids: Ids }) {
  return createAuthService({ repo: createAuthRepository(deps.db), clock: deps.clock, ids: deps.ids });
}
