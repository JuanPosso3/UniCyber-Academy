import { AppError } from '../http/errors.js';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const VERIFY_TIMEOUT_MS = 8_000;
export const CAPTCHA_REQUIRED_MESSAGE = 'Completa la verificación de seguridad para continuar.';
const INVALID_MESSAGE = 'No fue posible verificar que eres una persona. Inténtalo de nuevo.';
const UNAVAILABLE_MESSAGE = 'No se pudo completar la verificación de seguridad. Inténtalo más tarde.';

export function isRecaptchaToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 8192 &&
    /^[A-Za-z0-9_-]+$/.test(value);
}

/** Cada llamada verifica un token con Google; nunca reutiliza éxitos previos. */
export async function verifyRecaptcha(
  token: string,
  options: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<void> {
  if (!isRecaptchaToken(token)) {
    throw new AppError(400, 'CAPTCHA_REQUIRED', CAPTCHA_REQUIRED_MESSAGE, { recaptchaToken: CAPTCHA_REQUIRED_MESSAGE });
  }

  let secret: string;
  let hostname: string;
  try {
    secret = process.env['RECAPTCHA_SECRET_KEY'] ?? '';
    const frontend = new URL(process.env['FRONTEND_URL'] ?? '');
    if (!secret.trim() || /\s/.test(secret) ||
        !['http:', 'https:'].includes(frontend.protocol) ||
        frontend.username || frontend.password ||
        !/^[a-z0-9]+(?:[.-][a-z0-9-]+)*$/.test(frontend.hostname) ||
        (process.env['NODE_ENV'] === 'production' && frontend.protocol !== 'https:')) {
      throw new Error('INVALID_CONFIGURATION');
    }
    hostname = frontend.hostname;
  } catch {
    throw new AppError(503, 'CAPTCHA_UNAVAILABLE', UNAVAILABLE_MESSAGE);
  }

  let result: unknown;
  try {
    const response = await (options.fetch ?? globalThis.fetch)(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(options.timeoutMs ?? VERIFY_TIMEOUT_MS),
      redirect: 'error',
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('PROVIDER_HTTP_FAILURE');
    }
    result = await response.json();
  } catch {
    // Sin cause, logs, cuerpos, tokens ni detalles de las excepciones de fetch.
    throw new AppError(503, 'CAPTCHA_UNAVAILABLE', UNAVAILABLE_MESSAGE);
  }

  if (typeof result !== 'object' || result === null || !('success' in result) ||
      typeof result.success !== 'boolean') {
    throw new AppError(503, 'CAPTCHA_UNAVAILABLE', UNAVAILABLE_MESSAGE);
  }
  if (!result.success) {
    const errors = 'error-codes' in result ? result['error-codes'] : undefined;
    if (Array.isArray(errors) && errors.some(code =>
      code === 'missing-input-secret' || code === 'invalid-input-secret' || code === 'bad-request')) {
      throw new AppError(503, 'CAPTCHA_UNAVAILABLE', UNAVAILABLE_MESSAGE);
    }
    throw new AppError(403, 'CAPTCHA_INVALID', INVALID_MESSAGE, { recaptchaToken: INVALID_MESSAGE });
  }
  if (!('hostname' in result) || result.hostname !== hostname) {
    throw new AppError(403, 'CAPTCHA_INVALID', INVALID_MESSAGE, { recaptchaToken: INVALID_MESSAGE });
  }
  if (!('challenge_ts' in result) || typeof result.challenge_ts !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T/.test(result.challenge_ts) ||
      !Number.isFinite(Date.parse(result.challenge_ts)) ||
      Date.parse(result.challenge_ts) > Date.now() + 60_000) {
    throw new AppError(503, 'CAPTCHA_UNAVAILABLE', UNAVAILABLE_MESSAGE);
  }
}
