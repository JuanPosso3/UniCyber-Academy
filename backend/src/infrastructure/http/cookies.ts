import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';

/**
 * Lectura y escritura de cookies de sesión.
 *
 * No se añade `cookie-parser`: Express ya sabe escribir cookies y la
 * lectura de una única cookie se resuelve con este parser mínimo.
 */

export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  if (!header) {
    return {};
  }

  const cookies: Record<string, string> = {};

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (!name) {
      continue;
    }

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
}

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  path: '/',
};

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    ...baseCookieOptions,
    maxAge: env.sessionMaxAgeSeconds * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.cookieName, baseCookieOptions);
}
