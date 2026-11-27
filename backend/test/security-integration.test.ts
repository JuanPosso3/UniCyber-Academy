import 'dotenv/config';
import './helpers/recaptcha.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { randomBytes, scryptSync } from 'node:crypto';

// Fallar antes de importar Prisma si no se seleccionó una base desechable.
const target = new URL(process.env['DATABASE_URL'] ?? 'http://invalid');
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !target.pathname.startsWith('/unicyber_security_isolated_')) {
  throw new Error('Esta prueba exige una base local aislada de seguridad.');
}

// El modo compartido se prueba contra la misma base aislada. La tabla se
// crea de forma explícita, igual que en el procedimiento de despliegue.
process.env['RATE_LIMIT_STORE'] = 'postgres';

const { db } = await import('../src/prisma/db.js');
const { createApp } = await import('../src/app.js');
const { hashPassword, verifyPassword } = await import('../src/infrastructure/security/password.js');
const { signAccessToken } = await import('../src/infrastructure/security/jwt.js');
const { env } = await import('../src/config/env.js');
const { resetPasswordWithCode } = await import('../src/application/auth/password-recovery.service.js');
const {
  initializeRateLimitTable,
  consumeRateLimit,
  clearRateLimit,
  resetRateLimitsForTests,
  resetMemoryRateLimitsForTests,
} = await import('../src/infrastructure/security/rate-limit.js');
const { loginUser, rehashPasswordIfUnchanged } = await import('../src/application/auth/auth.service.js');

await initializeRateLimitTable();

function legacyHash(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    'scrypt',
    16384,
    8,
    1,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

test('autenticación, autorización, propiedad, revocación y recuperación en base aislada', { timeout: 60000 }, async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const email = `seguridad-${Date.now()}@example.test`;
  const password = 'PruebaFicticiaSegura123!';
  const ids: number[] = [];
  async function request(path: string, method = 'GET', body?: unknown, cookie?: string) {
    return fetch(`${base}${path}`, {
      method, headers: { 'content-type': 'application/json', 'x-unicyber-request': '1', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function login(value = password) {
    return request('/auth/login', 'POST', { email, password: value, recaptchaToken: 'test-recaptcha-token' });
  }
  try {
    for (const weak of ['Ab1!', 'minuscula1!', 'MAYUSCULA1!', 'SinNumeros!', 'SinSimbolos1']) {
      const rejected = await request('/auth/register', 'POST', {
        firstName: 'Persona', lastName: 'Ficticia', email, password: weak,
      });
      assert.equal(rejected.status, 400);
    }
    const registered = await request('/auth/register', 'POST', {
      firstName: 'Persona', lastName: 'Ficticia', email, password, role: 'ADMINISTRATIVE',
    });
    assert.equal(registered.status, 201);
    const created = await registered.json() as { user: { id: number; role: string; passwordHash?: string } };
    ids.push(created.user.id);
    assert.equal(created.user.role, 'STUDENT');
    assert.equal(created.user.passwordHash, undefined);
    assert.equal((await login('Incorrecta123')).status, 401);
    assert.equal((await request('/auth/login', 'POST', { email: `ausente-${email}`, password, recaptchaToken: 'test-recaptcha-token' })).status, 401);
    assert.equal((await request('/auth/me')).status, 401);
    assert.equal((await request('/auth/me', 'GET', undefined, `${env.cookieName}=alterado`)).status, 401);
    const authenticated = await login();
    assert.equal(authenticated.status, 200);
    const cookie = authenticated.headers.get('set-cookie')!.split(';')[0]!;
    const me = await request('/auth/me', 'GET', undefined, cookie);
    assert.equal(me.status, 200);
    assert.ok(!(await me.text()).includes('passwordHash'));
    assert.equal((await request('/admin/users', 'GET', undefined, cookie)).status, 403);
    const elevatedClaim = await signAccessToken({ id: created.user.id, role: 'ADMINISTRATIVE' });
    assert.equal((await request('/admin/users', 'GET', undefined, `${env.cookieName}=${elevatedClaim}`)).status, 403);

    const other = await db.orm.public.User.create({ firstName: 'Otra', lastName: 'Persona', email: `otra-${email}`, passwordHash: await hashPassword(password), role: 'STUDENT' });
    ids.push(other.id);
    const achievement = await db.orm.public.Achievement.first({ code: 'FIRST_STEPS' });
    assert.ok(achievement, 'Preparar el catálogo de logros en la base aislada.');
    const notification = await db.orm.public.UserAchievement.create({ userId: other.id, achievementId: achievement.id });
    assert.equal((await request(`/achievements/notifications/${notification.id}/view`, 'POST', {}, cookie)).status, 404);

    assert.equal((await request('/auth/logout', 'POST', {}, cookie)).status, 204);
    assert.equal((await request('/auth/me')).status, 401);
    // Limitación documentada: una copia del JWT no se revoca al borrar la cookie.
    assert.equal((await request('/auth/me', 'GET', undefined, cookie)).status, 200);

    await db.orm.public.User.where({ id: created.user.id }).update({ status: 'DISABLED' });
    assert.equal((await request('/auth/me', 'GET', undefined, cookie)).status, 401);
    assert.equal((await login()).status, 403);
    await db.orm.public.User.where({ id: created.user.id }).update({ status: 'ACTIVE' });
    const changed = await request('/users/me/password', 'PATCH', { currentPassword: password, newPassword: 'NuevaPruebaSegura123', confirmPassword: 'NuevaPruebaSegura123' }, cookie);
    assert.equal(changed.status, 204);
    assert.equal((await request('/auth/me', 'GET', undefined, cookie)).status, 401);
    const again = await login('NuevaPruebaSegura123');
    assert.equal(again.status, 200);
    assert.equal((await request('/auth/me', 'GET', undefined, again.headers.get('set-cookie')!.split(';')[0]!)).status, 200);

    const code = 'ab1234cd';
    const reset = await db.orm.public.PasswordReset.create({ userId: created.user.id, codeHash: await hashPassword(code), expiresAt: new Date(Date.now() + 60000).toISOString() });
    const input = { email, code: 'incorrecto', newPassword: 'RecuperadaSegura123', confirmPassword: 'RecuperadaSegura123' };
    await Promise.all(Array.from({ length: 8 }, () => resetPasswordWithCode(input)));
    const attempts = await db.orm.public.PasswordReset.first({ id: reset.id });
    assert.ok(attempts && attempts.attempts >= 1 && attempts.attempts <= 5);
    await db.orm.public.PasswordReset.where({ id: reset.id }).update({ attempts: 5 });
    await resetPasswordWithCode({ ...input, code });
    const unchanged = await db.orm.public.User.first({ id: created.user.id });
    assert.ok(unchanged && await verifyPassword('NuevaPruebaSegura123', unchanged.passwordHash));

    await db.orm.public.PasswordReset.create({ userId: created.user.id, codeHash: await hashPassword(code), expiresAt: new Date(Date.now() + 60000).toISOString() });
    await resetPasswordWithCode({ ...input, code });
    const recovered = await db.orm.public.User.first({ id: created.user.id });
    assert.ok(recovered && await verifyPassword(input.newPassword, recovered.passwordHash));
    await resetPasswordWithCode({ ...input, code, newPassword: 'ReusoNoPermitido123', confirmPassword: 'ReusoNoPermitido123' });
    const afterReplay = await db.orm.public.User.first({ id: created.user.id });
    assert.ok(afterReplay && await verifyPassword(input.newPassword, afterReplay.passwordHash));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const id of ids) {
      await db.orm.public.PasswordReset.where({ userId: id }).deleteAll();
      await db.orm.public.UserAchievement.where({ userId: id }).deleteAll();
      await db.orm.public.User.where({ id }).deleteAll();
    }
    await resetRateLimitsForTests();
  }
});

test('límite compartido: estado en PostgreSQL y conteo atómico concurrente', { timeout: 60000 }, async () => {
  await resetRateLimitsForTests();
  const key = `prueba-compartida-${Date.now()}`;

  const results = await Promise.all(
    Array.from({ length: 10 }, () => consumeRateLimit(key, 3, 60_000)),
  );

  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.equal(results.filter((result) => !result.allowed).length, 7);

  const plan = db.raw.sql`
    SELECT hit_count FROM unicyber_rate_limit WHERE bucket_key = ${key}
  `
    .returnsRow({ hit_count: 'pg/int4@1' })
    .build();
  const rows = (await db.runtime().query(plan)) as Array<{ hit_count: number }>;
  assert.equal(rows[0]?.hit_count, 4);

  // Simula reiniciar o cambiar de instancia: borrar solo la memoria local
  // no reinicia el límite porque el contador vive en PostgreSQL.
  resetMemoryRateLimitsForTests();
  assert.equal((await consumeRateLimit(key, 3, 60_000)).allowed, false);

  await clearRateLimit(key);
  assert.equal((await consumeRateLimit(key, 3, 60_000)).allowed, true);
  await clearRateLimit(key);
});

test('rehash no sobrescribe una contraseña cambiada concurrentemente', { timeout: 60000 }, async () => {
  const email = `rehash-${Date.now()}@example.test`;
  const oldPassword = 'HashAntiguo123';
  const newPassword = 'HashNuevo456';
  const oldHash = legacyHash(oldPassword);
  const user = await db.orm.public.User.create({
    firstName: 'Rehash',
    lastName: 'Prueba',
    email,
    passwordHash: oldHash,
    role: 'STUDENT',
  });

  try {
    // Otra petición cambió la contraseña después de que este login leyó
    // el hash antiguo. La actualización condicional debe afectar a 0 filas.
    await db.orm.public.User.where({ id: user.id }).update({
      passwordHash: await hashPassword(newPassword),
      passwordChangedAt: new Date().toISOString(),
    });

    await rehashPasswordIfUnchanged(user.id, oldHash, oldPassword);

    const final = await db.orm.public.User.first({ id: user.id });
    assert.ok(final);
    assert.equal(await verifyPassword(newPassword, final.passwordHash), true);
    assert.equal(await verifyPassword(oldPassword, final.passwordHash), false);

    const logged = await loginUser({ email, password: newPassword });
    assert.equal(logged.id, user.id);
  } finally {
    await db.orm.public.User.where({ id: user.id }).deleteAll();
  }
});
