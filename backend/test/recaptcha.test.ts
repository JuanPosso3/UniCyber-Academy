import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import express from 'express';

process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-only-jwt-secret-for-recaptcha-verification';
process.env['RATE_LIMIT_STORE'] = 'memory';
process.env['RECAPTCHA_SECRET_KEY'] = 'test-only-captcha-secret';
process.env['FRONTEND_URL'] = 'https://captcha.example.test/';
const { createLoginHandler } = await import('../src/application/auth/auth.controller.js');
const { AppError, errorHandler } = await import('../src/infrastructure/http/errors.js');
const { verifyAccessToken } = await import('../src/infrastructure/security/jwt.js');
const { verifyRecaptcha } = await import('../src/infrastructure/security/recaptcha.js');
const { db } = await import('../src/prisma/db.js');

test('mandatory CAPTCHA before credential authentication and session issuance', { timeout: 30000 }, async (t) => {
  let authenticationCalls = 0;
  let googleCalls = 0;
  let sequence = 0;
  const accepted = () => Response.json({ success: true, hostname: 'captcha.example.test', challenge_ts: new Date().toISOString() });
  let provider: () => Promise<Response> = async () => accepted();
  const logs: unknown[] = [];
  const logger = t.mock.method(console, 'error', (...args: unknown[]) => { logs.push(args); });
  const originalFetch = globalThis.fetch;
  const transport = t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    assert.equal(String(url), 'https://www.google.com/recaptcha/api/siteverify');
    googleCalls++;
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init.headers).get('content-type'), 'application/x-www-form-urlencoded');
    assert.equal(init.redirect, 'error');
    const payload = new URLSearchParams(String(init.body));
    assert.equal(payload.get('secret'), process.env['RECAPTCHA_SECRET_KEY']);
    assert.ok(payload.get('response'));
    assert.equal(payload.has('remoteip'), false);
    return provider();
  });
  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', createLoginHandler(async input => {
    authenticationCalls++;
    assert.equal('recaptchaToken' in input, false);
    if (input.password === 'incorrecta') throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo electrónico o contraseña incorrectos.');
    return {
      id: 1, firstName: 'Ana', lastName: 'Prueba', email: input.email,
      passwordHash: 'test-only-hash', role: 'STUDENT', status: 'ACTIVE',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      username: null, passwordChangedAt: null,
    };
  }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const request = (payload: Record<string, unknown> = {}) => originalFetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `captcha-${sequence++}@example.test`, password: 'Valida123!', recaptchaToken: 'test-captcha-token', ...payload }),
  });
  const rejected = async (status: number, payload?: Record<string, unknown>) => {
    const before = authenticationCalls;
    const response = await request(payload);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.text();
    assert.equal(authenticationCalls, before, 'CAPTCHA fallido no debe llamar al servicio de credenciales.');
    for (const sensitive of ['test-only-captcha-secret', 'test-captcha-token', 'Valida123!', 'provider-private-detail']) {
      assert.equal(body.includes(sensitive), false);
    }
  };
  try {
    await t.test('direct API requests reject absent, empty, malformed and incorrectly typed tokens', async () => {
      for (const recaptchaToken of [undefined, '', null, false, {}, ['token'], 'token con espacios', '<token>', 'a'.repeat(8193)]) {
        await rejected(400, { recaptchaToken, captchaVerified: true });
      }
      assert.equal(googleCalls, 0);
    });

    await t.test('invalid, expired and reused tokens rejected by Google never authenticate', async () => {
      for (const errorCode of ['invalid-input-response', 'timeout-or-duplicate']) {
        provider = async () => Response.json({ success: false, 'error-codes': [errorCode] });
        await rejected(403);
      }
    });

    await t.test('authorized success preserves invalid-credentials response', async () => {
      provider = async () => accepted();
      const before = authenticationCalls;
      const response = await request({ password: 'incorrecta' });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('set-cookie'), null);
      const body = await response.json() as { error: { code: string; message: string } };
      assert.equal(body.error.code, 'INVALID_CREDENTIALS');
      assert.equal(body.error.message, 'Correo electrónico o contraseña incorrectos.');
      assert.equal(authenticationCalls, before + 1);
    });

    await t.test('authorized success issues normal JWT and HttpOnly session; next use requires Google again', async () => {
      let consumed = false;
      provider = async () => {
        if (consumed) return Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
        consumed = true;
        return accepted();
      };
      const response = await request();
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie')!;
      assert.match(cookie, /unicyber_session=/);
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /SameSite=Lax/);
      assert.match(cookie, /Max-Age=/);
      const jwt = cookie.split(';')[0]!.split('=')[1]!;
      assert.equal((await verifyAccessToken(jwt))?.userId, 1);
      const body = await response.json() as { user: { role: string; passwordHash?: string } };
      assert.equal(body.user.role, 'STUDENT');
      assert.equal(body.user.passwordHash, undefined);
      await rejected(403);
    });

    await t.test('network, DNS, TLS and timeout errors fail closed', async () => {
      for (const name of ['TypeError', 'TimeoutError', 'AbortError']) {
        provider = async () => { throw new DOMException('provider-private-detail test-only-captcha-secret', name); };
        await rejected(503);
      }
    });

    await t.test('HTTP failures, malformed JSON and unexpected structures fail closed', async () => {
      for (const response of [
        () => new Response(null, { status: 503 }),
        () => new Response('provider-private-detail'),
        () => Response.json(null), () => Response.json([]),
        () => Response.json({}), () => Response.json({ success: 'true' }),
        () => Response.json({ success: true, hostname: 'captcha.example.test' }),
        () => Response.json({ success: true, hostname: 'captcha.example.test', challenge_ts: 'invalid' }),
      ]) {
        provider = async () => response();
        await rejected(503);
      }
    });

    await t.test('Google rejection of server secret is sanitized as unavailable', async () => {
      provider = async () => Response.json({ success: false, 'error-codes': ['invalid-input-secret'] });
      await rejected(503);
    });

    await t.test('hostname must match configured frontend exactly', async () => {
      for (const hostname of ['evil.example.test', 'captcha.example.test.evil.test', 'evilcaptcha.example.test', 'unicyber-academy.onrender.com', undefined]) {
        provider = async () => Response.json({ success: true, hostname, challenge_ts: new Date().toISOString() });
        await rejected(403);
      }
    });

    await t.test('missing or invalid server configuration never calls Google or credentials', async () => {
      const before = googleCalls;
      for (const [secret, frontend] of [
        ['', 'https://captcha.example.test'],
        ['test-only-captcha-secret', ''],
        ['test-only-captcha-secret', 'not a URL'],
        ['test-only-captcha-secret', 'https://user:password@captcha.example.test'],
        ['test-only-captcha-secret', 'https://*.example.test'],
      ]) {
        process.env['RECAPTCHA_SECRET_KEY'] = secret;
        process.env['FRONTEND_URL'] = frontend;
        await rejected(503);
      }
      process.env['RECAPTCHA_SECRET_KEY'] = 'test-only-captcha-secret';
      process.env['FRONTEND_URL'] = 'https://captcha.example.test';
      assert.equal(googleCalls, before);
      process.env['NODE_ENV'] = 'production';
      process.env['FRONTEND_URL'] = 'http://captcha.example.test';
      await rejected(503);
      process.env['NODE_ENV'] = 'test';
      process.env['FRONTEND_URL'] = 'https://captcha.example.test';
    });

    await t.test('actual timeout signal aborts provider request', async () => {
      const keepAlive = setInterval(() => {}, 1000);
      try {
        await assert.rejects(verifyRecaptcha('test-token', { timeoutMs: 15, fetch: async (_url, init) => {
          return new Promise<Response>((_resolve, reject) => {
            init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
          });
        } }), (error: unknown) => error instanceof AppError && error.code === 'CAPTCHA_UNAVAILABLE');
      } finally { clearInterval(keepAlive); }
    });

    await t.test('CAPTCHA failures retain existing login rate limiting', async () => {
      provider = async () => Response.json({ success: false });
      for (let i = 0; i < 5; i++) await rejected(403, { email: 'limited-captcha@example.test' });
      const before = googleCalls;
      const response = await request({ email: 'limited-captcha@example.test' });
      assert.equal(response.status, 429);
      assert.equal(googleCalls, before);
      assert.ok(response.headers.get('retry-after'));
    });
    assert.deepEqual(logs, []);
  } finally {
    transport.mock.restore();
    logger.mock.restore();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await db.close();
  }
});
