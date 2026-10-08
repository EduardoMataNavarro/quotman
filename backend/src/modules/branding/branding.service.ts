import type { Clock } from '../../core/clock';
import type { SaveBrandingDto } from './branding.dto';
import type { BrandingRepository } from './branding.repository';
import type { Branding } from './branding.type';

export interface BrandingServiceDeps {
  repo: BrandingRepository;
  clock: Clock;
}

const EMPTY: Branding = { page: { gradient: null, css: '' }, sheet: { gradient: null, css: '' }, updatedAt: null };

export function createBrandingService({ repo, clock }: BrandingServiceDeps) {
  return {
    /** The template's look (nothing set) until saved once. */
    async get(): Promise<Branding> {
      return (await repo.get()) ?? EMPTY;
    },

    async save(input: SaveBrandingDto): Promise<Branding> {
      const value = { ...input, updatedAt: clock.now().toISOString() };
      await repo.upsert(value);
      return value;
    },
  };
}

export type BrandingService = ReturnType<typeof createBrandingService>;
