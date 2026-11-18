import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  getAdminDashboardStatistics,
  listAdminUsers,
  updateManagedUser,
} from './admin.service.js';

function parseUserId(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const userId = Number(value);

  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

/** Estadísticas generales de la plataforma. Solo administradores. */
export async function getStatistics(
  _req: Request,
  res: Response,
): Promise<void> {
  const statistics = await getAdminDashboardStatistics();

  res.json({ statistics });
}

/** Listado de usuarios con búsqueda opcional por nombre, correo o usuario. */
export async function listUsers(
  req: Request,
  res: Response,
): Promise<void> {
  const search =
    typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
  const users = await listAdminUsers(search);

  res.json({ users });
}

/** Actualiza el nombre de usuario y/o el rol de una cuenta. */
export async function updateUser(
  req: Request,
  res: Response,
): Promise<void> {
  const rawUserId = req.params['userId'];
  const userId = parseUserId(typeof rawUserId === 'string' ? rawUserId : '');

  if (userId === null) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'El identificador del usuario no es válido.',
      },
    });

    return;
  }

  const body = (typeof req.body === 'object' && req.body !== null
    ? req.body
    : {}) as Record<string, unknown>;
  const input: { username?: string; role?: string } = {};

  if (typeof body['username'] === 'string') {
    input.username = body['username'];
  }

  if (typeof body['role'] === 'string') {
    input.role = body['role'];
  }

  if (input.username === undefined && input.role === undefined) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'No se enviaron datos para actualizar.',
      },
    });

    return;
  }

  const actorId = (req as AuthenticatedRequest).authUser.id;
  const user = await updateManagedUser(actorId, userId, input);

  res.json({ user });
}
