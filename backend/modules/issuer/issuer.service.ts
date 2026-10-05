import type { Clock } from '../../core/clock';
import { NotFoundError } from '../../core/errors';
import type { SaveIssuerDto } from './issuer.dto';
import type { IssuerRepository } from './issuer.repository';
import type { IssuerProfile } from './issuer.type';

export interface IssuerServiceDeps {
  repo: IssuerRepository;
  clock: Clock;
}

export function createIssuerService({ repo, clock }: IssuerServiceDeps) {
  return {
    /** `null` until the profile is filled in once. */
    get: () => repo.get(),

    /** For anything that renders a document: there is no document without an issuer. */
    async require(): Promise<IssuerProfile> {
      const profile = await repo.get();
      if (!profile) {
        throw new NotFoundError('Completa tu perfil de emisor antes de continuar.', 'issuer_not_configured');
      }
      return profile;
    },

    async save(input: SaveIssuerDto): Promise<IssuerProfile> {
      const profile: IssuerProfile = {
        ...input,
        email: input.email.toLowerCase(),
        logoUrl: input.logoUrl ?? null,
        updatedAt: clock.now().toISOString(),
      };
      await repo.upsert(profile);
      return profile;
    },
  };
}

export type IssuerService = ReturnType<typeof createIssuerService>;
