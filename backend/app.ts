import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './core/env';
import { AppError } from './core/errors';
import { log } from './core/logger';
import { adminGuardPlaceholder, requestId, requestLog, services } from './core/middleware';
import { catalogRoutes } from './modules/catalog';

/** The API, mounted under `/api` by `src/server.ts`. */
export const api = new Hono<AppEnv>()
  .use(requestId, requestLog)
  // Before `services`, so health answers without touching the database.
  .get('/health', (c) => c.json({ ok: true }))
  .use(services)
  .use('/admin/*', adminGuardPlaceholder)
  .route('/admin/catalog', catalogRoutes);

api.notFound((c) =>
  c.json({ error: { code: 'not_found', message: 'Esta ruta no existe.' } }, 404),
);

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
