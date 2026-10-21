import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import { isUserRole, type UserRole } from '../../domain/user.js';

/**
 * Emisión y verificación de JWT de acceso.
 *
 * El token solo contiene el identificador del usuario y su rol. No
 * incluye correo, nombre ni ningún dato sensible. El backend vuelve a
 * consultar el usuario en cada petición protegida para comprobar que
 * siga activo y con el rol vigente.
 */

const secret = new TextEncoder().encode(env.jwtSecret);

export interface AccessTokenPayload {
  userId: number;
  role: UserRole;
}

export async function signAccessToken(user: {
  id: number;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({ role: user.role })
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
      clockTolerance: 5,
    });

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    if (!isUserRole(payload.role)) {
      return null;
    }

    return {
      userId,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
