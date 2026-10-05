import { eq } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { issuerProfile } from './issuer.model';
import type { IssuerProfile } from './issuer.type';

export interface IssuerRepository {
  get(): Promise<IssuerProfile | null>;
  upsert(profile: IssuerProfile): Promise<void>;
}

export function createIssuerRepository(db: Db): IssuerRepository {
  return {
    async get() {
      const [row] = await db.select().from(issuerProfile).where(eq(issuerProfile.id, 1)).limit(1);
      if (!row) return null;
      const { id: _id, ...profile } = row;
      return { ...profile, updatedAt: new Date(profile.updatedAt).toISOString() };
    },

    async upsert(profile) {
      await db
        .insert(issuerProfile)
        .values({ id: 1, ...profile })
        .onConflictDoUpdate({ target: issuerProfile.id, set: profile });
    },
  };
}
