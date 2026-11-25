import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import { isUserRole, type UserRole } from '../../domain/user.js';

/**
 * Emisión y verificación de JWT de acceso.
 *
 * El token solo contiene el identificador del usuario, su rol y la marca
 * de cambio de contraseña. No incluye correo, nombre ni ningún dato
 * sensible. El backend vuelve a consultar el usuario en cada petición
 * protegida para comprobar que siga activo y con el rol vigente.
 */

const secret = new TextEncoder().encode(env.jwtSecret);

export interface AccessTokenPayload {
  userId: number;
  role: UserRole;
  iat?: number;
  /**
   * Valor exacto de `passwordChangedAt` cuando se emitió el token.
   * Permite invalidar tokens anteriores a un cambio de contraseña sin
   * depender de la precisión de segundos del claim `iat`.
   */
  passwordChangedAt?: string;
}

export async function signAccessToken(user: {
  id: number;
  role: UserRole;
  passwordChangedAt?: string | null;
}): Promise<string> {
  const payload: Record<string, unknown> = { role: user.role };

  if (user.passwordChangedAt) {
    payload['pwd'] = user.passwordChangedAt;
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(user.id))
    .setIssuer(env.jwtIssuer)
    .setAudience(env.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      algorithms: ['HS256'],
      requiredClaims: ['sub', 'iat', 'exp', 'iss', 'aud'],
      clockTolerance: 5,
    });

    const userId = Number(payload.sub);

    if (!Number.isSafeInteger(userId) || userId <= 0 || !/^\d+$/.test(payload.sub ?? '')) {
      return null;
    }

    if (!isUserRole(payload.role)) {
      return null;
    }

    const passwordChangedAt = payload['pwd'];

    if (
      passwordChangedAt !== undefined &&
      typeof passwordChangedAt !== 'string'
    ) {
      return null;
    }

    return {
      userId,
      role: payload.role,
      iat: payload.iat ? Number(payload.iat) : undefined,
      passwordChangedAt,
    };
  } catch {
    return null;
  }
}
