import type { Request, Response } from 'express';
import { AppError } from '../../infrastructure/http/errors.js';
import type { AuthenticatedRequest } from '../../infrastructure/http/auth.middleware.js';
import {
  getAchievementCatalog,
  getStudentAchievementCollection,
  getAchievementDashboardSummary,
  getPendingAchievementNotifications,
  markAchievementNotificationViewed,
} from './achievement.service.js';
import {
  validateUserAchievementId,
  type FieldErrors,
} from './achievement.validation.js';

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
 * Logros del estudiante. Toda la información es de la persona
 * autenticada; nunca se expone el progreso de otras personas.
 */

export async function getCatalog(
  _req: Request,
  res: Response,
): Promise<void> {
  const catalog = await getAchievementCatalog();

  res.json({ achievements: catalog });
}

export async function getCollection(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).authUser.id;
  const collection = await getStudentAchievementCollection(userId);

  res.json(collection);
}

export async function getSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).authUser.id;
  const summary = await getAchievementDashboardSummary(userId);

  res.json(summary);
}

export async function getPendingNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).authUser.id;
  const notifications = await getPendingAchievementNotifications(userId);

  res.json({ notifications });
}

export async function markNotificationViewed(
  req: Request,
  res: Response,
): Promise<void> {
  const result = validateUserAchievementId(req.params['userAchievementId']);

  if (!result.ok) {
    sendValidationErrors(res, result.errors);

    return;
  }

  const userId = (req as AuthenticatedRequest).authUser.id;

  await markAchievementNotificationViewed(userId, result.data.userAchievementId);

  res.status(204).send();
}
