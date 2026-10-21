import type { Request, Response } from 'express';
import { signAccessToken } from '../../infrastructure/security/jwt.js';
import {
  clearSessionCookie,
  setSessionCookie,
} from '../../infrastructure/http/cookies.js';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  loginUser,
  registerUser,
  toPublicUser,
} from './auth.service.js';
import { validateLogin, validateRegister } from './auth.validation.js';
import type { FieldErrors } from './auth.validation.js';

function sendValidationErrors(
  res: Response,
  fields: FieldErrors,
): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      fields,
    },
  });
}

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateRegister(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const user = await registerUser(result.data);

  res.status(201).json({ user });
}

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateLogin(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);
    return;
  }

  const user = await loginUser(result.data);
  const token = await signAccessToken({
    id: user.id,
    role: user.role,
  });

  setSessionCookie(res, token);

  res.status(200).json({ user });
}

export function me(req: Request, res: Response): void {
  const { authUser } = req as AuthenticatedRequest;

  res.status(200).json({ user: toPublicUser(authUser) });
}

export function logout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.status(204).end();
}
