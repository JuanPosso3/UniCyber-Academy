import type { RequestHandler } from 'express';
import { AppError } from './errors.js';

/** Orígenes explícitos; nunca se derivan de Host ni X-Forwarded-Host. */
export function configuredOrigins(): Set<string> {
  const defaults = process.env['NODE_ENV'] === 'production'
    ? ['https://unicyber-academy.vercel.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
  const values = process.env['APP_ORIGINS']?.split(',').map(value => value.trim()) ?? defaults;
  return new Set(values.map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value || url.username || url.password) {
      throw new Error('APP_ORIGINS debe contener orígenes HTTP/HTTPS exactos separados por comas.');
    }
    if (process.env['NODE_ENV'] === 'production' && url.protocol !== 'https:') {
      throw new Error('APP_ORIGINS requiere HTTPS en producción.');
    }
    return url.origin;
  }));
}

export function csrfProtection(origins = configuredOrigins()): RequestHandler {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const referer = req.get('referer');
    let allowed = false;
    if (origin !== undefined) {
      // Incluye el rechazo de Origin: null, listas y coincidencias de sufijo.
      allowed = origins.has(origin);
    } else if (referer !== undefined) {
      try { allowed = origins.has(new URL(referer).origin); } catch { allowed = false; }
    } else {
      // Clientes sin Origin/Referer deben demostrar solicitud no simple.
      // Un formulario/ping no puede añadir esta cabecera. Fetch cross-origin
      // necesita preflight y esta API no concede permisos CORS.
      allowed = req.get('x-unicyber-request') === '1' &&
        !['cross-site', 'same-site'].includes(req.get('sec-fetch-site') ?? '');
    }
    if (!allowed) throw new AppError(403, 'CSRF_REJECTED', 'No se pudo verificar el origen de la solicitud. Recarga la página e inténtalo nuevamente.');
    next();
  };
}
