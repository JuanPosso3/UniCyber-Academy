import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';

/**
 * Cabeceras de seguridad comunes a la API y al SPA servido por Express.
 *
 * La CSP permite las hojas de Google Fonts que ya usa el frontend y los
 * estilos en línea de React (por ejemplo, barras de progreso). No permite
 * scripts en línea ni orígenes de API distintos del propio.
 */

function buildContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ];

  if (env.nodeEnv === 'production') {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy();

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  );
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  if (env.nodeEnv === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}
