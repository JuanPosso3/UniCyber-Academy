import 'dotenv/config';

/**
 * Configuración de entorno del backend.
 *
 * `JWT_SECRET` es obligatorio: no se usa un valor por defecto ni se
 * escribe un secreto en el código. El servidor falla al arrancar si no
 * está configurado o si es demasiado corto.
 */

function requireJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET no está configurado o tiene menos de 32 caracteres. ' +
        'Añade un secreto aleatorio de al menos 32 caracteres en .env.',
    );
  }

  return secret;
}

/**
 * Convierte una duración tipo `3600`, `30m`, `2h` o `7d` a segundos.
 * Se usa tanto para la expiración del JWT como para la cookie.
 */
export function parseExpiresIn(value: string): number {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(
      'JWT_EXPIRES_IN debe usar el formato 3600, 30m, 2h o 7d.',
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const factor = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  }[unit];

  return amount * factor;
}

const nodeEnv = process.env['NODE_ENV'] ?? 'development';
const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] ?? '2h';

export const env = {
  nodeEnv,
  port: Number(process.env['PORT'] ?? 3000),
  jwtSecret: requireJwtSecret(),
  jwtExpiresIn,
  jwtIssuer: 'unicyber-academy',
  jwtAudience: 'unicyber-academy-web',
  sessionMaxAgeSeconds: parseExpiresIn(jwtExpiresIn),
  cookieName: 'unicyber_session',
  cookieSecure:
    process.env['COOKIE_SECURE'] === 'true' || nodeEnv === 'production',
} as const;
