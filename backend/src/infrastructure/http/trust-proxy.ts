import type { Express } from 'express';

/**
 * Configura la confianza en cabeceras reenviadas.
 *
 * Por defecto NO se confía en `X-Forwarded-For`: un cliente que alcance el
 * servicio directamente podría falsificarlo. Solo se habilita cuando el
 * responsable configura los CIDR exactos de los proxies verificados.
 */
export function configureTrustProxy(app: Express): void {
  const trustedProxies = process.env['TRUSTED_PROXY_CIDRS']
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.set(
    'trust proxy',
    trustedProxies && trustedProxies.length > 0 ? trustedProxies : false,
  );
}
