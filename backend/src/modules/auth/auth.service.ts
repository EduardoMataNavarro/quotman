import type { Clock } from '../../core/clock';
import { hashPassword, randomToken, sha256Hex, verifyPassword } from '../../core/crypto';
import { ConflictError, UnauthorizedError, ValidationError } from '../../core/errors';
import type { Ids } from '../../core/ids';
import type { AuthRepository } from './auth.repository';
import type { AuthenticatedAdmin } from './auth.type';

/** 30 days, sliding: renewed when less than half is left (PLAN.md §4.1). */
export const ADMIN_SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

// Verified against when the email is unknown, so a miss costs the same PBKDF2 time as a hit.
const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export interface AuthServiceDeps {
  repo: AuthRepository;
  clock: Clock;
  ids: Ids;
}

export function createAuthService({ repo, clock, ids }: AuthServiceDeps) {
  const expiry = () => new Date(clock.now().getTime() + ADMIN_SESSION_DAYS * DAY_MS).toISOString();

  return {
    /** Returns the session token for the cookie. Same error for unknown email and bad password. */
    async login(email: string, password: string): Promise<{ token: string; admin: AuthenticatedAdmin }> {
      const admin = await repo.findAdminByEmail(email.toLowerCase());
      const ok = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);
      if (!admin || !ok) throw new UnauthorizedError('Correo o contraseña incorrectos.');

      const token = randomToken();
      const now = clock.now().toISOString();
      await repo.createSession({ idHash: await sha256Hex(token), adminId: admin.id, expiresAt: expiry() });
      await repo.touchLogin(admin.id, now);
      return { token, admin: { id: admin.id, email: admin.email, lastLoginAt: now } };
    },

    /** The admin behind a session token; renews the session when it's past half-life. */
    async authenticate(token: string | undefined): Promise<AuthenticatedAdmin> {
      if (!token) throw new UnauthorizedError();
      const idHash = await sha256Hex(token);
      const now = clock.now();
      const session = await repo.findLiveSession(idHash, now.toISOString());
      const admin = session && (await repo.findAdminById(session.adminId));
      if (!session || !admin) throw new UnauthorizedError();

      if (Date.parse(session.expiresAt) - now.getTime() < (ADMIN_SESSION_DAYS * DAY_MS) / 2) {
        await repo.extendSession(idHash, expiry());
      }
      return { id: admin.id, email: admin.email, lastLoginAt: admin.lastLoginAt };
    },

    async logout(token: string | undefined): Promise<void> {
      if (token) await repo.deleteSession(await sha256Hex(token));
    },

    /** Keeps the current session, signs out every other one. */
    async changePassword(adminId: string, token: string, current: string, next: string): Promise<void> {
      const admin = await repo.findAdminById(adminId);
      if (!admin || !(await verifyPassword(current, admin.passwordHash))) {
        throw new ValidationError('La contraseña actual no es correcta.');
      }
      await repo.updatePassword(adminId, await hashPassword(next));
      await repo.deleteOtherSessions(adminId, await sha256Hex(token));
    },

    /** For the `admin:create` CLI. */
    async createAdmin(email: string, password: string): Promise<AuthenticatedAdmin> {
      const normalized = email.toLowerCase();
      if (await repo.findAdminByEmail(normalized)) {
        throw new ConflictError('Ya existe un administrador con ese correo.', 'admin_exists');
      }
      const id = ids.id();
      await repo.insertAdmin({ id, email: normalized, passwordHash: await hashPassword(password) });
      return { id, email: normalized, lastLoginAt: null };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
