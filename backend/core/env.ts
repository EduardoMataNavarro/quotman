import type { Fetcher, R2Bucket } from '@cloudflare/workers-types';
import type { Services } from '../services';

/** Bindings, vars and secrets declared in wrangler.jsonc / .dev.vars. */
export interface Bindings {
  FILES: R2Bucket;
  ASSETS: Fetcher;

  ENVIRONMENT: 'development' | 'production';
  APP_URL: string;

  /** Neon connection string (pooled). */
  DATABASE_URL: string;
  RESEND_API_KEY: string;
  SESSION_SECRET: string;
  ADMIN_EMAIL: string;
  BUILD_TOKEN: string;
  DEPLOY_HOOK_URL: string;
}

export interface Variables {
  requestId: string;
  services: Services;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: Variables;
}
