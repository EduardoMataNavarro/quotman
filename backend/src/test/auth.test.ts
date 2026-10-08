import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApi, TEST_ADMIN } from './app';

type Api = Awaited<ReturnType<typeof createTestApi>>;

describe('admin auth', () => {
  let api: Api;
  beforeEach(async () => {
    api = await createTestApi();
  });

  it('sets an HttpOnly, Strict cookie scoped to the admin API', async () => {
    const res = await api.login();
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(TEST_ADMIN.email);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/^qm_admin=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/admin');
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    const unknown = await api.call('POST', '/admin/auth/login', { email: 'nadie@example.com', password: 'x' }, { cookie: null });
    const wrong = await api.call('POST', '/admin/auth/login', { email: TEST_ADMIN.email, password: 'x' }, { cookie: null });
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('guards every admin route without a valid session', async () => {
    for (const path of ['/admin/auth/me', '/admin/quotations', '/admin/clients', '/admin/offered-services', '/admin/issuer']) {
      expect((await api.call('GET', path, undefined, { cookie: null })).status).toBe(401);
      expect((await api.call('GET', path, undefined, { cookie: 'qm_admin=forged' })).status).toBe(401);
    }
    expect((await api.call('GET', '/admin/auth/me')).body.admin.email).toBe(TEST_ADMIN.email);
  });

  it('ends the session on logout', async () => {
    const cookie = api.cookie();
    expect((await api.call('POST', '/admin/auth/logout')).status).toBe(204);
    expect((await api.call('GET', '/admin/auth/me', undefined, { cookie })).status).toBe(401);
  });

  it('changes the password and signs out other sessions only', async () => {
    const other = api.cookie();
    await api.login();
    const current = api.cookie();

    const bad = await api.call('POST', '/admin/auth/change-password', { currentPassword: 'mal', newPassword: 'otra-contraseña-larga' });
    expect(bad.status).toBe(422);

    const ok = await api.call('POST', '/admin/auth/change-password', {
      currentPassword: TEST_ADMIN.password,
      newPassword: 'otra-contraseña-larga',
    });
    expect(ok.status).toBe(204);
    expect((await api.call('GET', '/admin/auth/me', undefined, { cookie: current })).status).toBe(200);
    expect((await api.call('GET', '/admin/auth/me', undefined, { cookie: other })).status).toBe(401);
    expect((await api.login(TEST_ADMIN.email, 'otra-contraseña-larga')).status).toBe(200);
  });

  it('refuses a duplicate admin email', async () => {
    await expect(api.modules.auth.createAdmin(TEST_ADMIN.email.toUpperCase(), 'x'.repeat(12))).rejects.toMatchObject({
      code: 'admin_exists',
    });
  });
});

describe('admin is never public', () => {
  it('answers 404 for the admin API on any host but the admin host in production', async () => {
    const api = await createTestApi({ ENVIRONMENT: 'production' });
    const login = { email: TEST_ADMIN.email, password: TEST_ADMIN.password };

    const publicHost = await api.call('POST', '/admin/auth/login', login, { cookie: null, host: 'quotman.dasom.mx' });
    expect(publicHost.status).toBe(404);
    expect(publicHost.body.error.code).toBe('not_found');
    expect((await api.call('GET', '/admin/quotations', undefined, { host: 'quotman.dasom.mx' })).status).toBe(404);

    const adminHost = await api.call('POST', '/admin/auth/login', login, { cookie: null, host: 'admin-quotman.dasom.mx' });
    expect(adminHost.status).toBe(200);
  });
});
