import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';

// Nunca ejecutar estas pruebas con Neon ni con cuentas de usuarios reales.
const target = new URL(process.env['DATABASE_URL'] ?? 'http://invalid');
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('La prueba de recuperación requiere PostgreSQL local de pruebas.');
}
const { db } = await import('../src/prisma/db.js');
const { requestRecoveryCode, resetPasswordWithCode } = await import('../src/application/auth/password-recovery.service.js');
const { hashPassword, verifyPassword } = await import('../src/infrastructure/security/password.js');
const { clearRateLimit, consumeRateLimit } = await import('../src/infrastructure/security/rate-limit.js');
const { loginUser } = await import('../src/application/auth/auth.service.js');
const { createApp } = await import('../src/app.js');

test('password recovery: mocked delivery, cleanup, privacy and security regression', { timeout: 60000 }, async (t) => {
  const oldUrl = process.env['MAIL_API_URL'];
  const oldSecret = process.env['MAIL_API_SECRET'];
  process.env['MAIL_API_URL'] = 'https://script.google.com/macros/s/test/exec';
  process.env['MAIL_API_SECRET'] = 'test-only-recovery-secret';
  const marker = `recovery-${Date.now()}`;
  const password = 'OriginalPrueba123!';
  const user = await db.orm.public.User.create({
    firstName: 'Prueba', lastName: 'Recuperación', email: `${marker}@example.test`,
    passwordHash: await hashPassword(password), role: 'STUDENT',
  });
  const other = await db.orm.public.User.create({
    firstName: 'Otra', lastName: 'Prueba', email: `other-${marker}@example.test`,
    passwordHash: await hashPassword(password), role: 'STUDENT', status: 'DISABLED',
  });
  const key = `password-reset-request:email:${user.email}`;
  const sent: Array<{ secret: string; email: string; code: string }> = [];
  const logs: unknown[] = [];
  let behavior: () => Promise<Response> = async () => Response.json({ success: true });
  const originalFetch = globalThis.fetch;
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (new URL(String(url)).hostname !== 'script.google.com') return originalFetch(url, init);
    sent.push(JSON.parse(String(init?.body)) as typeof sent[number]);
    return behavior();
  });
  const logger = t.mock.method(console, 'error', (...args: unknown[]) => { logs.push(args); });
  const rows = () => db.orm.public.PasswordReset.where({ userId: user.id }).all();
  const fresh = async () => {
    await db.orm.public.PasswordReset.where({ userId: user.id }).deleteAll();
    await clearRateLimit(key);
    sent.length = 0;
  };
  const resetInput = (code: string, next = 'NuevaPrueba123!') => ({
    email: user.email, code, newPassword: next, confirmPassword: next,
  });
  try {
    await t.test('secure generation, normalized recipient, hash and fifteen-minute TTL', async () => {
      const start = Date.now();
      await requestRecoveryCode(` ${user.email.toUpperCase()} `);
      assert.equal(sent.length, 1);
      assert.equal(sent[0]!.email, user.email);
      assert.equal(sent[0]!.secret, process.env['MAIL_API_SECRET']);
      assert.match(sent[0]!.code, /^[a-f0-9]{8}$/);
      const records = await rows();
      assert.equal(records.length, 1);
      assert.notEqual(records[0]!.codeHash, sent[0]!.code);
      assert.ok(await verifyPassword(sent[0]!.code, records[0]!.codeHash));
      assert.ok(Date.parse(records[0]!.expiresAt) >= start + 15 * 60_000);
      assert.ok(Date.parse(records[0]!.expiresAt) <= Date.now() + 15 * 60_000);
      await requestRecoveryCode(user.email);
      assert.equal(sent.length, 1);
      assert.equal((await rows())[0]!.id, records[0]!.id);
    });

    await t.test('concurrent requests create and send only one active code', async () => {
      await fresh();
      await Promise.all(Array.from({ length: 3 }, () => requestRecoveryCode(user.email)));
      assert.equal(sent.length, 1);
      assert.equal((await rows()).length, 1);
    });

    await t.test('delivery failure deletes only its own ID; keeps concurrent and unrelated rows', async () => {
      await fresh();
      const unrelated = await db.orm.public.PasswordReset.create({
        userId: other.id, codeHash: await hashPassword('other-code'),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      });
      let newerId = 0;
      behavior = async () => {
        const newer = await db.orm.public.PasswordReset.create({
          userId: user.id, codeHash: await hashPassword('newer-code'),
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        });
        newerId = newer.id;
        throw new Error('test-only-recovery-secret private-provider-response');
      };
      await requestRecoveryCode(user.email);
      assert.deepEqual((await rows()).map(row => row.id), [newerId]);
      assert.ok(await db.orm.public.PasswordReset.first({ id: unrelated.id }));
      assert.equal(JSON.stringify(logs).includes('test-only-recovery-secret'), false);
      assert.equal(JSON.stringify(logs).includes(sent[0]!.code), false);
      assert.equal(JSON.stringify(logs).includes('private-provider-response'), false);
    });

    await t.test('failed delivery does not reset three-request rate limit', async () => {
      await fresh();
      behavior = async () => Response.json({ success: false });
      for (let i = 0; i < 4; i++) await requestRecoveryCode(user.email);
      assert.equal(sent.length, 3);
      assert.deepEqual(await rows(), []);
    });

    await t.test('HTTP, JSON and timeout failures also clean up the new recovery row', async () => {
      for (const failure of [
        async () => new Response(null, { status: 503 }),
        async () => new Response('invalid JSON'),
        async () => Response.json({ unexpected: true }),
        async () => { throw new DOMException('Timeout de prueba', 'TimeoutError'); },
      ]) {
        await fresh();
        behavior = failure;
        await requestRecoveryCode(user.email);
        assert.equal(sent.length, 1);
        assert.deepEqual(await rows(), []);
      }
    });

    await t.test('missing configuration cleans up without delivery and preserves rate count', async () => {
      await fresh();
      delete process.env['MAIL_API_SECRET'];
      for (let i = 0; i < 3; i++) await requestRecoveryCode(user.email);
      assert.deepEqual(await rows(), []);
      process.env['MAIL_API_SECRET'] = 'test-only-recovery-secret';
      await requestRecoveryCode(user.email);
      assert.equal(sent.length, 0);
    });

    await t.test('expired codes rejected; replacement removes only unused expired records', async () => {
      await fresh();
      behavior = async () => Response.json({ success: true });
      const expired = await db.orm.public.PasswordReset.create({
        userId: user.id, codeHash: await hashPassword('ab1234cd'),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      await resetPasswordWithCode(resetInput('ab1234cd'));
      const unchanged = await db.orm.public.User.first({ id: user.id });
      assert.ok(unchanged && await verifyPassword(password, unchanged.passwordHash));
      await requestRecoveryCode(user.email);
      assert.equal(await db.orm.public.PasswordReset.first({ id: expired.id }), null);
      assert.equal((await rows()).length, 1);
    });

    await t.test('five failures exhaust code, including subsequent correct verification', async () => {
      await fresh();
      await requestRecoveryCode(user.email);
      for (let i = 0; i < 5; i++) await resetPasswordWithCode(resetInput('incorrecto'));
      assert.equal((await rows())[0]!.attempts, 5);
      await resetPasswordWithCode(resetInput(sent[0]!.code));
      assert.ok((await rows())[0]!.usedAt);
      const unchanged = await db.orm.public.User.first({ id: user.id });
      assert.ok(unchanged && await verifyPassword(password, unchanged.passwordHash));
    });

    await t.test('concurrent invalid checks cannot exceed five reserved attempts', async () => {
      await fresh();
      await requestRecoveryCode(user.email);
      await Promise.all(Array.from({ length: 8 }, () => resetPasswordWithCode(resetInput('incorrecto'))));
      const record = (await rows())[0]!;
      assert.ok(record.attempts >= 1 && record.attempts <= 5);
    });

    await t.test('single-use transactional reset, confirmation and password hashing', async () => {
      await fresh();
      await requestRecoveryCode(user.email);
      const code = sent[0]!.code;
      await resetPasswordWithCode({ ...resetInput(code), confirmPassword: 'distinta' });
      assert.equal((await rows())[0]!.attempts, 0);
      const choices = ['NuevaConcurrente123!', 'OtraConcurrente123!'];
      await Promise.all(choices.map(next => resetPasswordWithCode(resetInput(code, next))));
      const updated = await db.orm.public.User.first({ id: user.id });
      assert.ok(updated?.passwordChangedAt);
      const matches = await Promise.all(choices.map(next => verifyPassword(next, updated.passwordHash)));
      assert.equal(matches.filter(Boolean).length, 1);
      const logged = await loginUser({ email: user.email, password: choices[matches.findIndex(Boolean)]! });
      assert.equal(logged.id, user.id);
      await assert.rejects(loginUser({ email: user.email, password }));
      assert.ok((await rows())[0]!.usedAt);
      await resetPasswordWithCode(resetInput(code, 'Reutilizada123!'));
      const reused = await db.orm.public.User.first({ id: user.id });
      assert.equal(reused!.passwordHash, updated.passwordHash);
    });

    await t.test('nonexistent and disabled accounts do not send; public responses stay generic', async () => {
      const before = sent.length;
      await requestRecoveryCode(other.email);
      await requestRecoveryCode(`absent-${marker}@example.test`);
      assert.equal(sent.length, before);
      const server = createApp().listen(0, '127.0.0.1');
      await new Promise<void>(resolve => server.once('listening', resolve));
      try {
        const bodies: unknown[] = [];
        for (const email of [user.email, other.email, `absent-${marker}@example.test`]) {
          // Agotar el contador permite comprobar la respuesta HTTP sin dejar
          // tareas de base de datos pendientes al cerrar el servidor de prueba.
          for (let i = 0; i < 3; i++) {
            await consumeRateLimit(`password-reset-request:email:${email}`, 3, 900000);
          }
          const response = await originalFetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/password-reset/request`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-unicyber-request': '1' }, body: JSON.stringify({ email }),
          });
          assert.equal(response.status, 200);
          bodies.push(await response.json());
        }
        assert.deepEqual(bodies[0], bodies[1]);
        assert.deepEqual(bodies[1], bodies[2]);
        assert.equal(JSON.stringify(bodies).includes('test-only-recovery-secret'), false);
        for (const value of sent) assert.equal(JSON.stringify(bodies).includes(value.code), false);
      } finally {
        await new Promise<void>(resolve => server.close(() => resolve()));
      }
    });
  } finally {
    fetchMock.mock.restore();
    logger.mock.restore();
    for (const account of [user, other]) {
      await clearRateLimit(`password-reset-request:email:${account.email}`);
      await db.orm.public.PasswordReset.where({ userId: account.id }).deleteAll();
      await db.orm.public.UserAchievement.where({ userId: account.id }).deleteAll();
      await db.orm.public.User.where({ id: account.id }).deleteAll();
    }
    if (oldUrl === undefined) delete process.env['MAIL_API_URL']; else process.env['MAIL_API_URL'] = oldUrl;
    if (oldSecret === undefined) delete process.env['MAIL_API_SECRET']; else process.env['MAIL_API_SECRET'] = oldSecret;
    await db.close();
  }
});
