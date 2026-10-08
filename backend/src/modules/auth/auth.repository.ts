import { and, eq, gt, ne } from 'drizzle-orm';
import type { Db } from '../../core/db';
import { toIso } from '../../core/db/columns';
import { SessionKind } from './auth.enum';
import { admins, sessions } from './auth.model';

export interface AdminRecord {
  id: string;
  email: string;
  passwordHash: string;
  lastLoginAt: string | null;
}

export interface AuthRepository {
  findAdminByEmail(email: string): Promise<AdminRecord | null>;
  findAdminById(id: string): Promise<AdminRecord | null>;
  insertAdmin(admin: { id: string; email: string; passwordHash: string }): Promise<void>;
  updatePassword(adminId: string, passwordHash: string): Promise<void>;
  touchLogin(adminId: string, at: string): Promise<void>;
  createSession(session: { idHash: string; adminId: string; expiresAt: string }): Promise<void>;
  /** The admin id behind a live session, or null. */
  findLiveSession(idHash: string, now: string): Promise<{ adminId: string; expiresAt: string } | null>;
  extendSession(idHash: string, expiresAt: string): Promise<void>;
  deleteSession(idHash: string): Promise<void>;
  /** Signs the admin out everywhere except the given session. */
  deleteOtherSessions(adminId: string, keepIdHash: string): Promise<void>;
}

export function createAuthRepository(db: Db): AuthRepository {
  const toAdmin = (row: typeof admins.$inferSelect): AdminRecord => ({
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    lastLoginAt: toIso(row.lastLoginAt),
  });

  return {
    async findAdminByEmail(email) {
      const [row] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
      return row ? toAdmin(row) : null;
    },

    async findAdminById(id) {
      const [row] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
      return row ? toAdmin(row) : null;
    },

    async insertAdmin(admin) {
      await db.insert(admins).values(admin);
    },

    async updatePassword(adminId, passwordHash) {
      await db.update(admins).set({ passwordHash }).where(eq(admins.id, adminId));
    },

    async touchLogin(adminId, at) {
      await db.update(admins).set({ lastLoginAt: at }).where(eq(admins.id, adminId));
    },

    async createSession({ idHash, adminId, expiresAt }) {
      await db.insert(sessions).values({ idHash, kind: SessionKind.Admin, subject: adminId, expiresAt });
    },

    async findLiveSession(idHash, now) {
      const [row] = await db
        .select({ adminId: sessions.subject, expiresAt: sessions.expiresAt })
        .from(sessions)
        .where(and(eq(sessions.idHash, idHash), eq(sessions.kind, SessionKind.Admin), gt(sessions.expiresAt, now)))
        .limit(1);
      return row ? { adminId: row.adminId, expiresAt: toIso(row.expiresAt) } : null;
    },

    async extendSession(idHash, expiresAt) {
      await db.update(sessions).set({ expiresAt }).where(eq(sessions.idHash, idHash));
    },

    async deleteSession(idHash) {
      await db.delete(sessions).where(eq(sessions.idHash, idHash));
    },

    async deleteOtherSessions(adminId, keepIdHash) {
      await db
        .delete(sessions)
        .where(and(eq(sessions.kind, SessionKind.Admin), eq(sessions.subject, adminId), ne(sessions.idHash, keepIdHash)));
    },
  };
}
