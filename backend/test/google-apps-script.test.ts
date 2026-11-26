import assert from 'node:assert/strict';
import test from 'node:test';
import { sendRecoveryEmail } from '../src/infrastructure/email/google-apps-script.js';

const endpoint = 'https://script.google.com/macros/s/test-deployment/exec';
const testSecret = 'test-only-shared-secret';
const email = 'recovery@example.test';
const code = 'ab1234cd';

test('Apps Script transport: request, failures, timeout and redirect security', async (t) => {
  const oldUrl = process.env['MAIL_API_URL'];
  const oldSecret = process.env['MAIL_API_SECRET'];
  t.after(() => {
    if (oldUrl === undefined) delete process.env['MAIL_API_URL']; else process.env['MAIL_API_URL'] = oldUrl;
    if (oldSecret === undefined) delete process.env['MAIL_API_SECRET']; else process.env['MAIL_API_SECRET'] = oldSecret;
  });
  process.env['MAIL_API_URL'] = endpoint;
  process.env['MAIL_API_SECRET'] = testSecret;

  await t.test('POST uses environment and exact payload; only explicit success is accepted', async () => {
    let calls = 0;
    await sendRecoveryEmail(email, code, { fetch: async (url, init) => {
      calls++;
      assert.equal(String(url), endpoint);
      assert.equal(init?.method, 'POST');
      assert.equal(new Headers(init.headers).get('content-type'), 'application/json');
      assert.deepEqual(JSON.parse(String(init.body)), { secret: testSecret, email, code });
      assert.equal(init.redirect, 'manual');
      assert.ok(init.signal instanceof AbortSignal);
      return Response.json({ success: true });
    } });
    assert.equal(calls, 1);
  });

  for (const [name, response] of [
    ['HTTP failure', () => new Response('private provider details', { status: 503 })],
    ['provider rejection', () => Response.json({ success: false })],
    ['invalid JSON', () => new Response('<html>private provider details</html>')],
    ['missing success', () => Response.json({ message: 'ok' })],
    ['string success', () => Response.json({ success: 'true' })],
    ['null JSON', () => Response.json(null)],
    ['array JSON', () => Response.json([true])],
  ] as const) {
    await t.test(name, async () => {
      let calls = 0;
      await assert.rejects(sendRecoveryEmail(email, code, { fetch: async () => { calls++; return response(); } }),
        { message: 'EMAIL_DELIVERY_FAILED' });
      assert.equal(calls, 1);
    });
  }

  await t.test('missing variables and unsafe destinations never call fetch', async () => {
    const transport: typeof fetch = async () => { assert.fail('Unexpected network access'); };
    for (const [url, secret] of [
      ['', testSecret], [endpoint, ''], ['not a URL', testSecret],
      ['http://script.google.com/macros/s/test/exec', testSecret],
      ['https://attacker.example.test/exec', testSecret],
      ['https://user:password@script.google.com/exec', testSecret],
      ['https://script.google.com:8443/exec', testSecret],
    ]) {
      process.env['MAIL_API_URL'] = url;
      process.env['MAIL_API_SECRET'] = secret;
      await assert.rejects(sendRecoveryEmail(email, code, { fetch: transport }), { message: 'EMAIL_DELIVERY_FAILED' });
    }
    process.env['MAIL_API_URL'] = endpoint;
    process.env['MAIL_API_SECRET'] = testSecret;
  });

  await t.test('network exception is sanitized without logging or cause', async () => {
    const logs: unknown[] = [];
    const logger = t.mock.method(console, 'error', (...args: unknown[]) => { logs.push(args); });
    let failure: unknown;
    try {
      await sendRecoveryEmail(email, code, { fetch: async () => { throw new Error(`${testSecret} ${code} ${endpoint}`); } });
    } catch (error) { failure = error; }
    assert.ok(failure instanceof Error);
    assert.equal(failure.message, 'EMAIL_DELIVERY_FAILED');
    assert.equal(failure.cause, undefined);
    assert.deepEqual(logs, []);
    logger.mock.restore();
  });

  await t.test('timeout aborts fetch without retries', async () => {
    let calls = 0;
    // Unref del temporizador nativo no debe finalizar el proceso de prueba.
    const keepAlive = setInterval(() => {}, 1000);
    try {
      await assert.rejects(sendRecoveryEmail(email, code, { timeoutMs: 15, fetch: async (_url, init) => {
        calls++;
        return new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
        });
      } }), { message: 'EMAIL_DELIVERY_FAILED' });
      assert.equal(calls, 1);
    } finally { clearInterval(keepAlive); }
  });

  await t.test('Google 302/303 follow-up is GET with no secret or body', async () => {
    for (const status of [301, 302, 303]) {
      let calls = 0;
      await sendRecoveryEmail(email, code, { fetch: async (url, init) => {
        calls++;
        if (calls === 1) return new Response(null, { status, headers: { location: 'https://script.googleusercontent.com/macros/echo?response=test' } });
        assert.equal(new URL(String(url)).hostname, 'script.googleusercontent.com');
        assert.equal(init?.method, 'GET');
        assert.equal(init.body, undefined);
        assert.equal(JSON.stringify(init).includes(testSecret), false);
        return Response.json({ success: true });
      } });
      assert.equal(calls, 2);
    }
  });

  await t.test('final HTTP and JSON failures after Google redirect are rejected', async () => {
    for (const final of [() => new Response(null, { status: 500 }), () => new Response('not JSON'), () => Response.json({ success: false })]) {
      let calls = 0;
      await assert.rejects(sendRecoveryEmail(email, code, { fetch: async () => {
        calls++;
        return calls === 1
          ? new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/echo' } })
          : final();
      } }));
      assert.equal(calls, 2);
    }
  });

  await t.test('timeout also covers reading the response body', async () => {
    const keepAlive = setInterval(() => {}, 1000);
    try {
      await assert.rejects(sendRecoveryEmail(email, code, { timeoutMs: 15, fetch: async (_url, init) => {
        const stream = new ReadableStream({ start(controller) {
          init!.signal!.addEventListener('abort', () => controller.error(init!.signal!.reason), { once: true });
        } });
        return new Response(stream);
      } }), { message: 'EMAIL_DELIVERY_FAILED' });
    } finally { clearInterval(keepAlive); }
  });

  await t.test('unsafe, method-preserving, missing and endless redirects fail closed', async () => {
    for (const [status, location] of [
      [302, 'http://script.googleusercontent.com/echo'],
      [302, 'https://attacker.example.test/echo'],
      [302, 'https://script.googleusercontent.com.attacker.example.test/echo'],
      [307, 'https://script.googleusercontent.com/echo'],
      [308, 'https://script.google.com/echo'],
      [302, ''],
    ] as const) {
      let calls = 0;
      await assert.rejects(sendRecoveryEmail(email, code, { fetch: async () => {
        calls++;
        return new Response(null, { status, headers: location ? { location } : {} });
      } }));
      assert.equal(calls, 1);
    }
    let calls = 0;
    await assert.rejects(sendRecoveryEmail(email, code, { fetch: async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location: endpoint } });
    } }));
    assert.equal(calls, 6);
  });
});
