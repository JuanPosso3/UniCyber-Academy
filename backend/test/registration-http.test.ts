import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { db } from '../src/prisma/db.js';
import { verifyPassword } from '../src/infrastructure/security/password.js';

test('registration HTTP rejects weak passwords and preserves login and hashing', { timeout: 30000 }, async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth`;
  const email = `registration-policy-${Date.now()}@example.test`;
  const request = (path: string, body: unknown) => fetch(`${base}/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-unicyber-request': '1' }, body: JSON.stringify(body),
  });
  try {
    for (const password of ['Ab1!', 'minuscula1!', 'MAYUSCULA1!', 'SinNumeros!', 'SinSimbolos1']) {
      const response = await request('register', { firstName: 'Ana', lastName: 'Prueba', email, password });
      assert.equal(response.status, 400);
      const body = await response.json() as { error: { fields: { password: string } } };
      assert.ok(body.error.fields.password);
    }
    assert.equal(await db.orm.public.User.first({ email }), null);
    const password = 'RegistroSeguro123!';
    const response = await request('register', { firstName: 'Ana', lastName: 'Prueba', email, password, role: 'admin' });
    assert.equal(response.status, 201);
    const user = await db.orm.public.User.first({ email });
    assert.ok(user);
    assert.equal(user.role, 'STUDENT');
    assert.ok(await verifyPassword(password, user.passwordHash));
    assert.equal((await request('login', { email, password: 'incorrecta' })).status, 401);
    const login = await request('login', { email, password });
    assert.equal(login.status, 200);
    assert.ok(login.headers.get('set-cookie'));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    const user = await db.orm.public.User.first({ email });
    if (user) {
      await db.orm.public.UserAchievement.where({ userId: user.id }).deleteAll();
      await db.orm.public.User.where({ id: user.id }).deleteAll();
    }
  }
});
