import { Router } from 'express';
import { requireAuth } from '../../infrastructure/http/auth.middleware.js';
import {
  getCatalog,
  getCollection,
  getSummary,
  getPendingNotifications,
  markNotificationViewed,
} from './achievement.controller.js';

/**
 * Logros y gamificación del estudiante.
 *
 * Todos los endpoints operan sobre la persona autenticada. No existe
 * un endpoint público para otorgar logros: el desbloqueo es automático
 * y lo ejecuta el backend tras confirmar un evento académico.
 */
export const achievementRouter = Router();

achievementRouter.use(requireAuth);

achievementRouter.get('/', getCatalog);
achievementRouter.get('/collection', getCollection);
achievementRouter.get('/summary', getSummary);
achievementRouter.get(
  '/notifications/pending',
  getPendingNotifications,
);
achievementRouter.post(
  '/notifications/:userAchievementId/view',
  markNotificationViewed,
);
