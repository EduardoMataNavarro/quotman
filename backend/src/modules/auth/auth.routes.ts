import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../../core/env';
import { validate } from '../../core/http';
import { ChangePasswordDto, LoginDto } from './auth.dto';
import { ADMIN_SESSION_DAYS } from './auth.service';

/**
 * HttpOnly, Strict, scoped to the admin API. The admin app calls the API on its own host
 * (admin-quotman.dasom.mx/api), so the cookie never exists on the client-facing host.
 */
export const ADMIN_COOKIE = 'qm_admin';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/api/admin',
} as const;

/** Every `/api/admin/*` route except `/api/admin/auth/login`. */
export const adminGuard = createMiddleware<AppEnv>(async (c, next) => {
  const admin = await c.get('modules').auth.authenticate(getCookie(c, ADMIN_COOKIE));
  c.set('admin', admin);
  await next();
});

/** Mounted at `/api/admin/auth`. */
export const authRoutes = new Hono<AppEnv>()
  .post('/login', validate('json', LoginDto), async (c) => {
    const { email, password } = c.req.valid('json');
    const { token, admin } = await c.get('modules').auth.login(email, password);
    setCookie(c, ADMIN_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: ADMIN_SESSION_DAYS * 86_400 });
    return c.json({ admin });
  })
  .post('/logout', async (c) => {
    await c.get('modules').auth.logout(getCookie(c, ADMIN_COOKIE));
    deleteCookie(c, ADMIN_COOKIE, COOKIE_OPTIONS);
    return c.body(null, 204);
  })
  .get('/me', (c) => c.json({ admin: c.get('admin') }))
  .post('/change-password', validate('json', ChangePasswordDto), async (c) => {
    const { currentPassword, newPassword } = c.req.valid('json');
    await c
      .get('modules')
      .auth.changePassword(c.get('admin').id, getCookie(c, ADMIN_COOKIE)!, currentPassword, newPassword);
    return c.body(null, 204);
  });
