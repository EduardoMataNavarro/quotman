// Public surface of the branding module. Other modules import from here only.
import type { Clock } from '../../core/clock';
import type { Db } from '../../core/db';
import { createBrandingRepository } from './branding.repository';
import { createBrandingService } from './branding.service';

export type { BrandingService } from './branding.service';
export type { Branding, BrandingGradient, BrandingSurface } from './branding.type';
export * from './branding.dto';
export { brandingRoutes } from './branding.routes';

export function createBrandingModule(deps: { db: Db; clock: Clock }) {
  return createBrandingService({ repo: createBrandingRepository(deps.db), clock: deps.clock });
}
