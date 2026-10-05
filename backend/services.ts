import { systemClock } from './core/clock';
import { createDb } from './core/db';
import type { Bindings } from './core/env';
import { ids } from './core/ids';
import { createCatalogModule } from './modules/catalog';

/** Composition root: every module's service, built once per request. */
export function buildServices(env: Bindings) {
  const core = { db: createDb(env.DATABASE_URL), clock: systemClock, ids };
  return {
    catalog: createCatalogModule(core),
  };
}

export type Services = ReturnType<typeof buildServices>;
