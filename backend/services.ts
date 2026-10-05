import { systemClock } from './core/clock';
import { createDb, type Db } from './core/db';
import type { Bindings } from './core/env';
import { ids } from './core/ids';
import { createCatalogModule } from './modules/catalog';
import { createClientsModule } from './modules/clients';
import { createIssuerModule } from './modules/issuer';
import { createQuotationsModule } from './modules/quotations';

/** Composition root: every module's service, built once per request. */
export function buildServices(env: Pick<Bindings, 'DATABASE_URL'>, db: Db = createDb(env.DATABASE_URL)) {
  const core = { db, clock: systemClock, ids };
  const catalog = createCatalogModule(core);
  const clients = createClientsModule(core);
  const issuer = createIssuerModule(core);
  const quotations = createQuotationsModule({ ...core, catalog, clients, issuer });
  return { catalog, clients, issuer, quotations };
}

export type Services = ReturnType<typeof buildServices>;
