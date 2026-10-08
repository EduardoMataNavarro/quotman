import { Hono } from 'hono';
import { api } from '../app';
import type { AppEnv, Bindings } from '../core/env';
import { buildModules } from '../modules';
import { createTestDb } from './db';

export const TEST_ADMIN = { email: 'admin@example.com', password: 'una-contraseña-larga' };

/** The real API over an in-memory database, with one admin signed in. */
export async function createTestApi(overrides: Partial<Bindings> = {}) {
  const db = await createTestDb();
  const env = { ENVIRONMENT: 'development', DATABASE_URL: '', ADMIN_HOST: 'admin-quotman.dasom.mx', ...overrides } as Bindings;
  const modules = buildModules(env, db);
  await modules.auth.createAdmin(TEST_ADMIN.email, TEST_ADMIN.password);

  const app = new Hono<AppEnv>()
    .use(async (c, next) => {
      c.set('modules', buildModules(env, db));
      await next();
    })
    .route('/api', api);

  let cookie = '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests assert on loose JSON
  async function call<T = any>(
    method: string,
    path: string,
    body?: unknown,
    options: { cookie?: string | null; host?: string } = {},
  ): Promise<{ status: number; body: T; headers: Headers }> {
    const sendCookie = options.cookie === undefined ? cookie : options.cookie;
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (sendCookie) headers['cookie'] = sendCookie;
    const res = await app.request(
      `http://${options.host ?? 'localhost'}/api${path}`,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
      env,
    );
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined, headers: res.headers };
  }

  async function login(email = TEST_ADMIN.email, password = TEST_ADMIN.password) {
    const res = await call('POST', '/admin/auth/login', { email, password }, { cookie: null });
    const setCookie = res.headers.get('set-cookie') ?? '';
    cookie = setCookie.split(';')[0] ?? '';
    return res;
  }

  await login();
  return { db, modules, call, login, cookie: () => cookie };
}
