import 'dotenv/config';
import { after, mock } from 'node:test';

// Solo se importa desde pruebas: no existe interruptor de bypass en la API.
process.env['RECAPTCHA_SECRET_KEY'] = 'test-only-recaptcha-secret';
process.env['FRONTEND_URL'] = 'https://captcha.example.test';
const originalFetch = globalThis.fetch;
const transport = mock.method(globalThis, 'fetch', async (...args: Parameters<typeof fetch>) => {
  if (String(args[0]) === 'https://www.google.com/recaptcha/api/siteverify') {
    return Response.json({ success: true, hostname: 'captcha.example.test', challenge_ts: new Date().toISOString() });
  }
  return originalFetch(...args);
});
after(() => transport.mock.restore());
