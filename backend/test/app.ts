import { Hono } from 'hono';
import { api } from '../app';
import type { AppEnv, Bindings } from '../core/env';
import { buildServices } from '../services';
import { createTestDb } from './db';

/** The real API over an in-memory database, with the dev-only admin guard open. */
export async function createTestApi() {
  const db = await createTestDb();
  const env = { ENVIRONMENT: 'development', DATABASE_URL: '' } as Bindings;
  const app = new Hono<AppEnv>()
    .use(async (c, next) => {
      c.set('services', buildServices(env, db));
      await next();
    })
    .route('/api', api);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests assert on loose JSON
  async function call<T = any>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
    const res = await app.request(
      `/api${path}`,
      {
        method,
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      env,
    );
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  }

  return { db, call };
}
