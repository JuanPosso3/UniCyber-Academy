import type { Request, Response } from 'express';
import { AppError } from '../../infrastructure/http/errors.js';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  changePassword as changePasswordService,
  getMyProfile as getMyProfileService,
  updateUsername as updateUsernameService,
} from './user.service.js';
import {
  validateChangePassword,
  validateUpdateUsername,
  type FieldErrors,
} from './user.validation.js';

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

/**
 * Perfil del usuario autenticado. Todas las operaciones actúan sobre la
 * cuenta de quien inicia la petición; nunca se permite tocar la cuenta
 * de otra persona.
 */

export async function getMyProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).authUser.id;
  const profile = await getMyProfileService(userId);

  res.json({ user: profile });
}

export async function updateUsername(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).authUser.id;
  const result = validateUpdateUsername(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const profile = await updateUsernameService(userId, result.data);

  res.json({ user: profile });
}

export async function changePassword(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).authUser.id;
  const result = validateChangePassword(req.body);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  await changePasswordService(userId, result.data);

  res.status(204).end();
}
