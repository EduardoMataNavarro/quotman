import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './core/env';
import { AppError } from './core/errors';
import { log } from './core/logger';
import { modules, requestId, requestLog } from './core/middleware';
import { adminGuard, authRoutes } from './modules/auth';
import { brandingRoutes } from './modules/branding';
import { clientsRoutes } from './modules/clients';
import { issuerRoutes } from './modules/issuer';
import { quotationsAdminRoutes } from './modules/quotations';
import { offeredServicesRoutes } from './modules/offered-services';

const PUBLIC_ADMIN_PATHS = new Set(['/api/admin/auth/login']);

/**
 * The admin is never public: the API is also routed on the client host, so `/api/admin/*`
 * answers only on ADMIN_HOST (which sits behind Cloudflare Access). Anywhere else it's a
 * plain 404, as if it didn't exist. Development (localhost proxies) is exempt.
 */
const adminHostOnly = createMiddleware<AppEnv>(async (c, next) => {
  if (c.env.ENVIRONMENT !== 'development' && new URL(c.req.url).hostname !== c.env.ADMIN_HOST) {
    return c.json({ error: { code: 'not_found', message: 'Esta ruta no existe.' } }, 404);
  }
  return next();
});

/** The API, mounted under `/api` by `src/index.ts`. */
export const api = new Hono<AppEnv>()
  .use(requestId, requestLog)
  // Before `modules`, so health answers without touching the database.
  .get('/health', (c) => c.json({ ok: true }))
  .use(modules)
  .use('/admin/*', adminHostOnly)
  .use('/admin/*', (c, next) => (PUBLIC_ADMIN_PATHS.has(c.req.path) ? next() : adminGuard(c, next)))
  .route('/admin/auth', authRoutes)
  .route('/admin/offered-services', offeredServicesRoutes)
  .route('/admin/clients', clientsRoutes)
  .route('/admin/issuer', issuerRoutes)
  .route('/admin/branding', brandingRoutes)
  .route('/admin/quotations', quotationsAdminRoutes);

api.notFound((c) => c.json({ error: { code: 'not_found', message: 'Esta ruta no existe.' } }, 404));

api.onError((err, c) => {
  if (err instanceof AppError) {
    const { code, message, details } = err;
    return c.json({ error: { code, message, ...(details ? { details } : {}) } }, err.status);
  }
  if (err instanceof HTTPException) return err.getResponse();

  log('error', 'unhandled', {
    requestId: c.get('requestId'),
    error: err instanceof Error ? (err.stack ?? err.message) : String(err),
  });
  return c.json({ error: { code: 'internal', message: 'Algo salió mal. Intenta de nuevo.' } }, 500);
});

export type Api = typeof api;
