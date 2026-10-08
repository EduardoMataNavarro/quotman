import { createMiddleware } from 'hono/factory';
import { buildModules } from '../modules';
import type { AppEnv } from './env';
import { log } from './logger';

/** Request id from Cloudflare's `cf-ray` when present, echoed back as `x-request-id`. */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.header('cf-ray') ?? crypto.randomUUID();
  c.set('requestId', id);
  await next();
  c.header('x-request-id', id);
});

export const requestLog = createMiddleware<AppEnv>(async (c, next) => {
  const started = Date.now();
  await next();
  log('info', 'request', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - started,
  });
});

/**
 * Builds the request's modules once; routes read them with `c.get('modules')`. Tests set
 * them first (against an in-memory database), and then they're left alone.
 */
export const modules = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.modules) c.set('modules', buildModules(c.env));
  await next();
});
