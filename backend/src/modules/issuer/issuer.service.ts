import type { Clock } from '../../core/clock';
import { NotFoundError } from '../../core/errors';
import { log } from '../../core/logger';
import { SaveIssuerDto } from './issuer.dto';
import type { IssuerRepository } from './issuer.repository';
import type { IssuerProfile } from './issuer.type';

export interface IssuerServiceDeps {
  repo: IssuerRepository;
  clock: Clock;
  /** Raw ISSUER_* env values; used once, when the table is empty. */
  seed?: Record<string, string | undefined>;
}

export function createIssuerService({ repo, clock, seed }: IssuerServiceDeps) {
  async function save(input: SaveIssuerDto): Promise<IssuerProfile> {
    const profile: IssuerProfile = {
      ...input,
      email: input.email.toLowerCase(),
      logoUrl: input.logoUrl ?? null,
      updatedAt: clock.now().toISOString(),
    };
    await repo.upsert(profile);
    return profile;
  }

  /** The stored profile; if there is none yet, the env seed is validated and stored first. */
  async function get(): Promise<IssuerProfile | null> {
    const stored = await repo.get();
    if (stored || !seed) return stored;
    const parsed = SaveIssuerDto.safeParse({
      name: seed['name'],
      role: seed['role'],
      email: seed['email'],
      phone: seed['phone'],
      razonSocial: seed['razonSocial'],
      rfc: seed['rfc'],
      location: seed['location'],
    });
    if (!parsed.success) {
      // Incomplete or invalid seed: say which fields (never their values) and stay empty.
      const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))];
      log('warn', 'issuer seed skipped', { fields });
      return null;
    }
    return save(parsed.data);
  }

  return {
    /** `null` until the profile exists (saved once, or seeded from the env). */
    get,

    /** For anything that renders a document: there is no document without an issuer. */
    async require(): Promise<IssuerProfile> {
      const profile = await get();
      if (!profile) {
        throw new NotFoundError('Completa tu perfil de emisor antes de continuar.', 'issuer_not_configured');
      }
      return profile;
    },

    save,
  };
}

export type IssuerService = ReturnType<typeof createIssuerService>;
