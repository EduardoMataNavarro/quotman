import type { R2Bucket } from '@cloudflare/workers-types';
import type { AuthenticatedAdmin } from '../modules/auth';
import type { Modules } from '../modules';

/** Bindings, vars and secrets declared in wrangler.jsonc / .dev.vars. */
export interface Bindings {
  FILES: R2Bucket;

  ENVIRONMENT: 'development' | 'production';
  APP_URL: string;
  /** The only host the admin API answers on (outside development). */
  ADMIN_HOST: string;

  /**
   * Issuer details, copied into issuer_profile once, the first time it's read and empty.
   * Secrets (never in wrangler.jsonc), so no personal data lives in the repo.
   */
  ISSUER_NAME?: string;
  ISSUER_ROLE?: string;
  ISSUER_EMAIL?: string;
  ISSUER_PHONE?: string;
  ISSUER_RAZON_SOCIAL?: string;
  ISSUER_RFC?: string;
  ISSUER_LOCATION?: string;

  /** Neon connection string (pooled). */
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  SESSION_SECRET: string;
  BUILD_TOKEN: string;
  DEPLOY_HOOK_URL: string;
}

export interface Variables {
  requestId: string;
  modules: Modules;
  /** Set by the admin guard on `/api/admin/*`. */
  admin: AuthenticatedAdmin;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: Variables;
}
