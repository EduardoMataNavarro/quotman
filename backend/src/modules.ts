import { systemClock } from './core/clock';
import { createDb, type Db } from './core/db';
import type { Bindings } from './core/env';
import { ids } from './core/ids';
import { createAuthModule } from './modules/auth';
import { createBrandingModule } from './modules/branding';
import { createClientsModule } from './modules/clients';
import { createIssuerModule } from './modules/issuer';
import { createQuotationsModule } from './modules/quotations';
import { createOfferedServicesModule } from './modules/offered-services';

/** Composition root: every module's service, built once per request. */
export function buildModules(env: Partial<Bindings> & Pick<Bindings, 'DATABASE_URL'>, db: Db = createDb(env.DATABASE_URL)) {
  const core = { db, clock: systemClock, ids };
  const auth = createAuthModule(core);
  const offeredServices = createOfferedServicesModule(core);
  const clients = createClientsModule(core);
  const issuer = createIssuerModule({ ...core, seed: issuerSeed(env) });
  const branding = createBrandingModule(core);
  const quotations = createQuotationsModule({ ...core, offeredServices, clients, issuer, branding });
  return { auth, offeredServices, clients, issuer, branding, quotations };
}

export type Modules = ReturnType<typeof buildModules>;

/** ISSUER_* env values, or undefined when none are set. */
function issuerSeed(env: Partial<Bindings>): Record<string, string | undefined> | undefined {
  const seed = {
    name: env.ISSUER_NAME,
    role: env.ISSUER_ROLE,
    email: env.ISSUER_EMAIL,
    phone: env.ISSUER_PHONE,
    razonSocial: env.ISSUER_RAZON_SOCIAL,
    rfc: env.ISSUER_RFC,
    location: env.ISSUER_LOCATION,
  };
  return Object.values(seed).some(Boolean) ? seed : undefined;
}
