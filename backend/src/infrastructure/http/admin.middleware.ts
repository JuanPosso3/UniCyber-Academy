import type { NextFunction, Request, Response } from 'express';
import { isAdminRole } from '../../domain/user.js';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from './errors.js';

/**
 * Exige que la petición ya haya pasado por `requireAuth` y que el
 * usuario cargado desde PostgreSQL tenga el rol administrativo.
 *
 * No se confía en ningún rol enviado por el cliente ni en el contenido
 * del JWT: `requireAuth` recarga el usuario y este middleware evalúa ese
 * valor persistido.
 */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { authUser } = req as AuthenticatedRequest;

  if (!authUser || !isAdminRole(authUser.role)) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'No tienes permisos para realizar esta acción.',
    );
  }

  next();
}
