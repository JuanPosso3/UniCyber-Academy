import 'dotenv/config';
import './helpers/recaptcha.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';

const target = new URL(process.env['DATABASE_URL'] ?? 'http://invalid');
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('La regresión de login requiere PostgreSQL local de pruebas.');
}
const { createApp } = await import('../src/app.js');
const { db } = await import('../src/prisma/db.js');
const { hashPassword } = await import('../src/infrastructure/security/password.js');

test('real login service with mocked CAPTCHA preserves sessions, logout and role restrictions', { timeout: 30000 }, async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const marker = `captcha-login-${Date.now()}`;
  const ids: number[] = [];
  const password = 'PruebaSegura123!';
  const request = (path: string, body?: unknown, cookie?: string) => fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-unicyber-request': '1', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    const passwordHash = await hashPassword(password);
    for (const role of ['STUDENT', 'ADMINISTRATIVE'] as const) {
      const user = await db.orm.public.User.create({
        firstName: 'Captcha', lastName: 'Prueba', email: `${role.toLowerCase()}-${marker}@example.test`, passwordHash, role,
      });
      ids.push(user.id);
      const payload = { email: user.email, password, recaptchaToken: 'test-captcha-token' };
      const missing = await request('/auth/login', { ...payload, recaptchaToken: undefined });
      assert.equal(missing.status, 400);
      assert.equal(missing.headers.get('set-cookie'), null);
      assert.equal((await request('/auth/login', { ...payload, password: 'incorrecta' })).status, 401);
      const response = await request('/auth/login', payload);
      assert.equal(response.status, 200);
      const cookieHeader = response.headers.get('set-cookie')!;
      assert.match(cookieHeader, /HttpOnly/);
      assert.match(cookieHeader, /SameSite=Lax/);
      const cookie = cookieHeader.split(';')[0]!;
      const me = await request('/auth/me', undefined, cookie);
      assert.equal(me.status, 200);
      assert.equal(((await me.json()) as { user: { role: string } }).user.role, role);
      const admin = await request('/admin/users', undefined, cookie);
      assert.equal(admin.status, role === 'ADMINISTRATIVE' ? 200 : 403);
      const logout = await request('/auth/logout', {}, cookie);
      assert.equal(logout.status, 204);
      assert.match(logout.headers.get('set-cookie')!, /Expires=/);
      assert.equal((await request('/auth/me')).status, 401);
      await db.orm.public.User.where({ id: user.id }).update({ status: 'DISABLED' });
      const disabled = await request('/auth/login', payload);
      assert.equal(disabled.status, 403);
      assert.equal(disabled.headers.get('set-cookie'), null);
    }
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const id of ids) {
      await db.orm.public.UserAchievement.where({ userId: id }).deleteAll();
      await db.orm.public.User.where({ id }).deleteAll();
    }
    await db.close();
  }
});
