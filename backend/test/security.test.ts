import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { SignJWT } from 'jose';

// Esta suite no importa Prisma ni abre conexiones a bases de datos.
process.env['JWT_SECRET'] = randomBytes(48).toString('hex');
process.env['NODE_ENV'] = 'production';
const { env } = await import('../src/config/env.js');
const { signAccessToken, verifyAccessToken } = await import('../src/infrastructure/security/jwt.js');
const { AppError, errorHandler } = await import('../src/infrastructure/http/errors.js');
const { securityHeaders } = await import('../src/infrastructure/http/security-headers.js');
const { setSessionCookie, clearSessionCookie, parseCookies } = await import('../src/infrastructure/http/cookies.js');
const { enforceRateLimit, resetRateLimitsForTests } = await import('../src/infrastructure/security/rate-limit.js');
const { validateRegister, validateLogin } = await import('../src/application/auth/auth.validation.js');
const { csrfProtection } = await import('../src/infrastructure/http/csrf.middleware.js');
const { configureTrustProxy } = await import('../src/infrastructure/http/trust-proxy.js');

const app = express();
app.disable('x-powered-by');
app.use(securityHeaders);
app.use('/api/csrf', csrfProtection(new Set(['https://unicyber-academy.vercel.app'])));
app.post('/api/csrf/change', (_req, res) => res.status(204).end());
app.use(express.json({ limit: '1kb' }));
app.post('/api/input', (_req, res) => res.json({ ok: true }));
app.get('/api/details', () => {
  throw new AppError(422, 'LAB_NOT_COMPLETED', 'Completa el laboratorio.', undefined, {
    missingActivityIds: ['actividad-ficticia'],
  });
});
app.get('/api/cookie', (_req, res) => {
  setSessionCookie(res, 'valor-ficticio');
  res.end();
});
app.post('/api/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
app.post('/api/limited', async (_req, res) => {
  await enforceRateLimit(res, 'prueba', 2, 60_000);
  res.end();
});
app.get('/api/ip', (req, res) => res.json({ ip: req.ip }));
app.get('/api/unexpected', () => { throw new Error('SECRETO_FICTICIO_NO_REGISTRAR'); });
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('JWT válido y marca de contraseña conservada', async () => {
  const timestamp = '2026-01-01T00:00:00.123Z';
  const token = await signAccessToken({ id: 1, role: 'STUDENT', passwordChangedAt: timestamp });
  const payload = await verifyAccessToken(token);
  assert.equal(payload?.userId, 1);
  assert.equal(payload?.passwordChangedAt, timestamp);
  assert.equal(await verifyAccessToken('cookie-manipulada'), null);
});

test('JWT rechaza expiración, firma, algoritmo y claims inválidos', async () => {
  const now = Math.floor(Date.now() / 1000);
  const key = new TextEncoder().encode(env.jwtSecret);
  const valid = { sub: '1', role: 'STUDENT', iss: env.jwtIssuer, aud: env.jwtAudience, iat: now, exp: now + 120 };
  const cases: Array<Record<string, unknown>> = [
    { ...valid, exp: now - 60 }, { ...valid, iss: 'otro' },
    { ...valid, aud: 'otro' }, { ...valid, sub: '1e0' },
    { ...valid, sub: '9007199254740992' }, { ...valid, role: 'SUPERADMIN' },
  ];
  const { exp: _exp, ...withoutExpiry } = valid;
  const { iat: _iat, ...withoutIssuedAt } = valid;
  cases.push(withoutExpiry, withoutIssuedAt);
  for (const payload of cases) {
    const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(key);
    assert.equal(await verifyAccessToken(token), null);
  }
  for (const [algorithm, signingKey] of [['HS512', key], ['HS256', randomBytes(48)]] as const) {
    const token = await new SignJWT(valid).setProtectedHeader({ alg: algorithm }).sign(signingKey);
    assert.equal(await verifyAccessToken(token), null);
  }
});

test('cookies de producción y logout usan atributos coherentes', async () => {
  const response = await fetch(`${base}/api/cookie`);
  const cookie = response.headers.get('set-cookie') ?? '';
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(attribute));
  const logout = await fetch(`${base}/api/logout`, { method: 'POST' });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie') ?? '', /Expires=Thu, 01 Jan 1970/);
  assert.deepEqual(parseCookies(undefined), {});
  assert.equal(parseCookies('unicyber_session=%ZZ')['unicyber_session'], '%ZZ');
});

test('headers, no-store y detalles de laboratorio preservados', async () => {
  const response = await fetch(`${base}/api/details`);
  assert.equal(response.status, 422);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  assert.ok(response.headers.get('strict-transport-security'));
  const body = await response.json() as { error: { details: unknown; stack?: unknown } };
  assert.deepEqual(body.error.details, { missingActivityIds: ['actividad-ficticia'] });
  assert.equal(body.error.stack, undefined);
});

test('JSON malformado y cuerpo excesivo se rechazan', async () => {
  for (const [body, status] of [['{', 400], [JSON.stringify({ value: 'a'.repeat(2048) }), 413]] as const) {
    const response = await fetch(`${base}/api/input`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes('SyntaxError'));
  }
});

test('limitador local responde 429 y Retry-After; no prueba distribución', async () => {
  await resetRateLimitsForTests();
  for (const status of [200, 200, 429]) {
    const response = await fetch(`${base}/api/limited`, { method: 'POST' });
    assert.equal(response.status, status);
    if (status === 429) assert.ok(Number(response.headers.get('retry-after')) > 0);
  }
});

test('validación descarta asignación de rol y rechaza tipos incorrectos', () => {
  const registration = validateRegister({ firstName: 'Persona', lastName: 'Ficticia', email: 'ficticia@example.test', password: 'SoloParaPrueba123', role: 'ADMINISTRATIVE', status: 'ACTIVE' });
  assert.ok(registration.ok);
  if (registration.ok) assert.equal('role' in registration.data, false);
  assert.equal(validateLogin({ email: { $ne: null }, password: [] }).ok, false);
});

test('CSRF: allowlist exacta, Referer, null, origen externo y solicitudes simples', async () => {
  const cases: Array<[Record<string, string>, number]> = [
    [{ origin: 'https://unicyber-academy.vercel.app' }, 204],
    [{ referer: 'https://unicyber-academy.vercel.app/profile' }, 204],
    [{ origin: 'null' }, 403],
    [{ origin: 'https://evil.example', 'x-unicyber-request': '1' }, 403],
    [{ origin: 'https://unicyber-academy.vercel.app.evil.example' }, 403],
    [{ origin: 'https://evil.example', referer: 'https://unicyber-academy.vercel.app/' }, 403],
    [{ referer: 'https://evil.example/' }, 403],
    [{ 'content-type': 'text/plain' }, 403],
    [{ 'content-type': 'application/x-www-form-urlencoded' }, 403],
    [{ 'x-unicyber-request': '1' }, 204],
    [{ 'x-unicyber-request': '1', 'sec-fetch-site': 'same-site' }, 403],
    [{ 'x-unicyber-request': '1', 'sec-fetch-site': 'cross-site' }, 403],
    [{}, 403],
  ];
  for (const [headers, status] of cases) {
    const response = await fetch(`${base}/api/csrf/change`, { method: 'POST', headers });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  const preflight = await fetch(`${base}/api/csrf/change`, { method: 'OPTIONS', headers: {
    origin: 'https://evil.example', 'access-control-request-method': 'POST',
    'access-control-request-headers': 'x-unicyber-request',
  } });
  assert.equal(preflight.headers.get('access-control-allow-origin'), null);
  assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
});

test('trust proxy ignora X-Forwarded-For salvo CIDR explícitamente confiable', async () => {
  const untrusted = express();
  delete process.env['TRUSTED_PROXY_CIDRS'];
  configureTrustProxy(untrusted);
  const untrustedServer = untrusted.get('/ip', (req, res) => res.json({ ip: req.ip }));
  const untrustedListener = untrustedServer.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => untrustedListener.once('listening', resolve));
  const untrustedBase = `http://127.0.0.1:${(untrustedListener.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${untrustedBase}/ip`, {
      headers: { 'x-forwarded-for': '203.0.113.77' },
    });
    assert.equal((await response.json() as { ip: string }).ip, '127.0.0.1');
  } finally {
    await new Promise<void>((resolve) => untrustedListener.close(() => resolve()));
  }

  const trusted = express();
  process.env['TRUSTED_PROXY_CIDRS'] = '127.0.0.1/32';
  configureTrustProxy(trusted);
  const trustedServer = trusted.get('/ip', (req, res) => res.json({ ip: req.ip }));
  const trustedListener = trustedServer.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => trustedListener.once('listening', resolve));
  const trustedBase = `http://127.0.0.1:${(trustedListener.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${trustedBase}/ip`, {
      headers: { 'x-forwarded-for': '203.0.113.77' },
    });
    assert.equal((await response.json() as { ip: string }).ip, '203.0.113.77');
  } finally {
    delete process.env['TRUSTED_PROXY_CIDRS'];
    await new Promise<void>((resolve) => trustedListener.close(() => resolve()));
  }
});

test('error inesperado no expone el secreto ficticio en respuesta ni logs de producción', async () => {
  const logs: unknown[][] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    const response = await fetch(`${base}/api/unexpected`);
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes('SECRETO_FICTICIO'));
    assert.ok(!JSON.stringify(logs).includes('SECRETO_FICTICIO'));
    assert.ok(logs.length > 0);
  } finally { console.error = previous; }
});
