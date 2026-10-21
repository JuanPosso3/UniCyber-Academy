import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { findActiveUserById } from '../../application/auth/auth.service.js';
import type { AuthUser } from '../../application/auth/auth.types.js';
import {
  clearSessionCookie,
  parseCookies,
} from './cookies.js';
import { AppError } from './errors.js';
import { verifyAccessToken } from '../security/jwt.js';

/**
 * Petición autenticada: el middleware añade el usuario cargado desde
 * la base de datos, no solo los datos del token.
 */
export interface AuthenticatedRequest extends Request {
  authUser: AuthUser;
}

const UNAUTHENTICATED_MESSAGE =
  'Tu sesión ha expirado. Inicia sesión nuevamente.';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = parseCookies(req.headers.cookie)[env.cookieName];

  if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', UNAUTHENTICATED_MESSAGE);
  }

  const payload = await verifyAccessToken(token);

  if (!payload) {
    clearSessionCookie(res);
    throw new AppError(401, 'UNAUTHENTICATED', UNAUTHENTICATED_MESSAGE);
  }

  const user = await findActiveUserById(payload.userId);

  if (!user) {
    clearSessionCookie(res);
    throw new AppError(401, 'UNAUTHENTICATED', UNAUTHENTICATED_MESSAGE);
  }

  (req as AuthenticatedRequest).authUser = user;

  next();
}
