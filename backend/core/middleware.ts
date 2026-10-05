import { createMiddleware } from 'hono/factory';
import { buildServices } from '../services';
import type { AppEnv } from './env';
import { UnauthorizedError } from './errors';
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

/** Builds the request's services once; routes read them with `c.get('services')`. */
export const services = createMiddleware<AppEnv>(async (c, next) => {
  c.set('services', buildServices(c.env));
  await next();
});

/**
 * Placeholder guard for `/api/admin/*` until the `auth` module lands (phase 4): open in
 * local development, closed everywhere else.
 */
export const adminGuardPlaceholder = createMiddleware<AppEnv>(async (c, next) => {
  if (c.env.ENVIRONMENT !== 'development') {
    throw new UnauthorizedError();
  }
  await next();
});
